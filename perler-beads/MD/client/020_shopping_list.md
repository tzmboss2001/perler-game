# 珠子购物清单功能

## 日期
2026-01-25

## 功能描述
在编辑器页面添加珠子购物清单功能，用户可以：
1. 查看需要购买的珠子清单（按颜色分类统计）
2. 复制清单为文本格式
3. 导出清单为图片

## 实现文件

### 新增文件
- `src/components/ShoppingListModal.tsx` - 购物清单弹窗组件

### 修改文件
- `src/pages/mobile/EditorPage.tsx` - 集成购物清单功能

## 技术实现

### ShoppingListModal 组件
```typescript
interface ShoppingItem {
  id: string;
  name: string;
  nameCN: string;
  hex: string;
  count: number;
  percentage: number;
}

interface ShoppingListModalProps {
  visible: boolean;
  onClose: () => void;
  items: ShoppingItem[];
  gridSize: { width: number; height: number };
  brand: string;
}
```

### 主要功能

#### 1. 统计信息展示
- 品牌名称
- 图案尺寸
- 总珠子数
- 颜色种类数

#### 2. 珠子列表
- 颜色色块显示
- 色号（如 A16、P42）
- 颜色中文名
- 需要数量

#### 3. 复制清单（文本格式）
```
拼豆购物清单
品牌: Artkal
尺寸: 32 x 32
总计: 1024 颗 (4 种颜色)

序号 | 色号 | 颜色名 | 数量
-----|------|--------|------
1 | A16 | 珊瑚色 | 256
2 | P42 | 绿松石 | 256
...

---
由拼豆工坊生成
```

#### 4. 导出图片
使用 Canvas 绘制购物清单图片：
- 彩虹装饰条
- 标题和统计信息
- 表格样式的珠子列表
- 品牌水印

## EditorPage 集成

### 新增 import
```typescript
import { ShoppingCart } from '@phosphor-icons/react';
import ShoppingListModal from '../../components/ShoppingListModal';
```

### 新增状态
```typescript
const [showShoppingList, setShowShoppingList] = useState(false);
```

### 清单按钮位置
在"珠子统计"折叠面板的标题栏右侧添加"清单"按钮

## 测试结果
| 测试项 | 结果 |
|--------|------|
| 清单按钮显示 | ✅ |
| 弹窗正常打开 | ✅ |
| 统计信息显示 | ✅ 品牌/尺寸/总数/颜色数 |
| 珠子列表显示 | ✅ 色号/颜色名/数量 |
| 复制清单功能 | ✅ |
| 导出图片功能 | ✅ |

## 截图
- `TEMP/shopping_list_modal.png` - 购物清单弹窗
