# 内容与图片

## Blog

文件放在 `site/content/posts/`：

```md
---
title: Hello wblog
date: 2026-08-31
description: 文章摘要。
tags: [Astro, Notes]
cover: ../../images/posts/hello/cover.jpg
coverAlt: 夜空下的城市
draft: false
---

正文使用 Markdown。
```

`draft: true` 的文章不会进入列表、标签和 RSS。

## Daily Life

```md
---
title: 傍晚散步
date: 2026-08-31
summary: 今天的天空很好看。
images:
  - src: ../../images/life/evening/sky.jpg
    alt: 蓝紫色晚霞
---

更长的记录写在这里。
```

## Gallery

Gallery 与 Life 使用相同的 `{src, alt}` 图片数组，首图作为列表封面，每项生成独立详情页和渐进增强灯箱。

## About

`site/content/pages/about.md` 使用 `title`、`description`，并可选配置 `portrait` 与 `portraitAlt`。

## 推荐使用 CLI

```bash
npm run wblog -- post new "Hello" --cover ./cover.jpg --cover-alt "夜空"
npm run wblog -- life new "散步" --summary "天气很好" --photo ./sky.jpg
npm run wblog -- gallery new "Night" --description "第一帧" --image ./night.jpg
npm run wblog -- asset add ./avatar.png --to profile
```

CLI 会创建分类目录、复制图片、生成相对引用，并拒绝覆盖已有文件或把路径写出 `site/`。

## 图片性能与可访问性

- 位图在构建时生成多尺寸 AVIF/WebP 与 fallback。
- 首屏资源可设置高优先级，其余图片懒加载。
- Life、Gallery 和文章封面应填写准确 alt 文本。
- 原图仍保留在 `site/images/`，发布仓库只获得生成后的资源。
