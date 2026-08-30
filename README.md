<p align="center">
  <img src="./public/images/wblog-logo.jpg" alt="wblog logo" width="180" />
</p>

<h1 align="center">wblog</h1>

<p align="center">
  一个以个人主页为核心、使用 Markdown 写作的二次元风格静态博客框架。<br />
  为 GitHub Pages 而设计：改配置、写内容、推送发布。
</p>

<p align="center">
  <a href="https://github.com/wblog-project/wblog/actions/workflows/deploy.yml"><img src="https://github.com/wblog-project/wblog/actions/workflows/deploy.yml/badge.svg" alt="Deploy to GitHub Pages" /></a>
  <a href="https://astro.build/"><img src="https://img.shields.io/badge/Astro-5.x-ff5d01?logo=astro&logoColor=white" alt="Astro" /></a>
  <img src="https://img.shields.io/badge/Node.js-20%2B-339933?logo=nodedotjs&logoColor=white" alt="Node.js 20+" />
</p>

## 为什么是 wblog？

wblog 把首页做成 Personal Hub，而不是传统的文章列表。它将个人资料、社交平台、最近动态、生活记录、作品展示和博客文章放在同一个静态站点中，同时避免把日常维护变成前端开发工作。

- **配置优先**：昵称、头像、背景、导航、社交链接、模块开关与账号都集中在 [`config.yml`](./config.yml)。
- **Markdown 写作**：博客、Daily Life、Gallery 都是带 frontmatter 的 Markdown 文件。
- **构建时同步**：GitHub 与 Steam 数据在本地或 GitHub Actions 构建时拉取，访客不需要等待接口。
- **可靠降级**：未设置密钥、接口限流或网络失败时，自动展示配置中的备用活动卡片。
- **GitHub Pages 就绪**：内置静态构建、站点地图和自动部署工作流，支持个人主页、项目子路径和自定义域名。
- **响应式设计**：桌面端保留大幅主视觉与卡片层级，移动端自动重排为可触摸的单列体验。

### 外部数据何时请求？

所有外部平台数据都只在**构建时**请求：GitHub 项目、Steam 最近游玩和 Bilibili 最新公开视频会在 `npm run build`、GitHub Actions 发布或 `pages sync` 时拉取并写入静态 HTML。访问者打开页面时不会请求这些平台，也不会看到任何密钥。接口超时、隐私设置或平台限流只会使对应卡片回退为静态活动，不会使构建或已发布的主页不可访问。

## 不只是 Hexo 风格博客

Hexo 很适合把 Markdown 文章发布成快速、稳定的博客。wblog 保留这种静态站点的轻量写作体验，但把首页的主角从「文章归档」换成「你这个人」：博客只是个人空间的一个部分。

| 维度 | Hexo 的典型使用方式 | wblog 的个人主页方式 |
| --- | --- | --- |
| 首页 | 文章列表、置顶和分类 | 个人主视觉、状态、平台入口、最近在做什么与生活切片 |
| 创作动态 | 主要是博客文章 | GitHub 最近项目、Steam 游戏、Bilibili 最新公开视频、VRChat 等同屏呈现 |
| 生活内容 | 通常需要寻找主题或手写页面 | `life new` 和 `gallery new` 直接维护日常记录与照片画廊 |
| 配置体验 | 主题配置与插件组合 | 一份 `config.yml`，极简或详细向导逐步收集账号和视觉素材 |
| 数据边界 | 依赖主题/插件决定 | 仅在构建时请求公开数据；失败会回退到静态卡片，不暴露密钥也不影响访问 |

这意味着访客既可以读文章，也可以一眼看到你的代码、游戏、虚拟世界、视频和最近的生活。它更像一个长期生长的网络名片，而不只是文章容器。

## 快速开始

```bash
git clone git@github.com:YOUR_NAME/wblog.git
cd wblog
npm install
npm run dev
```

