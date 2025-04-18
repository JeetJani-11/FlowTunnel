"use client";
import firebase_app from "../firebase/config";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
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
  const auth = getAuth(firebase_app);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setLoading(false);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [auth, router]);

  const handleCopyUUID = () => {
    navigator.clipboard.writeText(user?.uid || "");
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
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
          <Typography variant="h6" gutterBottom sx={{ color: "#90e0ef" }}>
            Token
          </Typography>

          <Box display="flex" alignItems="center" gap={2}>
            <Typography
              variant="body1"
              sx={{
                fontFamily: "monospace",
                wordBreak: "break-all",
                color: "#caf0f8",
              }}
            >
              {user?.uid}
            </Typography>

            <IconButton
              onClick={handleCopyUUID}
              sx={{
                color: "#90e0ef",
                "&:hover": { background: "rgba(144,224,239,0.1)" },
              }}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
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

      {/* Animated background elements */}
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: -1,
          background:
            "radial-gradient(circle at 50% 50%, rgba(16, 64, 128, 0.1) 0%, transparent 70%)",
          animation: "pulse 8s infinite",
          "@keyframes pulse": {
            "0%": { transform: "scale(1)" },
            "50%": { transform: "scale(1.05)" },
            "100%": { transform: "scale(1)" },
          },
        }}
      />
    </GradientBackground>
  );
}
