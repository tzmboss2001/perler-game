/**
 * 内置模板数据
 * 10 个像素画模板（硬编码拼豆坐标+颜色）
 */

import type { Template, TemplateCategory } from '@/types/game';

// 分类信息
export const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string }[] = [
  { id: 'shape', label: '图形' },
  { id: 'fruit', label: '水果' },
  { id: 'animal', label: '动物' },
  { id: 'character', label: '角色' },
];

// 难度标签颜色
export const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  easy: { label: '简单', color: '#38ef7d' },
  medium: { label: '中等', color: '#f5af19' },
  hard: { label: '困难', color: '#f5576c' },
};

// 辅助函数：批量生成拼豆数据
function b(x: number, y: number, color: string, colorId: string) {
  return { x, y, color, colorId };
}

// 常用颜色快捷引用
const C = {
  red: { hex: '#b0353c', id: '80-19005' },
  darkRed: { hex: '#9d2b3a', id: '80-15961' },
  pink: { hex: '#d8729a', id: '80-19006' },
  lightPink: { hex: '#f2afb7', id: '80-15203' },
  orange: { hex: '#eb7b31', id: '80-19004' },
  yellow: { hex: '#e7ce3e', id: '80-19003' },
  green: { hex: '#008f53', id: '80-15199' },
  darkGreen: { hex: '#305545', id: '80-15179' },
  lightGreen: { hex: '#69c04f', id: '80-19011' },
  blue: { hex: '#0e5092', id: '80-19008' },
  lightBlue: { hex: '#4ac0d8', id: '80-15216' },
  white: { hex: '#eaefee', id: '80-19001' },
  black: { hex: '#373737', id: '80-19017' },
  brown: { hex: '#7b5330', id: '80-19012' },
  lightBrown: { hex: '#c9a385', id: '80-15205' },
  grey: { hex: '#94a19d', id: '80-15206' },
  cream: { hex: '#e1e2bb', id: '80-19002' },
  purple: { hex: '#684b86', id: '80-19007' },
};

// ===== 1. 红心 (8x8, easy, shape) =====
const heartBeads = [
  // Row 1
  b(1, 1, C.red.hex, C.red.id), b(2, 1, C.red.hex, C.red.id),
  b(4, 1, C.red.hex, C.red.id), b(5, 1, C.red.hex, C.red.id),
  // Row 2
  b(0, 2, C.red.hex, C.red.id), b(1, 2, C.red.hex, C.red.id), b(2, 2, C.red.hex, C.red.id), b(3, 2, C.red.hex, C.red.id),
  b(4, 2, C.red.hex, C.red.id), b(5, 2, C.red.hex, C.red.id), b(6, 2, C.red.hex, C.red.id),
  // Row 3
  b(0, 3, C.red.hex, C.red.id), b(1, 3, C.red.hex, C.red.id), b(2, 3, C.red.hex, C.red.id), b(3, 3, C.red.hex, C.red.id),
  b(4, 3, C.red.hex, C.red.id), b(5, 3, C.red.hex, C.red.id), b(6, 3, C.red.hex, C.red.id),
  // Row 4
  b(1, 4, C.red.hex, C.red.id), b(2, 4, C.red.hex, C.red.id), b(3, 4, C.red.hex, C.red.id),
  b(4, 4, C.red.hex, C.red.id), b(5, 4, C.red.hex, C.red.id),
  // Row 5
  b(2, 5, C.red.hex, C.red.id), b(3, 5, C.red.hex, C.red.id), b(4, 5, C.red.hex, C.red.id),
  // Row 6
  b(3, 6, C.red.hex, C.red.id),
];

