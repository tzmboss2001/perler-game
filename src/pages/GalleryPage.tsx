import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { LoginModal } from '@/components/LoginModal';
import { galleryApi } from '@/services/api';
import type { GalleryItem, GalleryDetail, CommentItem, LeaderboardItem } from '@/services/api';
import './GalleryPage.css';

type TabType = 'latest' | 'popular' | 'crash';

const FAILURE_EMOJIS: Record<string, string> = {
  undercooked: '🥶',
  partial_melt: '🫠',
  collapse: '💀',
  burned: '🔥',
  sticky: '🧲',
};

const FAILURE_LABELS: Record<string, string> = {
  undercooked: '半生不熟',
  partial_melt: '局部融化',
  collapse: '整体塌陷',
  burned: '颜色烧焦',
  sticky: '粘连拉扯',
};

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export default function GalleryPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useUserStore();
  const [activeTab, setActiveTab] = useState<TabType>('latest');
  const [works, setWorks] = useState<GalleryItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  // 详情弹窗
  const [selectedWork, setSelectedWork] = useState<GalleryDetail | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // 加载广场列表
  const loadWorks = useCallback(async (p: number, sort: string, append = false) => {
    setLoading(true);
    try {
      const result = await galleryApi.list(p, 20, sort);
      const items = result.list || [];
      setWorks(prev => append ? [...prev, ...items] : items);
      setTotal(result.total);
      setHasMore(p * 20 < result.total);
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载排行榜
  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const items = await galleryApi.getLeaderboard(20);
      setLeaderboard(items || []);
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  }, []);

  // Tab 切换
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    if (activeTab === 'crash') {
      loadLeaderboard();
    } else {
      loadWorks(1, activeTab);
    }
  }, [activeTab, loadWorks, loadLeaderboard]);

  // 加载更多
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadWorks(nextPage, activeTab, true);
  };

  // 打开详情
  const openDetail = async (id: number) => {
    try {
      const detail = await galleryApi.getDetail(id);
      setSelectedWork(detail);
      // 加载评论
      const commentResult = await galleryApi.getComments(id, 1, 50);
      setComments(commentResult.list || []);
    } catch {
      // 静默
    }
  };

  // 点赞
  const handleLike = async () => {
    if (!selectedWork) return;
    if (!isLoggedIn) {
      setShowLogin(true);
      return;
    }
    try {
      const { liked } = await galleryApi.toggleLike(selectedWork.id);
      setSelectedWork(prev => prev ? {
        ...prev,
        is_liked: liked,
        like_count: liked ? prev.like_count + 1 : prev.like_count - 1,
      } : null);
      // 更新列表中的点赞数
      setWorks(prev => prev.map(w =>
        w.id === selectedWork.id
          ? { ...w, like_count: liked ? w.like_count + 1 : w.like_count - 1 }
          : w
      ));
    } catch {
      // 静默
    }
  };

  // 发评论
  const handleComment = async () => {
    if (!selectedWork || !commentText.trim()) return;
    if (!isLoggedIn) {
      setShowLogin(true);
      return;
    }
    setCommentLoading(true);
    try {
      await galleryApi.postComment(selectedWork.id, commentText.trim());
      setCommentText('');
      // 重新加载评论
      const commentResult = await galleryApi.getComments(selectedWork.id, 1, 50);
      setComments(commentResult.list || []);
      // 更新评论数
      setSelectedWork(prev => prev ? { ...prev, comment_count: prev.comment_count + 1 } : null);
      setWorks(prev => prev.map(w =>
        w.id === selectedWork.id ? { ...w, comment_count: w.comment_count + 1 } : w
      ));
    } catch {
      // 静默
    } finally {
      setCommentLoading(false);
    }
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}天前`;
    return date.toLocaleDateString();
  };

  return (
    <div className="gallery-page">
      {/* 头部 */}
      <div className="gallery-header">
        <button className="gallery-back" onClick={() => navigate('/')}>
          ← 返回
        </button>
        <h1 className="gallery-title">作品广场</h1>
        <div className="gallery-header-right" />
      </div>

      {/* Tab 切换 */}
      <div className="gallery-tabs">
        {([
          ['latest', '最新'],
          ['popular', '最热'],
          ['crash', '翻车榜'],
        ] as [TabType, string][]).map(([key, label]) => (
          <button
            key={key}
            className={`gallery-tab ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="gallery-content">
        {activeTab === 'crash' ? (
          // 翻车排行榜
          <div className="leaderboard-list">
            {leaderboard.length === 0 && !loading && (
              <p className="gallery-empty">暂无翻车作品</p>
            )}
            {leaderboard.map((item) => (
              <div
                key={item.work_id}
                className="leaderboard-item"
                onClick={() => openDetail(item.work_id)}
              >
                <div className="leaderboard-rank">
                  {item.rank <= 3 ? (
                    <span className="rank-medal">{RANK_MEDALS[item.rank - 1]}</span>
                  ) : (
                    <span className="rank-number">#{item.rank}</span>
                  )}
                </div>
                <div className="leaderboard-thumb">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="" />
                  ) : (
                    <div className="thumb-placeholder">
                      {FAILURE_EMOJIS[item.failure_type] || '💥'}
                    </div>
                  )}
                </div>
                <div className="leaderboard-info">
                  <span className="leaderboard-title">{item.title}</span>
                  <span className="leaderboard-author">{item.author_nickname}</span>
                  <div className="leaderboard-meta">
                    <span className="failure-tag">
                      {FAILURE_EMOJIS[item.failure_type]} {FAILURE_LABELS[item.failure_type] || item.failure_type}
                    </span>
                  </div>
                </div>
                <div className="leaderboard-score">
                  <div className="risk-bar">
                    <div
                      className="risk-bar-fill"
                      style={{ width: `${Math.min(item.risk_score * 100, 100)}%` }}
                    />
                  </div>
                  <span className="risk-label">{(item.risk_score * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // 作品网格
          <>
            {works.length === 0 && !loading && (
              <p className="gallery-empty">暂无作品，快来创作吧！</p>
            )}
            <div className="gallery-grid">
              {works.map((work) => (
                <div
                  key={work.id}
                  className="gallery-card"
                  onClick={() => openDetail(work.id)}
                >
                  <div className="gallery-card-thumb">
                    {work.thumbnail ? (
                      <img src={work.thumbnail} alt="" />
                    ) : (
                      <div className="thumb-placeholder">
                        {work.failure_type
                          ? FAILURE_EMOJIS[work.failure_type] || '💥'
                          : '✨'}
                      </div>
                    )}
                  </div>
                  <div className="gallery-card-info">
                    <span className="gallery-card-title">{work.title}</span>
                    <span className="gallery-card-author">{work.author_nickname}</span>
                    <div className="gallery-card-stats">
                      <span>❤️ {work.like_count}</span>
                      <span>💬 {work.comment_count}</span>
                      <span>{work.ironing_score}分</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 加载更多 */}
            {hasMore && works.length > 0 && (
              <button
                className="gallery-load-more"
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? '加载中...' : `加载更多 (${works.length}/${total})`}
              </button>
            )}
          </>
        )}

        {loading && works.length === 0 && leaderboard.length === 0 && (
          <p className="gallery-loading">加载中...</p>
        )}
      </div>

      {/* 作品详情弹窗 */}
      {selectedWork && (
        <div className="detail-overlay" onClick={() => setSelectedWork(null)}>
          <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="detail-close" onClick={() => setSelectedWork(null)}>
              &times;
            </button>

            {/* 缩略图 */}
            <div className="detail-thumb">
              {selectedWork.thumbnail ? (
                <img src={selectedWork.thumbnail} alt="" />
              ) : (
                <div className="thumb-placeholder large">
                  {selectedWork.failure_type
                    ? FAILURE_EMOJIS[selectedWork.failure_type]
                    : '✨'}
                </div>
              )}
            </div>

            {/* 标题和作者 */}
            <h2 className="detail-title">{selectedWork.title}</h2>
            <p className="detail-author">
              {selectedWork.author_nickname} · {formatTime(selectedWork.created_at)}
            </p>

            {/* 数据 */}
            <div className="detail-stats">
              <span>👁️ {selectedWork.view_count}</span>
              <span>❤️ {selectedWork.like_count}</span>
              <span>💬 {selectedWork.comment_count}</span>
              <span>评分 {selectedWork.ironing_score}</span>
            </div>

            {selectedWork.failure_type && (
              <div className="detail-failure">
                <span className="failure-tag">
                  {FAILURE_EMOJIS[selectedWork.failure_type]}{' '}
                  {FAILURE_LABELS[selectedWork.failure_type]}
                </span>
                <span className="detail-risk">
                  风险值 {(selectedWork.risk_score * 100).toFixed(0)}%
                </span>
              </div>
            )}

            {/* 点赞按钮 */}
            <button
              className={`detail-like-btn ${selectedWork.is_liked ? 'liked' : ''}`}
              onClick={handleLike}
            >
              {selectedWork.is_liked ? '❤️ 已赞' : '🤍 点赞'}
            </button>

            {/* 评论区 */}
            <div className="detail-comments">
              <h3>评论 ({selectedWork.comment_count})</h3>

              {/* 评论输入 */}
              <div className="comment-input-wrap">
                <input
                  type="text"
                  placeholder="说点什么..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="comment-input"
                  maxLength={500}
                  onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                />
                <button
                  className="comment-send"
                  onClick={handleComment}
                  disabled={commentLoading || !commentText.trim()}
                >
                  发送
                </button>
              </div>

              {/* 评论列表 */}
              <div className="comment-list">
                {comments.length === 0 && (
                  <p className="comment-empty">暂无评论</p>
                )}
                {comments.map((c) => (
                  <div key={c.id} className="comment-item">
                    <div className="comment-avatar">
                      {c.user_avatar ? (
                        <img src={c.user_avatar} alt="" />
                      ) : (
                        <span>{c.user_nickname.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="comment-body">
                      <div className="comment-header">
                        <span className="comment-nickname">{c.user_nickname}</span>
                        <span className="comment-time">{formatTime(c.created_at)}</span>
                      </div>
                      <p className="comment-content">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 登录弹窗 */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
        />
      )}
    </div>
  );
}
