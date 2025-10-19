import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import '../App.css'; // Import the CSS

// --- TypeScript Type Definitions ---
interface Message {
  sender: 'user' | 'ai';
  text: string;
}
interface ConversationProps {
  userId: string; // This component now requires a userId
}
interface ChatBubbleProps {
  message: Message;
}
interface MessageInputProps {
  onSend: (text: string) => void;
}

// --- Components (No changes needed) ---

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  return (
    <div className={`message-bubble ${isUser ? 'user' : 'ai'}`}>
      <div className="bubble-content">
        {message.text}
      </div>
    </div>
  );
};

const MessageInput: React.FC<MessageInputProps> = ({ onSend }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSend(text.trim());
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="message-input-form">
      <button type="button">🎤</button>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type or speak..."
      />
      <button type="submit">→</button>
    </form>
  );
};

// --- Main Page (Updated) ---
const Conversation: React.FC<ConversationProps> = ({ userId }) => {
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!socket || !userId) return; // Wait for socket and userId

    // Send userId along with scenario
    socket.emit('startConversation', { scenario: scenarioId, userId });

    // --- NEW: Listen for 'limitReached' event ---
    const handleLimitReached = () => {
      alert("You've reached your daily conversation limit!");
      navigate('/'); // Go back to dashboard
    };

    // --- (Existing Listeners) ---
    const handleAiMessage = (text: string) => {
      setIsTyping(false);
      setMessages(prev => [...prev, { sender: 'ai', text }]);
    };
    const handleAiChunk = (chunk: string) => {
      setIsTyping(true);
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.sender === 'ai') {
          return [ ...prev.slice(0, -1), { ...lastMessage, text: lastMessage.text + chunk } ];
        } else {
          return [...prev, { sender: 'ai', text: chunk }];
        }
      });
    };
    const handleAiEnd = () => setIsTyping(false);
    const handleError = (error: string) => { console.error(error); alert(`Error: ${error}`); };

    // --- Setup all listeners ---
    socket.on('limitReached', handleLimitReached);
    socket.on('aiMessage', handleAiMessage);
    socket.on('aiMessageChunk', handleAiChunk);
    socket.on('aiMessageEnd', handleAiEnd);
    socket.on('error', handleError);

    // --- Cleanup all listeners ---
    return () => {
      socket.off('limitReached', handleLimitReached);
      socket.off('aiMessage', handleAiMessage);
      socket.off('aiMessageChunk', handleAiChunk);
      socket.off('aiMessageEnd', handleAiEnd);
      socket.off('error', handleError);
    };
  }, [socket, scenarioId, userId, navigate]); // Add userId and navigate to dependency array

  // Send user message (No changes needed)
  const handleSend = (text: string) => {
    if (!socket) return;
    setMessages(prev => [...prev, { sender: 'user', text }]);
    socket.emit('sendMessage', text);
    setIsTyping(true);
  };

  // (No changes needed for JSX)
  return (
    <div className="conversation-container">
      <header className="conversation-header">
        <div className="header-content">
          <button onClick={() => navigate(-1)}>&lt; Back</button>
          <h2>{scenarioId?.replace('-', ' ')}</h2>
        </div>
      </header>
      <div className="message-list">
        {messages.map((msg, index) => (
          <ChatBubble key={index} message={msg} />
        ))}
        {isTyping && (
          <div className="typing-indicator">AI is typing...</div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput onSend={handleSend} />
    </div>
  );
};

export default Conversation;