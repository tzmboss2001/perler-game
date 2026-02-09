/**
 * ColorPalette - 颜色选择器组件
 * 显示拼豆颜色列表，支持品牌筛选
 */

import { useState, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { perlerColors, hamaColors, artkalColors } from '@/data/beadColors';
import type { BeadColor } from '@/data/beadColors';
import './ColorPalette.css';

type BrandFilter = 'all' | 'perler' | 'hama' | 'artkal';

export default function ColorPalette() {
  const [brand, setBrand] = useState<BrandFilter>('perler');
  const [expanded, setExpanded] = useState(false);
  const selectedColor = useGameStore((s) => s.selectedColor);
  const setSelectedColor = useGameStore((s) => s.setSelectedColor);

  const colors = useMemo((): BeadColor[] => {
    switch (brand) {
      case 'perler': return perlerColors;
      case 'hama': return hamaColors;
      case 'artkal': return artkalColors;
      default: return [...perlerColors, ...hamaColors, ...artkalColors];
    }
  }, [brand]);

  const handleSelect = (color: BeadColor) => {
    setSelectedColor(color.hex, color.id);
  };

  return (
    <div className={`color-palette ${expanded ? 'expanded' : ''}`}>
      <div className="palette-header" onClick={() => setExpanded(!expanded)}>
        <div className="palette-preview">
          <div
            className="current-color"
            style={{ backgroundColor: selectedColor }}
          />
          <span className="palette-label">
            {expanded ? '收起颜色' : '选择颜色'}
          </span>
        </div>
        <div className="palette-toggle">{expanded ? '▼' : '▲'}</div>
      </div>

      {expanded && (
        <>
          <div className="brand-tabs">
            {(['perler', 'hama', 'artkal'] as const).map((b) => (
              <button
                key={b}
                className={`brand-tab ${brand === b ? 'active' : ''}`}
                onClick={() => setBrand(b)}
              >
                {b === 'perler' ? 'Perler' : b === 'hama' ? 'Hama' : 'Artkal'}
              </button>
            ))}
          </div>
          <div className="color-grid">
            {colors.map((c) => (
              <button
                key={c.id}
                className={`color-cell ${selectedColor === c.hex ? 'selected' : ''}`}
                style={{ backgroundColor: c.hex }}
                onClick={() => handleSelect(c)}
                title={c.nameCN}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