接着修改根目录的 [`config.yml`](./config.yml)，删除 `src/content` 中的示例内容，并把自己的图片放到 `public/images`。

```bash
npm run build    # 类型检查并生成 dist
npm test         # 运行单元测试
npm run preview  # 预览生成结果
```

需要 Node.js 20 或更高版本。构建产物、缓存、依赖和本地密钥已被 `.gitignore` 排除，不会进入仓库。

### 从零开始的首十分钟

1. 保留现有 `config.yml` 并运行极简向导 `npm run wblog -- setup --minimal`，或复制带完整注释的 [`config.example.yml`](./config.example.yml)：`cp config.example.yml config.yml`。
2. 将方形头像放到 `public/images/avatar.png`；将宽幅背景放到 `public/images/background.webp`。推荐头像至少 512×512，背景至少 1920×1080。
3. 在 `config.yml` 填入这两条 `/images/...` 路径。右侧头图使用中心裁切，人物应尽量位于画面中间。
4. 执行 `npm run wblog -- doctor`，确认 Git、配置和三张已引用图片都正常。
5. 执行 `npm run wblog -- preview` 本地确认，随后用 `deploy` 和 `pages sync` 发布。

## wblog 命令行工具

无需手动创建 Markdown、复制照片或记住部署步骤。所有命令从项目根目录执行：

```bash
npm run wblog -- help
```

| 命令 | 作用 |
| --- | --- |
| `npm run wblog -- setup --minimal` | 两分钟完成站点地址、昵称、邮箱、GitHub、Steam 等核心身份配置。 |
| `npm run wblog -- setup --detailed` | 继续配置个人简介、头像与背景、VRChat、Bilibili、音乐与 About 标签。 |
| `npm run wblog -- config show` | 查看当前配置。 |
| `npm run wblog -- config set profile.name "Rex"` | 快速修改任意配置字段。 |
| `npm run wblog -- post new "Hello wblog" --tags Notes,Astro` | 创建博客文章。 |
| `npm run wblog -- life new "A sunny walk" --summary "Spring arrived" --photo ./walk.jpg` | 新建日常记录并复制照片。 |
| `npm run wblog -- gallery new "Night sky" --description "First frame" --image ./sky.png` | 新建画廊条目并复制一张或多张图片。 |
| `npm run wblog -- asset add ./avatar.png --to images/profile` | 把任意图片安全复制到 `public/`。 |
| `npm run wblog -- pages sync` | 用根域路径构建，并将仅包含静态产物的站点同步到配置的 GitHub Pages 仓库。 |
| `npm run wblog -- build` | 运行生产构建。 |
| `npm run wblog -- preview` | 构建后启动本地生产预览；按 `Ctrl+C` 结束。 |
| `npm run wblog -- doctor` | 检查 Node、Git、配置和已引用图片。 |
| `npm run wblog -- deploy --message "content: weekly photos"` | 构建、测试、提交并推送，让 GitHub Pages 自动发布。 |

每个子命令都带有详细说明与示例，例如 `npm run wblog -- help gallery`。`setup` 不带参数时会先让你选择模式；每一项直接回车都会跳过并保留原值。`--minimal` 适合先上线一个干净的主页，`--detailed` 则涵盖视觉、VRChat、Bilibili 和兴趣内容。首次运行还会生成一篇 Blog、一条 Daily Life、一张 Gallery 条目及配套测试图，方便直接查看效果；它们使用 `_example-` 文件名并被 `.gitignore` 忽略，向导绝不覆盖你已修改的示例。输入 Steam 64 位 ID 会自动启用 Steam 构建时同步。创建内容时，CLI 不会覆盖已有 Markdown 或图片；复制的图片会进入对应的 `public/images/life/...` 或 `public/images/gallery/...` 目录。

Steam 主页可以输入两种形式：

