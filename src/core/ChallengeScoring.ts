/**
 * ChallengeScoring - 挑战评分系统
 */

import type { IroningResult } from '@/types/game';
import type { ChallengeDef } from '@/data/challenges';

export interface ChallengeResult {
  passed: boolean;
  score: number;
  timeUsed: number;
  bonusDetails: { label: string; value: number }[];
}

/**
 * 计算挑战结果
 */
export function scoreChallengeResult(
  challenge: ChallengeDef,
  ironingResult: IroningResult,
  timeUsed: number,
): ChallengeResult {
  const { constraints, scoring } = challenge;
  const bonusDetails: { label: string; value: number }[] = [];
  let passed = false;
  let score = 0;

  switch (challenge.type) {
    case 'time_limit': {
      // 限时挑战：在限时内成功
      const withinTime = !constraints.timeLimit || timeUsed <= constraints.timeLimit;
      passed = ironingResult.success && withinTime;

      if (passed) {
        score = scoring.baseScore;
        bonusDetails.push({ label: '基础分', value: scoring.baseScore });

        // 时间奖励
        if (constraints.timeLimit && scoring.timeBonusPerSec) {
          const timeLeft = Math.max(0, constraints.timeLimit - timeUsed);
          const timeBonus = Math.round(timeLeft * scoring.timeBonusPerSec);
          score += timeBonus;
          if (timeBonus > 0) {
            bonusDetails.push({ label: `提前${timeLeft.toFixed(1)}s`, value: timeBonus });
          }
        }
      } else {
        score = Math.round(scoring.baseScore * 0.2);
        bonusDetails.push({ label: '未通过', value: score });
      }
      break;
    }

    case 'fixed_temp': {
      // 固定温度挑战：成功即通过
      passed = ironingResult.success;

      if (passed) {
        score = scoring.baseScore;
        bonusDetails.push({ label: '基础分', value: scoring.baseScore });
        if (scoring.accuracyBonus) {
          score += scoring.accuracyBonus;
          bonusDetails.push({ label: '精准奖励', value: scoring.accuracyBonus });
        }
      } else {
        score = Math.round(scoring.baseScore * 0.15);
        bonusDetails.push({ label: '未通过', value: score });
      }
      break;
    }

    case 'crash_target': {
      // 翻车挑战：制造特定翻车类型
      const targetHit = ironingResult.failureType === constraints.targetFailure;
      passed = targetHit;

      if (passed) {
        score = scoring.baseScore;
        bonusDetails.push({ label: '目标达成', value: scoring.baseScore });
        if (scoring.accuracyBonus) {
          score += scoring.accuracyBonus;
          bonusDetails.push({ label: '精准奖励', value: scoring.accuracyBonus });
        }
      } else if (ironingResult.failureType && !ironingResult.success) {
        // 翻车了但类型不对
        score = Math.round(scoring.baseScore * 0.3);
        bonusDetails.push({ label: '翻车但类型不对', value: score });
      } else {
        // 成功了（不应该成功）
        score = Math.round(scoring.baseScore * 0.1);
        bonusDetails.push({ label: '不该成功的...', value: score });
      }
      break;
    }
  }

  return { passed, score, timeUsed, bonusDetails };
}
