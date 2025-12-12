---
description: 将现有任务转换为可执行、按依赖排序的 GitHub issue（基于已有设计）。
tools: ['github/github-mcp-server/issue_write']
---

## 用户输入

```text
$ARGUMENTS
```

在继续之前必须考虑用户输入（若非空）。

## 流程概述

1. 在仓库根运行 `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks`，解析 FEATURE_DIR 与 AVAILABLE_DOCS（绝对路径）。
2. 从脚本输出中获取 **tasks** 路径。
3. 读取远程地址：
   ```bash
   git config --get remote.origin.url
   ```
   > 仅当远程为 GitHub URL 时继续。
4. 遍历任务列表，为每个任务在对应的 GitHub 仓库创建 issue（使用 GitHub MCP 服务器）。
   > 若远程 URL 不匹配，禁止创建 issue。
