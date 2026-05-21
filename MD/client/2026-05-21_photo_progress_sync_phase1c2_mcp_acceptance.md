# 拍照同步进度 Phase1-C-2 MCP 验收补充

## 验收范围

- 只补齐 Phase1-C-2 的浏览器流程验收。
- 不修改认证主逻辑。
- 不进入 Phase1-C-3 已完成遮罩。
- 不改后端、云同步、多板识别、自动纠错、实时摄像头。
- 不改制作页手势、缩放、拖动、切板、复位逻辑。

## 登录守卫处理

本地 MCP 首次打开 `/mobile/making?test=1` 时被登录守卫重定向到 `/mobile/login`。

根因是本地伪造 token 会触发 `myColorsService.syncFromCloud()` 调用 `/api/v1/user/preferences`，无效 token 返回后会清理登录态，导致制作页登录守卫重定向。

本次验收没有修改认证主逻辑。MCP 通过 `initScript` 做受控测试环境：

- 写入测试 token 与测试用户信息。
- 只 mock `/api/v1/user/preferences` 返回空 `my_color_ids`。
- 其它请求仍走原逻辑。

## MCP 主流程结果

测试地址：

- `http://127.0.0.1:5178/mobile/making?test=1`

已完成流程：

- 打开制作页。
- 进入单板模式。
- 打开工具抽屉。
- 进入辅助面板。
- 打开“拍照同步（试验）”。
- 上传合成实物图 `TEMP/photo_progress_phase1c2_board_good.png`。
- 手动四角校准。
- 空孔参考色取样，参考色为 `210, 210, 210`。
- 生成识别预览。
- 进入确认保存面板。
- 勾选“我已复核候选完成区域，只保存我确认的完成格”。
- 点击“保存本次同步结果”。
- 保存后弹层关闭并返回制作页。
- 关闭后点击缩放 `+`，制作页交互恢复。

## 识别预览数据

成功保存前的预览统计：

- 候选完成：134
- 疑似错误：560
- 低可信：0
- 未完成：206
- 识别质量：较好

低可信或无候选场景也已验证：

- 使用高反光/空孔过亮样张时，预览质量为较低。
- 候选完成为 0 时，“进入确认保存”保持禁用。
- 这符合 `suspected_wrong`、`pending`、`low_confidence` 不自动写入完成的 C-2 边界。

## 保存结果证据

保存后 localStorage 出现本地拍照同步 snapshot：

- key：`photo-progress:v1:draft_30x30:v1_e4dd4467`
- projectId：`draft_30x30`
- beadDataHash：`v1_e4dd4467`
- source：`photo_upload`
- boardNumber：1
- completedCount：134
- qualityLevel：`good`
- suspectedWrongCount：560
- lowConfidenceCount：0
- confirmedCells：134 个

该结果只写入拍照同步本地 snapshot，没有写入现有 `boardStatusMap`。

## 提示与失败路径

- MCP 成功路径表现为保存后弹层关闭并返回制作页，本地 snapshot 可读。
- 保存失败提示与重试行为由 `photo_progress_persistence`、`photo_progress_modal_contract`、`photo_progress_confirmation_model` 测试覆盖。
- 本次未为成功保存新增额外 toast，避免扩大 Phase1-C-2 范围。

## 控制台记录

MCP 验收期间未发现新的应用崩溃错误。

已知非本次问题：

- React style shorthand/non-shorthand warning 仍存在。
- 表单字段 autocomplete/id/name 可访问性提示仍存在。

## 结论

Phase1-C-2 的真实页面验收路径已补齐。用户确认保存流程可以在制作页内完成，且保存结果只进入本地拍照同步 snapshot，不污染现有制作完成状态。

当前仍不进入 Phase1-C-3。下一阶段如继续，应单独处理已完成遮罩、读取恢复、撤销/清除本次同步结果的制作页显示闭环。
