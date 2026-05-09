# 仓库精简 · 阶段 3–4 盘点（无删除）

- **日期**：2026-05-09
- **依据计划**：[../specs/2026-05-09-repository-slim-plan.md](../specs/2026-05-09-repository-slim-plan.md)
- **说明**：下文仅做 **P0/P1/P2 归类与体积记录**。**删除或迁出目录须维护者逐条确认后**再执行（见文末候选清单）。

---

## CI / 部署（P0）

- [.github/workflows/deploy.yml](../../../.github/workflows/deploy.yml)：`pnpm install` → `pnpm run build` → Vercel；Python 步仅为 `pip install -r requirements.txt`。
- **未引用** `python-utils/`、`.claude/skills/` 路径（根目录 `design-system/` 已删除，无构建依赖）。

结论：上述目录若归为 P1，**不参与**当前生产构建链路。

---

## 目录与体积（2026-05-09 本机 `du -sh`）

| 路径 | 约大小 | 建议归类 | 备注 |
|------|--------|----------|------|
| `src/` | （未单独统计） | P0 | 产品代码 |
| `scripts/` | （未单独统计） | P0/P1 | 与 TuShare/ETF 管线相关脚本；删前须 `rg` + `pnpm build` |
| `python-utils/` | ~1.5M | P1 | `stillwell-tracker`、`m1-kline-compare`；仅在子目录 README 与评审文档中出现 |
| ~~`design-system/`~~ | — | （已移除） | **2026-05-09** 维护者确认删除；原 `PAGE_AUDIT.md` / `UI_TEMPLATE.md` 可从 Git 历史取回；UI 规范以 `.cursor/skills/stillwell-ui` 为准 |
| `.claude/skills/` | ~8.4M | P1 | 编辑器/技能包内嵌；迁出可显著减小克隆体积 |

---

## 批 C（`.claude/skills`）选项（仅记录，不执行）

1. **保留**：维持现状，贡献者本地克隆略大。
2. **迁出**：改为全局/子模块/文档链接安装说明；删仓库内副本前需团队一致同意并更新 `AGENTS.md` 等引用（若有）。

---

## 待你确认后的「可删 / 可迁」候选

每项若同意删除或迁出，请明确回复 **编号 + 动作（删除仓库内目录 / 仅本地保留 / 迁出到子模块等）**。

1. **`python-utils/`**  
   - 无 CI 引用；若你不再使用 stillwell-tracker / m1 对比脚本，可考虑删除或迁出单独仓库。
2. ~~**`design-system/`**~~ — **已按维护者确认于 2026-05-09 删除。**
3. **`.claude/skills/`**  
   - 体积最大；若团队统一用本机 Claude 技能目录，可删除内嵌副本并文档化安装方式。

---

## 验证命令（执行任何删改后必须跑）

```bash
pnpm run lint
pnpm run build
rg '<被删路径>'   # 确认无残留引用
```
