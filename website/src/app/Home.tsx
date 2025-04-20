"use client";
import { db, auth } from "@/firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Card,
  styled,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";

const GradientBackground = styled(Box)({
  minHeight: "100vh",
  background: "linear-gradient(45deg, #0a192f 0%, #172a45 100%)",
  color: "white",
  padding: "2rem",
});

const GlassCard = styled(Card)({
  background: "rgba(255, 255, 255, 0.05)",
  backdropFilter: "blur(10px)",
  borderRadius: "16px",
  padding: "2rem",
  boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
});

export default function Home() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [maskedTokens, setMaskedTokens] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setLoading(false);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [auth, router]);

  useEffect(() => {
    const fetchTokens = async () => {
      if (!user) return;
      const tokensQ = query(
        collection(db, "apiKeys"),
        where("uid", "==", user.uid)
      );
      const snap = await getDocs(tokensQ);
      const masks: string[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        if (data.hashed) {
          masks.push("*".repeat(data.hashed.length));
        }
      });
      setMaskedTokens(masks);
    };
    fetchTokens();
  }, [user]);

  const handleGenerateToken = async () => {
    if (!user) return;
    const res = await fetch("/api/key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: user.uid }),
    });
    const { apiKey } = await res.json();
    setRawToken(apiKey);
  };

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <GradientBackground
        display="flex"
        justifyContent="center"
        alignItems="center"
      >
        <Typography variant="h6">Initializing Secure Tunnel...</Typography>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground display="flex" flexDirection="column">
      <Box display="flex" justifyContent="flex-end" mb={4}>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<ExitToAppIcon />}
          onClick={handleLogout}
          sx={{
            "&:hover": { background: "rgba(255,255,255,0.1)" },
          }}
        >
          Logout
        </Button>
      </Box>

      <Box textAlign="center" mb={4}>
        <Typography
          variant="h2"
          sx={{
            fontWeight: 700,
            background: "linear-gradient(45deg, #00b4d8 30%, #90e0ef 90%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 0 20px rgba(144,224,239,0.3)",
          }}
        >
          Whatever Tunnel
        </Typography>
      </Box>

      <Box flex={1} display="flex" justifyContent="center" alignItems="center">
        <GlassCard>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6" sx={{ color: "#90e0ef" }}>
              Token
            </Typography>
            <Button variant="contained" onClick={handleGenerateToken}>
              Generate Token
            </Button>
          </Box>

          <Box display="flex" flexDirection="column" gap={2}>
            {rawToken && (
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography
                  variant="body1"
                  sx={{ fontFamily: "monospace", color: "#caf0f8" }}
                >
                  {rawToken}
                </Typography>
                <IconButton onClick={() => handleCopy(rawToken)}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
            )}

            {maskedTokens.length > 0 && (
              <Box mt={2}>
                {maskedTokens.map((mask, i) => (
                  <Typography
                    key={i}
                    variant="body2"
                    sx={{
                      fontFamily: "monospace",
                      color: "rgba(202,240,248,0.4)",
                    }}
                  >
                    {mask}
                  </Typography>
                ))}
              </Box>
            )}
            {maskedTokens.length === 0 && rawToken == null && (
              <Typography
                variant="body2"
                sx={{ fontFamily: "monospace", color: "#caf0f8" }}
              >
                No tokens generated yet.
              </Typography>
            )}
          </Box>
        </GlassCard>
      </Box>

      <Box mt="auto" textAlign="center">
        <Box
          sx={{
            margin: "2rem auto",
            width: "100px",
            height: "2px",
            background:
              "linear-gradient(90deg, transparent 0%, #00b4d8 50%, transparent 100%)",
          }}
        />
      </Box>
    </GradientBackground>
  );
}
