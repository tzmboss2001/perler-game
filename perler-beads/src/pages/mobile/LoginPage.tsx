import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Envelope, Lock, Eye, EyeSlash } from '@phosphor-icons/react';
import { colors, radius, spacing, typography, shadows, animation, mixins } from '../../styles/designSystem';
import { useUserStore } from '../../store/userStore';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { smartLogin, isLoggedIn, loading, error, clearError } = useUserStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from || '/mobile/profile';

  useEffect(() => {
    if (isLoggedIn) {
      navigate(from, { replace: true });
    }
  }, [isLoggedIn, navigate, from]);

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const validateForm = (): boolean => {
    if (!email.trim()) {
      setLocalError('请输入邮箱地址');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError('请输入有效的邮箱地址');
      return false;
    }
    if (!password) {
      setLocalError('请输入密码');
      return false;
    }
    if (password.length < 6) {
      setLocalError('密码至少需要 6 个字符');
      return false;
    }
    setLocalError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const result = await smartLogin({ email, password });
    if (!result.success) return;

    if (result.isNewUser) {
      setSuccessMessage('欢迎加入，账号已自动创建');
      setTimeout(() => navigate(from, { replace: true }), 1000);
      return;
    }

    navigate(from, { replace: true });
  };

  const displayError = localError || error;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} weight="bold" />
        </button>
      </div>
      <div style={styles.headerSpacer} />

      <div style={styles.content}>
        <div style={styles.logo}>
          <div style={styles.logoText}>拼豆工坊</div>
          <div style={styles.logoSubtext}>让创意变成美丽的珠子画</div>
        </div>

        <div style={styles.tipText}>输入邮箱和密码，新用户会自动注册</div>

        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <Envelope size={20} style={styles.inputIcon} />
            <input
              type="email"
              placeholder="邮箱地址"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <Lock size={20} style={styles.inputIcon} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="密码（至少 6 位）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...styles.input, ...styles.inputWithEye }}
            />
            <button type="button" style={styles.eyeButton} onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {successMessage ? <div style={styles.success}>{successMessage}</div> : null}
          {!successMessage && displayError ? <div style={styles.error}>{displayError}</div> : null}

          <button type="submit" style={{ ...styles.submitButton, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? '请稍候...' : '登录 / 注册'}
          </button>
        </form>

        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>或</span>
          <div style={styles.dividerLine} />
        </div>

        <button style={styles.guestButton} onClick={() => navigate(from, { replace: true })}>
          暂不登录，以游客身份继续
        </button>
      </div>

      <div style={styles.footer}>
        <p style={styles.footerText}>新邮箱将自动注册，忘记密码可通过邮箱找回</p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: `linear-gradient(180deg, ${colors.bg.secondary} 0%, ${colors.bg.primary} 100%)`,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: spacing.xl,
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    background: colors.bg.secondary,
  },
  headerSpacer: {
    height: '72px',
  },
  backButton: {
    ...mixins.backButton,
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: spacing.xl,
    paddingTop: spacing.xxxl,
  },
  logo: {
    textAlign: 'center',
    marginBottom: spacing.xxxl,
  },
  logoText: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    ...mixins.gradientText,
  },
  logoSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  tipText: {
    textAlign: 'center',
    marginBottom: spacing.xxl,
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
  },
  success: {
    padding: spacing.md,
    background: `${colors.status.success}20`,
    borderRadius: radius.md,
    border: `1px solid ${colors.status.success}40`,
    color: colors.status.success,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },
  inputGroup: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: spacing.lg,
    top: '50%',
    transform: 'translateY(-50%)',
    color: colors.text.muted,
    zIndex: 1,
  },
  input: {
    width: '100%',
    padding: `${spacing.lg}px ${spacing.lg}px ${spacing.lg}px ${spacing.huge}px`,
    backgroundColor: colors.bg.input,
    border: `1px solid ${colors.border.default}`,
    borderRadius: radius.md,
    color: colors.text.primary,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamilyAlt,
    outline: 'none',
    transition: animation.transition.fast,
    boxSizing: 'border-box',
  },
  inputWithEye: {
    paddingRight: spacing.huge,
  },
  eyeButton: {
    position: 'absolute',
    right: spacing.lg,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: colors.text.muted,
    cursor: 'pointer',
    padding: spacing.xs,
  },
  error: {
    padding: spacing.md,
    background: `${colors.status.error}20`,
    borderRadius: radius.md,
    border: `1px solid ${colors.status.error}40`,
    color: colors.status.error,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  submitButton: {
    width: '100%',
    padding: `${spacing.lg}px`,
    background: `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.pixel.blue})`,
    border: 'none',
    borderRadius: radius.button,
    color: colors.text.inverse,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    boxShadow: `${shadows.button}, ${shadows.glow.cyan}`,
    transition: animation.transition.fast,
    marginTop: spacing.md,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    margin: `${spacing.xxl}px 0`,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: colors.border.default,
  },
  dividerText: {
    color: colors.text.muted,
    fontSize: typography.fontSize.sm,
  },
  guestButton: {
    width: '100%',
    padding: `${spacing.lg}px`,
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.button,
    color: colors.text.secondary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },
  footer: {
    padding: spacing.xl,
    textAlign: 'center',
  },
  footerText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
};

export default LoginPage;
