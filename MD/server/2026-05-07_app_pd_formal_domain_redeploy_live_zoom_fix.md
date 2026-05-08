# 2026-05-07 正式域名单板实时缩放修复发布记录

## 发布范围

- 正式域名：https://app-pd.shop888.vip
- 前端构建主包：`assets/index-CFHX_ynV.js`
- 代码提交：`9d7ba468 fix: make single-board zoom live`

## 问题根因

单板制作模式中，缩放输入会实时更新目标倍率，但即时 CSS transform 使用了根据目标倍率计算出的预测渲染倍率。目标倍率和预测渲染倍率同步增大时，显示倍率被抵消，用户看到的效果就是双指缩放或拖动滑杆时图纸没有实时变化，停止后才跳到最终倍率。

这是前端渲染管线问题，不是后端接口、后端服务或正式域名配置问题。

## 修复内容

- 即时视觉缩放改为基于当前已绘制的 committed render scale。
- 高清 canvas 重绘仍保留触摸端延迟和安全预算，避免移动端 canvas 过载。
- 新增回归测试，锁定延迟重绘期间的即时显示倍率不能被预测渲染倍率抵消。

## 发布验证

- `node --test TEST\single_board_interaction.test.mjs`：41/41 通过。
- `npm run build`：通过，产物包含 `assets/index-CFHX_ynV.js`。
- 部署脚本返回 `[OK] deploy completed`。
- Nginx 配置检查通过。
- `https://app-pd.shop888.vip/`：HTTP 200。
- `https://app-pd.shop888.vip/mobile/home`：HTTP 200。
- 首页 HTML 已引用 `assets/index-CFHX_ynV.js`。
- `https://app-pd.shop888.vip/assets/index-CFHX_ynV.js`：HTTP 200。
- `https://app-pd.shop888.vip/api/v1/finished-works/public?page=1&pageSize=1`：HTTP 200，返回 `code:0`。
- MCP 正式域名页面渲染正常，控制台无 error，关键资源和接口请求均为 200。

## 用户验证建议

- 关闭旧标签或访问带时间戳的正式域名，避免旧资源缓存。
- 进入制作页并切换单板模式。
- 双指连续放大/缩小图纸，检查图纸是否跟手连续变化。
- 拖动缩放滑杆，检查图纸是否在拖动过程中同步变大/变小。
- 停手后允许清晰度细化，但不应再出现图纸尺寸跳变。
- 抽测传统模式缩放、加减按钮和滚轮缩放。
