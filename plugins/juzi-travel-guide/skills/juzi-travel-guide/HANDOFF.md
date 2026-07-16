# Juzi Travel Guide 交接文档

## 1. 背景

`juzi-travel-guide` 源自 2026-07-14 完成的“深圳出发，厦门三天两夜”互动旅游攻略项目。原项目验证了以下完整链路：

- 联网核实高铁、船票、天气、酒店、景点、美食和预算；
- 把易变事实、核实时间、来源与文案整理为结构化 JSON；
- 生成带地图入口、交互动效、原创图片和联网刷新能力的网页；
- 将 CSS、脚本和压缩后的 WebP 图片内嵌为可双击打开的离线单文件；
- 对可见文字、图片体积、交互脚本、响应式布局和输出副本执行自动验证。

这个 Skill 把上述一次性项目抽象为可复用流程，适用于任意出发地、目的地和日期。它不复制旧攻略中的易过期事实，每次使用都必须重新核实交通、价格、天气、开放时间和政策。

原型项目路径：

```text
C:\Users\juzi\Documents\Codex\2026-07-14\new-chat-2
```

## 2. 能力与交付物

核心入口是 [SKILL.md](SKILL.md)。Skill 要求 Codex：

1. 先联网调研并记录来源与核实时间；
2. 按 `assets/plan.template.json` 形成结构化行程数据；
3. 使用 `scripts/build-guide.mjs` 生成自包含 HTML；
4. 使用原创 WebP 图片，不复制攻略网站图片；
5. 执行内容、体积、可访问性、交互和离线交付质量门禁。

预期产物：

```text
work/travel-plan.json
public/ 或 work/images/ 下的原创 WebP 图片
outputs/<出发地>-<目的地>-<天数>攻略.html
```

## 3. 规范路径

| 用途 | 完整路径 |
|---|---|
| 规范 Skill 源码目录 | `D:\Tools\AI\Juzi-Skill\Juzi-travel-guide` |
| 插件发布源码目录 | `D:\Tools\AI\Juzi-Skill\plugins\juzi-travel-guide` |
| Juzi Skill 市场清单 | `D:\Tools\AI\Juzi-Skill\.agents\plugins\marketplace.json` |
| 插件清单 | `D:\Tools\AI\Juzi-Skill\plugins\juzi-travel-guide\.codex-plugin\plugin.json` |
| Skill 入口 | `D:\Tools\AI\Juzi-Skill\Juzi-travel-guide\SKILL.md` |
| 插件内 Skill 包 | `D:\Tools\AI\Juzi-Skill\plugins\juzi-travel-guide\skills\juzi-travel-guide` |
| Skill 验证器 | `C:\Users\juzi\.codex\skills\.system\skill-creator\scripts\quick_validate.py` |
| 插件验证器 | `C:\Users\juzi\.codex\skills\.system\plugin-creator\scripts\validate_plugin.py` |

规范 Skill 源码目录是唯一业务维护入口。插件内 Skill 包是发布时生成并核验的真实文件副本，因为 Codex 插件打包器不会跟随 Junction；它不是第二份独立维护源码。不要直接修改插件缓存。

## 4. 目录结构

```text
Juzi-travel-guide/
├── SKILL.md
├── HANDOFF.md
├── agents/
│   └── openai.yaml
├── assets/
│   ├── plan.template.json
│   └── travel-guide-template.html
├── references/
│   ├── plan-schema.md
│   ├── quality-gates.md
│   └── research-and-verification.md
└── scripts/
    ├── build-guide.mjs
    └── smoke-test.mjs
```

## 5. 发布并安装到 Codex

`juzi-travel-guide` 以 `Juzi Skill` 个人市场中的插件形式发布。每次发布先验证规范源码，再把完整 Skill 同步为插件内的真实文件，验证插件并更新 cachebuster，最后从 `juzi-skill` 市场安装。

在 PowerShell 中运行：

```powershell
$ErrorActionPreference = 'Stop'

$source = [System.IO.Path]::GetFullPath('D:\Tools\AI\Juzi-Skill\Juzi-travel-guide')
$plugin = [System.IO.Path]::GetFullPath('D:\Tools\AI\Juzi-Skill\plugins\juzi-travel-guide')
$package = [System.IO.Path]::GetFullPath((Join-Path $plugin 'skills\juzi-travel-guide'))
$skillValidator = 'C:\Users\juzi\.codex\skills\.system\skill-creator\scripts\quick_validate.py'
$pluginTools = 'C:\Users\juzi\.codex\skills\.system\plugin-creator\scripts'

& python $skillValidator $source
if ($LASTEXITCODE -ne 0) {
  throw '规范 Skill 验证失败，停止发布。'
}

if (-not $package.StartsWith($plugin + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "插件包路径越界：$package"
}

if (Test-Path -LiteralPath $package) {
  Remove-Item -LiteralPath $package -Recurse -Force
}

New-Item -ItemType Directory -Path $package -Force | Out-Null
Copy-Item -Path (Join-Path $source '*') -Destination $package -Recurse -Force

& python $skillValidator $package
if ($LASTEXITCODE -ne 0) {
  throw '插件内 Skill 验证失败，停止发布。'
}

& python (Join-Path $pluginTools 'validate_plugin.py') $plugin
if ($LASTEXITCODE -ne 0) {
  throw '插件验证失败，停止安装。'
}

& python (Join-Path $pluginTools 'update_plugin_cachebuster.py') $plugin
if ($LASTEXITCODE -ne 0) {
  throw 'cachebuster 更新失败，停止安装。'
}

& codex plugin add 'juzi-travel-guide@juzi-skill' --json
if ($LASTEXITCODE -ne 0) {
  throw '市场插件安装失败。'
}
```

