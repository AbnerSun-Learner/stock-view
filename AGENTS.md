<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, prefer skills already injected via Cursor **agent_skills**（`.cursor/skills/`、`.agents/skills/` 等 workspace 配置的路径）。若任务依赖 Anthropic OpenSkills 生态中的通用技能（例如 docx、xlsx），在本机安装对应技能源后再执行：

- `npx openskills read <skill-name>`（可多选：`npx openskills read a,b`）
- 输出中的 base directory 用于解析捆绑资源（references/、scripts/、assets/）

**仓库变更（2026-05-09）**：原内嵌目录 `.claude/skills/` 已删除以减小克隆体积，不再随仓库提供上述通用技能副本；需要从 Git 历史恢复或使用全局/用户级 OpenSkills 安装。

Usage notes:

- 勿重复加载已在上下文中的技能内容。
- 每次 `openskills read` 调用是无状态的。
  </usage>

<available_skills>

<!-- 内嵌 project 技能表已随 `.claude/skills/` 移除；枚举以 Cursor agent_skills 与本机 openskills 为准。 -->

</available_skills>

<!-- SKILLS_TABLE_END -->

</skills_system>
