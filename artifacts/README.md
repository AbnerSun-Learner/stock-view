# `artifacts/` — 本地产物目录

仓库根下的 **`artifacts/`** 用于集中存放**不入库**的调试与自动化产物，避免散落在项目根或其它源码路径。

除本 README 外，该目录下的文件均被 `.gitignore` 忽略（请勿 `git add` 截图与导出）。

## 推荐子目录

在本地按需创建（无需提交空文件夹）。可一次性执行：

```bash
mkdir -p artifacts/playwright artifacts/screenshots artifacts/alignment artifacts/tmp
```

| 子目录 | 用途 |
|--------|------|
| `playwright/` | Playwright 测试输出：`test-results`、`trace`、`report`、截图等（可将 `outputDir`、`screenshot` 路径指向此处） |
| `screenshots/` | 手工或脚本保存的页面截图、对比图 |
| `alignment/` | UI 对齐、视觉回归用的临时对照图（例如与设计稿叠图） |
| `tmp/` | 其它一次性导出（日志打包、抓包片段等） |

## Playwright

若在项目中启用 `@playwright/test`，建议在 `playwright.config.ts` 中设置：

- `outputDir: 'artifacts/playwright/test-results'`（或等价路径）
- 报告目录指向 `artifacts/playwright/report` 等

此前若使用过仓库根的 `playwright-artifacts/`，请逐步迁到 `artifacts/playwright/`；`.gitignore` 仍会忽略旧路径以免误提交。

## 根目录 PNG

临时对齐图等**不要**再放在仓库根；统一放入 `artifacts/screenshots/` 或 `artifacts/alignment/`。
