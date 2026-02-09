/**
 * FailureEngine - 翻车计算引擎
 * 5种失败类型判定 + 翻车报告生成
 */

import type { Bead, FailureType, FailureReport, IroningParams } from '@/types/game';
import type { BeadBoard } from './BeadBoard';
import { calcUniformity } from './RiskCalculator';

/**
 * 判定失败类型
 */
export function determineFailure(
  riskScore: number,
  params: IroningParams,
): FailureType | null {
  // 风险值低于 20 = 成功
  if (riskScore < 20) return null;

  const { temperature, duration, trajectory } = params;

  // 半生不熟：低温或时间太短
  if (temperature < 4 || duration < 2) {
    return 'undercooked';
  }

  // 整体塌陷：高温 + 长时间（优先级高于单纯高温）
  if (temperature > 8 && duration > 8) {
    return 'collapse';
  }

  // 颜色烧焦：高温
  if (temperature > 8) {
    return 'burned';
  }

  // 局部融化：轨迹不均匀
  // 用一个假的宽高来计算均匀度（实际宽高在外面，这里用轨迹点的范围估算）
  if (trajectory.length > 0) {
    const maxX = Math.max(...trajectory.map((p) => p.x), 1);
    const maxY = Math.max(...trajectory.map((p) => p.y), 1);
    const uniformity = calcUniformity(trajectory, Math.ceil(maxX) + 1, Math.ceil(maxY) + 1);
    if (uniformity < 0.5) {
      return 'partial_melt';
    }
  }

  // 粘连拉扯：默认失败
  return 'sticky';
}

/**
 * 将失败效果应用到画板上的拼豆
 * 返回受影响的拼豆列表
 */
export function applyFailureToBoard(
  board: BeadBoard,
  failureType: FailureType,
  params: IroningParams,
): Bead[] {
  const allBeads = board.getAllBeads();
  if (allBeads.length === 0) return [];

  const affected: Bead[] = [];
  const intensity = Math.min(params.temperature / 10, 1);

  switch (failureType) {
    case 'undercooked':
      // 半生不熟：所有拼豆保持 raw，不融合
      // 标记部分拼豆状态
      for (const bead of allBeads) {
        bead.state = 'raw'; // 保持原样
        affected.push(bead);
      }
      break;

    case 'partial_melt': {
      // 局部融化：只有轨迹覆盖区域的拼豆融化
      const trajectorySet = new Set<string>();
      for (const p of params.trajectory) {
        for (let dx = -2; dx <= 2; dx++) {
          for (let dy = -2; dy <= 2; dy++) {
            trajectorySet.add(`${Math.floor(p.x) + dx},${Math.floor(p.y) + dy}`);
          }
        }
      }
      for (const bead of allBeads) {
        if (trajectorySet.has(`${bead.x},${bead.y}`)) {
          bead.state = 'melted';
          affected.push(bead);
        }
      }
      break;
    }

    case 'collapse':
      // 整体塌陷：所有拼豆变形
      for (const bead of allBeads) {
        bead.state = 'collapsed';
        affected.push(bead);
      }
      break;

    case 'burned':
      // 颜色烧焦：所有拼豆变色
      for (const bead of allBeads) {
        bead.state = 'burned';
        bead.color = applyBurnColor(bead.color, intensity);
        affected.push(bead);
      }
      break;

    case 'sticky':
      // 粘连拉扯：随机拼豆位移
      for (const bead of allBeads) {
        if (Math.random() < 0.4) {
          bead.state = 'melted';
          affected.push(bead);
        }
      }
      break;
  }

  return affected;
}

/**
 * 烧焦颜色偏移：向黄褐色偏移
 */
