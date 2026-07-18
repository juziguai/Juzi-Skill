# Juzi Skill

`Juzi Skill` 是 Juzi 维护的个人 Codex 插件市场。仓库保存市场目录、可安装插件包，以及与插件发布直接相关的规范源码和验证工具。

## 插件目录

| 插件 | 用途 |
|---|---|
| `juzi-codex-continuity` | 使用 `.codex/ACTIVE_TASK.md` 保存长任务、受保护生产基线和破坏性动作边界。 |
| `juzi-codex-skill-lifecycle` | 创建、验证并以 Junction 或哈希一致副本安装 Juzi 能力，最后用新任务证明实际加载。 |
| `juzi-team-lead` | 在用户明确要求委派或并行工作时协调多 Agent 实施与验收。 |
| `juzi-windows-elevation` | 通过失败注入、受保护基线、哈希锁和非管理员复验完成可审计的 Windows 管理员操作。 |
| `juzi-sync-project-docs` | 根据真实版本、Git、代码变更和生产运维语义发现并修正文档漂移。 |
| `juzi-travel-guide` | 调研实时交通、住宿、天气和玩法，生成可离线交付的互动旅游攻略网页。 |

## 本地纯 Skill 源码

| 规范源码 | 安装标识 | 生产安全职责 |
|---|---|---|
| `Juzi-arming-thought` | `arming-thought` | 任务入口的副作用分级和安全路由 |
| `Juzi-workflows` | `workflows` | 生产预检、standby、事务化切换、回滚和救援 |
| `Juzi-investigation-first` | `investigation-first` | 实时基线、用户影响、回滚点和未知项 |
| `Juzi-contradiction-analysis` | `contradiction-analysis` | 将服务连续性作为生产变更的优先约束 |
| `Juzi-concentrate-forces` | `concentrate-forces` | 保护可用基线，禁止并行扰动和重复重门禁 |
| `Juzi-practice-cognition` | `practice-cognition` | 低爆炸半径验证、失败注入和 10 分钟重大变更验收 |
| `Juzi-criticism-self-criticism` | `criticism-self-criticism` | 事故影响、根因、未知项和永久防复发机制 |

这些纯 Skill 先用一个 canary 验证当前 Codex Loader 是否接受 Junction；若出现未信任挂载点或新任务缺失 Skill，则回退为逐文件 SHA-256 一致的真实安装副本。无论安装模式如何，规范源码始终是唯一编辑入口。

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
Juzi-<pure-skill>/                 # 纯 Skill 规范源码，canary 后选择 Junction 或哈希副本
scripts/validate_marketplace.py    # 市场、源码漂移与生产安全契约校验
.github/workflows/                 # GitHub 持续验证
```

本机目录中还可能存在第三方仓库、虚拟环境、测试结果和诊断工具。根 `.gitignore` 使用白名单策略，确保这些内容不会进入市场仓库。

## 开发与发布

1. 只在规范源码或独立上游仓库中修改 Skill；纯 Skill 不直接编辑用户安装目录。
2. 插件 Skill 以真实文件同步到 `plugins/<plugin>/skills/<skill>/`，不要使用 Junction；纯 Skill 经 canary 验证后选择 Junction 或哈希一致真实副本。
3. 运行对应 Skill 的定向测试和本仓验证器；验证器同时检查生产变更安全契约：

   ```powershell
   python scripts/validate_marketplace.py
   & .\scripts\Test-DocSyncScanner.ps1
   ```

4. 使用 Codex 官方 plugin creator 更新 cachebuster 并验证插件。
5. 提交并推送 `main`，再运行 `codex plugin marketplace upgrade juzi-skill` 验收远程快照。
6. 新建 Codex 任务确认 Skill locator 指向插件缓存，而不是开发源码。

## 发布边界

- 不提交密钥、`.env`、用户配置、扫描结果、缓存、虚拟环境、依赖目录或 Codex 插件缓存。
- 不手工编辑 `C:\Users\<user>\.codex\plugins\cache`。
- `plugins/` 是安装包来源；根级 Skill 目录存在时，它仍是业务维护入口。
- 独立 Git 项目保留自己的提交历史，不作为嵌套仓库加入本市场。
