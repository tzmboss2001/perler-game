import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { colors } from '../../styles/designSystem';
import { useUserStore } from '../../store/userStore';
import BottomNav from '../../components/BottomNav';

const MobileLayout: React.FC = () => {
  const { initUser } = useUserStore();

  useEffect(() => {
    initUser();
  }, [initUser]);

  return (
    <div style={styles.layout}>
      <div style={styles.bgGlow1} />
      <div style={styles.bgGlow2} />
      <div style={styles.content}>
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #fffaf3 0%, #fef4ff 46%, #f3fbff 100%)',
    color: '#4f4668',
    position: 'relative',
    width: '100%',
    overflowX: 'hidden',
    boxSizing: 'border-box',
  },
  bgGlow1: {
    position: 'fixed',
    top: '-20%',
    right: '-20%',
    width: '500px',
    height: '500px',
    background: 'radial-gradient(circle at center, rgba(120,216,255,0.22) 0%, transparent 68%)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  bgGlow2: {
    position: 'fixed',
    bottom: '6%',
    left: '-20%',
    width: '420px',
    height: '420px',
    background: 'radial-gradient(circle at center, rgba(255,159,199,0.18) 0%, transparent 68%)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  content: {
    flex: 1,
    paddingBottom: '82px',
    position: 'relative',
    zIndex: 1,
    width: '100%',
    minWidth: 0,
    overflowX: 'hidden',
    boxSizing: 'border-box',
  },
};

export default MobileLayout;
