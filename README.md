# Juzi Skill

`Juzi Skill` 是 Juzi 维护的个人 Codex 插件市场。仓库保存市场目录、可安装插件包，以及与插件发布直接相关的规范源码和验证工具。

## 插件目录

| 插件 | 用途 |
|---|---|
| `juzi-codex-continuity` | 使用 `.codex/ACTIVE_TASK.md` 保存长任务的可验证恢复状态。 |
| `juzi-codex-skill-lifecycle` | 创建、验证、安装和更新 Juzi Skill、插件与 MCP 能力。 |
| `juzi-team-lead` | 在用户明确要求委派或并行工作时协调多 Agent 实施与验收。 |
| `juzi-windows-elevation` | 通过审阅脚本、哈希锁和 UAC 完成可审计的 Windows 管理员操作。 |
| `juzi-sync-project-docs` | 根据真实版本、Git 和代码变更发现并修正文档漂移。 |
| `juzi-travel-guide` | 调研实时交通、住宿、天气和玩法，生成可离线交付的互动旅游攻略网页。 |

## 添加市场

当前仓库默认为私有仓库。首次使用前，确保 GitHub CLI 已登录并为 Git 配置凭据：

```powershell
gh auth login
gh auth setup-git
codex plugin marketplace add juziguai/Juzi-Skill --ref main
```

添加成功后，可以在 Codex App 的“插件 -> 个人 -> Juzi Skill”中按需安装，也可以使用 CLI：

```powershell
codex plugin add juzi-travel-guide@juzi-skill
```

## 更新市场

```powershell
codex plugin marketplace upgrade juzi-skill
codex plugin add juzi-travel-guide@juzi-skill
```

`marketplace upgrade` 只刷新 Git 市场快照。已安装插件需要在界面中更新，或重新运行对应的 `codex plugin add`。

## 仓库结构

```text
.agents/plugins/marketplace.json   # Codex 市场目录
plugins/<plugin>/                  # Codex 实际打包和安装的插件源码
<Juzi Skill 源码>/                 # 本仓直接维护的规范源码
scripts/validate_marketplace.py    # 跨平台市场与源码漂移校验
.github/workflows/                 # GitHub 持续验证
```

本机目录中还可能存在第三方仓库、虚拟环境、测试结果和诊断工具。根 `.gitignore` 使用白名单策略，确保这些内容不会进入市场仓库。

## 开发与发布

1. 只在规范源码或独立上游仓库中修改 Skill。
2. 将 Skill 以真实文件同步到 `plugins/<plugin>/skills/<skill>/`，不要使用 Junction。
3. 运行对应 Skill 的定向测试和本仓验证器：

   ```powershell
   python scripts/validate_marketplace.py
   ```

4. 使用 Codex 官方 plugin creator 更新 cachebuster 并验证插件。
5. 提交并推送 `main`，再运行 `codex plugin marketplace upgrade juzi-skill` 验收远程快照。
6. 新建 Codex 任务确认 Skill locator 指向插件缓存，而不是开发源码。

## 发布边界

- 不提交密钥、`.env`、用户配置、扫描结果、缓存、虚拟环境、依赖目录或 Codex 插件缓存。
- 不手工编辑 `C:\Users\<user>\.codex\plugins\cache`。
- `plugins/` 是安装包来源；根级 Skill 目录存在时，它仍是业务维护入口。
- 独立 Git 项目保留自己的提交历史，不作为嵌套仓库加入本市场。
