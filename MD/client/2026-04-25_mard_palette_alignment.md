## 变更主题

MARD 官方色库口径与现实方案对齐。

## 背景

- 现有系统把 `48 / 72 / 96 / 150 / 200 / 291` 混在“方案”语义里，容易让用户误以为这些都是 MARD 现实世界官方色库。
- 实际产品应只保留现实世界可理解的官方口径：
  - `MARD 221 常用色`
  - `MARD 291 全色`
- 用户自己的颜色库存应继续通过“我的颜色”单独管理。
- 颜色数量限制继续保留，但只作为算法精简控制项，不再表述成官方方案。

## 本次修改

### 1. 数据层

- 在 `perler-beads/src/data/beadColors.ts` 中补齐并导出：
  - `mard221Colors`
  - `officialPaletteOptions`
  - `colorLimitOptions`
  - `normalizePaletteSelection`
  - `clampColorLimitByPaletteSize`
  - `getPaletteColorsForMode`
- 将“官方色库”和“颜色精简上限”拆成两套独立概念：
  - 官方色库只保留 `mard-221` 与 `mard-291`
  - 颜色精简保留 `48 / 72 / 96 / 150 / 200 / 291`

### 2. 编辑页

- 在 `perler-beads/src/pages/mobile/EditorPage.tsx` 中把旧的“色系统一切换”改成三层结构：
  - `官方色库`
  - `个人库存`
  - `颜色精简`
- “我的颜色”不再和官方色库混用，而是独立的 palette mode。
- 自动配色、减色、背景识别、开始制作、保存方案等链路，统一改为使用当前实际 palette colors，而不是默认走整套 `allBeadColors`。
- 保存到 session / draft / 进入制作页时，都会带上 `paletteMode`。
- 修复了本地编辑页运行时错误：
  - `Cannot access 'activeImportReviewIndex' before initialization`

### 3. 颜色选择器与匹配服务

- `perler-beads/src/components/ColorPicker.tsx`
  - 支持显式传入 `availableColors`
- `perler-beads/src/services/colorMatchService.ts`
  - `matchPixelsToBead` 支持优先使用 `paletteColors`

### 4. 文案与引导

- `perler-beads/src/pages/mobile/HelpPage.tsx`
  - 帮助页说明改为真实口径
- `perler-beads/src/components/OnboardingModal.tsx`
  - 新手引导改为 `MARD 官方色库 + 我的颜色`
- `perler-beads/src/services/imageAnalysisService.ts`
  - 相关色库描述同步更新

## 验证

- `cmd /c node --test TEST\\mard_palette_alignment.test.mjs`
  - 通过，5/5
- `cmd /c npm.cmd run build`
  - 通过
- MCP 本地编辑页验证：
  - 色系设置弹层已显示
  - 可见 `官方色库 / 个人库存 / 颜色精简`
  - 点击 `MARD 221 常用色` 后，标题摘要会同步切换为 `MARD 221 常用色`
  - 重载后控制台无新的 `error / warn`

## 备注

- 本次未提交 git。
- 工作区里存在其他历史未提交改动，本次只处理 MARD 色库口径对齐相关范围。
