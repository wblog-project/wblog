# 站点配置

所有私人配置位于 `site/config.yml`。公开字段示例见 `template/config.yml`。

## 核心字段

| 路径 | 用途 |
| --- | --- |
| `site.title` | 浏览器标题和站点名称 |
| `site.url` | 完整生产域名，不含结尾 `/` |
| `site.base` | Project Pages 使用 `/repository`；根域使用空字符串 |
| `site.locale` | `en` 或 `zh-CN` |
| `profile.*` | 姓名、简介、头像、状态和联系邮箱 |
| `appearance.*` | 主题色与背景图 |
| `navigation` | 顶部导航项目 |
| `socials` | 社交链接与 Lucide 图标名 |
| `home.modules` | 首页各模块开关 |
| `integrations` | GitHub、Steam、Bilibili 构建时数据源 |
| `deployment.githubPagesRepository` | 独立 Pages 仓库 Git 地址 |

## 图片路径

配置中的本地图片路径相对于 `site/images/`：

```yaml
profile:
  avatar: profile/avatar.png
  heroImage: profile/hero.webp
appearance:
  background: profile/background.jpg
```

留空字符串表示不使用该图片。路径不能是绝对路径，也不能包含 `..`。

## 模块开关

```yaml
home:
  modules:
    activities: true
    dailyLife: true
    blog: true
    gallery: true
    music: false
    about: true
```

隐藏模块不会留下空白布局。

## 平台集成

平台数据只在构建时获取，访客浏览时不会向平台 API 发请求。单个平台失败会使用 `fallbackActivities`，不会拖垮整个构建。

Steam API Key 只应放在本地 `.env` 或 GitHub Actions Secret `STEAM_API_KEY`，不要写入 `site/config.yml`。

## VRChat

```yaml
integrations:
  vrchat: { enabled: true, maxRecentWorlds: 6 }
home:
  modules:
    vrchat: true
```

运行 `npm run wblog -- vrchat login` 完成一次本地交互式登录。账号、密码和 2FA secret 不会保存；Cookie、快照和下载图片都位于被 Git 忽略的 `site/` 内。静态页面不会包含邮箱、好友 ID、当前位置或实例信息。VRChat 第三方 API 是社区维护接口，可能无通知变更，因此构建会沿用最近一次有效快照作为降级。

## CLI 修改配置

```bash
npm run wblog -- config show
npm run wblog -- config set site.locale zh-CN
npm run wblog -- config set home.modules.music false
```

修改后运行 `npm run wblog -- doctor` 验证。