- `https://steamcommunity.com/id/custom-name/`：自定义主页名；向导会继续要求输入 17 位 SteamID64。
- `https://steamcommunity.com/profiles/76561198000000000/`：数字主页；向导会自动识别并填入其中的 SteamID64。

Steam 同步启用后，将 `STEAM_API_KEY` 写入本地 `.env` 和 GitHub Actions Secrets；不要把密钥写入 `config.yml`。

若希望使用不带 `npm run` 的命令名，可在本地执行一次 `npm link`，随后使用 `wblog help`、`wblog post new ...` 等同样的子命令。

## 配置站点

个人资料和首页功能全部在 [`config.yml`](./config.yml) 中维护。配置在构建阶段由 schema 校验；缺少字段、格式错误或非法 URL 会给出明确错误。

| 配置项 | 用途 |
| --- | --- |
| `site.url` | 完整生产域名，例如 `https://your-name.github.io`。 |
| `site.base` | 个人主页仓库留空；项目 Pages 填写 `/repository-name`。 |
| `profile` | 昵称、简介、联系邮箱、导航头像与右侧主视觉图片。头像宜为正方形；`heroImage` 会按中心裁切。 |
| `appearance` | 全站强调色与背景图路径。强调色会实际驱动链接与进度条；背景会自动叠加暗色遮罩以保障可读性。 |
| `navigation` / `socials` | 顶部导航与平台入口。前四个入口会作为主页的重点平台卡片；可用图标包括 `github`、`gamepad-2`、`badge`（VRChat）、`tv`（Bilibili）、`twitter`、`youtube`、`instagram`。 |
| `home.modules` | 独立开关活动区、Daily Life、Blog、Gallery、音乐和 About 卡片。 |
| `integrations` | GitHub、Steam 账号，以及接口不可用时展示的备用活动卡片。 |

图片放进 `public/images` 后，使用以 `/images/` 开头的路径。不要使用磁盘绝对路径，也不要写成 `public/images/...`。例如：

```yaml
profile:
  avatar: "/images/avatar.png"
  heroImage: "/images/hero.webp"

appearance:
  background: "/images/background.webp"
```

## 写内容

### 内容与图片目录

```text
src/content/
├── posts/                 # 长文、教程、开发日志
├── life/                  # 一次日常、一段短记录，可附多张照片
└── gallery/               # 摄影/插画/作品集条目，使用 cover + images
public/images/
├── posts/                 # 文章封面与正文配图
├── life/<slug>/           # `life new --photo` 自动复制到这里
├── gallery/<slug>/        # `gallery new --image` 自动复制到这里
└── examples/              # setup 生成的本地演示图（已忽略）
```

这个划分是有意的：文章、日常和画廊各自独立排序和展示；图片仍全部位于 `public/images`，因此 Markdown 不会混进二进制文件，也能在 GitHub Pages 项目子路径下正确部署。

图片路径使用**站点相对路径**，而不是电脑磁盘路径：把 `sunset.webp` 放进 `public/images/life/sunset.webp` 后，在 Markdown 或 frontmatter 中写 `/images/life/sunset.webp`。不要写 `/Users/name/Desktop/sunset.webp`、`public/images/life/sunset.webp` 或 `../public/...`。CLI 的 `life new`、`gallery new` 会自动复制并生成这种路径。

### Blog

在 `src/content/posts` 新建 Markdown 文件：

```md
---
title: "My first post"
date: 2026-08-30
description: "A short summary used by cards and SEO."
tags: ["Notes", "Web"]
cover: "/images/posts/first.webp"
draft: false
---

Write **Markdown** here.

![正文中的图片](/images/posts/first.webp)
```

`draft: true` 的文章不会进入生产构建。文章详情、博客列表和标签页会自动生成。

### Daily Life 与 Gallery

| 目录 | 必填 frontmatter |
| --- | --- |
| `src/content/life/*.md` | `title`、`date`、`summary`、`images` |
| `src/content/gallery/*.md` | `title`、`date`、`description`、`cover`、`images` |

