import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Hammer, Heart, ImageSquare } from '@phosphor-icons/react';
import { colors, radius, shadows, typography } from '../../styles/designSystem';
import { userApi, UserPublicProfileResp } from '../../services/api/userApi';
import { communityApi, CommunityPostListItem } from '../../services/api/communityApi';
import { finishedWorkApi, FinishedWorkItem } from '../../services/api/finishedWorkApi';
import { sanitizeDisplayTitle } from '../../utils/textUtils';
import { formatRelativeTime } from '../../utils/timeUtils';

type TabKey = 'patterns' | 'finished';
type PatternSortKey = 'recommended' | 'newest' | 'popular' | 'made';
type FinishedSortKey = 'newest' | 'popular';

const PATTERN_SORT_OPTIONS: Array<{ key: PatternSortKey; label: string }> = [
  { key: 'recommended', label: '推荐' },
  { key: 'newest', label: '最新' },
  { key: 'popular', label: '最热' },
  { key: 'made', label: '最多制作' },
];

const FINISHED_SORT_OPTIONS: Array<{ key: FinishedSortKey; label: string }> = [
  { key: 'newest', label: '最新' },
  { key: 'popular', label: '最热' },
];

const defaultBio = '这个作者还没有填写简介。';

const CommunityUserPage: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const numericUserId = Number(userId || 0);

  const [profile, setProfile] = useState<UserPublicProfileResp | null>(null);
  const [patternList, setPatternList] = useState<CommunityPostListItem[]>([]);
  const [finishedList, setFinishedList] = useState<FinishedWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('patterns');
  const [patternSort, setPatternSort] = useState<PatternSortKey>('recommended');
  const [finishedSort, setFinishedSort] = useState<FinishedSortKey>('newest');
  const [keyword, setKeyword] = useState('');
  const [patternCategory, setPatternCategory] = useState('all');
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 390
  );

  const loadData = useCallback(async () => {
    if (!numericUserId) {
      setErrorText('作者信息无效');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [profileRes, patternRes, finishedRes] = await Promise.all([
        userApi.getPublicProfile(numericUserId),
        communityApi.getPostsByUser(numericUserId, { page: 1, pageSize: 24, sort: 'recommended' }),
        finishedWorkApi.listPublicByUser(numericUserId, 1, 24),
      ]);

      if (profileRes.code !== 0 || !profileRes.data) {
        throw new Error(profileRes.msg || '加载作者信息失败');
      }

      setProfile(profileRes.data);
      setPatternList(patternRes.code === 0 ? (patternRes.data.list || []) : []);
      setFinishedList(finishedRes.code === 0 ? (finishedRes.data.list || []) : []);
      setErrorText('');
    } catch (error) {
      console.error('[CommunityUserPage] load data failed:', error);
      setErrorText('作者主页暂时不可用，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [numericUserId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isCompact = viewportWidth <= 360;

  const gridStyle = useMemo<React.CSSProperties>(() => ({
    ...styles.grid,
    gridTemplateColumns: isCompact ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
  }), [isCompact]);

  const sortedPatternList = useMemo(() => {
    const rows = [...patternList];
    switch (patternSort) {
      case 'newest':
        return rows.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      case 'popular':
        return rows.sort((a, b) => {
          if (b.like_count !== a.like_count) return b.like_count - a.like_count;
          return +new Date(b.created_at) - +new Date(a.created_at);
        });
      case 'made':
        return rows.sort((a, b) => {
          if (b.make_count !== a.make_count) return b.make_count - a.make_count;
          return +new Date(b.created_at) - +new Date(a.created_at);
        });
      case 'recommended':
      default:
        return rows.sort((a, b) => {
          const scoreA = a.like_count * 3 + a.make_count * 5 + a.view_count;
          const scoreB = b.like_count * 3 + b.make_count * 5 + b.view_count;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return +new Date(b.created_at) - +new Date(a.created_at);
        });
    }
  }, [patternList, patternSort]);

  const sortedFinishedList = useMemo(() => {
    const rows = [...finishedList];
    switch (finishedSort) {
      case 'popular':
        return rows.sort((a, b) => {
          const likeA = a.like_count || 0;
          const likeB = b.like_count || 0;
          if (likeB !== likeA) return likeB - likeA;
          return +new Date(b.created_at) - +new Date(a.created_at);
        });
      case 'newest':
      default:
        return rows.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }
  }, [finishedList, finishedSort]);

  const patternCategories = useMemo(() => {
    const values = Array.from(
      new Set(
        patternList
          .map(item => (item.category || '').trim())
          .filter(Boolean)
      )
    );
    return ['all', ...values];
  }, [patternList]);

  const filteredPatternList = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return sortedPatternList.filter(item => {
      const matchesCategory = patternCategory === 'all' || (item.category || '').trim() === patternCategory;
      const haystacks = [
        sanitizeDisplayTitle(item.title),
        item.tags || '',
        item.category || '',
      ].join(' ').toLowerCase();
      const matchesKeyword = !normalizedKeyword || haystacks.includes(normalizedKeyword);
      return matchesCategory && matchesKeyword;
    });
  }, [keyword, patternCategory, sortedPatternList]);

  const filteredFinishedList = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return sortedFinishedList.filter(item => {
      if (!normalizedKeyword) return true;
      const haystacks = [
        sanitizeDisplayTitle(item.title),
        item.description || '',
      ].join(' ').toLowerCase();
      return haystacks.includes(normalizedKeyword);
    });
  }, [keyword, sortedFinishedList]);

  const currentListEmpty = activeTab === 'patterns' ? filteredPatternList.length === 0 : filteredFinishedList.length === 0;
  const displayBio = profile?.bio?.trim() ? profile.bio.trim() : defaultBio;

  const renderPatternCard = (item: CommunityPostListItem) => (
    <button
      key={`pattern-${item.id}`}
      type="button"
      style={styles.card}
      onClick={() => navigate(`/mobile/community/${item.id}`)}
    >
      <div style={styles.thumbWrap}>
        {item.thumbnail_url || item.preview_url ? (
          <img
            src={item.thumbnail_url || item.preview_url}
            alt={sanitizeDisplayTitle(item.title)}
            style={styles.thumb}
            loading="lazy"
          />
        ) : (
          <div style={styles.thumbEmpty}>🧩</div>
        )}
      </div>
      <div style={styles.cardBody}>
        <div style={styles.cardTitle}>{sanitizeDisplayTitle(item.title)}</div>
        <div style={styles.metaText}>{item.grid_width}×{item.grid_height} · {item.color_count}色</div>
        <div style={styles.statRow}>
          <span style={styles.statChip}><Heart size={12} weight="fill" />{item.like_count}</span>
          <span style={styles.statChip}><Eye size={12} />{item.view_count}</span>
          <span style={styles.statChip}><Hammer size={12} />{item.make_count}</span>
        </div>
        <div style={styles.timeText}>{formatRelativeTime(item.created_at)}</div>
      </div>
    </button>
  );

  const renderFinishedCard = (item: FinishedWorkItem) => (
    <button
      key={`finished-${item.id}`}
      type="button"
      style={styles.card}
      onClick={() => navigate(`/mobile/finished/${item.id}`)}
    >
      <div style={styles.thumbWrap}>
        {item.cover_url ? (
          <img
            src={item.cover_url}
            alt={sanitizeDisplayTitle(item.title)}
            style={styles.thumb}
            loading="lazy"
          />
        ) : (
          <div style={styles.thumbEmpty}>📷</div>
        )}
      </div>
      <div style={styles.cardBody}>
        <div style={styles.cardTitle}>{sanitizeDisplayTitle(item.title)}</div>
        <div style={styles.metaText}>{item.image_count} 张成品图</div>
        <div style={styles.statRow}>
          <span style={styles.statChip}><Heart size={12} weight="fill" />{item.like_count || 0}</span>
          <span style={styles.statChip}><ImageSquare size={12} />{item.image_count}</span>
        </div>
        <div style={styles.timeText}>{formatRelativeTime(item.created_at)}</div>
      </div>
    </button>
  );

  const currentSortOptions = activeTab === 'patterns' ? PATTERN_SORT_OPTIONS : FINISHED_SORT_OPTIONS;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
        </button>
        <h1 style={styles.title}>作者主页</h1>
      </div>

      {loading ? (
        <div style={styles.center}>加载中...</div>
      ) : errorText ? (
        <div style={styles.center}>{errorText}</div>
      ) : profile ? (
        <>
          <div style={styles.profileCard}>
            <div style={styles.profileTop}>
              <div style={styles.avatar}>
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.nickname} style={styles.avatarImg} />
                ) : (
                  <span style={styles.avatarFallback}>{profile.nickname?.[0] || '用'}</span>
                )}
              </div>
              <div style={styles.profileMeta}>
                <div style={styles.nickname}>{profile.nickname || '用户'}</div>
                <div style={styles.joinedText}>加入于 {new Date(profile.joined_at).toLocaleDateString('zh-CN')}</div>
              </div>
            </div>

            <div style={styles.bioCard}>
              <div style={styles.bioLabel}>个人简介</div>
              <div style={styles.bioText}>{displayBio}</div>
            </div>

            <div style={styles.statsGrid}>
              <div style={styles.statBox}>
                <strong>{profile.community_post_count}</strong>
                <span>图纸作品</span>
              </div>
              <div style={styles.statBox}>
                <strong>{profile.finished_work_count}</strong>
                <span>成品作品</span>
              </div>
              <div style={styles.statBox}>
                <strong>{profile.total_like_count}</strong>
                <span>累计获赞</span>
              </div>
              <div style={styles.statBox}>
                <strong>{profile.total_make_count}</strong>
                <span>被制作次数</span>
              </div>
            </div>
          </div>

          <div style={styles.tabBar}>
            <button
              type="button"
              style={{ ...styles.tabBtn, ...(activeTab === 'patterns' ? styles.tabBtnActive : {}) }}
              onClick={() => setActiveTab('patterns')}
            >
              图纸作品
            </button>
            <button
              type="button"
              style={{ ...styles.tabBtn, ...(activeTab === 'finished' ? styles.tabBtnActive : {}) }}
              onClick={() => setActiveTab('finished')}
            >
              成品作品
            </button>
          </div>

          <div style={styles.sortBar}>
            <span style={styles.sectionHint}>
              {activeTab === 'patterns' ? `共 ${filteredPatternList.length} 个图纸` : `共 ${filteredFinishedList.length} 个成品`}
            </span>
            <div style={styles.sortOptions}>
              {currentSortOptions.map(option => {
                const active = activeTab === 'patterns'
                  ? patternSort === option.key
                  : finishedSort === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    style={{ ...styles.sortBtn, ...(active ? styles.sortBtnActive : {}) }}
                    onClick={() => {
                      if (activeTab === 'patterns') {
                        setPatternSort(option.key as PatternSortKey);
                      } else {
                        setFinishedSort(option.key as FinishedSortKey);
                      }
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={styles.filterPanel}>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={activeTab === 'patterns' ? '搜索作品名 / 标签 / 分类' : '搜索成品标题 / 描述'}
              style={styles.searchInput}
            />
            {activeTab === 'patterns' ? (
              <div style={styles.categoryRow}>
                {patternCategories.map(category => {
                  const active = patternCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      style={{ ...styles.categoryBtn, ...(active ? styles.categoryBtnActive : {}) }}
                      onClick={() => setPatternCategory(category)}
                    >
                      {category === 'all' ? '全部分类' : category}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          {currentListEmpty ? (
            <div style={styles.emptyCard}>
              {activeTab === 'patterns'
                ? '没有找到符合条件的图纸作品'
                : '没有找到符合条件的成品作品'}
            </div>
          ) : (
            <div style={gridStyle}>
              {activeTab === 'patterns'
                ? filteredPatternList.map(renderPatternCard)
                : filteredFinishedList.map(renderFinishedCard)}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100%',
    background: colors.bg.primary,
    padding: '14px 12px 80px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  backBtn: {
    border: `1px solid ${colors.border.soft}`,
    background: colors.bg.card,
    color: colors.text.primary,
    width: '32px',
    height: '32px',
    borderRadius: radius.bead,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  title: {
    margin: 0,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  center: {
    textAlign: 'center',
    color: colors.text.muted,
    padding: '40px 0',
  },
  profileCard: {
    background: colors.bg.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.card,
    padding: '14px',
    boxShadow: shadows.sm,
    marginBottom: '12px',
  },
  profileTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  avatar: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    overflow: 'hidden',
    background: colors.bg.tertiary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarFallback: {
    color: colors.text.primary,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  profileMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0,
  },
  nickname: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  joinedText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  bioCard: {
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.md,
    padding: '10px 12px',
    marginBottom: '12px',
  },
  bioLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    marginBottom: '4px',
  },
  bioText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 1.6,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '8px',
  },
  statBox: {
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.md,
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    color: colors.text.secondary,
    fontSize: typography.fontSize.xs,
  },
  tabBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '8px',
    marginBottom: '10px',
  },
  tabBtn: {
    border: `1px solid ${colors.border.soft}`,
    background: colors.bg.card,
    color: colors.text.secondary,
    borderRadius: radius.button,
    padding: '10px 12px',
    cursor: 'pointer',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  tabBtnActive: {
    color: colors.bead.cyan,
    borderColor: `${colors.bead.cyan}66`,
    boxShadow: `0 0 0 1px ${colors.bead.cyan}22 inset`,
  },
  sortBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    marginBottom: '12px',
    flexWrap: 'wrap',
  },
  sectionHint: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  sortOptions: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  sortBtn: {
    border: `1px solid ${colors.border.soft}`,
    background: colors.bg.card,
    color: colors.text.secondary,
    borderRadius: radius.sm,
    padding: '5px 10px',
    cursor: 'pointer',
    fontSize: typography.fontSize.xs,
  },
  sortBtnActive: {
    color: colors.bead.purple,
    borderColor: `${colors.bead.purple}66`,
    background: `${colors.bead.purple}14`,
  },
  filterPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '12px',
  },
  searchInput: {
    width: '100%',
    border: `1px solid ${colors.border.soft}`,
    background: colors.bg.card,
    color: colors.text.primary,
    borderRadius: radius.button,
    padding: '10px 12px',
    outline: 'none',
    fontSize: typography.fontSize.sm,
    boxSizing: 'border-box',
  },
  categoryRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  categoryBtn: {
    border: `1px solid ${colors.border.soft}`,
    background: colors.bg.card,
    color: colors.text.secondary,
    borderRadius: radius.sm,
    padding: '5px 10px',
    cursor: 'pointer',
    fontSize: typography.fontSize.xs,
  },
  categoryBtnActive: {
    color: colors.bead.cyan,
    borderColor: `${colors.bead.cyan}66`,
    background: `${colors.bead.cyan}14`,
  },
  emptyCard: {
    background: colors.bg.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.card,
    padding: '24px 16px',
    color: colors.text.muted,
    textAlign: 'center',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '10px',
  },
  card: {
    border: `1px solid ${colors.border.soft}`,
    background: colors.bg.card,
    borderRadius: radius.card,
    boxShadow: shadows.sm,
    overflow: 'hidden',
    padding: 0,
    cursor: 'pointer',
    textAlign: 'left',
  },
  thumbWrap: {
    width: '100%',
    aspectRatio: '1',
    background: colors.bg.elevated,
  },
  thumb: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  thumbEmpty: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '36px',
  },
  cardBody: {
    padding: '8px',
  },
  cardTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: '4px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    minHeight: '36px',
  },
  metaText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    marginBottom: '6px',
  },
  statRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '6px',
  },
  statChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  timeText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
};

export default CommunityUserPage;
