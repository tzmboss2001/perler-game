# 扩展颜色数量选项

## 日期
2026-01-28

## 问题描述
用户反馈：界面上颜色数量最多只能选择 168 色，但颜色库已经扩展到了 356 色（Artkal C: 174, Perler: 102, Hama: 80）。

## 修改内容

### 修改文件
- `src/data/beadColors.ts`

### 具体修改
更新 `colorCountOptions` 数组，添加更多颜色选项：

```typescript
// 修改前
export const colorCountOptions: ColorCountOption[] = [
  { count: 48, label: '48', description: '简单' },
  { count: 72, label: '72', description: '一般' },
  { count: 96, label: '96', description: '细腻' },
  { count: 120, label: '120', description: '精细' },
  { count: 168, label: '168', description: '超精细' },
];

// 修改后
export const colorCountOptions: ColorCountOption[] = [
  { count: 48, label: '48', description: '简单' },
  { count: 72, label: '72', description: '一般' },
  { count: 96, label: '96', description: '细腻' },
  { count: 120, label: '120', description: '精细' },
  { count: 168, label: '168', description: '超精细' },
  { count: 220, label: '220', description: '极致' },
  { count: 280, label: '280', description: '顶配' },
  { count: 356, label: '356', description: '全部' },
];
```

## 测试结果
- 界面正确显示新增的颜色选项（220、280、356）
- 选择 356 色后生成图案成功
- 人像测试图使用了 54 种颜色，效果良好

## 备注
颜色数量选项只是限制颜色匹配算法可以使用的颜色种类上限。实际使用的颜色数量取决于图片内容，通常会少于选择的上限。
