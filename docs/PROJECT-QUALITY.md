# 子项目质量契约

每个项目必须在 .agents/projects.json 声明：

- id、kind、owner、status；
- canonicalPath、installedId、platforms；
- 插件的 packagePath、packagedSkillPath 和 sourceMode；
- 至少一个 Skill 结构验证；
- 插件结构验证及 generated-copy 源码/包一致性验证；
- 项目特有命令测试；
- 大型资产项目的文件、目录和内嵌图片预算。

## 全局门禁

- 注册表与市场目录一致；
- 没有孤儿插件目录或未登记纯 Skill；
- 没有符号链接进入插件包；
- 没有高置信秘密或凭据；
- 生产安全契约未被删除；
- 文档目录与注册表一致；
- Git diff 无空白错误；
- 发布包变更伴随版本/cachebuster；
- 隔离安装和回滚计划可执行。

项目定向测试失败时不得以其他项目通过作为抵消。
