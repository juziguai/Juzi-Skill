# Team Lead Examples

## Reading Order

1. Read `../core-workflow.md` for the shared workflow.
2. Read one adapter from `adapters/` for the current host.
3. Use the examples as task-shaping templates, not as a source of host-specific rules.

## Example 1: Parallel Independent Tasks

```
User: "优化 /model 命令的这 6 个问题"

PM breaks into tasks:
  #7  Anthropic chatStream (base.ts)
  #8  类型安全 (base.ts) ← depends on #7
  #9  快速模式去重 (model.tsx)
  #10 路由引擎 (routingEngine.ts) ← new file
  #11 边界修复 (modelExtended.ts)
  #12 UI 优化 (ModelPicker.tsx)

Dispatch round 1 (parallel): #7, #9, #10, #11, #12
Dispatch round 2 (after #7): #8

All 6 pass verification → done.
```

## Example 2: Agent Failure → Reject and Redo

```
Agent reports: "Task #3 complete, added error handling"
PM reads file: error handling is a bare try-catch with empty catch block
PM creates Task #3b: "fix empty catch in errorHandler.ts line 45"
PM dispatches new agent with specific fix instructions
New agent fixes → PM verifies → PASS
```

## Example 3: Task Description Template

```
你的任务是修改 D:\Tools\AI\Claude-code\Claude-code-AA\src\utils\model\providers\base.ts。

## 问题
AnthropicCompatProvider.chatStream 直接 yield 原始 SSE 事件（`yield data as StreamChunk`），
没有像 OpenAI 那样做 delta 转换。

## 要求
1. 重写 chatStream，从 Anthropic SSE 事件中提取内容并 yield 标准 StreamChunk
2. message_start → yield { type: 'message_start' }
3. content_block_delta (含 delta.text) → yield { type: 'content_block_delta', delta: { type: 'text_delta', text } }
4. 保持错误处理不变

## 约束
- 只改 AnthropicCompatProvider 的 chatStream 方法
- 不要改 OpenAICompatProvider 或 BaseProvider
- 用 Edit 工具精确替换
```

## Example 4: Verification Agent Template

```
验证以下 3 个任务在项目中的实现质量。

## Task #1: 错误处理
读取 src/utils/handler.ts。确认：
- catch 块不是空的
- 错误消息被记录或返回给调用方

## Task #2: 类型安全
读取 src/types/api.ts。确认：
- 没有 `as any` 类型断言
- 所有接口字段有明确类型

每个任务报告 PASS 或 FAIL，一行原因。最后统计。
```

## Example 5: Dependency Chain (Fan-out)

```
User: "重构认证系统"

PM 分析依赖关系:
  #1 重写 auth middleware (auth.ts)        ← 基础，无依赖
  #2 更新 login route (routes/login.ts)    ← 依赖 #1
  #3 更新 signup route (routes/signup.ts)  ← 依赖 #1
  #4 更新 session handler (session.ts)     ← 依赖 #1
  #5 集成测试 (tests/auth.test.ts)         ← 依赖 #2, #3, #4

Phase 1: #1 → Agent 1 (单独跑)
Phase 2: #2, #3, #4 → Agent 2, 3, 4 (并行，都依赖 #1)
Phase 3: #5 → Agent 5 (集成验证)
```

## Example 6: Rejection Retry (3 Attempts)

```
Task #3: "添加输入校验"

Attempt 1:
  Agent 实现了校验，但只检查了空字符串，没检查特殊字符
  PM: FAIL — 遗漏需求（特殊字符校验未实现）
  → 派新 Agent，明确列出需要校验的字符集

Attempt 2:
  Agent 校验了特殊字符，但正则写错了，匹配不了中文
  PM: FAIL — 行为不符（中文输入被错误拒绝）
  → 拆分任务：#3a 只做正则，#3b 只做错误提示

Attempt 3:
  Agent #3a 正则正确，Agent #3b 提示正确
  PM: PASS
```

## Example 7: Progress Reporting

