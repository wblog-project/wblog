# Changelog

本项目按面向用户的版本记录重要变化。

## 0.4.0 — 2026-08-31

### Added

- 新增 VRChat 私有 CLI 登录、可复用本地会话与构建时快照。
- 新增 VRChat 个人资料、好友总数、最近世界独立页面和首页主卡。
- 新增最近世界访问量、收藏数、容量等信息及中英文界面文案。

### Changed

- 首页进一步转向面向 VRChat 玩家的个人 Hub，并加入 VRChat 导航入口。
- 重做 VRChat 个人页与地图卡片视觉层级，加入状态提示、错峰入场、悬浮和环境动效，并兼容 reduced motion。
- 地图图片优先使用高清图源；生成图片改为事务式整目录更新，自动回收旧图、中断残留和临时文件。
- 项目版本更新至 `0.4.0`。

### Fixed

- VRChat API 或网络不可用时继续使用最后一份有效快照，避免阻断静态构建。
- 识别 VRChat Cookie 过期时 SDK 返回的 `Missing Credentials` 错误，不再将其误报为 `data.map is not a function`。

## 0.3.0 — 2026-08-31

### Added

- 新增公开、可构建的 `template/` 站点。
- 新增 `wblog init`，安全创建私人 `site/`。
- CI 可通过 `WBLOG_SITE_DIR=template` 完全脱离个人资料运行。
- 新增分层文档、贡献指南和架构说明。

### Changed

- `site/` 现在被 Git 整体忽略，并从框架仓库当前版本解除跟踪。
- `wblog deploy --yes` 现在发布 Pages 静态产物，不再提交源码。
- 配置图片只从当前选择的站点目录载入。
- 标签路由正确支持包含空格的标签。

## 0.2.0 — 2026-08-30

- 升级至 Astro 7 与 Node.js 22.19 基线。
- 引入 Blog、Life、Gallery、About、标签、RSS、SEO、404 和相邻内容导航。
- 引入响应式图片、双语 UI、平台活动 Provider、Playwright/Axe 与 Lighthouse 门禁。
