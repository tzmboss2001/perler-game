import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Image, FolderOpen, ArrowRight, Sparkle } from '@phosphor-icons/react';
import { colors, radius, typography, shadows, animation } from '../../styles/designSystem';
import OnboardingModal from '../../components/OnboardingModal';
import FeaturedCarousel from '../../components/FeaturedCarousel';
import TemplateCategoryList from '../../components/TemplateCategoryList';
import { featuredWorks, FeaturedWork } from '../../data/featuredWorks';
import { templateApi, FeaturedTemplateResponse } from '../../services/api/templateApi';
import { useUserStore } from '../../store/userStore';

// 难度映射：后端字符串 -> 前端类型
const difficultyMap: Record<string, 'easy' | 'medium' | 'hard'> = {
  'easy': 'easy',
  'medium': 'medium',
  'hard': 'hard',
  '简单': 'easy',
  '中等': 'medium',
  '困难': 'hard',
};

/**
 * 首页 - 拼豆工坊
 * 柔和像素风格设计
 */
const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useUserStore();
  const [works, setWorks] = useState<FeaturedWork[]>([]);

  // 加载精选作品 - 优先从API获取，无数据则使用本地生成
  useEffect(() => {
    const loadFeaturedWorks = async () => {
      try {
        const response = await templateApi.getFeatured(5);
        if (response.code === 0 && response.data && response.data.length > 0) {
          // API有数据，转换为前端格式（API返回驼峰格式）
          const apiWorks: FeaturedWork[] = response.data.map((item: FeaturedTemplateResponse) => ({
            id: String(item.id),
            title: item.title,
            imageUrl: item.imageUrl,
            beadCount: item.beadCount,
            gridSize: item.gridSize,
            difficulty: difficultyMap[item.difficulty] || 'medium',
            isOfficial: item.isOfficial,
            category: item.category,
          }));
          setWorks(apiWorks);
        } else {
          // API无数据，使用本地生成的数据
          setWorks(featuredWorks());
        }
      } catch (error) {
        console.error('加载精选作品失败，使用本地数据:', error);
        setWorks(featuredWorks());
      }
    };

    loadFeaturedWorks();
  }, []);

  // 处理精选作品点击 - 跳转到模板详情页
  const handleFeaturedWorkClick = (work: FeaturedWork) => {
    navigate(`/mobile/template/${work.id}`);
  };

  return (
    <div style={styles.container}>
      {/* 新手引导弹窗 */}
      <OnboardingModal />

      {/* 顶部 Header */}
      <div style={styles.header}>
        <div style={styles.logoWrapper}>
          {/* 装饰珠子 */}
          <div style={styles.beadDecor}>
            {[colors.bead.pink, colors.bead.orange, colors.bead.yellow, colors.bead.green, colors.bead.cyan].map((c, i) => (
              <span key={i} style={{ ...styles.beadDot, background: `linear-gradient(145deg, ${c}, ${c}cc)`, boxShadow: `0 2px 6px ${c}50` }} />
            ))}
          </div>
          <h1 style={styles.logo}>拼豆工坊</h1>
          <p style={styles.subtitle}>
            <Sparkle size={12} weight="fill" style={{ color: colors.bead.yellow }} />
            {' '}像素艺术创造器{' '}
            <Sparkle size={12} weight="fill" style={{ color: colors.bead.yellow }} />
          </p>
        </div>
      </div>

      {/* 主内容区域 */}
      <div style={styles.content}>
        {/* 精选作品轮播 */}
        {works.length > 0 && (
          <FeaturedCarousel
            works={works}
            onWorkClick={handleFeaturedWorkClick}
          />
        )}

        {/* 快速开始区域 */}
        <div style={styles.quickStart}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>⚡</span>
            <span style={styles.sectionTitle}>快速开始</span>
          </div>
          <div style={styles.actionButtons}>
            <button style={styles.primaryBtn} onClick={() => navigate('/mobile/create', { state: { source: 'camera' } })}>
              <div style={styles.btnIconBox}>
                <Camera size={28} weight="fill" />
              </div>
              <div style={styles.btnContent}>
                <span style={styles.btnText}>拍照创作</span>
                <span style={styles.btnDesc}>拍摄照片生成图案</span>
              </div>
            </button>

            <button style={styles.secondaryBtn} onClick={() => navigate('/mobile/create', { state: { source: 'album' } })}>
              <div style={styles.btnIconBox2}>
                <Image size={28} weight="duotone" />
              </div>
              <div style={styles.btnContent}>
                <span style={styles.btnText2}>相册选择</span>
                <span style={styles.btnDesc2}>从相册选择图片</span>
              </div>
            </button>
          </div>
        </div>

        {/* 模板分类 */}
        <TemplateCategoryList />

        {/* 我的方案 */}
        <div style={styles.myProjects}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>📁</span>
            <span style={styles.sectionTitle}>我的方案</span>
          </div>
          <div style={styles.myProjectsCard} onClick={() => navigate('/mobile/profile')}>
            <div style={styles.myProjectsIcon}>
              <FolderOpen size={24} weight="duotone" style={{ color: colors.bead.purple }} />
            </div>
            <div style={styles.myProjectsContent}>
              {isLoggedIn ? (
                <>
                  <span style={styles.myProjectsTitle}>查看全部方案</span>
                  <span style={styles.myProjectsDesc}>继续制作未完成的作品</span>
                </>
              ) : (
                <>
                  <span style={styles.myProjectsTitle}>登录同步云端</span>
                  <span style={styles.myProjectsDesc}>登录后可保存方案到云端</span>
                </>
              )}
            </div>
            <ArrowRight size={20} style={{ color: colors.text.muted }} />
          </div>
        </div>

        {/* 社区入口预留 - 灰色卡片 */}
        <div style={styles.communityPreview}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>🌟</span>
            <span style={styles.sectionTitle}>社区作品</span>
            <span style={styles.comingSoonBadge}>即将上线</span>
          </div>
          <div style={styles.communityCard}>
            <div style={styles.communityContent}>
              <span style={styles.communityText}>发现更多精彩作品</span>
              <span style={styles.communitySubtext}>与其他创作者分享你的作品</span>
            </div>
          </div>
        </div>
      </div>

      {/* 底部渐变装饰 */}
      <div style={styles.rainbowBar} />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100%',
    background: colors.bg.primary,
    paddingBottom: '100px',
  },

  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '16px 16px 12px',
    background: colors.bg.primary,
  },

  logoWrapper: {
    flex: 1,
  },

  beadDecor: {
    display: 'flex',
    gap: '6px',
    marginBottom: '8px',
  },

  beadDot: {
    width: '10px',
    height: '10px',
    borderRadius: radius.full,
  },

  logo: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.heavy,
    fontFamily: typography.fontFamilyAlt,
    background: `linear-gradient(135deg, ${colors.soft.lemon} 0%, ${colors.soft.peach} 50%, ${colors.soft.pink} 100%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: '0 0 4px',
    letterSpacing: typography.letterSpacing.wide,
  },

  subtitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },

  content: {
    padding: '0 16px',
  },

  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },

  sectionIcon: {
    fontSize: '18px',
  },

  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    background: colors.gradients.primary,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },

  quickStart: {
    marginBottom: '24px',
  },

  actionButtons: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },

  primaryBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 16px',
    background: `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.pixel.blue})`,
    border: 'none',
    borderRadius: radius.card,
    cursor: 'pointer',
    boxShadow: `${shadows.md}, ${shadows.glow.cyan}`,
    transition: animation.transition.fast,
  },

  secondaryBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 16px',
    background: colors.bg.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.card,
    cursor: 'pointer',
    boxShadow: shadows.sm,
    transition: animation.transition.fast,
  },

  btnIconBox: {
    width: '52px',
    height: '52px',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: radius.bead,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    marginBottom: '12px',
  },

  btnIconBox2: {
    width: '52px',
    height: '52px',
    background: `linear-gradient(145deg, ${colors.bead.pink}30, ${colors.bead.pink}15)`,
    borderRadius: radius.bead,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.bead.pink,
    marginBottom: '12px',
  },

  btnContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },

  btnText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: '#ffffff',
    marginBottom: '4px',
  },

  btnText2: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    marginBottom: '4px',
  },

  btnDesc: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: 'rgba(255,255,255,0.8)',
  },

  btnDesc2: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
  },

  myProjects: {
    marginBottom: '24px',
  },

  myProjectsCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 16px',
    background: colors.bg.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.card,
    cursor: 'pointer',
    boxShadow: shadows.sm,
    gap: '12px',
  },

  myProjectsIcon: {
    width: '44px',
    height: '44px',
    background: `linear-gradient(145deg, ${colors.bead.purple}20, ${colors.bead.purple}10)`,
    borderRadius: radius.bead,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  myProjectsContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },

  myProjectsTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    marginBottom: '2px',
  },

  myProjectsDesc: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
  },

  communityPreview: {
    marginBottom: '24px',
  },

  comingSoonBadge: {
    marginLeft: 'auto',
    padding: '4px 10px',
    background: colors.bg.tertiary,
    borderRadius: radius.full,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
  },

  communityCard: {
    padding: '24px 16px',
    background: colors.bg.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.card,
    boxShadow: shadows.sm,
    opacity: 0.7,
  },

  communityContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },

  communityText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    marginBottom: '4px',
  },

  communitySubtext: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
  },

  rainbowBar: {
    height: '4px',
    margin: '0 16px',
    background: colors.gradients.rainbow,
    borderRadius: radius.full,
    opacity: 0.7,
  },
};

export default HomePage;
