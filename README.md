# Juzi Skill

`Juzi Skill` 是 Juzi 维护的个人 Codex 插件市场。仓库保存统一项目注册表、市场目录、可安装插件包、纯 Skill 规范源码，以及发布、回滚和长期健康验证工具。

当前市场控制面版本：`0.2.0`。插件继续使用各自 manifest 中的独立 SemVer。

市场采用四层状态模型：规范源码、GitHub 市场快照、本机安装、新任务加载。任一层成功都不能替代下一层证明。

## 插件目录

<!-- BEGIN GENERATED:PLUGIN_CATALOG -->
| 插件 | 用途 |
|---|---|
| `juzi-codex-continuity` | 保存长任务、生产基线和破坏性动作边界。 |
| `juzi-codex-skill-lifecycle` | 创建、验证、安装并证明 Juzi 自定义能力已加载。 |
| `juzi-team-lead` | 在明确授权时协调多 Agent 实施与验收。 |
| `juzi-windows-elevation` | 失败注入、哈希锁和非管理员复验的 Windows 提权协议。 |
| `juzi-sync-project-docs` | 基于真实版本、Git 和运维语义修正文档漂移。 |
| `juzi-travel-guide` | 生成带实时调研、原创图片和离线交互的旅行攻略。 |
<!-- END GENERATED:PLUGIN_CATALOG -->

## 本地纯 Skill 源码

<!-- BEGIN GENERATED:PURE_SKILL_CATALOG -->
| 规范源码 | 安装标识 | 职责 |
|---|---|---|
| `Juzi-arming-thought` | `arming-thought` | 任务入口的副作用分级和安全路由。 |
| `Juzi-workflows` | `workflows` | 生产预检、standby、事务化切换、回滚和救援。 |
| `Juzi-investigation-first` | `investigation-first` | 实时基线、用户影响、回滚点和未知项。 |
| `Juzi-contradiction-analysis` | `contradiction-analysis` | 将服务连续性作为生产变更的优先约束。 |
| `Juzi-concentrate-forces` | `concentrate-forces` | 保护可用基线，禁止并行扰动和重复重门禁。 |
| `Juzi-practice-cognition` | `practice-cognition` | 低爆炸半径验证、失败注入和重大变更验收。 |
| `Juzi-criticism-self-criticism` | `criticism-self-criticism` | 事故影响、根因、未知项和永久防复发机制。 |
<!-- END GENERATED:PURE_SKILL_CATALOG -->

这些纯 Skill 先用一个 canary 验证当前 Codex Loader 是否接受 Junction；若出现未信任挂载点或新任务缺失 Skill，则回退为逐文件 SHA-256 一致的真实安装副本。无论安装模式如何，规范源码始终是唯一编辑入口。

## 添加市场

仓库公开前需要 GitHub 凭据；公开后可直接添加。正式用户应跟踪 `stable`，开发验证使用 `main/beta`：

```powershell
gh auth login
gh auth setup-git
codex plugin marketplace add juziguai/Juzi-Skill --ref stable
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

## 项目注册表

`.agents/projects.json` 是全部能力单元的单一事实源，声明项目类型、规范源码、包路径、安装标识、平台、测试、状态和资产预算。以下文件必须与它一致：

- `.agents/plugins/marketplace.json`；
- 本 README 的插件与纯 Skill 目录；
- `plugins/` 实际目录；
- 发布预检选择的项目和测试。

检查目录漂移：

```powershell
python scripts/manage_catalog.py --check
```

## 仓库结构

```text
.agents/plugins/marketplace.json   # Codex 市场目录
.agents/projects.json              # 全部能力单元的单一事实源
plugins/<plugin>/                  # Codex 实际打包和安装的插件源码
<Juzi Skill 源码>/                 # 本仓直接维护的规范源码
Juzi-<pure-skill>/                 # 纯 Skill 规范源码，canary 后选择 Junction 或哈希副本
scripts/validate_marketplace.py    # 市场、源码漂移与生产安全契约校验
scripts/juzi_release.py            # 预检、凭证、健康、同步和回滚控制面
.github/workflows/                 # GitHub 持续验证
docs/                              # 发布、兼容、弃用、资产与运维规则
```

本机目录中还可能存在第三方仓库、虚拟环境、测试结果和诊断工具。根 `.gitignore` 使用白名单策略，确保这些内容不会进入市场仓库。

## 开发与发布

1. 只在规范源码或独立上游仓库中修改 Skill；纯 Skill 不直接编辑用户安装目录。
2. 插件 Skill 以真实文件同步到 `plugins/<plugin>/skills/<skill>/`，不要使用 Junction；纯 Skill 经 canary 验证后选择 Junction 或哈希一致真实副本。
3. 运行统一预检；它会从注册表选择项目测试，同时检查生产安全契约、秘密、资产和版本：

   ```powershell
   & .\scripts\Test-JuziRelease.ps1 -All -History
   ```

4. 使用隔离 Codex Home 验证全市场安装：

   ```powershell
   & .\scripts\Test-JuziCanary.ps1
   ```

5. `generated-copy` 插件通过 `Publish-JuziRelease.ps1 -Phase Prepare -Apply` 原子同步并更新 cachebuster；该脚本不提交或推送。
6. 经明确 Git 授权后提交候选并等待 CI 全绿。
7. 显式触发 `Release marketplace` workflow，创建 annotated tag、GitHub Release、发布凭证，并在 stable 发布时推进 `stable`。
8. 本机刷新市场、重装受影响插件，并运行 `Test-JuziLoadedState.ps1` 证明新任务实际加载。

完整顺序和回滚见 [发布手册](docs/RELEASES.md)，兼容边界见 [兼容矩阵](docs/COMPATIBILITY.md)。

## 发布边界

- 不提交密钥、`.env`、用户配置、扫描结果、缓存、虚拟环境、依赖目录或 Codex 插件缓存。
- 不手工编辑 `C:\Users\<user>\.codex\plugins\cache`。
- `plugins/` 是安装包来源；根级 Skill 目录存在时，它仍是业务维护入口。
- 独立 Git 项目保留自己的提交历史，不作为嵌套仓库加入本市场。
- 正式市场只从 `stable` 发布；`main/beta` 不作为长期支持版本。
- 所有大型资产必须符合 [资产预算](docs/ASSET-POLICY.md)，达到阈值后按 [拆仓规则](docs/REPOSITORY-SPLIT.md) 评估。
