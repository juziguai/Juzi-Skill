# 市场运维

## 周度健康

GitHub Marketplace health workflow 每周执行完整预检，生成 health、preflight 和 release receipt JSON 工件。未安装 Codex 的 CI 只证明源码与包状态；本机安装健康由 juzi_release.py health --require-installed 证明。

## 故障分类

- 源码失败：停止打包，修复 canonicalPath。
- 包漂移：使用 sync 计划和原子同步，不手改缓存。
- 市场刷新失败：保留已安装版本，不重复覆盖。
- 插件安装失败：停止后续插件，保留上一已知可用市场 SHA。
- 新任务未加载：报告 installed 但 not loaded，不伪造成功。
- 公开风险：立即转回 private 并处置秘密；公开暴露无法完全撤销。

## 复盘

发布失败必须记录触发步骤、用户影响、确定性根因、未知项、恢复证据和永久门禁。重复失败优先改发布控制面，不依赖“下次记住”。

## 定期演练

- 每周：源码、包、市场目录和安装漂移。
- 每月：隔离全市场安装。
- 每个正式发布：回滚计划 dry-run。
- 每季度：用已知安全凭证演练稳定引用回退，不修改生产安装。
