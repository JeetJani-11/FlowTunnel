#!/usr/bin/env node
const readline = require("readline");
const { io } = require("socket.io-client");
const fetch = require("node-fetch");
const { LocalStorage } = require("node-localstorage");
const localStorage = new LocalStorage("./scratch");

let rl;
let isConnected = false;
const serverUrl = "http://44.202.48.12";
let tried = false;
function connectToServer(port) {
  const socketUrl = `http://44.202.48.12:3000`;
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
  const accessToken = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");
  if (!accessToken) {
    console.log("Please login first.");
    unmutePrompt();
    return;
  }
  socket.on("connect", () => {
    console.log("Connected to remote server!");
    socket.send(
      JSON.stringify({
        type: "message",
        message: "Connected to remote server!",
      })
    );
    isConnected = true;
  });
  socket.emit("login", { accessToken });

  socket.on("message", async (message) => {
    if (message.content === "Invalid access token") {
      if (tried) {
        console.log("Please login again.");
        socket.disconnect();
        isConnected = false;
        unmutePrompt();
        return;
      }
      tried = true;
      const response = await fetch(`${serverUrl}/refreshToken`, {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
      if (response.ok) {
        const { accessToken, refreshToken } = await response.json();
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        socket.emit("login", { accessToken });
        console.log("Token refreshed successfully.");
      } else {
        console.log("Failed to refresh token:", response.statusText);
        socket.disconnect();
        isConnected = false;
        unmutePrompt();
      }
    }
    console.log(message.content);
    return;
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
      const bodyData = Buffer.from(buffer).toString("base64");
      acknowledge({
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: bodyData,
      });
    } catch (err) {
      console.error("Error handling request:", err);
      acknowledge({ error: err.message });
    }
  });
  socket.on("error", (err) => {
    process.stdout.write(`Socket error: ${err.message}\n`);
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from the server.");
    isConnected = false;
    setTimeout(() => unmutePrompt(), 200);
  });
}

async function handleLogin(token) {
  try {
    const response = await fetch(`${serverUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: token }),
    });
    console.log("Response status:", response.status);
    console.log("Response ", response);
    if (response.ok) {
      const { accessToken, refreshToken } = await response.json();
      // save tokens to local storage
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      console.log("Login successful.");
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
    const lowerCommand = command.toLowerCase();

    if (isConnected && lowerCommand !== "exit") {
      console.log("Already connected. Type 'exit' to quit.");
      rl.prompt();
      return;
    }

    switch (lowerCommand) {
      case "connect": {
        const port = parseInt(arg, 10) || 8080;
        console.log(`Attempting to connect on port ${port}...`);
        connectToServer(port);
        break;
      }

      case "login": {
        const token = arg;
        if (!token) {
          console.log("Please provide a token.");
          rl.prompt();
        } else {
          handleLogin(token);
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
