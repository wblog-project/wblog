# CLI 命令参考

所有命令从项目根目录运行：

```bash
npm run wblog -- <command>
```

| 命令 | 作用 |
| --- | --- |
| `init` | 从 `template/` 创建新的私人 `site/` |
| `setup --minimal\|--detailed` | 交互式配置向导 |
| `config show` | 输出当前配置 |
| `config set <path> <value>` | 修改点分隔配置项 |
| `post new <title>` | 创建 Blog Markdown，可复制封面 |
| `life new <title>` | 创建 Life 内容并复制照片 |
| `gallery new <title>` | 创建 Gallery 内容并复制图片 |
| `asset add <file>` | 添加通用或分类素材 |
| `doctor` | 检查环境、配置、内容和 Git |
| `build` | 运行生产构建 |
| `preview` | 构建并启动生产预览 |
| `test` | 运行 Vitest |
| `status` | 显示 Git 与部署配置 |
| `pages sync` | 同步静态产物到独立 Pages 仓库 |
| `deploy --yes` | 经确认后发布私人站点到 Pages |

查看内置帮助：

```bash
npm run wblog -- help
npm run wblog -- help post
npm run wblog -- help deploy
```

## 内容命令示例

```bash
npm run wblog -- post new "Hello" \
  --tags Notes,Astro \
  --cover ./cover.jpg \
  --cover-alt "夜空" \
  --description "文章摘要" \
  --date 2026-08-31

npm run wblog -- life new "散步" \
  --summary "天气很好" \
  --photo ./sky.jpg \
  --photo ./street.jpg

npm run wblog -- gallery new "Night" \
  --description "第一帧" \
  --image ./night.jpg
```

CLI 不覆盖同名目标，并验证图片扩展名与目录逃逸。
