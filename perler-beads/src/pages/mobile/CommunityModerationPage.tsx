import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  communityApi,
  CommunityPostListItem,
  CommunityReportItem,
  CommunityReviewLogItem,
  CommunityModerationStats,
  ReviewCommunityPostData,
} from '../../services/api/communityApi';
import { finishedWorkApi, FinishedWorkReportItem } from '../../services/api/finishedWorkApi';
import { useUserStore } from '../../store/userStore';

const STATUS_OPTIONS = [
  { label: '全部', value: -1 },
  { label: '待审', value: 0 },
  { label: '通过', value: 1 },
  { label: '驳回', value: 2 },
  { label: '下架', value: 3 },
];

const REPORT_STATUS_OPTIONS = [
  { label: '待处理', value: 0 },
  { label: '已采纳', value: 1 },
  { label: '已驳回', value: 2 },
];

const FINISHED_REPORT_STATUS_OPTIONS = [
  { label: '全部', value: -1 },
  { label: '待处理', value: 0 },
  { label: '已采纳', value: 1 },
  { label: '已驳回', value: 2 },
];

const REPORT_NOTE_TEMPLATES = [
  { label: '广告导流', value: 'spam_ad' },
  { label: '辱骂仇恨', value: 'abuse_hate' },
  { label: '低俗不当', value: 'pornographic' },
  { label: '疑似侵权', value: 'copyright' },
  { label: '违规其他', value: 'illegal_other' },
  { label: '举报不成立', value: 'misreport' },
];

const ADMIN_IDS = (import.meta.env.VITE_COMMUNITY_ADMIN_IDS || '2,4')
  .split(',')
  .map((v: string) => Number(v.trim()))
  .filter((v: number) => Number.isFinite(v) && v > 0);

function statusText(status?: number): string {
  switch (status) {
    case 0:
      return '待审核';
    case 1:
      return '已通过';
    case 2:
      return '已驳回';
    case 3:
      return '已下架';
    default:
      return '未知';
  }
}

function actionText(action: string): string {
  switch (action) {
    case 'approve':
      return '通过';
    case 'reject':
      return '驳回';
    case 'hide':
      return '下架';
    case 'restore':
      return '恢复';
    default:
      return action;
  }
}

function reportStatusText(status: number): string {
  switch (status) {
    case 0:
      return '待处理';
    case 1:
      return '已采纳';
    case 2:
      return '已驳回';
    default:
      return '未知';
  }
}