// ===== 2. 星星 (9x9, easy, shape) =====
const starBeads = [
  // 五角星形状
  b(4, 0, C.yellow.hex, C.yellow.id),
  b(4, 1, C.yellow.hex, C.yellow.id),
  b(3, 2, C.yellow.hex, C.yellow.id), b(4, 2, C.yellow.hex, C.yellow.id), b(5, 2, C.yellow.hex, C.yellow.id),
  b(0, 3, C.yellow.hex, C.yellow.id), b(1, 3, C.yellow.hex, C.yellow.id), b(2, 3, C.yellow.hex, C.yellow.id),
  b(3, 3, C.yellow.hex, C.yellow.id), b(4, 3, C.yellow.hex, C.yellow.id), b(5, 3, C.yellow.hex, C.yellow.id),
  b(6, 3, C.yellow.hex, C.yellow.id), b(7, 3, C.yellow.hex, C.yellow.id), b(8, 3, C.yellow.hex, C.yellow.id),
  b(1, 4, C.yellow.hex, C.yellow.id), b(2, 4, C.yellow.hex, C.yellow.id), b(3, 4, C.yellow.hex, C.yellow.id),
  b(4, 4, C.yellow.hex, C.yellow.id), b(5, 4, C.yellow.hex, C.yellow.id), b(6, 4, C.yellow.hex, C.yellow.id),
  b(7, 4, C.yellow.hex, C.yellow.id),
  b(2, 5, C.yellow.hex, C.yellow.id), b(3, 5, C.yellow.hex, C.yellow.id), b(4, 5, C.yellow.hex, C.yellow.id),
  b(5, 5, C.yellow.hex, C.yellow.id), b(6, 5, C.yellow.hex, C.yellow.id),
  b(2, 6, C.yellow.hex, C.yellow.id), b(3, 6, C.yellow.hex, C.yellow.id), b(5, 6, C.yellow.hex, C.yellow.id),
  b(6, 6, C.yellow.hex, C.yellow.id),
  b(1, 7, C.yellow.hex, C.yellow.id), b(2, 7, C.yellow.hex, C.yellow.id), b(6, 7, C.yellow.hex, C.yellow.id),
  b(7, 7, C.yellow.hex, C.yellow.id),
  b(0, 8, C.yellow.hex, C.yellow.id), b(1, 8, C.yellow.hex, C.yellow.id), b(7, 8, C.yellow.hex, C.yellow.id),
  b(8, 8, C.yellow.hex, C.yellow.id),
];

// ===== 3. 苹果 (10x10, easy, fruit) =====
const appleBeads: { x: number; y: number; color: string; colorId: string }[] = [];
// 苹果梗
[b(5, 0, C.brown.hex, C.brown.id), b(5, 1, C.brown.hex, C.brown.id)].forEach(p => appleBeads.push(p));
// 叶子
[b(6, 1, C.green.hex, C.green.id), b(7, 1, C.green.hex, C.green.id)].forEach(p => appleBeads.push(p));
// 苹果身体
const appleRows: [number, number[], string, string][] = [
  [2, [3, 4, 5, 6], C.red.hex, C.red.id],
  [3, [2, 3, 4, 5, 6, 7], C.red.hex, C.red.id],
  [4, [1, 2, 3, 4, 5, 6, 7, 8], C.red.hex, C.red.id],
  [5, [1, 2, 3, 4, 5, 6, 7, 8], C.red.hex, C.red.id],
  [6, [1, 2, 3, 4, 5, 6, 7, 8], C.red.hex, C.red.id],
  [7, [2, 3, 4, 5, 6, 7], C.red.hex, C.red.id],
  [8, [3, 4, 5, 6], C.red.hex, C.red.id],
];
appleRows.forEach(([y, xs, color, colorId]) => {
  xs.forEach(x => appleBeads.push(b(x, y, color, colorId)));
});
// 高光
appleBeads.push(b(3, 3, C.white.hex, C.white.id));
appleBeads.push(b(3, 4, C.white.hex, C.white.id));

