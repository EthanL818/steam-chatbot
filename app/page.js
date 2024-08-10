"use client";

import {
  Box,
  Button,
  Stack,
  TextField,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Typography,
  createTheme,
  ThemeProvider,
} from "@mui/material";
import { useState, useRef, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { styled } from "@mui/system";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import SendIcon from "@mui/icons-material/Send";
import SteamIcon from "@mui/icons-material/SportsEsports";
import LogoutIcon from "@mui/icons-material/Logout";
import { auth, db } from "../lib/firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { RateLimitError } from "openai";

const drawerWidth = 240;

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#1976d2",
    },
    background: {
      default: "#121212",
      paper: "#1e1e1e",
    },
  },
});

const Main = styled("main", { shouldForwardProp: (prop) => prop !== "open" })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${drawerWidth}px`,
    ...(open && {
      marginLeft: 0,
      transition: theme.transitions.create("margin", {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
  })
);

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: "flex-end",
}));

export default function Home() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [chats, setChats] = useState([]);

  const handleLogout = () => {
    auth.signOut();
    router.push("/login");
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      const fetchChats = () => {
        const chatsCollection = collection(db, "users", user.uid, "chats");
        const q = query(chatsCollection, orderBy("createdAt", "desc"));

        onSnapshot(q, (snapshot) => {
          const chatList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setChats(chatList);
        });
      };

      fetchChats();
    }
  }, [user]);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const startNewChat = async () => {
    if (!user) return;

    const newChatRef = await addDoc(
      collection(db, "users", user.uid, "chats"),
      {
        createdAt: serverTimestamp(),
        name: "New Chat",
      }
    );

    setChatId(newChatRef.id);
    setMessages([
      {
        role: "assistant",
        content: "Hi! I'm a Steam support assistant. How can I help you today?",
      },
    ]);
  };

  const saveMessage = async (message) => {
    if (!user || !chatId) return;

    const messageRef = collection(
      db,
      "users",
      user.uid,
      "chats",
      chatId,
      "messages"
    );
    await addDoc(messageRef, {
      ...message,
      createdAt: serverTimestamp(),
    });

    if (message.role === "user" && messages.length === 1) {
      const chatRef = doc(db, "users", user.uid, "chats", chatId);
      await updateDoc(chatRef, {
        name:
          message.content.slice(0, 30) +
          (message.content.length > 30 ? "..." : ""),
      });
    }
  };

  const loadChatMessages = async (chatId) => {
    if (!user) return;

    const messagesCollection = collection(
      db,
      "users",
      user.uid,
      "chats",
      chatId,
      "messages"
    );
    const q = query(messagesCollection, orderBy("createdAt", "asc"));

    onSnapshot(q, (snapshot) => {
      const loadedMessages = snapshot.docs.map((doc) => doc.data());
      setMessages(loadedMessages);
    });
  };

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;
    setIsLoading(true);

    const newUserMessage = { role: "user", content: message };
    setMessage("");
    setMessages((messages) => [...messages, newUserMessage]);

    await saveMessage(newUserMessage);

    const retryDelay = 5000; // Delay in milliseconds (e.g., 5 seconds)
    const maxRetries = 3; // Maximum number of retries

    const fetchAssistantMessage = async (retryCount = 0) => {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify([...messages, newUserMessage]),
        });

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = { role: "assistant", content: "" };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          assistantMessage.content += text;
          setMessages((messages) => [
            ...messages.slice(0, -1),
            assistantMessage,
          ]);
        }

        await saveMessage(assistantMessage);
      } catch (error) {
        console.error("Error:", error);
        if (error instanceof RateLimitError && retryCount < maxRetries) {
          console.log(
            `Rate limit exceeded. Retrying in ${retryDelay / 1000} seconds...`
          );
          setTimeout(() => fetchAssistantMessage(retryCount + 1), retryDelay);
        } else {
          setMessages((messages) => [
            ...messages,
            {
              role: "assistant",
              content:
                error instanceof RateLimitError
                  ? "I'm sorry, but I've reached my daily usage limit. Please try again later."
                  : "I'm sorry, but I encountered an error. Please try again later.",
            },
          ]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssistantMessage();
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const StyledMarkdown = styled(ReactMarkdown)(({ theme }) => ({
    color: theme.palette.text.primary,
    "& h1, & h2, & h3, & h4, & h5, & h6": {
      color: theme.palette.text.primary,
      margin: theme.spacing(2, 0, 1, 0),
    },
    "& a": {
      color: theme.palette.primary.main,
      textDecoration: "none",
    },
    "& ul, & ol": {
      margin: theme.spacing(1, 0, 1, 3),
    },
    "& blockquote": {
      borderLeft: `4px solid ${theme.palette.divider}`,
      paddingLeft: theme.spacing(2),
      margin: theme.spacing(2, 0),
      color: theme.palette.text.secondary,
    },
    "& code": {
      backgroundColor: theme.palette.action.hover,
      padding: theme.spacing(0.5, 1),
      borderRadius: theme.shape.borderRadius,
      fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
    },
    "& pre": {
      backgroundColor: theme.palette.action.hover,
      padding: theme.spacing(2),
      borderRadius: theme.shape.borderRadius,
      overflowX: "auto",
      "& code": {
        backgroundColor: "transparent",
        padding: 0,
      },
    },
  }));

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          display: "flex",
          bgcolor: "background.default",
          color: "text.primary",
          maxHeight: "100vh",
          overflow: "hidden",
        }}
      >
        <Drawer
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              bgcolor: "background.paper",
            },
          }}
          variant="persistent"
          anchor="left"
          open={open}
        >
          <DrawerHeader>
            <IconButton onClick={handleDrawerClose}>
              <ChevronLeftIcon />
            </IconButton>
          </DrawerHeader>
          <Divider />
          <Stack spacing={2} p={2}>
            <Button variant="contained" color="primary" onClick={startNewChat}>
              New Chat
            </Button>
            <List>
              {chats.map((chat) => (
                <ListItem
                  button
                  key={chat.id}
                  onClick={() => {
                    setChatId(chat.id);
                    loadChatMessages(chat.id);
                  }}
                >
                  <ListItemText
                    primary={chat.name || `Chat ${chat.id.slice(0, 5)}`}
                  />
                </ListItem>
              ))}
            </List>
          </Stack>
          <Box sx={{ mt: "auto", p: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              fullWidth
            >
              Logout
            </Button>
          </Box>
        </Drawer>
        <Main open={open}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              onClick={handleDrawerOpen}
              edge="start"
              sx={{ mr: 2, ...(open && { display: "none" }) }}
            >
              <MenuIcon />
            </IconButton>
            <SteamIcon sx={{ mr: 1 }} />
            <Typography variant="h6" noWrap component="div">
              Steam Support Chat
            </Typography>
          </Box>
          <Stack
            direction="column"
            height="calc(100vh - 48px)"
            justifyContent="space-between"
            sx={{ overflow: "hidden" }}
          >
            <Box flexGrow={1} overflow="auto" mb={2}>
              {messages.map((msg, index) => (
                <Box
                  key={index}
                  mb={2}
                  sx={{
                    bgcolor:
                      msg.role === "assistant" ? "action.hover" : "transparent",
                    p: 2,
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    {msg.role === "assistant" ? "Steam Support" : "You"}
                  </Typography>
                  <StyledMarkdown>{msg.content}</StyledMarkdown>
                </Box>
              ))}
              <div ref={messagesEndRef} />
            </Box>
            <Box sx={{ pb: 2, display: "flex", alignItems: "flex-end" }}>
              <TextField
                fullWidth
                variant="outlined"
                multiline
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your message here..."
                sx={{ mr: 1 }}
              />
              <IconButton
                color="primary"
                onClick={sendMessage}
                disabled={isLoading}
                sx={{ mb: 1 }}
              >
                <SendIcon />
              </IconButton>
            </Box>
          </Stack>
        </Main>
      </Box>
    </ThemeProvider>
  );
}
