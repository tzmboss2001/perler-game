import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Heart, WarningCircle, Trash, Spinner } from '@phosphor-icons/react';
import { finishedWorkApi, FinishedWorkItem } from '../../services/api/finishedWorkApi';
import { colors, typography, radius, shadows } from '../../styles/designSystem';
import { useUserStore } from '../../store/userStore';
import { clearToken } from '../../services/api/authApi';
import { isAuthExpiredApiResponse } from '../../services/api/authExpiry';
import Modal, { useModal } from '../../components/Modal';

const FinishedWorkDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isLoggedIn, userInfo, logout } = useUserStore();
  const { modalProps, showAlert, showConfirm } = useModal();

  const [item, setItem] = useState<FinishedWorkItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [likeLoading, setLikeLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [authorMoreWorks, setAuthorMoreWorks] = useState<FinishedWorkItem[]>([]);
  const [authorMoreLoading, setAuthorMoreLoading] = useState(false);

  const workId = Number(id || 0);
  const isOwner = useMemo(() => !!item?.user?.id && !!userInfo?.id && item.user.id === userInfo.id, [item?.user?.id, userInfo?.id]);
  useEffect(() => {
    const load = async () => {
      if (!workId) {
        setLoading(false);
        return;
      }
      try {
        const res = await finishedWorkApi.getPublicDetail(workId);
        if (res.code === 0) {
          setItem(res.data);
        }
      } catch (error) {
        console.error('[FinishedWorkDetailPage] load detail failed:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [workId]);

  useEffect(() => {
    const authorId = Number(item?.user?.id || 0);
    if (!authorId || !item?.id) {
      setAuthorMoreWorks([]);
      return;
    }

    let active = true;
    setAuthorMoreLoading(true);

    finishedWorkApi.listPublicByUser(authorId, 1, 6)
      .then((res) => {
        if (!active || res.code !== 0) return;
        const rows = (res.data.list || []).filter((work) => work.id !== item.id).slice(0, 4);
        setAuthorMoreWorks(rows);
      })
      .catch((error) => {
        console.warn('[FinishedWorkDetailPage] load author more works failed:', error);
        if (active) setAuthorMoreWorks([]);
      })
      .finally(() => {
        if (active) setAuthorMoreLoading(false);
      });

    return () => {
      active = false;
    };
  }, [item]);

  const ensureLogin = () => {
    if (isLoggedIn) return true;
    navigate('/mobile/login', { state: { from: `/mobile/finished/${workId}` } });
    return false;
  };

  const handleLike = async () => {
    if (!item || likeLoading) return;
    if (!ensureLogin()) return;
    try {
      setLikeLoading(true);
      const res = await finishedWorkApi.toggleLike(item.id);
      if (res.code === 0) {
        const nextLiked = typeof res?.data?.liked === 'boolean' ? res.data.liked : !!item.liked;
        const nextLikeCount = typeof res?.data?.like_count === 'number' ? res.data.like_count : (item.like_count || 0);
        setItem(prev => (prev ? { ...prev, liked: nextLiked, like_count: nextLikeCount } : prev));
      } else if (isAuthExpiredApiResponse(res)) {
        clearToken();
        logout();
        showAlert('登录状态已失效，请重新登录', { type: 'warning', title: '请先登录' });
        navigate('/mobile/login', { state: { from: `/mobile/finished/${workId}` } });
      } else {
        showAlert(res.msg || '点赞失败，请稍后重试', { type: 'error', title: '操作失败' });
      }
    } catch (error) {
      console.error('[FinishedWorkDetailPage] like failed:', error);
      showAlert('点赞失败，请稍后重试', { type: 'error', title: '操作失败' });
    } finally {
      setLikeLoading(false);
    }
  };

  const handleReport = async () => {
    if (!item) return;
    if (!ensureLogin()) return;
    const reason = (window.prompt('请输入举报原因（必填）', '不当内容') || '').trim();
    if (!reason) return;
    const detail = (window.prompt('补充说明（可选）', '') || '').trim();
    try {
      const res = await finishedWorkApi.report(item.id, reason, detail);
      if (res.code === 0) {
        showAlert('举报已提交，感谢反馈', { type: 'success', title: '提交成功' });
      } else if (isAuthExpiredApiResponse(res)) {
        clearToken();
        logout();
        showAlert('登录状态已失效，请重新登录', { type: 'warning', title: '请先登录' });
        navigate('/mobile/login', { state: { from: `/mobile/finished/${workId}` } });
      } else {
        showAlert(res.msg || '举报失败', { type: 'error', title: '操作失败' });
      }
    } catch (error) {
      console.error('[FinishedWorkDetailPage] report failed:', error);
      showAlert('举报失败，请稍后重试', { type: 'error', title: '操作失败' });
    }
  };

  const handleDelete = async () => {
    if (!item || !isOwner || deleteLoading) return;
    showConfirm('删除后不可恢复，确认删除该成品吗？', {
      title: '删除确认',
      type: 'warning',
      confirmText: '删除',
      onConfirm: async () => {
        try {
          setDeleteLoading(true);
          const res = await finishedWorkApi.delete(item.id);
          if (res.code === 0) {
            navigate('/mobile/profile');
          } else {
            showAlert(res.msg || '删除失败', { type: 'error', title: '操作失败' });
          }
        } catch (error) {
          console.error('[FinishedWorkDetailPage] delete failed:', error);
          showAlert('删除失败，请稍后重试', { type: 'error', title: '操作失败' });
        } finally {
          setDeleteLoading(false);
        }
      },
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/mobile/finished')}>
          <ArrowLeft size={18} />
        </button>
        <h1 style={styles.title}>成品详情</h1>
      </div>

      {loading ? (
        <div style={styles.center}><Spinner size={18} style={{ animation: 'spin 1s linear infinite' }} /> 加载中...</div>
      ) : !item ? (
        <div style={styles.center}>作品不存在或不可见</div>
      ) : (
        <>
          <div style={styles.infoCard}>
            <div style={styles.workTitle}>{item.title}</div>
            <button
              type="button"
              style={styles.authorLink}
              onClick={() => item.user?.id && navigate(`/mobile/community/user/${item.user.id}`)}
            >
              作者：{item.user?.nickname || '用户'} · {new Date(item.created_at).toLocaleString('zh-CN')} · 查看主页
            </button>
            {item.description ? <div style={styles.desc}>{item.description}</div> : null}

            <div style={styles.actionRow}>
              <button style={styles.actionBtn} onClick={handleLike} disabled={likeLoading}>
                <Heart size={16} weight={item.liked ? 'fill' : 'regular'} color={item.liked ? colors.bead.red : colors.text.secondary} />
                <span>{item.like_count || 0}</span>
              </button>
              <button style={styles.actionBtn} onClick={handleReport}>
                <WarningCircle size={16} />
                <span>举报</span>
              </button>
              {isOwner ? (
                <button style={styles.actionBtn} onClick={handleDelete} disabled={deleteLoading}>
                  <Trash size={16} />
                  <span>{deleteLoading ? '删除中' : '删除'}</span>
                </button>
              ) : null}
            </div>
          </div>

          <div style={styles.imageList}>
            {(item.image_urls || []).map((url, idx) => (
              <div key={`${url}-${idx}`} style={styles.imageCard}>
                <img src={url} alt={`${item.title}-${idx + 1}`} style={styles.image} />
              </div>
            ))}
          </div>

          {item.user?.id ? (
            <div style={styles.moreSection}>
              <div style={styles.moreSectionHead}>
                <div style={styles.moreSectionTitle}>作者的其他成品</div>
                <button
                  type="button"
                  style={styles.moreLinkBtn}
                  onClick={() => navigate(`/mobile/community/user/${item.user?.id}`)}
                >
                  查看全部
                </button>
              </div>

              {authorMoreLoading ? (
                <div style={styles.moreLoading}>正在加载作者的更多成品...</div>
              ) : authorMoreWorks.length > 0 ? (
                <div style={styles.moreGrid}>
                  {authorMoreWorks.map((work) => {
                    const cover = work.cover_url || work.image_urls?.[0] || '';
                    return (
                      <button
                        key={work.id}
                        type="button"
                        style={styles.moreCard}
                        onClick={() => navigate(`/mobile/finished/${work.id}`)}
                      >
                        <div style={styles.moreThumbWrap}>
                          {cover ? (
                            <img src={cover} alt={work.title} style={styles.moreThumb} />
                          ) : (
                            <div style={styles.moreThumbEmpty}>暂无图片</div>
                          )}
                        </div>
                        <div style={styles.moreCardBody}>
                          <div style={styles.moreCardTitle}>{work.title}</div>
                          <div style={styles.moreCardMeta}>
                            {work.like_count || 0} 赞 · {new Date(work.created_at).toLocaleDateString('zh-CN')}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div style={styles.moreEmpty}>这个作者暂时还没有其他公开成品</div>
              )}
            </div>
          ) : null}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <Modal {...modalProps} />
    </div>
  );
};

const finishedCandy = {
  pageBg: 'linear-gradient(180deg, #fffaf4 0%, #fdf4ff 48%, #f3fbff 100%)',
  panel: 'rgba(255,255,255,0.9)',
  panelSoft: 'rgba(255,255,255,0.8)',
  border: 'rgba(126, 103, 173, 0.16)',
  text: '#4e4568',
  textSoft: '#726787',
  textMuted: '#978da8',
  accent: '#64c8ff',
  shadow: '0 18px 42px rgba(137, 112, 167, 0.12)',
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100%',
    background: finishedCandy.pageBg,
    padding: '14px 12px 80px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  backBtn: {
    border: `1px solid ${finishedCandy.border}`,
    background: finishedCandy.panel,
    color: finishedCandy.text,
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
    color: finishedCandy.text,
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '50px 0',
    color: finishedCandy.textMuted,
  },
  infoCard: {
    background: finishedCandy.panel,
    border: `1px solid ${finishedCandy.border}`,
    borderRadius: radius.card,
    boxShadow: finishedCandy.shadow,
    padding: '12px',
    marginBottom: '12px',
  },
  workTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: finishedCandy.text,
    marginBottom: '6px',
  },
  meta: {
    fontSize: typography.fontSize.xs,
    color: finishedCandy.textMuted,
    marginBottom: '6px',
  },
  authorLink: {
    border: 'none',
    background: 'transparent',
    padding: 0,
    fontSize: typography.fontSize.xs,
    color: finishedCandy.accent,
    marginBottom: '6px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  desc: {
    fontSize: typography.fontSize.sm,
    color: finishedCandy.textSoft,
    lineHeight: 1.5,
    marginBottom: '10px',
  },
  actionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  actionBtn: {
    border: `1px solid ${finishedCandy.border}`,
    background: finishedCandy.panelSoft,
    color: finishedCandy.textSoft,
    borderRadius: radius.button,
    padding: '6px 10px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    cursor: 'pointer',
  },
  imageList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  imageCard: {
    borderRadius: radius.card,
    overflow: 'hidden',
    border: `1px solid ${finishedCandy.border}`,
    background: finishedCandy.panel,
  },
  image: {
    width: '100%',
    display: 'block',
    objectFit: 'contain',
  },
  moreSection: {
    background: finishedCandy.panel,
    border: `1px solid ${finishedCandy.border}`,
    borderRadius: radius.card,
    boxShadow: finishedCandy.shadow,
    padding: '12px',
    marginTop: '12px',
  },
  moreSectionHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    marginBottom: '10px',
  },
  moreSectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: finishedCandy.text,
  },
  moreLinkBtn: {
    border: 'none',
    background: 'transparent',
    color: finishedCandy.accent,
    fontSize: typography.fontSize.sm,
    cursor: 'pointer',
    padding: 0,
  },
  moreLoading: {
    fontSize: typography.fontSize.sm,
    color: finishedCandy.textMuted,
  },
  moreEmpty: {
    fontSize: typography.fontSize.sm,
    color: finishedCandy.textMuted,
  },
  moreGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '10px',
  },
  moreCard: {
    border: `1px solid ${finishedCandy.border}`,
    background: 'rgba(255,255,255,0.82)',
    borderRadius: radius.card,
    padding: 0,
    overflow: 'hidden',
    cursor: 'pointer',
    textAlign: 'left',
    color: finishedCandy.text,
  },
  moreThumbWrap: {
    width: '100%',
    aspectRatio: '1 / 1',
    background: finishedCandy.panelSoft,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreThumb: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  moreThumbEmpty: {
    fontSize: typography.fontSize.xs,
    color: finishedCandy.textMuted,
  },
  moreCardBody: {
    padding: '8px',
    display: 'grid',
    gap: '4px',
  },
  moreCardTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: finishedCandy.text,
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },
  moreCardMeta: {
    fontSize: typography.fontSize.xs,
    color: finishedCandy.textMuted,
  },
};

export default FinishedWorkDetailPage;
