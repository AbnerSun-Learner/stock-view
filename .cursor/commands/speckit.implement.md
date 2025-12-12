---
description: 按 tasks.md 中定义的任务执行实施计划。
---

## 用户输入

```text
$ARGUMENTS
```

在继续之前必须考虑用户输入（若非空）。

## 流程概述

1. 在仓库根运行 `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks`，解析 FEATURE_DIR 与 AVAILABLE_DOCS（绝对路径）。单引号用 'I'\''m Groot' 方式转义或改用双引号。

2. **检查清单状态**（若存在 FEATURE_DIR/checklists/）：
   - 扫描所有清单，统计总项、完成、未完成。
   - 生成状态表并判定：全部完成 → PASS；否则 FAIL。
   - 如有未完成：展示表格并询问是否继续（yes/no）。用户拒绝则停止。

3. **加载实施上下文**：
   - 必读：tasks.md（任务与执行计划）、plan.md（技术栈/架构/结构）。
   - 若存在：data-model.md、contracts/、research.md、quickstart.md。

4. **项目忽略配置校验**：
   - 检测 git 仓库及需要的 ignore 文件（.gitignore/.dockerignore/.eslintignore/.prettierignore 等），按技术栈补充关键模式；如缺失则创建。

5. **解析任务结构**：
   - 阶段、依赖（串行/并行 [P]）、任务 ID/描述/路径、执行顺序。

6. **按计划执行**：
   - 阶段式推进；尊重依赖；[P] 可并行，冲突文件需串行。
   - TDD：先执行测试任务，再实现对应功能。

7. **进度与失败处理**：
   - 每完成任务报告进度；非并行任务失败即停；并行任务报告失败项。
   - 明确错误与下一步建议。
   - 已完成任务请在 tasks.md 中标记 [X]。

8. **完成校验**：
   - 确认必需任务完成、实现符合规格与计划、测试通过并满足覆盖/性能要求。
   - 输出总结与最终状态。

> 若 tasks.md 不完整，建议先运行 `/speckit.tasks` 重新生成。
