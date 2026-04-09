/**
 * 鎷艰眴鏉挎櫤鑳介厤缃湇鍔?
 *
 * 2.6mm 灏忚眴鏂瑰舰閽夋澘瑙勬牸浣撶郴锛?
 * - 灏忔澘: 26脳26 閽?
 * - 鏍囧噯鏉? 52脳52 閽夛紙鏈€甯哥敤锛?
 * - 澶ф澘: 104脳104 閽?
 */

/** 鏉垮瓙瑙勬牸瀹氫箟 */
export interface BoardSpec {
  size: number;       // 閽夋暟锛堝崟杈癸級
  label: string;      // 鏄剧ず鍚嶇О
  shortLabel: string; // 鐭悕绉?
}

/** 鏉垮瓙瑙勬牸甯搁噺 */
export const BOARD_SPECS: BoardSpec[] = [
  { size: 54, label: '小板 (54×54)', shortLabel: '54板' },
  { size: 78, label: '中板 (78×78)', shortLabel: '78板' },
  { size: 104, label: '大板 (104×104)', shortLabel: '104板' },
];

/** 鏅鸿兘鎺ㄨ崘缁撴灉 */
export interface BoardRecommendation {
  /** 鎺ㄨ崘浣跨敤鐨勬澘瀛愯鏍硷紙閽夋暟锛?*/
  boardSize: number;
  /** 鏉垮瓙瑙勬牸鍚嶇О */
  boardLabel: string;
  /** 姘村钩鏂瑰悜闇€瑕佸嚑鍧楁澘 */
  cols: number;
  /** 鍨傜洿鏂瑰悜闇€瑕佸嚑鍧楁澘 */
  rows: number;
  /** 鎬诲叡闇€瑕佸嚑鍧楁澘 */
  totalBoards: number;
  /** 绠€鐭弿杩帮紝濡?"1鍧楁爣鍑嗘澘" / "2脳3=6鍧楀皬鏉? */
  summary: string;
  /** 鏄惁闇€瑕佹嫾鎺?*/
  needSplice: boolean;
}

/** 鐜板疄璞嗘澘鍒嗗尯绾胯鍒?*/
export interface PhysicalBoardGuideSpec {
  boardSize: number;
  segments: number[];
}

/**
 * 鐜板疄甯歌鏂规澘鐨勫垎鍖鸿鍒欍€? * 54 鏉匡細2 / 10 / 10 / 10 / 10 / 10 / 2
 * 78 鏉匡細4 / 10 / 10 / 10 / 10 / 10 / 10 / 10 / 4
 * 104 鏉匡細2 / 10 脳 10 / 2
 */
export const PHYSICAL_BOARD_GUIDE_SPECS: PhysicalBoardGuideSpec[] = [
  { boardSize: 54, segments: [2, 10, 10, 10, 10, 10, 2] },
  { boardSize: 78, segments: [4, 10, 10, 10, 10, 10, 10, 10, 4] },
  { boardSize: 104, segments: [2, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 2] },
];

/**
 * 涓哄埗浣滄ā寮忚繑鍥炵幇瀹炶眴鏉跨敾绾挎墍鐢ㄧ殑鍩哄噯鏉垮昂瀵搞€? * 灏忎簬绛変簬 54 鐢?54 鏉匡紱灏忎簬绛変簬 78 鐢?78 鏉匡紱鏇村ぇ鐨勪綔鍝佺粺涓€鎸?104 鏉块噸澶嶃€? */
export function getPhysicalBoardDrawSize(width: number, height: number): number {
  const longestSide = Math.max(width, height);
  if (longestSide <= 54) return 54;
  if (longestSide <= 78) return 78;
  return 104;
}

/**
 * 璁＄畻鍗曞潡鐜板疄璞嗘澘鍐呴儴鐨勫垎鍖虹嚎鍋忕Щ浣嶇疆銆? * 鍙繑鍥炲唴閮ㄧ嚎锛屼笉鍖呭惈 0 鍜?boardSize 鏈韩銆? */
export function getPhysicalBoardGuideOffsets(boardSize: number): number[] {
  const spec = PHYSICAL_BOARD_GUIDE_SPECS.find((item) => item.boardSize === boardSize);
  if (!spec) {
    return [];
  }

  const offsets: number[] = [];
  let cursor = 0;
  for (const segment of spec.segments) {
    cursor += segment;
    if (cursor > 0 && cursor < boardSize) {
      offsets.push(cursor);
    }
  }
  return offsets;
}