// ===== 4. 笑脸 (8x8, easy, shape) =====
const smileyBeads: { x: number; y: number; color: string; colorId: string }[] = [];
// 圆脸轮廓和填充
const smileyRows: [number, number[]][] = [
  [0, [2, 3, 4, 5]],
  [1, [1, 2, 3, 4, 5, 6]],
  [2, [0, 1, 2, 3, 4, 5, 6, 7]],
  [3, [0, 1, 2, 3, 4, 5, 6, 7]],
  [4, [0, 1, 2, 3, 4, 5, 6, 7]],
  [5, [0, 1, 2, 3, 4, 5, 6, 7]],
  [6, [1, 2, 3, 4, 5, 6]],
  [7, [2, 3, 4, 5]],
];
smileyRows.forEach(([y, xs]) => {
  xs.forEach(x => smileyBeads.push(b(x, y, C.yellow.hex, C.yellow.id)));
});
// 眼睛（黑色覆盖）
[b(2, 2, C.black.hex, C.black.id), b(5, 2, C.black.hex, C.black.id)].forEach(p => smileyBeads.push(p));
// 嘴巴
[b(2, 5, C.black.hex, C.black.id), b(3, 5, C.black.hex, C.black.id),
  b(4, 5, C.black.hex, C.black.id), b(5, 5, C.black.hex, C.black.id),
  b(1, 4, C.black.hex, C.black.id), b(6, 4, C.black.hex, C.black.id)].forEach(p => smileyBeads.push(p));

// ===== 5. 小花 (10x10, easy, shape) =====
const flowerBeads: { x: number; y: number; color: string; colorId: string }[] = [];
// 花瓣（粉色）- 上
[b(4, 1, C.pink.hex, C.pink.id), b(5, 1, C.pink.hex, C.pink.id),
  b(3, 2, C.pink.hex, C.pink.id), b(4, 2, C.pink.hex, C.pink.id), b(5, 2, C.pink.hex, C.pink.id), b(6, 2, C.pink.hex, C.pink.id)
].forEach(p => flowerBeads.push(p));
// 花瓣 - 左右
[b(1, 3, C.pink.hex, C.pink.id), b(2, 3, C.pink.hex, C.pink.id), b(3, 3, C.pink.hex, C.pink.id),
  b(6, 3, C.pink.hex, C.pink.id), b(7, 3, C.pink.hex, C.pink.id), b(8, 3, C.pink.hex, C.pink.id),
  b(1, 4, C.pink.hex, C.pink.id), b(2, 4, C.pink.hex, C.pink.id), b(3, 4, C.pink.hex, C.pink.id),
  b(6, 4, C.pink.hex, C.pink.id), b(7, 4, C.pink.hex, C.pink.id), b(8, 4, C.pink.hex, C.pink.id),
].forEach(p => flowerBeads.push(p));
// 花瓣 - 下
[b(3, 5, C.pink.hex, C.pink.id), b(4, 5, C.pink.hex, C.pink.id), b(5, 5, C.pink.hex, C.pink.id), b(6, 5, C.pink.hex, C.pink.id),
  b(4, 6, C.pink.hex, C.pink.id), b(5, 6, C.pink.hex, C.pink.id),
].forEach(p => flowerBeads.push(p));
// 花心（黄色）
[b(4, 3, C.yellow.hex, C.yellow.id), b(5, 3, C.yellow.hex, C.yellow.id),
  b(4, 4, C.yellow.hex, C.yellow.id), b(5, 4, C.yellow.hex, C.yellow.id),
].forEach(p => flowerBeads.push(p));
// 花茎（绿色）
[b(4, 7, C.green.hex, C.green.id), b(5, 7, C.green.hex, C.green.id),
  b(4, 8, C.green.hex, C.green.id), b(5, 8, C.green.hex, C.green.id),
  b(4, 9, C.green.hex, C.green.id), b(5, 9, C.green.hex, C.green.id),
].forEach(p => flowerBeads.push(p));
// 叶子
[b(3, 8, C.green.hex, C.green.id), b(6, 7, C.green.hex, C.green.id)].forEach(p => flowerBeads.push(p));

