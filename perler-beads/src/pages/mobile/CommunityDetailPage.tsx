import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Eye, Hammer, Palette, GridFour, Star } from '@phosphor-icons/react';
import { colors, radius, typography, shadows, animation } from '../../styles/designSystem';
import { communityApi, CommunityPostDetail } from '../../services/api/communityApi';

const CommunityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<CommunityPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    const loadDetail = async () => {
      setLoading(true);
      try {
        const res = await communityApi.getPostById(Number(id));
        if (res.code === 0 && res.data) {
          setPost(res.data);
        } else {
          setError(res.msg || '加载失败');
        }
      } catch (err) {
        setError('网络错误，请重试');
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [id]);

  // 一键开始制作
  const handleStartMaking = () => {
    if (!post) return;
    navigate('/mobile/making', {
      state: {
        beadData: post.bead_data,
      },
    });
    // 后台增加制作数
    communityApi.incrementMakeCount(post.id);
  };

  // 难度标签
  const getDifficultyInfo = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return { label: '简单', color: colors.bead.green };
      case 'hard': return { label: '困难', color: colors.bead.red };
      default: return { label: '中等', color: colors.bead.orange };
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={20} weight="bold" color={colors.text.primary} />
          </button>
          <span style={styles.headerTitle}>作品详情</span>
          <div style={{ width: 32 }} />
        </div>
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>加载中...</span>
        </div>
        <style>{spinKeyframes}</style>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={20} weight="bold" color={colors.text.primary} />
          </button>
          <span style={styles.headerTitle}>作品详情</span>
          <div style={{ width: 32 }} />
        </div>
        <div style={styles.errorWrap}>
          <span style={{ fontSize: '48px' }}>😔</span>
          <span style={styles.errorText}>{error || '作品不存在'}</span>
          <button style={styles.retryBtn} onClick={() => navigate(-1)}>返回</button>
        </div>
      </div>
    );
  }

  const diffInfo = getDifficultyInfo(post.difficulty);

  return (
    <div style={styles.container}>
      {/* 头部 */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} weight="bold" color={colors.text.primary} />
        </button>
        <span style={styles.headerTitle}>作品详情</span>
        <div style={{ width: 32 }} />
      </div>

      {/* 滚动内容 */}
      <div style={styles.scrollArea}>
        {/* 缩略图 */}
        <div style={styles.imageSection}>
          {post.thumbnail_url ? (
            <img
              src={post.thumbnail_url}
              alt={post.title}
              style={styles.mainImage}
            />
          ) : (
            <div style={styles.imagePlaceholder}>
              <span style={{ fontSize: '64px' }}>🧩</span>
            </div>
          )}
        </div>

        {/* 标题 */}
        <div style={styles.titleSection}>
          <h1 style={styles.title}>{post.title}</h1>
        </div>

        {/* 作者信息 */}
        <div style={styles.authorSection}>
          <div style={styles.avatar}>
            {post.user.avatar ? (
              <img src={post.user.avatar} alt={post.user.nickname} style={styles.avatarImg} />
            ) : (
              <span style={styles.avatarFallback}>{post.user.nickname?.[0] || '?'}</span>
            )}
          </div>
          <span style={styles.authorName}>{post.user.nickname || '匿名用户'}</span>
        </div>

        {/* 信息标签 */}
        <div style={styles.tagsRow}>
          <div style={styles.tag}>
            <GridFour size={14} color={colors.bead.cyan} />
            <span>{post.grid_width}×{post.grid_height}</span>
          </div>
          <div style={styles.tag}>
            <Palette size={14} color={colors.bead.purple} />
            <span>{post.color_count}色</span>
          </div>
          <div style={{ ...styles.tag, borderColor: `${diffInfo.color}40` }}>
            <Star size={14} color={diffInfo.color} weight="fill" />
            <span style={{ color: diffInfo.color }}>{diffInfo.label}</span>
          </div>
          {post.bead_count > 0 && (
            <div style={styles.tag}>
              <span>🔘</span>
              <span>{post.bead_count}颗</span>
            </div>
          )}
        </div>

        {/* 描述 */}
        {post.description && (
          <div style={styles.descSection}>
            <p style={styles.desc}>{post.description}</p>
          </div>
        )}

        {/* 互动数据 */}
        <div style={styles.statsRow}>
          <div style={styles.statItem}>
            <Heart size={18} weight="fill" color={colors.bead.red} />
            <span style={styles.statNum}>{post.like_count}</span>
            <span style={styles.statLabel}>点赞</span>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.statItem}>
            <Eye size={18} color={colors.bead.cyan} />
            <span style={styles.statNum}>{post.view_count}</span>
            <span style={styles.statLabel}>浏览</span>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.statItem}>
            <Hammer size={18} color={colors.bead.orange} />
            <span style={styles.statNum}>{post.make_count}</span>
            <span style={styles.statLabel}>制作</span>
          </div>
        </div>
      </div>

      {/* 底部CTA按钮 */}
      <div style={styles.bottomBar}>
        <button style={styles.ctaBtn} onClick={handleStartMaking}>
          <span style={styles.ctaIcon}>✨</span>
          <span style={styles.ctaText}>一键开始制作</span>
        </button>
      </div>

      <style>{spinKeyframes}</style>
    </div>
  );
};

