export type AdMode = 'off' | 'mock' | 'adsense' | 'douyin';

const rawMode = (import.meta.env.VITE_AD_MODE || '').toLowerCase();

function resolveAdMode(): AdMode {
  if (rawMode === 'adsense' || rawMode === 'mock' || rawMode === 'off' || rawMode === 'douyin') {
    return rawMode;
  }
  return import.meta.env.DEV ? 'mock' : 'off';
}

export const monetizationConfig = {
  adMode: resolveAdMode(),
  adsense: {
    clientId: import.meta.env.VITE_ADSENSE_CLIENT_ID || '',
    slots: {
      createInline: import.meta.env.VITE_ADSENSE_SLOT_CREATE_INLINE || '',
      makingBottom: import.meta.env.VITE_ADSENSE_SLOT_MAKING_BOTTOM || '',
    },
  },
  douyin: {
    rewardedUnitId: import.meta.env.VITE_DOUYIN_REWARDED_AD_UNIT_ID || '',
    banner: {
      createInline: import.meta.env.VITE_DOUYIN_BANNER_CREATE_INLINE_ID || '',
      makingBottom: import.meta.env.VITE_DOUYIN_BANNER_MAKING_BOTTOM_ID || '',
    },
  },
  rewardRules: {
    hdExportFreePerDay: Number(import.meta.env.VITE_HD_EXPORT_FREE_PER_DAY || 1),
  },
} as const;

export const isAdEnabled = monetizationConfig.adMode !== 'off';
