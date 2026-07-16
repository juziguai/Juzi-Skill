# 行程 JSON 规范

以 `assets/plan.template.json` 为可运行基线。复制后替换示例值，不要删掉未知字段；没有内容的可选数组使用 `[]`。

## 顶层字段

| 字段 | 必填 | 说明 |
|---|---:|---|
| `meta` | 是 | 标题、地点、日期、人数、核实时间、离线和预算设置 |
| `hero` | 是 | 首屏标题、摘要、统计，可选封面图 |
| `quickFacts` | 是 | 首屏关键决策卡片 |
| `checklist` | 是 | 可勾选行前任务，`id` 必须唯一 |
| `transport` | 是 | `outbound`、`return` 和 `notes` |
| `days` | 是 | 每日主题与按时间排序的 `stops` |
| `ferry` | 否 | 有轮渡时填写；无则设为 `null` |
| `hotels` | 是 | 首选与备选酒店 |
| `foods` | 是 | 小吃/餐厅卡片，可带原创图片 |
| `budget` | 是 | 至少一个预算模式及明细 |
| `weather` | 是 | 经纬度、快照日期；`live` 控制主动刷新按钮 |
| `packing` | 是 | 分类行李清单 |
| `sources` | 是 | 来源、核实时间和用途 |
| `disclaimers` | 是 | 余票、房态、天气和图片等边界 |

## 核心对象

### `meta`

- 使用 `YYYY-MM-DD` 的 `startDate` / `endDate`。
- `sampleOnly` 在真实交付时必须为 `false`。
- `offline` 默认 `true`；为 `true` 时图片必须是本地文件或 Data URI。
- `slug` 用于本地清单存储，使用小写字母、数字和连字符。
- `assetBudget` 以 KiB 为单位；建议单图 320、总图 2500、输出 3500。脚本还会应用硬上限。

### 交通项

必填：`service`、`from`、`to`、`depart`、`arrive`、`duration`、`class`、`price`、`status`、`bookingUrl`。

### 每日站点

必填：`time`、`name`、`type`、`description`。可选：`duration`、`address`、`ticket`、`tips`、`mapUrl`、`image`、`imageAlt`。

### 图片路径

- 相对路径以行程 JSON 所在目录为基准。
- 推荐 4:3 WebP，宽度不超过 1280px。
- `hero.coverImage`、`days[].stops[].image`、`hotels[].image`、`foods[].image` 会被生成器内嵌。
- 图片为空字符串时显示无外部依赖的渐变占位；真实精品交付应尽量提供原创图片。

### 来源

每项使用 `label`、`url`、`note`、`verifiedAt`。链接仅允许 `https://` 或 `http://`。

## 文案边界

- `status` 区分“实时”“核实时快照”“待用户下单时复核”。
- 地址、票价、时间不要只藏在长段落中，应写入结构化字段。
- 图片替代文本描述画面，不堆关键词。
- 所有核心文字必须保存在 JSON 中，模板只负责视觉与交互。
