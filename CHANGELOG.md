# Changelog

本项目按面向用户的版本记录重要变化。

## 0.5.0 — 2026-08-31

### Added

- 新增可注册的 Activity Provider 架构，GitHub、Steam、Bilibili 各自维护请求、响应校验和卡片映射。
- 新增首页通用平台动态区，自动展示 Steam 及后续扩展平台的标准活动卡片。
- 新增 `ActivityPanel`、`ArticleImages`、`ArticleNavigation` 与 `PageHero` 共享组件。
- 新增 Provider 故障隔离和未知平台扩展测试，以及 Blog、Life、Gallery 桌面/移动端图片比例回归测试。

### Changed

- `activities.ts` 收敛为 Provider 注册、并发执行、逐平台降级、去重和数量限制的统一聚合层。
- Blog、Life 与 Gallery 详情图统一使用原比例展示；列表缩略图、头像和背景继续使用适合固定容器的裁切模式。
- Blog、Life、Gallery 和标签页复用统一的页面标题与相邻内容导航骨架。
- E2E 改为验证公开模板与私人站点都成立的稳定契约，不再依赖特定私人文件名或平台在线状态。
- 项目版本更新至 `0.5.0`。

### Fixed

- 修复 Life 详情图缺少明确原比例约束的问题。
- 修复 Blog 封面在桌面端被固定高度容器明显裁切的问题。
- 修复 Steam Provider 已获取数据但首页没有渲染入口的问题。
- 修复 Gallery 灯箱图片管线仍使用 `cover`、仅依赖 CSS 抵消的配置不一致。

### Extension notes

- 无需登录的公开平台可实现标准 `ActivityProvider`，注册后自动获得并发、超时、降级和通用首页展示能力。
- 需要 Cookie、2FA 或长期会话的平台应采用 VRChat 的本地同步与净化快照模式，避免在公开 CI 中保存账号凭据。

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
