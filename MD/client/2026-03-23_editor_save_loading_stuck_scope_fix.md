# 2026-03-23 编辑页保存中卡住作用域修复

## 问题
- 编辑页点击“保存并开始制作”后，云端保存失败时会一直停在“保存中...”。
- 触发条件是云端 `project/create` 返回 500，前端进入本地 fallback。

## 根因
- `handleSaveProject` 中的 `thumbnail` 与 `originalImage` 只在 `try` 代码块内声明。
- `catch` 分支里继续调用 `saveToLocal(name, thumbnail, originalImage, ...)`，会因为变量作用域不可见而再次抛出异常。
- 结果是 fallback 没有真正执行，保存弹层和 loading 状态卡住。

## 修复
- 将 `thumbnail` 与 `originalImage` 提前到 `try` 之外声明。
- 保持云端保存和本地 fallback 共用同一份序列化输入。
- 删除上传失败分支里多余的 `setIsSaving(false)`，统一交给 `finally` 关闭 loading。

## 影响
- 云端保存失败时，现在会正常落到本地保存 fallback，而不会再次抛出作用域错误。
- 用户不再卡在“保存中...”。
