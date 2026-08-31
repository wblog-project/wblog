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

## 平台 Provider

公开平台动态使用统一的数据流：

```text
site/config.yml → activityProviders → ActivityCard[] → 首页特色区或通用动态区
                              └─ 失败时按 type 使用 fallbackActivities
```

每个平台实现位于 `src/lib/activity-providers/`，负责自己的响应 Schema、请求和字段映射；`src/lib/activities.ts` 只负责注册、并发执行、故障隔离、降级和去重。新增公开平台时：

1. 在 `site-config.ts` 增加平台配置 Schema，并同步 `template/config.yml`。
2. 新增一个返回标准 `ActivityCard[]` 的 Provider，并加入 `activityProviders` 注册表。
3. 为响应映射和失败降级补单元测试。

非 Bilibili/GitHub 类型会自动进入首页通用动态区，因此 Steam、网易云等卡片不需要再修改首页聚合逻辑。`ActivityCard.label` 和 `ActivityCard.icon` 可覆盖默认平台名与图标。

需要登录 Cookie、2FA 或长期会话的平台不应直接在公开 CI 中登录。应参考 VRChat 使用“本地同步 → 净化后的版本化快照 → 构建只读快照”的模式，并把会话、快照和下载资源放在被 Git 忽略的 `site/.wblog/` 与 `site/images/generated/` 中。

## 隐私模型

`.gitignore` 忽略整个 `site/`，因此新文章和原图不会出现在框架仓库的新提交中。该机制不清除已经存在于旧 Git 提交中的对象；如历史中包含必须撤回的敏感数据，需要单独进行历史重写和强制推送评估。

发布到 Pages 的内容本身是公开的。即使 Markdown 原稿未上传，生成后的正文和优化图片仍会出现在公开站点中。

## 渐进增强

核心内容、导航和详情页在无 JavaScript 时可读。移动菜单和 Gallery 灯箱使用少量脚本增强；站点尊重 `prefers-reduced-motion`。
