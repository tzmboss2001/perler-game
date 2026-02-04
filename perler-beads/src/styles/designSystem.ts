/**
 * 设计系统 - 拼豆工坊
 * 柔和像素风格 (Soft Pixel Style)
 *
 * 设计理念：
 * - 圆润的像素感，像真实的拼豆珠子
 * - 马卡龙色调，柔和舒适
 * - 软阴影带彩色光晕
 * - 温暖可爱的手工艺感
 * - 现代与复古的完美融合
 */

// ============ 色彩系统 - 马卡龙色调 ============

export const colors = {
  // 主色调 - 温暖深色背景
  primary: '#1e1f2e',
  primaryLight: '#282a3a',
  primaryDark: '#161722',

  // 马卡龙主题色 - 柔和配色
  soft: {
    pink: '#ffb3ba',       // 樱花粉
    peach: '#ffdfba',      // 奶油橘
    lemon: '#ffffba',      // 柠檬黄
    mint: '#baffc9',       // 薄荷绿
    sky: '#bae1ff',        // 天空蓝
    lavender: '#d4baff',   // 薰衣草紫
    coral: '#ff9a9e',      // 珊瑚红
    butter: '#ffecd2',     // 奶油色
  },

  // 珠子色 - 饱和但不刺眼
  bead: {
    red: '#ff6b7a',
    orange: '#ffb347',
    yellow: '#ffe066',
    green: '#7ed6a5',
    cyan: '#6bcfff',
    blue: '#6b8cff',
    purple: '#b388ff',
    pink: '#ff8ec4',
    white: '#ffffff',
    cream: '#fef9ef',
    gray: '#b8c0cc',
    dark: '#4a5568',
  },

  // 兼容旧代码的像素色
  pixel: {
    red: '#ff6b7a',
    orange: '#ffb347',
    yellow: '#ffe066',
    green: '#7ed6a5',
    cyan: '#6bcfff',
    blue: '#5a7fff',
    purple: '#9f7aea',
    pink: '#ff8ec4',
    peach: '#ffd5c8',
    white: '#ffffff',
    lightGray: '#e2e8f0',
    darkGray: '#718096',
    black: '#2d3748',
  },

  // 极光色彩 - 兼容旧代码
  aurora: {
    cyan: '#6bcfff',
    magenta: '#ff8ec4',
    violet: '#b388ff',
    gold: '#ffb347',
    emerald: '#7ed6a5',
  },

  // 渐变预设 - 柔和渐变
  gradients: {
    primary: 'linear-gradient(135deg, #6bcfff 0%, #b388ff 100%)',
    secondary: 'linear-gradient(135deg, #ff8ec4 0%, #ffb347 100%)',
    success: 'linear-gradient(135deg, #7ed6a5 0%, #6bcfff 100%)',
    background: 'linear-gradient(180deg, #282a3a 0%, #1e1f2e 100%)',
    glowBorder: 'linear-gradient(135deg, #6bcfff 0%, #ff8ec4 100%)',
    metal: 'linear-gradient(180deg, #4a5568 0%, #2d3748 100%)',
    glass: 'rgba(40, 42, 58, 0.85)',
    // 彩虹渐变 - 柔和版本
    rainbow: 'linear-gradient(90deg, #ff8ec4, #ffb347, #ffe066, #7ed6a5, #6bcfff, #b388ff)',
    // 珠子光泽渐变
    beadShine: 'linear-gradient(145deg, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
    // 温暖光晕
    warmGlow: 'radial-gradient(ellipse at center, rgba(255,179,186,0.2) 0%, transparent 70%)',
  },

  // 背景色系 - 温暖深色
  bg: {
    primary: '#1e1f2e',
    secondary: '#282a3a',
    tertiary: '#343647',
    card: '#2d2f42',
    elevated: '#3a3d52',
    input: '#232536',
    glass: 'rgba(45, 47, 66, 0.9)',
    // 柔和网格背景
    grid: `repeating-linear-gradient(
      0deg,
      transparent,
      transparent 4px,
      rgba(255,255,255,0.02) 4px,
      rgba(255,255,255,0.02) 5px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 4px,
      rgba(255,255,255,0.02) 4px,
      rgba(255,255,255,0.02) 5px
    )`,
  },

  // 向后兼容的渐变别名
  gradient: 'linear-gradient(135deg, #6bcfff 0%, #b388ff 100%)',

  // 文字色系
  text: {
    primary: '#f7f8fc',
    secondary: '#a0aec0',
    muted: '#718096',
    disabled: '#4a5568',
    inverse: '#1e1f2e',
    // 特殊文字颜色
    highlight: '#ffe066',
    accent: '#6bcfff',
  },

  // 边框色系 - 柔和边框
  border: {
    default: '#3a3d52',
    light: '#4a5068',
    focus: '#6bcfff',
    glow: '#ff8ec4',
    // 柔和边框
    soft: 'rgba(255,255,255,0.1)',
    softLight: 'rgba(255,255,255,0.15)',
  },

  // 状态色 - 柔和版本
  status: {
    success: '#7ed6a5',
    warning: '#ffb347',
    error: '#ff6b7a',
    info: '#6bcfff',
    pending: '#b388ff',
    processing: '#ff8ec4',
  },

  // 兼容旧代码的别名
  accent: '#6bcfff',
  accentGreen: '#7ed6a5',
  accentYellow: '#ffe066',
  accentRed: '#ff6b7a',
  secondary: '#f7f8fc',
  secondaryLight: '#ffffff',
  secondaryDark: '#a0aec0',
};

