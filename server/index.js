import express from "express";
import http from "http";
import crypto from "crypto";
import { Server as SocketIO } from "socket.io";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import dotenv from "dotenv";
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};
const firebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(firebaseApp);

const app = express();
app.use(express.json());
const server = http.createServer(app);

const io = new SocketIO(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("⚡ Socket.IO client connected:", socket.id);

  socket.on("login", ({ accessToken }) => {
    try {
      const payload = jwt.verify(accessToken, process.env.JWT_SECRET);
      const uid = payload.uid;
      socket.data.uid = uid;
      socket.join(uid);
      socket.emit("message", { content: "Login successful" });
    } catch {
      socket.emit("message", "Invalid access token");
      socket.disconnect(true);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

app.post("/login", async (req, res) => {
  console.log("Login request received");
  const apiKey = req.body.apiKey;
  const rawKey = apiKey.slice(8);
  if (!apiKey) return res.status(400).send("API key required");
  const prefix = apiKey.slice(0, 8);
  console.log("Prefix:", prefix);
  const snap = await getDocs(
    query(collection(db, "apiKeys"), where("prefix", "==", prefix))
  );
  let matchedUid = null;
  for (const doc of snap.docs) {
    const { hashed, uid } = doc.data();
    console.log("Checking hashed key:", hashed);

    if (await bcrypt.compare(rawKey + process.env.TOKEN_PEPPER, hashed)) {
      matchedUid = uid;
      break;
    }
  }
  if (!matchedUid) return res.status(401).send("Invalid API key");

  const accessToken = jwt.sign({ uid: matchedUid }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
  const refreshToken = jwt.sign({ uid: matchedUid }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
  return res.json({ accessToken, refreshToken });
});

app.post("/refreshToken", (req, res) => {
  console.log("Refresh token request received");
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).send("Refresh token required");
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const uid = payload.uid;
    const newAccess = jwt.sign({ uid }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    const newRefresh = jwt.sign({ uid }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    return res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch {
    return res.status(401).send("Invalid refresh token");
  }
});

app.all(/^\/(?!socket\.io).*/, async (req, res) => {
  console.log("All request received:", req.method, req.originalUrl);
  const correlationId = uuidv4();
  const payload = {
    type: "request",
    correlationId,
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    body: req.body,
    query: req.query,
  };
  io.timeout(60000).emit("request", payload, (error, result) => {
    if (error) return res.status(502).send(error);
    const { status, headers, body } = result[0];
    const raw = Buffer.from(body, "base64");
    delete headers["content-encoding"];
    delete headers["transfer-encoding"];
    delete headers["content-length"];
    for (const [k, v] of Object.entries(headers)) {
      res.setHeader(k, v);
    }
    res.status(status).send(raw);
  });
});

server.listen(3000, () => {
  console.log("HTTP+Socket.IO server listening on port 3000");
});
