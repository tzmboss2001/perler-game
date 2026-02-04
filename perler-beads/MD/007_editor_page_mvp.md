# 编辑器页面 MVP 版本

## 日期
2026-01-23

## 功能描述
创建核心编辑器页面 (EditorPage.tsx)，实现图片转拼豆图案的完整流程。

## 实现功能

### 1. 图案生成
- 接收创建页传来的图片数据和色板选择
- 调用 pixelizeService 进行像素化
- 调用 colorMatchService 进行颜色匹配
- Canvas 渲染带网格线的拼豆图案

### 2. 控制面板
- **网格宽度滑块**: 16-64 可调，实时更新图案
- **色板切换**: Artkal/Perler/Hama 三个标签按钮，点击切换并重新匹配颜色

### 3. 珠子统计
- 可展开/收起的统计列表
- 显示颜色数量（如"31种颜色"）
- 每种颜色显示：排名、颜色预览、中文名、数量、百分比
- 最多显示前20种颜色

### 4. 操作功能
- **下载图案**: 生成高清PNG（20px/格），带网格线和颜色代码
- **重新选图**: 返回创建页重新上传

## 文件修改

### 新增文件
- `src/pages/mobile/EditorPage.tsx` - 编辑器页面组件

### 修改文件
- `src/router/index.tsx` - 添加 /mobile/editor 路由
- `src/pages/mobile/CreatePage.tsx` - "开始生成"按钮跳转到编辑器

## UI 设计
- 柔和像素风格，与其他页面保持一致
- 图案预览区带青色边框发光效果
- 珠子统计列表每行显示颜色方块
- 滑块和按钮使用品牌色

## 截图
- TEMP/editor_page_1.png - 编辑器主界面
- TEMP/editor_page_2.png - 珠子统计展开（上）
- TEMP/editor_page_3.png - 珠子统计展开（下）

## 数据流
```
CreatePage                    EditorPage
    │                             │
    │  navigate('/mobile/editor', │
    │  { state: {                 │
    │      imageData: base64,     │
    │      brand: 'artkal'        │
    │  }})                        │
    │ ─────────────────────────►  │
    │                             │
    │                     1. pixelizeImage()
    │                     2. matchPixelsToBead()
    │                     3. calculateBeadStatistics()
    │                     4. renderBeadsToCanvas()
```

## 下一步
- 添加手动编辑工具（画笔、填充、橡皮擦）
- 添加撤销/重做功能
- 添加制作辅助模式（逐行高亮）
