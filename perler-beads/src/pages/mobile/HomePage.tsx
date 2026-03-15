import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Sparkle, Heart, Eye, SortAscending, Fire, Hammer, MagnifyingGlass } from '@phosphor-icons/react';
import { colors, radius, typography, shadows, animation } from '../../styles/designSystem';
import OnboardingModal from '../../components/OnboardingModal';
import { communityApi, CommunityPostListItem } from '../../services/api/communityApi';
import { finishedWorkApi, FinishedWorkItem } from '../../services/api/finishedWorkApi';
import { useUserStore } from '../../store/userStore';
import { localStorageService } from '../../services/localStorageService';
import { sanitizeDisplayTitle } from '../../utils/textUtils';
import { formatRelativeTime } from '../../utils/timeUtils';

// 排序选项
const SORT_OPTIONS = [
  { key: 'recommended', label: '推荐', icon: Sparkle },
  { key: 'newest', label: '最新', icon: SortAscending },
  { key: 'popular', label: '最热', icon: Fire },
  { key: 'most_made', label: '最多制作', icon: Hammer },
] as const;

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

/**
 * 首页 - 拼豆工坊
 * 柔和像素风格设计
 */
const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useUserStore();
  const [localProjectCount, setLocalProjectCount] = useState(0);
  const [communityDirectory, setCommunityDirectory] = useState<'pattern' | 'finished'>('pattern');

  // 社区作品数据
  const [communityPosts, setCommunityPosts] = useState<CommunityPostListItem[]>([]);
  const [communityPage, setCommunityPage] = useState(1);
  const [communityHasMore, setCommunityHasMore] = useState(true);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityTotal, setCommunityTotal] = useState(0);
  const [communityErrorText, setCommunityErrorText] = useState('');
  const [communityKeywordInput, setCommunityKeywordInput] = useState('');
  const [communityKeyword, setCommunityKeyword] = useState('');
  const [sortBy, setSortBy] = useState('recommended');
  const communityLoadingRef = useRef(false);
  const [finishedWorks, setFinishedWorks] = useState<FinishedWorkItem[]>([]);
  const [finishedLoading, setFinishedLoading] = useState(false);
  const [finishedTotal, setFinishedTotal] = useState(0);
  const [finishedErrorText, setFinishedErrorText] = useState('');
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 390
  );

  // 加载社区作品
  const loadCommunityPosts = useCallback(async (pageNum: number, append = false, sort?: string, keyword?: string) => {
    if (communityLoadingRef.current) return;
    communityLoadingRef.current = true;
    setCommunityLoading(true);
    try {
      const res = await communityApi.getPosts({
        page: pageNum,
        pageSize: 20,
        keyword: keyword?.trim() || undefined,
        sort: sort && sort !== 'newest' ? sort : undefined,
      });
      if (res.code === 0 && res.data) {
        const newList = res.data.list || [];
        setCommunityPosts(prev => append ? [...prev, ...newList] : newList);
        setCommunityHasMore(newList.length >= 20);
        setCommunityTotal(res.data.total);
        setCommunityErrorText('');
      }
    } catch (err) {
      console.error('加载社区作品失败:', err);
      setCommunityErrorText('社区服务暂时不可用，请稍后重试');
      if (!append) {
        setCommunityPosts([]);
        setCommunityTotal(0);
      }
      setCommunityHasMore(false);
    } finally {
      setCommunityLoading(false);
      communityLoadingRef.current = false;
    }
  }, []);

  const loadFinishedWorks = useCallback(async () => {
    setFinishedLoading(true);
    try {
      const res = await finishedWorkApi.listPublic(1, 20);
      if (res.code === 0 && res.data) {
        setFinishedWorks(res.data.list || []);
        setFinishedTotal(res.data.total || 0);
        setFinishedErrorText('');
      } else {
        setFinishedWorks([]);
        setFinishedTotal(0);
        setFinishedErrorText(res.msg || '成品社区暂时不可用，请稍后重试');
      }
    } catch (err) {
      console.error('加载成品社区失败:', err);
      setFinishedWorks([]);
      setFinishedTotal(0);
      setFinishedErrorText('成品社区暂时不可用，请稍后重试');
    } finally {
      setFinishedLoading(false);
    }
  }, []);

  // 切换排序
  const handleSortChange = (sort: string) => {
    if (sort === sortBy) return;
    setSortBy(sort);
    setCommunityPage(1);
    setCommunityPosts([]);
    setCommunityHasMore(true);
  };

  useEffect(() => {
    const t = window.setTimeout(() => {
      const nextKeyword = communityKeywordInput.trim();
      if (nextKeyword === communityKeyword) return;
      setCommunityKeyword(nextKeyword);
      setCommunityPage(1);
      setCommunityPosts([]);
      setCommunityHasMore(true);
    }, 300);
    return () => window.clearTimeout(t);
  }, [communityKeywordInput, communityKeyword]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 加载数据
  useEffect(() => {
    // 加载本地方案数量
    const localResult = localStorageService.getProjectList();
    setLocalProjectCount(localResult.total);

    // 加载社区作品
    loadCommunityPosts(1, false, sortBy, communityKeyword);
    loadFinishedWorks();
  }, [loadCommunityPosts, loadFinishedWorks, sortBy, communityKeyword]);

  // 滚动加载更多社区作品
  useEffect(() => {
    const handleScroll = () => {
      if (!communityHasMore || communityLoadingRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      if (scrollHeight - scrollTop - clientHeight < 200) {
        const nextPage = communityPage + 1;
        setCommunityPage(nextPage);
        loadCommunityPosts(nextPage, true, sortBy, communityKeyword);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [communityPage, communityHasMore, loadCommunityPosts, sortBy, communityKeyword]);

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

  const isNarrowHome = viewportWidth <= 390;
  const isCompactHome = viewportWidth <= 360;
  const headerMetaStyle: React.CSSProperties = {
    ...styles.headerMeta,
    flexWrap: isNarrowHome ? 'wrap' : 'nowrap',
    gap: isCompactHome ? '6px' : '8px',
  };
  const quickBarStyle: React.CSSProperties = {
    ...styles.quickBar,
    gridTemplateColumns: isCompactHome ? 'minmax(0, 1fr)' : styles.quickBar.gridTemplateColumns,
  };
  const quickBtnTextStyle: React.CSSProperties = {
    ...styles.quickBtnText,
    whiteSpace: isCompactHome ? 'normal' : 'nowrap',
    textAlign: 'center',
    lineHeight: isCompactHome ? 1.25 : undefined,
  };
  const quickBtnText2Style: React.CSSProperties = {
    ...styles.quickBtnText2,
    whiteSpace: isCompactHome ? 'normal' : 'nowrap',
    textAlign: 'center',
    lineHeight: isCompactHome ? 1.25 : undefined,
  };
  const directoryTabsStyle: React.CSSProperties = {
    ...styles.directoryTabs,
    gridTemplateColumns: isCompactHome ? 'minmax(0, 1fr)' : styles.directoryTabs.gridTemplateColumns,
  };
  const sortBarStyle: React.CSSProperties = {
    ...styles.sortBar,
    alignItems: isNarrowHome ? 'flex-start' : 'center',
  };
  const sortOptionsStyle: React.CSSProperties = {
    ...styles.sortOptions,
    width: isNarrowHome ? '100%' : undefined,
    justifyContent: isNarrowHome ? 'flex-start' : 'flex-end',
  };
  const waterfallStyle: React.CSSProperties = {
    ...styles.waterfall,
    flexDirection: 'row',
    gap: isCompactHome ? '8px' : '10px',
  };

  return (
    <div style={styles.container}>
      <div style={styles.bgGlowTop} />
      <div style={styles.bgGlowBottom} />

      {/* 新手引导弹窗 */}
      <OnboardingModal />

      {/* 顶部 Header */}
      <div style={styles.header}>
        <div style={styles.logoRow}>
          <h1 style={styles.logo}>拼豆工坊</h1>
          <span style={styles.betaBadge}>PIXEL CRAFT</span>
        </div>
        <p style={styles.subtitle}>
          <Sparkle size={10} weight="fill" style={{ color: colors.bead.yellow }} />
          {' '}把图片快速变成可制作的拼豆图纸{' '}
          <Sparkle size={10} weight="fill" style={{ color: colors.bead.yellow }} />
        </p>
        <div style={headerMetaStyle}>
          <span style={styles.metaPill}>{isLoggedIn ? '已登录' : '游客模式'}</span>
          <span style={styles.metaPill}>本地方案 {localProjectCount}</span>
        </div>
      </div>

      {/* 主内容区域 */}
      <div style={styles.content}>
        {/* 快捷操作栏 - 紧凑横向 */}
        <div style={quickBarStyle}>
          <button style={styles.quickBtn} onClick={() => navigate('/mobile/create')}>
            <Sparkle size={18} weight="fill" style={{ color: '#fff' }} />
            <span style={quickBtnTextStyle}>开始创作</span>
          </button>
          <button style={styles.quickBtn3} onClick={() => navigate('/mobile/profile')}>
            <FolderOpen size={18} weight="duotone" style={{ color: colors.bead.purple }} />
            <span style={quickBtnText2Style}>我的方案{localProjectCount > 0 ? ` (${localProjectCount})` : ''}</span>
          </button>
        </div>

        {/* 社区作品 */}
        <div style={styles.communitySection}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>🌟</span>
            <span style={styles.sectionTitle}>社区作品</span>
          </div>
          <div style={directoryTabsStyle}>
            <button
              style={{
                ...styles.directoryTab,
                ...(communityDirectory === 'pattern' ? styles.directoryTabActive : {}),
              }}
              onClick={() => setCommunityDirectory('pattern')}
            >
              图纸社区
            </button>
            <button
              style={{
                ...styles.directoryTab,
                ...(communityDirectory === 'finished' ? styles.directoryTabActive : {}),
              }}
              onClick={() => setCommunityDirectory('finished')}
            >
              成品社区
            </button>
          </div>

          {communityDirectory === 'pattern' ? (
            <>
              <div style={styles.searchBar}>
                <MagnifyingGlass size={16} color={colors.text.muted} />
                <input
                  value={communityKeywordInput}
                  onChange={e => setCommunityKeywordInput(e.target.value)}
                  placeholder="搜索作品名 / 标签 / 作者"
                  style={styles.searchInput}
                />
              </div>
              <div style={sortBarStyle}>
                <span style={styles.sortStatsText}>共 {communityTotal} 个图纸</span>
                <div style={sortOptionsStyle}>
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

              {communityErrorText ? (
                <div style={styles.communityError}>
                  <span style={styles.communityErrorText}>{communityErrorText}</span>
                </div>
              ) : null}
              {communityPosts.length > 0 ? (
                <div style={waterfallStyle}>
                  <div style={styles.waterfallCol}>
                    {communityPosts.filter((_, i) => i % 2 === 0).map(post => (
                      <div key={post.id} style={styles.postCard} onClick={() => navigate(`/mobile/community/${post.id}`)}>
                        <div style={styles.postImageWrap}>
                          {post.preview_url || post.thumbnail_url ? (
                            <CommunityCardImage
                              previewUrl={post.preview_url}
                              thumbnailUrl={post.thumbnail_url}
                              alt={sanitizeDisplayTitle(post.title)}
                              style={styles.postImage}
                            />
                          ) : (
                            <div style={styles.postPlaceholder}><span style={{ fontSize: '32px' }}>🧩</span></div>
                          )}
                          <div style={{ ...styles.postDiffBadge, background: `${getDifficultyColor(post.difficulty)}cc` }}>
                            {getDifficultyLabel(post.difficulty)}
                          </div>
                        </div>
                        <div style={styles.postInfo}>
                          <div style={styles.postTitle}>{sanitizeDisplayTitle(post.title)}</div>
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
                            {post.user?.id ? (
                              <button
                                type="button"
                                style={styles.postAuthorBtn}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  navigate(`/mobile/community/user/${post.user.id}`);
                                }}
                              >
                                @{post.user.nickname || '用户'}
                              </button>
                            ) : null}
                            <span style={styles.postTime}>{formatRelativeTime(post.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={styles.waterfallCol}>
                    {communityPosts.filter((_, i) => i % 2 === 1).map(post => (
                      <div key={post.id} style={styles.postCard} onClick={() => navigate(`/mobile/community/${post.id}`)}>
                        <div style={styles.postImageWrap}>
                          {post.preview_url || post.thumbnail_url ? (
                            <CommunityCardImage
                              previewUrl={post.preview_url}
                              thumbnailUrl={post.thumbnail_url}
                              alt={sanitizeDisplayTitle(post.title)}
                              style={styles.postImage}
                            />
                          ) : (
                            <div style={styles.postPlaceholder}><span style={{ fontSize: '32px' }}>🧩</span></div>
                          )}
                          <div style={{ ...styles.postDiffBadge, background: `${getDifficultyColor(post.difficulty)}cc` }}>
                            {getDifficultyLabel(post.difficulty)}
                          </div>
                        </div>
                        <div style={styles.postInfo}>
                          <div style={styles.postTitle}>{sanitizeDisplayTitle(post.title)}</div>
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
                            {post.user?.id ? (
                              <button
                                type="button"
                                style={styles.postAuthorBtn}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  navigate(`/mobile/community/user/${post.user.id}`);
                                }}
                              >
                                @{post.user.nickname || '用户'}
                              </button>
                            ) : null}
                            <span style={styles.postTime}>{formatRelativeTime(post.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : !communityLoading ? (
                <div style={styles.communityEmpty}>
                  <span style={{ fontSize: '36px' }}>🎨</span>
                  <span style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>暂无图纸作品</span>
                </div>
              ) : null}

              {communityLoading && (
                <div style={styles.communityLoading}>
                  <div style={styles.communitySpinner} />
                  <span style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>加载中...</span>
                </div>
              )}

              {!communityHasMore && communityPosts.length > 0 && (
                <div style={styles.communityEnd}>
                  <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>— 图纸已经到底了 —</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div style={sortBarStyle}>
                <span style={styles.sortStatsText}>共 {finishedTotal} 个成品</span>
                <button style={styles.viewAllBtn} onClick={() => navigate('/mobile/finished')}>查看全部</button>
              </div>

              {finishedErrorText ? (
                <div style={styles.communityError}>
                  <span style={styles.communityErrorText}>{finishedErrorText}</span>
                </div>
              ) : null}

              {finishedWorks.length > 0 ? (
                <div style={waterfallStyle}>
                  <div style={styles.waterfallCol}>
                    {finishedWorks.filter((_, i) => i % 2 === 0).map(item => (
                      <div key={item.id} style={styles.postCard} onClick={() => navigate(`/mobile/finished/${item.id}`)}>
                        <div style={styles.postImageWrap}>
                          {item.cover_url ? (
                            <img src={item.cover_url} alt={sanitizeDisplayTitle(item.title)} style={styles.postImage} loading="lazy" />
                          ) : (
                            <div style={styles.postPlaceholder}><span style={{ fontSize: '32px' }}>📷</span></div>
                          )}
                        </div>
                        <div style={styles.postInfo}>
                          <div style={styles.postTitle}>{sanitizeDisplayTitle(item.title)}</div>
                          <div style={styles.postMeta}>
                            <button
                              type="button"
                              style={styles.finishedAuthorBtn}
                              onClick={(event) => {
                                event.stopPropagation();
                                if (item.user?.id) {
                                  navigate(`/mobile/community/user/${item.user.id}`);
                                }
                              }}
                            >
                              {item.user?.nickname || '用户'}
                            </button>
                            <span style={{ color: colors.text.muted }}>·</span>
                            <span style={{ color: colors.bead.orange }}>{item.image_count}张</span>
                          </div>
                          <div style={styles.postFooter}>
                            <div style={styles.postStat}>
                              <Heart size={12} weight="fill" color={colors.bead.red} />
                              <span>{item.like_count || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={styles.waterfallCol}>
                    {finishedWorks.filter((_, i) => i % 2 === 1).map(item => (
                      <div key={item.id} style={styles.postCard} onClick={() => navigate(`/mobile/finished/${item.id}`)}>
                        <div style={styles.postImageWrap}>
                          {item.cover_url ? (
                            <img src={item.cover_url} alt={sanitizeDisplayTitle(item.title)} style={styles.postImage} loading="lazy" />
                          ) : (
                            <div style={styles.postPlaceholder}><span style={{ fontSize: '32px' }}>📷</span></div>
                          )}
                        </div>
                        <div style={styles.postInfo}>
                          <div style={styles.postTitle}>{sanitizeDisplayTitle(item.title)}</div>
                          <div style={styles.postMeta}>
                            <button
                              type="button"
                              style={styles.finishedAuthorBtn}
                              onClick={(event) => {
                                event.stopPropagation();
                                if (item.user?.id) {
                                  navigate(`/mobile/community/user/${item.user.id}`);
                                }
                              }}
                            >
                              {item.user?.nickname || '用户'}
                            </button>
                            <span style={{ color: colors.text.muted }}>·</span>
                            <span style={{ color: colors.bead.orange }}>{item.image_count}张</span>
                          </div>
                          <div style={styles.postFooter}>
                            <div style={styles.postStat}>
                              <Heart size={12} weight="fill" color={colors.bead.red} />
                              <span>{item.like_count || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : !finishedLoading ? (
                <div style={styles.communityEmpty}>
                  <span style={{ fontSize: '36px' }}>📷</span>
                  <span style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>暂无成品作品</span>
                </div>
              ) : null}

              {finishedLoading && (
                <div style={styles.communityLoading}>
                  <div style={styles.communitySpinner} />
                  <span style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>加载中...</span>
                </div>
              )}
            </>
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
    background: `
      radial-gradient(circle at 15% -10%, rgba(65, 202, 255, 0.22), transparent 45%),
      radial-gradient(circle at 110% 15%, rgba(255, 179, 71, 0.2), transparent 38%),
      ${colors.bg.primary}
    `,
    paddingBottom: '80px',
    width: '100%',
    overflowX: 'hidden',
    boxSizing: 'border-box',
    position: 'relative',
  },

  bgGlowTop: {
    position: 'absolute',
    top: '-60px',
    left: '-30px',
    width: '180px',
    height: '180px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(110, 231, 255, 0.26) 0%, rgba(110, 231, 255, 0) 70%)',
    pointerEvents: 'none',
  },

  bgGlowBottom: {
    position: 'absolute',
    right: '-40px',
    bottom: '140px',
    width: '170px',
    height: '170px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255, 160, 122, 0.2) 0%, rgba(255, 160, 122, 0) 70%)',
    pointerEvents: 'none',
  },

  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '14px 16px 10px',
    position: 'relative',
    zIndex: 1,
  },

  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  betaBadge: {
    fontSize: '9px',
    letterSpacing: '0.08em',
    color: colors.bead.cyan,
    border: `1px solid ${colors.bead.cyan}80`,
    borderRadius: radius.full,
    padding: '2px 8px',
    fontFamily: typography.fontFamilyAlt,
    background: `${colors.bead.cyan}14`,
  },

  logo: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.heavy,
    fontFamily: typography.fontFamilyAlt,
    background: `linear-gradient(135deg, ${colors.soft.lemon} 0%, ${colors.soft.peach} 50%, ${colors.soft.pink} 100%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: 0,
    letterSpacing: typography.letterSpacing.wide,
  },

  subtitle: {
    fontSize: '10px',
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
  },

  headerMeta: {
    display: 'flex',
    gap: '8px',
  },

  metaPill: {
    fontSize: '11px',
    color: colors.text.secondary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.full,
    padding: '3px 10px',
    background: 'rgba(255,255,255,0.02)',
    fontFamily: typography.fontFamilyAlt,
  },

  content: {
    padding: '0 12px',
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    position: 'relative',
    zIndex: 1,
  },

  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px',
  },

  sectionIcon: {
    fontSize: '14px',
  },

  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    background: colors.gradients.primary,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },

  // 快捷操作栏 - 紧凑横向
  quickBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '8px',
    marginBottom: '14px',
    width: '100%',
    minWidth: 0,
  },

  quickBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px 8px',
    background: `linear-gradient(135deg, ${colors.bead.cyan} 0%, ${colors.pixel.blue} 100%)`,
    border: 'none',
    borderRadius: radius.button,
    cursor: 'pointer',
    boxShadow: `0 8px 18px ${colors.bead.cyan}26`,
    minWidth: 0,
    boxSizing: 'border-box',
  },

  quickBtn2: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px 8px',
    background: `linear-gradient(180deg, ${colors.bg.card} 0%, rgba(255,255,255,0.02) 100%)`,
    border: `1px solid ${colors.bead.pink}40`,
    borderRadius: radius.button,
    cursor: 'pointer',
    boxShadow: '0 6px 14px rgba(0,0,0,0.12)',
    minWidth: 0,
    boxSizing: 'border-box',
  },

  quickBtn3: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px 8px',
    background: `linear-gradient(180deg, ${colors.bg.card} 0%, rgba(255,255,255,0.02) 100%)`,
    border: `1px solid ${colors.bead.purple}40`,
    borderRadius: radius.button,
    cursor: 'pointer',
    boxShadow: '0 6px 14px rgba(0,0,0,0.12)',
    minWidth: 0,
    boxSizing: 'border-box',
  },

  quickBtn4: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px 8px',
    background: `linear-gradient(180deg, ${colors.bg.card} 0%, rgba(255,255,255,0.02) 100%)`,
    border: `1px solid ${colors.bead.orange}40`,
    borderRadius: radius.button,
    cursor: 'pointer',
    boxShadow: '0 6px 14px rgba(0,0,0,0.12)',
    minWidth: 0,
    boxSizing: 'border-box',
  },

  quickBtnText: {
    fontSize: '12px',
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: '#ffffff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },

  quickBtnText2: {
    fontSize: '12px',
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },

  communitySection: {
    marginBottom: '16px',
    width: '100%',
    minWidth: 0,
    padding: '10px 10px 12px',
    borderRadius: radius.lg,
    border: `1px solid ${colors.border.soft}`,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
    boxShadow: '0 10px 24px rgba(0,0,0,0.14)',
  },

  directoryTabs: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '8px',
    marginBottom: '10px',
  },

  directoryTab: {
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.button,
    padding: '7px 10px',
    background: colors.bg.card,
    color: colors.text.secondary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },

  directoryTabActive: {
    border: `1px solid ${colors.bead.cyan}`,
    color: colors.bead.cyan,
    background: `${colors.bead.cyan}1c`,
    boxShadow: `0 6px 16px ${colors.bead.cyan}22`,
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

  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    marginBottom: '10px',
    borderRadius: radius.lg,
    border: `1px solid ${colors.border.soft}`,
    background: `${colors.bg.card}e6`,
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
    marginBottom: '10px',
    gap: '8px',
    minWidth: 0,
    flexWrap: 'wrap',
  },

  sortStatsText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    fontFamily: typography.fontFamilyAlt,
    flexShrink: 0,
  },

  sortOptions: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    minWidth: 0,
  },

  viewAllBtn: {
    border: `1px solid ${colors.bead.purple}70`,
    color: colors.bead.purple,
    background: `${colors.bead.purple}1a`,
    borderRadius: radius.full,
    padding: '4px 10px',
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
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

  waterfall: {
    display: 'flex',
    gap: '10px',
    width: '100%',
    minWidth: 0,
  },

  waterfallCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    minWidth: 0,
  },

  postCard: {
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
  postAuthorBtn: {
    border: 'none',
    background: 'transparent',
    padding: 0,
    color: colors.bead.cyan,
    fontSize: '11px',
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
  },
  finishedAuthorBtn: {
    border: 'none',
    background: 'transparent',
    padding: 0,
    color: colors.bead.cyan,
    fontSize: '11px',
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
  },
  postTime: {
    marginLeft: 'auto',
    fontSize: '10px',
    color: colors.text.muted,
    fontFamily: typography.fontFamilyAlt,
    whiteSpace: 'nowrap',
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

  communityError: {
    padding: '8px 10px',
    borderRadius: radius.sm,
    border: `1px solid ${colors.bead.red}40`,
    background: `${colors.bead.red}10`,
    marginBottom: '10px',
  },

  communityErrorText: {
    fontSize: typography.fontSize.xs,
    color: colors.bead.red,
    fontFamily: typography.fontFamilyAlt,
  },

  communityEnd: {
    textAlign: 'center',
    paddingTop: '12px',
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