公开图片放入 `public/images`，内容中使用 `/images/...` 路径。删除示例 Markdown 后，首页会自动展示你的最新内容。

## 平台同步与密钥

平台请求只发生在构建时，密钥不会写进网页或仓库。

- **GitHub**：填写 `integrations.github.username` 即可读取公开仓库。GitHub Actions 自带的 `GITHUB_TOKEN` 会自动用于构建。
- **Steam**：启用 `integrations.steam.enabled`、填写 64 位 `steamId`，并设置 `STEAM_API_KEY`。请确保 Steam 隐私设置允许读取最近游玩记录。
- **Bilibili**：填写 `integrations.bilibili.mid`（空间链接 `https://space.bilibili.com/数字` 中的数字）并启用后，构建时会读取最新公开视频的封面、标题、播放数和跳转链接；不需要 API Key。请求失败时会自动使用回退活动卡片。
- **VRChat、音乐等**：以主页的社交入口、静态「正在听」卡片和 `fallbackActivities` 表达，不依赖账户登录或不稳定接口。这让个人主页在没有 API 凭据时依然完整可用。

从 [`.env.example`](./.env.example) 复制本地环境变量文件：

```bash
cp .env.example .env
```

切勿提交 `.env`，也不要将密钥写入 `config.yml`。

## 部署到 GitHub Pages

项目已提供 [GitHub Actions 工作流](./.github/workflows/deploy.yml)。

1. Fork 本仓库或新建自己的仓库后，修改 `site.url` 和 `site.base`。
2. 在仓库 **Settings → Pages** 中将 Source 设为 **GitHub Actions**。
3. 若启用 Steam，在 **Settings → Secrets and variables → Actions** 添加 `STEAM_API_KEY`。
4. 推送到 `main`；工作流会安装依赖、拉取可用的平台数据、静态构建并发布。

> 本仓库当前演示站点使用 `https://wblog-project.github.io` 与 `/wblog`。如果你的仓库地址是 `https://YOUR_NAME.github.io/my-site`，应设为 `site.url: https://YOUR_NAME.github.io` 和 `site.base: /my-site`。若仓库是 `YOUR_NAME.github.io`，则 `site.base` 保持为空。

### 同步到独立的根域 Pages 仓库

如果你的站点使用独立的 `YOUR_NAME.github.io` 仓库，在 `config.yml` 填入：

```yaml
deployment:
  githubPagesRepository: "git@github.com:YOUR_NAME/YOUR_NAME.github.io.git"
```

之后运行：

```bash
npm run wblog -- pages sync
```

该命令会临时以根域路径构建、生成 `.nojekyll`，然后只把 `dist` 内容推送到目标仓库的 `main` 分支；不会修改源码仓库的 `site.base` 或上传源码、密钥和依赖。

## 项目结构

```text
├── config.yml                 # 站主主要配置入口
├── public/images              # 头像、背景、封面等静态素材
├── src/content                # Markdown 内容集合
│   ├── posts                  # 博客文章
│   ├── life                   # 日常记录
│   └── gallery                # 图库条目
├── src/components             # 可复用界面组件
├── src/lib                    # 配置校验与平台数据适配器
└── .github/workflows          # GitHub Pages 部署
```

## 常见问题

**为什么我的图片或链接在 GitHub Pages 中失效？**  
检查 `site.base`。项目仓库必须使用仓库名作为前缀，例如 `/wblog`。

**Steam / GitHub 请求失败会导致发布失败吗？**  
不会。请求具备超时与回退逻辑，首页会使用 `fallbackActivities` 中的内容。

**如何使用自己的插画？**  
替换 `profile.avatar`、`profile.heroImage`、`appearance.background` 和 Markdown frontmatter 的 `cover` 路径即可。默认示例素材可自由替换。

---

欢迎 Fork、定制并把 wblog 变成真正属于自己的网络空间。
