import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { useUserStore } from '@/store/userStore';
import { useChallengeStore } from '@/store/challengeStore';
import { LoginModal } from '@/components/LoginModal';
import { workApi } from '@/services/api';
import ResultCanvas from '@/components/ResultCanvas';
import { downloadShareCard, generateShareCardBlob } from '@/utils/shareCard';
import type { FailureType } from '@/types/game';
import './ResultPage.css';

const FAILURE_EMOJIS: Record<FailureType, string> = {
  undercooked: '🥶',
  partial_melt: '🫠',
  collapse: '💀',
  burned: '🔥',
  sticky: '🧲',
  bead_drop: '💧',
  tape_fail: '📎',
  paper_gap: '📄',
};

const FAILURE_BG: Record<FailureType, string> = {
  undercooked: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  partial_melt: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  collapse: 'linear-gradient(135deg, #434343 0%, #000000 100%)',
  burned: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)',
  sticky: 'linear-gradient(135deg, #fc5c7d 0%, #6a82fb 100%)',
  bead_drop: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  tape_fail: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  paper_gap: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
};

const SUCCESS_BG = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';

export default function ResultPage() {
  const navigate = useNavigate();
  const { ironingResult, resetGame, resultBeads, resultBoardWidth, resultBoardHeight, board, selectedTemplate, stepRecords } = useGameStore();
  const { isLoggedIn } = useUserStore();
  const activeChallenge = useChallengeStore((s) => s.activeChallenge);
  const challengeResult = useChallengeStore((s) => s.activeChallengeResult);
  const clearChallenge = useChallengeStore((s) => s.clearActive);

  const isChallenge = !!activeChallenge;

  // 动画状态
  const [showCard, setShowCard] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const animFrameRef = useRef<number>(0);

  // 发布状态
  const [showLogin, setShowLogin] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishError, setPublishError] = useState('');
  const pendingPublishRef = useRef(false);

  const handlePlayAgain = () => {
    clearChallenge();
    resetGame();
    navigate('/');
  };

  const handleRetry = () => {
    clearChallenge();
    resetGame();
    navigate('/');
  };

  const getShareOptions = useCallback(() => {
    if (!ironingResult) return null;
    return {
      beads: resultBeads,
      boardWidth: resultBoardWidth,
      boardHeight: resultBoardHeight,
      score: ironingResult.report.score,
      success: ironingResult.success,
      failureType: ironingResult.failureType,
      failureTitle: ironingResult.report.title,
      physics: ironingResult.physics,
    };
  }, [ironingResult, resultBeads, resultBoardWidth, resultBoardHeight]);

  // 保存图片
  const handleSaveImage = () => {
    const options = getShareOptions();
    if (!options) return;
    downloadShareCard(options);
  };

  // 分享
  const handleShare = async () => {
    const options = getShareOptions();
    if (!options) return;

    const shareText = ironingResult!.success
      ? `完美融合! 我在云拼豆获得了${options.score}分!`
      : `${options.failureTitle} - 我在云拼豆翻车了! 评分${options.score}分`;

    if (navigator.share) {
      try {
        const blob = await generateShareCardBlob(options);
        if (blob) {
          const file = new File([blob], 'perler-share.png', { type: 'image/png' });
          await navigator.share({
            title: '云拼豆',
            text: shareText,
            files: [file],
          });
          return;
        }
      } catch {
        // 分享被取消或不支持文件分享，降级处理
      }
    }

    try {
      const blob = await generateShareCardBlob(options);
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        alert('图片已复制到剪贴板!');
        return;
      }
    } catch {
      // 剪贴板不支持，降级为下载
    }

    downloadShareCard(options);
  };

  // 发布到广场
  const doPublish = useCallback(async () => {
    if (!ironingResult || publishing || published) return;
    setPublishing(true);
    setPublishError('');

    try {
      // 序列化画板数据
      const beadsArray = resultBeads.map(b => ({
        x: b.x, y: b.y, color: b.color, colorId: b.colorId,
      }));
      const boardJSON = JSON.stringify({ beads: beadsArray });

      // 生成缩略图（使用 shareCard 的方式）
      let thumbnail = '';
      try {
        const blob = await generateShareCardBlob({
          beads: resultBeads,
          boardWidth: resultBoardWidth,
          boardHeight: resultBoardHeight,
          score: ironingResult.report.score,
          success: ironingResult.success,
          failureType: ironingResult.failureType,
          failureTitle: ironingResult.report.title,
        });
        if (blob) {
          thumbnail = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }
      } catch {
        // 缩略图生成失败不影响发布
      }

      // 保存作品
      const { id } = await workApi.save({
        title: selectedTemplate?.name || '自由创作',
        board_json: boardJSON,
        thumbnail,
        template_id: selectedTemplate?.id || '',
        bead_count: board.count,
        board_width: resultBoardWidth,
        board_height: resultBoardHeight,
        ironing_score: ironingResult.report.score,
        failure_type: ironingResult.failureType || '',
        risk_score: ironingResult.riskScore,
      });

      // 发布到广场
      await workApi.publish(id);
      setPublished(true);
    } catch (err: unknown) {
      setPublishError(err instanceof Error ? err.message : '发布失败');
    } finally {
      setPublishing(false);
    }
  }, [ironingResult, publishing, published, resultBeads, resultBoardWidth, resultBoardHeight, board, selectedTemplate]);

  const handlePublish = () => {
    if (!isLoggedIn) {
      pendingPublishRef.current = true;
      setShowLogin(true);
      return;
    }
    doPublish();
  };

  const handleLoginSuccess = () => {
    setShowLogin(false);
    if (pendingPublishRef.current) {
      pendingPublishRef.current = false;
      doPublish();
    }
  };

  // 入场动画序列
  useEffect(() => {
    if (!ironingResult) return;

    const t1 = setTimeout(() => setShowCard(true), 100);
    const t2 = setTimeout(() => setShowCanvas(true), 400);
    const startTime = performance.now();
    const targetScore = ironingResult.report.score;
    const duration = 1000;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplayScore(Math.round(eased * targetScore));
      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    const t3 = setTimeout(() => {
      animFrameRef.current = requestAnimationFrame(animate);
    }, 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [ironingResult]);

  if (!ironingResult) {
    return (
      <div className="result-page" style={{ background: SUCCESS_BG }}>
        <div className="result-card show">
          <h1>没有结果</h1>
          <p className="result-desc">还没有完成熨烫</p>
          <button className="result-btn primary" onClick={() => navigate('/')}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const { success, riskScore, failureType, report } = ironingResult;
  const bg = success
    ? SUCCESS_BG
    : failureType ? FAILURE_BG[failureType] : SUCCESS_BG;
  const emoji = success ? '🎉' : failureType ? FAILURE_EMOJIS[failureType] : '🎉';

  return (
    <div className="result-page" style={{ background: bg }}>
      <div className={`result-card ${showCard ? 'show' : ''}`}>
        {/* 大表情 */}
        <div className="result-emoji">{emoji}</div>

        {/* 标题 */}
        <h1 className="result-title">{report.title}</h1>

        {/* 评分 */}
        <div className="result-score-ring">
          <svg viewBox="0 0 120 120" className="score-svg">
            <circle
              cx="60" cy="60" r="50"
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="8"
            />
            <circle
              cx="60" cy="60" r="50"
              fill="none"
              stroke="white"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${displayScore * 3.14} 314`}
              transform="rotate(-90 60 60)"
              className="score-circle-animated"
            />
          </svg>
          <span className="score-number">{displayScore}</span>
        </div>

        {/* 失败效果可视化 */}
        <div className={`result-canvas-wrap ${showCanvas ? 'show' : ''}`}>
          <ResultCanvas
            beads={resultBeads}
            boardWidth={resultBoardWidth}
            boardHeight={resultBoardHeight}
            failureType={failureType}
            success={success}
            physics={ironingResult?.physics}
          />
        </div>

        {/* 描述 */}
        <p className="result-desc">{report.description}</p>

        {/* 风险值 */}
        <div className="result-risk">
          <span>风险值</span>
          <span className="risk-value">{riskScore.toFixed(1)}</span>
        </div>

        {/* 挑战结果 */}
        {isChallenge && challengeResult && (
          <div className="result-challenge-block">
            <div className={`challenge-result-badge ${challengeResult.passed ? 'passed' : 'failed'}`}>
              {challengeResult.passed ? '挑战通过!' : '挑战失败'}
            </div>
            <div className="challenge-result-score">
              挑战评分：<span>{challengeResult.score}</span>
            </div>
            <div className="challenge-bonus-list">
              {challengeResult.bonusDetails.map((b, i) => (
                <div key={i} className="challenge-bonus-item">
                  <span>{b.label}</span>
                  <span>+{b.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 改进建议 */}
        {!success && !isChallenge && (
          <div className="result-tips">
            <h4>改进建议</h4>
            <ul>
              {report.tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 过程回顾 */}
        {stepRecords.length > 0 && (
          <div className="result-step-review">
            <h4>制作过程</h4>
            <div className="step-timeline">
              {stepRecords.map((record, i) => {
                const stepNames: Record<string, string> = {
                  taping: '贴胶带', flipping: '翻转', removing: '去钉板',
                  papering: '铺烘焙纸', ironing: '熨烫',
                };
                const lost = record.beadsBefore - record.beadsAfter;
                return (
                  <div key={i} className={`step-item ${record.score >= 80 ? 'good' : record.score >= 50 ? 'ok' : 'bad'}`}>
                    <div className="step-name">{stepNames[record.step] || record.step}</div>
                    <div className="step-score">{record.score}分</div>
                    <div className="step-detail">{record.detail}</div>
                    {lost > 0 && <div className="step-loss">-{lost}颗</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 分享操作 */}
        <div className="result-share-actions">
          <button className="share-btn save-image" onClick={handleSaveImage}>
            保存图片
          </button>
          <button className="share-btn share" onClick={handleShare}>
            分享
          </button>
          <button
            className={`share-btn publish ${published ? 'published' : ''}`}
            onClick={handlePublish}
            disabled={publishing || published}
          >
            {published ? '已发布 ✓' : publishing ? <><span className="publish-spinner" />发布中</> : '发布到广场'}
          </button>
        </div>

        {publishError && <p className="publish-error">{publishError}</p>}

        {/* 操作按钮 */}
        <div className="result-actions">
          <button className="result-btn primary" onClick={handlePlayAgain}>
            再来一局
          </button>
          {!success && (
            <button className="result-btn secondary" onClick={handleRetry}>
              重新挑战
            </button>
          )}
        </div>
      </div>

      {/* 登录弹窗 */}
      {showLogin && (
        <LoginModal
          onClose={() => { setShowLogin(false); pendingPublishRef.current = false; }}
          onSuccess={handleLoginSuccess}
        />
      )}
    </div>
  );
}
