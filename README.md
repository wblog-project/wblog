<p align="center">
  <img src="./docs/assets/wblog-logo.png" alt="wblog logo" width="180" />
</p>

<h1 align="center">wblog</h1>

<p align="center">
  一个配置优先、内容私有、可整体迁移的 Astro Personal Hub 框架。
</p>

<p align="center">
  <a href="https://github.com/wblog-project/wblog/actions/workflows/deploy.yml"><img alt="CI" src="https://github.com/wblog-project/wblog/actions/workflows/deploy.yml/badge.svg" /></a>
  <img alt="version" src="https://img.shields.io/badge/version-0.3.0-9d68ff" />
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-%3E%3D22.19-43853d" />
  <img alt="Astro" src="https://img.shields.io/badge/Astro-7-ff5d01" />
</p>

<p align="center">
  <a href="https://wblog-project.github.io/">在线示例</a> ·
  <a href="./docs/README.md">完整文档</a> ·
  <a href="./CHANGELOG.md">版本记录</a> ·
  <a href="./CONTRIBUTING.md">参与贡献</a>
</p>

---

## 为什么是 wblog

wblog 把“博客程序”和“属于你的资料”划成清晰边界。文章、照片、头像与配置集中在一个被 Git 忽略的 `site/` 目录；公开源码只携带可构建的 `template/`。迁移个人站点时复制一个目录即可，更新框架时也无需把私人内容提交到上游仓库。

| 能力 | 说明 |
| --- | --- |
| 私有内容边界 | `site/` 整体忽略，公开模板独立维护 |
| 完整内容模型 | Blog、Life、Gallery、About、标签、上一篇/下一篇 |
| 图片管线 | 本地图片生成响应式 AVIF/WebP，保留准确 alt 文本 |
| 双语界面 | `en` 与 `zh-CN`，覆盖日期、数字和无障碍文案 |
| 静态集成 | GitHub、Steam、Bilibili 构建时同步，失败时逐平台降级 |
| 发布能力 | 根域 Pages 仓库与可选 Project Pages，静态产物独立推送 |
| 质量门禁 | Astro check、Vitest、Playwright、Axe、Lighthouse |

## 5 分钟开始

需要 Node.js 22.19 或更高版本。

```bash
git clone git@github.com:wblog-project/wblog.git
cd wblog
npm install

# 从公开模板创建被 Git 忽略的私人站点
npm run wblog -- init
npm run wblog -- setup --minimal

npm run wblog -- doctor
npm run dev
```

`init` 只在 `site/` 不存在时执行，不会覆盖已有文章或图片。详细步骤见[安装与初始化](./docs/guide/getting-started.md)。

## 清晰的目录边界

```text
wblog/
├── site/                  # 私人站点：配置、文章、照片；Git 整体忽略
├── template/              # 公开发布模板：CI 和新站初始化来源
│   ├── config.yml
│   ├── content/{posts,life,gallery,pages}/
│   └── images/
├── src/                   # Astro 页面、组件和框架逻辑
├── bin/                   # wblog CLI 与 Lighthouse 门禁
├── tests/                 # 浏览器验收测试
└── docs/                  # 分层使用与维护文档
```

`site/` 内部保持适合人直接阅读和迁移的结构：

```text
site/
├── config.yml
├── content/
│   ├── posts/             # 博客长文
│   ├── life/              # 日常记录
│   ├── gallery/           # 摄影、插画与作品集
│   └── pages/about.md     # About 页面正文
└── images/
    ├── profile/           # 头像、背景、主视觉和 OG 图
    ├── posts/
    ├── life/
    ├── gallery/
    └── general/
```

> `site/` 不会进入框架仓库，请另外备份到私人仓库、云盘或其他可靠位置。Pages 只有生成后的静态文件，不能代替原稿备份。

## 日常使用

```bash
# 新文章与内容
npm run wblog -- post new "Hello" --tags Notes,Astro
npm run wblog -- life new "散步" --summary "天气很好" --photo ./sky.jpg
npm run wblog -- gallery new "Night" --description "第一帧" --image ./night.jpg

# 配置、检查与预览
npm run wblog -- config set profile.name "Your Name"
npm run wblog -- doctor
npm run build
npm run preview

# 只发布私人站点的静态产物，不提交 site/
npm run wblog -- deploy --yes --message "deploy: update site"
```

完整参数见 [CLI 参考](./docs/reference/cli.md)，内容格式见[内容与图片](./docs/guide/content-and-assets.md)。

## 文档导航

### 使用指南

- [安装与初始化](./docs/guide/getting-started.md)
- [站点配置](./docs/guide/configuration.md)
- [内容与图片](./docs/guide/content-and-assets.md)

### 发布与维护

- [GitHub Pages 发布](./docs/deployment/github-pages.md)
- [CLI 命令参考](./docs/reference/cli.md)
- [架构与隐私边界](./docs/reference/architecture.md)
- [贡献指南](./CONTRIBUTING.md)

## 开发与质量检查

```bash
npm test
WBLOG_SITE_DIR=template WBLOG_OFFLINE=1 npm run build

npx playwright install chromium
WBLOG_SITE_DIR=template npm run test:e2e
WBLOG_SITE_DIR=template npm run lighthouse
```

源码 CI 始终使用公开 `template/`，不会读取开发者本地的 `site/`。当前发布线为 **v0.3**，核心变化见 [CHANGELOG](./CHANGELOG.md)。
