# 编辑器状态保持：登录后恢复图片数据

**日期**: 2026-02-27
**类型**: Bug修复
**影响文件**: 1个

## 问题

游客在编辑器页面生成像素图后，点击"开始制作"或"分享图纸"被引导去登录。登录成功后跳转回 `/mobile/editor`，但图片数据丢失（因为 `location.state` 中的 `imageData` 没有被传递），导致编辑器自动跳转到创建页。

**用户期望**：登录后能继续刚才的编辑/制作。

## 修复

### EditorPage.tsx

**新增 `saveEditorStateToSession` 函数**：
- 在跳转登录页前，将当前编辑器状态（imageData、colorCount、gridSize、customColorIds）保存到 `sessionStorage`
- EditorPage 已有从 `sessionStorage.getItem('editorData')` 恢复状态的逻辑（第48-57行），登录后回来自动恢复

**修改点**：
1. `handleStartMakingClick` → 登录跳转前调用 `saveEditorStateToSession()`
2. 分享按钮的登录跳转前调用 `saveEditorStateToSession()`

### 数据流

```
游客生成图片 → 点击"开始制作" → 弹出登录引导
  → 保存 editorState 到 sessionStorage
  → 跳转登录页
  → 登录成功 → 跳转回 /mobile/editor
  → EditorPage 从 sessionStorage 恢复 imageData
  → 重新处理图片 → 用户继续操作
```

### 验证
- `npm run build` 编译通过
