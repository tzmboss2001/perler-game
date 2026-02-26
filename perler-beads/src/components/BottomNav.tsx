import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { House, Plus, User, UsersThree } from '@phosphor-icons/react';
import { colors, shadows, animation, radius, typography } from '../styles/designSystem';

// 路径到导航项的映射
const pathToNav: Record<string, string> = {
  '/mobile/home': '/mobile/home',
  '/mobile/create': '/mobile/create',
  '/mobile/editor': '/mobile/create',       // 编辑器属于"创作"
  '/mobile/making': '/mobile/create',       // 制作模式属于"创作"
  '/mobile/community': '/mobile/community', // 社区
  '/mobile/profile': '/mobile/profile',
  '/mobile/settings': '/mobile/profile',     // 设置属于"我的"
  '/mobile/help': '/mobile/profile',         // 帮助属于"我的"
  '/mobile/about': '/mobile/profile',        // 关于属于"我的"
  '/mobile/login': '/mobile/profile',        // 登录属于"我的"
  '/mobile/feedback': '/mobile/profile',     // 反馈属于"我的"
};

// Navigation items configuration
const navItems = [
  { path: '/mobile/home', label: '首页', icon: House, color: colors.bead.cyan, isCenter: false },
  { path: '/mobile/create', label: '创作', icon: Plus, color: colors.bead.green, isCenter: true },
  { path: '/mobile/community', label: '社区', icon: UsersThree, color: colors.bead.orange, isCenter: false },
  { path: '/mobile/profile', label: '我的', icon: User, color: colors.bead.purple, isCenter: false },
];

interface BottomNavProps {
  transparent?: boolean; // 是否透明背景（用于覆盖在内容上）
}

const BottomNav: React.FC<BottomNavProps> = ({ transparent = false }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // 判断当前路径属于哪个导航项
  const getActiveNav = () => {
    // 精确匹配
    if (pathToNav[location.pathname]) {
      return pathToNav[location.pathname];
    }
    // 前缀匹配
    for (const [path, nav] of Object.entries(pathToNav)) {
      if (location.pathname.startsWith(path)) {
        return nav;
      }
    }
    return '/mobile/home';
  };

  const activeNav = getActiveNav();

  return (
    <nav style={{
      ...styles.nav,
      ...(transparent ? styles.navTransparent : {}),
    }}>
      <div style={styles.navInner}>
        {navItems.map((item) => {
          const isActive = activeNav === item.path;
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
  );
};

const styles: Record<string, React.CSSProperties> = {
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

  navTransparent: {
    background: 'rgba(5, 8, 22, 0.85)',
  },

  navInner: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center', // 改为居中对齐
    maxWidth: '400px',
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

export default BottomNav;