const CommunityModerationPage: React.FC = () => {
  const navigate = useNavigate();
  const { userInfo, isLoggedIn, initUser } = useUserStore();

  const [status, setStatus] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<CommunityModerationStats | null>(null);
  const [list, setList] = useState<CommunityPostListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [actingId, setActingId] = useState<number | null>(null);

  const [logs, setLogs] = useState<CommunityReviewLogItem[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  const [postFilterInput, setPostFilterInput] = useState('');
  const [postFilter, setPostFilter] = useState<number | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [reportStatus, setReportStatus] = useState(0);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportList, setReportList] = useState<CommunityReportItem[]>([]);
  const [reportPage, setReportPage] = useState(1);
  const [reportTotal, setReportTotal] = useState(0);
  const [handlingReportId, setHandlingReportId] = useState<number | null>(null);
  const [reportHighOnly, setReportHighOnly] = useState(false);
  const [reportOverdueOnly, setReportOverdueOnly] = useState(false);
  const [selectedReportIds, setSelectedReportIds] = useState<number[]>([]);
  const [batchTemplate, setBatchTemplate] = useState('spam_ad');
  const [batchHandling, setBatchHandling] = useState(false);
  const [alertList, setAlertList] = useState<CommunityReportItem[]>([]);
  const [finishedReportStatus, setFinishedReportStatus] = useState(-1);
  const [finishedReportLoading, setFinishedReportLoading] = useState(false);
  const [finishedReportList, setFinishedReportList] = useState<FinishedWorkReportItem[]>([]);
  const [finishedReportPage, setFinishedReportPage] = useState(1);
  const [finishedReportTotal, setFinishedReportTotal] = useState(0);
  const [handlingFinishedReportId, setHandlingFinishedReportId] = useState<number | null>(null);

  const isAdmin = useMemo(() => {
    if (!userInfo?.id) return false;
    return ADMIN_IDS.includes(userInfo.id);
  }, [userInfo?.id]);

  const pendingQueue = useMemo(() => {
    return reportList
      .filter((item) => item.status === 0)
      .sort((a, b) => {
        const ao = a.overdue ? 1 : 0;
        const bo = b.overdue ? 1 : 0;
        if (ao !== bo) return bo - ao;
        if ((a.priority || 0) !== (b.priority || 0)) return (b.priority || 0) - (a.priority || 0);
        return (b.age_hours || 0) - (a.age_hours || 0);
      })
      .slice(0, 5);
  }, [reportList]);

  const loadData = useCallback(async (nextPage = 1, reviewStatus = status) => {
    setLoading(true);
    try {
      const res = await communityApi.getModerationPosts({
        page: nextPage,
        pageSize,
        review_status: reviewStatus,
      });
      if (res.code === 0 && res.data) {
        setList(res.data.list || []);
        setTotal(res.data.total || 0);
        setPage(nextPage);
      }
    } finally {
      setLoading(false);
    }
  }, [pageSize, status]);

  const loadStats = useCallback(async () => {
    const res = await communityApi.getModerationStats();
    if (res.code === 0 && res.data) {
      setStats(res.data);
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    const res = await communityApi.getReportAlerts(6);
    if (res.code === 0 && res.data?.list) {
      setAlertList(res.data.list || []);
    }
  }, []);

  const loadLogs = useCallback(async (nextPage = 1, nextPostFilter: number | null = postFilter) => {
    setLogLoading(true);
    try {
      const res = await communityApi.getModerationLogs({
        page: nextPage,
        pageSize,
        post_id: nextPostFilter ?? undefined,
      });
      if (res.code === 0 && res.data) {
        setLogs(res.data.list || []);
        setLogTotal(res.data.total || 0);
        setLogPage(nextPage);
      }
    } finally {
      setLogLoading(false);
    }
  }, [pageSize, postFilter]);

  const loadReports = useCallback(async (
    nextPage = 1,
    nextStatus = reportStatus,
    nextHighOnly = reportHighOnly,
    nextOverdueOnly = reportOverdueOnly,
  ) => {
    setReportLoading(true);
    try {
      const res = await communityApi.getModerationReports({
        page: nextPage,
        pageSize,
        status: nextStatus,
        high_only: nextHighOnly || undefined,
        overdue_only: nextOverdueOnly || undefined,
      });
      if (res.code === 0 && res.data) {
        setReportList(res.data.list || []);
        setReportTotal(res.data.total || 0);
        setReportPage(nextPage);
        setSelectedReportIds([]);
      }
    } finally {
      setReportLoading(false);
    }
  }, [pageSize, reportStatus, reportHighOnly, reportOverdueOnly]);

  const loadFinishedReports = useCallback(async (nextPage = 1, nextStatus = finishedReportStatus) => {
    setFinishedReportLoading(true);
    try {
      const res = await finishedWorkApi.getModerationReports({
        page: nextPage,
        pageSize,
        status: nextStatus,
      });
      if (res.code === 0 && res.data) {
        setFinishedReportList(res.data.list || []);
        setFinishedReportTotal(res.data.total || 0);
        setFinishedReportPage(nextPage);
      }
    } finally {
      setFinishedReportLoading(false);
    }
  }, [finishedReportStatus, pageSize]);

  useEffect(() => {
    initUser();
  }, [initUser]);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (!isAdmin) return;
    loadData(1, status);
    loadStats();
    loadAlerts();
  }, [isLoggedIn, isAdmin, status, loadData, loadStats]);

  useEffect(() => {
    if (!isLoggedIn || !isAdmin) return;
    const timer = window.setInterval(() => {
      loadAlerts();
    }, 60000);
    return () => window.clearInterval(timer);
  }, [isLoggedIn, isAdmin, loadAlerts]);

  useEffect(() => {
    if (!isLoggedIn || !isAdmin) return;
    loadLogs(1, postFilter);
  }, [isLoggedIn, isAdmin, postFilter, loadLogs]);

  useEffect(() => {
    if (!isLoggedIn || !isAdmin) return;
    loadReports(1, reportStatus, reportHighOnly, reportOverdueOnly);
  }, [isLoggedIn, isAdmin, reportStatus, reportHighOnly, reportOverdueOnly, loadReports]);

  useEffect(() => {
    if (!isLoggedIn || !isAdmin) return;
    loadFinishedReports(1, finishedReportStatus);
  }, [isLoggedIn, isAdmin, finishedReportStatus, loadFinishedReports]);

  const handleAction = async (post: CommunityPostListItem, action: ReviewCommunityPostData['action']) => {
    if (actingId) return;
    const reason = (action === 'reject' || action === 'hide')
      ? window.prompt('请输入审核原因（可选）', '') || ''
      : '';

    setActingId(post.id);
    try {
      const res = await communityApi.reviewPost(post.id, { action, reason });
      if (res.code !== 0) {
        alert(res.msg || '操作失败');
        return;
      }
      await loadData(page, status);
      await loadLogs(1, postFilter);
      await loadStats();
      await loadAlerts();
    } finally {
      setActingId(null);
    }
  };

  const handleBackfillPreview = async () => {
    if (backfilling) return;
    setBackfilling(true);
    try {
      const res = await communityApi.backfillMissingPreviews({ limit: 200 });
      if (res.code !== 0 || !res.data) {
        alert(res.msg || '回填失败');
        return;
      }
      alert(`已回填 ${res.data.updated_count} 个作品详情图`);
      await loadData(page, status);
      await loadLogs(1, postFilter);
      await loadStats();
      await loadAlerts();
    } finally {
      setBackfilling(false);
    }
  };

  const handleReportAction = async (report: CommunityReportItem, action: 'accept' | 'reject') => {
    if (handlingReportId) return;
    const note = window.prompt('处理备注（可选）', '') || '';
    setHandlingReportId(report.id);
    try {
      const res = await communityApi.handleReport(report.id, { action, note });
      if (res.code !== 0) {
        alert(res.msg || '处理失败');
        return;
      }
      await loadReports(reportPage, reportStatus, reportHighOnly, reportOverdueOnly);
      await loadData(page, status);
      await loadLogs(1, postFilter);
      await loadStats();
      await loadAlerts();
    } finally {
      setHandlingReportId(null);
    }
  };

  const toggleReportSelected = (id: number) => {
    setSelectedReportIds((prev) => prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]);
  };

  const toggleSelectAllPendingOnPage = () => {
    const pendingIds = reportList.filter((item) => item.status === 0).map((item) => item.id);
    if (pendingIds.length === 0) return;
    const allSelected = pendingIds.every((id) => selectedReportIds.includes(id));
    setSelectedReportIds((prev) => {
      if (allSelected) {
        return prev.filter((id) => !pendingIds.includes(id));
      }
      const set = new Set(prev);
      pendingIds.forEach((id) => set.add(id));
      return Array.from(set);
    });
  };

  const handleBatchReports = async (action: 'accept' | 'reject') => {
    if (batchHandling) return;
    if (selectedReportIds.length === 0) {
      alert('请先选择要处理的举报');
      return;
    }
    setBatchHandling(true);
    try {
      const res = await communityApi.batchHandleReports({
        report_ids: selectedReportIds,
        action,
        note: batchTemplate,
      });
      if (res.code !== 0) {
        alert(res.msg || '批量处理失败');
        return;
      }
      alert(`批量处理完成：${res.data?.handled_count || 0} 条`);
      await loadReports(reportPage, reportStatus, reportHighOnly, reportOverdueOnly);
      await loadData(page, status);
      await loadLogs(1, postFilter);
      await loadStats();
      await loadAlerts();
    } finally {
      setBatchHandling(false);
    }
  };

  const handleFinishedReportAction = async (item: FinishedWorkReportItem, action: 'accept' | 'reject') => {
    if (handlingFinishedReportId) return;
    const note = window.prompt('处理备注（可选）', '') || '';
    setHandlingFinishedReportId(item.id);
    try {
      const res = await finishedWorkApi.handleReport(item.id, action, note);
      if (res.code !== 0) {
        alert(res.msg || '处理失败');
        return;
      }
      await loadFinishedReports(finishedReportPage, finishedReportStatus);
    } finally {
      setHandlingFinishedReportId(null);
    }
  };

  if (!isLoggedIn) {
    return (
      <div style={styles.centerWrap}>
        <p style={styles.tip}>请先登录后再访问审核页</p>
        <button style={styles.primaryBtn} onClick={() => navigate('/mobile/login')}>去登录</button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={styles.centerWrap}>
        <p style={styles.tip}>你没有社区审核权限</p>
        <button style={styles.primaryBtn} onClick={() => navigate('/mobile/home')}>返回首页</button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>返回</button>
        <h1 style={styles.title}>社区审核台</h1>
        <span style={styles.totalText}>共 {total}</span>
      </div>

      {alertList.length > 0 ? (
        <div style={styles.alertPanel}>
          <div style={styles.postTitle}>SLA提醒：有 {alertList.filter((i) => i.overdue).length} 条超时待处理</div>
          {alertList.slice(0, 3).map((item) => (
            <div key={`alert-${item.id}`} style={styles.alertItem}>
              举报#{item.id} / 作品#{item.post_id} · {item.overdue ? '超时' : '未超时'} ·
              高优{item.priority || 0} · 等待{item.age_hours || 0}h
            </div>
          ))}
        </div>
      ) : null}

      <div style={styles.filterRow}>
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatus(opt.value)}
            style={{
              ...styles.filterBtn,
              ...(status === opt.value ? styles.filterBtnActive : {}),
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {stats ? (
        <div style={styles.statsGrid}>
          <div style={styles.statsCard}>
            <div style={styles.statsNum}>{stats.total_posts}</div>
            <div style={styles.statsLabel}>社区总作品</div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsNum}>{stats.pending_count}</div>
            <div style={styles.statsLabel}>待审核</div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsNum}>{stats.today_new_posts}</div>
            <div style={styles.statsLabel}>今日新增</div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsNum}>{stats.today_reviews}</div>
            <div style={styles.statsLabel}>今日审核</div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsNum}>{stats.pending_reports}</div>
            <div style={styles.statsLabel}>待处理举报</div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsNum}>{stats.high_priority_reports}</div>
            <div style={styles.statsLabel}>高优先级举报</div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsNum}>{stats.overdue_reports}</div>
            <div style={styles.statsLabel}>超时待处理举报</div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsNum}>{stats.today_reports}</div>
            <div style={styles.statsLabel}>今日举报</div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsNum}>{stats.today_backfilled}</div>
            <div style={styles.statsLabel}>今日回填</div>
          </div>
        </div>
      ) : null}

      {loading ? <div style={styles.tip}>加载中...</div> : null}
      {!loading && list.length === 0 ? <div style={styles.tip}>当前筛选暂无作品</div> : null}

      <div style={styles.listWrap}>
        {list.map((post) => (
          <div key={post.id} style={styles.card}>
            <div style={styles.cardTop}>
              <div>
                <div style={styles.postTitle}>{post.title || `作品 #${post.id}`}</div>
                <div style={styles.metaText}>ID: {post.id} · {statusText(post.review_status)}</div>
                <div style={styles.metaText}>作者: {post.user?.nickname || `用户${post.user?.id || '-'}`}</div>
              </div>
              {post.thumbnail_url ? (
                <img src={post.thumbnail_url} alt={post.title} style={styles.thumb} />
              ) : (
                <div style={{ ...styles.thumb, ...styles.thumbPlaceholder }}>无图</div>
              )}
            </div>

            <div style={styles.actionRow}>
              <button
                style={{ ...styles.actionBtn, ...styles.approveBtn }}
                disabled={actingId === post.id}
                onClick={() => handleAction(post, 'approve')}
              >通过</button>
              <button
                style={{ ...styles.actionBtn, ...styles.rejectBtn }}
                disabled={actingId === post.id}
                onClick={() => handleAction(post, 'reject')}
              >驳回</button>
              <button
                style={{ ...styles.actionBtn, ...styles.hideBtn }}
                disabled={actingId === post.id}
                onClick={() => handleAction(post, 'hide')}
              >下架</button>
              <button
                style={{ ...styles.actionBtn, ...styles.restoreBtn }}
                disabled={actingId === post.id}
                onClick={() => handleAction(post, 'restore')}
              >恢复</button>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.pagerRow}>
        <button
          style={styles.pageBtn}
          disabled={page <= 1 || loading}
          onClick={() => loadData(page - 1, status)}
        >上一页</button>
        <span style={styles.metaText}>第 {page} 页</span>
        <button
          style={styles.pageBtn}
          disabled={loading || page * pageSize >= total}
          onClick={() => loadData(page + 1, status)}
        >下一页</button>
      </div>

      <div style={styles.logPanel}>
        <div style={styles.logHeader}>
          <h2 style={styles.logTitle}>操作历史</h2>
          <div style={styles.logFilterRow}>
            <input
              style={styles.logInput}
              placeholder="按作品ID筛选"
              value={postFilterInput}
              onChange={(e) => setPostFilterInput(e.target.value.replace(/[^0-9]/g, ''))}
            />
            <button
              style={styles.pageBtn}
              onClick={() => {
                if (!postFilterInput) {
                  setPostFilter(null);
                  return;
                }
                const v = Number(postFilterInput);
                if (Number.isFinite(v) && v > 0) {
                  setPostFilter(v);
                }
              }}
            >查询</button>
            <button
              style={styles.pageBtn}
              onClick={() => {
                setPostFilterInput('');
                setPostFilter(null);
              }}
            >重置</button>
            <button style={styles.primaryBtn} onClick={handleBackfillPreview} disabled={backfilling}>
              {backfilling ? '回填中...' : '回填详情图'}
            </button>
          </div>
        </div>

        {logLoading ? <div style={styles.tip}>日志加载中...</div> : null}
        {!logLoading && logs.length === 0 ? <div style={styles.tip}>暂无审核日志</div> : null}

        {logs.map((log) => (
          <div key={log.id} style={styles.logCard}>
            <div style={styles.logMain}>
              <div style={styles.postTitle}>{log.post_title || `作品 #${log.post_id}`}</div>
              <div style={styles.metaText}>
                #{log.post_id} · {actionText(log.action)} · {statusText(log.from_review_status)} → {statusText(log.to_review_status)}
              </div>
              <div style={styles.metaText}>
                审核人: {log.reviewer_nickname || `用户${log.reviewer_id}`} · {new Date(log.created_at).toLocaleString('zh-CN')}
              </div>
              {log.reason ? <div style={styles.metaText}>原因: {log.reason}</div> : null}
            </div>
          </div>
        ))}

        <div style={styles.pagerRow}>
          <button
            style={styles.pageBtn}
            disabled={logPage <= 1 || logLoading}
            onClick={() => loadLogs(logPage - 1, postFilter)}
          >上一页</button>
          <span style={styles.metaText}>第 {logPage} 页 · 共 {logTotal}</span>
          <button
            style={styles.pageBtn}
            disabled={logLoading || logPage * pageSize >= logTotal}
            onClick={() => loadLogs(logPage + 1, postFilter)}
          >下一页</button>
        </div>
      </div>

      <div style={styles.logPanel}>
        <div style={styles.logHeader}>
          <h2 style={styles.logTitle}>举报处理</h2>
          <div style={styles.logFilterRow}>
            {REPORT_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                style={{
                  ...styles.pageBtn,
                  ...(reportStatus === opt.value ? styles.filterBtnActive : {}),
                }}
                onClick={() => setReportStatus(opt.value)}
              >
                {opt.label}
              </button>
            ))}
            <button
              style={{
                ...styles.pageBtn,
                ...(reportHighOnly ? styles.filterBtnActive : {}),
              }}
              onClick={() => setReportHighOnly((v) => !v)}
            >
              仅高优
            </button>
            <button
              style={{
                ...styles.pageBtn,
                ...(reportOverdueOnly ? styles.filterBtnActive : {}),
              }}
              onClick={() => setReportOverdueOnly((v) => !v)}
            >
              仅超时
            </button>
            <button style={styles.pageBtn} onClick={toggleSelectAllPendingOnPage}>
              全选待处理
            </button>
            <select
              style={styles.logInput}
              value={batchTemplate}
              onChange={(e) => setBatchTemplate(e.target.value)}
            >
              {REPORT_NOTE_TEMPLATES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
            <button
              style={{ ...styles.actionBtn, ...styles.hideBtn }}
              disabled={batchHandling || selectedReportIds.length === 0}
              onClick={() => handleBatchReports('accept')}
            >
              批量采纳下架
            </button>
            <button
              style={{ ...styles.actionBtn, ...styles.restoreBtn }}
              disabled={batchHandling || selectedReportIds.length === 0}
              onClick={() => handleBatchReports('reject')}
            >
              批量驳回举报
            </button>
          </div>
        </div>

        {reportLoading ? <div style={styles.tip}>举报加载中...</div> : null}
        {!reportLoading && reportList.length === 0 ? <div style={styles.tip}>暂无举报记录</div> : null}

        {!reportLoading && pendingQueue.length > 0 ? (
          <div style={styles.logCard}>
            <div style={styles.postTitle}>待办优先队列（Top 5）</div>
            {pendingQueue.map((item) => (
              <div key={`queue-${item.id}`} style={styles.metaText}>
                #{item.id} / 作品#{item.post_id} · {item.overdue ? '超时' : '未超时'} ·
                高优{item.priority || 0} · 等待{item.age_hours || 0}h
              </div>
            ))}
          </div>
        ) : null}

        {reportList.map((item) => (
          <div key={item.id} style={styles.logCard}>
            <div style={styles.logMain}>
              {item.status === 0 ? (
                <label style={{ ...styles.metaText, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="checkbox"
                    checked={selectedReportIds.includes(item.id)}
                    onChange={() => toggleReportSelected(item.id)}
                  />
                  选择本条
                </label>
              ) : null}
              <div style={styles.postTitle}>{item.post_title || `作品 #${item.post_id}`}</div>
              <div style={styles.metaText}>
                举报ID #{item.id} · 作品ID #{item.post_id} · 状态 {reportStatusText(item.status)}
              </div>
              <div style={styles.metaText}>
                举报人: {item.reporter_nickname || `用户${item.reporter_id}`} · {new Date(item.created_at).toLocaleString('zh-CN')}
              </div>
              <div style={styles.metaText}>原因: {item.reason}</div>
              {item.priority >= 1 ? (
                <div style={{ ...styles.metaText, color: '#ffd166' }}>
                  高优先级举报{item.risk_reason ? ` · ${item.risk_reason}` : ''}
                </div>
              ) : null}
              {item.overdue ? (
                <div style={{ ...styles.metaText, color: '#ff7b7b' }}>
                  SLA超时 · 已等待约 {item.age_hours || 0} 小时
                </div>
              ) : (
                <div style={styles.metaText}>
                  等待时长：约 {item.age_hours || 0} 小时
                </div>
              )}
              {item.detail ? <div style={styles.metaText}>说明: {item.detail}</div> : null}
              {item.evidence_urls && item.evidence_urls.length > 0 ? (
                <div style={styles.metaText}>
                  证据:
                  {item.evidence_urls.map((url, idx) => (
                    <span key={`${item.id}-evidence-${idx}`}>
                      {' '}
                      <a href={url} target="_blank" rel="noreferrer" style={{ color: '#7cc7ff' }}>
                        链接{idx + 1}
                      </a>
                    </span>
                  ))}
                </div>
              ) : null}
              {item.status === 0 ? (
                <div style={styles.actionRow}>
                  <button
                    style={{ ...styles.actionBtn, ...styles.hideBtn }}
                    disabled={handlingReportId === item.id}
                    onClick={() => handleReportAction(item, 'accept')}
                  >采纳并下架</button>
                  <button
                    style={{ ...styles.actionBtn, ...styles.restoreBtn }}
                    disabled={handlingReportId === item.id}
                    onClick={() => handleReportAction(item, 'reject')}
                  >驳回举报</button>
                </div>
              ) : (
                <div style={styles.metaText}>
                  处理人: {item.handled_by_name || `用户${item.handled_by || '-'}`} ·
                  {item.handled_at ? ` ${new Date(item.handled_at).toLocaleString('zh-CN')}` : ''}
                  {item.handle_note ? ` · 备注: ${item.handle_note}` : ''}
                </div>
              )}
            </div>
          </div>
        ))}

        <div style={styles.pagerRow}>
          <button
            style={styles.pageBtn}
            disabled={reportPage <= 1 || reportLoading}
            onClick={() => loadReports(reportPage - 1, reportStatus, reportHighOnly, reportOverdueOnly)}
          >上一页</button>
          <span style={styles.metaText}>第 {reportPage} 页 · 共 {reportTotal}</span>
          <button
            style={styles.pageBtn}
            disabled={reportLoading || reportPage * pageSize >= reportTotal}
            onClick={() => loadReports(reportPage + 1, reportStatus, reportHighOnly, reportOverdueOnly)}
          >下一页</button>
        </div>
      </div>

      <div style={styles.logPanel}>
        <div style={styles.logHeader}>
          <h2 style={styles.logTitle}>成品举报处理</h2>
          <div style={styles.logFilterRow}>
            {FINISHED_REPORT_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                style={{
                  ...styles.pageBtn,
                  ...(finishedReportStatus === opt.value ? styles.filterBtnActive : {}),
                }}
                onClick={() => setFinishedReportStatus(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {finishedReportLoading ? <div style={styles.tip}>成品举报加载中...</div> : null}
        {!finishedReportLoading && finishedReportList.length === 0 ? <div style={styles.tip}>暂无成品举报记录</div> : null}

        {finishedReportList.map((item) => (
          <div key={`fw-report-${item.id}`} style={styles.logCard}>
            <div style={styles.logMain}>
              <div style={styles.postTitle}>{item.work_title || `成品 #${item.work_id}`}</div>
              <div style={styles.metaText}>
                举报ID #{item.id} · 成品ID #{item.work_id} · 状态 {reportStatusText(item.status)}
              </div>
              <div style={styles.metaText}>
                举报人: {item.reporter_nickname || `用户${item.reporter_id}`} · {new Date(item.created_at).toLocaleString('zh-CN')}
              </div>
              <div style={styles.metaText}>原因: {item.reason}</div>
              {item.detail ? <div style={styles.metaText}>说明: {item.detail}</div> : null}
              {item.status === 0 ? (
                <div style={styles.actionRow}>
                  <button
                    style={{ ...styles.actionBtn, ...styles.hideBtn }}
                    disabled={handlingFinishedReportId === item.id}
                    onClick={() => handleFinishedReportAction(item, 'accept')}
                  >采纳并下架</button>
                  <button
                    style={{ ...styles.actionBtn, ...styles.restoreBtn }}
                    disabled={handlingFinishedReportId === item.id}
                    onClick={() => handleFinishedReportAction(item, 'reject')}
                  >驳回举报</button>
                </div>
              ) : (
                <div style={styles.metaText}>
                  处理人: {item.handled_by_name || `用户${item.handled_by || '-'}`} ·
                  {item.handled_at ? ` ${new Date(item.handled_at).toLocaleString('zh-CN')}` : ''}
                  {item.handle_note ? ` · 备注: ${item.handle_note}` : ''}
                </div>
              )}
            </div>
          </div>
        ))}

        <div style={styles.pagerRow}>
          <button
            style={styles.pageBtn}
            disabled={finishedReportPage <= 1 || finishedReportLoading}
            onClick={() => loadFinishedReports(finishedReportPage - 1, finishedReportStatus)}
          >上一页</button>
          <span style={styles.metaText}>第 {finishedReportPage} 页 · 共 {finishedReportTotal}</span>
          <button
            style={styles.pageBtn}
            disabled={finishedReportLoading || finishedReportPage * pageSize >= finishedReportTotal}
            onClick={() => loadFinishedReports(finishedReportPage + 1, finishedReportStatus)}
          >下一页</button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#12182f',
    color: '#e7ecff',
    padding: '14px',
    width: '100%',
    overflowX: 'hidden',
    boxSizing: 'border-box',
  },
  centerWrap: {
    minHeight: '100vh',
    background: '#12182f',
    color: '#e7ecff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  backBtn: {
    border: '1px solid #3c4973',
    borderRadius: '10px',
    background: '#1b2548',
    color: '#e7ecff',
    padding: '6px 10px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
  },
  totalText: {
    fontSize: '12px',
    color: '#8ea1d9',
  },
  alertPanel: {
    border: '1px solid #7a3a3a',
    borderRadius: '10px',
    background: '#2a1a1f',
    padding: '10px',
    marginBottom: '12px',
  },
  alertItem: {
    fontSize: '12px',
    color: '#ffb4b4',
    marginTop: '4px',
  },
  filterRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '12px',
    minWidth: 0,
  },
  filterBtn: {
    border: '1px solid #3c4973',
    borderRadius: '999px',
    background: '#1b2548',
    color: '#cad6ff',
    padding: '6px 10px',
    fontSize: '12px',
  },
  filterBtnActive: {
    background: '#3f74ff',
    borderColor: '#3f74ff',
    color: '#fff',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '8px',
    marginBottom: '12px',
  },
  statsCard: {
    border: '1px solid #33406a',
    borderRadius: '10px',
    background: '#1a2342',
    padding: '8px',
  },
  statsNum: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#eaf0ff',
    lineHeight: 1.2,
  },
  statsLabel: {
    fontSize: '12px',
    color: '#9fb0df',
    marginTop: '2px',
  },
  listWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  card: {
    border: '1px solid #33406a',
    borderRadius: '12px',
    background: '#1a2342',
    padding: '10px',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
  },
  postTitle: {
    fontWeight: 700,
    marginBottom: '6px',
  },
  metaText: {
    fontSize: '12px',
    color: '#9fb0df',
  },
  thumb: {
    width: '72px',
    height: '72px',
    borderRadius: '8px',
    objectFit: 'cover',
    imageRendering: 'pixelated',
    border: '1px solid #3b4a76',
    background: '#111935',
  },
  thumbPlaceholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#89a0db',
    fontSize: '12px',
  },
  actionRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))',
    gap: '8px',
    marginTop: '10px',
    minWidth: 0,
  },
  actionBtn: {
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    padding: '8px 10px',
    fontSize: '12px',
    minWidth: 0,
    whiteSpace: 'nowrap',
  },
  approveBtn: { background: '#1c9b52' },
  rejectBtn: { background: '#c86b1e' },
  hideBtn: { background: '#c03243' },
  restoreBtn: { background: '#3f74ff' },
  pagerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginTop: '14px',
  },
  pageBtn: {
    border: '1px solid #3c4973',
    borderRadius: '8px',
    background: '#1b2548',
    color: '#e7ecff',
    padding: '6px 10px',
  },
  primaryBtn: {
    border: 'none',
    borderRadius: '10px',
    background: '#3f74ff',
    color: '#fff',
    padding: '10px 18px',
  },
  tip: {
    color: '#9fb0df',
    textAlign: 'center',
  },
  logPanel: {
    marginTop: '16px',
    border: '1px solid #33406a',
    borderRadius: '12px',
    background: '#1a2342',
    padding: '10px',
  },
  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
    flexWrap: 'wrap',
  },
  logTitle: {
    margin: 0,
    fontSize: '16px',
  },
  logFilterRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  logInput: {
    width: '120px',
    maxWidth: '100%',
    border: '1px solid #3c4973',
    borderRadius: '8px',
    background: '#121a36',
    color: '#e7ecff',
    padding: '6px 8px',
  },
  logCard: {
    border: '1px solid #2f3d68',
    borderRadius: '8px',
    padding: '8px',
    marginBottom: '8px',
    background: '#17203d',
  },
  logMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
};

export default CommunityModerationPage;
