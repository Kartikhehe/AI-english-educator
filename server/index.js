import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// --- Supabase & App Setup ---
// Use SERVICE_ROLE key for server-side operations (bypass RLS safely)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"],
  },
});

// --- Gemini AI Setup ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const chatSessions = new Map();

// Helper to get today's date (YYYY-MM-DD)
const getToday = () => new Date().toISOString().split('T')[0];

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // --- Fetch user data from Supabase ---
  socket.on('getUserData', async ({ userId }) => {
    if (!userId) {
      console.error("No userId provided from client");
      socket.emit('userDataError', { message: "Missing userId" });
      return;
    }

    const today = getToday();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // 1️⃣ Fetch user profile (UUID type)
    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)   // ✅ userId is now a UUID string
      .single();

    if (error || !user) {
      console.error("Error fetching user profile:", error);
      socket.emit('userDataError', { message: "Could not find user profile." });
      return;
    }

    let needsUpdate = false;
    const updates = {};

    // 2️⃣ Streak Logic
    if (user.last_login_date === yesterdayStr) {
      updates.streak = user.streak + 1;
      needsUpdate = true;
    } else if (user.last_login_date !== today) {
      updates.streak = 1;
      needsUpdate = true;
    }

    // Always update last_login_date if not today
    if (user.last_login_date !== today) {
      updates.last_login_date = today;
      needsUpdate = true;
    }

    // 3️⃣ Daily Conversation Reset Logic
    if (user.last_conversation_date !== today) {
      updates.daily_conversations = 0;
      updates.last_conversation_date = today;
      needsUpdate = true;
    }

    // 4️⃣ Apply updates if needed
    if (needsUpdate) {
      const { data: updatedUser, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating user profile:", updateError);
        socket.emit('userData', user); // Send old data to prevent hanging
        return;
      }

      socket.emit('userData', updatedUser);
      return;
    }

    // 5️⃣ Send user data if no update needed
    socket.emit('userData', user);
  });

  // --- Start conversation ---
  socket.on('startConversation', async ({ scenario, userId }) => {
    if (!userId) {
      socket.emit('error', 'Missing userId.');
      return;
    }

    const { data: user, error } = await supabase
      .from('profiles')
      .select('daily_conversations, is_premium')
      .eq('id', userId)
      .single();

    if (error || !user) {
      socket.emit('error', 'User not found.');
      return;
    }

    if (user.daily_conversations >= 3 && !user.is_premium) {
      socket.emit('limitReached');
      return;
    }

    try {
        const systemPrompt = `You are "Aexy," a friendly and patient English teacher. Your role is to conduct a practice conversation with a student.

        **Scenario:** "${scenario}"
        
        **Your Instructions:**
        1.  **Start the Conversation:** Begin the conversation immediately with a natural, welcoming opening line that fits the scenario.
        2.  **Keep it Conversational:** Your primary goal is to keep the conversation flowing. Always end your response with a follow-up question or a natural prompt that encourages the student to speak again.
        3.  **Manage Length:** Keep your responses to 1-3 sentences. This is to ensure the student isn't overwhelmed, but it should still be a complete thought.
        4.  **Gently Correct Errors (Important):** When the student makes a grammatical mistake, *first* respond naturally to what they said. *Then*, at the end of your message, provide a gentle correction.
        
        **Example of Correction:**
        Student: "I goed to the park yesterday."
        You: "Oh, that sounds fun! What did you see at the park? (By the way, the correct past tense is 'went', so you would say 'I *went* to the park.')"
        
        Do not break character. Start the conversation with your first line now.
        maxOutputTokens is 500.
        `;
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: systemPrompt
      });

      const chat = model.startChat({
        history: [],
        generationConfig: { maxOutputTokens: 500 }
      });

      chatSessions.set(socket.id, { chat, userMessageCount: 0, userId });

      const result = await chat.sendMessage("START_CONVERSATION");
      socket.emit('aiMessage', result.response.text());
    } catch (e) {
      console.error('Error starting conversation:', e);
      socket.emit('error', 'Failed to start conversation.');
    }
  });

  // --- Handle message sending + update daily count ---
  socket.on('sendMessage', async (message) => {
    const session = chatSessions.get(socket.id);
    if (!session) {
      socket.emit('error', 'Chat session not found.');
      return;
    }

    session.userMessageCount += 1;
    const { chat, userMessageCount, userId } = session;

    // Every 5 messages = 1 daily conversation
    if (userMessageCount === 5) {
      const { data: user, error } = await supabase
        .from('profiles')
        .select('daily_conversations, is_premium')
        .eq('id', userId)
        .single();

      if (user && !user.is_premium) {
        const newCount = user.daily_conversations + 1;
        await supabase
          .from('profiles')
          .update({
            daily_conversations: newCount,
            last_conversation_date: getToday(),
          })
          .eq('id', userId);
        socket.emit('conversationCompleted', {
          daily_conversations: newCount,
        });
      }
    }

    try {
      const result = await chat.sendMessageStream(message);
      for await (const chunk of result.stream) {
        socket.emit('aiMessageChunk', chunk.text());
      }
      socket.emit('aiMessageEnd');
    } catch (e) {
      console.error('Error sending message:', e);
      socket.emit('error', 'Failed to get AI response.');
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    chatSessions.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