```
PM: "已派发 5 个任务，预计 3 分钟完成"

[Agent 1 完成]
PM: "Task #1 完成，验收 PASS"

[Agent 2 完成]
PM: "Task #2 完成，验收 PASS"

[Agent 3, 4, 5 陆续完成]
PM: "全部 5 个任务验收通过"
```

## Example 8: Pipeline Mode

```
用户: "写一个 CLI 工具，要求代码质量高"

PM 选择 Pipeline 模式（需要逐步打磨）

Phase 1 - Implement:
  Agent A 写 CLI 工具代码（general-purpose）

Phase 2 - Review:
  Agent B 以只读 Reviewer 身份审查代码，输出结构化问题清单：
    - cli.ts:42  错误处理缺失  建议添加 try-catch
    - utils.ts:15  类型不安全  建议用 unknown 替代 any

Phase 3 - Refine:
  PM 评估问题清单，派 Agent C 只修复标记的 2 个问题

Phase 4 - Accept:
  PM 验收 → PASS
```

## Example 9: Swarm Mode

```
用户: "优化这个排序算法的性能"

PM 选择 Swarm 模式（多方案竞争）

Agent 1: 快速排序方案
Agent 2: 归并排序方案
Agent 3: 堆排序方案

PM 对比：
  - 快速排序：平均 O(n log n)，最差 O(n²)，内存 O(log n)
  - 归并排序：稳定 O(n log n)，内存 O(n)
  - 堆排序：稳定 O(n log n)，内存 O(1)，但常数因子大

PM 选择：堆排序（内存最优，性能稳定）
其余方案保留在任务备注中
```

## Example 10: Hierarchical Mode

```
用户: "重构整个认证系统，涉及前端、后端、测试"

PM 选择 Hierarchical 模式（8+ 文件，3+ 模块）

Phase 1 - 规划:
  PM 定义模块接口：
    - auth-api.ts: 登录/注册/登出 3 个接口
    - auth-middleware.ts: JWT 验证中间件
    - auth-ui.ts: 登录/注册表单组件

Phase 2 - 分发:
  PM → Team Lead A（后端模块）→ Worker 1 写 API, Worker 2 写 middleware
  PM → Team Lead B（前端模块）→ Worker 3 写表单组件

Phase 3 - 集成:
  PM 验收所有模块，检查接口一致性 → PASS
```

## Example 11: Retrospective Log

```
全部任务验收通过后，PM 执行回顾：

## 回顾
- **什么有效：** Pipeline 模式在代码质量要求高的场景下效果好，
  审查 Agent 发现了 3 个我自己都没注意到的问题
- **什么无效：** Swarm 模式的 3 个 Agent 方案太相似，浪费了 token，
  下次应该在 prompt 中明确要求不同思路
- **下次改进：** Swarm 模式派发时，给每个 Agent 指定不同的约束条件
  （如"方案 A 优先性能，方案 B 优先可读性"）

→ 将可复用改进策略记录到当前任务的 `ACTIVE_TASK.md`，并在最终汇报中说明；不创建额外长期状态文件。
```

## Example 12: Error Recovery (Agent Timeout)

```
Task #2: "重写 auth middleware"

PM 使用 `spawn_agent` 派发 Agent 2，并通过 `list_agents` 检查其状态

[3 分钟后]
PM 检查：Agent 2 无响应（超时）

PM 执行：
1. 停止 Agent 2
2. 诊断：任务描述太复杂（500+ 行文件要全量重写）
3. 拆分：
   #2a: "只改 auth middleware 的 verifyToken 函数"（小范围）
   #2b: "只改 auth middleware 的 refreshToken 函数"
4. 重新派发 #2a, #2b（并行）
5. 两个都 PASS → 继续
```

## Example 13: Quality Gate Failure (Pipeline)

```
Pipeline Mode，Task: "写一个 CLI 工具"

Phase 1 - Implement:
  Agent A 写完代码

Gate 1 检查（PM 自己做）：
  ✗ 代码有 TypeScript 错误（2 个类型不匹配）
  → Gate 1 FAIL，不进入 Review

PM 决策：
  不派 Review Agent（浪费 token），直接 rejection
  创建 Task #1b: "修复 cli.ts 第 15、28 行的类型错误"
  派 Agent B 修复

Gate 1 再检：✓ 通过 → 进入 Phase 2
```

