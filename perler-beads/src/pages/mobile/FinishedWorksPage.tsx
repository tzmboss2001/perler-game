import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MagnifyingGlass, Spinner } from '@phosphor-icons/react';
import { finishedWorkApi, FinishedWorkItem } from '../../services/api/finishedWorkApi';
import { colors, typography, radius, shadows, animation } from '../../styles/designSystem';
import { sanitizeDisplayTitle } from '../../utils/textUtils';

const FinishedWorksPage: React.FC = () => {
  const navigate = useNavigate();
  const [list, setList] = useState<FinishedWorkItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [sort, setSort] = useState<'latest' | 'hottest'>('latest');
  const loadingRef = useRef(false);

  const loadList = useCallback(async (pageNum: number, append = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await finishedWorkApi.listPublic({
        page: pageNum,
        pageSize: 20,
        keyword,
        sort,
      });
      if (res.code === 0) {
        const rows = res.data.list || [];
        setList(prev => (append ? [...prev, ...rows] : rows));
        setHasMore(rows.length >= 20);
      }
    } catch (error) {
      console.error('[FinishedWorksPage] load list failed:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [keyword, sort]);

  useEffect(() => {
    setPage(1);
    loadList(1, false);
  }, [loadList]);

  useEffect(() => {
    const onScroll = () => {
      if (!hasMore || loadingRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      if (scrollHeight - scrollTop - clientHeight < 180) {
        const next = page + 1;
        setPage(next);
        loadList(next, true);
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [hasMore, loadList, page]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/mobile/home')}>
          <ArrowLeft size={18} />
        </button>
        <h1 style={styles.title}>成品社区</h1>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.searchBar}>
          <MagnifyingGlass size={16} color={colors.text.muted} />
          <input
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                setKeyword(keywordInput.trim());
              }
            }}
            placeholder="搜索成品名 / 描述 / 作者"
            style={styles.searchInput}
          />
          {keywordInput ? (
            <button
              type="button"
              style={styles.clearBtn}
              onClick={() => {
                setKeywordInput('');
                setKeyword('');
              }}
            >
              {"清除"}
            </button>
          ) : null}
        </div>

        <div style={styles.sortBar}>
          <button
            type="button"
            style={sort === 'latest' ? styles.sortBtnActive : styles.sortBtn}
            onClick={() => setSort('latest')}
          >
            {"最新"}
          </button>
          <button
            type="button"
            style={sort === 'hottest' ? styles.sortBtnActive : styles.sortBtn}
            onClick={() => setSort('hottest')}
          >
            {"最热"}
          </button>
        </div>
      </div>

      {list.length === 0 && !loading ? (
        <div style={styles.empty}>{keyword ? '没有找到匹配的公开成品' : '暂无公开成品'}</div>
      ) : (
        <div style={styles.grid}>
          {list.map(item => (
            <div key={item.id} style={styles.card} onClick={() => navigate(`/mobile/finished/${item.id}`)}>
              <div style={styles.thumbWrap}>
                {item.cover_url ? <img src={item.cover_url} alt={sanitizeDisplayTitle(item.title)} style={styles.thumb} loading="lazy" /> : <div style={styles.thumbEmpty}>{"无图"}</div>}
              </div>
              <div style={styles.cardBody}>
                <div style={styles.cardTitle}>{sanitizeDisplayTitle(item.title)}</div>
                <div style={styles.meta}>
                  <button
                    type="button"
                    style={styles.authorBtn}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (item.user?.id) {
                        navigate(`/mobile/community/user/${item.user.id}`);
                      }
                    }}
                  >
                    {item.user?.nickname || '用户'}
                  </button>
                  <span>?</span>
                  <span>{item.image_count} {"张"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={styles.loading}>
          <Spinner size={16} style={{ animation: 'spin 1s linear infinite' }} />
          <span>{"加载中..."}</span>
        </div>
      ) : null}

      {!hasMore && list.length > 0 ? <div style={styles.end}>{"已经到底了"}</div> : null}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
  toolbar: {
    display: 'grid',
    gap: '10px',
    marginBottom: '12px',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    border: `1px solid ${colors.border.soft}`,
    background: colors.bg.card,
    borderRadius: radius.button,
    padding: '10px 12px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
  },
  clearBtn: {
    border: 'none',
    background: 'transparent',
    padding: 0,
    color: colors.bead.cyan,
    fontSize: typography.fontSize.xs,
    cursor: 'pointer',
  },
  sortBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sortBtn: {
    border: `1px solid ${colors.border.soft}`,
    background: colors.bg.card,
    color: colors.text.secondary,
    borderRadius: radius.button,
    padding: '6px 12px',
    fontSize: typography.fontSize.xs,
    cursor: 'pointer',
  },
  sortBtnActive: {
    border: `1px solid ${colors.bead.cyan}`,
    background: `${colors.bead.cyan}22`,
    color: colors.bead.cyan,
    borderRadius: radius.button,
    padding: '6px 12px',
    fontSize: typography.fontSize.xs,
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '10px',
  },
  card: {
    background: colors.bg.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.lg,
    overflow: 'hidden',
    boxShadow: shadows.sm,
    cursor: 'pointer',
    transition: animation.transition.fast,
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
    color: colors.text.muted,
    fontSize: typography.fontSize.sm,
  },
  cardBody: {
    padding: '8px',
  },
  cardTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
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
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  authorBtn: {
    border: 'none',
    background: 'transparent',
    padding: 0,
    color: colors.bead.cyan,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
  },
  empty: {
    padding: '40px 0',
    textAlign: 'center',
    color: colors.text.muted,
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    color: colors.text.muted,
    padding: '14px 0',
  },
  end: {
    textAlign: 'center',
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    paddingTop: '12px',
  },
};

export default FinishedWorksPage;