// ===== 6. 蘑菇 (10x12, medium, shape) =====
const mushroomBeads: { x: number; y: number; color: string; colorId: string }[] = [];
// 蘑菇帽（红色）
const mushCapRows: [number, number[]][] = [
  [0, [3, 4, 5, 6]],
  [1, [2, 3, 4, 5, 6, 7]],
  [2, [1, 2, 3, 4, 5, 6, 7, 8]],
  [3, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]],
  [4, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]],
  [5, [1, 2, 3, 4, 5, 6, 7, 8]],
];
mushCapRows.forEach(([y, xs]) => {
  xs.forEach(x => mushroomBeads.push(b(x, y, C.red.hex, C.red.id)));
});
// 白色斑点
[b(4, 1, C.white.hex, C.white.id), b(5, 1, C.white.hex, C.white.id),
  b(2, 3, C.white.hex, C.white.id), b(3, 3, C.white.hex, C.white.id),
  b(6, 2, C.white.hex, C.white.id), b(7, 2, C.white.hex, C.white.id),
  b(4, 4, C.white.hex, C.white.id), b(5, 4, C.white.hex, C.white.id),
  b(7, 4, C.white.hex, C.white.id),
].forEach(p => mushroomBeads.push(p));
// 菌柄（浅棕色）
const mushStemRows: [number, number[]][] = [
  [6, [3, 4, 5, 6]],
  [7, [3, 4, 5, 6]],
  [8, [3, 4, 5, 6]],
  [9, [3, 4, 5, 6]],
  [10, [2, 3, 4, 5, 6, 7]],
  [11, [2, 3, 4, 5, 6, 7]],
];
mushStemRows.forEach(([y, xs]) => {
  xs.forEach(x => mushroomBeads.push(b(x, y, C.cream.hex, C.cream.id)));
});

// ===== 7. 小熊 (12x12, medium, animal) =====
const bearBeads: { x: number; y: number; color: string; colorId: string }[] = [];
const br = C.brown.hex; const brId = C.brown.id;
const lb = C.lightBrown.hex; const lbId = C.lightBrown.id;
const bk = C.black.hex; const bkId = C.black.id;
// 耳朵
[b(1, 0, br, brId), b(2, 0, br, brId), b(9, 0, br, brId), b(10, 0, br, brId),
  b(0, 1, br, brId), b(1, 1, lb, lbId), b(2, 1, br, brId), b(9, 1, br, brId), b(10, 1, lb, lbId), b(11, 1, br, brId),
  b(1, 2, br, brId), b(2, 2, br, brId), b(9, 2, br, brId), b(10, 2, br, brId),
].forEach(p => bearBeads.push(p));
// 头部
const bearHeadRows: [number, number[]][] = [
  [2, [3, 4, 5, 6, 7, 8]],
  [3, [2, 3, 4, 5, 6, 7, 8, 9]],
  [4, [2, 3, 4, 5, 6, 7, 8, 9]],
  [5, [2, 3, 4, 5, 6, 7, 8, 9]],
  [6, [3, 4, 5, 6, 7, 8]],
];
bearHeadRows.forEach(([y, xs]) => {
  xs.forEach(x => bearBeads.push(b(x, y, br, brId)));
});
// 脸部（浅棕覆盖）
[b(4, 4, lb, lbId), b(5, 4, lb, lbId), b(6, 4, lb, lbId), b(7, 4, lb, lbId),
  b(4, 5, lb, lbId), b(5, 5, lb, lbId), b(6, 5, lb, lbId), b(7, 5, lb, lbId),
].forEach(p => bearBeads.push(p));
// 眼睛
[b(4, 3, bk, bkId), b(7, 3, bk, bkId)].forEach(p => bearBeads.push(p));
// 鼻子
[b(5, 4, bk, bkId), b(6, 4, bk, bkId)].forEach(p => bearBeads.push(p));
// 嘴巴
[b(5, 5, bk, bkId), b(6, 5, bk, bkId)].forEach(p => bearBeads.push(p));
// 身体
const bearBodyRows: [number, number[]][] = [
  [7, [3, 4, 5, 6, 7, 8]],
  [8, [2, 3, 4, 5, 6, 7, 8, 9]],
  [9, [2, 3, 4, 5, 6, 7, 8, 9]],
  [10, [2, 3, 4, 5, 6, 7, 8, 9]],
  [11, [3, 4, 5, 6, 7, 8]],
];
bearBodyRows.forEach(([y, xs]) => {
  xs.forEach(x => bearBeads.push(b(x, y, br, brId)));
});
// 肚子
[b(5, 8, lb, lbId), b(6, 8, lb, lbId),
  b(4, 9, lb, lbId), b(5, 9, lb, lbId), b(6, 9, lb, lbId), b(7, 9, lb, lbId),
  b(5, 10, lb, lbId), b(6, 10, lb, lbId),
].forEach(p => bearBeads.push(p));

