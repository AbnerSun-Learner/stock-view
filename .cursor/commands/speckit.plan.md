---
description: 使用计划模板执行实施规划工作流并生成设计产物。
handoffs: 
  - label: 创建任务
    agent: speckit.tasks
    prompt: 将计划拆解为任务
    send: true
  - label: 创建清单
    agent: speckit.checklist
    prompt: 为以下领域创建清单...
---

## 用户输入

```text
$ARGUMENTS
```

在继续之前必须考虑用户输入（若非空）。

## 流程概述

1. **初始化**：在仓库根目录运行 `.specify/scripts/bash/setup-plan.sh --json`，解析 JSON 获取 FEATURE_SPEC、IMPL_PLAN、SPECS_DIR、BRANCH。若参数包含单引号如 "I'm Groot"，使用转义：'I'\''m Groot'（或双引号包装）。

2. **加载上下文**：读取 FEATURE_SPEC 与 `.specify/memory/constitution.md`，再加载已复制的 IMPL_PLAN 模板。

3. **执行计划工作流**：按 IMPL_PLAN 结构完成：
   - 填写技术背景（未知项标记 "NEEDS CLARIFICATION"）。
   - 宪章核验：从宪章填充并评估闸口（违规未说明则报错）。
   - Phase 0：生成 research.md（解决所有 NEEDS CLARIFICATION）。
   - Phase 1：生成 data-model.md、contracts/、quickstart.md。
   - Phase 1：运行代理脚本更新 agent context。
   - 设计后重新评估宪章核验。

4. **停止并汇报**：命令在 Phase 2 规划后结束。报告分支、IMPL_PLAN 路径及已生成的产物。

## 各阶段

### Phase 0: 纲要与研究
1. 从技术背景提取未知项：
   - 每个 NEEDS CLARIFICATION → 研究任务
   - 每个依赖 → 最佳实践任务
   - 每个集成 → 模式任务
2. 生成并派发研究任务：
   ```text
   对每个未知：Task: "Research {unknown} for {feature context}"
   对每个技术选型：Task: "Find best practices for {tech} in {domain}"
   ```
3. 在 `research.md` 汇总：
   - Decision: [选择]
   - Rationale: [原因]
   - Alternatives considered: [备选]
**输出**：research.md 覆盖全部 NEEDS CLARIFICATION。

### Phase 1: 设计与合同
**前置**：research.md 完成
1. 从规格提取实体 → `data-model.md`：名称、字段、关系、校验规则、状态转换（如有）。
2. 从功能需求生成 API 合同：
   - 每个用户动作 → 一个端点
   - 使用标准 REST/GraphQL 模式
   - 输出 OpenAPI/GraphQL 至 `/contracts/`
3. **更新代理上下文**：
   - 运行 `.specify/scripts/bash/update-agent-context.sh cursor-agent`
   - 脚本会检测使用的 AI 代理
   - 更新对应的代理上下文文件
   - 只添加当前计划中的新技术，保留人工添加部分
**输出**：data-model.md、/contracts/*、quickstart.md、代理特定文件。

## 关键规则
- 使用绝对路径。
- 闸口失败或澄清未解需报错。
