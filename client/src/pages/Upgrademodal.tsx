import React from 'react';
import '../App.css';

interface UpgradeModalProps {
  onClose: () => void;
  reason: 'limit' | 'premium_feature';
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ onClose, reason }) => {
  const title = reason === 'limit' ? "Daily Limit Reached" : "Premium Feature";
  const text = reason === 'limit' 
    ? "You've used your 3 free conversations for today. For unlimited practice, upgrade to Premium!"
    : "This scenario is a Premium feature. Unlock this and more with a Premium account!";

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{title} ✨</h2>
        <p>{text}</p>
        <div className="modal-plans">
          {/* In a real app, these would be dynamic */}
          <div className="plan-card">
            <h3>Monthly</h3>
            <p>$9.99/mo</p>
          </div>
          <div className="plan-card popular">
            <h3>Yearly</h3>
            <p>$5.99/mo</p>
            <span>Save 40%</span>
          </div>
        </div>
        <button className="upgrade-btn" onClick={onClose}>Upgrade Now</button>
        {reason === 'limit' && (
          <button className="secondary-btn" onClick={onClose}>
            Come Back Tomorrow
          </button>
        )}
      </div>
    </div>
  );
};

export default UpgradeModal;