function applyBurnColor(hex: string, intensity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const nr = Math.min(255, r + Math.round(intensity * 40));
  const ng = Math.max(0, g - Math.round(intensity * 30));
  const nb = Math.max(0, b - Math.round(intensity * 50));

  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

// ============ 翻车报告文案 ============

const FAILURE_TITLES: Record<FailureType, string[]> = {
  undercooked: [
    '半生不熟！',
    '还差点火候...',
    '这...还是生的？',
    '温度不够啊朋友！',
  ],
  partial_melt: [
    '局部融化了！',
    '有的熟了有的没熟',
    '受热不均匀',
    '你只烫了一半？',
  ],
  collapse: [
    '塌了！全塌了！',
    '一坨烂泥...',
    '面目全非',
    '这也太猛了吧！',
  ],
  burned: [
    '烧焦了！',
    '闻到焦味了吗？',
    '碳烤拼豆？',
    '黑暗料理诞生！',
  ],
  sticky: [
    '粘住了！撕不开！',
    '变形金刚？',
    '面目全非',
    '拉丝芝士效果',
  ],
};

const FAILURE_DESCRIPTIONS: Record<FailureType, string[]> = {
  undercooked: [
    '拼豆没有完全融合，像是拼了个拼图但没胶水。一碰就散架...',
    '温度太低或者时间太短了，拼豆之间还在各过各的生活。',
  ],
  partial_melt: [
    '中间已经变形了，但边上的豆子还在坚持自我。熨斗要全面照顾到哦！',
    '你的熨斗偏心了！有些地方烫得太多，有些地方根本没碰到。',
  ],
  collapse: [
    '高温+长时间 = 一坨塑料泥。曾经的作品已经面目全非了...',
    '你把拼豆变成了一张塑料饼。下次温柔一点！',
  ],
  burned: [
    '颜色都变了！鲜艳的拼豆变成了复古色调...但这不是你想要的复古。',
    '焦了焦了！颜色往黄褐色偏移了。下次控制一下温度！',
  ],
  sticky: [
    '揭开的时候拉出了丝...拼豆之间互相粘连，作品被拉变形了。',
    '揭的时候手太快了！粘连在一起的拼豆被撕扯得七零八落。',
  ],
};

const FAILURE_TIPS: Record<FailureType, string[]> = {
  undercooked: [
    '温度调到5-7之间最佳',
    '至少烫3-5秒才够',
    '不用怕烫坏，大胆一点！',
  ],
  partial_melt: [
    '熨斗要覆盖整个画面',
    '匀速移动不要太快',
    '注意边角也要照顾到',
  ],
  collapse: [
    '温度不要超过8！',
    '时间控制在3-7秒',
    '高温的话时间要更短',
  ],
  burned: [
    '温度降到6-7',
    '高温适合短时间快烫',
    '颜色浅的珠子更容易焦',
  ],
  sticky: [
    '等稍微冷却再揭开',
    '速度均匀一点',
    '试试调整压力和速度',
  ],
};

const SUCCESS_TITLES = [
  '完美！',
  '大师级作品！',
  '太漂亮了！',
  '一次就成功！',
];

const SUCCESS_DESCRIPTIONS = [
  '拼豆完美融合，颜色鲜艳，形状完整。这就是传说中的一次成功！',
  '温度刚好，时间到位，手法均匀。你是天生的拼豆大师！',
];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 生成翻车/成功报告
 */
export function generateReport(
  success: boolean,
  failureType: FailureType | null | undefined,
  riskScore: number,
  _params: IroningParams,
): FailureReport {
  if (success) {
    return {
      title: randomPick(SUCCESS_TITLES),
      description: randomPick(SUCCESS_DESCRIPTIONS),
      tips: ['继续保持！', '可以挑战更大的画板了'],
      score: Math.round(Math.max(80, 100 - riskScore)),
    };
  }

  const ft = failureType!;
  return {
    title: randomPick(FAILURE_TITLES[ft]),
    description: randomPick(FAILURE_DESCRIPTIONS[ft]),
    tips: FAILURE_TIPS[ft],
    score: Math.round(Math.max(0, Math.min(60, 80 - riskScore))),
  };
}
