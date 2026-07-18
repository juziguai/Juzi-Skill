# 发布与回滚

## 通道

- main：开发分支。
- beta：默认指向 main，用于候选验证。
- stable：正式市场引用，只能在完整门禁和隔离 Canary 通过后推进。
- market-vYYYY.MM.DD.N：不可变正式发布 Tag。

## 版本规则

- 用户可见功能新增：提升 minor。
- 兼容修复：提升 patch。
- 同一功能版本重新打包：更新 SemVer build metadata/cachebuster。
- 插件包内容变化但 manifest 版本未变化时，预检必须失败。
- 纯 Skill 没有独立 manifest 版本；发布凭证记录源码树哈希和市场 Tag。

## 发布顺序

1. 修改 canonicalPath 并运行定向测试。
2. 对 generated-copy 项目执行原子同步。
3. 更新插件版本/cachebuster。
4. 运行 Test-JuziRelease.ps1 -All -History。
5. 运行 Test-JuziCanary.ps1。
6. 更新 CHANGELOG 的新增、变更、修复。
7. 经明确 Git 授权后提交并推送候选。
8. 等待 CI 全绿。
9. 显式触发 Release marketplace workflow，生成凭证、annotated tag 和 GitHub Release；stable 发布同时推进 stable 分支。
10. 本机刷新市场、重装受影响插件并在新任务中证明加载。

## 回滚

发布凭证中的 Git SHA 是唯一回滚目标。默认命令只生成计划，不修改引用或安装状态：

    python scripts/juzi_release.py rollback-plan --receipt <receipt.json>

真实回滚需要重新确认目标 SHA、市场引用、插件重装范围和新任务加载证明。纯 Skill 使用 .codex/skill-install-backups 或发布时生成的安装备份。禁止为回滚直接编辑插件缓存。
