---
description: 在生成 tasks.md 后，对 spec.md、plan.md、tasks.md 进行只读一致性与质量分析。
---

## 用户输入

```text
$ARGUMENTS
```

在继续之前必须考虑用户输入（若非空）。

## 目标
在实施前识别规格/计划/任务间的不一致、重复、歧义与缺失。仅在 `/speckit.tasks` 已生成完整 tasks.md 后运行。

## 约束
- **严格只读**：不修改任何文件，只输出分析报告。修复需用户明确同意后再手动执行其他命令。
- **宪章优先**：`.specify/memory/constitution.md` 为不可协商基线，违反 MUST 视为 CRITICAL。

## 执行步骤

1. 初始化：在仓库根运行 `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks`，解析 FEATURE_DIR 与 AVAILABLE_DOCS，推导绝对路径：SPEC=spec.md，PLAN=plan.md，TASKS=tasks.md。缺任一即报错提示补齐。单引号用 'I'\''m Groot' 方式转义或改用双引号。

2. 渐进式加载：
   - spec.md：概览/功能/非功能/用户故事/边界
   - plan.md：架构/栈、数据模型引用、阶段、技术约束
   - tasks.md：任务 ID、描述、阶段、并行标记、文件路径
   - 宪章：原则与 MUST/SHOULD 语句

3. 构建语义模型（内部使用，不直接输出原文）：需求清单、用户动作、任务覆盖映射、宪章规则集。

4. 检测（高信号，最多 50 条发现）：
   - 重复：近似需求、低质量表述
   - 歧义：模糊词、占位符
   - 缺失：动词无对象/结果、缺少验收、任务引用未定义组件
   - 宪章对齐：违反 MUST 或缺少强制门槛
   - 覆盖缺口：无任务的需求、无需求的任务、非功能未落到任务
   - 不一致：术语漂移、实体缺/多、任务顺序矛盾、冲突要求

5. 严重级别：
   - CRITICAL：违反宪章 MUST、缺失核心文件、零覆盖的核心需求
   - HIGH：重复/冲突需求、模糊安全/性能属性、不可测试验收
   - MEDIUM：术语漂移、非功能缺少任务、边界不清
   - LOW：措辞/轻微冗余

6. 输出紧凑报告（Markdown，不写文件）：

```
## Specification Analysis Report
| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| A1 | Duplication | HIGH | spec.md:L120-134 | ... | ... |

**Coverage Summary Table:**
| Requirement Key | Has Task? | Task IDs | Notes |

**Constitution Alignment Issues:**
**Unmapped Tasks:**
**Metrics:** 总需求数/总任务数/覆盖率/歧义数/重复数/CRITICAL 数
```

7. 给出 Next Actions：若有 CRITICAL，建议在 `/speckit.implement` 前修复；若仅 LOW/MEDIUM，可继续但给出改进建议；提供具体后续命令。

8. 询问是否需要针对前 N 个问题给出具体修复建议（不自动应用）。

## 原则
- 最小高信号，避免全文 dump；渐进披露；结果可重现。
- 不得修改文件；不得臆造缺失内容；宪章冲突必为 CRITICAL；无问题时输出成功报告。
