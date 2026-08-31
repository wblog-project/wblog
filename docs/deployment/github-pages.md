# GitHub Pages 发布

wblog 支持两种 Pages 结构。

## 独立根域仓库（推荐当前方案）

例如源码位于 `OWNER/wblog`，站点位于 `OWNER/OWNER.github.io`。

在 `site/config.yml` 中设置：

```yaml
site:
  url: https://OWNER.github.io
  base: ""
deployment:
  githubPagesRepository: git@github.com:OWNER/OWNER.github.io.git
```

发布：

```bash
npm run wblog -- deploy --yes --message "deploy: update site"
```

`deploy` 会使用根路径重新构建，浅克隆 Pages 仓库，用 `dist/` 替换其中静态文件并推送。它不会提交或推送 `site/` 到源码仓库。

底层等价命令：

```bash
npm run wblog -- pages sync --message "deploy: update site"
```

## 源码仓库 Project Pages

在 `site.base` 中填写 `/repository-name`。然后在 GitHub Settings → Pages 选择 GitHub Actions，并创建仓库变量：

```text
WBLOG_DEPLOY_PROJECT_PAGES=true
```

公开 CI 使用 `template/` 构建 Project Pages；它不会发布本地私人 `site/`。私人内容仍应通过独立 Pages 仓库或你自己的私有部署流程发布。

## 发布前检查

```bash
npm run wblog -- doctor
WBLOG_OFFLINE=1 npm run build
```

普通 production build 会先尝试刷新 VRChat 快照。本地 Cookie 失效时运行 `npm run wblog -- vrchat login`；自动化环境不应保存账号密码或 2FA secret，可使用已生成快照离线构建。

`WBLOG_OFFLINE=1` 会禁用所有远程 Provider。如果只需沿用已有 VRChat 快照，同时仍要获取 GitHub、Steam、Bilibili 数据，请使用：

```bash
WBLOG_SKIP_VRCHAT_SYNC=1 npm run wblog -- deploy --yes
```

发布后建议检查首页、`/blog/`、`/life/`、`/gallery/`、`/rss.xml` 和 `/robots.txt`。

## 网络代理

网络受限时，可以在当前终端临时设置标准代理环境变量后再执行发布：

```bash
export http_proxy=http://127.0.0.1:7897
export https_proxy=http://127.0.0.1:7897
export all_proxy=socks5://127.0.0.1:7897
```

代理地址应按本机实际配置调整，不要写入仓库。
