import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { House, Plus, User } from '@phosphor-icons/react';
import { colors, shadows, animation, radius, typography } from '../../styles/designSystem';
import { useUserStore } from '../../store/userStore';

// Navigation items configuration
const navItems = [
  { path: '/mobile/home', label: '首页', icon: House, color: colors.bead.cyan, isCenter: false },
  { path: '/mobile/create', label: '创作', icon: Plus, color: colors.bead.green, isCenter: true },
  { path: '/mobile/profile', label: '我的', icon: User, color: colors.bead.purple, isCenter: false },
];

const MobileLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { initUser } = useUserStore();

  useEffect(() => {
    initUser();
  }, [initUser]);

  const isNavActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div style={styles.layout}>
      {/* 柔和背景光晕 */}
      <div style={styles.bgGlow1} />
      <div style={styles.bgGlow2} />

      {/* Main content area */}
      <div style={styles.content}>
        <Outlet />
      </div>

      {/* 标准化底部导航栏 */}
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          {navItems.map((item) => {
            const isActive = isNavActive(item.path);
            const IconComponent = item.icon;

            // 中间的"创作"按钮特殊样式
            if (item.isCenter) {
              return (
                <button
                  key={item.path}
                  style={styles.centerBtn}
                  onClick={() => navigate(item.path)}
                >
                  <div
                    style={{
                      ...styles.centerBtnInner,
                      background: `linear-gradient(145deg, ${item.color}, ${item.color}dd)`,
                      boxShadow: isActive
                        ? `0 4px 20px ${item.color}60, 0 0 0 3px ${item.color}30`
                        : `0 4px 16px ${item.color}40`,
                      transform: isActive ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    <IconComponent
                      size={26}
                      weight="bold"
                      style={{ color: '#ffffff' }}
                    />
                  </div>
                </button>
              );
            }

            // 普通导航按钮
            return (
              <button
                key={item.path}
                style={styles.navItem}
                onClick={() => navigate(item.path)}
              >
                <IconComponent
                  size={24}
                  weight={isActive ? 'fill' : 'regular'}
                  style={{ color: isActive ? item.color : colors.text.muted }}
                />
                <span
                  style={{
                    ...styles.navLabel,
                    color: isActive ? item.color : colors.text.muted,
                    fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.medium,
                  }}
                >
                  {item.label}
                </span>
                {/* 激活指示点 */}
                {isActive && (
                  <div style={{ ...styles.activeIndicator, background: item.color }} />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    background: colors.bg.primary,
    color: colors.text.primary,
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
    background: `radial-gradient(ellipse at center, ${colors.bead.cyan}15 0%, transparent 70%)`,
    pointerEvents: 'none',
    zIndex: 0,
  },

  bgGlow2: {
    position: 'fixed',
    bottom: '10%',
    left: '-20%',
    width: '400px',
    height: '400px',
    background: `radial-gradient(ellipse at center, ${colors.bead.pink}12 0%, transparent 70%)`,
    pointerEvents: 'none',
    zIndex: 0,
  },

  content: {
    flex: 1,
    paddingBottom: '65px',
    position: 'relative',
    zIndex: 1,
    width: '100%',
    minWidth: 0,
    overflowX: 'hidden',
    boxSizing: 'border-box',
  },

  nav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: colors.bg.glass,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderTop: `1px solid ${colors.border.soft}`,
    paddingTop: '6px',
    paddingBottom: 'calc(env(safe-area-inset-bottom, 4px) + 4px)',
    paddingLeft: '12px',
    paddingRight: '12px',
    zIndex: 1000,
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
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
};

export default MobileLayout;
