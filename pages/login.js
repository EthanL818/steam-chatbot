// pages/login.js
import { useState } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { useRouter } from "next/router";
import { auth } from "../lib/firebase";
import {
  Container,
  TextField,
  Button,
  Typography,
  Alert,
  Paper,
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google"; // Import Google icon

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push("/");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper
        elevation={6}
        sx={{
          padding: 2,
          backgroundColor: "#333",
          color: "#ECECEC",
        }}
      >
        <Typography component="h1" variant="h5" sx={{ color: "#ECECEC" }}>
          Login
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <form onSubmit={handleLogin}>
          <TextField
            variant="outlined"
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            InputLabelProps={{ style: { color: "#ECECEC" } }}
            InputProps={{ style: { color: "#ECECEC" } }}
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "#5C5C5C",
                },
                "&:hover fieldset": {
                  borderColor: "#0084FF",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#0084FF",
                },
              },
            }}
          />
          <TextField
            variant="outlined"
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            InputLabelProps={{ style: { color: "#ECECEC" } }}
            InputProps={{ style: { color: "#ECECEC" } }}
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "#5C5C5C",
                },
                "&:hover fieldset": {
                  borderColor: "#0084FF",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#0084FF",
                },
              },
            }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{
              mt: 3,
              backgroundColor: "#0084FF",
              "&:hover": {
                backgroundColor: "#005BB5",
              },
            }}
          >
            Login
          </Button>
          <Button
            type="button"
            variant="contained"
            fullWidth
            startIcon={<GoogleIcon />} // Add Google icon
            onClick={handleGoogleLogin}
            sx={{
              mt: 2,
              backgroundColor: "#DB4437",
              color: "#ECECEC", // Ensure text color is appropriate for dark mode
              "&:hover": {
                backgroundColor: "#C23321",
              },
            }}
          >
            Login with Google
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
