"use client";
import { useState, useEffect } from "react";
import Home from "./Home";
import DocsPage from "./documentation";

export default function HomeWrapper() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <div>Loading…</div>;
  return <DocsPage/>;
}
