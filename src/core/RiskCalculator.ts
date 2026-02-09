/**
 * RiskCalculator - 风险值计算器
 *
 * 风险值 = 温度风险 × 0.4 + 时间偏差 × 0.3 + 轨迹不均 × 0.3
 */

import type { Point } from '@/types/game';

// 最佳参数
const OPTIMAL_TEMP = 6;
const OPTIMAL_TIME = 5; // 秒

/**
 * 计算温度风险 (0-100)
 * 偏离最佳温度越远，风险越高
 */
export function calcTemperatureRisk(temperature: number): number {
  const diff = Math.abs(temperature - OPTIMAL_TEMP);
  return Math.min((diff / 10) * 100, 100);
}

/**
 * 计算时间风险 (0-100)
 * 过长或过短都有风险
 */
export function calcTimeRisk(duration: number): number {
  const diff = Math.abs(duration - OPTIMAL_TIME);
  return Math.min((diff / OPTIMAL_TIME) * 100, 100);
}

/**
 * 计算轨迹覆盖率 (0-1)
 * 轨迹点覆盖了画布的多少区域
 */
export function calcCoverage(
  trajectory: Point[],
  boardWidth: number,
  boardHeight: number,
): number {
  if (trajectory.length === 0) return 0;

  const visited = new Set<string>();

  for (const p of trajectory) {
    // 每个轨迹点影响周围 3×3 区域
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cx = Math.floor(p.x) + dx;
        const cy = Math.floor(p.y) + dy;
        if (cx >= 0 && cx < boardWidth && cy >= 0 && cy < boardHeight) {
          visited.add(`${cx},${cy}`);
        }
      }
    }
  }

  const totalCells = boardWidth * boardHeight;
  return visited.size / totalCells;
}

/**
 * 计算轨迹均匀度 (0-1)
 * 衡量轨迹是否均匀覆盖整个画布
 */
export function calcUniformity(
  trajectory: Point[],
  boardWidth: number,
  boardHeight: number,
): number {
  if (trajectory.length < 2) return 0;

  // 将画布分成 4×4 的区域
  const gridW = 4;
  const gridH = 4;
  const cellW = boardWidth / gridW;
  const cellH = boardHeight / gridH;
  const counts = new Array(gridW * gridH).fill(0);

  for (const p of trajectory) {
    const gx = Math.min(Math.floor(p.x / cellW), gridW - 1);
    const gy = Math.min(Math.floor(p.y / cellH), gridH - 1);
    if (gx >= 0 && gy >= 0) {
      counts[gy * gridW + gx]++;
    }
  }

  // 计算覆盖的区域数
  const coveredCells = counts.filter((c) => c > 0).length;
  const totalGrid = gridW * gridH;

  // 计算变异系数（标准差/平均值）
  const nonZeroCounts = counts.filter((c) => c > 0);
  if (nonZeroCounts.length <= 1) return coveredCells / totalGrid * 0.5;

  const mean = nonZeroCounts.reduce((a, b) => a + b, 0) / nonZeroCounts.length;
  const variance = nonZeroCounts.reduce((sum, c) => sum + (c - mean) ** 2, 0) / nonZeroCounts.length;
  const cv = Math.sqrt(variance) / mean;

  // 覆盖率和均匀度各占一半
  const coverageScore = coveredCells / totalGrid;
  const uniformScore = Math.max(0, 1 - cv);

  return coverageScore * 0.5 + uniformScore * 0.5;
}

/**
 * 计算轨迹风险 (0-100)
 */
export function calcTrajectoryRisk(
  trajectory: Point[],
  boardWidth: number,
  boardHeight: number,
): number {
  const coverage = calcCoverage(trajectory, boardWidth, boardHeight);
  const uniformity = calcUniformity(trajectory, boardWidth, boardHeight);
  return (1 - coverage * 0.5 - uniformity * 0.5) * 100;
}

/**
 * 计算综合风险值 (0-100)
 */
export function calculateRisk(
  temperature: number,
  duration: number,
  trajectory: Point[],
  boardWidth: number,
  boardHeight: number,
): number {
  const tempRisk = calcTemperatureRisk(temperature);
  const timeRisk = calcTimeRisk(duration);
  const trajRisk = calcTrajectoryRisk(trajectory, boardWidth, boardHeight);

  return tempRisk * 0.4 + timeRisk * 0.3 + trajRisk * 0.3;
}
