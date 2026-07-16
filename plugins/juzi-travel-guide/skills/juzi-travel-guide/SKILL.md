---
name: juzi-travel-guide
description: "为任意出发地、目的地与日期调研实时交通、票务、天气、住宿、景点、美食和预算，并生成带来源、原创图片、交互动效、地图入口及离线单文件交付的详细旅游攻略网页。Use when 用户要求旅游攻略、周末游或多日行程、从某地出发的车次船票酒店美食推荐，或希望一键复用同类互动攻略网页。"
---

# 旅游攻略网页生成器

把事实调研与网页呈现分开：先形成可核验的结构化行程 JSON，再用确定性脚本生成自包含 HTML。不要从旧攻略复制易过期事实。

## 执行流程

1. 明确出发地、目的地、绝对日期、人数、交通偏好、住宿预算和兴趣。只有歧义会改变结果或引入风险时才询问；其余使用安全假设并在攻略中写明。
2. 在检索前完整阅读 [references/research-and-verification.md](references/research-and-verification.md)。交通、票价、天气、开放时间、政策与推荐都具有时效性，必须联网核实。
3. 复制 [assets/plan.template.json](assets/plan.template.json) 到任务工作区，按照 [references/plan-schema.md](references/plan-schema.md) 填写。把核实时间、快照状态、官方入口和来源 URL 一并写入。
4. 需要菜品或景点图片时，使用当前可用的 `imagegen` Skill 生成原创图片；转成 WebP，写清替代文本和“视觉示意”免责声明。不要复制美食网站或攻略网站图片。
5. 运行生成器：

   ```powershell
   node "<skill-dir>\scripts\build-guide.mjs" --input ".\work\travel-plan.json" --output ".\outputs\旅游攻略.html"
   ```

6. 在交付前完整阅读 [references/quality-gates.md](references/quality-gates.md)，随后运行：

   ```powershell
   node "<skill-dir>\scripts\build-guide.mjs" --input ".\work\travel-plan.json" --validate-only
   node "<skill-dir>\scripts\smoke-test.mjs"
   ```

7. 交付生成的 `outputs/*.html`，报告核实日期、关键假设、实时数据边界、文件体积和验证结果。除非用户明确要求，不发布、不提交 Git、不代替用户下单。

## 关键纪律

- 把“本周五”等相对日期转换为绝对日期，并显示年份。
- 优先使用运营方、政府、景区、酒店和交通官方来源；推荐类信息至少说明来源与核实时间。
- 不在本地网页中直连不稳定、受 CORS 或反爬限制的票务私有接口。实时余票优先提供预填官方查询入口；静态信息必须标注为核实时快照。
- 联网刷新必须由用户主动触发、失败时保留快照正文，并给出官方兜底入口；不要让失败 Toast 覆盖可读内容。
- 高德等免 Key URI 可用于导航入口；需要 Key 的完整地图 SDK 不得暗中嵌入。
- 用户要求“内容不变”时，冻结旧输出并逐段比较可见文字；只新增必要的交互说明或图片免责声明。
- 动效遵循 `prefers-reduced-motion`，交互支持键盘和触屏，核心内容不得依赖联网才能阅读。
- 图片和最终 HTML 必须通过生成器的体积预算；禁止把原始大 PNG 直接 Base64 内嵌。

## 资源路由

- 调研与来源策略：读取 `references/research-and-verification.md`。
- JSON 字段、必填项和图片路径：读取 `references/plan-schema.md`。
- 构建、内容、可访问性和离线交付验收：读取 `references/quality-gates.md`。
- 正常生成时直接运行脚本，不读取或复制 `assets/travel-guide-template.html`；只有修复模板时才打开它。

## 预期产物

- `work/travel-plan.json`：已核实的结构化事实与文案。
- `public/` 或 `work/images/`：经压缩的原创 WebP 图片，可选。
- `outputs/<出发地>-<目的地>-<天数>攻略.html`：可直接双击、核心内容离线可读的单文件网页。