## Example 14: Rollback & Redo

```
Task #3: "添加输入校验"

PM 派发 Agent 3 → Agent 完成

PM 验证：
  ✗ Agent 改了 3 个文件，但任务只要求改 1 个
  ✗ 多改的 2 个文件破坏了已有功能

PM 执行回滚（先确认这 2 个文件在 Pre-flight 时无用户改动，且 diff 全由 Agent 产生）：
  方法：派新 Agent 精确撤销（把 git diff 给新 Agent，指令"只撤销以下改动"）—— 自动化场景首选
  或：git checkout -p src/utils/helper.ts src/types/api.ts（PM 手动逐 hunk 选择撤销）
  （只回滚超范围的 2 个文件，保留正确的校验改动）

PM 创建 Task #3b: "只改 src/utils/validator.ts，不改其他文件"
PM 派发新 Agent → PASS
```

## Example 15: Agent Prompt with Role-Goal-Backstory

```
普通 prompt（效果一般）：
  "修一下 auth.ts 里的 bug"

优化后的 prompt（Role-Goal-Backstory）：

  你是后端安全工程师，专注于认证和授权模块。

  ## 目标
  修复 auth.ts 中 JWT token 过期后不返回 401 的 bug。

  ## 背景
  - 项目使用 Express + jsonwebtoken
  - 当前 verifyToken 函数在 token 过期时静默继续（不报错）
  - 上周有人改了 error handling 导致这个问题

  ## 约束
  - 只改 auth.ts 的 verifyToken 函数
  - 不改 middleware 注册逻辑
  - 保持现有错误码不变（401 Unauthorized）

  ## 输出要求
  - 完成后报告：改了哪些行、改了什么、为什么
```

## Example 16: Token Budget Control

```
用户: "优化 10 个文件的类型安全"

PM 计算预算：
  10 个文件 × 800 tokens = 8000 tokens 总预算
  但每个文件改动很小（删 as any），可以合并

PM 优化策略：
  不派 10 个 Agent，改为 3 个 Agent：
  - Agent 1: utils/ 目录 4 个文件
  - Agent 2: components/ 目录 3 个文件
  - Agent 3: services/ 目录 3 个文件

  节省：7 次 Agent 启动开销，任务描述复用模板
```

## Example 17: Cross-Agent Context Sharing

```
任务: "重构认证系统"（3 个任务，有依赖关系）

Task #1: 重写 auth.ts → Agent 1 完成
PM 验证 PASS，记录结果："auth.ts 新增了 verifyToken() 和 refreshToken() 两个导出函数"

Task #2: 更新 login.ts → 派发时在描述中加入：
  "前置任务 #1 已完成，auth.ts 新增了 verifyToken() 和 refreshToken()，
   请在 login.ts 中 import { verifyToken } from './auth' 替代原来的旧函数"

Task #3: 更新 signup.ts → 同样在描述中加入 #1 的结果摘要

效果：Agent 2 和 3 不需要自己去读 auth.ts 理解变化，直接从描述获取上下文
```

## Example 18: Dynamic Mode Switching

```
用户: "优化 5 个 API endpoint 的错误处理"

PM 选择 Supervisor 模式（默认）

Task #1: Agent 实现 → PM 验证 FAIL（错误处理太粗糙）
Task #1 重试: Agent 改进 → PM 验证 FAIL（还是不够细）

PM 判断：连续 2 次 FAIL 都是代码质量问题 → 切换到 Pipeline

Task #2-#5 改用 Pipeline：
  Phase 1: Agent 实现
  Phase 2: Agent 审查 → 发现 3 个问题
  Phase 3: Agent 修复 → PASS

PM 报告："Task #1 用 Supervisor 重试 2 次才过，切换 Pipeline 后 #2-#5 都一次过。
         结论：错误处理类任务适合 Pipeline。"
```

## Example 19: Auto-Escalation

