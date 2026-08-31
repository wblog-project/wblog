# Changelog

本项目按面向用户的版本记录重要变化。

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
