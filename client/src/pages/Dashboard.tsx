import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserProfile } from '../App';
import '../App.css';

// --- Material-UI Imports for Icons ---
import { IconButton } from '@mui/material';
import { ChevronLeft, ChevronRight, Flame, BookOpen, Trophy } from 'lucide-react';

// --- TypeScript Type Definitions ---
interface DashboardProps {
  user: UserProfile | null;
}
interface Scenario {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  duration: string;
  isPremium: boolean;
  image: string;
}
interface ScenarioCardProps {
  scenario: Scenario;
  onStart: (id: string) => void;
  onUpgrade: () => void;
  isLocked: boolean;
  isActive: boolean;
}

// --- Scenario Data with High-Quality Images ---
const scenarios: Scenario[] = [
  {
    id: 'job-interview',
    title: 'Job Interview',
    description: 'Practice common interview questions and refine your professional English communication skills.',
    difficulty: 'Medium',
    duration: '10 min',
    isPremium: false,
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=2940&auto=format&fit=crop'
  },
  {
    id: 'coffee-shop',
    title: 'Ordering Coffee',
    description: 'Master everyday phrases for ordering at cafes and casual conversations with baristas.',
    difficulty: 'Easy',
    duration: '5 min',
    isPremium: false,
    image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?q=80&w=2940&auto=format&fit=crop'
  },
  {
    id: 'debate-club',
    title: 'Debate Club',
    description: 'Develop persuasive language skills and learn to articulate complex arguments clearly.',
    difficulty: 'Hard',
    duration: '15 min',
    isPremium: true,
    image: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?q=80&w=2940&auto=format&fit=crop'
  },
  {
    id: 'travel-planning',
    title: 'Travel Planning',
    description: 'Practice discussing destinations, booking accommodations, and handling travel inquiries.',
    difficulty: 'Medium',
    duration: '10 min',
    isPremium: false,
    image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=2940&auto=format&fit=crop'
  },
  {
    id: 'restaurant-reservation',
    title: 'Restaurant Reservation',
    description: 'Learn to make reservations, order food, and navigate restaurant conversations confidently.',
    difficulty: 'Easy',
    duration: '5 min',
    isPremium: false,
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2940&auto=format&fit=crop'
  },
];

// --- Components ---

const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, onStart, onUpgrade, isLocked, isActive }) => {
  const handleClick = () => {
    if (scenario.isPremium) onUpgrade();
    else if (!isLocked) onStart(scenario.id);
  };
  return (
    <div className="scenario-card-container">
        <div className={`scenario-card ${isActive ? 'active' : ''} ${isLocked || scenario.isPremium ? 'locked' : ''}`}>
            <div className="card-image" style={{ backgroundImage: `url(${scenario.image})` }} />
            <div className="card-content">
                <h3 className="card-title">{scenario.title}</h3>
                <p className="card-description">{scenario.description}</p>
                <div className="card-meta">
                <span>{scenario.difficulty}</span> • <span>{scenario.duration}</span>
                </div>
                <button onClick={handleClick} disabled={isLocked && !scenario.isPremium} className="start-button">
                {scenario.isPremium ? 'Upgrade ✨' : (isLocked ? 'Locked 🔒' : 'Start')}
                </button>
            </div>
        </div>
    </div>
  );
};

