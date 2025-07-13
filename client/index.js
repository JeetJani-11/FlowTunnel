#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { io } = require("socket.io-client");
const fetch = require("node-fetch");
const { LocalStorage } = require("node-localstorage");
const kleur = require("kleur");
const http = require("http");

const baseDir = path.join(
  process.env.LOCALAPPDATA || process.cwd(),
  "MyTunnelCLI"
);
fs.mkdirSync(baseDir, { recursive: true });
const localStorage = new LocalStorage(path.join(baseDir, "scratch"));

let rl;
let isConnected = false;
let socket;
const serverUrl = "https://tunnel.jeetjani.xyz";
let tried = false;

function createSpinner() {
  const frames = ["|", "/", "-", "\\"];
  let idx = 0,
    interval;
  const draw = (text) =>
    process.stdout.write(
      `\r${frames[(idx = (idx + 1) % frames.length)]} ${text}`
    );
  return {
    start(text) {
      draw(text);
      interval = setInterval(() => draw(text), 100);
    },
    succeed(text) {
      clearInterval(interval);
      console.log(`\r${kleur.green("✔")} ${text}`);
    },
    warn(text) {
      clearInterval(interval);
      console.log(`\r${kleur.yellow("⚠")} ${text}`);
    },
  };
}

async function handleLogin(token) {
  try {
    const res = await fetch(`${serverUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: token }),
    });
    if (res.ok) {
      const { accessToken, refreshToken } = await res.json();
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      console.log(kleur.green("Login successful."));
      tried = false;
    } else {
      console.log(kleur.red(`Login failed: ${res.statusText}`));
    }
  } catch (err) {
    console.error(kleur.red("Login error:"), err);
  }
  rl.prompt();
}

function connectToServer(port) {
  const spinner = createSpinner();
  spinner.start(`Connecting to ${serverUrl} on port ${port}...`);

  socket = io(serverUrl, {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on("connect", () => {
    spinner.succeed("Connected to remote server!");
    isConnected = true;
    authenticate();
  });

  socket.on("message", (msg) => handleSocketMessage(spinner, msg));
  socket.on("request", (payload, ack) =>
    handleProxyRequest(port, payload, ack)
  );
  socket.on("error", (err) =>
    console.error(kleur.red(`Socket error: ${err.message}`))
  );
  socket.on("disconnect", () => {
    console.log(kleur.yellow("Disconnected from server."));
    isConnected = false;
    rl.prompt();
  });
}

function authenticate() {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    console.log(
      kleur.red("No access token found. Please log in with your API key.")
    );
    socket.disconnect();
    return;
  }
  socket.emit("login", { accessToken: token });
  console.log(kleur.cyan("Authenticating with stored token..."));
}

async function handleSocketMessage(spinner, message) {
  if (message.content === "Invalid access token") {
    spinner.warn("Invalid access token. Refreshing...");
    if (tried) {
      console.log(kleur.red("Refresh already attempted. Please log in again."));
      rl.prompt();
      return;
    }
    tried = true;
    await refreshTokens();
    return;
  }
  console.log(kleur.white(message.content));
}

async function refreshTokens() {
  const storedRefresh = localStorage.getItem("refreshToken");
  try {
    const res = await fetch(`${serverUrl}/refreshToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: storedRefresh }),
    });
    if (res.ok) {
      const { accessToken: newA, refreshToken: newR } = await res.json();
      localStorage.setItem("accessToken", newA);
      localStorage.setItem("refreshToken", newR);
      console.log(kleur.green("Tokens refreshed successfully."));
      socket.emit("login", { accessToken: newA });
      console.log(kleur.cyan("Re-authenticated with new token."));
    } else {
      console.log(kleur.red(`Failed to refresh token: ${res.statusText}`));
    }
  } catch (err) {
    console.error(kleur.red("Error refreshing tokens:"), err);
  }
  rl.prompt();
}
async function handleProxyRequest(port, payload, acknowledge) {
  const { correlationId, method, url, headers: orig, body } = payload;
  const [hostname, portStr] = ["127.0.0.1", port];
  const options = {
    hostname,
    port: portStr,
    path: url,
    method,
    headers: {
      ...orig,
      host: `${hostname}:${port}`,
      connection: "keep-alive",
    },
  };

  const req = http.request(options, (res) => {
    acknowledge({
      status: res.statusCode,
      headers: res.headers,
      correlationId,
    });
    res.on("data", (chunk) => {
      socket.emit("response-chunk", chunk, { correlationId });
    });

    res.on("end", () => {
      socket.emit("response-end", { correlationId });
    });
  });

  req.on("error", (err) => {
    acknowledge({ error: err.message });
  });
  if (body && method !== "GET") {
    try {
      req.write(body);
    } catch (e) {
      req.write(JSON.stringify(body));
    }
  }
  req.end();
}

function launchCLI() {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: kleur.green("my-cli> "),
  });

  rl.on("SIGINT", () => {
    console.log(kleur.yellow("\nCaught Ctrl+C — disconnecting..."));
    socket.disconnect();
  });

  console.log(kleur.cyan("🎉 Welcome to My Tunnel CLI! 🎉"));
  console.log(kleur.white("Available commands:"));
  console.log(kleur.yellow("  connect [port]  ") + "- Connect to the server");
  console.log(
    kleur.yellow("  login [token]   ") + "- Authenticate using API key"
  );
  console.log(kleur.yellow("  clear           ") + "- Clear the screen");
  console.log(kleur.yellow("  help            ") + "- Show this help menu");
  console.log(kleur.yellow("  exit            ") + "- Quit the CLI");
  rl.prompt();

  rl.on("line", (line) => {
    const [cmd, arg] = line.trim().split(" ");
    switch (cmd.toLowerCase()) {
      case "connect":
        if (isConnected) {
          console.log(
            kleur.yellow("Already connected. Type Ctrl+C to disconnect.")
          );
        } else {
          connectToServer(parseInt(arg, 10) || 8080);
        }
        break;

      case "login":
        if (!arg) {
          console.log(kleur.red("Please provide an API key."));
        } else {
          handleLogin(arg);
        }
        break;

      case "clear":
        console.clear();
        break;

      case "help":
        launchCLI();
        break;

      case "exit":
        console.log(kleur.cyan("Goodbye!"));
        rl.close();
        break;

      default:
        console.log(kleur.red(`Unknown command: "${line.trim()}"`));
    }
    rl.prompt();
  });

  rl.on("close", () => {
    process.exit(0);
  });
}

launchCLI();
