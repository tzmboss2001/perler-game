/**
 * 颜色工具函数
 * 包含 Delta E 颜色差异计算等
 */

// RGB 转 LAB 颜色空间（用于更准确的颜色差异计算）
export function hexToLab(hex: string): { L: number; a: number; b: number } {
  // 先转 RGB
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  // RGB 转 XYZ
  const toLinear = (c: number) => c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
  const rL = toLinear(r);
  const gL = toLinear(g);
  const bL = toLinear(b);

  const x = (rL * 0.4124564 + gL * 0.3575761 + bL * 0.1804375) / 0.95047;
  const y = (rL * 0.2126729 + gL * 0.7151522 + bL * 0.0721750) / 1.00000;
  const z = (rL * 0.0193339 + gL * 0.1191920 + bL * 0.9503041) / 1.08883;

  // XYZ 转 LAB
  const f = (t: number) => t > 0.008856 ? Math.pow(t, 1/3) : (7.787 * t) + 16/116;
  const L = (116 * f(y)) - 16;
  const a = 500 * (f(x) - f(y));
  const bVal = 200 * (f(y) - f(z));

  return { L, a, b: bVal };
}

// 计算 Delta E (CIE76) - 两个颜色的感知差异
export function deltaE(hex1: string, hex2: string): number {
  const lab1 = hexToLab(hex1);
  const lab2 = hexToLab(hex2);

  const dL = lab1.L - lab2.L;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;

  return Math.sqrt(dL * dL + da * da + db * db);
}

// 根据背景色计算对比色（黑或白）
export function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

// 语音朗读坐标
export function speakCoordinate(row: number, col: number): boolean {
  if ('speechSynthesis' in window) {
    // 取消之前的语音
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(`第${row}行，第${col}列`);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.2;
    speechSynthesis.speak(utterance);
    return true;
  }
  return false;
}

// 检测是否支持语音
export function canSpeak(): boolean {
  return 'speechSynthesis' in window;
}
