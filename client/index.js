#!/usr/bin/env node
const readline = require('readline');
const WebSocket = require('ws');

function connectToServer() {
  const serverUrl = "ws://yourserver.com:8080"; 
  try {
    const ws = new WebSocket(serverUrl);
  } catch (error) {
    console.error("Error creating WebSocket:", error);
  }
  console.log(`Connecting to ${serverUrl}...`);
  console.log("Please wait...");
  ws.on("open", function () {
    ws.send("Hello from the client!");
    console.log("Connected to remote server!");
  });

  ws.on("message", function (message) {
    console.log(`Received from server: ${message}`);
  });

  ws.on("error", function (err) {
    console.error("WebSocket error:", err);
  });

  ws.on("close", function () {
    console.log("Disconnected from the server.");
  });
}

function launchCLI() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "my-cli> ",
  });

  console.log("Welcome to My Tunnel CLI!");
  console.log(
    'Type "connect" to establish a connection, "help" for commands, or "exit" to quit.\n'
  );

  // Display the prompt
  rl.prompt();

  // Read and process each command line input
  rl.on("line", (line) => {
    const command = line.trim().toLowerCase();

    switch (command) {
      case "connect":
        console.log("Attempting to connect...");
        connectToServer();
        break;

      case "help":
        console.log("Commands available:");
        console.log("  connect - Establish a connection to the remote server");
        console.log("  exit    - Close the CLI");
        break;

      case "exit":
        console.log("Exiting CLI.");
        rl.close();
        return;

      default:
        console.log(`Unknown command: "${command}"`);
    }
    rl.prompt();
  });

  rl.on("close", () => {
    console.log("CLI session ended.");
    process.exit(0);
  });
}

launchCLI();
