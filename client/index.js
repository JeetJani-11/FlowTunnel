#!/usr/bin/env node
const path = require('path');
const readline = require("readline");
const { io } = require("socket.io-client");
const fetch = require("node-fetch");
const { LocalStorage } = require("node-localstorage");
const baseDir = path.join(process.env.LOCALAPPDATA, 'MyTunnelCLI');
const localStorage = new LocalStorage(path.join(baseDir, 'scratch'));

let rl;
let isConnected = false;
const serverUrl = "https://tunnel.jeetjani.xyz";
let tried = false;

function connectToServer(port) {
  try {
    const socketUrl = "https://tunnel.jeetjani.xyz";

    const socket = io(socketUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
  
    mutePrompt();
    console.log(`Connecting to ${socketUrl}...`);
    console.log("Please wait...");
  
    socket.on("connect", () => {
      console.log("Connected to remote server!");
      isConnected = true;
  
      const token = localStorage.getItem("accessToken");
      if (!token) {
        console.log("To connect, please login with your API key.");
        socket.disconnect();
        isConnected = false;
        unmutePrompt();
        return;
      }
      socket.emit("login", { accessToken: token });
      console.log("Logging in with token from storage…");
    });
  
    socket.on("message", async (message) => {
      if (message.content === "Invalid access token") {
        console.log("Invalid access token. Attempting refresh…");
  
        if (tried) {
          console.log("Refresh already attempted. Please login again.");
          unmutePrompt();
          return;
        }
        tried = true;
  
        const storedRefresh = localStorage.getItem("refreshToken");
        const response = await fetch(`${serverUrl}/refreshToken`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: storedRefresh }),
        });
  
        if (response.ok) {
          const { accessToken: newAccess, refreshToken: newRefresh } =
            await response.json();
          console.log("Old access token: ", localStorage.getItem("accessToken"));
          console.log("Old access token expired. New tokens received.");
          localStorage.setItem("accessToken", newAccess);
          localStorage.setItem("refreshToken", newRefresh);
          console.log("Tokens refreshed successfully.");
          console.log("New access token: ", newAccess);
          // re-authenticate on the same socket
          socket.emit("login", { accessToken: newAccess });
          console.log("Re-authenticated with new token.");
        } else {
          console.log("Failed to refresh token:", response.statusText);
          console.log("Please login again.");
          unmutePrompt();
        }
        return;
      }
  
      // normal messages
      console.log(message.content);
    });
  
    socket.on("request", async (payload, acknowledge) => {
      const { correlationId, method, url, headers, body } = payload;
      console.log(`Received request ${correlationId}: ${method} ${url}`);
      try {
        const parsedUrl = new URL(`http://localhost:${port}${url}`);
        const response = await fetch(parsedUrl, {
          method,
          headers,
          body: method !== "GET" && body ? JSON.stringify(body) : undefined,
        });
        const buffer = await response.arrayBuffer();
        acknowledge({
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body: Buffer.from(buffer),
        });
      } catch (err) {
        console.error("Error handling request:", err);
        acknowledge({ error: err.message });
      }
    });
  
    socket.on("error", (err) => {
      console.error(`Socket error: ${err.message}`);
    });
  
    socket.on("disconnect", () => {
      console.log("Disconnected from the server.");
      isConnected = false;
      setTimeout(() => unmutePrompt(), 200);
    });
  } catch (err) {
    console.error("Connection error:", err);
    unmutePrompt();
  }
}

async function handleLogin(token) {
  try {
    const response = await fetch(`${serverUrl}/login`, {
      compress: false,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: token }),
    });
    if (response.ok) {
      const { accessToken, refreshToken } = await response.json();
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      console.log("Login successful.");
      tried = false;
    } else {
      console.log("Login failed:", response.statusText);
    }
  } catch (err) {
    console.error("Login error:", err);
  }
  rl.prompt();
}

function mutePrompt() {
  rl.pause();
  readline.moveCursor(process.stdout, 0, -1);
  readline.clearLine(process.stdout, 0);
}

function unmutePrompt() {
  rl.resume();
  rl.prompt(true);
}

function launchCLI() {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "my-cli> ",
  });

  console.log("Welcome to My Tunnel CLI!");
  console.log(
    'Type "connect [port]" to connect, "login [token]" to authenticate, "help" for commands, or "exit" to quit.\n'
  );

  rl.prompt();

  rl.on("line", (line) => {
    const [command, arg] = line.trim().split(" ");
    const lower = command.toLowerCase();

    if (isConnected && lower !== "exit") {
      console.log("Already connected. Type 'exit' to quit.");
      rl.prompt();
      return;
    }

    switch (lower) {
      case "connect": {
        const port = parseInt(arg, 10) || 8080;
        console.log(`Attempting to connect on port ${port}...`);
        connectToServer(port);
        break;
      }
      case "login": {
        if (!arg) {
          console.log("Please provide a token.");
          rl.prompt();
        } else {
          handleLogin(arg);
        }
        break;
      }
      case "help":
        console.log("Commands available:");
        console.log(
          "  connect [port] - Connect to the server (default port: 8080)"
        );
        console.log("  login [token]  - Authenticate with Bearer token");
        console.log("  exit           - Close the CLI");
        rl.prompt();
        break;
      case "exit":
        console.log("Exiting CLI.");
        rl.close();
        break;
      default:
        console.log(`Unknown command: "${line.trim()}"`);
        rl.prompt();
    }
  });

  rl.on("close", () => {
    console.log("CLI session ended.");
    process.exit(0);
  });
}

launchCLI();