// ============ 间距系统 ============

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  pixel: 4,
  pixelLg: 8,
};

// ============ 圆角系统 - 圆润像珠子 ============

export const radius = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  card: 16,
  button: 12,
  full: 9999,
  // 珠子圆角 - 圆润但不是正圆
  bead: 10,
  pixel: 8,
};

// ============ 字体系统 ============

export const typography = {
  // 现代圆润字体
  fontFamily: '"SF Pro Rounded", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyAlt: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyDisplay: '"SF Pro Rounded", -apple-system, sans-serif',

  fontSize: {
    xs: 11,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    xxxl: 28,
    display: 32,
    pixel: 10,
    pixelLg: 12,
    pixelXl: 14,
  },

  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    heavy: 800,
  },

  lineHeight: {
    tight: 1.2,
    snug: 1.4,
    normal: 1.6,
    relaxed: 1.8,
  },

  letterSpacing: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.02em',
    wider: '0.05em',
    pixel: '0.08em',
  },
};

// ============ 阴影系统 - 柔和彩色阴影 ============

export const shadows = {
  // 柔和阴影 - 带模糊
  sm: '0 2px 8px rgba(0,0,0,0.15)',
  md: '0 4px 16px rgba(0,0,0,0.2)',
  lg: '0 8px 32px rgba(0,0,0,0.25)',
  xl: '0 12px 48px rgba(0,0,0,0.3)',

  // 彩色发光阴影
  glow: {
    cyan: '0 4px 20px rgba(107, 207, 255, 0.4)',
    magenta: '0 4px 20px rgba(255, 142, 196, 0.4)',
    violet: '0 4px 20px rgba(179, 136, 255, 0.4)',
    gold: '0 4px 20px rgba(255, 179, 71, 0.4)',
    green: '0 4px 20px rgba(126, 214, 165, 0.4)',
    primary: '0 4px 20px rgba(107, 207, 255, 0.35)',
    secondary: '0 4px 20px rgba(255, 142, 196, 0.35)',
  },

  // 珠子质感阴影 - 内凹 + 外发光
  bead: '0 4px 12px rgba(0,0,0,0.2), inset 0 -2px 4px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.2)',
  beadPressed: 'inset 0 2px 6px rgba(0,0,0,0.3), inset 0 -1px 2px rgba(255,255,255,0.1)',

  // 卡片阴影
  card: '0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.05)',
  cardHover: '0 8px 32px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1)',

  // 按钮阴影
  button: '0 4px 12px rgba(0,0,0,0.2)',
  buttonActive: '0 2px 4px rgba(0,0,0,0.2)',
  buttonPressed: 'inset 0 2px 4px rgba(0,0,0,0.2)',

  // 内阴影
  inner: 'inset 0 2px 4px rgba(0,0,0,0.1)',
  innerLight: 'inset 0 -1px 2px rgba(255,255,255,0.1)',

  // 柔和光晕边框
  softGlow: (color: string) => `0 0 20px ${color}40, 0 0 40px ${color}20`,
};

