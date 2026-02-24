/**
 * AchievementChecker - 成就检测引擎
 * 纯函数：根据 stats 和已解锁成就，返回新解锁的成就ID列表
 */

import { ACHIEVEMENTS } from '@/data/achievements';
import type { AchievementDef } from '@/data/achievements';

export interface UserStats {
  total_crashes: number;
  crash_undercooked: number;
  crash_partial_melt: number;
  crash_collapse: number;
  crash_burned: number;
  crash_sticky: number;
  unique_crash_types: number;  // 计算字段
  total_works: number;
  perfect_scores: number;
  total_likes_received: number;
  total_comments: number;
  rescue_success_count: number;
  fast_ironing_count: number;
  challenge_complete_count: number;
}

/** 创建空 stats */
export function createEmptyStats(): UserStats {
  return {
    total_crashes: 0,
    crash_undercooked: 0,
    crash_partial_melt: 0,
    crash_collapse: 0,
    crash_burned: 0,
    crash_sticky: 0,
    unique_crash_types: 0,
    total_works: 0,
    perfect_scores: 0,
    total_likes_received: 0,
    total_comments: 0,
    rescue_success_count: 0,
    fast_ironing_count: 0,
    challenge_complete_count: 0,
  };
}

/** 计算 unique_crash_types（有多少种不同的翻车类型） */
export function calcUniqueCrashTypes(stats: UserStats): number {
  let count = 0;
  if (stats.crash_undercooked > 0) count++;
  if (stats.crash_partial_melt > 0) count++;
  if (stats.crash_collapse > 0) count++;
  if (stats.crash_burned > 0) count++;
  if (stats.crash_sticky > 0) count++;
  return count;
}

/** 判断单个条件是否达成 */
function evaluateCondition(
  stats: UserStats,
  condition: AchievementDef['condition'],
): boolean {
  const value = stats[condition.stat as keyof UserStats] ?? 0;
  return value >= condition.threshold;
}

/**
 * 检测新解锁的成就
 * @returns 新解锁的成就ID列表
 */
export function checkAchievements(
  stats: UserStats,
  unlockedIds: Set<string>,
): string[] {
  const newlyUnlocked: string[] = [];

  // 先更新计算字段
  stats.unique_crash_types = calcUniqueCrashTypes(stats);

  for (const achievement of ACHIEVEMENTS) {
    // 跳过已解锁的
    if (unlockedIds.has(achievement.id)) continue;

    // 检测条件
    if (evaluateCondition(stats, achievement.condition)) {
      newlyUnlocked.push(achievement.id);
    }
  }

  return newlyUnlocked;
}
