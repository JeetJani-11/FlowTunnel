"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { db, auth } from "@/firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  Box,
  Typography,
  Button,
  Card,
  IconButton,
  styled,
  useTheme,
  Paper,
  Snackbar,
  Alert,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

const PageWrapper = styled(Box)(({ theme }) => ({
  background: theme.palette.background.default,
  color: theme.palette.text.primary,
  padding: theme.spacing(4),
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  transition: "background 0.3s ease",
}));

const KeysCard = styled(Card)(({ theme }) => ({
  background: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius * 2,
  padding: theme.spacing(4),
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
  maxWidth: 600,
  width: "100%",
  transition: "transform 0.3s ease, box-shadow 0.3s ease",
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.1)",
  },
}));

const KeyList = styled(Box)(({ theme }) => ({
  maxHeight: 240,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  paddingRight: theme.spacing(1),
}));

const KeyItem = styled(Paper)(({ theme }) => ({
  background: theme.palette.action.hover,
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontFamily: "monospace",
  transition: "background 0.3s ease",
  "&:hover": {
    background: theme.palette.action.selected,
  },
}));

export default function ProfilePage() {
  const router = useRouter();
  const theme = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setLoading(false);
      } else {
        router.push("/login");
      }
    });
    return () => unsub();
  }, [router]);

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
      setApiKeys(masks);
    };
    fetchTokens();
  }, [user]);

  const handleGenerate = async () => {
    if (!user) return;
    const res = await fetch("/api/key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: user.uid }),
    });
    const { apiKey } = await res.json();
    setRawKey(apiKey);
    setApiKeys((prev) => [apiKey, ...prev]);
  };

  const handleCopy = (value: string) => {
    navigator.clipboard
      .writeText(value)
      .then(() => setSnackbar({ open: true, message: "Copied to clipboard!" }))
      .catch(() => setSnackbar({ open: true, message: "Copy failed" }));
  };

  const handleClose = () => {
    setSnackbar({ open: false, message: "" });
  };

  if (loading) {
    return (
      <PageWrapper justifyContent="center">
        <Typography variant="h6">Loading profile…</Typography>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: theme.spacing(3) }}>
        Your Profile
      </Typography>

      <KeysCard>
        <Box mb={theme.spacing(3)}>
          <Typography
            variant="subtitle2"
            sx={{ color: theme.palette.text.secondary }}
          >
            Email
          </Typography>
          <Typography variant="body1" sx={{ fontFamily: "monospace" }}>
            {user?.email}
          </Typography>
        </Box>

        <Box
          mb={theme.spacing(2)}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography
            variant="subtitle2"
            sx={{ color: theme.palette.text.secondary }}
          >
            API Keys
          </Typography>
          <Button
            variant="contained"
            size="medium"
            onClick={handleGenerate}
            sx={{ textTransform: "none", transition: "background 0.3s ease" }}
          >
            Generate Token
          </Button>
        </Box>

        <KeyList>
          {rawKey && (
            <KeyItem elevation={0}>
              <Box sx={{ flex: 1, pr: theme.spacing(1) }}>
                <Typography
                  variant="body1"
                  sx={{
                    fontFamily: "monospace",
                    wordBreak: "break-all",
                    fontSize: "1rem",
                  }}
                >
                  {rawKey}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: theme.palette.error.main }}
                >
                  ⚠️ Only this one-time view.
                </Typography>
              </Box>
              <IconButton
                size="large"
                color="primary"
                onClick={() => handleCopy(rawKey)}
              >
                <ContentCopyIcon />
              </IconButton>
            </KeyItem>
          )}

          {apiKeys.length > (rawKey ? 1 : 0) &&
            apiKeys.slice(rawKey ? 1 : 0).map((key, idx) => (
              <KeyItem key={idx} elevation={0}>
                <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                  {key}
                </Typography>
              </KeyItem>
            ))}

          {apiKeys.length === 0 && !rawKey && (
            <Typography
              variant="body2"
              sx={{ color: theme.palette.text.secondary }}
            >
              No API keys generated yet.
            </Typography>
          )}
        </KeyList>
      </KeysCard>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleClose} severity="success" sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PageWrapper>
  );
}
