# Graphify 前端图谱第一版

## 本次目标
- 验证当前机器上的 Graphify 是否可用
- 为前端仓库 `perler-beads` 生成第一版知识图谱产物
- 落一个可复用脚本，后续可直接重跑

## 实际处理
### 1. 本机可用性确认
- `graphify.exe` 已安装在：
  - `C:\Python310\Scripts\graphify.exe`

### 2. 发现的问题
- 当前安装的 `graphify` CLI 不是文档里那套完整抽取入口
- 直接运行目录参数会报：
  - `unknown command`
- 但 Python 模块仍然完整可用，包含：
  - `graphify.detect`
  - `graphify.extract`
  - `graphify.build`
  - `graphify.cluster`
  - `graphify.export`
  - `graphify.report`

### 3. 第一版方案
- 不直接整仓跑
- 先只对前端目录跑第一版：
  - `D:\work\web\perler-beads-creator\perler-beads`
- 并且只抽代码文件，不把以下目录混进去：
  - `dist`
  - `TEMP`
  - `node_modules`
  - `graphify-out`

## 新增脚本
- `SCRIPT/run_graphify_frontend.py`

用途：
- 收集前端代码文件
- 抽取结构
- 构建图谱
- 聚类分析
- 生成 JSON / HTML / 报告

## 生成结果
输出目录：
- `D:\work\web\perler-beads-creator\perler-beads\graphify-out`

当前已生成：
- `graph.json`
- `graph.html`
- `GRAPH_REPORT.md`
- `graphify-summary.json`

## 第一版图谱规模
- 代码文件：`110`
- 估算词数：`158,738`
- 节点数：`684`
- 边数：`1,108`
- 社区数：`24`

## 复用方式
后续重跑命令：

```powershell
python -X utf8 SCRIPT\run_graphify_frontend.py
```

## 当前判断
- 第一版已经可用
- 适合先拿来理解前端代码结构
- 还没有接入“项目级 always-on 工作流”
- 如果后续要做更完整的研发记忆层，再考虑：
  - 前后端分别出图
  - 引入 watch/update
  - 再做项目级集成
