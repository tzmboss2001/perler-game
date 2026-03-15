import React, { useEffect, useState } from 'react';
import { ArrowLeft, PaperPlaneTilt, Spinner, CheckCircle, EnvelopeSimple, Bug, Lightbulb, Heart } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { colors, radius, typography, shadows, animation, mixins } from '../../styles/designSystem';
import { useUserStore } from '../../store/userStore';
import BottomNav from '../../components/BottomNav';
import Modal, { useModal } from '../../components/Modal';

const feedbackTypes = [
  { id: 'bug', label: '问题反馈', icon: Bug, color: colors.bead.red, desc: '遇到了 Bug 或功能异常' },
  { id: 'suggestion', label: '功能建议', icon: Lightbulb, color: colors.bead.yellow, desc: '希望增加新功能或改进' },
  { id: 'other', label: '其他反馈', icon: Heart, color: colors.bead.pink, desc: '表扬、吐槽、随便聊聊' },
];

const FeedbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const { userInfo, isLoggedIn } = useUserStore();
  const { modalProps, showAlert, showError } = useModal();

  const [selectedType, setSelectedType] = useState<string>('suggestion');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState(isLoggedIn ? (userInfo?.email || '') : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSubmit = async () => {
    if (!content.trim()) {
      showAlert('请输入反馈内容', { type: 'warning', title: '提示' });
      return;
    }

    if (content.trim().length < 10) {
      showAlert('反馈内容至少需要 10 个字符', { type: 'warning', title: '提示' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/v1/feedback/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: selectedType,
          content: content.trim(),
          contact: contact.trim(),
        }),
      });

      const result = await response.json();

      if (result.code === 0) {
        setIsSuccess(true);
      } else {
        showError(result.msg || '提交失败，请稍后重试');
      }
    } catch {
      showError('提交失败，请检查网络连接');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isNarrowPhone = viewportWidth <= 390;
  const isCompactPhone = viewportWidth <= 360;

  const sectionStyle: React.CSSProperties = {
    ...styles.section,
    margin: isCompactPhone ? '16px 12px' : styles.section.margin,
  };

  const typeItemStyle = (selected: boolean, color: string): React.CSSProperties => ({
    ...styles.typeItem,
    padding: isCompactPhone ? '12px 13px' : styles.typeItem.padding,
    borderColor: selected ? color : colors.border.soft,
    background: selected ? `${color}10` : colors.bg.card,
    alignItems: isNarrowPhone ? 'flex-start' : styles.typeItem.alignItems,
  });

  const typeIconBoxStyle: React.CSSProperties = {
    ...styles.typeIconBox,
    marginRight: isCompactPhone ? '10px' : styles.typeIconBox.marginRight,
  };

  const textareaStyle: React.CSSProperties = {
    ...styles.textarea,
    minHeight: isCompactPhone ? '136px' : styles.textarea.minHeight,
    padding: isCompactPhone ? '14px' : styles.textarea.padding,
  };

  const inputWrapperStyle: React.CSSProperties = {
    ...styles.inputWrapper,
    padding: isCompactPhone ? '12px 14px' : styles.inputWrapper.padding,
  };

  const submitSectionStyle: React.CSSProperties = {
    ...styles.submitSection,
    margin: isCompactPhone ? '24px 12px' : styles.submitSection.margin,
  };

  const successBoxStyle: React.CSSProperties = {
    ...styles.successBox,
    margin: isCompactPhone ? '24px 12px' : styles.successBox.margin,
    padding: isCompactPhone ? '28px 16px' : styles.successBox.padding,
  };

  if (isSuccess) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={20} weight="bold" />
          </button>
          <h1 style={styles.title}>意见反馈</h1>
          <div style={styles.placeholder} />
        </div>
        <div style={styles.headerSpacer} />

        <div style={successBoxStyle}>
          <div style={styles.successIcon}>
            <CheckCircle size={64} weight="fill" style={{ color: colors.bead.green }} />
          </div>
          <h2 style={styles.successTitle}>感谢你的反馈</h2>
          <p style={styles.successDesc}>我们已收到你的意见，会认真阅读并持续改进产品。</p>
          <p style={styles.successHint}>
            如有紧急问题，请发送邮件至：<br />
            <a href="mailto:support@example.com" style={styles.emailLink}>
              support@example.com
            </a>
          </p>
          <button style={styles.backHomeBtn} onClick={() => navigate('/mobile/home')}>
            返回首页
          </button>
        </div>

        <BottomNav />
        <Modal {...modalProps} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 style={styles.title}>意见反馈</h1>
        <div style={styles.placeholder} />
      </div>
      <div style={styles.headerSpacer} />

      <div style={sectionStyle}>
        <h2 style={styles.sectionTitle}>反馈类型</h2>
        <div style={styles.typeList}>
          {feedbackTypes.map((type) => {
            const isSelected = selectedType === type.id;
            return (
              <div key={type.id} style={typeItemStyle(isSelected, type.color)} onClick={() => setSelectedType(type.id)}>
                <div
                  style={{
                    ...typeIconBoxStyle,
                    background: `linear-gradient(145deg, ${type.color}30, ${type.color}15)`,
                  }}
                >
                  <type.icon size={20} weight="fill" style={{ color: type.color }} />
                </div>
                <div style={styles.typeContent}>
                  <span style={{ ...styles.typeLabel, color: isSelected ? type.color : colors.text.primary }}>
                    {type.label}
                  </span>
                  <span style={styles.typeDesc}>{type.desc}</span>
                </div>
                {isSelected && (
                  <div style={{ ...styles.checkMark, background: type.color }}>
                    <CheckCircle size={16} weight="fill" style={{ color: '#fff' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={sectionStyle}>
        <h2 style={styles.sectionTitle}>反馈内容 *</h2>
        <textarea
          id="feedback-content"
          name="feedback-content"
          style={textareaStyle}
          placeholder="请详细描述你的问题或建议，我们会认真阅读每一条反馈..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={500}
        />
        <div style={styles.charCount}>{content.length}/500</div>
      </div>

      <div style={sectionStyle}>
        <h2 style={styles.sectionTitle}>联系方式（选填）</h2>
        <div style={inputWrapperStyle}>
          <EnvelopeSimple size={18} style={{ color: colors.text.muted }} />
          <input
            id="feedback-contact"
            name="feedback-contact"
            type="email"
            style={styles.input}
            placeholder="你的邮箱，方便我们回复你"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        </div>
        <p style={styles.inputHint}>留下联系方式后，我们可能会就你的反馈进行回访。</p>
      </div>

      <div style={submitSectionStyle}>
        <button
          style={{
            ...styles.submitBtn,
            opacity: isSubmitting || !content.trim() ? 0.6 : 1,
          }}
          onClick={handleSubmit}
          disabled={isSubmitting || !content.trim()}
        >
          {isSubmitting ? (
            <>
              <Spinner size={18} style={{ animation: 'spin 1s linear infinite' }} />
              <span>提交中...</span>
            </>
          ) : (
            <>
              <PaperPlaneTilt size={18} weight="fill" />
              <span>提交反馈</span>
            </>
          )}
        </button>
      </div>

      <BottomNav />
      <Modal {...modalProps} />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: colors.bg.primary,
    paddingBottom: '100px',
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
  typeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  typeItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 16px',
    borderRadius: radius.card,
    border: '2px solid',
    cursor: 'pointer',
    transition: animation.transition.fast,
    position: 'relative',
  },
  typeIconBox: {
    width: '40px',
    height: '40px',
    borderRadius: radius.bead,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '12px',
  },
  typeContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  typeLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    marginBottom: '2px',
  },
  typeDesc: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    lineHeight: 1.5,
  },
  checkMark: {
    width: '24px',
    height: '24px',
    borderRadius: radius.full,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textarea: {
    width: '100%',
    minHeight: '150px',
    padding: '16px',
    background: colors.bg.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.card,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
  },
  charCount: {
    textAlign: 'right',
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    marginTop: '8px',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    background: colors.bg.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.card,
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    outline: 'none',
    minWidth: 0,
  },
  inputHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    margin: '8px 0 0 4px',
  },
  submitSection: {
    margin: '32px 16px',
  },
  submitBtn: {
    width: '100%',
    padding: '16px',
    background: `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.pixel.blue})`,
    border: 'none',
    borderRadius: radius.card,
    color: '#ffffff',
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: `0 4px 16px ${colors.bead.cyan}40`,
    transition: animation.transition.fast,
  },
  successBox: {
    margin: '32px 16px',
    padding: '32px 20px',
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid ${colors.border.soft}`,
    boxShadow: shadows.md,
    textAlign: 'center',
  },
  successIcon: {
    marginBottom: '16px',
  },
  successTitle: {
    margin: '0 0 10px',
    color: colors.text.primary,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  successDesc: {
    margin: '0 0 12px',
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    lineHeight: 1.7,
  },
  successHint: {
    margin: '0 0 18px',
    color: colors.text.muted,
    fontSize: typography.fontSize.xs,
    lineHeight: 1.7,
  },
  emailLink: {
    color: colors.bead.cyan,
    textDecoration: 'none',
  },
  backHomeBtn: {
    padding: '12px 20px',
    background: `linear-gradient(145deg, ${colors.bead.green}, ${colors.bead.green}cc)`,
    border: 'none',
    borderRadius: radius.button,
    color: '#fff',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
  },
};

export default FeedbackPage;
