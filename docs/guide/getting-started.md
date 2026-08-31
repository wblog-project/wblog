# 安装与初始化

## 环境要求

- Node.js 22.19+
- npm
- Git；发布到 GitHub 时需配置 SSH 或 HTTPS 凭据

## 创建私人站点

```bash
git clone git@github.com:wblog-project/wblog.git
cd wblog
npm install
npm run wblog -- init
```

`init` 将 `template/` 完整复制为 `site/`。如果 `site/` 已存在，命令会停止而不是覆盖。

接着运行向导：

```bash
npm run wblog -- setup --minimal
```

- `--minimal` 配置站点地址、姓名、邮箱和核心链接。
- `--detailed` 继续配置视觉素材、平台集成、首页模块和 Pages 仓库。

## 首次检查

```bash
npm run wblog -- doctor
npm run dev
```

`doctor` 会检查 Node 版本、配置 Schema、图片引用、内容 alt 文本和 Git 环境。开发服务器默认使用 `site/`。

## 更新框架

因为 `site/` 被 Git 忽略，正常拉取框架更新不会覆盖私人内容：

```bash
git pull --ff-only
npm install
npm run wblog -- doctor
```

升级前仍建议单独备份 `site/`。如果新版本修改了字段，请参考 [CHANGELOG](../../CHANGELOG.md) 和公开 `template/config.yml`。
