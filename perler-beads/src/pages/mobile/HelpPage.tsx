import React, { useState } from 'react';
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

  // 使用教程步骤
  const tutorialSteps = [
    {
      icon: Camera,
      title: '上传图片',
      description: '点击首页的“开始创作”，选择照片或直接拍摄。支持 JPG、PNG 格式，建议使用清晰图片。',
      color: colors.bead.cyan,
    },
    {
      icon: Palette,
      title: '选择配色',
      description: '当前使用 MARD 色系，可调整颜色数量。颜色越少，图案越简洁、越容易制作。',
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
      description: '点击“珠子统计”查看每种颜色所需数量，便于采购。也可禁用不需要的颜色。',
      color: colors.bead.orange,
    },
    {
      icon: Download,
      title: '导出图案',
      description: '点击“导出图案”保存高清图，可用于打印或分享。',
      color: colors.bead.purple,
    },
  ];

  // 常见问题
  const faqItems = [
    {
      question: '当前支持哪个拼豆色系？',
      answer: '当前默认使用 MARD 色系（291色）进行自动配色。后续若扩展多品牌，会在这里同步说明。',
    },
    {
      question: '网格大小怎么选？',
      answer: '网格越小越容易做，网格越大细节越丰富。建议新手从 32x32 开始。',
    },
    {
      question: '颜色数量会影响什么？',
      answer: '颜色越多越接近原图，但制作和采购成本更高；颜色越少越简洁，制作更快。',
    },
    {
      question: '透明背景图片支持吗？',
      answer: '支持 PNG 透明图。透明区域不会生成珠子。',
    },
    {
      question: '图案可以保存吗？',
      answer: '可以。登录后可同步到云端；未登录则保存在本地。',
    },
    {
      question: '怎么购买材料？',
      answer: '可按“珠子统计”里的色号和数量到电商平台采购，建议常用色多备一些。',
    },
    {
      question: '制作辅助模式有什么用？',
      answer: '会按区块或步骤高亮，帮助你减少错放，尤其适合大图制作。',
    },
  ];

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <div style={styles.container}>
      {/* 固定头部 */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 style={styles.title}>帮助</h1>
        <div style={styles.placeholder} />
      </div>
      {/* Header 占位 */}
      <div style={styles.headerSpacer} />

      {/* 使用教程 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          <span style={styles.sectionIcon}>{pixelIcons.star}</span>
          使用教程
        </h2>

        <div style={styles.tutorialList}>
          {tutorialSteps.map((step, index) => (
            <div key={index} style={styles.tutorialItem}>
              <div style={styles.stepNumber}>
                <span style={{
                  ...styles.stepBadge,
                  background: `linear-gradient(145deg, ${step.color}, ${step.color}cc)`,
                  boxShadow: `0 2px 8px ${step.color}40`,
                }}>
                  {index + 1}
                </span>
              </div>
              <div style={styles.stepContent}>
                <div style={styles.stepHeader}>
                  <div style={{
                    ...styles.stepIconBox,
                    background: `linear-gradient(145deg, ${step.color}30, ${step.color}15)`,
                  }}>
                    <step.icon size={18} weight="fill" style={{ color: step.color }} />
                  </div>
                  <h3 style={styles.stepTitle}>{step.title}</h3>
                </div>
                <p style={styles.stepDesc}>{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 常见问题 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          <Question size={20} weight="fill" style={{ color: colors.bead.yellow }} />
          常见问题
        </h2>

        <div style={styles.faqList}>
          {faqItems.map((item, index) => (
            <div
              key={index}
              style={styles.faqItem}
              onClick={() => toggleFaq(index)}
            >
              <div style={styles.faqHeader}>
                <span style={styles.faqQuestion}>{item.question}</span>
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

      {/* 联系我们 */}
      <div style={styles.contactSection}>
        <p style={styles.contactText}>
          还有其他问题？请通过“关于”页面联系我们
        </p>
        <button
          style={styles.contactBtn}
          onClick={() => navigate('/mobile/about')}
        >
          前往关于页面
        </button>
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
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid ${colors.border.soft}`,
    boxShadow: shadows.sm,
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
    color: colors.text.primary,
    margin: 0,
  },

  stepDesc: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    margin: 0,
    lineHeight: 1.6,
  },

  faqList: {
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid ${colors.border.soft}`,
    boxShadow: shadows.sm,
    overflow: 'hidden',
  },

  faqItem: {
    borderBottom: `1px solid ${colors.border.soft}`,
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
    color: colors.text.primary,
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
    color: colors.text.muted,
    margin: 0,
    lineHeight: 1.7,
  },

  contactSection: {
    margin: '32px 16px 0',
    padding: '20px',
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid ${colors.bead.cyan}30`,
    boxShadow: `${shadows.sm}, 0 4px 16px ${colors.bead.cyan}10`,
    textAlign: 'center',
  },

  contactText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    margin: '0 0 16px',
  },

  contactBtn: {
    padding: '12px 24px',
    background: `linear-gradient(145deg, ${colors.bead.cyan}20, ${colors.bead.cyan}10)`,
    border: `1px solid ${colors.bead.cyan}40`,
    borderRadius: radius.button,
    color: colors.bead.cyan,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },
};

export default HelpPage;

