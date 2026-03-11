import { isAdEnabled, monetizationConfig } from '../config/monetization';

type RewardUnlockChannel = 'reward' | 'off';
type RewardAdResult = 'completed' | 'closed' | 'failed' | 'no_fill';

interface AdLocalState {
  premiumExportDate: string;
  premiumExportRewardCredits: number;
  aiCutoutRewardCredits: number;
}

const AD_LOCAL_STATE_KEY = 'ad_monetization_state_v1';

function todayTag(): string {
  const d = new Date();
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getDefaultState(): AdLocalState {
  return {
    premiumExportDate: todayTag(),
    premiumExportRewardCredits: 0,
    aiCutoutRewardCredits: 0,
  };
}

function loadState(): AdLocalState {
  try {
    const raw = localStorage.getItem(AD_LOCAL_STATE_KEY);
    if (!raw) {
      return getDefaultState();
    }
    const parsed = JSON.parse(raw) as Partial<AdLocalState>;
    const next: AdLocalState = {
      premiumExportDate: parsed.premiumExportDate || todayTag(),
      premiumExportRewardCredits: Number(parsed.premiumExportRewardCredits || 0),
      aiCutoutRewardCredits: Number(parsed.aiCutoutRewardCredits || 0),
    };
    if (next.premiumExportDate !== todayTag()) {
      return getDefaultState();
    }
    return next;
  } catch {
    return getDefaultState();
  }
}

function saveState(state: AdLocalState): void {
  try {
    localStorage.setItem(AD_LOCAL_STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota/storage failures.
  }
}

function track(event: string, payload?: Record<string, unknown>): void {
  // Current stage keeps local console tracking. Can be replaced by backend analytics later.
  console.info('[Monetization]', event, payload || {});
}

function ensureTodayState(): AdLocalState {
  const state = loadState();
  if (state.premiumExportDate !== todayTag()) {
    const reset = getDefaultState();
    saveState(reset);
    return reset;
  }
  return state;
}

export const adService = {
  isEnabled(): boolean {
    return isAdEnabled;
  },

  getPremiumExportDecision(): { allowed: boolean; channel: RewardUnlockChannel; freeRemaining: number } {
    if (!isAdEnabled) {
      return { allowed: true, channel: 'off', freeRemaining: 999 };
    }
    const state = ensureTodayState();
    const freeRemaining = 0;
    if (state.premiumExportRewardCredits > 0) {
      return { allowed: true, channel: 'reward', freeRemaining };
    }
    return { allowed: false, channel: 'reward', freeRemaining };
  },

  recordPremiumExportOpened(channel: RewardUnlockChannel): void {
    if (!isAdEnabled || channel === 'off') return;
    const state = ensureTodayState();
    if (channel === 'reward') {
      state.premiumExportRewardCredits = Math.max(0, state.premiumExportRewardCredits - 1);
    }
    saveState(state);
    track('premium_export_opened', { channel, adMode: monetizationConfig.adMode });
  },

  grantPremiumExportRewardCredit(): void {
    if (!isAdEnabled) return;
    const state = ensureTodayState();
    state.premiumExportRewardCredits += 1;
    saveState(state);
    track('reward_granted', { type: 'premium_export_credit', totalCredits: state.premiumExportRewardCredits });
  },

  getAiCutoutDecision(): { allowed: boolean; channel: RewardUnlockChannel; creditsRemaining: number } {
    if (!isAdEnabled) {
      return { allowed: true, channel: 'off', creditsRemaining: 999 };
    }

    const state = ensureTodayState();
    if (state.aiCutoutRewardCredits > 0) {
      return { allowed: true, channel: 'reward', creditsRemaining: state.aiCutoutRewardCredits };
    }

    return { allowed: false, channel: 'reward', creditsRemaining: 0 };
  },

  recordAiCutoutOpened(channel: RewardUnlockChannel): void {
    if (!isAdEnabled || channel === 'off') return;
    const state = ensureTodayState();
    if (channel === 'reward') {
      state.aiCutoutRewardCredits = Math.max(0, state.aiCutoutRewardCredits - 1);
    }
    saveState(state);
    track('ai_cutout_opened', { channel, adMode: monetizationConfig.adMode });
  },

  grantAiCutoutRewardCredit(): void {
    if (!isAdEnabled) return;
    const state = ensureTodayState();
    state.aiCutoutRewardCredits += 1;
    saveState(state);
    track('reward_granted', { type: 'ai_cutout_credit', totalCredits: state.aiCutoutRewardCredits });
  },

  // Backward-compatible wrappers
  getHdExportDecision() {
    return this.getPremiumExportDecision();
  },
  recordHdExportOpened(channel: RewardUnlockChannel) {
    this.recordPremiumExportOpened(channel);
  },
  grantHdExportRewardCredit() {
    this.grantPremiumExportRewardCredit();
  },

  trackAdImpression(placement: string): void {
    if (!isAdEnabled) return;
    track('ad_impression', { placement, adMode: monetizationConfig.adMode });
  },

  trackAdClick(placement: string): void {
    if (!isAdEnabled) return;
    track('ad_click', { placement, adMode: monetizationConfig.adMode });
  },

  async playRewardedAd(): Promise<RewardAdResult> {
    if (!isAdEnabled) return 'failed';

    // 抖音端优先调用真实激励广告 API，H5 环境自动降级。
    if (monetizationConfig.adMode === 'douyin') {
      const unitId = monetizationConfig.douyin.rewardedUnitId;
      if (!unitId) {
        track('reward_ad_no_fill', { reason: 'missing_unit_id' });
        return 'no_fill';
      }

      try {
        const tt = (globalThis as any)?.tt;
        if (!tt || typeof tt.createRewardedVideoAd !== 'function') {
          track('reward_ad_no_fill', { reason: 'tt_unavailable' });
          return 'no_fill';
        }

        const rewarded = tt.createRewardedVideoAd({ adUnitId: unitId });
        await rewarded.load();
        await rewarded.show();

        return await new Promise<RewardAdResult>((resolve) => {
          let settled = false;
          const done = (v: RewardAdResult) => {
            if (!settled) {
              settled = true;
              resolve(v);
            }
          };

          rewarded.onClose((res: { isEnded?: boolean } | undefined) => {
            done(res?.isEnded ? 'completed' : 'closed');
          });
          rewarded.onError(() => done('failed'));
          setTimeout(() => done('failed'), 15000);
        });
      } catch (error) {
        track('reward_ad_error', { message: (error as Error)?.message || 'unknown' });
        return 'failed';
      }
    }

    // web/mock 阶段沿用本地倒计时逻辑，让 UI 层回退处理。
    return 'no_fill';
  },
};
