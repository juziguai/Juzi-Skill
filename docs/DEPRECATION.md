# 弃用与迁移

项目状态由 .agents/projects.json 的 status 字段控制：

- active：正常开发和发布。
- deprecated：仍可安装，但必须在 README、CHANGELOG 和插件说明中给出替代入口与截止日期。
- retired：从新市场目录移除；历史 Tag 和迁移说明继续保留。

## 最低弃用周期

1. 一个正式发布周期标记 deprecated。
2. 发布凭证记录旧 id、替代 id 和迁移步骤。
3. 新任务加载验证同时检查旧入口的明确提示和新入口可用。
4. 下一个正式周期才允许 retired。

禁止直接复用已退休的插件 id 表示不同能力，也不得无迁移说明删除用户数据、配置或 Hook。
