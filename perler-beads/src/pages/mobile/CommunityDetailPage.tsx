import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Eye, Hammer, Palette, GridFour, Star, Flag } from '@phosphor-icons/react';
import { colors, radius, typography, shadows, animation } from '../../styles/designSystem';
import { communityApi, CommunityPostDetail, CommunityPostListItem } from '../../services/api/communityApi';
import { allBeadColors, BeadColor } from '../../data/beadColors';
import { BeadPixelData } from '../../services/colorMatchService';
import { clearToken, getToken } from '../../services/api/authApi';
import Modal, { useModal } from '../../components/Modal';
import { sanitizeDisplayTitle } from '../../utils/textUtils';
import { formatAbsoluteTime } from '../../utils/timeUtils';

const COMMUNITY_MAKING_DRAFT_KEY = 'community_making_bead_data';
const isAuthExpiredResponse = (code?: number | string, msg?: string) => {
  const numericCode = Number(code);
  return numericCode === 7 || numericCode === 401 || /token|登录|鉴权|未授权|未登录/i.test(msg || '');
};

const CommunityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { modalProps, showConfirm, showPrompt, showAlert, showError } = useModal();
  const [post, setPost] = useState<CommunityPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liking, setLiking] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [fallbackPreviewUrl, setFallbackPreviewUrl] = useState<string>('');
  const [authorMorePosts, setAuthorMorePosts] = useState<CommunityPostListItem[]>([]);
  const [authorMoreLoading, setAuthorMoreLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    const loadDetail = async () => {
      setLoading(true);
      try {
        const res = await communityApi.getPostById(Number(id));
        if (res.code === 0 && res.data) {
          setPost(res.data);
          setLiked(!!res.data.liked);
          setLikeCount(res.data.like_count);
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

  useEffect(() => {
    setImageLoadError(false);

    if (!post?.bead_data) {
      setFallbackPreviewUrl('');
      return;
    }

    const preview = generatePreviewFromCommunityData(post.bead_data);
    setFallbackPreviewUrl(preview);
  }, [post]);

  useEffect(() => {
    const authorId = Number(post?.user?.id || 0);
    if (!authorId || !post?.id) {
      setAuthorMorePosts([]);
      return;
    }

    let active = true;
    setAuthorMoreLoading(true);

    communityApi.getPostsByUser(authorId, { page: 1, pageSize: 6, sort: 'recommended' })
      .then((res) => {
        if (!active || res.code !== 0) return;
        const rows = (res.data.list || []).filter((item) => item.id !== post.id).slice(0, 4);
        setAuthorMorePosts(rows);
      })
      .catch((err) => {
        console.warn('[CommunityDetailPage] load author more posts failed:', err);
        if (active) setAuthorMorePosts([]);
      })
      .finally(() => {
        if (active) setAuthorMoreLoading(false);
      });

    return () => {
      active = false;
    };
  }, [post]);

    // 将社区 bead_data 转换为 MakingPage 需要的 BeadPixelData
  const convertToBeadPixelData = (beadDataRaw: any): BeadPixelData | null => {
    if (!beadDataRaw || !beadDataRaw.width || !beadDataRaw.height || !beadDataRaw.beads) {
      return null;
    }
    const { width, height, beads: rawBeads } = beadDataRaw;

    // 构建 colorId -> BeadColor 的查找表
    const colorMap = new Map<string, BeadColor>();
    for (const c of allBeadColors) {
      colorMap.set(c.id, c);
    }

    // 初始化扁平数组
    const flatBeads: (BeadColor | null)[] = new Array(width * height).fill(null);

    // 兼容两种社区 bead_data 结构：
    // 1) 坐标结构: [{ x, y, colorId, hex }]
    // 2) 扁平结构: [{ id, hex, ... }] 长度 = width * height
    const first = rawBeads[0];
    const isFlatArray =
      rawBeads.length === width * height &&
      first &&
      typeof first === 'object' &&
      !('x' in first) &&
      !('y' in first);

    if (isFlatArray) {
      for (let i = 0; i < rawBeads.length; i++) {
        const b = rawBeads[i];
        const colorId = String((b as { id?: string; colorId?: string })?.id || (b as { colorId?: string })?.colorId || '');
        const mapped = colorMap.get(colorId);
        const fallbackHex = normalizeHexColor((b as { hex?: string })?.hex) || colorFromID(colorId || `c${i}`);
        const color: BeadColor = mapped || {
          id: colorId || `c${i}`,
          name: colorId || `c${i}`,
          nameCN: colorId || `c${i}`,
          rgb: hexToRgb(fallbackHex),
          hex: fallbackHex,
          brand: 'mard',
        };
        flatBeads[i] = color;
      }
    } else {
      for (const b of rawBeads) {
        if (b.x >= 0 && b.x < width && b.y >= 0 && b.y < height && b.colorId) {
          const mapped = colorMap.get(b.colorId);
          const fallbackHex = normalizeHexColor(b?.hex) || colorFromID(String(b.colorId));
          const color: BeadColor = mapped || {
            id: String(b.colorId),
            name: String(b.colorId),
            nameCN: String(b.colorId),
            rgb: hexToRgb(fallbackHex),
            hex: fallbackHex,
            brand: 'mard',
          };
          flatBeads[b.y * width + b.x] = color;
        }
      }
    }

    return { width, height, beads: flatBeads };
  };

  // bead_data -> base64 预览图（用于缩略图加载失败时兜底）
  const generatePreviewFromCommunityData = (beadDataRaw: any): string => {
    if (!beadDataRaw?.width || !beadDataRaw?.height || !Array.isArray(beadDataRaw?.beads)) {
      return '';
    }

    const width = Number(beadDataRaw.width);
    const height = Number(beadDataRaw.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return '';
    }

    const colorMap = new Map<string, BeadColor>();
    for (const c of allBeadColors) {
      colorMap.set(c.id, c);
    }

    const maxSize = 640;
    const cellSize = Math.max(1, Math.min(Math.floor(maxSize / Math.max(width, height)), 12));

    const canvas = document.createElement('canvas');
    canvas.width = width * cellSize;
    canvas.height = height * cellSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const b of beadDataRaw.beads) {
      if (typeof b?.x !== 'number' || typeof b?.y !== 'number' || !b?.colorId) continue;
      if (b.x < 0 || b.x >= width || b.y < 0 || b.y >= height) continue;

      const color = colorMap.get(b.colorId);
      const beadHex = normalizeHexColor(b?.hex);
      const fillHex = beadHex || color?.hex || colorFromID(String(b.colorId));

      ctx.fillStyle = fillHex;
      ctx.fillRect(b.x * cellSize, b.y * cellSize, cellSize, cellSize);
    }

    return canvas.toDataURL('image/png');
  };

  // 一键开始制作
  const handleStartMaking = () => {
    if (!post) return;
    // 登录检查：制作功能需要登录
    const token = getToken();
    if (!token) {
      showConfirm('登录后才能使用制作功能', {
        title: '请先登录',
        type: 'info',
        confirmText: '去登录',
        onConfirm: () => navigate('/mobile/login', { state: { from: `/mobile/community/${id}` } }),
      });
      return;
    }
    const beadPixelData = convertToBeadPixelData(post.bead_data);
    if (!beadPixelData) {
      return;
    }
    try {
      localStorage.setItem(
        COMMUNITY_MAKING_DRAFT_KEY,
        JSON.stringify({
          version: 2,
          source: 'community',
          postId: post.id,
          savedAt: Date.now(),
          beadData: beadPixelData,
        }),
      );
    } catch (e) {
      console.warn('[CommunityDetailPage] 保存制作数据到本地失败:', e);
    }
    navigate('/mobile/making', {
      state: {
        beadData: beadPixelData,
        backTarget: `/mobile/community/${id}`,
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

  // 点赞处理
  const handleLike = async () => {
    if (liking) return;
    if (!id || Number.isNaN(Number(id))) {
      showError('作品ID无效，请返回重试');
      return;
    }
    const token = getToken();
    if (!token) {
      navigate('/mobile/login', { state: { from: `/mobile/community/${id}` } });
      return;
    }
    setLiking(true);
    try {
      const res = await communityApi.likePost(Number(id));
      if (res.code === 0) {
        const nextLiked = typeof res?.data?.liked === 'boolean' ? res.data.liked : liked;
        const nextLikeCount = typeof res?.data?.like_count === 'number' ? res.data.like_count : likeCount;
        setLiked(nextLiked);
        setLikeCount(nextLikeCount);
      } else if (isAuthExpiredResponse(res.code, res.msg)) {
        clearToken();
        showAlert('登录状态已失效，请重新登录', {
          type: 'warning',
          title: '请先登录',
          onConfirm: () => navigate('/mobile/login', { state: { from: `/mobile/community/${id}` } }),
        });
      } else {
        showError(res.msg || '点赞失败，请稍后重试');
      }
    } catch (err) {
      console.error('点赞失败:', err);
      showError('点赞失败，请稍后重试');
    } finally {
      setLiking(false);
    }
  };

  const handleReport = async () => {
    if (!post || reporting) return;
    const token = getToken();
    if (!token) {
      navigate('/mobile/login', { state: { from: `/mobile/community/${id}` } });
      return;
    }
    showPrompt('请输入举报原因（必填）', {
      title: '提交举报',
      placeholder: '例如：不当内容/侵权/广告',
      confirmText: '下一步',
      onConfirm: (reasonValue) => {
        const reason = reasonValue.trim();
        if (!reason) {
          showAlert('举报原因不能为空', { type: 'warning', title: '提示' });
          return;
        }
        showPrompt('补充说明（可选）', {
          title: '提交举报',
          placeholder: '可补充具体位置和问题描述',
          confirmText: '下一步',
          onConfirm: (detailValue) => {
            const detail = detailValue.trim();
            showPrompt('证据链接（可选，多个用逗号分隔）', {
              title: '提交举报',
              placeholder: 'https://example.com/1.png, https://example.com/2.png',
              confirmText: '提交',
              onConfirm: (evidenceValue) => {
                const evidenceUrls = evidenceValue
                  .split(',')
                  .map(v => v.trim())
                  .filter(Boolean);
                (async () => {
                  setReporting(true);
                  try {
                    const res = await communityApi.reportPost(post.id, {
                      reason,
                      detail,
                      evidence_urls: evidenceUrls.length > 0 ? evidenceUrls : undefined,
                    });
                    if (res.code === 0) {
                      showAlert('举报已提交，我们会尽快处理。', { type: 'success', title: '提交成功' });
                    } else if (isAuthExpiredResponse(res.code, res.msg)) {
                      clearToken();
                      showAlert('登录状态已失效，请重新登录', {
                        type: 'warning',
                        title: '请先登录',
                        onConfirm: () => navigate('/mobile/login', { state: { from: `/mobile/community/${id}` } }),
                      });
                    } else {
                      showError(res.msg || '举报失败，请稍后重试');
                    }
                  } catch {
                    showError('举报失败，请稍后重试');
                  } finally {
                    setReporting(false);
                  }
                })();
              },
            });
          },
        });
      },
    });
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
          <span style={{ fontSize: '48px' }}>😅</span>
          <span style={styles.errorText}>{error || '作品不存在'}</span>
          <button style={styles.retryBtn} onClick={() => navigate(-1)}>返回</button>
        </div>
      </div>
    );
  }

  const diffInfo = getDifficultyInfo(post.difficulty);
  const displayImageUrl = !imageLoadError ? (post.preview_url || post.thumbnail_url || '') : '';
  const safeTitle = sanitizeDisplayTitle(post.title);
  const authorUserId = Number(post.user?.id || 0);

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
          {displayImageUrl ? (
            <img
              src={displayImageUrl}
              alt={safeTitle}
              style={styles.mainImage}
              onError={() => setImageLoadError(true)}
            />
          ) : fallbackPreviewUrl ? (
            <img
              src={fallbackPreviewUrl}
              alt={safeTitle}
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
          <h1 style={styles.title}>{safeTitle}</h1>
        </div>

        {/* 作者信息 */}
        <button
          type="button"
          style={styles.authorSection}
          onClick={() => authorUserId && navigate(`/mobile/community/user/${authorUserId}`)}
        >
          <div style={styles.avatar}>
            {post.user.avatar ? (
              <img src={post.user.avatar} alt={post.user.nickname} style={styles.avatarImg} />
            ) : (
              <span style={styles.avatarFallback}>{post.user.nickname?.[0] || '?'}</span>
            )}
          </div>
          <div style={styles.authorMeta}>
            <span style={styles.authorName}>{post.user.nickname || '匿名用户'}</span>
            <span style={styles.publishTime}>发布于 {formatAbsoluteTime(post.created_at)} · 查看主页</span>
          </div>
        </button>

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
              <span>🧮</span>
              <span>{post.bead_count}颗豆</span>
            </div>
          )}
          {(post.palette_name || post.palette_brand) && (
            <div style={styles.tag}>
              <span>色系</span>
              <span>{post.palette_name || String(post.palette_brand).toUpperCase()}</span>
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

        {(authorMoreLoading || authorMorePosts.length > 0) && (
          <div style={styles.moreSection}>
            <div style={styles.moreSectionHead}>
              <span style={styles.moreSectionTitle}>作者的其他作品</span>
              {authorUserId ? (
                <button
                  type="button"
                  style={styles.moreLinkBtn}
                  onClick={() => navigate(`/mobile/community/user/${authorUserId}`)}
                >
                  查看全部
                </button>
              ) : null}
            </div>

            {authorMoreLoading ? (
              <div style={styles.moreLoading}>加载中...</div>
            ) : (
              <div style={styles.moreGrid}>
                {authorMorePosts.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    style={styles.moreCard}
                    onClick={() => navigate(`/mobile/community/${item.id}`)}
                  >
                    <div style={styles.moreThumbWrap}>
                      {item.thumbnail_url || item.preview_url ? (
                        <img
                          src={item.thumbnail_url || item.preview_url}
                          alt={sanitizeDisplayTitle(item.title)}
                          style={styles.moreThumb}
                          loading="lazy"
                        />
                      ) : (
                        <div style={styles.moreThumbEmpty}>🧩</div>
                      )}
                    </div>
                    <div style={styles.moreCardBody}>
                      <div style={styles.moreCardTitle}>{sanitizeDisplayTitle(item.title)}</div>
                      <div style={styles.moreCardMeta}>{item.grid_width}×{item.grid_height} · {item.color_count}色</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div style={styles.bottomBar}>
        <button
          style={{
            ...styles.likeBtn,
            background: liked ? `${colors.bead.red}20` : colors.bg.card,
            borderColor: liked ? colors.bead.red : colors.border.soft,
          }}
          onClick={handleLike}
          disabled={liking}
        >
          <Heart
            size={20}
            weight={liked ? 'fill' : 'regular'}
            color={liked ? colors.bead.red : colors.text.secondary}
          />
          <span style={{
            ...styles.likeBtnText,
            color: liked ? colors.bead.red : colors.text.secondary,
          }}>
            {likeCount > 0 ? likeCount : '点赞'}
          </span>
        </button>
        <button style={styles.reportBtn} onClick={handleReport} disabled={reporting}>
          <Flag size={18} color={colors.text.secondary} />
          <span style={styles.reportBtnText}>{reporting ? '提交中' : '举报'}</span>
        </button>
        <button style={styles.ctaBtn} onClick={handleStartMaking}>
          <span style={styles.ctaIcon}>开始</span>
          <span style={styles.ctaText}>一键开始制作</span>
        </button>
      </div>

      {/* 统一弹框 */}
      <Modal {...modalProps} />

      <style>{spinKeyframes}</style>
    </div>
  );
};

const normalizeHexColor = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const hex = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) return hex.toUpperCase();
  return null;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const n = hex.replace('#', '');
  return [
    parseInt(n.slice(0, 2), 16),
    parseInt(n.slice(2, 4), 16),
    parseInt(n.slice(4, 6), 16),
  ];
};

const colorFromID = (id: string): string => {
  if (!id) return '#E6E6E6';
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const r = 60 + (hash & 0x7f);
  const g = 60 + ((hash >>> 8) & 0x7f);
  const b = 60 + ((hash >>> 16) & 0x7f);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
};

const spinKeyframes = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const detailCandy = {
  pageBg: 'linear-gradient(180deg, #fffaf3 0%, #fdf4ff 48%, #f3fbff 100%)',
  panel: 'rgba(255,255,255,0.88)',
  panelStrong: 'rgba(255,255,255,0.94)',
  panelSoft: 'rgba(255,255,255,0.72)',
  panelTint: 'linear-gradient(145deg, rgba(255,255,255,0.94), rgba(246,250,255,0.9))',
  border: 'rgba(126, 103, 173, 0.16)',
  text: '#4e4568',
  textSoft: '#726787',
  textMuted: '#978da8',
  accent: '#64c8ff',
  accentAlt: '#ff8eb8',
  shadow: '0 18px 42px rgba(137, 112, 167, 0.12)',
  shadowSoft: '0 10px 28px rgba(137, 112, 167, 0.08)',
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: detailCandy.pageBg,
    color: detailCandy.text,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.78)',
    backdropFilter: 'blur(20px)',
    borderBottom: `1px solid ${detailCandy.border}`,
    boxShadow: detailCandy.shadowSoft,
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
    color: detailCandy.textMuted,
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
    color: detailCandy.textSoft,
  },
  retryBtn: {
    padding: '8px 24px',
    background: detailCandy.panel,
    border: `1px solid ${detailCandy.border}`,
    borderRadius: radius.md,
    color: detailCandy.text,
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
    background: detailCandy.panelTint,
    overflow: 'hidden',
  },
  mainImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    background: detailCandy.panel,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.94), rgba(244,251,255,0.92))',
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
    color: detailCandy.text,
    lineHeight: 1.3,
  },

  // 作者
  authorSection: {
    width: '100%',
    border: 'none',
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 16px 12px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: detailCandy.panelTint,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1px solid ${detailCandy.border}`,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarFallback: {
    fontSize: '12px',
    fontWeight: typography.fontWeight.bold,
    color: detailCandy.textMuted,
  },
  authorName: {
    fontSize: typography.fontSize.sm,
    color: detailCandy.textSoft,
    fontFamily: typography.fontFamilyAlt,
  },
  authorMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  publishTime: {
    fontSize: '11px',
    color: detailCandy.textMuted,
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
    background: detailCandy.panel,
    border: `1px solid ${detailCandy.border}`,
    borderRadius: radius.full,
    fontSize: '12px',
    color: detailCandy.textSoft,
    fontFamily: typography.fontFamilyAlt,
  },

  // 鎻忚堪
  descSection: {
    padding: '0 16px 16px',
  },
  desc: {
    margin: 0,
    fontSize: typography.fontSize.sm,
    color: detailCandy.textSoft,
    lineHeight: 1.6,
  },
  moreSection: {
    margin: '18px 16px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  moreSectionHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
  },
  moreSectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: detailCandy.text,
  },
  moreLinkBtn: {
    border: 'none',
    background: 'transparent',
    padding: 0,
    color: detailCandy.accent,
    cursor: 'pointer',
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
  },
  moreLoading: {
    fontSize: typography.fontSize.sm,
    color: detailCandy.textMuted,
  },
  moreGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '10px',
  },
  moreCard: {
    border: `1px solid ${detailCandy.border}`,
    background: detailCandy.panel,
    borderRadius: radius.card,
    overflow: 'hidden',
    padding: 0,
    textAlign: 'left',
    cursor: 'pointer',
  },
  moreThumbWrap: {
    width: '100%',
    aspectRatio: '1',
    background: detailCandy.panelTint,
  },
  moreThumb: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  moreThumbEmpty: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
  },
  moreCardBody: {
    padding: '8px',
  },
  moreCardTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: detailCandy.text,
    marginBottom: '4px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    minHeight: '34px',
  },
  moreCardMeta: {
    fontSize: typography.fontSize.xs,
    color: detailCandy.textMuted,
  },

  // 互动数据
  statsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0',
    padding: '16px',
    margin: '0 16px',
    background: detailCandy.panel,
    borderRadius: radius.lg,
    border: `1px solid ${detailCandy.border}`,
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
    color: detailCandy.text,
  },
  statLabel: {
    fontSize: '11px',
    color: detailCandy.textMuted,
    fontFamily: typography.fontFamilyAlt,
  },
  statDivider: {
    width: '1px',
    height: '32px',
    background: detailCandy.border,
  },

  // 搴曢儴鎸夐挳
  bottomBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '12px 16px',
    paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 12px)',
    background: 'rgba(255,255,255,0.78)',
    backdropFilter: 'blur(20px)',
    borderTop: `1px solid ${colors.border.soft}`,
    zIndex: 10,
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  likeBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    padding: '10px 16px',
    border: `1px solid ${detailCandy.border}`,
    borderRadius: radius.lg,
    cursor: 'pointer',
    transition: animation.transition.fast,
    flexShrink: 0,
  },
  likeBtnText: {
    fontSize: '11px',
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
  },
  reportBtn: {
    width: '72px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    padding: '10px 8px',
    border: `1px solid ${detailCandy.border}`,
    borderRadius: radius.lg,
    background: detailCandy.panel,
    cursor: 'pointer',
    flexShrink: 0,
  },
  reportBtnText: {
    fontSize: '11px',
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: detailCandy.textSoft,
  },
  ctaBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px',
    background: 'linear-gradient(135deg, #78d8ff 0%, #7d9bff 55%, #ff93bf 100%)',
    border: 'none',
    borderRadius: radius.lg,
    cursor: 'pointer',
    boxShadow: '0 14px 30px rgba(120, 216, 255, 0.28)',
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


