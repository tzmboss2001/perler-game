/**
 * 成就系统 Store
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserStats } from '@/core/AchievementChecker';
import { createEmptyStats, checkAchievements } from '@/core/AchievementChecker';
import type { FailureType } from '@/types/game';
import { achievementApi } from '@/services/api';
import { getToken } from '@/services/api';

interface AchievementState {
  stats: UserStats;
  unlockedIds: string[];
  pendingNotifications: string[];  // 待展示的新成就通知

  // 更新统计 + 自动检测成就
  recordCrash: (failureType: FailureType) => void;
  recordWork: (score: number) => void;
  recordRescue: (success: boolean) => void;
  recordFastIroning: () => void;
  recordLikeReceived: () => void;
  recordComment: () => void;
  recordChallengeComplete: () => void;

  // 通知管理
  popNotification: () => string | null;
  clearNotifications: () => void;

  // 服务器同步
  syncFromServer: (stats: UserStats, unlockedIds: string[]) => void;
  syncToServer: () => Promise<void>;
  loadFromServer: () => Promise<void>;
}

export const useAchievementStore = create<AchievementState>()(
  persist(
    (set, get) => ({
      stats: createEmptyStats(),
      unlockedIds: [],
      pendingNotifications: [],

      recordCrash: (failureType) => {
        const { stats } = get();
        const newStats = { ...stats };
        newStats.total_crashes++;
        const key = `crash_${failureType}` as keyof UserStats;
        if (key in newStats) {
          (newStats[key] as number)++;
        }
        _updateAndCheck(set, get, newStats);
      },

      recordWork: (score) => {
        const { stats } = get();
        const newStats = { ...stats };
        newStats.total_works++;
        if (score >= 100) {
          newStats.perfect_scores++;
        }
        _updateAndCheck(set, get, newStats);
      },

      recordRescue: (success) => {
        if (!success) return;
        const { stats } = get();
        const newStats = { ...stats };
        newStats.rescue_success_count++;
        _updateAndCheck(set, get, newStats);
      },

      recordFastIroning: () => {
        const { stats } = get();
        const newStats = { ...stats };
        newStats.fast_ironing_count++;
        _updateAndCheck(set, get, newStats);
      },

      recordLikeReceived: () => {
        const { stats } = get();
        const newStats = { ...stats };
        newStats.total_likes_received++;
        _updateAndCheck(set, get, newStats);
      },

      recordComment: () => {
        const { stats } = get();
        const newStats = { ...stats };
        newStats.total_comments++;
        _updateAndCheck(set, get, newStats);
      },

      recordChallengeComplete: () => {
        const { stats } = get();
        const newStats = { ...stats };
        newStats.challenge_complete_count++;
        _updateAndCheck(set, get, newStats);
      },

      popNotification: () => {
        const { pendingNotifications } = get();
        if (pendingNotifications.length === 0) return null;
        const [first, ...rest] = pendingNotifications;
        set({ pendingNotifications: rest });
        return first;
      },

      clearNotifications: () => set({ pendingNotifications: [] }),

      syncFromServer: (stats, unlockedIds) => {
        set({ stats, unlockedIds });
      },

      syncToServer: async () => {
        if (!getToken()) return;
        try {
          const { stats, unlockedIds } = get();
          // 同步统计
          await achievementApi.updateStats(stats);
          // 同步新解锁成就
          for (const id of unlockedIds) {
            await achievementApi.unlock(id);
          }
        } catch {
          // 静默失败，下次再同步
        }
      },

      loadFromServer: async () => {
        if (!getToken()) return;
        try {
          const [serverAchievements, serverStats] = await Promise.all([
            achievementApi.getMyAchievements(),
            achievementApi.getMyStats(),
          ]);

          const serverIds = (serverAchievements || []).map((a) => a.achievement_id);
          const { unlockedIds: localIds, stats: localStats } = get();

          // 合并：取本地和服务器的并集
          const mergedIds = [...new Set([...localIds, ...serverIds])];
          const mergedStats: UserStats = { ...createEmptyStats() };
          const keys = Object.keys(mergedStats) as (keyof UserStats)[];
          for (const key of keys) {
            const local = (localStats[key] as number) || 0;
            const server = ((serverStats as Record<string, number>)?.[key] as number) || 0;
            (mergedStats[key] as number) = Math.max(local, server);
          }

          set({ unlockedIds: mergedIds, stats: mergedStats });
        } catch {
          // 静默失败
        }
      },
    }),
    {
      name: 'perler-achievements',
      partialize: (state) => ({
        stats: state.stats,
        unlockedIds: state.unlockedIds,
      }),
    },
  ),
);

/** 内部：更新 stats 并检测新成就 */
function _updateAndCheck(
  set: (partial: Partial<AchievementState> | ((state: AchievementState) => Partial<AchievementState>)) => void,
  get: () => AchievementState,
  newStats: UserStats,
) {
  const { unlockedIds, pendingNotifications } = get();
  const unlockedSet = new Set(unlockedIds);
  const newlyUnlocked = checkAchievements(newStats, unlockedSet);

  set({
    stats: newStats,
    unlockedIds: [...unlockedIds, ...newlyUnlocked],
    pendingNotifications: [...pendingNotifications, ...newlyUnlocked],
  });
}
