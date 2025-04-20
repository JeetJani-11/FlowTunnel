// app/api/key/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { db } from "@/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function POST(req: Request) {
  const { uid } = await req.json();
  const raw = randomBytes(32).toString("hex");
  const hashed = await bcrypt.hash(raw + process.env.TOKEN_PEPPER, 12);
  const prefix = hashed.slice(0, 8);
  const docRef = await addDoc(
    collection(db, "apiKeys"),
    { uid, hashed, prefix, createdAt: serverTimestamp() }
  );

  return NextResponse.json({ apiKey: raw, id: docRef.id });
}
