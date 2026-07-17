# Apple 风格迭代版设计 QA

## 对照目标

- 设计基线：`D:\Tools\AI\Juzi-Skill\Juzi-travel-guide\ChatGPT-5.6 Sol-深圳出发-厦门三天两夜攻略.html`
- Apple 方法规范：`D:\Tools\AI\Juzi-Skill\Juzi-travel-guide\references\apple-design-language-research.md`
- 实现页面：`D:\Tools\AI\Juzi-Skill\Juzi-travel-guide\ChatGPT-5.6 Sol-深圳出发-厦门三天两夜攻略-Apple风格迭代版.html`
- 设计基线截图：
  - `D:\Tools\AI\Juzi-Skill\.codex\apple-implementation-audit\qa-source-desktop-1440.png`
  - `D:\Tools\AI\Juzi-Skill\.codex\apple-implementation-audit\qa-source-mobile-390.png`
- 实现截图：
  - `D:\Tools\AI\Juzi-Skill\.codex\apple-implementation-audit\qa-output-desktop-1440.png`
  - `D:\Tools\AI\Juzi-Skill\.codex\apple-implementation-audit\qa-output-mobile-390.png`

## 视口与状态

| 场景 | 视口 / 等效条件 | 状态 |
|---|---:|---|
| 桌面首屏 | 1440 x 1000 | 默认日期、行程视图 |
| 移动首屏 | 390 x 844 | 日期 2、行程视图、底栏与下一站可见 |
| 小屏移动 | 320 x 700 | 五项底栏完整、无横向溢出 |
| 200% 回流 | 640px CSS 等效宽度 | 凭证与状态列重排 |
| 减少动效 | `prefers-reduced-motion: reduce` | 持续动画关闭、过渡为 0s |
| 增强对比回退 | 不透明控制层 | 无 `backdrop-filter`，背景为 `#fffdf7` |

## 全视图对照证据

- 移动并排对照：`D:\Tools\AI\Juzi-Skill\.codex\apple-implementation-audit\comparison-mobile-390-final.png`
- 桌面并排对照：`D:\Tools\AI\Juzi-Skill\.codex\apple-implementation-audit\comparison-desktop-1440-final.png`
- 桌面截图在 in-app Browser 的 DPR 0.5 模式下出现重复拼接现象；DOM 视口、布局尺寸与溢出检测正常，因此桌面判断同时采用单独的 source/output 截图和 DOM 数据，不把拼接空白误判为页面布局。

## 聚焦区域证据

重要控件和交互状态不能只靠首屏全图判断，已单独核对：

- 地图视图与浮动工具栏：`D:\Tools\AI\Juzi-Skill\.codex\apple-implementation-audit\apple-output-mobile-390-map-final.png`
- 行程视图与日期联动：`D:\Tools\AI\Juzi-Skill\.codex\apple-implementation-audit\apple-output-mobile-390-plan-final.png`
- 更多菜单和显示设置：`D:\Tools\AI\Juzi-Skill\.codex\apple-implementation-audit\apple-output-mobile-390-more.png`
- 320px 小屏触控与底栏：`D:\Tools\AI\Juzi-Skill\.codex\apple-implementation-audit\apple-output-mobile-320-top.png`
- 桌面地图状态：`D:\Tools\AI\Juzi-Skill\.codex\apple-implementation-audit\apple-output-desktop-map-1440.png`

## 必查设计表面

- 字体与排版：保留原版 Georgia / 中文衬线标题与正文层级；新增控制统一使用系统字体栈。所有新增样式保持 `letter-spacing: 0`，320px 下标题和底栏文案不截断。
- 间距与布局节奏：原版首屏、票根、章节顺序和内容密度未改写；控制层浮于内容之上。390px 与 320px 无横向溢出，下一站动作条与底栏留有约 13px 间隔。
- 色彩与视觉令牌：保留暖黄、珊瑚红、深青和纸张背景；半透明材质只进入导航与控制，增强对比或材质不可用时回退为实色。
- 图片与资产质量：原版 8 个内嵌 WebP 全部保留；没有用 CSS 图形、文本符号或手写 SVG 替换原有视觉资产。新增图标使用离线 Lucide SVG mask，不复制 Apple 商标、SF Symbols、字体或产品素材。
- 文案与内容：原版可见内容、车次、图片、章节顺序和海报构图保留；新增文案只描述日期、下一站、天气、凭证状态与显示设置。

## 比较历史

| 轮次 | 先前发现 | 修复 | 修复后证据 |
|---|---|---|---|
| 1 | [P1] 天气监听器会自触发并形成更新循环；[P1] 移动底栏在章节滚动后错误高亮；[P2] 桌面显示了仅应在移动端出现的地图切换。 | 限定天气 DOM 更新边界；重写章节激活判定；将移动切换限制在移动断点。 | `comparison-mobile-390.png`、`comparison-desktop-1440.png` 之后重新采集 final 对照图。 |
| 2 | [P1] 地图工具栏与下一站控制重叠；[P1] 行程/地图切换会丢失已选日期；[P2] 减少动效模式仍有路线 runner/orbit 持续动画。 | 调整固定控件占位和层级；统一日期状态源；在减少动效媒体查询中关闭持续动画及控制过渡。 | `apple-output-mobile-390-map-final.png`、`apple-output-mobile-390-plan-final.png`，减少动效检查中 runner/orbit 为 `none`、过渡为 `0s`。 |
| 3 | [P2] 200% 等效回流时凭证状态列错位；[P2] 部分新增触控目标处于 44px 临界值以下。 | 为凭证加入窄宽重排；统一新增可见控件最小触控尺寸。 | 640px 等效回流无横向溢出且凭证布局正确；320px 新增控件实测约 44-55px。 |
| 4 | 无可执行的 P0/P1/P2 差异。 | 未继续修改视觉实现。 | `comparison-mobile-390-final.png`、`comparison-desktop-1440-final.png`。 |

## 交互与运行验证

- 日期选择会同步时间线、地图、天气、下一站和旅程凭证。
- 行程/地图切换保持所选日期；站内主导航无刷新滚动。
- 天气详情可展开；更多菜单、透明度设置、动效设置和重置均可操作。
- 旅程凭证状态会跟随日期更新。
- 390px 实测 `document.documentElement.scrollWidth === innerWidth === 390`。
- 最终浏览器控制台错误：`[]`。
- 原版 SHA256：`73D6A98937D1D8394D8162595C0BEA7AEB2FA52CA36FB8440F2640FCF5BD4698`，保持不变。

## Findings

当前没有可执行的 P0、P1 或 P2 设计差异。桌面 DPR 0.5 的截图拼接属于浏览器采集现象，不是页面 DOM 或布局回归。

## Follow-up Polish

- [P3] 可在后续真实旅行数据刷新任务中补充网络慢速、接口失败和无天气数据三种视觉状态的独立截图。

final result: passed
