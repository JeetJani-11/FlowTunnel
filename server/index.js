import express from "express";
import { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid"; // npm install uuid

const app = express();
app.use(express.json());

const wss = new WebSocketServer({ host: "0.0.0.0", port: 8080 });
let connectedClient = null;

const pendingResponses = new Map();

wss.on("connection", function connection(ws) {
  console.log("WebSocket client connected");
  connectedClient = ws;

  ws.on("message", function message(data) {
    console.log("received:", data);
    const response = JSON.parse(data);
    const { correlationId, result } = response;

    if (pendingResponses.has(correlationId)) {
      pendingResponses.get(correlationId)(result);
      pendingResponses.delete(correlationId);
    }
  });
});

app.all(/(.*)/, async (req, res) => {
  if (!connectedClient || connectedClient.readyState !== 1) {
    return res.status(503).send("WebSocket client not connected");
  }

  const correlationId = uuidv4();

  const requestPayload = {
    correlationId,
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    body: req.body,
    query: req.query,
  };

  connectedClient.send(JSON.stringify(requestPayload));

  try {
    const response = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingResponses.delete(correlationId);
        reject(new Error("Timeout waiting for client response"));
      }, 10000);
      pendingResponses.set(correlationId, (result) => {
        clearTimeout(timeout);
        resolve(result);
      });
    });

    res.send(response);
  } catch (err) {
    res.status(504).send(err.message);
  }
});

app.listen(3000, () => {
  console.log("HTTP Server is running on port 3000");
});
