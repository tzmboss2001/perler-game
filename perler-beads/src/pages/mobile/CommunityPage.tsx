import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Eye, SortAscending, Fire, Hammer, Sparkle, MagnifyingGlass } from '@phosphor-icons/react';
import { colors, radius, typography, shadows, animation } from '../../styles/designSystem';
import { communityApi, CommunityPostListItem } from '../../services/api/communityApi';
import { sanitizeDisplayTitle } from '../../utils/textUtils';

const FEED_OPTIONS = [
  { key: 'recommended', label: '推荐', icon: Sparkle },
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
  const [feedTab, setFeedTab] = useState('recommended');
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const loadingRef = useRef(false);
  const pageSize = 20;

  // 加载数据
  const loadPosts = useCallback(async (pageNum: number, append = false, sort?: string, searchKeyword?: string) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      const res = await communityApi.getPosts({
        page: pageNum,
        pageSize,
        keyword: searchKeyword?.trim() || undefined,
        sort: sort && sort !== 'newest' ? sort : undefined,
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
    loadPosts(1, false, feedTab, keyword);
  }, [loadPosts, feedTab, keyword]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setKeyword(keywordInput.trim());
      setPage(1);
      setPosts([]);
      setHasMore(true);
    }, 300);
    return () => window.clearTimeout(t);
  }, [keywordInput]);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleFeedChange = (next: string) => {
    if (next === feedTab) return;
    setFeedTab(next);
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
        loadPosts(nextPage, true, feedTab, keyword);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [page, hasMore, loadPosts, feedTab, keyword]);

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

  const isNarrowPhone = viewportWidth <= 390;
  const isCompactPhone = viewportWidth <= 360;

  const searchBarStyle: React.CSSProperties = {
    ...styles.searchBar,
    padding: isCompactPhone ? '8px 9px' : styles.searchBar.padding,
    marginBottom: isCompactPhone ? '8px' : styles.searchBar.marginBottom,
  };

  const sortBarStyle: React.CSSProperties = {
    ...styles.sortBar,
    alignItems: isNarrowPhone ? 'flex-start' : styles.sortBar.alignItems,
    justifyContent: isNarrowPhone ? 'flex-start' : styles.sortBar.justifyContent,
    gap: isCompactPhone ? '6px' : styles.sortBar.gap,
  };

  const sortOptionsStyle: React.CSSProperties = {
    ...styles.sortOptions,
    width: isNarrowPhone ? '100%' : undefined,
    justifyContent: isNarrowPhone ? 'flex-start' : styles.sortOptions.justifyContent,
    gap: isCompactPhone ? '6px' : styles.sortOptions.gap,
  };

  const waterfallStyle: React.CSSProperties = {
    ...styles.waterfall,
    flexDirection: isCompactPhone ? 'column' : 'row',
    gap: isCompactPhone ? '8px' : styles.waterfall.gap,
  };

  const columnStyle: React.CSSProperties = {
    ...styles.column,
    gap: isCompactPhone ? '8px' : styles.column.gap,
  };

  return (
    <div style={styles.container}>
      {/* 头部 */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>社区作品</span>
      </div>

      {/* 内容区 */}
      <div style={styles.scrollArea}>
        <div style={searchBarStyle}>
          <MagnifyingGlass size={16} color={colors.text.muted} />
          <input
            value={keywordInput}
            onChange={e => setKeywordInput(e.target.value)}
            placeholder="搜索作品名 / 标签 / 作者"
            style={styles.searchInput}
          />
        </div>

        {/* 内容流 + 统计 */}
        <div style={sortBarStyle}>
          <span style={styles.statsText}>共 {total} 个作品</span>
          <div style={sortOptionsStyle}>
            {FEED_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.key}
                  style={{
                    ...styles.sortButton,
                    ...(feedTab === opt.key ? styles.sortButtonActive : {}),
                  }}
                  onClick={() => handleFeedChange(opt.key)}
                >
                  <Icon size={13} weight={feedTab === opt.key ? 'bold' : 'regular'} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 双列瀑布流 */}
        <div style={waterfallStyle}>
          <div style={columnStyle}>
            {posts.filter((_, i) => i % 2 === 0).map(post => (
              <PostCard
                key={post.id}
                post={post}
                isCompactPhone={isCompactPhone}
                getDifficultyColor={getDifficultyColor}
                getDifficultyLabel={getDifficultyLabel}
                onClick={() => navigate(`/mobile/community/${post.id}`)}
                onAuthorClick={(userId) => navigate(`/mobile/community/user/${userId}`)}
              />
            ))}
          </div>
          <div style={columnStyle}>
            {posts.filter((_, i) => i % 2 === 1).map(post => (
              <PostCard
                key={post.id}
                post={post}
                isCompactPhone={isCompactPhone}
                getDifficultyColor={getDifficultyColor}
                getDifficultyLabel={getDifficultyLabel}
                onClick={() => navigate(`/mobile/community/${post.id}`)}
                onAuthorClick={(userId) => navigate(`/mobile/community/user/${userId}`)}
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
  isCompactPhone?: boolean;
  getDifficultyColor: (d: string) => string;
  getDifficultyLabel: (d: string) => string;
  onClick: () => void;
  onAuthorClick: (userId: number) => void;
}

interface CommunityCardImageProps {
  previewUrl?: string;
  thumbnailUrl?: string;
  alt: string;
  style: React.CSSProperties;
}

const communityImageAvailabilityCache = new Map<string, boolean>();

const CommunityCardImage: React.FC<CommunityCardImageProps> = ({ previewUrl, thumbnailUrl, alt, style }) => {
  const candidates = [thumbnailUrl, previewUrl].filter((u): u is string => !!u && u.trim().length > 0);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const resolveImage = async () => {
      for (const candidate of candidates) {
        const cached = communityImageAvailabilityCache.get(candidate);
        if (cached === true) {
          if (active) setResolvedSrc(candidate);
          return;
        }
        if (cached === false) {
          continue;
        }
        try {
          const response = await fetch(candidate, {
            method: 'HEAD',
            cache: 'force-cache',
          });
          communityImageAvailabilityCache.set(candidate, response.ok);
          if (response.ok) {
            if (active) setResolvedSrc(candidate);
            return;
          }
        } catch {
          communityImageAvailabilityCache.set(candidate, false);
        }
      }

      if (active) setResolvedSrc(null);
    };

    setResolvedSrc(null);
    resolveImage();

    return () => {
      active = false;
    };
  }, [previewUrl, thumbnailUrl]);

  if (!resolvedSrc) return null;

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      style={style}
      loading="lazy"
    />
  );
};

