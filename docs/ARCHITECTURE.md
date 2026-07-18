# 市场架构

Juzi-Skill 使用四层状态模型：

1. 规范源码：D:\Tools\AI\Juzi-Skill 中注册表声明的 canonicalPath。
2. 远端市场：GitHub stable 或 beta 引用中的 marketplace.json 与插件包。
3. 本机安装：纯 Skill 安装目录及 Codex 管理的插件市场快照。
4. 任务加载：新 Codex 任务实际暴露的 Skill、工具与描述。

任何一层成功都不能替代下一层证明。

## 单一事实源

.agents/projects.json 登记全部能力单元。marketplace.json、README 目录、变更项目选择、测试、资产预算、安装和发布凭证均从该注册表派生或校验。

## 项目类型

- pure-skill：规范源码直接位于仓库根级 Juzi-* 目录，通过已验证 Junction 或哈希一致真实副本安装。
- plugin / in-package：规范源码就是插件包内 Skill，不维护第二份副本。
- plugin / generated-copy：根级规范源码是唯一编辑入口，发布工具原子同步到插件包并保留备份。

## 控制面

- manage_catalog.py：生成或检查市场与 README 目录。
- validate_marketplace.py：结构、注册表、包漂移、安全契约和资产预算。
- juzi_release.py：变更选择、预检、凭证、健康、同步、公开审计与回滚计划。
- PowerShell 包装器：Windows 主路径上的发布、Canary 和 GitHub 治理。

控制面不自动创建 Git commit、push、tag 或 Release；这些动作必须来自明确授权或显式 GitHub workflow_dispatch。