不要用 Junction 代替插件内的真实 Skill 文件，也不要手工编辑 `C:\Users\juzi\.codex\plugins\cache`。

## 6. 安装后验收

插件安装到磁盘不代表当前会话已经加载 Skill。完成安装后：

1. 运行 `codex plugin list`，确认 `juzi-travel-guide` 在 `juzi-skill` 市场中显示为 `installed, enabled`；
2. 新建一个 Codex 任务；
3. 确认可用 Skill 列表出现 `juzi-travel-guide`；
4. 确认 source locator 指向插件缓存中的版本目录，而不是用户级 Junction：

   ```text
   C:\Users\juzi\.codex\plugins\cache\juzi-skill\juzi-travel-guide\<version>\skills\juzi-travel-guide\SKILL.md
   ```

5. 使用一个小型真实请求试运行，例如：

   ```text
   使用 $juzi-travel-guide，为深圳出发、周末两天的广州行程生成攻略网页。
   ```

6. 确认生成器与冒烟测试通过：

   ```powershell
   node 'D:\Tools\AI\Juzi-Skill\Juzi-travel-guide\scripts\smoke-test.mjs'
   ```

## 7. 日常更新流程

1. 只在规范源码目录修改文件；
2. 修改后运行结构验证：

   ```powershell
   python 'C:\Users\juzi\.codex\skills\.system\skill-creator\scripts\quick_validate.py' `
     'D:\Tools\AI\Juzi-Skill\Juzi-travel-guide'
   ```

3. 修改生成器、模板或数据契约后，运行冒烟测试：

   ```powershell
   node 'D:\Tools\AI\Juzi-Skill\Juzi-travel-guide\scripts\smoke-test.mjs'
   ```

4. 按第 5 节把规范源码重新同步到插件包，并执行两个 Skill 验证、插件验证、cachebuster 更新和市场重装；
5. 运行 `codex plugin list` 确认新版本已安装；
6. 已打开的 Codex 任务不会重新加载插件，必须新建任务验证。

## 8. 安全卸载

卸载只移除 Codex 的插件安装记录和对应缓存，不删除规范源码、插件发布源码或市场条目。

```powershell
codex plugin remove 'juzi-travel-guide@juzi-skill' --json
```

## 9. 常见问题

### Codex 市场仍显示“安装”

- 先刷新 Codex App 的插件页；
- 运行 `codex plugin list` 检查安装状态；
- 重新运行 cachebuster 更新和 `codex plugin add juzi-travel-guide@juzi-skill --json`；
- 不要用用户级 Skill Junction 冒充市场安装状态。

### 文件存在但新任务找不到 Skill

- 重新运行 `quick_validate.py`；
- 确认插件缓存内存在完整的 `skills\juzi-travel-guide\SKILL.md`；
- 完全新建 Codex 任务，不要只在旧任务中重试；
- 检查 `SKILL.md` frontmatter 的 `name` 是否仍为 `juzi-travel-guide`。

### 网页生成失败

- 先检查输入 JSON 是否符合 `references/plan-schema.md`；
- 再运行生成器的 `--validate-only`；
- 最后运行 `scripts/smoke-test.mjs` 区分数据问题与模板/脚本回归。

## 10. 交接验收清单

- [ ] 规范源码目录和 `SKILL.md` 存在；
- [ ] `quick_validate.py` 通过；
- [ ] 插件内 Skill 包与规范源码的相对路径和 SHA256 一致；
- [ ] `validate_plugin.py` 通过；
- [ ] 市场清单包含唯一的 `juzi-travel-guide` 条目；
- [ ] `codex plugin list` 显示插件为 `installed, enabled`；
- [ ] 新 Codex 任务能看到 `juzi-travel-guide`；
- [ ] source locator 指向插件缓存中的版本目录；
- [ ] `smoke-test.mjs` 通过；
- [ ] 没有修改或手工清理 Codex 插件缓存。
