import React, { useEffect, useState } from 'react';
import { adService } from '../../services/adService';

interface RewardedUnlockModalProps {
  visible: boolean;
  title: string;
  desc: string;
  onClose: () => void;
  onRewardEarned: () => void;
}

const RewardedUnlockModal: React.FC<RewardedUnlockModalProps> = ({
  visible,
  title,
  desc,
  onClose,
  onRewardEarned,
}) => {
  const [watching, setWatching] = useState(false);
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    if (!visible) {
      setWatching(false);
      setSeconds(5);
    }
  }, [visible]);

  useEffect(() => {
    if (!watching) return;
    if (seconds <= 0) {
      setWatching(false);
      onRewardEarned();
      onClose();
      return;
    }
    const timer = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [watching, seconds, onRewardEarned, onClose]);

  const handleWatchAd = async () => {
    if (watching) return;
    const result = await adService.playRewardedAd();
    if (result === 'completed') {
      onRewardEarned();
      onClose();
      return;
    }
    if (result === 'closed') {
      return;
    }
    // failed/no_fill -> fallback mock countdown
    setWatching(true);
  };

  if (!visible) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>{title}</h3>
        <p style={styles.desc}>{desc}</p>
        <div style={styles.tip}>看完短广告后可继续免费使用高级功能</div>
        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={watching}>
            取消
          </button>
          <button
            style={styles.watchBtn}
            onClick={handleWatchAd}
            disabled={watching}
          >
            {watching ? `广告播放中 ${seconds}s` : '观看广告并解锁'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 12050,
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 420,
    background: '#1e2533',
    border: '1px solid rgba(108,200,173,0.35)',
    borderRadius: 14,
    padding: 16,
    boxShadow: '0 10px 34px rgba(0,0,0,0.35)',
  },
  title: {
    margin: '0 0 8px',
    color: '#e6efff',
    fontSize: 18,
    fontWeight: 700,
  },
  desc: {
    margin: '0 0 10px',
    color: '#b8c6de',
    fontSize: 14,
    lineHeight: 1.5,
  },
  tip: {
    margin: '0 0 14px',
    color: '#8fa6c7',
    fontSize: 12,
  },
  footer: {
    display: 'flex',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'transparent',
    color: '#d5dceb',
    borderRadius: 10,
    padding: '10px 12px',
    cursor: 'pointer',
  },
  watchBtn: {
    flex: 2,
    border: 'none',
    background: 'linear-gradient(145deg, #6cc8ad, #6b9ad4)',
    color: '#0f1b28',
    borderRadius: 10,
    padding: '10px 12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
};

export default RewardedUnlockModal;
