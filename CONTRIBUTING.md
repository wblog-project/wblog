# Contributing to wblog

感谢参与 wblog。提交代码前请保持 `site/` 私有，不要把真实文章、账号、邮箱、头像或照片加入源码提交。

## 开发流程

```bash
npm install
WBLOG_SITE_DIR=template npm test
WBLOG_SITE_DIR=template WBLOG_OFFLINE=1 npm run build
```

涉及交互或样式时：

```bash
npx playwright install chromium
WBLOG_SITE_DIR=template npm run test:e2e
WBLOG_SITE_DIR=template npm run lighthouse
```

## 修改边界

- 框架功能放在 `src/`。
- CLI 与质量工具放在 `bin/`。
- 公开示例只修改 `template/`。
- 文档按 `docs/guide`、`docs/deployment`、`docs/reference` 分类。
- 不要修改或提交本地 `site/`。

提交应聚焦单一问题，说明行为变化和验证方式。新增配置字段时同步更新 Schema、`template/config.yml` 和配置文档；新增 CLI 行为时补充集成测试与命令参考。
