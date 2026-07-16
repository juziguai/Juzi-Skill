# 质量门禁

## 构建前

- [ ] 相对日期已转换为绝对日期，去返程和住宿晚数算术一致。
- [ ] `sampleOnly` 为 `false`，所有示例占位均已替换。
- [ ] 易变事实有 `verifiedAt`、状态边界和官方复核入口。
- [ ] 本地图片已压缩；无原始大 PNG、无第三方盗链、无未说明的 AI 示意图。
- [ ] 运行生成器 `--validate-only` 通过。

## 内容

- [ ] 交通、接驳、每日路线、票务、住宿、美食、预算、天气、行李和来源齐全。
- [ ] 每天节奏可执行，包含进站/登船/换乘缓冲和雨天兜底。
- [ ] 价格区间和余票不写成永久承诺。
- [ ] 用户要求保留旧文案时，对冻结基线执行可见文字逐段比较，缺失必须为 0。

## 网页

- [ ] 只有内联 CSS/JS；离线模式下无外部图片、字体或脚本依赖。
- [ ] 导航、清单、预算切换、天气刷新、返回顶部均可退化；正文不依赖联网。
- [ ] 使用语义化标题、替代文本、键盘可操作控件与 `prefers-reduced-motion`。
- [ ] 桌面四列/两列和移动单列布局无横向溢出。
- [ ] 图片与输出体积低于计划预算；两个副本存在时哈希一致。

## 验证命令

```powershell
node "<skill-dir>\scripts\build-guide.mjs" --input ".\work\travel-plan.json" --validate-only
node "<skill-dir>\scripts\build-guide.mjs" --input ".\work\travel-plan.json" --output ".\outputs\旅游攻略.html"
node "<skill-dir>\scripts\smoke-test.mjs"
```

检查生成器报告的图片数量、总图片 KiB、HTML KiB 和 SHA256。若门禁失败，优化资产或补齐事实，不要直接放宽阈值。

## 交付说明

最终汇报包含：一句话结论、关键假设、核实日期、实时边界、输出文件、体积、验证结果和验收入口。不要把内部临时 JSON 或测试文件当成交付物。