const PostCard: React.FC<PostCardProps> = ({
  post,
  isCompactPhone = false,
  getDifficultyColor,
  getDifficultyLabel,
  onClick,
  onAuthorClick,
}) => {
  const safeTitle = sanitizeDisplayTitle(post.title);
  const titleStyle: React.CSSProperties = {
    ...cardStyles.title,
    whiteSpace: isCompactPhone ? 'normal' : cardStyles.title.whiteSpace,
    display: isCompactPhone ? '-webkit-box' : undefined,
    WebkitLineClamp: isCompactPhone ? 2 : undefined,
    WebkitBoxOrient: isCompactPhone ? 'vertical' : undefined,
    minHeight: isCompactPhone ? '34px' : undefined,
  };

  const infoStyle: React.CSSProperties = {
    ...cardStyles.info,
    padding: isCompactPhone ? '8px 9px 9px' : cardStyles.info.padding,
  };

  const footerStyle: React.CSSProperties = {
    ...cardStyles.footer,
    gap: isCompactPhone ? '10px' : cardStyles.footer.gap,
    flexWrap: isCompactPhone ? 'wrap' : undefined,
  };
  return (
    <div style={cardStyles.card} onClick={onClick}>
      {/* 缩略图 */}
      <div style={cardStyles.imageWrap}>
        {post.preview_url || post.thumbnail_url ? (
          <CommunityCardImage
            previewUrl={post.preview_url}
            thumbnailUrl={post.thumbnail_url}
            alt={safeTitle}
            style={cardStyles.image}
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
      <div style={infoStyle}>
        <div style={titleStyle}>{safeTitle}</div>
        <div style={cardStyles.meta}>
          <span style={cardStyles.size}>{post.grid_width}×{post.grid_height}</span>
          <span style={cardStyles.dot}>·</span>
          <span style={cardStyles.colorCount}>{post.color_count}色</span>
        </div>
        <div style={footerStyle}>
          <div style={cardStyles.stat}>
            <Heart size={12} weight="fill" color={colors.bead.red} />
            <span>{post.like_count}</span>
          </div>
          <div style={cardStyles.stat}>
            <Eye size={12} color={colors.text.muted} />
            <span>{post.view_count}</span>
          </div>
          {post.user?.id ? (
            <button
              type="button"
              style={cardStyles.authorBtn}
              onClick={(event) => {
                event.stopPropagation();
                onAuthorClick(post.user.id);
              }}
            >
              @{post.user.nickname || '用户'}
            </button>
          ) : null}
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
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    borderRadius: radius.lg,
    border: `1px solid ${colors.border.soft}`,
    background: `${colors.bg.card}e6`,
    marginBottom: '10px',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
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
  authorBtn: {
    marginLeft: 'auto',
    border: 'none',
    background: 'transparent',
    padding: 0,
    color: colors.bead.cyan,
    fontSize: '11px',
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
  },
};

export default CommunityPage;


