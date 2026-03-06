import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Heart, WarningCircle, Trash, Spinner } from '@phosphor-icons/react';
import { finishedWorkApi, FinishedWorkItem } from '../../services/api/finishedWorkApi';
import { colors, typography, radius, shadows } from '../../styles/designSystem';
import { useUserStore } from '../../store/userStore';
import { clearToken } from '../../services/api/authApi';
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

  const workId = Number(id || 0);
  const isOwner = useMemo(() => !!item?.user?.id && !!userInfo?.id && item.user.id === userInfo.id, [item?.user?.id, userInfo?.id]);
  const isAuthExpiredResponse = (code?: number | string, msg?: string) => {
    const numericCode = Number(code);
    return numericCode === 7 || numericCode === 401 || /token|登录|鉴权|未授权|未登录/i.test(msg || '');
  };

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
      } else if (isAuthExpiredResponse(res.code, res.msg)) {
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
      } else if (isAuthExpiredResponse(res.code, res.msg)) {
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
            <div style={styles.meta}>作者：{item.user?.nickname || '用户'} · {new Date(item.created_at).toLocaleString('zh-CN')}</div>
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
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <Modal {...modalProps} />
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '50px 0',
    color: colors.text.muted,
  },
  infoCard: {
    background: colors.bg.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.card,
    boxShadow: shadows.sm,
    padding: '12px',
    marginBottom: '12px',
  },
  workTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: '6px',
  },
  meta: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    marginBottom: '6px',
  },
  desc: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
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
    border: `1px solid ${colors.border.soft}`,
    background: colors.bg.tertiary,
    color: colors.text.secondary,
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
    border: `1px solid ${colors.border.soft}`,
    background: colors.bg.card,
  },
  image: {
    width: '100%',
    display: 'block',
    objectFit: 'contain',
  },
};

export default FinishedWorkDetailPage;
