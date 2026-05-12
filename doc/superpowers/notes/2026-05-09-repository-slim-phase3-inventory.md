# 仓库精简 · 阶段 3–4 盘点与执行记录

- **日期**：2026-05-09（初次盘点）；**更新**：同日维护者确认后执行批 C 删除。
- **依据计划**：[../specs/2026-05-09-repository-slim-plan.md](../specs/2026-05-09-repository-slim-plan.md)

---

## CI / 部署（P0）

- [.github/workflows/deploy.yml](../../../.github/workflows/deploy.yml)：`pnpm install` → `pnpm run build` → Vercel；Python 步仅为 `pip install -r requirements.txt`。
- **未引用** `python-utils/`、`.claude/skills/` 路径（无构建依赖）。

结论：`python-utils/`、历史 `.claude/skills/` 若归为 P1，**不参与**当前生产构建链路。

---

## 目录与体积（盘点当日）

| 路径                  | 约大小      | 归类     | 备注                                                                 |
| --------------------- | ----------- | -------- | -------------------------------------------------------------------- |
| `src/`                | —           | P0       | 产品代码                                                             |
| `scripts/`            | —           | P0/P1    | TuShare/ETF 管线；删前须 `rg` + `pnpm build`                         |
| `python-utils/`       | ~1.5M       | P1       | **保留**（维护者 2026-05-09 确认）；仍仅用 README / 文档提及         |
| ~~`design-system/`~~  | —           | （历史） | 见 Git 历史；UI 规范以 `.cursor/skills/stillwell-design-system` 为准 |
| ~~`.claude/skills/`~~ | ~~约 8.4M~~ | P1       | **已于 2026-05-09 从仓库删除**；恢复依赖 Git 历史或本机 OpenSkills   |

---

## 维护者决策（2026-05-09）

| 候选              | 决策                                                                             |
| ----------------- | -------------------------------------------------------------------------------- |
| `python-utils/`   | **保留**                                                                         |
| `.claude/skills/` | **删除仓库内目录**；说明见根目录 `AGENTS.md`（OpenSkills + Cursor agent_skills） |

---

## 验证命令（删改后已执行）

```bash
pnpm run lint
pnpm run build
rg '.claude/skills'   # 应仅存于文档「历史说明」语境
```
