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
} from "firebase/firestore";
import dotenv from "dotenv";
import { createClient } from "redis";
dotenv.config();
const redisClient = createClient({
  username: "default",
  password: process.env.REDISPASS,
  socket: {
    host: process.env.REDISHOST,
    port: 11140,
  },
});
await redisClient.connect();

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

console.log("Firebase config:", firebaseConfig);
const firebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(firebaseApp);

const tunnelMap = new Map();

const app = express();
app.use(express.json());
const server = http.createServer(app);
const io = new SocketIO(server, {
  cors: { origin: "*" },
  maxHttpBufferSize: 300 * 1024 * 1024,
});
const ongoingResponses = new Map();

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("response-chunk", (chunk, { correlationId }) => {
    const res = ongoingResponses.get(correlationId);
    if (res) res.write(chunk);
  });

  socket.on("response-end", ({ correlationId }) => {
    const res = ongoingResponses.get(correlationId);
    if (res) {
      res.end();
      ongoingResponses.delete(correlationId);
    }
  });

  socket.on("login", async ({ accessToken }) => {
    try {
      console.log("Login request received. Access token:", accessToken);
      const { uid } = jwt.verify(accessToken, process.env.JWT_SECRET);
      const existingSubdomain = await redisClient.get(`${uid}`);
      console.log("Existing subdomain for UID:", uid, "is", existingSubdomain);
      if (existingSubdomain !== null) {
        return socket.emit("message", { content: "Already logged in" });
      }
      socket.data.uid = uid;
      socket.join(uid);
      const subdomain = crypto.randomBytes(4).toString("hex");
      socket.data.subdomain = subdomain;
      await redisClient.set(`${uid}`, subdomain);
      await redisClient.set(`${subdomain}`, uid);
      socket.emit("message", {
        content: `Login successful. Visit : https://${subdomain}.tunnel.jeetjani.xyz/`,
      });
    } catch (err) {
      console.warn("Auth failed:", err.message);
      socket.emit("message", { content: "Invalid access token" });
    }
  });

  socket.on("disconnect", async () => {
    await redisClient.del(`${socket.data.uid}`);
    await redisClient.del(`${socket.data.subdomain}`);
    console.log("Client disconnected:", socket.id);
  });
});

app.post("/login", async (req, res) => {
  console.log("Login request received");
  const { apiKey } = req.body;
  console.log("API Key:", apiKey);
  if (!apiKey) return res.status(400).send("API key required");

  const prefix = apiKey.slice(0, 8);
  const rawKey = apiKey.slice(8);

  const snap = await getDocs(
    query(collection(db, "apiKeys"), where("prefix", "==", prefix))
  );

  let matchedUid = null;
  for (const doc of snap.docs) {
    const { hashed, uid } = doc.data();
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

  return res.json({
    accessToken,
    refreshToken,
  });
});

app.post("/refreshToken", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).send("Refresh token required");
  try {
    const { uid } = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const accessToken = jwt.sign({ uid }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    const newRefresh = jwt.sign({ uid }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    return res.json({ accessToken, refreshToken: newRefresh });
  } catch {
    return res.status(401).send("Invalid refresh token");
  }
});

app.all(/^\/(?!socket\.io).*/, async (req, res, next) => {
  const subdomainRegex = /^([^.]+)\.tunnel\.jeetjani\.xyz$/;
  const match = (req.headers.host || "").match(subdomainRegex);

  if (!match) return next();

  const sub = match[1];
  const uid = await redisClient.get(sub);
  console.log(`Subdomain: ${sub}, UID: ${uid}`);
  if (!uid) return res.status(400).send("Invalid or expired tunnel");

  const correlationId = uuidv4();
  const payload = {
    correlationId,
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    body: req.body,
    query: req.query,
  };

  io.to(uid)
    .timeout(60000)
    .emit("request", payload, (err, results) => {
      if (err) return res.status(502).send(err);
      const { status, headers, correlationId } = results[0];

      if (status === undefined || headers === undefined || !correlationId) {
        return res.status(502).send("Invalid response metadata");
      }

      // Set headers
      for (const [k, v] of Object.entries(headers)) {
        if (
          !["content-encoding", "transfer-encoding", "content-length"].includes(
            k.toLowerCase()
          )
        ) {
          res.setHeader(k, v || "");
        }
      }

      res.status(status);
      ongoingResponses.set(correlationId, res);
    });
});

server.listen(3000, () => console.log("Server listening on port 3000"));
