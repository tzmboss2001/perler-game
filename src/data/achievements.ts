/**
 * 成就系统 - 数据定义
 */

export type AchievementCategory = 'crash' | 'create' | 'ironing' | 'social';

export interface AchievementCondition {
  stat: string;       // 对应 UserStats 的字段名
  threshold: number;  // 达成阈值
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  condition: AchievementCondition;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

/** 成就定义列表 */
export const ACHIEVEMENTS: AchievementDef[] = [
  // ===== 翻车类 =====
  {
    id: 'crash_king',
    name: '翻车王',
    description: '累计翻车10次',
    icon: '👑',
    category: 'crash',
    condition: { stat: 'total_crashes', threshold: 10 },
    rarity: 'rare',
  },
  {
    id: 'all_failures',
    name: '五毒俱全',
    description: '体验全部5种翻车类型',
    icon: '☠️',
    category: 'crash',
    condition: { stat: 'unique_crash_types', threshold: 5 },
    rarity: 'epic',
  },
  {
    id: 'burn_master',
    name: '烧焦大师',
    description: '烧焦5次',
    icon: '🔥',
    category: 'crash',
    condition: { stat: 'crash_burned', threshold: 5 },
    rarity: 'rare',
  },
  {
    id: 'ice_bead',
    name: '冰冷拼豆',
    description: '半生不熟5次',
    icon: '🥶',
    category: 'crash',
    condition: { stat: 'crash_undercooked', threshold: 5 },
    rarity: 'rare',
  },
  {
    id: 'first_crash',
    name: '初次翻车',
    description: '第一次翻车',
    icon: '💥',
    category: 'crash',
    condition: { stat: 'total_crashes', threshold: 1 },
    rarity: 'common',
  },

  // ===== 创作类 =====
  {
    id: 'perfectionist',
    name: '完美主义者',
    description: '获得100分评分',
    icon: '💎',
    category: 'create',
    condition: { stat: 'perfect_scores', threshold: 1 },
    rarity: 'legendary',
  },
  {
    id: 'creator_maniac',
    name: '创作狂人',
    description: '完成20件作品',
    icon: '🎨',
    category: 'create',
    condition: { stat: 'total_works', threshold: 20 },
    rarity: 'epic',
  },
  {
    id: 'beginner',
    name: '初心者',
    description: '完成第一件作品',
    icon: '🌱',
    category: 'create',
    condition: { stat: 'total_works', threshold: 1 },
    rarity: 'common',
  },
  {
    id: 'five_works',
    name: '小有成就',
    description: '完成5件作品',
    icon: '✨',
    category: 'create',
    condition: { stat: 'total_works', threshold: 5 },
    rarity: 'rare',
  },

  // ===== 熨烫类 =====
  {
    id: 'rescue_hero',
    name: '抢救英雄',
    description: '成功抢救5次',
    icon: '🦸',
    category: 'ironing',
    condition: { stat: 'rescue_success_count', threshold: 5 },
    rarity: 'epic',
  },
  {
    id: 'first_rescue',
    name: '急救新手',
    description: '第一次成功抢救',
    icon: '🩹',
    category: 'ironing',
    condition: { stat: 'rescue_success_count', threshold: 1 },
    rarity: 'common',
  },
  {
    id: 'speed_king',
    name: '手速之王',
    description: '3秒内完成熨烫并成功',
    icon: '⚡',
    category: 'ironing',
    condition: { stat: 'fast_ironing_count', threshold: 1 },
    rarity: 'rare',
  },

  // ===== 社交类 =====
  {
    id: 'social_star',
    name: '社交达人',
    description: '获得50个赞',
    icon: '⭐',
    category: 'social',
    condition: { stat: 'total_likes_received', threshold: 50 },
    rarity: 'epic',
  },
  {
    id: 'comment_master',
    name: '评论大师',
    description: '发表20条评论',
    icon: '💬',
    category: 'social',
    condition: { stat: 'total_comments', threshold: 20 },
    rarity: 'rare',
  },
  {
    id: 'challenge_champion',
    name: '挑战冠军',
    description: '完成10次挑战',
    icon: '🏆',
    category: 'ironing',
    condition: { stat: 'challenge_complete_count', threshold: 10 },
    rarity: 'epic',
  },
];

/** 成就分类标签 */
export const ACHIEVEMENT_CATEGORIES: { id: AchievementCategory; label: string; icon: string }[] = [
  { id: 'crash', label: '翻车', icon: '💥' },
  { id: 'create', label: '创作', icon: '🎨' },
  { id: 'ironing', label: '熨烫', icon: '🔥' },
  { id: 'social', label: '社交', icon: '💬' },
];

/** 稀有度标签 */
export const RARITY_LABELS: Record<string, { label: string; color: string }> = {
  common: { label: '普通', color: '#9e9e9e' },
  rare: { label: '稀有', color: '#42a5f5' },
  epic: { label: '史诗', color: '#ab47bc' },
  legendary: { label: '传说', color: '#ffd700' },
};
