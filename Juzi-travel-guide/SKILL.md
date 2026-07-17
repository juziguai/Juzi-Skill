---
name: juzi-travel-guide
description: "为任意出发地、目的地与日期调研实时交通、票务、天气、住宿、景点、美食和预算，并生成带来源、原创图片、交互动效、地图入口及离线单文件交付的详细旅游攻略网页。Use when 用户要求旅游攻略、周末游或多日行程、从某地出发的车次船票酒店美食推荐，或希望一键复用同类互动攻略网页。"
---

# 旅游攻略网页生成器

把事实调研与网页呈现分开：新攻略先形成可核验的结构化行程 JSON，再用确定性脚本生成自包含 HTML。用户明确指定既有 HTML 继续迭代时，先冻结该文件为视觉与内容基线，从副本做局部增强；不要借迭代重做设计，也不要从旧攻略复制易过期事实到新行程。

## 执行流程

1. 明确出发地、目的地、绝对日期、人数、交通偏好、住宿预算和兴趣。只有歧义会改变结果或引入风险时才询问；其余使用安全假设并在攻略中写明。
2. 在检索前完整阅读 [references/research-and-verification.md](references/research-and-verification.md)。交通、票价、天气、开放时间、政策与推荐都具有时效性，必须联网核实。
3. 复制 [assets/plan.template.json](assets/plan.template.json) 到任务工作区，按照 [references/plan-schema.md](references/plan-schema.md) 填写。完整覆盖旅行日期，每站使用 `HH:MM` 并按时间排序；把核实时间、快照状态、官方入口和来源 URL 一并写入。
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

7. 在桌面与移动视口打开最终 HTML，检查行程驾驶舱、清单进度、逐日跳转、外部链接、触控目标和横向溢出；至少保存一张桌面和一张移动截图作为本次验收证据。
8. 交付生成的 `outputs/*.html`，报告核实日期、关键假设、实时数据边界、文件体积和验证结果。除非用户明确要求，不发布、不提交 Git、不代替用户下单。

## 既有攻略增量路径

- 用户点名既有 HTML 时，先记录绝对路径、字节数和 SHA256；原文件只读，输出使用明确的“迭代版”文件名。
- 保留原版可见文案、配色、首屏构图、章节顺序、真实内容、交互和动效语言；第一轮优先修复已复现的响应式、触控、可访问性或失败状态问题。
- 本项目的厦门金标准原版是 `ChatGPT-5.6 Sol-深圳出发-厦门三天两夜攻略.html`，SHA256 为 `73D6A98937D1D8394D8162595C0BEA7AEB2FA52CA36FB8440F2640FCF5BD4698`。仅在迭代这份原版时运行：

  ```powershell
  node "<skill-dir>\scripts\refine-reference-guide.mjs"
  node "<skill-dir>\scripts\refine-reference-guide.test.mjs"
  node "<skill-dir>\scripts\refine-reference-guide.mjs" --check
  ```

- 用户明确要求按 `references/apple-design-language-research.md` 融合 Apple 方法时，仍以同一金标准原版为只读输入，运行独立构建链：

  ```powershell
  node "<skill-dir>\scripts\build-apple-reference-guide.mjs"
  node "<skill-dir>\scripts\build-apple-reference-guide.test.mjs"
  node "<skill-dir>\scripts\build-apple-reference-guide.mjs" --check
  ```

  产物固定为 `ChatGPT-5.6 Sol-深圳出发-厦门三天两夜攻略-Apple风格迭代版.html`。交付前更新 `design-qa.md`，记录同视口对照图、关键交互、修复历史和 `final result: passed`；不要让这条专用构建链覆盖普通迭代版或通用模板。

- 桌面稳定截图必须与原版像素一致；移动端至少检查 390px 和 320px，页面滚动宽度不得大于视口，所有可见交互目标不得小于 44x44px。

## 关键纪律

- 把“本周五”等相对日期转换为绝对日期，并显示年份。
- 优先使用运营方、政府、景区、酒店和交通官方来源；推荐类信息至少说明来源与核实时间。
- 不在本地网页中直连不稳定、受 CORS 或反爬限制的票务私有接口。实时余票优先提供预填官方查询入口；静态信息必须标注为核实时快照。
- 联网刷新必须由用户主动触发、失败时保留快照正文，并给出官方兜底入口；不要让失败 Toast 覆盖可读内容。
- 高德等免 Key URI 可用于导航入口；需要 Key 的完整地图 SDK 不得暗中嵌入。
- 用户要求“内容不变”时，冻结旧输出并逐段比较可见文字；只新增必要的交互说明或图片免责声明。
- 迭代既有模板时，原版的配色、字体层级、内容顺序和卡片语言是默认视觉基线；除非用户明确要求重设计，只做局部增强并用同视口截图逐项对照。新增辅助模块优先放在原有核心信息组合之后，不插入并拆散原版连续流程。
- 动效遵循 `prefers-reduced-motion`，交互支持键盘和触屏，核心内容不得依赖联网才能阅读。
- 行程驾驶舱必须能在行前显示剩余事项、旅行当天显示下一站，清单进度只保存在当前设备；没有 JavaScript 时仍展示完整正文和逐日入口。
- 图片和最终 HTML 必须通过生成器的体积预算；禁止把原始大 PNG 直接 Base64 内嵌。

## 资源路由

- 调研与来源策略：读取 `references/research-and-verification.md`。
- 规划产品的布局、模块、数据与交互模式：读取 `references/travel-planner-competitive-research.md`；只吸收与当前攻略目标匹配的模式，继续以指定原版做增量迭代。
- Apple-inspired 视觉与交互融合：读取 `references/apple-design-language-research.md`；保留原版品牌内容层，只在导航、日期、地图和下一站等控制层克制使用 Apple 方法，不复制 Apple 商标、字体或产品素材。
- JSON 字段、必填项和图片路径：读取 `references/plan-schema.md`。
- 构建、内容、可访问性和离线交付验收：读取 `references/quality-gates.md`。
- 指定厦门原版的确定性增量修复：直接运行 `scripts/refine-reference-guide.mjs`，不要先运行通用模板覆盖原版。
- 指定厦门原版的 Apple-inspired 控制层实现：运行 `scripts/build-apple-reference-guide.mjs` 及其测试，并以 `design-qa.md` 作为视觉验收记录。
- 正常生成时直接运行脚本，不读取或复制 `assets/travel-guide-template.html`；只有修复模板时才打开它。

## 预期产物

- `work/travel-plan.json`：已核实的结构化事实与文案。
- `public/` 或 `work/images/`：经压缩的原创 WebP 图片，可选。
- `outputs/<出发地>-<目的地>-<天数>攻略.html`：可直接双击、核心内容离线可读的单文件网页。
