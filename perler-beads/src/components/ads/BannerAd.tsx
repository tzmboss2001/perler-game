import React, { useEffect } from 'react';
import { monetizationConfig } from '../../config/monetization';
import { adService } from '../../services/adService';

type BannerPlacement = 'create_inline' | 'making_bottom';

interface BannerAdProps {
  placement: BannerPlacement;
}

const placementLabel: Record<BannerPlacement, string> = {
  create_inline: '创作页推荐广告',
  making_bottom: '制作页工具广告',
};

const placementSlot: Record<BannerPlacement, string> = {
  create_inline: monetizationConfig.adsense.slots.createInline,
  making_bottom: monetizationConfig.adsense.slots.makingBottom,
};

const BannerAd: React.FC<BannerAdProps> = ({ placement }) => {
  const mode = monetizationConfig.adMode;
  const slot = placementSlot[placement];
  const clientId = monetizationConfig.adsense.clientId;

  useEffect(() => {
    adService.trackAdImpression(placement);
  }, [placement]);

  useEffect(() => {
    if (mode !== 'adsense' || !clientId || !slot) return;
    const scriptId = 'adsbygoogle-js';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }
  }, [mode, clientId, slot]);

  useEffect(() => {
    if (mode !== 'adsense' || !clientId || !slot) return;
    try {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
    } catch {
      // Ignore ad render failure to avoid blocking page flow.
    }
  }, [mode, clientId, slot, placement]);

  if (mode === 'off') return null;

  // 抖音小程序由宿主原生广告组件承载，H5 回退为说明占位。
  if (mode === 'douyin') {
    return (
      <div
        style={styles.mock}
        onClick={() => adService.trackAdClick(placement)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') adService.trackAdClick(placement);
        }}
      >
        <span style={styles.badge}>广告</span>
        <span style={styles.text}>{placementLabel[placement]}</span>
        <span style={styles.subText}>抖音端将展示真实横幅广告</span>
      </div>
    );
  }

  if (mode === 'adsense' && clientId && slot) {
    return (
      <div style={styles.wrap}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={clientId}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  return (
    <div
      style={styles.mock}
      onClick={() => adService.trackAdClick(placement)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') adService.trackAdClick(placement);
      }}
    >
      <span style={styles.badge}>广告</span>
      <span style={styles.text}>{placementLabel[placement]}</span>
      <span style={styles.subText}>广告收益将用于维持免费功能</span>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 8,
    minHeight: 56,
  },
  mock: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px dashed rgba(108,200,173,0.6)',
    background: 'linear-gradient(135deg, rgba(108,200,173,0.16), rgba(107,154,212,0.14))',
    cursor: 'pointer',
    marginTop: 8,
    marginBottom: 8,
  },
  badge: {
    fontSize: 11,
    fontWeight: 700,
    color: '#6cc8ad',
    border: '1px solid rgba(108,200,173,0.6)',
    borderRadius: 999,
    padding: '2px 8px',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
  },
  text: {
    fontSize: 13,
    color: '#d8deef',
    fontWeight: 600,
  },
  subText: {
    fontSize: 12,
    color: '#9fb1c8',
    marginLeft: 'auto',
  },
};

export default BannerAd;