const UpgradeModal: React.FC<{open: boolean, onClose: () => void, reason: 'limit' | 'premium_feature'}> = ({ open, onClose, reason }) => {
  if (!open) return null;
  const title = reason === 'limit' ? "Daily Limit Reached" : "Premium Feature";
  const text = reason === 'limit' 
    ? "You've used your 3 free conversations for today. For unlimited practice, upgrade to Premium!"
    : "This scenario is a Premium feature. Unlock this and more with a Premium account!";

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-scale-in">
        <h2>{title} ✨</h2>
        <p>{text}</p>
        <div className="modal-plans">
          <div className="plan-card"><h3>Monthly</h3><p>$9.99/mo</p></div>
          <div className="plan-card popular"><h3>Yearly</h3><p>$5.99/mo</p><span>Save 40%</span></div>
        </div>
        <button className="upgrade-btn" onClick={onClose}>Upgrade Now</button>
        {reason === 'limit' && <button className="secondary-btn" onClick={onClose}>Come Back Tomorrow</button>}
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalReason, setModalReason] = useState<'limit' | 'premium_feature'>('limit');
  const carouselRef = useRef<HTMLDivElement>(null);

  const dailyLimit = 3;
  const streak = user?.streak ?? 0;
  const dailyConversations = user?.daily_conversations ?? 0;
  const isPremium = user?.is_premium ?? false;

  const streakProgress = ((streak - 1) % 7) / 6 * 100;
  const dailyProgress = (dailyConversations / dailyLimit) * 100;
  const dailyLimitReached = dailyConversations >= dailyLimit;

  const goToNext = () => {
    setActiveIndex((prev) => (prev + 1) % scenarios.length);
  };

  const goToPrev = () => {
    setActiveIndex((prev) => (prev - 1 + scenarios.length) % scenarios.length);
  };

  useEffect(() => {
    if (carouselRef.current) {
      const activeCard = carouselRef.current.children[activeIndex] as HTMLElement;
      if (activeCard) {
        const scrollLeft = activeCard.offsetLeft - (carouselRef.current.offsetWidth / 2) + (activeCard.offsetWidth / 2);
        carouselRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [activeIndex]);

  const handleStartScenario = (scenarioId: string) => {
    if (dailyLimitReached && !isPremium) {
      setModalReason('limit');
      setModalOpen(true);
    } else {
      navigate(`/chat/${scenarioId}`);
    }
  };

  const handleShowUpgrade = () => {
    setModalReason('premium_feature');
    setModalOpen(true);
  };
  
  const scrollToScenarios = () => {
    document.getElementById('scenarios-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!user) {
    return <div className="loading-container">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      {/* Hero Section */}
      <section className="gradient-hero">
        <div className="hero-background-image" />
        <div className="hero-content">
          <h1 className="hero-title">Build Real-World English Fluency with Aexy-App</h1>
          <p className="hero-subtitle">Master high-quality English conversation skills through AI-powered practice scenarios designed for real-life situations.</p>
          <button onClick={scrollToScenarios} className="hero-button">Explore Scenarios</button>
        </div>
        <div className="wave-divider">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z" fill="var(--bg-primary)" />
          </svg>
        </div>
      </section>

      {/* Stats Header */}
      <section className="stats-container">
        <div className="stats-card">
          <div className="stats-grid">
            {/* Streak */}
            <div className="stat-item">
              <div className="stat-label"><Flame size={16} /><span>Streak</span></div>
              <div className="stat-value"><Flame size={24} className="text-orange-500" />{streak} {streak === 1 ? 'day' : 'days'}</div>
              <div className="progress-bar-bg"><div className="progress-bar-fg" style={{ width: `${streakProgress}%` }} /></div>
            </div>
            {/* Daily Practice */}
            <div className="stat-item border-lr">
              <div className="stat-label"><BookOpen size={16} /><span>Today's Practice</span></div>
              <div className="stat-value">{dailyConversations} / {dailyLimit}</div>
              <div className="progress-bar-bg"><div className="progress-bar-fg" style={{ width: `${dailyProgress}%` }} /></div>
            </div>
            {/* Level */}
            <div className="stat-item">
              <div className="stat-label"><Trophy size={16} /><span>Level</span></div>
              <div className="stat-value">1</div>
              <div className="level-badge">Easy</div>
            </div>
          </div>
        </div>
      </section>

      {/* Scenarios Carousel Section */}
      <section id="scenarios-section" className="scenarios-container">
        <div className="scenarios-header">
          <h2 className="scenarios-title">Practice Scenarios</h2>
          <p className="scenarios-subtitle">{dailyLimit - dailyConversations} conversations remaining today</p>
        </div>
        <div className="carousel-wrapper">
          <IconButton onClick={goToPrev} className="carousel-arrow left"><ChevronLeft /></IconButton>
          <div ref={carouselRef} className="carousel-track">
            {scenarios.map((scenario, index) => (
              <ScenarioCard key={scenario.id} scenario={scenario} onStart={handleStartScenario} onUpgrade={handleShowUpgrade} isLocked={dailyLimitReached && !isPremium} isActive={index === activeIndex} />
            ))}
          </div>
          <IconButton onClick={goToNext} className="carousel-arrow right"><ChevronRight /></IconButton>
        </div>
        <div className="carousel-indicators">
          {scenarios.map((_, index) => (
            <button key={index} onClick={() => setActiveIndex(index)} className={`indicator-dot ${index === activeIndex ? 'active' : ''}`} />
          ))}
        </div>
      </section>
      <UpgradeModal open={modalOpen} onClose={() => setModalOpen(false)} reason={modalReason} />
    </div>
  );
};

export default Dashboard;

