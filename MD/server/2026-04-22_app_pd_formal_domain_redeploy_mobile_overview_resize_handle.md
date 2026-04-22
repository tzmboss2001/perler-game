# 2026-04-22 正式域名发布：手机端单板总览缩放手柄

## 本次发布内容

- 发布目标：`https://app-pd.shop888.vip`
- 对应代码提交：`6ed8ea85 feat: add mobile overview resize handle`
- 当前前端主包：
  - `assets/index-CiNCzRti.js`
  - `assets/index-C5FPifGG.css`

## 包含改动

- 手机端单板模式总览卡片新增右下角等比例缩放手柄
- 总览卡片主体拖动与缩放手柄交互职责分离
- 缩放后自动钳制到安全区域
- 最近一次总览卡片宽度持久化到本地

## 发布过程

本次先完成本地验证后，再执行正式发布：

1. 本地执行：
   - `node --test TEST\single_board_interaction.test.mjs`
   - `npm.cmd run build`
2. 正式部署脚本 `SCRIPT/deploy_frontend_ssh.py` 再次超时
3. 改为手动上传当前入口文件：
   - `index.html`
   - `assets/index-CiNCzRti.js`
   - `assets/index-C5FPifGG.css`
4. 由于首页首次打开报动态分包 `404`，继续补传当前首页链路依赖分包：
   - `MobileLayout-BAqsOg8e.js`
   - `HomePage-C3SzK4An.js`
   - `timeUtils-CFENUCP6.js`
   - `Heart.es-DwDlw3Ug.js`
   - `Camera.es-Ca2tNY7z.js`
   - `GridFour.es-Ci1mmgDY.js`
   - `Palette.es-LVliWn7E.js`
   - `communityApi-CvUMm7MI.js`
   - `finishedWorkApi-DOXmNIfD.js`
5. 执行：
   - `sudo nginx -t`
   - `sudo nginx -s reload`

## 发布结果

- `nginx -t` 通过
- `nginx -s reload` 成功
- 线上 `index.html` 已切到 `index-CiNCzRti.js`

## 公网验证

### HTTP 验证

- `https://app-pd.shop888.vip` 返回 `200`
- `https://app-pd.shop888.vip/mobile/home` 返回 `200`
- `https://app-pd.shop888.vip/assets/index-CiNCzRti.js` 返回 `200`
- `https://app-pd.shop888.vip/api/v1/finished-works/public?page=1&pageSize=1` 返回 `200`

### MCP 浏览器验证

正式站页面：

- `https://app-pd.shop888.vip/mobile/home`

验证结果：

- 首页已正常渲染
- 首页关键资源均返回 `200`
- 社区图卡、缩略图、底部导航已正常显示
- 控制台仅剩一条非阻断 issue：
  - 表单元素缺少 `id/name`

## 备注

- 这次发布使用的是“入口主包 + 缺失懒加载分包补传”的方式，而不是全量 assets 同步。
- 本次页面恢复后，正式站已经具备继续测试手机端单板总览缩放手柄的条件。
