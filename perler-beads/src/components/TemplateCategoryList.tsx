import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CaretRight, FilmStrip, GameController, PawPrint, Mountains, Gift, Sparkle } from '@phosphor-icons/react';
import { colors, radius, typography, shadows, animation } from '../styles/designSystem';
import { templateApi, CategoryResponse } from '../services/api/templateApi';

// 模板分类接口（前端展示用）
export interface TemplateCategory {
  id: number;
  name: string;
  icon: React.ReactNode;
  templateCount: number;
  color: string;
}

interface TemplateCategoryListProps {
  onCategoryClick?: (category: TemplateCategory) => void;
  onViewAllClick?: () => void;
}

// 图标和颜色映射配置
const categoryConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  '卡通动漫': { icon: <FilmStrip size={28} weight="fill" />, color: colors.bead.pink },
  '游戏角色': { icon: <GameController size={28} weight="fill" />, color: colors.bead.cyan },
  '可爱动物': { icon: <PawPrint size={28} weight="fill" />, color: colors.bead.yellow },
  '风景': { icon: <Mountains size={28} weight="fill" />, color: colors.bead.green },
  '节日主题': { icon: <Gift size={28} weight="fill" />, color: colors.bead.red },
  '其他': { icon: <Sparkle size={28} weight="fill" />, color: colors.bead.purple },
};

// 默认图标和颜色
const defaultConfig = { icon: <Sparkle size={28} weight="fill" />, color: colors.bead.purple };

const TemplateCategoryList: React.FC<TemplateCategoryListProps> = ({
  onCategoryClick,
  onViewAllClick,
}) => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // 从API加载分类数据
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await templateApi.getCategories();
        if (response.code === 0 && response.data) {
          // 转换API数据为前端展示格式
          const formattedCategories: TemplateCategory[] = response.data
            .sort((a: CategoryResponse, b: CategoryResponse) => a.sort_order - b.sort_order)
            .map((cat: CategoryResponse) => {
              const config = categoryConfig[cat.name] || defaultConfig;
              return {
                id: cat.id,
                name: cat.name,
                icon: config.icon,
                templateCount: cat.template_count,
                color: config.color,
              };
            });
          setCategories(formattedCategories);
        }
      } catch (error) {
        console.error('加载分类失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  const handleCategoryClick = (category: TemplateCategory) => {
    if (onCategoryClick) {
      onCategoryClick(category);
    } else {
      // 默认行为：跳转到模板列表页
      navigate(`/mobile/templates?category=${category.id}`);
    }
  };

  const handleViewAll = () => {
    if (onViewAllClick) {
      onViewAllClick();
    } else {
      navigate('/mobile/templates');
    }
  };

  // 加载中显示骨架屏
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.titleWrapper}>
            <span style={styles.icon}>📚</span>
            <span style={styles.title}>模板精选</span>
          </div>
        </div>
        <div style={styles.scrollContainer}>
          <div style={styles.categoryList}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} style={{ ...styles.categoryCard, opacity: 0.5 }}>
                <div style={{ ...styles.iconWrapper, background: '#f0f0f0' }} />
                <span style={{ ...styles.categoryName, background: '#f0f0f0', width: '60px', height: '16px', borderRadius: '4px' }}>&nbsp;</span>
                <span style={{ ...styles.templateCount, background: '#f0f0f0', width: '30px', height: '12px', borderRadius: '4px' }}>&nbsp;</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* 标题区域 */}
      <div style={styles.header}>
        <div style={styles.titleWrapper}>
          <span style={styles.icon}>📚</span>
          <span style={styles.title}>模板精选</span>
        </div>
        <button style={styles.viewAllButton} onClick={handleViewAll}>
          <span>查看全部</span>
          <CaretRight size={14} weight="bold" />
        </button>
      </div>

      {/* 分类列表 - 横向滚动 */}
      <div style={styles.scrollContainer}>
        <div style={styles.categoryList}>
          {categories.map((category) => (
            <div
              key={category.id}
              style={styles.categoryCard}
              onClick={() => handleCategoryClick(category)}
            >
              {/* 图标区域 */}
              <div
                style={{
                  ...styles.iconWrapper,
                  background: `linear-gradient(145deg, ${category.color}30, ${category.color}15)`,
                  boxShadow: `0 4px 16px ${category.color}20`,
                }}
              >
                <div style={{ color: category.color }}>
                  {category.icon}
                </div>
              </div>

              {/* 分类名称 */}
              <span style={styles.categoryName}>{category.name}</span>

              {/* 模板数量 */}
              <span style={styles.templateCount}>{category.templateCount}个</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: '24px',
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },

  titleWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  icon: {
    fontSize: '18px',
  },

  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    background: colors.gradients.primary,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },

  viewAllButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: 'transparent',
    border: 'none',
    color: colors.text.muted,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    padding: '6px 8px',
    borderRadius: radius.md,
    transition: animation.transition.fast,
  },

  scrollContainer: {
    marginLeft: '-16px',
    marginRight: '-16px',
    paddingLeft: '16px',
    paddingRight: '16px',
    overflowX: 'auto',
    overflowY: 'hidden',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },

  categoryList: {
    display: 'flex',
    gap: '12px',
    paddingBottom: '8px',
  },

  categoryCard: {
    flex: '0 0 auto',
    width: '90px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 12px',
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid ${colors.border.soft}`,
    boxShadow: shadows.sm,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },

  iconWrapper: {
    width: '52px',
    height: '52px',
    borderRadius: radius.bead,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '10px',
  },

  categoryName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    marginBottom: '4px',
    textAlign: 'center',
    whiteSpace: 'nowrap',
  },

  templateCount: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
  },
};

// 添加隐藏滚动条的样式
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .template-scroll-container::-webkit-scrollbar {
    display: none;
  }
`;
if (!document.querySelector('#template-category-styles')) {
  styleSheet.id = 'template-category-styles';
  document.head.appendChild(styleSheet);
}

export default TemplateCategoryList;
