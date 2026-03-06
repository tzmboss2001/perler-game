# 2026-03-03 MCP 客户端冒烟测试记录

## 测试范围
- 前端项目：`perler-beads`（React + Vite）
- 测试方式：MCP（chrome-devtools）页面操作 + 控制台/网络日志检查
- 测试时间：2026-03-03

## 启动与环境
- 启动命令：`npm run dev`
- 实际地址：`http://localhost:3005/`
- 启动状态：成功（Vite ready）

## MCP 操作路径
1. 打开 `http://localhost:3005/`，自动进入 `mobile/home`
2. 从底部导航进入 `mobile/profile`
3. 返回 `mobile/home`
4. 点击中间导航进入 `mobile/create`
5. 从首页入口进入 `mobile/finished`

## 页面结果
- `mobile/home`：页面可加载，分类按钮与排序按钮可见
- `mobile/profile`：页面可加载，个人信息区与“我的方案/我的社区发布/我的成品相册”区块可见
- `mobile/create`：页面可加载，上传入口与拍照按钮可见
- `mobile/finished`：页面可加载，显示“暂无公开成品”

## 发现的问题
- 存在多处接口请求失败（HTTP 500）
- Vite 代理日志显示后端连接被拒绝（`ECONNREFUSED`），属于后端服务不可达导致的联调失败
- 典型失败接口：
  - `/api/v1/community/posts`
  - `/api/v1/user/preferences`
  - `/api/v1/project/list`
  - `/api/v1/community/my/posts`
  - `/api/v1/finished-works/my`
  - `/api/v1/finished-works/public`

## 产物
- 截图：`TEMP/mcp_create_page_20260303.png`
- 截图：`TEMP/mcp_finished_page_20260303.png`
- 前端日志：`TEMP/react_dev.log`

## 结论
- 客户端路由与基础页面渲染正常
- 当前主要阻塞为后端未连通，导致依赖接口的数据区块不可用
