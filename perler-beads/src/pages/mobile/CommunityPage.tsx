import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Eye, SortAscending, Fire, Hammer } from '@phosphor-icons/react';
import { colors, radius, typography, shadows, animation } from '../../styles/designSystem';
import { communityApi, CommunityPostListItem } from '../../services/api/communityApi';
import { sanitizeDisplayTitle } from '../../utils/textUtils';

// 预设分类
const CATEGORY_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '动漫', value: 'anime' },
  { label: '游戏', value: 'game' },
  { label: '动物', value: 'animal' },
  { label: '风景', value: 'scenery' },
  { label: '节日', value: 'holiday' },
  { label: '人物', value: 'character' },
  { label: '美食', value: 'food' },
  { label: '其他', value: 'other' },
];

// 排序选项
const SORT_OPTIONS = [
  { key: 'newest', label: '最新', icon: SortAscending },
  { key: 'popular', label: '最热', icon: Fire },
  { key: 'most_made', label: '最多制作', icon: Hammer },
] as const;

const CommunityPage: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<CommunityPostListItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const loadingRef = useRef(false);
  const pageSize = 20;

  // 加载数据
  const loadPosts = useCallback(async (pageNum: number, append = false, category?: string, sort?: string) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      const res = await communityApi.getPosts({
        page: pageNum,
        pageSize,
        category: category === 'all' ? undefined : category,
        sort: sort === 'newest' ? undefined : sort,
      });
      if (res.code === 0 && res.data) {
        const newList = res.data.list || [];
        setPosts(prev => append ? [...prev, ...newList] : newList);
        setTotal(res.data.total);
        setHasMore(newList.length >= pageSize);
      }
    } catch (err) {
      console.error('加载社区作品失败:', err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  // 首次加载
  useEffect(() => {
    loadPosts(1, false, selectedCategory, sortBy);
  }, [loadPosts, selectedCategory, sortBy]);

  // 切换分类
  const handleCategoryChange = (category: string) => {
    if (category === selectedCategory) return;
    setSelectedCategory(category);
    setPage(1);
    setPosts([]);
    setHasMore(true);
  };

  // 切换排序
  const handleSortChange = (sort: string) => {
    if (sort === sortBy) return;
    setSortBy(sort);
    setPage(1);
    setPosts([]);
    setHasMore(true);
  };

  // 滚动加载更多（监听 window scroll）
  useEffect(() => {
    const handleScroll = () => {
      if (!hasMore || loadingRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      if (scrollHeight - scrollTop - clientHeight < 200) {
        const nextPage = page + 1;
        setPage(nextPage);
        loadPosts(nextPage, true, selectedCategory, sortBy);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [page, hasMore, loadPosts, selectedCategory, sortBy]);

  // 难度标签颜色
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return colors.bead.green;
      case 'hard': return colors.bead.red;
      default: return colors.bead.orange;
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '简单';
      case 'hard': return '困难';
      default: return '中等';
    }
  };

  return (
    <div style={styles.container}>
      {/* 头部 */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>社区作品</span>
      </div>

      {/* 内容区 */}
      <div style={styles.scrollArea}>
        {/* 分类筛选栏 */}
        <div style={styles.tagBar}>
          <div style={styles.tagScroll}>
            {CATEGORY_OPTIONS.map(option => (
              <button
                key={option.value}
                style={{
                  ...styles.tagButton,
                  ...(selectedCategory === option.value ? styles.tagButtonActive : {}),
                }}
                onClick={() => handleCategoryChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 排序栏 + 统计 */}
        <div style={styles.sortBar}>
          <span style={styles.statsText}>共 {total} 个作品</span>
          <div style={styles.sortOptions}>
            {SORT_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.key}
                  style={{
                    ...styles.sortButton,
                    ...(sortBy === opt.key ? styles.sortButtonActive : {}),
                  }}
                  onClick={() => handleSortChange(opt.key)}
                >
                  <Icon size={13} weight={sortBy === opt.key ? 'bold' : 'regular'} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 双列瀑布流 */}
        <div style={styles.waterfall}>
          <div style={styles.column}>
            {posts.filter((_, i) => i % 2 === 0).map(post => (
              <PostCard
                key={post.id}
                post={post}
                getDifficultyColor={getDifficultyColor}
                getDifficultyLabel={getDifficultyLabel}
                onClick={() => navigate(`/mobile/community/${post.id}`)}
              />
            ))}
          </div>
          <div style={styles.column}>
            {posts.filter((_, i) => i % 2 === 1).map(post => (
              <PostCard
                key={post.id}
                post={post}
                getDifficultyColor={getDifficultyColor}
                getDifficultyLabel={getDifficultyLabel}
                onClick={() => navigate(`/mobile/community/${post.id}`)}
              />
            ))}
          </div>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div style={styles.loadingBar}>
            <div style={styles.spinner} />
            <span style={styles.loadingText}>加载中...</span>
          </div>
        )}

        {/* 没有更多 */}
        {!hasMore && posts.length > 0 && (
          <div style={styles.noMore}>
            <span style={styles.noMoreText}>- 已经到底了 -</span>
          </div>
        )}

        {/* 空状态 */}
        {!loading && posts.length === 0 && (
          <div style={styles.empty}>
            <span style={{ fontSize: '48px' }}>🧩</span>
            <span style={styles.emptyTitle}>暂无作品</span>
            <span style={styles.emptyText}>快去创作第一个作品吧</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// 作品卡片组件
interface PostCardProps {
  post: CommunityPostListItem;
  getDifficultyColor: (d: string) => string;
  getDifficultyLabel: (d: string) => string;
  onClick: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, getDifficultyColor, getDifficultyLabel, onClick }) => {
  const safeTitle = sanitizeDisplayTitle(post.title);
  return (
    <div style={cardStyles.card} onClick={onClick}>
      {/* 缩略图 */}
      <div style={cardStyles.imageWrap}>
        {post.thumbnail_url ? (
          <img
            src={post.thumbnail_url}
            alt={safeTitle}
            style={cardStyles.image}
            loading="lazy"
          />
        ) : (
          <div style={cardStyles.placeholder}>
            <span style={{ fontSize: '32px' }}>🖼️</span>
          </div>
        )}
        {/* 难度标签 */}
        <div style={{
          ...cardStyles.diffBadge,
          background: `${getDifficultyColor(post.difficulty)}cc`,
        }}>
          {getDifficultyLabel(post.difficulty)}
        </div>
      </div>

      {/* 信息 */}
      <div style={cardStyles.info}>
        <div style={cardStyles.title}>{safeTitle}</div>
        <div style={cardStyles.meta}>
          <span style={cardStyles.size}>{post.grid_width}×{post.grid_height}</span>
          <span style={cardStyles.dot}>·</span>
          <span style={cardStyles.colorCount}>{post.color_count}色</span>
        </div>
        <div style={cardStyles.footer}>
          <div style={cardStyles.stat}>
            <Heart size={12} weight="fill" color={colors.bead.red} />
            <span>{post.like_count}</span>
          </div>
          <div style={cardStyles.stat}>
            <Eye size={12} color={colors.text.muted} />
            <span>{post.view_count}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// 页面样式
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100%',
    color: colors.text.primary,
    width: '100%',
    overflowX: 'hidden',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 16px',
    borderBottom: `1px solid ${colors.border.soft}`,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
  },
  scrollArea: {
    padding: '12px',
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
  },
  tagBar: {
    marginBottom: '8px',
    overflow: 'hidden',
  },
  tagScroll: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '4px',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  } as React.CSSProperties,
  tagButton: {
    flexShrink: 0,
    padding: '5px 14px',
    borderRadius: radius.full,
    border: `1px solid ${colors.border.soft}`,
    background: colors.bg.card,
    color: colors.text.secondary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    transition: animation.transition.fast,
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  tagButtonActive: {
    background: `${colors.bead.cyan}20`,
    border: `1px solid ${colors.bead.cyan}`,
    color: colors.bead.cyan,
    fontWeight: typography.fontWeight.bold,
  },
  sortBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 4px 8px',
    gap: '8px',
    flexWrap: 'wrap',
    minWidth: 0,
  },
  sortOptions: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  sortButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    padding: '3px 8px',
    borderRadius: radius.sm,
    border: 'none',
    background: 'transparent',
    color: colors.text.muted,
    fontSize: '11px',
    fontWeight: typography.fontWeight.medium,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },
  sortButtonActive: {
    background: `${colors.bead.purple}20`,
    color: colors.bead.purple,
    fontWeight: typography.fontWeight.bold,
  },
  statsText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    fontFamily: typography.fontFamilyAlt,
    flexShrink: 0,
  },
  waterfall: {
    display: 'flex',
    gap: '10px',
    width: '100%',
    minWidth: 0,
  },
  column: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    minWidth: 0,
  },
  loadingBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '20px 0',
  },
  spinner: {
    width: '18px',
    height: '18px',
    border: `2px solid ${colors.border.soft}`,
    borderTopColor: colors.bead.cyan,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  },
  noMore: {
    textAlign: 'center',
    padding: '20px 0',
  },
  noMoreText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '80px 20px',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  },
};

// 卡片样式
const cardStyles: Record<string, React.CSSProperties> = {
  card: {
    background: colors.bg.card,
    borderRadius: radius.lg,
    border: `1px solid ${colors.border.soft}`,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: animation.transition.fast,
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: '1',
    background: colors.bg.elevated,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(135deg, ${colors.bg.card}, ${colors.bg.elevated})`,
  },
  diffBadge: {
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
  info: {
    padding: '8px 10px 10px',
  },
  title: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginBottom: '4px',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    color: colors.text.muted,
    fontFamily: typography.fontFamilyAlt,
    marginBottom: '6px',
  },
  size: {
    color: colors.bead.cyan,
  },
  dot: {
    color: colors.text.muted,
  },
  colorCount: {
    color: colors.bead.orange,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '11px',
    color: colors.text.muted,
  },
};

export default CommunityPage;