```
Task #3: "集成第三方支付 SDK"

Agent 派发后返回："用 Stripe 还是 Alipay？项目里两个都没用过。"

PM 判断：技术选型 → 立即升级用户

PM 报告：
  "Task #3 Agent 需要技术决策：Stripe 还是 Alipay？
   这是支付方案选型，我无法自行决定。
   请指定后我重新派发。"

用户: "用 Stripe"
PM 更新 Task #3 描述："使用 Stripe SDK" → 重新派发
```

## Example 20: Dependency Graph

```
用户: "重构前端状态管理，涉及 8 个文件"

PM 分析依赖关系并画图：

  #1 创建 store.ts ──→ #2 创建 selectors.ts
                     ──→ #3 创建 actions.ts
  [#2, #3] ──→ #4 迁移 ComponentA.tsx
  [#2, #3] ──→ #5 迁移 ComponentB.tsx
  [#2, #3] ──→ #6 迁移 ComponentC.tsx
  [#4, #5, #6] ──→ #7 删除旧 store
  #7 ──→ #8 更新入口文件

执行计划：
  Phase 1: #1（单独）
  Phase 2: #2 || #3（并行）
  Phase 3: #4 || #5 || #6（并行）
  Phase 4: #7（等 #4-#6）
  Phase 5: #8（等 #7）

PM："5 个 Phase，预计 8 分钟。Phase 2 和 3 有 2+3=5 个并行 Agent。"
```

## Example 21: Observability Metrics

```
工作流结束后，PM 记录指标：

## 执行指标
- 总任务数: 6
- 首次通过: 4 (67%)
- 重试后通过: 2 (33%)
- 最终通过率: 100%
- 模式: Supervisor

## 分析
- 首次通过率 67%，低于 70% 目标
- 失败原因：#2 任务描述不够具体，#5 遗漏了边界条件
- 改进：下次任务描述加验收标准 checklist

→ 将指标和改进策略记录到当前任务的 `ACTIVE_TASK.md`，并在最终汇报中说明。
```

## Example 22: 用户已有未提交改动

```
PM Pre-flight 检查：
  git status → 发现用户有未提交改动：
    M src/utils/auth.ts   （用户自己改的，还没 commit）
    M src/types/api.ts    （用户自己改的）

PM 处理：
1. 记录：auth.ts 和 api.ts 是"用户已有改动"文件
2. 任务描述中明确：
   "注意：src/utils/auth.ts 和 src/types/api.ts 有用户未提交的改动，
    你的任务不涉及这两个文件，绝对不要修改它们。"
3. 回滚策略调整：
   如果 Agent 超范围改了 auth.ts → 不能 git checkout（会丢用户改动）
   → 只能派新 Agent 追加修复

结果：Agent 只改了指定文件，未触碰用户文件
```

## Example 23: Agent 越权修改

```
Task #2: "修改 src/components/Login.tsx 的表单验证"

PM 验证：
  git diff → 发现 Agent 改了 3 个文件：
    ✓ src/components/Login.tsx  （任务范围内）
    ✗ src/utils/validator.ts    （超出范围）
    ✗ src/styles/login.css      （超出范围）

PM 判断：Agent 越权修改

PM 执行（先确认这 2 个文件在 Pre-flight 时无用户改动）：
1. 回滚超范围文件：派新 Agent 精确撤销（自动化首选）
   或 PM 手动：git checkout -p src/utils/validator.ts（逐 hunk 确认全撤销）
2. 保留 Login.tsx 的改动（范围内）
3. 创建 Task #2b: "只修复 Login.tsx 中的表单验证，不改其他文件"
4. 派发新 Agent，任务描述中强调："只改 Login.tsx，不改 validator.ts 和 login.css"

教训记录：Agent 越权通常是因为任务描述没有明确"不改哪些文件"
→ 改进：任务描述必须包含"只改 X，不改 Y"的明确约束
```

## Example 24: 并发冲突同文件处理

