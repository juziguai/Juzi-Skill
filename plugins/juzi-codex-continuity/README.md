# Juzi-Codex-Continuity

一个面向 Codex 长任务的极简连续性插件。

它不保存聊天原文，不使用数据库、MCP、向量检索、后台进程或 UI。它只让当前工作状态落在项目内的一个文件中，使上下文压缩、换会话或中断之后的 Codex 能从可验证的下一步继续。

## 唯一状态文件

在目标项目内维护 `.codex/ACTIVE_TASK.md`。文件模板见 [templates/ACTIVE_TASK.md](templates/ACTIVE_TASK.md)。

状态文件必须短小，只包含：

- 目标与验收标准
- 当前范围与禁区
- 已证实事实和关键决定
- 已做改动及测试证据
- 未完成项或阻塞项
- 唯一的 `NEXT_ACTION`

## 事实优先级

`git diff` 和测试结果高于 `ACTIVE_TASK.md`；`ACTIVE_TASK.md` 高于 `AGENTS.md` 中的任务性描述；压缩摘要只用于快速恢复，不能覆盖真实工作区。

## 使用方式

当任务跨多个步骤、会话或即将压缩时，调用 `juzi-codex-continuity` skill。它会要求 Codex 在开始、关键决策、编辑完成、测试完成和恢复任务时更新或校验状态文件。

压缩提示词模板见 [templates/compact-prompt.md](templates/compact-prompt.md)。是否把它写入全局 Codex 配置必须由用户明确确认。
