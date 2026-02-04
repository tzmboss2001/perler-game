const fs = require('fs');
const path = require('path');

// 读取 CSV 文件
function readCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  return lines.map(line => {
    const parts = line.split(',');
    return {
      id: parts[0],
      name: parts[1],
      r: parseInt(parts[2]),
      g: parseInt(parts[3]),
      b: parseInt(parts[4])
    };
  });
}

// RGB 转 Hex
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

// 转义字符串中的单引号
function escapeName(name) {
  return name.replace(/'/g, "\\'");
}

// 生成 TypeScript 代码
function generateTS(colors, brand, varName) {
  const lines = colors.map(c => {
    const hex = rgbToHex(c.r, c.g, c.b);
    const name = escapeName(c.name);
    return `  { id: '${c.id}', name: '${name}', nameCN: '${name}', rgb: [${c.r}, ${c.g}, ${c.b}], hex: '${hex}', brand: '${brand}' },`;
  });
  return `export const ${varName}: BeadColor[] = [\n${lines.join('\n')}\n];`;
}

// 主程序
const tempDir = path.join(__dirname, '../TEMP');

const artkalC = readCSV(path.join(tempDir, 'artkal_c.csv'));
const perler = readCSV(path.join(tempDir, 'perler.csv'));
const hama = readCSV(path.join(tempDir, 'hama.csv'));

console.log(`Artkal C: ${artkalC.length} colors`);
console.log(`Perler: ${perler.length} colors`);
console.log(`Hama: ${hama.length} colors`);
console.log(`Total: ${artkalC.length + perler.length + hama.length} colors`);

// 生成完整的 beadColors.ts 文件
const output = `/**
 * 拼豆珠子颜色库
 * 数据来源: https://github.com/maxcleme/beadcolors
 * 总计: ${artkalC.length + perler.length + hama.length} 种颜色
 */

export interface BeadColor {
  id: string;
  name: string;
  nameCN: string;
  rgb: [number, number, number];
  hex: string;
  brand: 'perler' | 'hama' | 'artkal';
}

// ============ Perler 色板 (美国) - ${perler.length}色 ============
${generateTS(perler, 'perler', 'perlerColors')}

// ============ Hama 色板 (丹麦) - ${hama.length}色 ============
${generateTS(hama, 'hama', 'hamaColors')}

// ============ Artkal C 色板 (中国) - ${artkalC.length}色 ============
${generateTS(artkalC, 'artkal', 'artkalColors')}

// 所有颜色合并
export const allBeadColors: BeadColor[] = [
  ...perlerColors,
  ...hamaColors,
  ...artkalColors,
];

// 按品牌获取颜色
export const getColorsByBrand = (brand: 'perler' | 'hama' | 'artkal'): BeadColor[] => {
  switch (brand) {
    case 'perler':
      return perlerColors;
    case 'hama':
      return hamaColors;
    case 'artkal':
      return artkalColors;
    default:
      return allBeadColors;
  }
};

// 计算两个颜色的欧氏距离
export const colorDistance = (
  rgb1: [number, number, number],
  rgb2: [number, number, number]
): number => {
  return Math.sqrt(
    Math.pow(rgb1[0] - rgb2[0], 2) +
    Math.pow(rgb1[1] - rgb2[1], 2) +
    Math.pow(rgb1[2] - rgb2[2], 2)
  );
};
`;

const outputPath = path.join(__dirname, '../src/data/beadColors.ts');
fs.writeFileSync(outputPath, output);
console.log(`\nGenerated: ${outputPath}`);
