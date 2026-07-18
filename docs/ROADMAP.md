# P0-P2 落地矩阵

| 编号 | 能力 | 实现入口 |
|---|---|---|
| 1 | 公开前安全审计 | juzi_release.py public-audit、PUBLIC-READINESS.md |
| 2 | 公共治理文件 | SECURITY、CONTRIBUTING、CHANGELOG、CODEOWNERS；LICENSE 待选择 |
| 3 | 仓库公开 | Set-JuziGitHubGovernance.ps1 的单次受控切换 |
| 4 | Rulesets | GitHub 治理脚本，保护 main/stable |
| 5 | 单一项目注册表 | .agents/projects.json |
| 6 | 统一预检 | Test-JuziRelease.ps1 |
| 7 | 授权发布 | Publish-JuziRelease.ps1 |
| 8 | CI 扩展 | validate-marketplace.yml |
| 9 | 供应链安全 | 固定 Action SHA、CodeQL、历史秘密扫描 |
| 10 | 稳定通道 | main/beta/stable 与 Release workflow |
| 11 | 隔离 Canary | Test-JuziCanary.ps1 |
| 12 | 回滚 | receipt + rollback-plan |
| 13 | 增量验证 | juzi_release.py changed/affected projects |
| 14 | 自动目录 | manage_catalog.py |
| 15 | 版本策略 | RELEASES.md、包变更版本门禁 |
| 16 | Tag/Release | release-marketplace.yml |
| 17 | 发布凭证 | juzi_release.py receipt |
| 18 | 三态证明 | health、Canary、LoadedState |
| 19 | Codex 兼容矩阵 | COMPATIBILITY.md |
| 20 | 弃用迁移 | DEPRECATION.md |
| 21 | 子项目质量契约 | PROJECT-QUALITY.md、注册表 tests |
| 22 | 定时漂移 | market-health.yml |
| 23 | 干净环境安装 | Test-JuziCanary.ps1、CI |
| 24 | 市场健康报告 | juzi_release.py health |
| 25 | stable/beta | 注册表与发布 workflow |
| 26 | 发布复盘 | OPERATIONS.md |
| 27 | 回滚演练 | rollback-plan 与定期演练 |
| 28 | 子项目脚手架 | new_juzi_project.py、templates |
| 29 | 资产预算 | ASSET-POLICY.md、验证器 |
| 30 | 拆仓评估 | REPOSITORY-SPLIT.md |
