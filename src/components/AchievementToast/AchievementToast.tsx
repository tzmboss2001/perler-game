/**
 * AchievementToast - 成就解锁通知
 * 全局挂载，顶部滑入，2.5s 自动消失
 */

import { useState, useEffect, useCallback } from 'react';
import { useAchievementStore } from '@/store/achievementStore';
import { ACHIEVEMENTS, RARITY_LABELS } from '@/data/achievements';
import './AchievementToast.css';

interface ToastItem {
  id: string;
  achievementId: string;
}

export default function AchievementToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const popNotification = useAchievementStore((s) => s.popNotification);
  const pendingNotifications = useAchievementStore((s) => s.pendingNotifications);

  const processNotification = useCallback(() => {
    const achievementId = popNotification();
    if (!achievementId) return;

    const toastId = `${achievementId}_${Date.now()}`;
    setToasts((prev) => [...prev, { id: toastId, achievementId }]);

    // 2.5秒后移除
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 2500);
  }, [popNotification]);

  useEffect(() => {
    if (pendingNotifications.length > 0) {
      // 每个通知间隔 300ms 显示
      const timer = setTimeout(processNotification, 300);
      return () => clearTimeout(timer);
    }
  }, [pendingNotifications, processNotification]);

  if (toasts.length === 0) return null;

  return (
    <div className="achievement-toast-container">
      {toasts.map((toast) => {
        const def = ACHIEVEMENTS.find((a) => a.id === toast.achievementId);
        if (!def) return null;
        const rarity = RARITY_LABELS[def.rarity];

        return (
          <div
            key={toast.id}
            className="achievement-toast"
            style={{ borderColor: rarity.color }}
          >
            <span className="achievement-toast-icon">{def.icon}</span>
            <div className="achievement-toast-info">
              <div className="achievement-toast-title">
                成就解锁！
              </div>
              <div className="achievement-toast-name">{def.name}</div>
              <div className="achievement-toast-desc">{def.description}</div>
            </div>
            <span
              className="achievement-toast-rarity"
              style={{ color: rarity.color }}
            >
              {rarity.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
