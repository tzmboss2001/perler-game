# [2026-02-06] 任务 - 失败效果可视化 ResultCanvas

## 问题背景
用户反馈结果页只有文字描述（如"粘住了！撕不开！"），看不到熨烫后拼豆的实际样子。
需要在结果页添加 Canvas 可视化，直观展示 5 种失败效果。

## 完成内容

### ResultCanvas 组件
- `src/components/ResultCanvas/ResultCanvas.tsx` - 失败效果可视化画布
- `src/components/ResultCanvas/ResultCanvas.css` - 样式
- `src/components/ResultCanvas/index.ts` - 导出

### 5种失败类型的视觉效果
1. **成功（success）**：拼豆完美融合，无中孔，轻微高光
2. **半生不熟（undercooked）**：拼豆微偏移、半透明、保留中孔、裂缝线条
3. **局部融化（partial_melt）**：融化区域拼豆变形为椭圆，正常区域保持原样
4. **整体塌陷（collapse）**：所有拼豆向中心收缩、扁平化、暗色覆盖、裂纹效果
5. **颜色烧焦（burned）**：颜色偏移（FailureEngine已处理）+ 焦痕斑点 + 烟雾效果
6. **粘连拉扯（sticky）**：部分拼豆位移 + 拉丝弧线 + 变形拼豆

### 数据流
- `IroningPanel.handleFinishIroning()` 在熨烫完成后保存拼豆快照到 store
- `gameStore.setResultSnapshot()` 存储 resultBeads/resultBoardWidth/resultBoardHeight
- `ResultPage` 读取快照数据传给 `ResultCanvas`
- `ResultCanvas` 根据 failureType 选择对应的绘制函数

### 技术要点
- 使用确定性随机函数 `seededRandom(x, y, seed)` 避免每帧渲染不同
- Canvas 2D 绘制，支持 devicePixelRatio 高清屏
- 每种失败类型有独立的绘制函数

## 修改文件
```
src/store/gameStore.ts              (更新 resetGame 清除结果快照)
src/components/IroningPanel/IroningPanel.tsx  (添加 setResultSnapshot 调用)
src/components/ResultCanvas/         (新增组件)
src/pages/ResultPage.tsx             (集成 ResultCanvas)
```

## 测试结果
- ✅ 粘连拉扯效果：拼豆位移 + 拉丝线条 + 变形
- ✅ 控制台零错误零警告
- ✅ TypeScript 编译通过
