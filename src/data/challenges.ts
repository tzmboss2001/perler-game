/**
 * 挑战模式 - 数据定义
 */

import type { FailureType } from '@/types/game';

export type ChallengeType = 'time_limit' | 'fixed_temp' | 'crash_target';

export interface ChallengeConstraints {
  timeLimit?: number;       // 限时（秒）
  fixedTemp?: number;       // 固定温度
  targetFailure?: FailureType; // 目标翻车类型
  hidePreview?: boolean;    // 隐藏预览
}

export interface ChallengeScoring {
  baseScore: number;        // 基础分
  timeBonusPerSec?: number; // 每提前1秒的加分
  accuracyBonus?: number;   // 精准度加分
}

export interface ChallengeDef {
  code: string;
  name: string;
  description: string;
  icon: string;
  type: ChallengeType;
  difficulty: 'easy' | 'medium' | 'hard';
  constraints: ChallengeConstraints;
  scoring: ChallengeScoring;
  templateId?: string;      // 指定模板
  boardWidth?: number;
  boardHeight?: number;
}

/** 挑战池 */
export const CHALLENGE_POOL: ChallengeDef[] = [
  {
    code: 'speed_iron',
    name: '极速烫手',
    description: '5秒内成功熨烫',
    icon: '⏱️',
    type: 'time_limit',
    difficulty: 'medium',
    constraints: { timeLimit: 5 },
    scoring: { baseScore: 80, timeBonusPerSec: 5 },
  },
  {
    code: 'cold_iron',
    name: '冷铁挑战',
    description: '只能用温度3完成熨烫',
    icon: '🧊',
    type: 'fixed_temp',
    difficulty: 'hard',
    constraints: { fixedTemp: 3 },
    scoring: { baseScore: 90, accuracyBonus: 20 },
  },
  {
    code: 'hot_speed',
    name: '高温速烫',
    description: '温度9 + 3秒限时',
    icon: '🌡️',
    type: 'time_limit',
    difficulty: 'hard',
    constraints: { timeLimit: 3, fixedTemp: 9 },
    scoring: { baseScore: 100, timeBonusPerSec: 10 },
  },
  {
    code: 'burn_target',
    name: '故意烧焦',
    description: '精确制造烧焦效果',
    icon: '🎯',
    type: 'crash_target',
    difficulty: 'medium',
    constraints: { targetFailure: 'burned' },
    scoring: { baseScore: 70, accuracyBonus: 30 },
  },
  {
    code: 'collapse_expert',
    name: '塌陷专家',
    description: '制造整体塌陷',
    icon: '💀',
    type: 'crash_target',
    difficulty: 'hard',
    constraints: { targetFailure: 'collapse' },
    scoring: { baseScore: 80, accuracyBonus: 30 },
  },
  {
    code: 'sticky_master',
    name: '粘连高手',
    description: '制造粘连效果',
    icon: '🧲',
    type: 'crash_target',
    difficulty: 'medium',
    constraints: { targetFailure: 'sticky' },
    scoring: { baseScore: 60, accuracyBonus: 30 },
  },
  {
    code: 'lightning_iron',
    name: '闪电熨烫',
    description: '3秒限时成功熨烫',
    icon: '⚡',
    type: 'time_limit',
    difficulty: 'hard',
    constraints: { timeLimit: 3 },
    scoring: { baseScore: 100, timeBonusPerSec: 15 },
  },
  {
    code: 'blind_iron',
    name: '盲烫挑战',
    description: '不显示拼豆预览，凭感觉熨烫',
    icon: '🎰',
    type: 'time_limit',
    difficulty: 'hard',
    constraints: { timeLimit: 8, hidePreview: true },
    scoring: { baseScore: 90, timeBonusPerSec: 5 },
  },
];

/** 难度标签 */
export const CHALLENGE_DIFFICULTY: Record<string, { label: string; color: string }> = {
  easy: { label: '简单', color: '#5cd85c' },
  medium: { label: '中等', color: '#e8c44a' },
  hard: { label: '困难', color: '#e84a4a' },
};

/**
 * 基于日期种子选取每日/每周挑战
 */
export function getDailyChallenges(date: Date): ChallengeDef[] {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const pool = [...CHALLENGE_POOL];
  // 简单洗牌
  for (let i = pool.length - 1; i > 0; i--) {
    const j = (seed * (i + 1) * 7) % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

export function getWeeklyChallenges(date: Date): ChallengeDef[] {
  // 以周一为起点
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay() + 1);
  const seed = d.getFullYear() * 100 + Math.ceil((d.getMonth() * 30 + d.getDate()) / 7);
  const hardPool = CHALLENGE_POOL.filter((c) => c.difficulty === 'hard');
  const pool = [...hardPool];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = (seed * (i + 1) * 13) % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 2);
}
