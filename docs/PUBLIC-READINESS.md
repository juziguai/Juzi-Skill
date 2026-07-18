# 公开准备基线

2026-07-19 的公开前审计覆盖完整 3 个 Git 提交和 111 个跟踪文件。

## 已通过

- 高置信 GitHub Token、云密钥、私钥、Bearer Token 和数据库凭据为 0 命中。
- 手机号、身份证和 URL 凭据为 0 命中。
- Git 历史体积较小，可进行逐提交审计。
- 旅游攻略明确要求原创或 AI 示意图，不复制第三方图片。

## 已治理

- 仓库所有者已选择 MIT License，根目录许可证文本和注册表声明一致。
- 本机 Windows 路径通过兼容文档声明为 Juzi 环境专用，不作为公共通用路径。
- 大型 HTML 和内嵌图片受项目资产预算约束。
- SECURITY、CONTRIBUTING、CHANGELOG、CODEOWNERS 和自动安全门禁纳入候选。

## 公开停止条件

- 完整候选预检、隔离 Canary 或 CI 未通过；
- 仓库 HEAD 与待公开审核 SHA 不一致；
- 存在未说明的用户改动。

只有停止条件全部解除后，Set-JuziGitHubGovernance.ps1 才允许执行一次公开切换。
