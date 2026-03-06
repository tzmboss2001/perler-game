# 2026-03-03 个人页成品相册上传与展示（客户端）

## 本次目标
- 在个人页新增“成品相册”入口，用户可上传实拍成品并管理。

## 修改内容
1. 新增API封装
- 文件：`perler-beads/src/services/api/finishedWorkApi.ts`
- 新增接口：
  - `create`
  - `listMy`
  - `delete`
- 类型：`FinishedWorkItem`、`CreateFinishedWorkData`。

2. 个人页接入
- 文件：`perler-beads/src/pages/mobile/ProfilePage.tsx`
- 新增状态：
  - 成品列表、加载状态、上传状态
- 新增交互：
  - 隐藏文件选择器（多图）
  - 选择图片后转 Base64 上传
  - 标题/描述输入（快速 prompt）
  - 删除成品
- 新增展示区：
  - “我的成品相册”
  - 显示封面、标题、时间、图片数量、描述

## 验证
- `npm run build`（`perler-beads`）通过

## 备注
- 当前为 P0：个人相册闭环已可用。
- 后续可升级：专用上传弹窗（替换 prompt）、相册分页、成品发布到社区流。
