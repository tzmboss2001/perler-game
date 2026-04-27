## 变更日期
- 2026-04-27

## 目标
- 把编辑页“颜色精简”从数字色数表达改成等级化的“精简程度”

## 主要修改
- 在 `beadColors.ts` 中新增 `simplifyPreset` 五档模型：
  - `保真`
  - `轻度`
  - `适中`
  - `明显`
  - `极简`
- 保留内部 `colorLimit` 映射，不重写 `reduceColors` 主算法
- 编辑页 `EditorPage.tsx` 改成：
  - 主交互显示精简程度等级
  - 摘要显示 `MARD 221/291 / 精简程度`
  - 旧 `colorCount` 自动映射到最近等级
  - `我的颜色` / 官方色库切换时仍通过等级推导实际颜色上限
- 帮助页与新手引导统一改成“生成偏好 / 精简程度”口径

## 验证
- `cmd /c node --test TEST\\color_simplify_level.test.mjs`
- `cmd /c npm.cmd run build`
- MCP 本地页面验证：
  - `http://127.0.0.1:3006/mobile/editor`
  - “色系设置”里已显示：
    - `官方色库`
    - `个人库存`
    - `精简程度`
  - 精简程度显示 5 档：
    - `保真 / 轻度 / 适中 / 明显 / 极简`
  - 点击 `明显` 后，摘要同步切到 `精简程度 明显`
  - 控制台没有新的 `error / warn`
