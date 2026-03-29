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
  const showDevPlaceholder = import.meta.env.DEV && mode === 'off';

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

  if (showDevPlaceholder) {
    return (
      <div style={styles.placeholder}>
        <span style={styles.placeholderBadge}>广告位</span>
        <span style={styles.placeholderText}>{placementLabel[placement]}</span>
        <span style={styles.placeholderSubText}>当前为开发环境占位，抖音端将替换成真实广告</span>
      </div>
    );
  }

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
  placeholder: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    borderRadius: 16,
    border: '1px solid rgba(255, 184, 135, 0.45)',
    background:
      'linear-gradient(135deg, rgba(255,250,244,0.96), rgba(255,239,226,0.94))',
    boxShadow: '0 12px 26px rgba(255, 188, 154, 0.14)',
    marginTop: 8,
    marginBottom: 8,
  },
  placeholderBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: '#c56a2d',
    border: '1px solid rgba(234, 153, 85, 0.45)',
    background: 'rgba(255,255,255,0.74)',
    borderRadius: 999,
    padding: '2px 8px',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
  },
  placeholderText: {
    fontSize: 13,
    color: '#57476b',
    fontWeight: 700,
  },
  placeholderSubText: {
    fontSize: 12,
    color: '#8b7b9d',
    marginLeft: 'auto',
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
