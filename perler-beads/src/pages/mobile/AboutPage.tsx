import React from 'react';
import { ArrowLeft, Heart, EnvelopeSimple, FileText, ShieldCheck, GithubLogo } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { colors, radius, typography, shadows, animation, pixelIcons, mixins } from '../../styles/designSystem';
import BottomNav from '../../components/BottomNav';

/**
 * 关于页面
 * 包含应用信息、开发者信息、法律文档链接
 */
const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  // 应用信息配置（可替换）
  const appInfo = {
    name: '拼豆工坊',
    version: '1.0.0',
    description: '将照片转换为拼豆图案的创意工具',
    developer: '个人开发者',  // TODO: 替换为实际开发者名称
    email: 'developer@example.com',  // TODO: 替换为实际邮箱
    website: '',  // TODO: 如有网站可添加
    icp: '',  // TODO: 如有ICP备案号可添加
  };

  const linkItems = [
    {
      icon: ShieldCheck,
      label: '隐私政策',
      color: colors.bead.green,
      path: '/mobile/privacy-policy',
    },
    {
      icon: FileText,
      label: '用户协议',
      color: colors.bead.blue,
      path: '/mobile/user-agreement',
    },
  ];

  return (
    <div style={styles.container}>
      {/* 固定头部 */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 style={styles.title}>关于</h1>
        <div style={styles.placeholder} />
      </div>
      {/* Header占位 */}
      <div style={styles.headerSpacer} />

      {/* 应用信息卡片 */}
      <div style={styles.appCard}>
        {/* 应用图标 */}
        <div style={styles.appIconBox}>
          <div style={styles.appIcon}>
            <span style={styles.appIconText}>{pixelIcons.bead}</span>
          </div>
        </div>

        {/* 应用名称和版本 */}
        <h2 style={styles.appName}>{appInfo.name}</h2>
        <p style={styles.appVersion}>版本 {appInfo.version}</p>
        <p style={styles.appDesc}>{appInfo.description}</p>

        {/* 装饰珠子 */}
        <div style={styles.decorBeads}>
          {[colors.bead.pink, colors.bead.yellow, colors.bead.cyan, colors.bead.green, colors.bead.purple].map((c, i) => (
            <span key={i} style={{ ...styles.decorBead, background: `linear-gradient(145deg, ${c}, ${c}cc)` }} />
          ))}
        </div>
      </div>

      {/* 开发者信息 */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>开发者信息</h3>
        <div style={styles.infoCard}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>开发者</span>
            <span style={styles.infoValue}>{appInfo.developer}</span>
          </div>
          <div style={styles.infoRow}>
            <EnvelopeSimple size={16} style={{ color: colors.bead.cyan }} />
            <span style={styles.infoValue}>{appInfo.email}</span>
          </div>
          {appInfo.icp && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>备案号</span>
              <span style={styles.infoValue}>{appInfo.icp}</span>
            </div>
          )}
        </div>
      </div>

      {/* 法律文档链接 */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>法律信息</h3>
        <div style={styles.linkList}>
          {linkItems.map((item, index) => (
            <div
              key={index}
              style={styles.linkItem}
              onClick={() => navigate(item.path)}
            >
              <div style={{
                ...styles.linkIconBox,
                background: `linear-gradient(145deg, ${item.color}30, ${item.color}15)`,
              }}>
                <item.icon size={18} weight="fill" style={{ color: item.color }} />
              </div>
              <span style={styles.linkLabel}>{item.label}</span>
              <span style={styles.linkArrow}>→</span>
            </div>
          ))}
        </div>
      </div>

      {/* 技术支持 */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>技术支持</h3>
        <div style={styles.infoCard}>
          <p style={styles.supportText}>
            如有问题或建议，请通过邮件联系我们：
          </p>
          <a href={`mailto:${appInfo.email}`} style={styles.emailLink}>
            <EnvelopeSimple size={16} />
            {appInfo.email}
          </a>
        </div>
      </div>

      {/* 底部版权信息 */}
      <div style={styles.footer}>
        <div style={styles.footerDecor} />
        <p style={styles.copyright}>
          <Heart size={12} weight="fill" style={{ color: colors.bead.pink }} />
          Made with love
        </p>
        <p style={styles.copyrightText}>
          Copyright © {new Date().getFullYear()} {appInfo.developer}
        </p>
        <p style={styles.copyrightText}>
          保留所有权利
        </p>
      </div>

      {/* 底部导航栏 */}
      <BottomNav />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: colors.bg.primary,
    paddingBottom: '80px', // 为底部导航栏留出空间
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    background: colors.bg.secondary,
    borderBottom: `1px solid ${colors.border.soft}`,
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },

  headerSpacer: {
    height: '56px',
  },

  backBtn: {
    ...mixins.backButton,
  },

  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    background: colors.gradients.primary,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: 0,
  },

  placeholder: {
    width: 40,
  },

  appCard: {
    margin: '20px 16px',
    padding: '32px 20px',
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid ${colors.bead.cyan}30`,
    boxShadow: `${shadows.md}, 0 4px 20px ${colors.bead.cyan}10`,
    textAlign: 'center',
  },

  appIconBox: {
    marginBottom: '16px',
  },

  appIcon: {
    width: '80px',
    height: '80px',
    margin: '0 auto',
    background: `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.bead.purple})`,
    borderRadius: radius.card,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 8px 24px ${colors.bead.cyan}40`,
  },

  appIconText: {
    fontSize: '40px',
  },

  appName: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    background: colors.gradients.primary,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: '0 0 8px',
  },

  appVersion: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    margin: '0 0 12px',
  },

  appDesc: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    margin: '0 0 20px',
  },

  decorBeads: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
  },

  decorBead: {
    width: '12px',
    height: '12px',
    borderRadius: radius.full,
    boxShadow: shadows.sm,
  },

  section: {
    margin: '0 16px 20px',
  },

  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    margin: '0 0 12px',
    paddingLeft: '4px',
  },

  infoCard: {
    padding: '16px',
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid ${colors.border.soft}`,
    boxShadow: shadows.sm,
  },

  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 0',
    borderBottom: `1px solid ${colors.border.soft}`,
  },

  infoLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    minWidth: '60px',
  },

  infoValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    flex: 1,
  },

  linkList: {
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid ${colors.border.soft}`,
    boxShadow: shadows.sm,
    overflow: 'hidden',
  },

  linkItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: `1px solid ${colors.border.soft}`,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },

  linkIconBox: {
    width: '36px',
    height: '36px',
    borderRadius: radius.bead,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '12px',
  },

  linkLabel: {
    flex: 1,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
  },

  linkArrow: {
    color: colors.text.muted,
    fontSize: '14px',
  },

  supportText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    margin: '0 0 12px',
    lineHeight: 1.6,
  },

  emailLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    background: `linear-gradient(145deg, ${colors.bead.cyan}20, ${colors.bead.cyan}10)`,
    borderRadius: radius.button,
    color: colors.bead.cyan,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    textDecoration: 'none',
    transition: animation.transition.fast,
  },

  footer: {
    marginTop: '32px',
    textAlign: 'center',
    padding: '0 16px',
  },

  footerDecor: {
    width: '60px',
    height: '4px',
    background: colors.gradients.rainbow,
    borderRadius: radius.full,
    margin: '0 auto 16px',
    opacity: 0.7,
  },

  copyright: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    margin: '0 0 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },

  copyrightText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    margin: '0 0 4px',
  },
};

export default AboutPage;
