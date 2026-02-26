import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Image, FolderOpen, ArrowRight, Sparkle, Heart, Eye } from '@phosphor-icons/react';
import { colors, radius, typography, shadows, animation } from '../../styles/designSystem';
import OnboardingModal from '../../components/OnboardingModal';
import FeaturedCarousel from '../../components/FeaturedCarousel';
import { featuredWorks, FeaturedWork } from '../../data/featuredWorks';
import { templateApi, FeaturedTemplateResponse } from '../../services/api/templateApi';
import { communityApi, CommunityPostListItem } from '../../services/api/communityApi';
import { useUserStore } from '../../store/userStore';
import { localStorageService } from '../../services/localStorageService';

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
  const [localProjectCount, setLocalProjectCount] = useState(0);

  // 社区作品数据
  const [communityPosts, setCommunityPosts] = useState<CommunityPostListItem[]>([]);
  const [communityPage, setCommunityPage] = useState(1);
  const [communityHasMore, setCommunityHasMore] = useState(true);
  const [communityLoading, setCommunityLoading] = useState(false);
  const communityLoadingRef = useRef(false);

  // 加载社区作品
  const loadCommunityPosts = useCallback(async (pageNum: number, append = false) => {
    if (communityLoadingRef.current) return;
    communityLoadingRef.current = true;
    setCommunityLoading(true);
    try {
      const res = await communityApi.getPosts({ page: pageNum, pageSize: 20 });
      if (res.code === 0 && res.data) {
        const newList = res.data.list || [];
        setCommunityPosts(prev => append ? [...prev, ...newList] : newList);
        setCommunityHasMore(newList.length >= 20);
      }
    } catch (err) {
      console.error('加载社区作品失败:', err);
    } finally {
      setCommunityLoading(false);
      communityLoadingRef.current = false;
    }
  }, []);

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

    // 加载本地方案数量
    const localResult = localStorageService.getProjectList();
    setLocalProjectCount(localResult.total);

    // 加载社区作品
    loadCommunityPosts(1);
  }, [loadCommunityPosts]);

  // 滚动加载更多社区作品
  useEffect(() => {
    const handleScroll = () => {
      if (!communityHasMore || communityLoadingRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      if (scrollHeight - scrollTop - clientHeight < 200) {
        const nextPage = communityPage + 1;
        setCommunityPage(nextPage);
        loadCommunityPosts(nextPage, true);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [communityPage, communityHasMore, loadCommunityPosts]);

  // 难度工具
  const getDifficultyColor = (d: string) => {
    switch (d) {
      case 'easy': return colors.bead.green;
      case 'hard': return colors.bead.red;
      default: return colors.bead.orange;
    }
  };
  const getDifficultyLabel = (d: string) => {
    switch (d) {
      case 'easy': return '简单';
      case 'hard': return '困难';
      default: return '中等';
    }
  };

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

        {/* 我的方案 */}
        <div style={styles.myProjects}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>📁</span>
            <span style={styles.sectionTitle}>我的方案</span>
            {localProjectCount > 0 && (
              <span style={styles.projectCountBadge}>{localProjectCount}</span>
            )}
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
              ) : localProjectCount > 0 ? (
                <>
                  <span style={styles.myProjectsTitle}>本地方案 ({localProjectCount})</span>
                  <span style={styles.myProjectsDesc}>继续制作未完成的作品</span>
                </>
              ) : (
                <>
                  <span style={styles.myProjectsTitle}>还没有方案</span>
                  <span style={styles.myProjectsDesc}>上传图片生成你的第一个拼豆图案</span>
                </>
              )}
            </div>
            <ArrowRight size={20} style={{ color: colors.text.muted }} />
          </div>
        </div>

        {/* 社区作品瀑布流 */}
        <div style={styles.communitySection}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>🌟</span>
            <span style={styles.sectionTitle}>社区作品</span>
          </div>

          {communityPosts.length > 0 ? (
            <div style={styles.waterfall}>
              <div style={styles.waterfallCol}>
                {communityPosts.filter((_, i) => i % 2 === 0).map(post => (
                  <div key={post.id} style={styles.postCard} onClick={() => navigate(`/mobile/community/${post.id}`)}>
                    <div style={styles.postImageWrap}>
                      {post.thumbnail_url ? (
                        <img src={post.thumbnail_url} alt={post.title} style={styles.postImage} loading="lazy" />
                      ) : (
                        <div style={styles.postPlaceholder}><span style={{ fontSize: '32px' }}>🧩</span></div>
                      )}
                      <div style={{ ...styles.postDiffBadge, background: `${getDifficultyColor(post.difficulty)}cc` }}>
                        {getDifficultyLabel(post.difficulty)}
                      </div>
                    </div>
                    <div style={styles.postInfo}>
                      <div style={styles.postTitle}>{post.title}</div>
                      <div style={styles.postMeta}>
                        <span style={{ color: colors.bead.cyan }}>{post.grid_width}×{post.grid_height}</span>
                        <span style={{ color: colors.text.muted }}>·</span>
                        <span style={{ color: colors.bead.orange }}>{post.color_count}色</span>
                      </div>
                      <div style={styles.postFooter}>
                        <div style={styles.postStat}>
                          <Heart size={12} weight="fill" color={colors.bead.red} />
                          <span>{post.like_count}</span>
                        </div>
                        <div style={styles.postStat}>
                          <Eye size={12} color={colors.text.muted} />
                          <span>{post.view_count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={styles.waterfallCol}>
                {communityPosts.filter((_, i) => i % 2 === 1).map(post => (
                  <div key={post.id} style={styles.postCard} onClick={() => navigate(`/mobile/community/${post.id}`)}>
                    <div style={styles.postImageWrap}>
                      {post.thumbnail_url ? (
                        <img src={post.thumbnail_url} alt={post.title} style={styles.postImage} loading="lazy" />
                      ) : (
                        <div style={styles.postPlaceholder}><span style={{ fontSize: '32px' }}>🧩</span></div>
                      )}
                      <div style={{ ...styles.postDiffBadge, background: `${getDifficultyColor(post.difficulty)}cc` }}>
                        {getDifficultyLabel(post.difficulty)}
                      </div>
                    </div>
                    <div style={styles.postInfo}>
                      <div style={styles.postTitle}>{post.title}</div>
                      <div style={styles.postMeta}>
                        <span style={{ color: colors.bead.cyan }}>{post.grid_width}×{post.grid_height}</span>
                        <span style={{ color: colors.text.muted }}>·</span>
                        <span style={{ color: colors.bead.orange }}>{post.color_count}色</span>
                      </div>
                      <div style={styles.postFooter}>
                        <div style={styles.postStat}>
                          <Heart size={12} weight="fill" color={colors.bead.red} />
                          <span>{post.like_count}</span>
                        </div>
                        <div style={styles.postStat}>
                          <Eye size={12} color={colors.text.muted} />
                          <span>{post.view_count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : !communityLoading ? (
            <div style={styles.communityEmpty}>
              <span style={{ fontSize: '36px' }}>🎨</span>
              <span style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>暂无社区作品</span>
            </div>
          ) : null}

          {/* 加载中 */}
          {communityLoading && (
            <div style={styles.communityLoading}>
              <div style={styles.communitySpinner} />
              <span style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>加载中...</span>
            </div>
          )}

          {/* 已到底 */}
          {!communityHasMore && communityPosts.length > 0 && (
            <div style={styles.communityEnd}>
              <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>— 已经到底了 —</span>
            </div>
          )}
        </div>
      </div>

      {/* 底部渐变装饰 */}
      <div style={styles.rainbowBar} />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
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

  projectCountBadge: {
    marginLeft: '4px',
    padding: '2px 8px',
    background: `linear-gradient(135deg, ${colors.bead.cyan}, ${colors.bead.green})`,
    borderRadius: radius.full,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: '#ffffff',
  },

  communitySection: {
    marginBottom: '24px',
  },

  waterfall: {
    display: 'flex',
    gap: '10px',
  },

  waterfallCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },

  postCard: {
    background: colors.bg.card,
    borderRadius: radius.lg,
    border: `1px solid ${colors.border.soft}`,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: animation.transition.fast,
  },

  postImageWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: '1',
    background: colors.bg.elevated,
    overflow: 'hidden',
  },

  postImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  postPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(135deg, ${colors.bg.card}, ${colors.bg.elevated})`,
  },

  postDiffBadge: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    padding: '2px 6px',
    borderRadius: radius.sm,
    fontSize: '10px',
    fontWeight: typography.fontWeight.semibold,
    color: '#ffffff',
    fontFamily: typography.fontFamilyAlt,
  },

  postInfo: {
    padding: '8px 10px 10px',
  },

  postTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginBottom: '4px',
  },

  postMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    color: colors.text.muted,
    fontFamily: typography.fontFamilyAlt,
    marginBottom: '6px',
  },

  postFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  postStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '11px',
    color: colors.text.muted,
  },

  communityEmpty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '40px 20px',
  },

  communityLoading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '20px 0',
  },

  communitySpinner: {
    width: '18px',
    height: '18px',
    border: `2px solid ${colors.border.soft}`,
    borderTopColor: colors.bead.cyan,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },

  communityEnd: {
    textAlign: 'center',
    padding: '20px 0',
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
