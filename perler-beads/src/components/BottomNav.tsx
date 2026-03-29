import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { House, Plus, User } from '@phosphor-icons/react';
import { animation, radius, typography } from '../styles/designSystem';

const pathToNav: Record<string, string> = {
  '/mobile/home': '/mobile/home',
  '/mobile/create': '/mobile/create',
  '/mobile/editor': '/mobile/create',
  '/mobile/making': '/mobile/create',
  '/mobile/profile': '/mobile/profile',
  '/mobile/settings': '/mobile/profile',
  '/mobile/help': '/mobile/profile',
  '/mobile/about': '/mobile/profile',
  '/mobile/login': '/mobile/profile',
  '/mobile/feedback': '/mobile/profile',
};

const navItems = [
  { path: '/mobile/home', label: '首页', icon: House, color: '#78d8ff', isCenter: false },
  { path: '/mobile/create', label: '创作', icon: Plus, color: '#7ed6a5', isCenter: true },
  { path: '/mobile/profile', label: '我的', icon: User, color: '#b18cff', isCenter: false },
];

interface BottomNavProps {
  transparent?: boolean;
}

const candyNav = {
  panel: 'rgba(255,255,255,0.86)',
  panelTransparent: 'rgba(255,255,255,0.76)',
  border: 'rgba(126, 103, 173, 0.16)',
  textMuted: '#8f84a2',
  shadow: '0 -10px 30px rgba(137, 112, 167, 0.14)',
};

const BottomNav: React.FC<BottomNavProps> = ({ transparent = false }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveNav = () => {
    if (pathToNav[location.pathname]) return pathToNav[location.pathname];
    for (const [path, nav] of Object.entries(pathToNav)) {
      if (location.pathname.startsWith(path)) return nav;
    }
    return '/mobile/home';
  };

  const activeNav = getActiveNav();

  return (
    <nav style={{ ...styles.nav, ...(transparent ? styles.navTransparent : {}) }}>
      <div style={styles.navInner}>
        {navItems.map((item) => {
          const isActive = activeNav === item.path;
          const IconComponent = item.icon;

          if (item.isCenter) {
            return (
              <button key={item.path} style={styles.centerBtn} onClick={() => navigate(item.path)}>
                <div
                  style={{
                    ...styles.centerBtnInner,
                    background: `linear-gradient(145deg, ${item.color} 0%, #85b7ff 58%, #ff9fc7 100%)`,
                    boxShadow: isActive
                      ? '0 14px 28px rgba(133, 183, 255, 0.28), 0 0 0 4px rgba(255,255,255,0.82)'
                      : '0 10px 22px rgba(133, 183, 255, 0.22)',
                    transform: isActive ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  <IconComponent size={26} weight="bold" style={{ color: '#ffffff' }} />
                </div>
              </button>
            );
          }

          return (
            <button key={item.path} style={styles.navItem} onClick={() => navigate(item.path)}>
              <IconComponent
                size={24}
                weight={isActive ? 'fill' : 'regular'}
                style={{ color: isActive ? item.color : candyNav.textMuted }}
              />
              <span
                style={{
                  ...styles.navLabel,
                  color: isActive ? item.color : candyNav.textMuted,
                  fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.medium,
                }}
              >
                {item.label}
              </span>
              {isActive && <div style={{ ...styles.activeIndicator, background: item.color }} />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: candyNav.panel,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderTop: `1px solid ${candyNav.border}`,
    boxShadow: candyNav.shadow,
    paddingTop: '6px',
    paddingBottom: 'calc(env(safe-area-inset-bottom, 4px) + 4px)',
    paddingLeft: '12px',
    paddingRight: '12px',
    zIndex: 1000,
  },
  navTransparent: {
    background: candyNav.panelTransparent,
  },
  navInner: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    maxWidth: '320px',
    margin: '0 auto',
    height: '48px',
  },
  navItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    cursor: 'pointer',
    padding: '4px 16px',
    border: 'none',
    background: 'transparent',
    borderRadius: radius.lg,
    transition: animation.transition.fast,
    position: 'relative',
    minWidth: '64px',
  },
  navLabel: {
    fontSize: '10px',
    fontFamily: typography.fontFamilyAlt,
    letterSpacing: '0.02em',
    transition: animation.transition.fast,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: '0px',
    width: '4px',
    height: '4px',
    borderRadius: '50%',
  },
  centerBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    border: 'none',
    background: 'transparent',
    position: 'relative',
  },
  centerBtnInner: {
    width: '48px',
    height: '48px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
};

export default BottomNav;
