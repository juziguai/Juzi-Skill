# 兼容矩阵

| 范围 | 支持状态 | 说明 |
|---|---|---|
| Windows + Codex App | 主要支持 | Juzi 的生产路径；发布和安装需真实验证 |
| Windows + Codex CLI | 支持 | 用于隔离 Canary、安装和加载证明 |
| Ubuntu CI | 结构支持 | 验证 Python、Node、市场包和跨平台 Skill |
| macOS | 未验证 | 不宣称支持 |
| Junction 安装 | 条件支持 | 只有 Canary 新任务证明 Loader 接受时使用 |
| 哈希一致真实副本 | 当前支持 | 当前 Windows Loader 的纯 Skill 默认安装模式 |

## 路径边界

仓库中出现的 D:\Tools\AI\Juzi-Skill 和 C:\Users\juzi\.codex 是 Juzi 环境的规范路径，不是通用安装保证。公共使用者应通过 CODEX_HOME、用户目录和注册表声明解析路径；不允许把这些个人路径写入第三方用户配置。

## 兼容变更

修改 Skill 名称、插件 id、marketplace 名称、安装路径或 required tool 时，必须：

1. 在 CHANGELOG 标记兼容边界；
2. 提供迁移说明；
3. 保留至少一个正式发布周期的旧入口或明确失败信息；
4. 用干净 Codex 环境执行安装与加载证明。