// ===== 8. 小猫 (12x12, medium, animal) =====
const catBeads: { x: number; y: number; color: string; colorId: string }[] = [];
const g = C.grey.hex; const gId = C.grey.id;
const w = C.white.hex; const wId = C.white.id;
// 耳朵（三角形）
[b(1, 0, g, gId), b(10, 0, g, gId),
  b(0, 1, g, gId), b(1, 1, g, gId), b(2, 1, g, gId), b(9, 1, g, gId), b(10, 1, g, gId), b(11, 1, g, gId),
  b(1, 1, C.pink.hex, C.pink.id), b(10, 1, C.pink.hex, C.pink.id), // 耳朵内部粉色
].forEach(p => catBeads.push(p));
// 头部
const catHeadRows: [number, number[]][] = [
  [2, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]],
  [3, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]],
  [4, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]],
  [5, [2, 3, 4, 5, 6, 7, 8, 9]],
  [6, [3, 4, 5, 6, 7, 8]],
];
catHeadRows.forEach(([y, xs]) => {
  xs.forEach(x => catBeads.push(b(x, y, g, gId)));
});
// 眼睛
[b(3, 3, C.lightGreen.hex, C.lightGreen.id), b(8, 3, C.lightGreen.hex, C.lightGreen.id),
  b(3, 3, bk, bkId), b(8, 3, bk, bkId), // 瞳孔
].forEach(p => catBeads.push(p));
// 鼻子
[b(5, 4, C.pink.hex, C.pink.id), b(6, 4, C.pink.hex, C.pink.id)].forEach(p => catBeads.push(p));
// 嘴巴区域白色
[b(4, 4, w, wId), b(7, 4, w, wId),
  b(4, 5, w, wId), b(5, 5, w, wId), b(6, 5, w, wId), b(7, 5, w, wId),
].forEach(p => catBeads.push(p));
// 胡须用黑点表示
[b(1, 4, bk, bkId), b(10, 4, bk, bkId)].forEach(p => catBeads.push(p));
// 身体
const catBodyRows: [number, number[]][] = [
  [7, [3, 4, 5, 6, 7, 8]],
  [8, [2, 3, 4, 5, 6, 7, 8, 9]],
  [9, [2, 3, 4, 5, 6, 7, 8, 9]],
  [10, [2, 3, 4, 5, 6, 7, 8, 9]],
  [11, [3, 4, 5, 6, 7, 8]],
];
catBodyRows.forEach(([y, xs]) => {
  xs.forEach(x => catBeads.push(b(x, y, g, gId)));
});
// 身体白色肚子
[b(5, 8, w, wId), b(6, 8, w, wId),
  b(4, 9, w, wId), b(5, 9, w, wId), b(6, 9, w, wId), b(7, 9, w, wId),
  b(5, 10, w, wId), b(6, 10, w, wId),
].forEach(p => catBeads.push(p));

