import { Routes, Route } from 'react-router-dom';
import React, { useState, useEffect } from 'react'; // <-- THIS IS THE FIX
import Dashboard from './pages/Dashboard';
import Conversation from './pages/Conversation';
import { useSocket } from './context/SocketContext';
import './App.css';
import { createClient, type Session } from '@supabase/supabase-js';

// --- Material-UI Imports ---
import { Container, Paper, TextField, Button, CircularProgress, Avatar, Typography, Box } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';

// --- Initialize Supabase Client ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Type Definitions ---
export interface UserProfile {
  id: string;
  streak: number;
  daily_conversations: number;
  is_premium: boolean;
}

// --- Auth Component ---
const Auth = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const { error } = await supabase.auth.signInWithOtp({ email });
            if (error) throw error;
            alert('Check your email for the login link!');
        } catch (error: any) {
            alert(error.error_description || error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container component="main" maxWidth="xs" sx={{ display: 'flex', alignItems: 'center', height: '100vh' }}>
            <Paper elevation={6} sx={{ padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                <Avatar sx={{ m: 1, bgcolor: 'var(--accent-primary)' }}>
                    <SmartToyIcon />
                </Avatar>
                <Typography component="h1" variant="h5">
                    Welcome to Aexy
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3, textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Sign in via magic link with your email below
                </Typography>
                <Box component="form" onSubmit={handleLogin} noValidate sx={{ width: '100%' }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Email Address"
                        name="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        InputLabelProps={{ style: { color: 'var(--text-secondary)' } }}
                        sx={{ input: { color: 'var(--text-primary)' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'var(--border-color)' } } }}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={loading}
                        sx={{ mt: 3, mb: 2, py: 1.5, backgroundColor: 'var(--accent-primary)', '&:hover': { backgroundColor: '#7178d8' } }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Send Magic Link'}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};


// --- App Component ---
function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const socket = useSocket();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!socket || !session) {
        setUserProfile(null);
        return;
    };
    socket.emit('getUserData', { userId: session.user.id });
    const handleUserData = (data: UserProfile) => setUserProfile(data);
    const handleConversationCompleted = ({ daily_conversations }: { daily_conversations: number}) => {
      setUserProfile(prevProfile => prevProfile ? { ...prevProfile, daily_conversations } : null);
    };
    socket.on('userData', handleUserData);
    socket.on('conversationCompleted', handleConversationCompleted);
    return () => {
      socket.off('userData', handleUserData);
      socket.off('conversationCompleted', handleConversationCompleted);
    };
  }, [socket, session]);

  const handleLogout = async () => {
      await supabase.auth.signOut();
  };

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="app-container">
        <Routes>
            <Route path="/" element={<Dashboard user={userProfile} session={session} onLogout={handleLogout} />} />
            <Route path="/chat/:scenarioId" element={<Conversation userId={session.user.id}/>} />
        </Routes>
    </div>
  );
}

export default App;

