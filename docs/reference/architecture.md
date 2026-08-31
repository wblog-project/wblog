# 架构与隐私边界

## 数据流

```text
template/ ── wblog init ──▶ site/ ── Astro build ──▶ dist/ ── deploy ──▶ Pages
   │                         │
   │                         └─ 私人配置、Markdown、原图；Git 忽略
   └─ 公开示例；源码 CI 使用
```

## 目录职责

- `site/`：唯一私人数据根目录，用户可整体复制和备份。
- `template/`：与 `site/` 同构的公开初始化模板，不含私人账号和文章。
- `src/`：布局、组件、页面、配置 Schema、内容集合和平台 Provider。
- `bin/`：初始化、写作、诊断、构建、发布和 Lighthouse 脚本。
- `tests/` 与 `src/**/*.test.ts`：浏览器验收与单元/CLI 集成测试。

## 构建选择

默认构建读取 `site/`。框架 CI 设置：

```bash
WBLOG_SITE_DIR=template
```

配置、内容集合和配置图片映射都会切换到 `template/`。构建只扫描当前目录的配置图片，避免把另一套目录中的资源混入产物。

## 隐私模型

`.gitignore` 忽略整个 `site/`，因此新文章和原图不会出现在框架仓库的新提交中。该机制不清除已经存在于旧 Git 提交中的对象；如历史中包含必须撤回的敏感数据，需要单独进行历史重写和强制推送评估。

发布到 Pages 的内容本身是公开的。即使 Markdown 原稿未上传，生成后的正文和优化图片仍会出现在公开站点中。

## 渐进增强

核心内容、导航和详情页在无 JavaScript 时可读。移动菜单和 Gallery 灯箱使用少量脚本增强；站点尊重 `prefers-reduced-motion`。
