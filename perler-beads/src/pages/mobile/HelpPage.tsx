import React, { useEffect, useState } from 'react';
import { ArrowLeft, CaretDown, CaretUp, Camera, Palette, GridFour, Download, PencilSimple, ShoppingCart, Question } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { colors, radius, typography, shadows, animation, pixelIcons, mixins } from '../../styles/designSystem';
import BottomNav from '../../components/BottomNav';

/**
 * 帮助页面
 * 包含使用教程和常见问题
 */
const HelpPage: React.FC = () => {
  const navigate = useNavigate();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const tutorialSteps = [
    {
      icon: Camera,
      title: '上传图片',
      description: '点击首页的“开始创作”，选择照片或直接拍摄。支持 JPG、PNG 格式，建议使用清晰图片。',
      color: '#56b7ef',
    },
    {
      icon: Palette,
      title: '选择配色',
      description: '当前提供 MARD 官方色库 221 / 291，并保留“我的颜色”独立库存层。精简程度表示生成偏好：越靠近“保真”越接近原图，越靠近“极简”越容易制作。',
      color: colors.bead.pink,
    },
    {
      icon: GridFour,
      title: '生成图案',
      description: '系统会自动把图片转成拼豆图案。可调整网格大小（如 32x32）来控制复杂度。',
      color: colors.bead.green,
    },
    {
      icon: PencilSimple,
      title: '编辑微调',
      description: '可在编辑器中手动替换颜色，使用画笔、填充、吸色等工具做细节修正。',
      color: colors.bead.yellow,
    },
    {
      icon: ShoppingCart,
      title: '查看清单',
      description: '点击“豆子统计”查看每种颜色所需数量，便于采购。也可禁用不需要的颜色。',
      color: colors.bead.orange,
    },
    {
      icon: Download,
      title: '导出图案',
      description: '点击“导出图案”保存高清图，可用于打印或分享。',
      color: colors.bead.purple,
    },
  ];

  const faqItems = [
    {
      question: '当前支持哪个拼豆色系？',
      answer: '当前提供 MARD 官方色库 221 / 291，并额外保留“我的颜色”独立库存层。自动配色会在这些颜色范围内做选择，不再把 291 色表述成唯一官方口径。',
    },
    {
      question: '网格大小怎么选？',
      answer: '网格越小越容易做，网格越大细节越丰富。建议新手从 32x32 开始。',
    },
    {
      question: '颜色数量会影响什么？',
      answer: '精简程度只影响自动生成时的复杂度和细节保留程度，不代表官方色板方案。你可以理解成从“更还原”到“更简单”的生成偏好。',
    },
    {
      question: '透明背景图片支持吗？',
      answer: '支持 PNG 透明图。透明区域不会生成豆子。',
    },
    {
      question: '图案可以保存吗？',
      answer: '可以。登录后可同步到云端；未登录则保存在本地。',
    },
    {
      question: '怎么购买材料？',
      answer: '可按“豆子统计”里的色号和数量到电商平台采购，建议常用色多备一些。',
    },
    {
      question: '制作辅助模式有什么用？',
      answer: '会按区块或步骤高亮，帮助你减少错放，尤其适合大图制作。',
    },
  ];

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const isNarrowPhone = viewportWidth <= 390;
  const isCompactPhone = viewportWidth <= 360;

  const sectionStyle: React.CSSProperties = {
    ...styles.section,
    margin: isCompactPhone ? '16px 12px' : styles.section.margin,
  };

  const tutorialItemStyle: React.CSSProperties = {
    ...styles.tutorialItem,
    gap: isCompactPhone ? '10px' : styles.tutorialItem.gap,
  };

  const stepContentStyle: React.CSSProperties = {
    ...styles.stepContent,
    padding: isCompactPhone ? '13px' : styles.stepContent.padding,
  };

  const stepHeaderStyle: React.CSSProperties = {
    ...styles.stepHeader,
    alignItems: isNarrowPhone ? 'flex-start' : 'center',
  };

  const stepTitleStyle: React.CSSProperties = {
    ...styles.stepTitle,
    lineHeight: isCompactPhone ? 1.4 : undefined,
  };

  const faqHeaderStyle: React.CSSProperties = {
    ...styles.faqHeader,
    padding: isCompactPhone ? '14px' : styles.faqHeader.padding,
    alignItems: isNarrowPhone ? 'flex-start' : 'center',
  };

  const faqQuestionStyle: React.CSSProperties = {
    ...styles.faqQuestion,
    fontSize: isCompactPhone ? typography.fontSize.sm : styles.faqQuestion.fontSize,
    paddingRight: isCompactPhone ? '8px' : styles.faqQuestion.paddingRight,
    lineHeight: isCompactPhone ? 1.45 : undefined,
  };

  const contactSectionStyle: React.CSSProperties = {
    ...styles.contactSection,
    margin: isCompactPhone ? '24px 12px 0' : styles.contactSection.margin,
    padding: isCompactPhone ? '16px' : styles.contactSection.padding,
  };

  const contactBtnStyle: React.CSSProperties = {
    ...styles.contactBtn,
    width: isCompactPhone ? '100%' : undefined,
    padding: isCompactPhone ? '11px 16px' : styles.contactBtn.padding,
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 style={styles.title}>帮助</h1>
        <div style={styles.placeholder} />
      </div>
      <div style={styles.headerSpacer} />

      <div style={sectionStyle}>
        <h2 style={styles.sectionTitle}>
          <span style={styles.sectionIcon}>{pixelIcons.star}</span>
          使用教程
        </h2>

        <div style={styles.tutorialList}>
          {tutorialSteps.map((step, index) => (
            <div key={index} style={tutorialItemStyle}>
              <div style={styles.stepNumber}>
                <span
                  style={{
                    ...styles.stepBadge,
                    background: `linear-gradient(145deg, ${step.color}, ${step.color}cc)`,
                    boxShadow: `0 2px 8px ${step.color}40`,
                  }}
                >
                  {index + 1}
                </span>
              </div>
              <div style={stepContentStyle}>
                <div style={stepHeaderStyle}>
                  <div
                    style={{
                      ...styles.stepIconBox,
                      background: `linear-gradient(145deg, ${step.color}30, ${step.color}15)`,
                    }}
                  >
                    <step.icon size={18} weight="fill" style={{ color: step.color }} />
                  </div>
                  <h3 style={stepTitleStyle}>{step.title}</h3>
                </div>
                <p style={styles.stepDesc}>{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <h2 style={styles.sectionTitle}>
          <Question size={20} weight="fill" style={{ color: colors.bead.yellow }} />
          常见问题
        </h2>

        <div style={styles.faqList}>
          {faqItems.map((item, index) => (
            <div key={index} style={styles.faqItem} onClick={() => toggleFaq(index)}>
              <div style={faqHeaderStyle}>
                <span style={faqQuestionStyle}>{item.question}</span>
                {expandedFaq === index ? (
                  <CaretUp size={18} style={{ color: colors.bead.cyan }} />
                ) : (
                  <CaretDown size={18} style={{ color: colors.text.muted }} />
                )}
              </div>
              {expandedFaq === index && (
                <div style={styles.faqAnswer}>
                  <p style={styles.faqAnswerText}>{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={contactSectionStyle}>
        <p style={styles.contactText}>还有其他问题？请通过“关于”页面联系我们</p>
        <button style={contactBtnStyle} onClick={() => navigate('/mobile/about')}>
          前往关于页面
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

const helpCandy = {
  pageBg: 'linear-gradient(180deg, #fffaf3 0%, #fef4ff 48%, #f3fbff 100%)',
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
    background: helpCandy.pageBg,
    paddingBottom: '80px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    background: 'rgba(255,255,255,0.78)',
    borderBottom: `1px solid ${helpCandy.border}`,
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
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    background: colors.gradients.primary,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: '0 0 16px',
  },
  sectionIcon: {
    color: colors.bead.yellow,
    WebkitTextFillColor: colors.bead.yellow,
  },
  tutorialList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  tutorialItem: {
    display: 'flex',
    gap: '12px',
  },
  stepNumber: {
    flexShrink: 0,
    width: '32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  stepBadge: {
    width: '28px',
    height: '28px',
    borderRadius: radius.full,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
  },
  stepContent: {
    flex: 1,
    background: helpCandy.panel,
    borderRadius: radius.card,
    border: `1px solid ${helpCandy.border}`,
    boxShadow: helpCandy.shadow,
    padding: '16px',
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
  },
  stepIconBox: {
    width: '32px',
    height: '32px',
    borderRadius: radius.bead,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: helpCandy.text,
    margin: 0,
  },
  stepDesc: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: helpCandy.textMuted,
    margin: 0,
    lineHeight: 1.6,
  },
  faqList: {
    background: helpCandy.panel,
    borderRadius: radius.card,
    border: `1px solid ${helpCandy.border}`,
    boxShadow: helpCandy.shadow,
    overflow: 'hidden',
  },
  faqItem: {
    borderBottom: `1px solid ${helpCandy.border}`,
    boxShadow: '0 10px 28px rgba(137, 112, 167, 0.08)',
    cursor: 'pointer',
  },
  faqHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    transition: animation.transition.fast,
  },
  faqQuestion: {
    flex: 1,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    fontFamily: typography.fontFamilyAlt,
    color: helpCandy.text,
    paddingRight: '12px',
  },
  faqAnswer: {
    padding: '0 16px 16px',
    borderTop: `1px dashed ${colors.border.soft}`,
    marginTop: '-8px',
    paddingTop: '16px',
  },
  faqAnswerText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: helpCandy.textMuted,
    margin: 0,
    lineHeight: 1.7,
  },
  contactSection: {
    margin: '32px 16px 0',
    padding: '20px',
    background: helpCandy.panel,
    borderRadius: radius.card,
    border: '1px solid rgba(120, 216, 255, 0.28)',
    boxShadow: '0 18px 42px rgba(137, 112, 167, 0.12)',
    textAlign: 'center',
  },
  contactText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: helpCandy.textMuted,
    margin: '0 0 16px',
  },
  contactBtn: {
    padding: '12px 24px',
    background: 'linear-gradient(145deg, rgba(120,216,255,0.18), rgba(255,147,191,0.12))',
    border: `1px solid ${colors.bead.cyan}40`,
    borderRadius: radius.button,
    color: '#56b7ef',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },
};

export default HelpPage;
