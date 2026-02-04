import { FeaturedWork } from '../components/FeaturedCarousel';
import { colors } from '../styles/designSystem';

// 重新导出类型供外部使用
export type { FeaturedWork };

/**
 * 生成像素图案的 Data URL
 * 用于在没有真实图片时显示示例作品
 */
const generatePixelPattern = (
  gridWidth: number,
  gridHeight: number,
  pattern: number[][],
  colorPalette: string[]
): string => {
  const cellSize = 8;
  const canvas = document.createElement('canvas');
  canvas.width = gridWidth * cellSize;
  canvas.height = gridHeight * cellSize;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  // 背景色
  ctx.fillStyle = '#2d2f42';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 绘制像素
  for (let y = 0; y < gridHeight && y < pattern.length; y++) {
    for (let x = 0; x < gridWidth && x < pattern[y].length; x++) {
      const colorIndex = pattern[y][x];
      if (colorIndex >= 0 && colorIndex < colorPalette.length) {
        ctx.fillStyle = colorPalette[colorIndex];
        ctx.beginPath();
        ctx.arc(
          x * cellSize + cellSize / 2,
          y * cellSize + cellSize / 2,
          cellSize / 2 - 1,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
  }

  return canvas.toDataURL('image/png');
};

// 皮卡丘像素图案 (简化版 16x16)
const pikachuPattern = [
  [-1,-1,-1,-1,-1, 0, 0,-1,-1,-1,-1, 0, 0,-1,-1,-1],
  [-1,-1,-1,-1, 0, 0, 0, 0,-1,-1, 0, 0, 0, 0,-1,-1],
  [-1,-1,-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1],
  [-1,-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [-1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
  [-1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0,-1],
  [-1, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0,-1],
  [-1,-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1,-1],
  [-1,-1, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0,-1,-1],
  [-1,-1,-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1,-1,-1],
  [-1,-1,-1,-1, 0, 0, 0, 0, 0, 0, 0, 0,-1,-1,-1,-1],
  [-1,-1,-1,-1,-1, 0, 0, 0, 0, 0, 0,-1,-1,-1,-1,-1],
  [-1,-1,-1,-1,-1,-1, 0, 0, 0, 0,-1,-1,-1,-1,-1,-1],
  [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
  [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
];
const pikachuColors = ['#ffe066', '#2d2f42', '#ff6b7a', '#ff8ec4'];

// 马里奥像素图案 (简化版 16x16)
const marioPattern = [
  [-1,-1,-1,-1,-1, 0, 0, 0, 0, 0, 0,-1,-1,-1,-1,-1],
  [-1,-1,-1,-1, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1,-1,-1],
  [-1,-1,-1,-1, 1, 1, 1, 2, 2, 1, 2,-1,-1,-1,-1,-1],
  [-1,-1,-1, 1, 2, 1, 2, 2, 2, 1, 2, 2, 2,-1,-1,-1],
  [-1,-1,-1, 1, 2, 1, 1, 2, 2, 2, 1, 2, 2, 2,-1,-1],
  [-1,-1,-1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 1,-1,-1,-1],
  [-1,-1,-1,-1,-1, 2, 2, 2, 2, 2, 2, 2,-1,-1,-1,-1],
  [-1,-1,-1,-1, 1, 1, 0, 1, 1, 1,-1,-1,-1,-1,-1,-1],
  [-1,-1,-1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1,-1,-1,-1],
  [-1,-1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1,-1,-1],
  [-1,-1, 2, 2, 1, 0, 3, 0, 0, 3, 0, 1, 2, 2,-1,-1],
  [-1,-1, 2, 2, 2, 0, 0, 0, 0, 0, 0, 2, 2, 2,-1,-1],
  [-1,-1, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2,-1,-1],
  [-1,-1,-1,-1, 0, 0, 0,-1,-1, 0, 0, 0,-1,-1,-1,-1],
  [-1,-1,-1, 1, 1, 1,-1,-1,-1,-1, 1, 1, 1,-1,-1,-1],
  [-1,-1, 1, 1, 1, 1,-1,-1,-1,-1, 1, 1, 1, 1,-1,-1],
];
const marioColors = ['#ff6b7a', '#8b4513', '#ffdfba', '#6bcfff'];

// 小猫咪像素图案 (16x16)
const catPattern = [
  [-1,-1,-1, 0,-1,-1,-1,-1,-1,-1,-1,-1, 0,-1,-1,-1],
  [-1,-1, 0, 0, 0,-1,-1,-1,-1,-1,-1, 0, 0, 0,-1,-1],
  [-1, 0, 0, 0, 0, 0,-1,-1,-1,-1, 0, 0, 0, 0, 0,-1],
  [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1],
  [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1],
  [-1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0,-1],
  [-1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0,-1],
  [-1, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0,-1],
  [-1, 0, 0, 0, 0, 0, 3, 0, 3, 0, 0, 0, 0, 0, 0,-1],
  [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1],
  [-1,-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1,-1],
  [-1,-1,-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1,-1,-1],
  [-1,-1,-1,-1, 0, 0, 0, 0, 0, 0, 0, 0,-1,-1,-1,-1],
  [-1,-1,-1,-1,-1, 0, 0, 0, 0, 0, 0,-1,-1,-1,-1,-1],
  [-1,-1,-1,-1,-1,-1, 0, 0, 0, 0,-1,-1,-1,-1,-1,-1],
  [-1,-1,-1,-1,-1,-1,-1, 0, 0,-1,-1,-1,-1,-1,-1,-1],
];
const catColors = ['#ffb347', '#2d2f42', '#ff8ec4', '#ffffff'];

// 樱花树像素图案 (16x16)
const sakuraPattern = [
  [-1,-1,-1,-1,-1, 0, 0, 0, 0, 0, 0,-1,-1,-1,-1,-1],
  [-1,-1,-1,-1, 0, 0, 0, 0, 0, 0, 0, 0,-1,-1,-1,-1],
  [-1,-1,-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1,-1,-1],
  [-1,-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1,-1],
  [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1],
  [-1,-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1,-1],
  [-1,-1,-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1,-1,-1],
  [-1,-1,-1,-1,-1,-1,-1, 1, 1,-1,-1,-1,-1,-1,-1,-1],
  [-1,-1,-1,-1,-1,-1,-1, 1, 1,-1,-1,-1,-1,-1,-1,-1],
  [-1,-1,-1,-1,-1,-1,-1, 1, 1,-1,-1,-1,-1,-1,-1,-1],
  [-1,-1,-1,-1,-1,-1,-1, 1, 1,-1,-1,-1,-1,-1,-1,-1],
  [-1,-1,-1,-1,-1,-1, 1, 1, 1, 1,-1,-1,-1,-1,-1,-1],
  [-1,-1,-1,-1,-1, 2, 2, 2, 2, 2, 2,-1,-1,-1,-1,-1],
];
const sakuraColors = ['#ffb3ba', '#8b4513', '#7ed6a5'];

// 爱心像素图案 (16x16)
const heartPattern = [
  [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
  [-1,-1, 0, 0, 0,-1,-1,-1,-1,-1, 0, 0, 0,-1,-1,-1],
  [-1, 0, 0, 0, 0, 0,-1,-1,-1, 0, 0, 0, 0, 0,-1,-1],
  [ 0, 0, 0, 0, 0, 0, 0,-1, 0, 0, 0, 0, 0, 0, 0,-1],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1],
  [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1,-1],
  [-1,-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1,-1,-1],
  [-1,-1,-1, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1,-1,-1,-1],
  [-1,-1,-1,-1, 0, 0, 0, 0, 0, 0, 0,-1,-1,-1,-1,-1],
  [-1,-1,-1,-1,-1, 0, 0, 0, 0, 0,-1,-1,-1,-1,-1,-1],
  [-1,-1,-1,-1,-1,-1, 0, 0, 0,-1,-1,-1,-1,-1,-1,-1],
  [-1,-1,-1,-1,-1,-1,-1, 0,-1,-1,-1,-1,-1,-1,-1,-1],
  [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
  [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
];
const heartColors = ['#ff6b7a'];

/**
 * 获取精选作品列表
 * 如果浏览器环境支持 Canvas，则生成像素图案
 */
export const getFeaturedWorks = (): FeaturedWork[] => {
  // 检查是否在浏览器环境
  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

  const works: FeaturedWork[] = [
    {
      id: 'pikachu',
      title: '皮卡丘',
      imageUrl: isBrowser ? generatePixelPattern(16, 16, pikachuPattern, pikachuColors) : '',
      beadCount: 180,
      gridSize: '16x16',
      difficulty: 'easy',
      isOfficial: true,
      category: 'cartoon',
    },
    {
      id: 'mario',
      title: '超级马里奥',
      imageUrl: isBrowser ? generatePixelPattern(16, 16, marioPattern, marioColors) : '',
      beadCount: 196,
      gridSize: '16x16',
      difficulty: 'medium',
      isOfficial: true,
      category: 'game',
    },
    {
      id: 'cat',
      title: '可爱小猫',
      imageUrl: isBrowser ? generatePixelPattern(16, 16, catPattern, catColors) : '',
      beadCount: 168,
      gridSize: '16x16',
      difficulty: 'easy',
      isOfficial: true,
      category: 'animal',
    },
    {
      id: 'sakura',
      title: '樱花树',
      imageUrl: isBrowser ? generatePixelPattern(16, 16, sakuraPattern, sakuraColors) : '',
      beadCount: 142,
      gridSize: '16x16',
      difficulty: 'medium',
      isOfficial: true,
      category: 'landscape',
    },
    {
      id: 'heart',
      title: '爱心图案',
      imageUrl: isBrowser ? generatePixelPattern(16, 16, heartPattern, heartColors) : '',
      beadCount: 98,
      gridSize: '16x16',
      difficulty: 'easy',
      isOfficial: true,
      category: 'other',
    },
  ];

  return works;
};

// 导出默认精选作品（延迟生成，避免 SSR 问题）
let cachedWorks: FeaturedWork[] | null = null;

export const featuredWorks = (): FeaturedWork[] => {
  if (!cachedWorks) {
    cachedWorks = getFeaturedWorks();
  }
  return cachedWorks;
};

export default featuredWorks;
