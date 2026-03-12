# 制作页视觉辅助：摄像头失败原因细分

## 本次目标
- 把视觉辅助里原本统一的摄像头失败提示拆成更具体的原因。
- 让后续真机测试时能快速区分是权限问题、设备问题、占用问题还是浏览器环境问题。

## 改动内容
1. 在 `BoardVisionAssistModal.tsx` 中新增 `getCameraErrorMessage()`。
2. 按浏览器 `getUserMedia` 可能返回的错误名拆分提示：
   - `NotAllowedError / PermissionDeniedError`
     - 摄像头权限被拒绝，请在浏览器里允许摄像头访问后重试。
   - `NotFoundError / DevicesNotFoundError`
     - 当前设备没有可用摄像头，请换到有摄像头的设备后再试。
   - `NotReadableError / TrackStartError`
     - 摄像头当前被其他程序占用，请关闭占用后再重试。
   - `OverconstrainedError / ConstraintNotSatisfiedError`
     - 当前摄像头不支持所需拍摄规格，请切换设备或浏览器后再试。
   - `SecurityError`
     - 当前页面环境不允许调用摄像头，请检查浏览器安全设置后再试。
   - `AbortError`
     - 摄像头启动被中断，请稍后重试。
   - 其他未知错误
     - 无法打开摄像头，请检查浏览器权限和设备状态后重试。
3. 保留现有的 `重试摄像头` 按钮和重试链路不变。

## MCP 验证
- 当前 MCP 环境下，弹层直接显示：
  - `摄像头权限被拒绝，请在浏览器里允许摄像头访问后重试。`
- 说明失败原因细分已经成功接通到界面，而不是仍停留在旧的通用报错。

## 构建结果
- `npm run build` 通过

## 当前状态
- 仅完成本地版本
- 暂未发布公网
