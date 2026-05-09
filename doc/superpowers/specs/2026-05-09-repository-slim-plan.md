# 仓库精简实施计划（Repository Slim）

- **依据规格**：[2026-05-09-repository-slim-design.md](./2026-05-09-repository-slim-design.md)（已定稿）
- **说明**：环境中未安装 `writing-plans` 技能文件；本计划按规格第 7 节代行同级产出。
- **执行记录**：阶段 1–2 已于 2026-05-09 在分支 `chore/repo-slim` 落实（含 `docs/` → `doc/`、引用更新、`.gitignore`、README「仓库地图」、`.cursor/rules/generated-docs-in-doc-dir.mdc`）。

---

## 0. 前置

- 在单独分支上执行（例如 `chore/repo-slim`），避免与进行中的功能混杂。
- 每完成一个「阶段」提交一次，便于审查与回滚。

---

## 阶段 1：`docs/` → `doc/`（硬性约束，优先）

**目标**：单一文档根 `doc/`，无并列 `docs/`。

| 步骤 | 操作 |
|------|------|
| 1.1 | 若尚未存在，创建 `doc/superpowers/notes/`、`doc/superpowers/specs/`。 |
| 1.2 | 使用 `git mv`（保留历史）：`docs/superpowers/notes/*` → `doc/superpowers/notes/`；`docs/superpowers/specs/*` → `doc/superpowers/specs/`。注意解决与已存在文件的冲突（例如 `2026-05-09-repository-slim-design.md` 已在 `doc/superpowers/specs/` 时勿覆盖）。 |
| 1.3 | 删除空目录 `docs/`（及各级空父目录）。 |
| 1.4 | 全文检索仓库内 `docs/`（排除 `node_modules`、`.next`），将**仍指向旧路径**的引用改为 `doc/`。实施当下需覆盖至少：`src/types/correlation.ts` 注释；`doc/superpowers/specs/` 与 `notes/` 内 Markdown 互链；本规格文档内对 `docs/` 的说明性字眼（可改为「历史上曾为 `docs`」或统一写 `doc/`）。 |
| 1.5 | 更新 [.cursor/rules/generated-docs-in-doc-dir.mdc](../../../.cursor/rules/generated-docs-in-doc-dir.mdc)：删除「勿动 `docs/`」及「不要放在 `docs/`」等与新事实矛盾的句子；写明**全仓库说明类文档仅在 `doc/`**。 |
| 1.6 | 规格 [2026-05-08-etf-correlation-tool-plan.md](./2026-05-08-etf-correlation-tool-plan.md) 中曾写 `etf-correlation-validation.md`，实际笔记文件名为 `correlation-validation.md`：迁移后顺手改为正确文件名或统一约定（二选一，在 PR 描述中写清）。 |

**验证**：`rg 'docs/'` 仅在历史讨论或无路径含义的上下文中出现；`doc/` 下可找到全部原 superpowers 规格与笔记。

---

## 阶段 2：批 A — `.gitignore` + 仓库地图（B）

| 步骤 | 操作 |
|------|------|
| 2.1 | 在 `.gitignore` 增加本地产物目录，例如：`playwright-artifacts/`、`/correlation-v2-light.png` 或更广的 `*-light.png`（按团队是否需保留少量演示图再收窄规则）。原则：P2 不进库。 |
| 2.2 | 在 [README.md](../../../README.md) 增加短节「仓库地图」（5 分钟内可读）：表格化列出规格§2 中 `src/`、`scripts/`、`python-utils/`、`doc/`、`.github/`、编辑器目录的职责；指向规格§2 或本文档。 |

**验证**：`git status` 不再被约定产物刷屏；新贡献者能据 README 找到文档根与产品代码根。

---

## 阶段 3：批 B — 零引用项删除或迁出（C）

**原则**：仅动已标为 **P1** 或确认 **P0 无引用** 的路径；每项附 `rg` 证据摘录。**删除或迁出目录前须维护者明确确认**（见笔记中的候选清单）。

| 步骤 | 操作 |
|------|------|
| 3.1 | 盘点 `python-utils/`：是否在 README、脚本、CI 中被提及；若无引用，标为「可迁出仓库」或「可删」，单独 PR。 |
| 3.2 | 盘点根目录杂项、`design-system/`（若已删除则跳过）、重复或过时的 `scripts/*.py`：逐项 P0/P1/P2 归类后再删。 |
| 3.3 | 每批删除后执行：`pnpm run lint`、`pnpm run build`；对照 [.github/workflows/deploy.yml](../../../.github/workflows/deploy.yml)。 |

**验收**：PR 描述含「归类 + 检索说明 + 验证结果」。

**进度（2026-05-09）**：3.1–3.2 **盘点已完成**，结论写入 [../notes/2026-05-09-repository-slim-phase3-inventory.md](../notes/2026-05-09-repository-slim-phase3-inventory.md)；**尚未执行任何目录删除**。

---

## 阶段 4：批 C — `.claude/skills` 等大块 P1（A，最后）

| 步骤 | 操作 |
|------|------|
| 4.1 | 统计 `.claude/skills/` 体积与维护者是否依赖**仓库内嵌**副本。 |
| 4.2 | 若改用途全局技能或文档外置：拟定迁出策略（子模块 / 仅本地 / 文档链接），再删除内嵌树并验证团队工作流。 |
| 4.3 | **禁止**在未验证的情况下为缩小体积删改 `src/`。 |

**进度（2026-05-09）**：4.1 **体积已记录**（见同上盘点笔记，约 8.4M）；4.2 **待维护者确认是否迁出/删除内嵌技能树后再做**。

---

## 5. 规格层面的最终验收（对照 design §6）

- [x] 仅存在 `doc/` 作为文档根，无 `docs/`。
- [x] README「仓库地图」已就位。
- [x] P2 目录或通配已在 `.gitignore`。
- [ ] 大块删除均有 P0/P1/P2 说明与构建/工作流自检。
