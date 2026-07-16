---
name: juzi-sync-project-docs
description: 基于项目真实版本、Git 提交、变更文件和现有文档发现并修正文档漂移。适用于版本发布、阶段性开发完成、合并前收尾，或用户提出 README、CHANGELOG、架构说明、使用指南与实际代码不一致时。
---

# 同步项目文档

## 工作目标

以仓库中的可验证事实为唯一依据，将版本、功能、命令、配置和发布说明同步到合适的项目文档。保持最小修改面，不用推测替代证据，不把过程记录塞进面向用户的文档。

已启用且项目显式配置文档同步时，`UserPromptSubmit` 会记录本回合受监控行为路径的基线，`Stop` 会检查这些路径是否发生变化但没有同步文档。项目根目录必须存在 `.codex\doc-sync.json`，例如：

```json
{
  "enabled": true,
  "mode": "block",
  "behavior_paths": ["src/", "api/", "package.json"]
}
```

没有该文件或 `enabled` 不为 `true` 时，Hook 静默跳过；只读、测试和不在 `behavior_paths` 内的改动不会触发。仅 `mode: "block"` 会阻止结束以要求同步文档。Hook 只触发一次，不创建提交、不推送，也不改写历史发布记录。

可从 `templates\doc-sync.json` 复制模板；仅在确认该项目的行为路径和文档同步要求后再启用。

## 安装

使用安装器注册到 Codex 的用户级 Skill 目录，并合并全局 Hook 配置：

```powershell
& "D:\Tools\AI\Juzi-Skill\Juzi-sync-project-docs\scripts\install.ps1" -Mode Install
```

安装器创建目录联接而不复制 Skill，因此源目录更新会立即生效；它只追加自己的 Hook，不覆盖已有配置，并在修改 `hooks.json` 前创建带时间戳的备份。

```powershell
# 查看是否已注册
& "D:\Tools\AI\Juzi-Skill\Juzi-sync-project-docs\scripts\install.ps1" -Mode Status

# 删除目录联接与本 Skill 的 Hook，保留其他 Hook
& "D:\Tools\AI\Juzi-Skill\Juzi-sync-project-docs\scripts\install.ps1" -Mode Uninstall
```

## 工作流

1. 先定位项目根目录，读取 `AGENTS.md`、贡献规范、文档目录和 Git 状态。
2. 运行随附扫描器，默认仅生成报告：

```powershell
& "<Skill 目录>\scripts\scan-project-doc-drift.ps1" -ProjectRoot "<项目绝对路径>" -OutputPath "<报告路径>"
```

3. 审查报告中的 `version_sources`、`commits`、`stale_current_version_mentions` 和 `suggested_actions`。版本以运行时或构建清单为准；提交标题只作为变更线索，必须检查对应 diff 或代码入口。
4. 划定本轮文档范围：
   - 发布或用户可见功能：更新 `README`、`CHANGELOG`、相关使用指南和协议文档。
   - 内部架构或运维行为：更新相应 `doc/`、`docs/` 或 `reference/` 文件。
   - 历史 release notes：只允许补充明确的勘误，不将旧版本号替换为当前版本。
5. 先给出“事实 -> 文档文件 -> 拟修改内容”的简短清单。用户未要求直接修改时，停在此处；已授权修改时，用最小补丁写入文档。
6. 复查修改后的文档：确认版本来源一致、命令存在、链接和路径有效、功能表述与代码/配置相符。仅文档改动时不运行测试；若仓库另有文档校验命令，按其规则执行。

## 判定规则

- 将扫描器报告中的 `stale_current_version_mentions` 视为候选项，不把 changelog 的历史版本或示例版本误判为漂移。
- 出现多个版本源时，先调查其职责。运行时版本、包清单、发布清单可能分别服务不同场景，不能机械统一。
- 未推送提交、无 release tag、未跟踪生成物属于发布收尾信号；报告事实并让用户决定是否提交、推送或清理。
- 不自动改写 API 契约、迁移指南、安全说明和历史发布记录；这些内容必须有对应代码或用户确认。
- 不执行 `git commit`、`git push`、删除文件或依赖安装，除非用户明确要求。

## 报告阅读

扫描器输出 JSON，主要字段如下：

- `canonical_version`：按运行时/清单优先级识别的当前版本。
- `version_sources`：所有发现的版本来源，供处理多包仓库或发布元数据分歧。
- `commits`：自最近 tag 或指定基线以来的提交摘要，帮助定位应更新的文档。
- `docs`：被检查的项目文档清单。
- `stale_current_version_mentions`：在“当前/最新/推荐/current/latest”等语境里提到旧版本的候选行。
- `suggested_actions`：基于事实生成的非破坏性建议。

## 资源

- `scripts/scan-project-doc-drift.ps1`：跨常见 Node、Python、Rust、.NET 项目读取版本、Git 基线和文档版本提及，默认只读。
- `scripts/codex-doc-sync-hook.ps1`：供全局 `UserPromptSubmit` 与 `Stop` Hook 调用，按回合基线判断是否需要继续文档同步。
- `scripts/install.ps1`：安装、检查或卸载 Codex Skill 联接与 Hook 注册，不覆盖其他全局 Hook。
