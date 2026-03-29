import React, { useEffect, useState } from 'react';
import { ArrowLeft, EnvelopeSimple, FileText, ShieldCheck } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { colors, radius, typography, shadows, pixelIcons, mixins } from '../../styles/designSystem';
import BottomNav from '../../components/BottomNav';
import { LEGAL_INFO } from '../../config/legalInfo';

const AboutPage: React.FC = () => {
  const navigate = useNavigate();
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const isNarrowPhone = viewportWidth <= 390;
  const isCompactPhone = viewportWidth <= 360;

  const appCardStyle: React.CSSProperties = {
    ...styles.appCard,
    margin: isCompactPhone ? '12px' : styles.appCard.margin,
    padding: isCompactPhone ? '20px 14px' : styles.appCard.padding,
  };

  const sectionStyle: React.CSSProperties = {
    ...styles.section,
    margin: isCompactPhone ? '0 12px 12px' : styles.section.margin,
  };

  const infoRowStyle: React.CSSProperties = {
    ...styles.infoRow,
    alignItems: isNarrowPhone ? 'flex-start' : styles.infoRow.alignItems,
    flexDirection: isNarrowPhone ? 'column' : undefined,
    gap: isNarrowPhone ? 4 : styles.infoRow.gap,
  };

  const linkItemStyle: React.CSSProperties = {
    ...styles.linkItem,
    padding: isCompactPhone ? '11px' : styles.linkItem.padding,
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 style={styles.title}>关于</h1>
        <div style={styles.placeholder} />
      </div>
      <div style={styles.headerSpacer} />

      <div style={appCardStyle}>
        <div style={styles.iconWrap}>
          <div style={styles.iconBox}>
            <span style={styles.iconText}>{pixelIcons.bead}</span>
          </div>
        </div>
        <h2 style={styles.appName}>{LEGAL_INFO.appName}</h2>
        <p style={styles.appVersion}>版本 {LEGAL_INFO.version}</p>
        <p style={styles.appDesc}>把图片转换成可制作的拼豆图案，帮助你更快完成创作与制作。</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={styles.sectionTitle}>开发者信息</h3>
        <div style={styles.infoCard}>
          <div style={infoRowStyle}>
            <span style={styles.infoLabel}>开发者</span>
            <span style={styles.infoValue}>{LEGAL_INFO.developerName}</span>
          </div>
          <div style={infoRowStyle}>
            <EnvelopeSimple size={16} style={{ color: colors.bead.cyan }} />
            <span style={styles.infoValue}>{LEGAL_INFO.contactEmail}</span>
          </div>
          {!!LEGAL_INFO.website && (
            <div style={infoRowStyle}>
              <span style={styles.infoLabel}>官网</span>
              <span style={styles.infoValue}>{LEGAL_INFO.website}</span>
            </div>
          )}
          {!!LEGAL_INFO.icp && (
            <div style={infoRowStyle}>
              <span style={styles.infoLabel}>备案号</span>
              <span style={styles.infoValue}>{LEGAL_INFO.icp}</span>
            </div>
          )}
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={styles.sectionTitle}>法律信息</h3>
        <div style={styles.linkList}>
          {linkItems.map((item) => (
            <button key={item.path} style={linkItemStyle} onClick={() => navigate(item.path)}>
              <div style={{ ...styles.linkIcon, background: `${item.color}20` }}>
                <item.icon size={18} weight="fill" style={{ color: item.color }} />
              </div>
              <span style={styles.linkLabel}>{item.label}</span>
              <span style={styles.linkArrow}>{'>'}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.footer}>
        <p style={styles.footerText}>Copyright {new Date().getFullYear()} {LEGAL_INFO.developerName}</p>
        <p style={styles.footerText}>保留所有权利</p>
      </div>

      <BottomNav />
    </div>
  );
};

const aboutCandy = {
  pageBg: 'linear-gradient(180deg, #fffaf3 0%, #fef4ff 48%, #f3fbff 100%)',
  panel: 'rgba(255,255,255,0.9)',
  border: 'rgba(126, 103, 173, 0.16)',
  text: '#4f4668',
  textSoft: '#726787',
  textMuted: '#978da8',
  shadow: '0 18px 42px rgba(137, 112, 167, 0.12)',
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: aboutCandy.pageBg,
    paddingBottom: '80px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    background: 'rgba(255,255,255,0.78)',
    borderBottom: `1px solid ${aboutCandy.border}`,
    boxShadow: '0 10px 28px rgba(137, 112, 167, 0.08)',
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
    color: aboutCandy.text,
    margin: 0,
  },
  placeholder: {
    width: 40,
  },
  appCard: {
    margin: '16px',
    padding: '24px 16px',
    borderRadius: radius.card,
    background: aboutCandy.panel,
    border: `1px solid ${aboutCandy.border}`,
    boxShadow: aboutCandy.shadow,
    textAlign: 'center',
  },
  iconWrap: {
    marginBottom: '10px',
  },
  iconBox: {
    width: 72,
    height: 72,
    margin: '0 auto',
    borderRadius: radius.card,
    background: 'linear-gradient(145deg, #78d8ff 0%, #7d9bff 55%, #ff93bf 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 34,
  },
  appName: {
    margin: 0,
    color: aboutCandy.text,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  appVersion: {
    margin: '6px 0 10px',
    color: aboutCandy.textSoft,
    fontSize: typography.fontSize.sm,
  },
  appDesc: {
    margin: 0,
    color: aboutCandy.textSoft,
    fontSize: typography.fontSize.sm,
    lineHeight: 1.6,
  },
  section: {
    margin: '0 16px 16px',
  },
  sectionTitle: {
    margin: '0 0 10px',
    color: aboutCandy.text,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  infoCard: {
    padding: '14px',
    borderRadius: radius.card,
    background: aboutCandy.panel,
    border: `1px solid ${aboutCandy.border}`,
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoLabel: {
    color: aboutCandy.textMuted,
    fontSize: typography.fontSize.sm,
    minWidth: 64,
  },
  infoValue: {
    color: aboutCandy.text,
    fontSize: typography.fontSize.sm,
    wordBreak: 'break-all',
  },
  linkList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  linkItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '12px',
    borderRadius: radius.card,
    border: `1px solid ${aboutCandy.border}`,
    background: aboutCandy.panel,
    cursor: 'pointer',
    textAlign: 'left',
  },
  linkIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.bead,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  linkLabel: {
    flex: 1,
    color: aboutCandy.text,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  linkArrow: {
    color: aboutCandy.textMuted,
    fontSize: typography.fontSize.sm,
  },
  footer: {
    marginTop: 6,
    textAlign: 'center',
    padding: '0 16px',
  },
  footerText: {
    margin: '4px 0',
    color: aboutCandy.textMuted,
    fontSize: typography.fontSize.xs,
  },
};

export default AboutPage;