// ===== 9. 西瓜 (12x10, medium, fruit) =====
const watermelonBeads: { x: number; y: number; color: string; colorId: string }[] = [];
// 绿色瓜皮
const wmGreenRows: [number, number[]][] = [
  [0, [3, 4, 5, 6, 7, 8]],
  [1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]],
  [2, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]],
];
wmGreenRows.forEach(([y, xs]) => {
  xs.forEach(x => watermelonBeads.push(b(x, y, C.green.hex, C.green.id)));
});
// 深绿条纹
[b(3, 1, C.darkGreen.hex, C.darkGreen.id), b(5, 1, C.darkGreen.hex, C.darkGreen.id),
  b(7, 1, C.darkGreen.hex, C.darkGreen.id), b(9, 1, C.darkGreen.hex, C.darkGreen.id),
  b(2, 2, C.darkGreen.hex, C.darkGreen.id), b(4, 2, C.darkGreen.hex, C.darkGreen.id),
  b(6, 2, C.darkGreen.hex, C.darkGreen.id), b(8, 2, C.darkGreen.hex, C.darkGreen.id),
  b(10, 2, C.darkGreen.hex, C.darkGreen.id),
].forEach(p => watermelonBeads.push(p));
// 白色瓜瓤边界
const wmWhiteRow = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
wmWhiteRow.forEach(x => watermelonBeads.push(b(x, 3, C.white.hex, C.white.id)));
// 红色果肉
const wmRedRows: [number, number[]][] = [
  [4, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]],
  [5, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]],
  [6, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]],
  [7, [2, 3, 4, 5, 6, 7, 8, 9]],
  [8, [3, 4, 5, 6, 7, 8]],
  [9, [4, 5, 6, 7]],
];
wmRedRows.forEach(([y, xs]) => {
  xs.forEach(x => watermelonBeads.push(b(x, y, C.red.hex, C.red.id)));
});
// 黑色瓜子
[b(3, 5, bk, bkId), b(6, 5, bk, bkId), b(9, 5, bk, bkId),
  b(2, 6, bk, bkId), b(5, 7, bk, bkId), b(7, 6, bk, bkId),
  b(4, 7, bk, bkId), b(8, 7, bk, bkId),
].forEach(p => watermelonBeads.push(p));

// ===== 10. 像素剑 (8x15, hard, character) =====
const swordBeads: { x: number; y: number; color: string; colorId: string }[] = [];
// 剑尖（灰色/白色）
[b(3, 0, C.grey.hex, C.grey.id), b(4, 0, C.grey.hex, C.grey.id),
  b(3, 1, C.white.hex, C.white.id), b(4, 1, C.grey.hex, C.grey.id),
  b(2, 2, C.grey.hex, C.grey.id), b(3, 2, C.white.hex, C.white.id), b(4, 2, C.grey.hex, C.grey.id), b(5, 2, C.grey.hex, C.grey.id),
  b(2, 3, C.grey.hex, C.grey.id), b(3, 3, C.white.hex, C.white.id), b(4, 3, C.grey.hex, C.grey.id), b(5, 3, C.grey.hex, C.grey.id),
  b(2, 4, C.grey.hex, C.grey.id), b(3, 4, C.white.hex, C.white.id), b(4, 4, C.grey.hex, C.grey.id), b(5, 4, C.grey.hex, C.grey.id),
  b(2, 5, C.grey.hex, C.grey.id), b(3, 5, C.white.hex, C.white.id), b(4, 5, C.grey.hex, C.grey.id), b(5, 5, C.grey.hex, C.grey.id),
  b(2, 6, C.grey.hex, C.grey.id), b(3, 6, C.white.hex, C.white.id), b(4, 6, C.grey.hex, C.grey.id), b(5, 6, C.grey.hex, C.grey.id),
  b(2, 7, C.grey.hex, C.grey.id), b(3, 7, C.white.hex, C.white.id), b(4, 7, C.grey.hex, C.grey.id), b(5, 7, C.grey.hex, C.grey.id),
].forEach(p => swordBeads.push(p));
// 护手（金色/棕色）
[b(0, 8, C.brown.hex, C.brown.id), b(1, 8, C.brown.hex, C.brown.id), b(2, 8, C.yellow.hex, C.yellow.id),
  b(3, 8, C.yellow.hex, C.yellow.id), b(4, 8, C.yellow.hex, C.yellow.id), b(5, 8, C.yellow.hex, C.yellow.id),
  b(6, 8, C.brown.hex, C.brown.id), b(7, 8, C.brown.hex, C.brown.id),
  b(0, 9, C.brown.hex, C.brown.id), b(1, 9, C.brown.hex, C.brown.id), b(2, 9, C.yellow.hex, C.yellow.id),
  b(3, 9, C.yellow.hex, C.yellow.id), b(4, 9, C.yellow.hex, C.yellow.id), b(5, 9, C.yellow.hex, C.yellow.id),
  b(6, 9, C.brown.hex, C.brown.id), b(7, 9, C.brown.hex, C.brown.id),
].forEach(p => swordBeads.push(p));
// 剑柄
[b(3, 10, C.brown.hex, C.brown.id), b(4, 10, C.brown.hex, C.brown.id),
  b(3, 11, C.brown.hex, C.brown.id), b(4, 11, C.brown.hex, C.brown.id),
  b(3, 12, C.brown.hex, C.brown.id), b(4, 12, C.brown.hex, C.brown.id),
  b(3, 13, C.brown.hex, C.brown.id), b(4, 13, C.brown.hex, C.brown.id),
].forEach(p => swordBeads.push(p));
// 剑柄底部（圆头）
[b(2, 14, C.yellow.hex, C.yellow.id), b(3, 14, C.yellow.hex, C.yellow.id),
  b(4, 14, C.yellow.hex, C.yellow.id), b(5, 14, C.yellow.hex, C.yellow.id),
].forEach(p => swordBeads.push(p));