export function getPhysicalBoardSegments(boardSize: number): number[] {
  const spec = PHYSICAL_BOARD_GUIDE_SPECS.find((item) => item.boardSize === boardSize);
  if (!spec) {
    return [boardSize];
  }
  return [...spec.segments];
}

export interface PhysicalBoardBlockCoordinate {
  blockX: number;
  blockY: number;
  localBlockX: number;
  localBlockY: number;
  boardCol: number;
  boardRow: number;
}

export function getPhysicalBoardBlockCoordinate(
  cellX: number,
  cellY: number,
  boardSize: number,
): PhysicalBoardBlockCoordinate {
  const segments = getPhysicalBoardSegments(boardSize);
  const segmentsPerBoard = segments.length;
  const boardCol = Math.floor(cellX / boardSize);
  const boardRow = Math.floor(cellY / boardSize);
  const localX = cellX - boardCol * boardSize;
  const localY = cellY - boardRow * boardSize;

  const resolveSegmentIndex = (localValue: number) => {
    let cursor = 0;
    for (let i = 0; i < segments.length; i++) {
      cursor += segments[i];
      if (localValue < cursor) {
        return i;
      }
    }
    return Math.max(0, segments.length - 1);
  };

  const localBlockX = resolveSegmentIndex(localX);
  const localBlockY = resolveSegmentIndex(localY);

  return {
    blockX: boardCol * segmentsPerBoard + localBlockX,
    blockY: boardRow * segmentsPerBoard + localBlockY,
    localBlockX,
    localBlockY,
    boardCol,
    boardRow,
  };
}

export interface PhysicalBoardBlockRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function getPhysicalBoardBlockRect(
  blockX: number,
  blockY: number,
  boardSize: number,
  totalWidth: number,
  totalHeight: number,
): PhysicalBoardBlockRect {
  const segments = getPhysicalBoardSegments(boardSize);
  const segmentsPerBoard = segments.length;
  const boardCol = Math.floor(blockX / segmentsPerBoard);
  const boardRow = Math.floor(blockY / segmentsPerBoard);
  const localBlockX = blockX % segmentsPerBoard;
  const localBlockY = blockY % segmentsPerBoard;

  const getSegmentStart = (segmentIndex: number) => {
    let start = 0;
    for (let i = 0; i < segmentIndex; i++) {
      start += segments[i];
    }
    return start;
  };

  const localStartX = getSegmentStart(localBlockX);
  const localStartY = getSegmentStart(localBlockY);
  const localEndX = localStartX + segments[localBlockX];
  const localEndY = localStartY + segments[localBlockY];

  const startX = boardCol * boardSize + localStartX;
  const startY = boardRow * boardSize + localStartY;
  const endX = Math.min(boardCol * boardSize + localEndX, totalWidth);
  const endY = Math.min(boardRow * boardSize + localEndY, totalHeight);

  return {
    startX,
    startY,
    endX,
    endY,
  };
}

/**
 * 杩斿洖鐜板疄璞嗘澘涓績鍗佸瓧鐨勫亸绉讳綅缃€? * 甯歌 54 / 78 / 104 鏉块兘鏄伓鏁板昂瀵革紝涓績钀藉湪涓棿 2脳2 浜ょ偣銆? */
export function getPhysicalBoardCenterOffset(boardSize: number): number {
  return boardSize / 2;
}

/**
 * 鏅鸿兘鎺ㄨ崘鎷艰眴鏉块厤缃?
 *
 * 绛栫暐锛?
 * 1. 鑳界敤鍗曞潡鏉挎斁涓?鈫?閫夋渶灏忕殑澶熺敤鐨勬澘
 * 2. 闇€瑕佹嫾鎺?鈫?閫夎兘鏈€灏忓寲鏉垮瓙鏁伴噺鐨勮鏍?
 * 3. 鍚岀瓑鏁伴噺涓嬩紭鍏堥€夊ぇ鏉匡紙鎷兼帴娆℃暟灏戯級
 */