const spinKeyframes = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: colors.bg.primary,
    color: colors.text.primary,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: colors.bg.glass,
    backdropFilter: 'blur(20px)',
    borderBottom: `1px solid ${colors.border.soft}`,
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: radius.md,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
  },

  // 加载
  loading: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  spinner: {
    width: '28px',
    height: '28px',
    border: `3px solid ${colors.border.soft}`,
    borderTopColor: colors.bead.cyan,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  },

  // 错误
  errorWrap: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  errorText: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
  },
  retryBtn: {
    padding: '8px 24px',
    background: colors.bg.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.md,
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
    cursor: 'pointer',
  },

  // 滚动区
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    paddingBottom: '80px',
  },

  // 图片
  imageSection: {
    width: '100%',
    aspectRatio: '1',
    background: colors.bg.elevated,
    overflow: 'hidden',
  },
  mainImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    background: colors.bg.card,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(135deg, ${colors.bg.card}, ${colors.bg.elevated})`,
  },

  // 标题
  titleSection: {
    padding: '16px 16px 8px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    lineHeight: 1.3,
  },

  // 作者
  authorSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 16px 12px',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: colors.bg.elevated,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1px solid ${colors.border.soft}`,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarFallback: {
    fontSize: '12px',
    fontWeight: typography.fontWeight.bold,
    color: colors.text.muted,
  },
  authorName: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontFamily: typography.fontFamilyAlt,
  },

  // 标签
  tagsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '0 16px 16px',
  },
  tag: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    background: colors.bg.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.full,
    fontSize: '12px',
    color: colors.text.secondary,
    fontFamily: typography.fontFamilyAlt,
  },

  // 描述
  descSection: {
    padding: '0 16px 16px',
  },
  desc: {
    margin: 0,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 1.6,
  },

  // 互动数据
  statsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0',
    padding: '16px',
    margin: '0 16px',
    background: colors.bg.card,
    borderRadius: radius.lg,
    border: `1px solid ${colors.border.soft}`,
  },
  statItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  statNum: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: '11px',
    color: colors.text.muted,
    fontFamily: typography.fontFamilyAlt,
  },
  statDivider: {
    width: '1px',
    height: '32px',
    background: colors.border.soft,
  },

  // 底部按钮
  bottomBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '12px 16px',
    paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 12px)',
    background: colors.bg.glass,
    backdropFilter: 'blur(20px)',
    borderTop: `1px solid ${colors.border.soft}`,
    zIndex: 10,
  },
  ctaBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px',
    background: `linear-gradient(135deg, ${colors.bead.cyan}, ${colors.bead.blue})`,
    border: 'none',
    borderRadius: radius.lg,
    cursor: 'pointer',
    boxShadow: `0 4px 16px ${colors.bead.cyan}40`,
  },
  ctaIcon: {
    fontSize: '18px',
  },
  ctaText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: '#ffffff',
  },
};

export default CommunityDetailPage;
