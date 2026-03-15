# 2026-03-14 成品社区搜索与排序补全

## 背景
- 成品社区此前只有列表展示，没有搜索和排序。
- 作者主页、成品详情已逐步完善，但成品社区本身仍缺少检索能力。

## 服务端修改
- 文件：`perler-beads-server/server/model/request/finished_work_req.go`
  - 为成品公开列表增加 `keyword`、`sort` 参数。
- 文件：`perler-beads-server/server/service/finished_work.go`
  - 新增公开成品列表筛选函数。
  - 支持关键字搜索：标题 / 描述 / 作者昵称。
  - 支持排序：`latest`、`hottest`。
  - 作者公开成品列表也复用相同的搜索与排序逻辑。

## 客户端修改
- 文件：`perler-beads/src/services/api/finishedWorkApi.ts`
  - `listPublic`、`listPublicByUser` 改为支持参数对象。
- 文件：`perler-beads/src/pages/mobile/FinishedWorksPage.tsx`
  - 新增搜索框。
  - 新增排序按钮：`最新`、`最热`。
  - 搜索为空与无结果时显示不同空状态文案。

## 结果
- 成品社区已具备基础搜索和排序能力。
- 社区浏览、作者主页、成品详情三条链路的数据组织更完整。