// ============ 动画系统 - 平滑弹性 ============

export const animation = {
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
    slower: '600ms',
  },

  // 平滑弹性缓动
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    elastic: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'ease-out',
    linear: 'linear',
  },

  transition: {
    fast: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)',
    color: 'background-color 200ms ease, color 200ms ease, box-shadow 200ms ease',
    transform: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    opacity: 'opacity 250ms ease',
    smooth: 'all 250ms ease-out',
  },
};

// ============ 常用样式混合 - 柔和风格 ============

export const mixins = {
  // 柔和卡片
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid ${colors.border.soft}`,
    boxShadow: shadows.card,
  },

  // 发光卡片
  cardGlow: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid rgba(107, 207, 255, 0.3)`,
    boxShadow: `${shadows.card}, ${shadows.glow.primary}`,
  },

  // 珠子风格卡片
  cardBead: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.bead,
    border: `2px solid ${colors.border.softLight}`,
    boxShadow: shadows.bead,
  },

  // 主按钮 - 珠子质感
  buttonPrimary: {
    background: `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.pixel.blue})`,
    color: colors.text.inverse,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    borderRadius: radius.button,
    border: 'none',
    cursor: 'pointer',
    boxShadow: `${shadows.button}, ${shadows.glow.cyan}`,
    transition: animation.transition.fast,
  },

  // 次按钮
  buttonSecondary: {
    background: colors.bg.tertiary,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    borderRadius: radius.button,
    border: `1px solid ${colors.border.soft}`,
    cursor: 'pointer',
    boxShadow: shadows.sm,
    transition: animation.transition.fast,
  },

  // 幽灵按钮
  buttonGhost: {
    background: 'transparent',
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
    borderRadius: radius.button,
    border: `1px solid ${colors.border.default}`,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },

  // 彩色珠子按钮
  buttonBead: (color: string) => ({
    background: `linear-gradient(145deg, ${color}, ${color}dd)`,
    color: colors.text.inverse,
    fontWeight: typography.fontWeight.semibold,
    borderRadius: radius.bead,
    border: 'none',
    cursor: 'pointer',
    boxShadow: `${shadows.button}, 0 4px 20px ${color}50`,
    transition: animation.transition.fast,
  }),

  // 输入框样式
  input: {
    backgroundColor: colors.bg.input,
    border: `1px solid ${colors.border.default}`,
    borderRadius: radius.md,
    color: colors.text.primary,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamilyAlt,
    padding: `${spacing.md}px ${spacing.lg}px`,
    transition: animation.transition.fast,
    outline: 'none',
  },

  inputFocus: {
    borderColor: colors.bead.cyan,
    boxShadow: shadows.glow.cyan,
  },

  // 玻璃态
  glassmorphism: {
    background: colors.bg.glass,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: `1px solid ${colors.border.soft}`,
  },

  glassmorphismStrong: {
    background: 'rgba(45, 47, 66, 0.95)',
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
    border: `1px solid ${colors.border.softLight}`,
    boxShadow: shadows.card,
  },

  // 珠子边框效果
  beadBorder: (color: string = colors.bead.cyan) => ({
    border: `2px solid ${color}`,
    borderRadius: radius.bead,
    boxShadow: `0 4px 16px ${color}30`,
  }),

  // 柔和发光边框
  glowBorder: (color: string = colors.bead.cyan) => ({
    border: `2px solid ${color}`,
    boxShadow: `0 0 20px ${color}40`,
  }),

  // 渐变文字
  gradientText: {
    background: colors.gradients.primary,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },

  // 柔和文字阴影
  textGlow: (color: string = colors.bead.cyan) => ({
    textShadow: `0 0 20px ${color}60, 0 2px 10px ${color}40`,
  }),

  // 页面头部容器
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    background: colors.bg.secondary,
    borderBottom: `1px solid ${colors.border.soft}`,
  },

  // 返回按钮 - 珠子风格
  backButton: {
    width: 40,
    height: 40,
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.bead,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: colors.bead.cyan,
    boxShadow: shadows.sm,
    transition: animation.transition.fast,
  },

  // 页面标题
  pageTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    background: colors.gradients.primary,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: 0,
  },

  // 页面标题 - 大号
  pageTitleLarge: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    background: `linear-gradient(135deg, ${colors.soft.lemon} 0%, ${colors.soft.peach} 50%, ${colors.soft.pink} 100%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: 0,
  },

  // 占位元素
  headerPlaceholder: {
    width: 40,
  },

  // 珠子徽章
  badge: (bgColor: string = colors.bead.pink) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 10px',
    background: `linear-gradient(145deg, ${bgColor}, ${bgColor}dd)`,
    color: colors.text.inverse,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    borderRadius: radius.full,
    boxShadow: `0 2px 8px ${bgColor}40`,
  }),
};

// ============ 拼豆项目步骤配置 ============

export const steps = [
  { id: 1, label: '上传', icon: '1', color: colors.bead.cyan },
  { id: 2, label: '调整', icon: '2', color: colors.bead.green },
  { id: 3, label: '编辑', icon: '3', color: colors.bead.yellow },
  { id: 4, label: '完成', icon: '4', color: colors.bead.pink },
];

// ============ 特效工具函数 ============

export const effects = {
  // 柔和渐变
  createSoftGradient: (color1: string, color2: string) => {
    return `linear-gradient(145deg, ${color1} 0%, ${color2} 100%)`;
  },

  // 珠子边框
  createBeadBorder: (color: string, size: number = 2) => {
    return `${size}px solid ${color}`;
  },

  // 柔和阴影
  createSoftShadow: (color: string = 'rgba(0,0,0,0.2)', blur: number = 16) => {
    return `0 4px ${blur}px ${color}`;
  },

  // 彩色发光
  createColorGlow: (color: string, intensity: number = 0.4) => {
    return `0 4px 20px ${color}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`;
  },

  // 网格背景
  gridBackground: colors.bg.grid,

  // 珠子光泽效果
  beadShine: colors.gradients.beadShine,

  // 柔和噪点
  noiseBackground: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
};

// ============ 柔和像素图标符号 ============

export const pixelIcons = {
  heart: '\u2665',      // ♥
  star: '\u2605',       // ★
  diamond: '\u25C6',    // ◆
  arrow: '\u25B6',      // ▶
  check: '\u2713',      // ✓
  cross: '\u2717',      // ✗
  circle: '\u25CF',     // ●
  square: '\u25A0',     // ■
  sparkle: '\u2728',    // ✨
  bead: '\u25CF',       // ●
};

// ============ 响应式断点 ============

export const breakpoints = {
  xs: 320,
  sm: 375,
  md: 414,
  lg: 480,
  xl: 540,
};

export default {
  colors,
  spacing,
  radius,
  typography,
  shadows,
  animation,
  mixins,
  steps,
  effects,
  pixelIcons,
  breakpoints,
};
