# 修复：社区"一键开始制作"导致制作页白屏

## 日期
2026-02-26

## 问题描述
从社区作品详情页点击"一键开始制作"按钮后，跳转到 MakingPage 页面白屏，控制台报错：
```
Cannot read properties of undefined (reading 'slice')
```

## 根本原因
**数据格式不匹配**：
- 社区 API 返回的 `bead_data` 格式：`{width, height, beads: [{x, y, colorId}, ...]}`（对象数组，带坐标和颜色ID）
- MakingPage 期望的 `BeadPixelData` 格式：`{width, height, beads: (BeadColor | null)[]}` （平铺数组，按 `y * width + x` 索引，每个元素是完整的 `BeadColor` 对象含 `hex/name/id/brand` 等字段）

`CommunityDetailPage` 直接将 API 返回的 `post.bead_data` 传给了 MakingPage，未做格式转换。

## 修复方案
在 `CommunityDetailPage.tsx` 中新增 `convertToBeadPixelData()` 函数：
1. 从 `allBeadColors` 构建 `colorId → BeadColor` 查找表
2. 初始化 `width * height` 大小的 null 数组
3. 遍历 API 的 `beads` 数组，根据 `colorId` 查表获取完整 `BeadColor`，放入 `y * width + x` 位置
4. 返回标准的 `BeadPixelData` 对象

## 修改文件
| 文件 | 改动 |
|------|------|
| `src/pages/mobile/CommunityDetailPage.tsx` | 新增 `convertToBeadPixelData()` 转换函数，导入 `allBeadColors`/`BeadColor`/`BeadPixelData`，`handleStartMaking` 先转换再导航 |

## 验证
- 社区列表页正常显示 6 个作品
- 点击"小皮卡丘 8x8" → 详情页正常
- 点击"一键开始制作" → MakingPage 正确渲染 8×8 网格
- 控制台无错误