export function recommendBoard(width: number, height: number): BoardRecommendation {
  // 灏濊瘯姣忕鏉垮瓙瑙勬牸锛屾壘鏈€浼樻柟妗?
  let bestOption: BoardRecommendation | null = null;

  for (const spec of BOARD_SPECS) {
    const cols = Math.ceil(width / spec.size);
    const rows = Math.ceil(height / spec.size);
    const total = cols * rows;
    const needSplice = total > 1;

    let summary: string;
    if (total === 1) {
      summary = `1鍧?{spec.shortLabel}`;
    } else if (cols === 1 || rows === 1) {
      summary = `${total}鍧?{spec.shortLabel}鎷兼帴`;
    } else {
      summary = `${cols}脳${rows}=${total}鍧?{spec.shortLabel}`;
    }

    const option: BoardRecommendation = {
      boardSize: spec.size,
      boardLabel: spec.label,
      cols,
      rows,
      totalBoards: total,
      summary,
      needSplice,
    };

    // 閫夋嫨绛栫暐锛?
    // 1. 浼樺厛涓嶆嫾鎺?
    // 2. 鍚屼负涓嶆嫾鎺?鈫?閫夋渶灏忓鐢ㄧ殑鏉匡紙鐪侀挶鐪佺┖闂达級
    // 3. 鍚屼负闇€鎷兼帴 鈫?鏉垮瓙鏁伴噺灏?> 鍚屾暟閲忛€夊ぇ鏉匡紙鎷兼帴缂濆皯锛?
    if (!bestOption) {
      bestOption = option;
    } else if (!option.needSplice && bestOption.needSplice) {
      // 鏂版柟妗堜笉闇€瑕佹嫾鎺ワ紝鏃ф柟妗堥渶瑕?鈫?閫夋柊鏂规
      bestOption = option;
    } else if (option.needSplice && !bestOption.needSplice) {
      // 鏃ф柟妗堜笉闇€瑕佹嫾鎺ワ紝淇濇寔鏃ф柟妗?
    } else if (!option.needSplice && !bestOption.needSplice) {
      // 閮戒笉闇€瑕佹嫾鎺?鈫?閫夋渶灏忕殑鏉匡紙鏇寸粡娴庯級
      if (option.boardSize < bestOption.boardSize) {
        bestOption = option;
      }
    } else {
      // 閮介渶瑕佹嫾鎺?
      if (option.totalBoards < bestOption.totalBoards) {
        bestOption = option;
      } else if (option.totalBoards === bestOption.totalBoards && option.boardSize > bestOption.boardSize) {
        // 鍚屾暟閲忥紝澶ф澘鎷兼帴缂濇洿灏?
        bestOption = option;
      }
    }
  }

  return bestOption!;
}

/**
 * 鑾峰彇鎵€鏈夋澘瀛愭柟妗堜緵鐢ㄦ埛閫夋嫨锛堢敤浜庡鍑哄垎椤电瓑鍦烘櫙锛?
 * 杩斿洖姣忕鏉垮瓙瑙勬牸鐨勬嫾鎺ユ柟妗堬紝鎸夋帹鑽愬害鎺掑簭
 */
export function getAllBoardOptions(width: number, height: number): BoardRecommendation[] {
  const options: BoardRecommendation[] = [];

  for (const spec of BOARD_SPECS) {
    const cols = Math.ceil(width / spec.size);
    const rows = Math.ceil(height / spec.size);
    const total = cols * rows;
    const needSplice = total > 1;

    let summary: string;
    if (total === 1) {
      summary = `1鍧?{spec.shortLabel}`;
    } else if (cols === 1 || rows === 1) {
      summary = `${total}鍧?{spec.shortLabel}鎷兼帴`;
    } else {
      summary = `${cols}脳${rows}=${total}鍧?{spec.shortLabel}`;
    }

    options.push({
      boardSize: spec.size,
      boardLabel: spec.label,
      cols,
      rows,
      totalBoards: total,
      summary,
      needSplice,
    });
  }

  // 鎸夋帹鑽愬害鎺掑簭锛氫笉鎷兼帴浼樺厛 > 鏉垮瓙鏁板皯 > 澶ф澘浼樺厛
  options.sort((a, b) => {
    if (a.needSplice !== b.needSplice) return a.needSplice ? 1 : -1;
    if (a.totalBoards !== b.totalBoards) return a.totalBoards - b.totalBoards;
    return b.boardSize - a.boardSize;
  });

  return options;
}

