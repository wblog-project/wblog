<p align="center">
  <img src="./docs/assets/wblog-logo.png" alt="wblog logo" width="180" />
</p>

# wblog

一个以 Personal Hub 为首页、使用 Markdown 写作的深色二次元静态博客框架。真实配置、文章和图片全部放在私有的 `site/` 目录中；源码仓库只维护不含个人资料的 `template/` 发布模板。

## 快速开始

需要 Node.js 22.19 或更高版本。

```bash
npm install
npm run wblog -- init
npm run wblog -- setup --minimal
npm run wblog -- doctor
npm run dev
```

生产检查与预览：

```bash
npm test
npm run build
npm run preview
```

真实浏览器验收需要先安装一次 Chromium，然后运行响应式/无障碍测试和 Lighthouse：

```bash
npx playwright install chromium
npm run test:e2e
npm run lighthouse
```

`init` 只在 `site/` 不存在时复制公开模板，绝不会覆盖已有站点。

## 目录边界

```text
site/       # 你的真实站点；被 Git 整体忽略
template/   # 源码仓库公开维护的可构建示例
src/        # Astro 框架代码
bin/        # wblog CLI
tests/      # 单元、集成与浏览器测试
docs/       # README 使用的项目素材
```

### 可整体迁移的用户目录

```text
site/
├── config.yml             # 站点、个人资料、主题、平台与部署配置
├── content/
│   ├── posts/             # 博客长文
│   ├── life/              # 日常记录
│   ├── gallery/           # 摄影、插画与作品集
│   └── pages/about.md     # About 页面正文
└── images/
    ├── profile/           # 头像、主视觉、背景、OG 图
    ├── posts/             # 文章图片
    ├── life/              # 日常照片
    ├── gallery/           # 画廊图片
    └── general/           # 通用素材
```

迁移站点时只需复制 `site/`。`.gitignore` 会忽略整个目录，因此文章、个人配置和原图不会再进入 `wblog` 框架仓库。请把 `site/` 另外备份到私人仓库、云盘或其他可靠位置；Pages 仓库只有生成后的静态文件，不能替代原稿备份。

`template/` 与 `site/` 结构相同，但只包含通用配置、示例 Markdown 和原版 wblog Logo 占位图。CI 设置 `WBLOG_SITE_DIR=template` 来验证公开发布版本，不会读取本地私人内容。

配置图片路径相对于 `site/images/`：

```yaml
profile:
  avatar: profile/avatar.png
  heroImage: profile/hero.webp
appearance:
  background: profile/background.webp
```

内容中的图片路径相对于 Markdown 文件。例如 `site/content/posts/hello.md` 引用 `site/images/posts/hello/cover.jpg`：

```yaml
cover: ../../images/posts/hello/cover.jpg
coverAlt: 夜空下的城市
```

CLI 会自动创建正确的目录和引用，推荐使用 CLI 添加带图片的内容。

## 内容格式

### Blog

```md
---
title: "Hello wblog"
date: 2026-08-30
description: "文章摘要。"
tags: ["Astro", "Notes"]
cover: "../../images/posts/hello/cover.jpg"
coverAlt: "封面内容的准确描述"
draft: false
---

正文使用 Markdown。
```

### Daily Life

```md
---
title: "傍晚散步"
date: 2026-08-30
summary: "今天的天空很好看。"
images:
  - src: "../../images/life/evening/sky.jpg"
    alt: "蓝紫色晚霞"
---
```

### Gallery

Gallery 与 Life 使用相同的 `{src, alt}` 图片数组，首图自动作为列表封面。每项都会生成独立详情页和渐进增强灯箱。

## 常用命令

```bash
npm run wblog -- init
npm run wblog -- setup --minimal
npm run wblog -- config set profile.name "Rex"
npm run wblog -- post new "Hello" --cover ./cover.jpg --cover-alt "夜空"
npm run wblog -- life new "散步" --summary "天气很好" --photo ./sky.jpg
npm run wblog -- gallery new "Night" --description "第一帧" --image ./night.jpg
npm run wblog -- asset add ./avatar.png --to profile
npm run wblog -- doctor
```

CLI 不会覆盖已有 Markdown 或图片，也拒绝把文件写出 `site/`。

## 配置与语言

- `site.locale` 支持 `en` 和 `zh-CN`，控制框架界面、日期、数字和无障碍文案。
- `site.url` 填完整生产域名；项目型 GitHub Pages 在 `site.base` 填 `/repository-name`，根域站点保持空字符串。
- `home.modules` 独立控制 Activities、Daily Life、Blog、Gallery、Music 和 About。
- `integrations` 配置 GitHub、Steam、Bilibili 的构建时同步；访客浏览页面时不会请求平台接口。
- Steam 密钥只写入 `.env` 或 GitHub Actions Secret `STEAM_API_KEY`。

外部平台失败时只降级对应平台，其他成功数据仍会保留。可在本地使用 `WBLOG_OFFLINE=1 npm run build` 强制测试静态 fallback。

## 图片与性能

`site/images` 中的本地图片会在构建时生成带尺寸的 AVIF/WebP 响应式资源。首屏图片预加载，其余内容图懒加载；图片字段必须提供 alt 文本。字体随构建产物自托管，不依赖 Google Fonts。

## GitHub Pages

仓库已包含 `.github/workflows/deploy.yml`。源码 CI 使用公开 `template/` 执行完整测试与构建；若要发布模板的项目型 Pages，请在 Settings → Pages 中选择 GitHub Actions，并添加值为 `true` 的仓库变量 `WBLOG_DEPLOY_PROJECT_PAGES`。

```bash
# 构建私有 site/，并发布到配置的独立 Pages 仓库
npm run wblog -- deploy --yes --message "deploy: update site"

# 等价的底层命令
npm run wblog -- pages sync
```

`deploy` 不会执行 `git add`、提交文章或推送 `wblog` 源码仓库。它与 `pages sync` 都使用 `site/config.yml` 中的 `deployment.githubPagesRepository`，只推送生成后的静态产物，不上传原始 Markdown、原图、依赖或密钥。

## 已包含的站点能力

- Blog、Life、Gallery、About、标签、上一篇/下一篇、RSS、404、robots 和站点地图。
- Open Graph、X Card、canonical、favicon、Person/WebSite/BlogPosting 结构化数据。
- 移动导航、画廊灯箱、键盘操作、减少动态效果偏好和无 JavaScript 内容降级。
- GitHub、Steam、Bilibili 构建时动态与逐平台 fallback。
- 私有站点/公开模板隔离、Astro 类型检查、Vitest 单元/CLI 集成测试和可选 GitHub Pages 自动部署。