```
任务: "重构认证系统"

PM 分析依赖：
  #1 重写 auth.ts（核心）
  #2 更新 login.ts（依赖 #1）
  #3 更新 signup.ts（依赖 #1）
  #4 更新 auth.ts 的错误处理（与 #1 同文件！）

PM 发现：#1 和 #4 都要改 auth.ts → 必须串行

PM 执行计划：
  Phase 1: #1（单独改 auth.ts）
  Phase 2: #2 || #3（并行，不同文件）
  Phase 3: #4（等 #1 完成后，再改 auth.ts）

错误做法：#1 和 #4 并行 → 后完成的 Agent 会覆盖先完成的改动
正确做法：同文件任务必须串行，用依赖链保证顺序
```

## Example 25: 测试失败归因

```
Task #3: "添加输入校验"
Agent 完成后，PM 运行测试：npm test → 3 个测试失败

PM 归因分析：
1. 读取失败测试的错误信息
2. 检查 git diff → 发现 Agent 改了 validator.ts 的返回格式
3. 旧测试期望 { valid: true }，Agent 改成了 { isValid: true }

PM 决策：
  - 这是 Agent 改动导致的测试失败 → Agent 的责任
  - 不是测试本身的问题

PM 创建 Task #3b: "修复 validator.ts 返回格式，保持 { valid: true } 接口不变"
PM 派发 Agent 修复 → PASS

教训：Agent 改动接口/返回格式时，必须检查依赖该接口的测试
→ 改进：任务描述中加"保持现有接口签名不变"的约束
```

## Example 26: End-to-End 完整执行样例

```
用户: "重构前端状态管理，涉及 store、selectors、actions 和 3 个组件"

=== Phase 0: Pre-flight ===
PM: git status → 干净，无未提交改动
PM: 列出涉及文件：8 个
PM: 确认验收方式：TypeScript 编译 + 目视检查

=== Phase 1: Planning ===
PM 选择模式：Supervisor（8 文件，但模块边界清晰，不需要 Hierarchical）

PM 画依赖图：
  #1 创建 store.ts ──→ #2 创建 selectors.ts
                    ──→ #3 创建 actions.ts
  [#2, #3] ──→ #4 迁移 ComponentA.tsx
  [#2, #3] ──→ #5 迁移 ComponentB.tsx
  [#2, #3] ──→ #6 迁移 ComponentC.tsx
  [#4, #5, #6] ──→ #7 删除旧 store
  #7 ──→ #8 更新入口文件

PM 创建 8 个 Task，设置依赖关系

=== Phase 2: Dispatch ===
PM: "已派发 1 个任务（#1），预计 2 分钟"
PM: 等待 #1 完成

[#1 完成]
PM: 读取 store.ts → PASS
PM: "Task #1 完成，验收 PASS。派发 #2, #3（并行）"

[#2, #3 完成]
PM: 读取 selectors.ts, actions.ts → 都 PASS
PM: "Task #2, #3 完成，验收 PASS。派发 #4, #5, #6（并行）"

[#4, #5, #6 完成]
PM: 读取 3 个组件文件 → 都 PASS
PM: "Task #4-#6 完成，验收 PASS。派发 #7"

[#7 完成]
PM: 确认旧 store 已删除 → PASS
PM: "Task #7 完成，验收 PASS。派发 #8"

[#8 完成]
PM: 确认入口文件更新 → PASS

=== Phase 3: Final Verification ===
PM: TypeScript 编译检查 → 无错误
PM: "全部 8 个任务验收通过"

=== Phase 4: Retrospective ===
PM 记录：
- 首次通过率: 100%（8/8）
- 总耗时: 约 10 分钟
- 什么有效: 依赖图清晰，并行度高
- 什么无效: 无
- 改进: 无

→ 将复杂任务的可复用结论记录到当前任务的 `ACTIVE_TASK.md`，并在最终汇报中说明。
```

## Example 27: Swarm 全部 PASS 但取舍不同

