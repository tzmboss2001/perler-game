import React, { useState } from 'react';
import { ArrowLeft, Trash, ShieldCheck, Info, UserMinus, ChatCircle, Spinner } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { colors, radius, typography, shadows, animation, mixins } from '../../styles/designSystem';
import { useUserStore } from '../../store/userStore';
import BottomNav from '../../components/BottomNav';
import Modal, { useModal } from '../../components/Modal';

/**
 * 设置页面
 * 包含账号管理、数据管理、意见反馈、法律文档链接
 */
const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn, userInfo, deleteAccount } = useUserStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const { modalProps, showConfirm, showPrompt, showSuccess, showError, showAlert } = useModal();

  // 清除本地数据
  const handleClearData = () => {
    showConfirm(
      '清除后：\n• 所有方案的制作进度将丢失\n• 需要重新选择制作位置\n\n不受影响：\n• 已保存的方案数据（存在服务器）\n• 登录状态',
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

  // 注销账号 - 第一步确认
  const handleDeleteAccount = () => {
    showConfirm(
      '注销后将永久删除：\n• 您的账号信息\n• 所有已保存的方案\n• 所有制作进度\n• 会员权益（如有）\n\n此操作不可恢复！',
      {
        title: '确定要注销账号吗？',
        type: 'error',
        confirmText: '继续注销',
        onConfirm: handleDeleteAccountStep2,
      }
    );
  };

  // 注销账号 - 第二步输入确认
  const handleDeleteAccountStep2 = () => {
    showPrompt(
      '请输入"确认注销"以继续：',
      {
        title: '最后确认',
        type: 'error',
        placeholder: '请输入：确认注销',
        confirmText: '确认注销',
        onConfirm: async (value) => {
          if (value !== '确认注销') {
            showAlert('输入不正确，已取消注销操作', { type: 'info' });
            return;
          }
          // 执行注销
          await executeDeleteAccount();
        },
      }
    );
  };

  // 执行注销
  const executeDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteAccount();
      if (result.success) {
        showSuccess('账号已成功注销\n\n感谢您使用拼豆工坊，期待与您再次相遇！', () => {
          navigate('/mobile/home');
        });
      } else {
        showError(`注销失败\n\n${result.message}\n\n请稍后重试或联系客服`);
      }
    } catch (error) {
      showError('注销失败\n\n网络异常，请检查网络连接后重试');
    } finally {
      setIsDeleting(false);
    }
  };

  // 意见反馈
  const handleFeedback = () => {
    navigate('/mobile/feedback');
  };

  return (
    <div style={styles.container}>
      {/* 固定头部 */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 style={styles.title}>设置</h1>
        <div style={styles.placeholder} />
      </div>
      {/* Header占位 */}
      <div style={styles.headerSpacer} />

      {/* 意见反馈 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>帮助与反馈</h2>

        <div style={styles.linkList}>
          <div
            style={styles.linkItem}
            onClick={handleFeedback}
          >
            <ChatCircle size={18} style={{ color: colors.bead.cyan }} />
            <span style={styles.linkLabel}>意见反馈</span>
            <span style={styles.linkArrow}>→</span>
          </div>
        </div>
      </div>

      {/* 数据管理 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>数据管理</h2>

        <div style={styles.dataCard}>
          <div style={styles.dataInfo}>
            <Trash size={20} style={{ color: colors.bead.orange }} />
            <div style={styles.dataContent}>
              <span style={styles.dataLabel}>清除制作进度缓存</span>
              <span style={styles.dataDesc}>清除后需重新选择制作位置，方案不受影响</span>
            </div>
          </div>
          <button style={styles.clearBtn} onClick={handleClearData}>
            清除
          </button>
        </div>
      </div>

      {/* 账号管理（仅登录用户显示） */}
      {isLoggedIn && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>账号管理</h2>

          <div style={styles.accountCard}>
            <div style={styles.accountInfo}>
              <span style={styles.accountLabel}>当前账号</span>
              <span style={styles.accountEmail}>{userInfo?.email || userInfo?.username || '未知'}</span>
            </div>
          </div>

          <div style={{ ...styles.dataCard, marginTop: '12px' }}>
            <div style={styles.dataInfo}>
              <UserMinus size={20} style={{ color: colors.bead.red }} />
              <div style={styles.dataContent}>
                <span style={styles.dataLabel}>注销账号</span>
                <span style={styles.dataDesc}>永久删除账号及所有数据，不可恢复</span>
              </div>
            </div>
            <button
              style={styles.dangerBtn}
              onClick={handleDeleteAccount}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Spinner size={14} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                '注销'
              )}
            </button>
          </div>
        </div>
      )}

      {/* 法律信息 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>法律信息</h2>

        <div style={styles.linkList}>
          <div
            style={styles.linkItem}
            onClick={() => navigate('/mobile/privacy-policy')}
          >
            <ShieldCheck size={18} style={{ color: colors.bead.green }} />
            <span style={styles.linkLabel}>隐私政策</span>
            <span style={styles.linkArrow}>→</span>
          </div>
          <div
            style={{ ...styles.linkItem, borderBottom: 'none' }}
            onClick={() => navigate('/mobile/user-agreement')}
          >
            <Info size={18} style={{ color: colors.bead.blue }} />
            <span style={styles.linkLabel}>用户协议</span>
            <span style={styles.linkArrow}>→</span>
          </div>
        </div>
      </div>

      {/* 版本信息 */}
      <div style={styles.versionBox}>
        <p style={styles.versionText}>拼豆工坊 v1.0.0</p>
      </div>

      {/* 底部导航栏 */}
      <BottomNav />

      {/* 统一弹框 */}
      <Modal {...modalProps} />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: colors.bg.primary,
    paddingBottom: '80px',
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

  section: {
    margin: '20px 16px',
  },

  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    margin: '0 0 12px',
    paddingLeft: '4px',
  },

  dataCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid ${colors.border.soft}`,
    boxShadow: shadows.sm,
  },

  dataInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },

  dataContent: {
    display: 'flex',
    flexDirection: 'column',
  },

  dataLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    marginBottom: '2px',
  },

  dataDesc: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
  },

  clearBtn: {
    padding: '8px 16px',
    background: `linear-gradient(145deg, ${colors.bead.orange}20, ${colors.bead.orange}10)`,
    border: `1px solid ${colors.bead.orange}40`,
    borderRadius: radius.button,
    color: colors.bead.orange,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },

  dangerBtn: {
    padding: '8px 16px',
    background: `linear-gradient(145deg, ${colors.bead.red}20, ${colors.bead.red}10)`,
    border: `1px solid ${colors.bead.red}40`,
    borderRadius: radius.button,
    color: colors.bead.red,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    transition: animation.transition.fast,
    minWidth: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  accountCard: {
    padding: '16px',
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid ${colors.border.soft}`,
    boxShadow: shadows.sm,
  },

  accountInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  accountLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
  },

  accountEmail: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
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
    gap: '12px',
    padding: '14px 16px',
    borderBottom: `1px solid ${colors.border.soft}`,
    cursor: 'pointer',
    transition: animation.transition.fast,
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

  versionBox: {
    textAlign: 'center',
    marginTop: '32px',
  },

  versionText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    margin: 0,
  },
};

// CSS动画
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
if (!document.querySelector('#settings-styles')) {
  styleSheet.id = 'settings-styles';
  document.head.appendChild(styleSheet);
}

export default SettingsPage;
