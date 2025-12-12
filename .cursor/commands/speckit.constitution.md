---
description: 根据交互或提供的原则输入创建/更新项目宪章，并确保所有依赖模板保持同步。
handoffs: 
  - label: 构建规格
    agent: speckit.specify
    prompt: 基于更新的宪章实现功能规格。我想要构建...
---

## 用户输入

```text
$ARGUMENTS
```

在继续之前必须考虑用户输入（若非空）。

## 流程概述

你将更新 `.specify/memory/constitution.md` 中的项目宪章。该文件是一个包含方括号占位符的模板（如 `[PROJECT_NAME]`、`[PRINCIPLE_1_NAME]`）。你的任务是：(a) 收集/推导具体值；(b) 准确填写模板；(c) 将修改同步到依赖的产物。

执行步骤：

1. 读取 `.specify/memory/constitution.md` 模板。
   - 识别所有 `[ALL_CAPS_IDENTIFIER]` 形式的占位符。
   - 重要：用户可能要求比模板更多或更少的原则。如指定数量需遵循；按通用模板更新。

2. 收集/推导占位符取值：
   - 用户输入若提供则直接使用。
   - 否则从现有仓库上下文推断（README、文档、先前宪章版本）。
   - 治理日期：`RATIFICATION_DATE` 为最初生效日（未知则询问或标记 TODO）；`LAST_AMENDED_DATE` 若有改动则为今日，否则沿用旧值。
   - `CONSTITUTION_VERSION` 按语义化规则递增：
     - MAJOR：移除/重定义原则或治理导致不兼容
     - MINOR：新增原则/章节或显著扩展指导
     - PATCH：澄清、措辞、错别字、非语义调整
   - 若版本类型有歧义，需先给出理由再定稿。

3. 起草更新后的宪章：
   - 替换所有占位符（除非有意保留，需明确解释）；不留未解释的方括号。
   - 保持标题层级；替换后的注释可移除，若仍有价值可保留。
   - 每条原则需包含：简洁名称、一段（或列表）不可协商规则；若理由不明显需给出 rationale。
   - 治理部分需包含修订流程、版本策略、合规评审要求。

4. 一致性传播检查（将旧清单转为实际校验）：
   - 读取 `.specify/templates/plan-template.md`，确保 “Constitution Check” 与新原则一致。
   - 读取 `.specify/templates/spec-template.md`，若宪章新增/删除必填段落或约束需同步。
   - 读取 `.specify/templates/tasks-template.md`，确保任务分类覆盖新增/删除的原则驱动任务类型（如可观测性、版本控制、测试纪律）。
   - 读取 `.specify/templates/commands/*.md`（包括本文件），验证无过时引用（如特定代理名）；若需通用化则更新。
   - 读取运行时指南（如 `README.md`、`docs/quickstart.md`、代理指导文件），若引用的原则变更需更新。

5. 生成同步影响报告（写入宪章文件顶部的 HTML 注释）：
   - 版本变更：旧 → 新
   - 修改的原则（旧标题 → 新标题，如有重命名）
   - 新增章节
   - 移除章节
   - 需更新的模板（✅ 已更新 / ⚠ 待更新）及路径
   - 如有保留占位符，列出后续 TODO。

6. 最终校验：
   - 无未解释的方括号占位符。
   - 版本行与报告一致。
   - 日期使用 ISO 格式 YYYY-MM-DD。
   - 原则需具备可验证性，避免模糊措辞（“should” → 使用 MUST/SHOULD 并给出理由）。

7. 覆盖写回 `.specify/memory/constitution.md`。

8. 向用户输出摘要：
   - 新版本号与升级理由。
   - 需手动跟进的文件。
   - 建议提交信息（如 `docs: amend constitution to vX.Y.Z (principle additions + governance update)`）。

格式与风格要求：
- 严格使用模板中的 Markdown 标题（不升/降级）。
- 理由行保持可读性，尽量 <100 字符但不强制硬折行。
- 各节之间留一空行。
- 避免行尾空格。

若用户仅提供部分更新（如只改一条原则），仍需执行校验与版本决策步骤。

若关键信息缺失（如无法得知生效日），插入 `TODO(<FIELD_NAME>): 说明`，并在同步影响报告中标记延期事项。

不得创建新模板；只操作现有 `.specify/memory/constitution.md`。