```
用户: "优化数据库查询性能"

PM 选择 Swarm 模式，派发 3 个 Agent：

Agent 1 方案：添加 Redis 缓存
  - 优点：读性能提升 10x，改动小
  - 缺点：引入新依赖，缓存一致性需要维护
  - 验收：PASS

Agent 2 方案：优化 SQL 查询 + 添加索引
  - 优点：无新依赖，从根本上解决问题
  - 缺点：需要 DBA 审核，改动范围大
  - 验收：PASS

Agent 3 方案：引入读写分离
  - 优点：架构层面解决，长期收益高
  - 缺点：改动最大，需要运维配合
  - 验收：PASS

PM 判断：3 个方案都 PASS，但取舍不同
  - Agent 1 最快见效，但有维护成本
  - Agent 2 最稳妥，但需要 DBA
  - Agent 3 最彻底，但改动最大

PM 升级用户：
  "3 个方案都通过验收，各有取舍：
   1. Redis 缓存 — 快速见效，但需维护缓存一致性
   2. SQL 优化 — 稳妥，但需 DBA 审核
   3. 读写分离 — 彻底，但改动最大需运维配合
   请指定方向，我继续执行。"

用户: "先用方案 2，不行再上方案 1"
PM 采纳方案 2，其余保留在任务备注中
```

## Example 28: 跨会话恢复 / Agent 中断后恢复

```
场景：PM 在执行 5 个任务的派发，执行到第 3 个任务时会话中断

会话恢复后 PM 检查：
1. 读取 `.codex\\ACTIVE_TASK.md` → 发现：
   - Task #1: completed（Agent 完成，已验收 PASS）
   - Task #2: completed（Agent 完成，已验收 PASS）
   - Task #3: in_progress（Agent 中断，未完成）
   - Task #4: pending（未派发）
   - Task #5: pending（未派发）

2. 检查 Task #3 的文件状态：
   git diff → Agent 改了一半（只改了 2/4 个文件）

PM 决策：
  - Task #1, #2：已完成，跳过
  - Task #3：Agent 改了一半 → 回滚 Agent 的部分改动，重新派发
  - Task #4, #5：继续按原计划派发

PM 执行（确认 Form.tsx 在 Pre-flight 时无用户改动，且 diff 全由该 Agent 产生）：
  1. 派新 Agent 精确撤销（把 diff 输出给 Agent，指令"撤销这些改动"）
  2. 重新派发 Task #3（新 Agent，完整任务描述）
  3. 等 #3 完成后，派发 #4, #5

教训：Task 状态是恢复的关键。PM 中断前必须确保：
  - 已完成的任务已标记 completed
  - 进行中的任务记录了当前进度
  - 未派发的任务保持 pending
```

## Example 29: 反向补丁精确撤销（替代 git checkout）

```
场景：src/utils/auth.ts 有用户未提交改动 + Agent 超范围改动混合

PM 检查 git diff src/utils/auth.ts：
  - 第 15-20 行：用户改的（新增 refreshToken 函数）
  - 第 30-35 行：Agent 改的（修改了 verifyToken 的返回格式）
  - 第 50-55 行：Agent 改的（新增了 validateInput 函数，超出任务范围）

PM 需要撤销：第 30-35 行和第 50-55 行（Agent 改动），保留第 15-20 行（用户改动）

方法 1: 生成反向补丁
  git diff src/utils/auth.ts > work/full-diff.patch
  # PM 人工审查，只保留第 30-35 和 50-55 行的 diff
  # 编辑 patch 文件，删除第 15-20 行的 diff（用户改动不撤销）
  # 确认 work/agent-only.patch 只包含 Agent hunk，不包含用户 hunk
  git apply -R work/agent-only.patch

方法 2: 派新 Agent 精确撤销（最安全）
  PM 派新 Agent，prompt：
  "src/utils/auth.ts 中有 3 处改动：
   - 第 15-20 行是用户改动，不要动
   - 第 30-35 行需要撤销（恢复原来的 verifyToken 返回格式）
   - 第 50-55 行需要删除（validateInput 函数是超范围添加的）
   请用 Edit 工具精确还原第 30-35 和 50-55 行。"

结果：用户改动保留，Agent 超范围改动被精确撤销

对比：
  - git checkout -- auth.ts → 会丢失用户第 15-20 行的改动 ✗
  - git stash → 会把所有改动打包，pop 时无法区分来源 ✗
  - 反向补丁/新 Agent → 精确撤销 Agent 部分，保留用户部分 ✓
```