// ===== 所有模板导出 =====
export const TEMPLATES: Template[] = [
  {
    id: 'heart',
    name: '红心',
    category: 'shape',
    width: 8,
    height: 8,
    difficulty: 'easy',
    beads: heartBeads,
  },
  {
    id: 'star',
    name: '星星',
    category: 'shape',
    width: 9,
    height: 9,
    difficulty: 'easy',
    beads: starBeads,
  },
  {
    id: 'apple',
    name: '苹果',
    category: 'fruit',
    width: 10,
    height: 10,
    difficulty: 'easy',
    beads: appleBeads,
  },
  {
    id: 'smiley',
    name: '笑脸',
    category: 'shape',
    width: 8,
    height: 8,
    difficulty: 'easy',
    beads: smileyBeads,
  },
  {
    id: 'flower',
    name: '小花',
    category: 'shape',
    width: 10,
    height: 10,
    difficulty: 'easy',
    beads: flowerBeads,
  },
  {
    id: 'mushroom',
    name: '蘑菇',
    category: 'shape',
    width: 10,
    height: 12,
    difficulty: 'medium',
    beads: mushroomBeads,
  },
  {
    id: 'bear',
    name: '小熊',
    category: 'animal',
    width: 12,
    height: 12,
    difficulty: 'medium',
    beads: bearBeads,
  },
  {
    id: 'cat',
    name: '小猫',
    category: 'animal',
    width: 12,
    height: 12,
    difficulty: 'medium',
    beads: catBeads,
  },
  {
    id: 'watermelon',
    name: '西瓜',
    category: 'fruit',
    width: 12,
    height: 10,
    difficulty: 'medium',
    beads: watermelonBeads,
  },
  {
    id: 'sword',
    name: '像素剑',
    category: 'character',
    width: 8,
    height: 15,
    difficulty: 'hard',
    beads: swordBeads,
  },
];

/** 根据分类获取模板 */
export function getTemplatesByCategory(category: TemplateCategory): Template[] {
  return TEMPLATES.filter(t => t.category === category);
}

/** 根据 ID 获取模板 */
export function getTemplateById(id: string): Template | undefined {
  return TEMPLATES.find(t => t.id === id);
}
