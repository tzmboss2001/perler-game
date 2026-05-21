# 拍照同步进度 Phase1-B 实施记录

日期：2026-05-20

## 范围

本次只落地 Phase1-B 最小预览闭环：

- 上传或拍摄当前板静态图片。
- 静态图片绘制到独立 canvas，用于格级识别。
- 当前板手动确认，支持上一板 / 下一板手动切换，不做自动匹配。
- 手动四角校准，支持撤销、重校准、逐点调整。
- 空孔参考色取样。
- 生成识别预览，展示候选完成、疑似错误、低可信、未完成和识别质量。

## 明确未做

- 不保存制作进度。
- 不写入 localStorage 进度快照。
- 不调用后端进度 API。
- 不做多板自动识别。
- 不做云同步。
- 不做自动纠错。
- 不做实时摄像头。
- 不修改手势、缩放、拖动、切板、复位逻辑。

## 修改文件

- `perler-beads/src/components/PhotoProgressSyncModal.tsx`
- `perler-beads/src/pages/mobile/MakingPage.tsx`
- `TEST/photo_progress_modal_contract.test.mjs`

## 验证

- `node TEST\photo_progress_modal_contract.test.mjs`：5/5 pass
- `node TEST\photo_progress_service.test.mjs`：8/8 pass
- `node TEST\photo_progress_vision_contract.test.mjs`：1/1 pass
- `node TEST\single_board_interaction.test.mjs`：47/47 pass
- `node TEST\mobile_immersive_visual_contract.test.mjs`：6/6 pass
- `npm.cmd run build`：通过，仅保留既有大 chunk 警告

## MCP 验收

环境：

- 本地 Vite：`http://127.0.0.1:5185`
- 手机视口：390 × 844，touch
- 页面：`/mobile/making?test=1`

结果：

- 制作页可进入单板模式，无黑屏。
- 工具抽屉中可看到“拍照同步（试验）/ 预览”入口。
- 点击入口后打开独立 fixed overlay 弹层，不参与制作页 layout 占高。
- 可上传静态图片。
- 可依次点击四角完成手动校准。
- 可点击空孔生成参考色。
- 可生成识别预览，保留候选完成 / 疑似错误 / 低可信 / 未完成统计。
- 预览格子已作为视觉层处理，避免大量格子污染辅助树。
- 关闭弹层后回到原制作页，单板沉浸式布局仍正常。

已知非本次问题：

- 使用本地 dev token 时，`myColorsService` 云同步可能返回 HTTP 500；本次未处理，且不影响拍照同步预览闭环。

## 回滚方式

如需回滚 Phase1-B，实现提交可整体 revert：

```powershell
git revert <phase1b-commit>
```

也可以只移除 `MakingPage.tsx` 中的入口与弹层挂载，保留独立组件和契约测试作为后续参考。
