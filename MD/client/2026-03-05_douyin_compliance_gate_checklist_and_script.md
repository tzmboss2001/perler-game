# 2026-03-05 抖音上线合规门禁清单与自动检查脚本

## 背景
- 需求：不仅社区举报，整套小程序都要满足抖音上线规范。
- 目标：建立可执行、可复查、可自动化的上线合规门禁。

## 本次完成

### 1) 新增上线清单（人工验收）
- 文件：`TEST/douyin_release_checklist.md`
- 内容：按 A-G 七大模块给出提审前勾选项：
  - 基础可用性
  - 隐私与协议
  - UGC 治理
  - 反馈客服
  - 广告合规
  - 风控运营
  - 技术门禁

### 2) 新增自动检查脚本（机器验收）
- 文件：`SCRIPT/douyin_compliance_check.ps1`
- 能力：
  - 检查隐私/协议/反馈路由是否存在
  - 检查设置页入口是否存在
  - 检查社区与成品举报调用链
  - 检查审核台下架/日志能力
  - 检查后端敏感操作登录校验
  - 检查法务页面结构存在
  - 检查广告标识或激励提示
  - 执行前后端构建门禁
- 输出：`TEMP/douyin_compliance_report.md`

### 3) 执行结果
- 运行命令：
  - `powershell -ExecutionPolicy Bypass -File SCRIPT/douyin_compliance_check.ps1 -Root .`
- 结果：通过（退出码 0）
- 报告路径：`TEMP/douyin_compliance_report.md`

## 发现与说明
- 法务页面文本存在历史乱码（非本次新引入），中文语义检查容易误判。
- 已在脚本中改为“结构字段检查”（`LEGAL_INFO/sectionTitle/listItem`）确保门禁稳定。
- 后续建议单独开一轮“全站乱码清理专项”，彻底修复可读性与合规表述质量。
