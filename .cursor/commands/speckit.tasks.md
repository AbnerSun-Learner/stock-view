---
description: 基于现有设计产物生成可执行、按依赖排序的 tasks.md。

handoffs: 
  - label: 一致性分析
    agent: speckit.analyze
    prompt: 运行项目一致性分析
    send: true
  - label: 执行实施
    agent: speckit.implement
    prompt: 分阶段启动实施
    send: true
---

## 用户输入

```text
$ARGUMENTS
```

在继续之前必须考虑用户输入（若非空）。

## 流程概述

1. **准备**：在仓库根运行 `.specify/scripts/bash/check-prerequisites.sh --json`，解析 FEATURE_DIR 与 AVAILABLE_DOCS（绝对路径）。单引号用 'I'\''m Groot' 方式转义或改用双引号。

2. **加载设计文档（来自 FEATURE_DIR）**：
   - 必需：plan.md（技术栈、库、结构）、spec.md（带优先级的用户故事）。
   - 可选：data-model.md、contracts/、research.md、quickstart.md。
   - 文档缺失时，基于已有内容生成任务。

3. **执行任务生成工作流**：
   - 提取技术栈、结构、用户故事及优先级；按故事映射实体、端点、决策。
   - 生成用户故事分组的任务和依赖图，提供并行示例。
   - 验证每个故事任务完备且可独立测试。

4. **生成 tasks.md**：遵循 `.specify/templates/tasks-template.md` 结构，包含：
   - 特性名、Phase 1 初始化、Phase 2 基础阻塞、Phase 3+ 按优先级的用户故事阶段、最终打磨阶段。
   - 每任务需明确文件路径、是否可并行 [P]、故事标签 [USx]。
   - 依赖与并行示例、实施策略（MVP 优先、增量交付）。

5. **报告**：输出 tasks.md 路径与摘要（总任务数、按故事计数、并行机会、独立测试标准、建议 MVP 范围），确认所有任务符合清单格式。

任务生成上下文：$ARGUMENTS

生成的 tasks.md 必须可直接执行——每个任务足够具体，无需额外上下文。

## 任务生成规则

**关键**：任务必须按用户故事分组，便于独立实现与测试。

**测试为可选**：仅当规格或用户要求 TDD 时生成测试任务。

### 清单格式（强制）

每个任务必须严格使用：

```text
- [ ] T001 [P] [US1] 描述（含文件路径）
```

组件说明：
1. 复选框 `- [ ]`
2. 任务 ID 顺序编号（T001...）
3. [P] 仅用于可并行任务
4. [Story] 仅用于用户故事阶段（格式 [US1]/[US2]/...）；Setup/Foundational/Polish 无故事标签。
5. 描述需含具体文件路径。

### 任务组织
1. 基于用户故事（主轴）：每故事独立阶段，含模型/服务/端点/测试（若需要），标注依赖。
2. 基于合同：端点映射到对应故事；若需测试，先生成合同测试。
3. 基于数据模型：实体映射到使用它的最早故事或 Setup。
4. 基于基础设施：共享部分放 Setup，阻塞性放 Foundational，故事特有放对应阶段。

### 阶段结构
- Phase 1: Setup（初始化）
- Phase 2: Foundational（阻塞前置）
- Phase 3+: 按优先级的用户故事；故事内顺序：测试 → 模型 → 服务 → 端点 → 集成
- Final Phase: 打磨与跨领域

## 报告结构
- 发现/依赖/并行示例表
- 覆盖摘要：需求与任务映射、未映射项、非功能性覆盖
- 下一步命令建议（如继续 /speckit.analyze 或 /speckit.implement）
