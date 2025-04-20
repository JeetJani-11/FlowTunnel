// app/api/key/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { db } from "@/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import crypto from "crypto";

function makePrefix(apiKey: string): string {
  const hmac = crypto.createHmac("sha256", process.env.TOKEN_PEPPER!);
  hmac.update(apiKey);
  return hmac.digest("hex").slice(0, 8);
}
export async function POST(req: Request) {
  const { uid } = await req.json();
  const raw = randomBytes(32).toString("hex");
  const hashed = await bcrypt.hash(raw + process.env.TOKEN_PEPPER, 12);
  const prefix = makePrefix(raw);
  const docRef = await addDoc(
    collection(db, "apiKeys"),
    { uid, hashed, prefix, createdAt: serverTimestamp() }
  );

  return NextResponse.json({ apiKey: prefix+raw, id: docRef.id });
}
