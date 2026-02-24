/**
 * 挑战模式 Store
 */

import { create } from 'zustand';
import type { ChallengeDef } from '@/data/challenges';
import { getDailyChallenges, getWeeklyChallenges } from '@/data/challenges';
import type { ChallengeResult } from '@/core/ChallengeScoring';

interface ChallengeState {
  // 当前激活的挑战
  activeChallenge: ChallengeDef | null;
  activeChallengeResult: ChallengeResult | null;

  // 每日/每周挑战
  dailyChallenges: ChallengeDef[];
  weeklyChallenges: ChallengeDef[];
  lastRefreshDate: string;  // YYYY-MM-DD

  // 操作
  setActiveChallenge: (challenge: ChallengeDef | null) => void;
  setChallengeResult: (result: ChallengeResult | null) => void;
  refreshChallenges: () => void;
  clearActive: () => void;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const useChallengeStore = create<ChallengeState>((set, get) => ({
  activeChallenge: null,
  activeChallengeResult: null,
  dailyChallenges: [],
  weeklyChallenges: [],
  lastRefreshDate: '',

  setActiveChallenge: (challenge) => set({ activeChallenge: challenge, activeChallengeResult: null }),

  setChallengeResult: (result) => set({ activeChallengeResult: result }),

  refreshChallenges: () => {
    const today = todayStr();
    const { lastRefreshDate } = get();
    if (lastRefreshDate === today) return;

    const now = new Date();
    set({
      dailyChallenges: getDailyChallenges(now),
      weeklyChallenges: getWeeklyChallenges(now),
      lastRefreshDate: today,
    });
  },

  clearActive: () => set({ activeChallenge: null, activeChallengeResult: null }),
}));
