# 贡献指南

Juzi-Skill 是 Juzi 个人 Codex 市场。贡献必须保持规范源码、市场包、安装产物和加载状态边界清晰。

## 开发流程

1. 在 .agents/projects.json 登记或更新项目事实。
2. 只修改项目的 canonicalPath；generated-copy 插件通过发布工具同步包副本。
3. 运行：

       & .\scripts\Test-JuziRelease.ps1 -All -History
       & .\scripts\Test-JuziCanary.ps1

4. 更新 CHANGELOG.md 的“新增、变更、修复”。
5. 不提交 .codex/ 报告、缓存、凭据、生成沙箱或本机安装目录。

## 变更约束

- 新能力默认使用纯 Skill；只有需要 MCP、App、Hook 或多 Skill 组合时才使用插件。
- 插件包不得包含 Junction、符号链接或直接指向开发目录。
- 新子项目必须声明平台、测试、安装标识、质量门禁和资产预算。
- 不直接修改 C:\Users\<user>\.codex\plugins\cache。
- 不把命令退出码、UAC 回执或文件存在写成“加载成功”。

## Git 与发布

提交格式遵循仓库全局规范。Tag 和 GitHub Release 只能由完整预检通过后的显式发布工作流创建；不得手工跳过发布凭证或稳定通道。
