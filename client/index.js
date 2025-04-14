#!/usr/bin/env node
const readline = require("readline");
const WebSocket = require("ws");
const fetch = require("node-fetch");

let rl;
let isConnected = false;

function connectToServer(port = 8080) {
  const serverUrl = `ws://44.202.48.12:8080`;
  const ws = new WebSocket(serverUrl);

  mutePrompt(); // Stop showing CLI prompt
  console.log(`Connecting to ${serverUrl}...`);
  console.log("Please wait...");

  ws.on("open", function () {
    console.log("Connected to remote server!");
    ws.send(
      JSON.stringify({
        type: "message",
        message: "Connected to remote server!",
      })
    );
    isConnected = true;
  });

  ws.on("message", async function (message) {
    const parsedMessage = JSON.parse(message);
    if (parsedMessage.type === "message") {
      console.log(parsedMessage.message);
      return;
    }
    const { correlationId, method, url, headers, body, query } = parsedMessage;

    console.log(`Received from server: ${message}`);

    try {
      const parsedUrl = new URL(`http://localhost:${port}${url}`);
      console.log(`Parsed URL: ${parsedUrl}`);
      const response = await fetch(parsedUrl, {
        method,
        headers,
        body: method !== "GET" && body ? JSON.stringify(body) : undefined,
      });

      const buffer = await response.arrayBuffer();
      const bodyData = Buffer.from(buffer).toString("base64");

      ws.send(
        JSON.stringify({
          type: "response",
          correlationId,
          result: {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: bodyData,
          },
        })
      );
    } catch (err) {
      console.error("Error handling request:", err);
      ws.send(
        JSON.stringify({
          type: "response",
          correlationId,
          result: { error: err.message },
        })
      );
    }
  });
  ws.on("error", function (err) {
    process.stdout.write(`WebSocket error: ${err.message}\n`);
  });

  ws.on("close", function () {
    console.log("Disconnected from the server.");
    isConnected = false;
    setTimeout(() => unmutePrompt(), 200);
  });
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
    'Type "connect [port]" to connect, "help" for commands, or "exit" to quit.\n'
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
      case "connect":
        const port = parseInt(arg, 10) || 8080;
        console.log(`Attempting to connect on port ${port}...`);
        connectToServer(port);
        break;

      case "help":
        console.log("Commands available:");
        console.log(
          "  connect [port] - Connect to the server (default port: 8080)"
        );
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
