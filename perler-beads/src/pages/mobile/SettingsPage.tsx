import React, { useEffect, useState } from 'react';
import { ArrowLeft, Trash, ShieldCheck, Info, UserMinus, ChatCircle, Spinner } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { colors, radius, typography, shadows, mixins } from '../../styles/designSystem';
import { useUserStore } from '../../store/userStore';
import BottomNav from '../../components/BottomNav';
import Modal, { useModal } from '../../components/Modal';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const { isLoggedIn, userInfo, deleteAccount } = useUserStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const { modalProps, showConfirm, showPrompt, showSuccess, showError, showAlert } = useModal();

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleClearData = () => {
    showConfirm(
      '清除后会影响：\n• 所有方案的制作进度缓存会被移除\n• 需要重新选择制作位置\n\n不会影响：\n• 已保存的方案数据（云端）\n• 当前登录状态',
      {
        title: '确定要清除本地缓存吗？',
        type: 'warning',
        confirmText: '清除',
        onConfirm: () => {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('making_state_')) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key));
          showSuccess(`已清除 ${keysToRemove.length} 个方案的制作进度缓存`);
        },
      }
    );
  };

  const handleDeleteAccount = () => {
    showConfirm(
      '注销后将永久删除：\n• 账号信息\n• 已保存方案\n• 制作进度\n• 会员权益（如有）\n\n该操作不可恢复。',
      {
        title: '确定要注销账号吗？',
        type: 'error',
        confirmText: '继续注销',
        onConfirm: handleDeleteAccountStep2,
      }
    );
  };

  const handleDeleteAccountStep2 = () => {
    showPrompt('请输入“确认注销”继续：', {
      title: '最后确认',
      type: 'error',
      placeholder: '确认注销',
      confirmText: '确认注销',
      onConfirm: async (value) => {
        if (value !== '确认注销') {
          showAlert('输入不正确，已取消注销操作', { type: 'info' });
          return;
        }
        await executeDeleteAccount();
      },
    });
  };

  const executeDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteAccount();
      if (result.success) {
        showSuccess('账号已成功注销', () => {
          navigate('/mobile/home');
        });
      } else {
        showError(`注销失败：${result.message}`);
      }
    } catch {
      showError('注销失败：网络异常，请稍后重试');
    } finally {
      setIsDeleting(false);
    }
  };

  const isNarrowPhone = viewportWidth <= 390;
  const isCompactPhone = viewportWidth <= 360;

  const sectionStyle: React.CSSProperties = {
    ...styles.section,
    margin: isCompactPhone ? '0 12px 14px' : styles.section.margin,
  };

  const linkItemStyle: React.CSSProperties = {
    ...styles.linkItem,
    padding: isCompactPhone ? '11px' : styles.linkItem.padding,
  };

  const cardStyle: React.CSSProperties = {
    ...styles.card,
    flexDirection: isNarrowPhone ? 'column' : 'row',
    alignItems: isNarrowPhone ? 'stretch' : 'center',
  };

  const actionBtnStyle: React.CSSProperties = {
    ...styles.actionBtn,
    width: isNarrowPhone ? '100%' : undefined,
  };

  const dangerBtnStyle: React.CSSProperties = {
    ...styles.dangerBtn,
    width: isNarrowPhone ? '100%' : undefined,
  };

  const accountCardStyle: React.CSSProperties = {
    ...styles.accountCard,
    flexDirection: isNarrowPhone ? 'column' : 'row',
    alignItems: isNarrowPhone ? 'flex-start' : 'center',
    gap: isNarrowPhone ? '6px' : undefined,
  };

  const accountValueStyle: React.CSSProperties = {
    ...styles.accountValue,
    maxWidth: isNarrowPhone ? '100%' : styles.accountValue.maxWidth,
    textAlign: isNarrowPhone ? 'left' : 'right',
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 style={styles.title}>设置</h1>
        <div style={styles.placeholder} />
      </div>
      <div style={styles.headerSpacer} />

      <div style={sectionStyle}>
        <h2 style={styles.sectionTitle}>帮助与反馈</h2>
        <button style={linkItemStyle} onClick={() => navigate('/mobile/feedback')}>
          <ChatCircle size={18} style={{ color: colors.bead.cyan }} />
          <span style={styles.linkLabel}>意见反馈</span>
          <span style={styles.linkArrow}>{'>'}</span>
        </button>
      </div>

      <div style={sectionStyle}>
        <h2 style={styles.sectionTitle}>数据管理</h2>
        <div style={cardStyle}>
          <div style={styles.cardMain}>
            <Trash size={20} style={{ color: colors.bead.orange }} />
            <div style={styles.cardTextWrap}>
              <span style={styles.cardTitle}>清除制作进度缓存</span>
              <span style={styles.cardDesc}>清除后需重新选择制作位置，但不会删除方案数据</span>
            </div>
          </div>
          <button style={actionBtnStyle} onClick={handleClearData}>清除</button>
        </div>
      </div>

      {isLoggedIn && (
        <div style={sectionStyle}>
          <h2 style={styles.sectionTitle}>账号管理</h2>
          <div style={accountCardStyle}>
            <span style={styles.accountLabel}>当前账号</span>
            <span style={accountValueStyle}>{userInfo?.email || userInfo?.username || '未知用户'}</span>
          </div>
          <div style={{ ...cardStyle, marginTop: 12 }}>
            <div style={styles.cardMain}>
              <UserMinus size={20} style={{ color: colors.bead.red }} />
              <div style={styles.cardTextWrap}>
                <span style={styles.cardTitle}>注销账号</span>
                <span style={styles.cardDesc}>永久删除账号及数据，操作不可恢复</span>
              </div>
            </div>
            <button style={dangerBtnStyle} onClick={handleDeleteAccount} disabled={isDeleting}>
              {isDeleting ? <Spinner size={14} style={{ animation: 'spin 1s linear infinite' }} /> : '注销'}
            </button>
          </div>
        </div>
      )}

      <div style={sectionStyle}>
        <h2 style={styles.sectionTitle}>法律信息</h2>
        <div style={styles.linkList}>
          <button style={linkItemStyle} onClick={() => navigate('/mobile/privacy-policy')}>
            <ShieldCheck size={18} style={{ color: colors.bead.green }} />
            <span style={styles.linkLabel}>隐私政策</span>
            <span style={styles.linkArrow}>{'>'}</span>
          </button>
          <button style={linkItemStyle} onClick={() => navigate('/mobile/user-agreement')}>
            <Info size={18} style={{ color: colors.bead.blue }} />
            <span style={styles.linkLabel}>用户协议</span>
            <span style={styles.linkArrow}>{'>'}</span>
          </button>
        </div>
      </div>

      <div style={styles.versionBox}>
        <p style={styles.versionText}>拼豆工坊 v1.0.0</p>
      </div>

      <BottomNav />
      <Modal {...modalProps} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const settingsCandy = {
  pageBg: 'linear-gradient(180deg, #fffaf3 0%, #fdf4ff 48%, #f3fbff 100%)',
  panel: 'rgba(255,255,255,0.9)',
  panelSoft: 'rgba(255,255,255,0.78)',
  border: 'rgba(126, 103, 173, 0.16)',
  text: '#4f4668',
  textSoft: '#726787',
  textMuted: '#978da8',
  shadow: '0 18px 42px rgba(137, 112, 167, 0.12)',
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: settingsCandy.pageBg,
    paddingBottom: 80,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    background: 'rgba(255,255,255,0.78)',
    borderBottom: `1px solid ${settingsCandy.border}`,
    boxShadow: '0 10px 28px rgba(137, 112, 167, 0.08)',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerSpacer: {
    height: 56,
  },
  backBtn: {
    ...mixins.backButton,
  },
  title: {
    margin: 0,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: settingsCandy.text,
  },
  placeholder: {
    width: 40,
  },
  section: {
    margin: '0 16px 16px',
  },
  sectionTitle: {
    margin: '0 0 10px',
    color: settingsCandy.text,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  linkList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  linkItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    border: `1px solid ${settingsCandy.border}`,
    background: settingsCandy.panel,
    borderRadius: radius.card,
    padding: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    boxShadow: settingsCandy.shadow,
  },
  linkLabel: {
    flex: 1,
    color: settingsCandy.text,
    fontSize: typography.fontSize.sm,
  },
  linkArrow: {
    color: settingsCandy.textMuted,
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    border: `1px solid ${settingsCandy.border}`,
    background: settingsCandy.panel,
    borderRadius: radius.card,
    padding: 12,
    boxShadow: settingsCandy.shadow,
  },
  cardMain: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
    flex: 1,
  },
  cardTextWrap: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  cardTitle: {
    color: settingsCandy.text,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  cardDesc: {
    color: settingsCandy.textMuted,
    fontSize: typography.fontSize.xs,
    lineHeight: 1.5,
  },
  actionBtn: {
    border: `1px solid ${settingsCandy.border}`,
    background: settingsCandy.panelSoft,
    color: settingsCandy.textSoft,
    borderRadius: radius.button,
    padding: '6px 10px',
    cursor: 'pointer',
  },
  dangerBtn: {
    border: `1px solid ${colors.bead.red}66`,
    background: 'rgba(255, 126, 149, 0.12)',
    color: colors.bead.red,
    borderRadius: radius.button,
    padding: '6px 10px',
    cursor: 'pointer',
    minWidth: 54,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountCard: {
    border: `1px solid ${settingsCandy.border}`,
    background: settingsCandy.panel,
    borderRadius: radius.card,
    padding: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: settingsCandy.shadow,
  },
  accountLabel: {
    color: settingsCandy.textMuted,
    fontSize: typography.fontSize.xs,
  },
  accountValue: {
    color: settingsCandy.text,
    fontSize: typography.fontSize.sm,
    maxWidth: '65%',
    textAlign: 'right',
    wordBreak: 'break-all',
  },
  versionBox: {
    textAlign: 'center',
    marginTop: 4,
  },
  versionText: {
    margin: 0,
    color: settingsCandy.textMuted,
    fontSize: typography.fontSize.xs,
  },
};

export default SettingsPage;
