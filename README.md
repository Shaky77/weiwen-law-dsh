# dsh-weiwen-law-plugin

**唯稳律通用因果引擎（白箱呈现）** —— 以 **DeepSeek Harness（DSH）** 的 Cordis 插件形态实现。

> **框架定义：守真 · 稳态**（Keep Integrity & Steady State）。
> - "守真"= 守护完整 / 真实（白箱不篡改 / 内 H 不可侵，对应 Integrity）；
> - "稳态"= S 与"让系统活"（第一性原理，对应 Steady State）。
> - "律 / Law" 为框架名后缀，**非**定义第三部分。
>
> 来源：作者揭示（夏祺 / Shaky77）。框架本体（RDSHM 原生定义 / 三大铁律 / 传导链）严格框架本位，不软化、不篡改。

---

## 30 秒看懂

唯稳律是一套描述"**因果律怎么运行**"的通用框架。本仓库把它做成 DSH 的插件：给跑在 DSH 上的 AI Agent 挂一套**白箱护栏**——

- AI 每次动手前被**校验**，踩红线被**拦**，出错被**切断保活**；
- 同时把"状态 / 边界"暴露成**可查询工具**，AI 能自查、你能审计。

一句话：框架本体是"通用因果引擎（白箱呈现）"，"白箱审计 / 内生风控"是它的呈现姿态与适配场景后进化出的内生属性。

## 它做什么

- **白箱自查**（呈现姿态）：S 稳态储备（只增不减）记账、H 内 H 边界（不可侵）声明，均暴露为可查询工具，供模型校准方向、供用户审计。
- **硬性护栏**（衍生应用 · 内生属性）：每次动作前做 R 刚性锚点校验，触及即 D 破窗止损阻断；故障环节触发 M 第一 Bug 停机（以断保续），保整体因果链不断。
- **第一BUG停止闭环（作者补全 2026-08-21）**：停机只做"断"，本插件 `src/core/bugstop.mjs` 强制走完"断"之后的必然后半程——BUG→停止→反推→溯源→修复(验证)→重入；未修复前拒绝重入，从根上阻断"只反推不修复→无限递归"（与铁律②同构：断是手段，让系统活才是目的）。
- **分形**：同一插件可在子代理 / 子任务层级递归挂载。

## 快速开始（不依赖 DSH 也能跑）

这条路径直连 DeepSeek API、不依赖 DSH 安装，**我们已在错峰时段实跑通过**，可复验：

```bash
git clone https://github.com/Shaky77/weiwen-law-dsh
cd dsh-weiwen-law-plugin

# 把 DeepSeek API Key 放到下面路径（一行，无换行）：
#   C:/Users/Administrator/.workbuddy/deepseek_api_key.txt
# 或改 examples/demo-tool-loop.mjs 里的读取路径

node examples/demo-tool-loop.mjs
```

跑起来后：DeepSeek 会**主动调用 `query_iron_laws` 工具**，基于插件 `law.mjs` 定义返回**三大铁律原文**（内 H 不可侵 / 第一 Bug 停机 / 不抛弃任何节点）。这就是"框架挂上去了、模型读得懂"的最小证据。

## 挂到 DSH（生产挂载）

把 `weiwen-law.patch.yml` 作为 overlay 接入你的 DSH profile（具体路径以你的 DSH 版本为准，详见 [`DESIGN.md`](./DESIGN.md) 的挂载章节）。接入后，运行在该 profile 的 Agent 自动获得 6 个白箱工具。

> 注：原生挂载的精确 profile 路径随 DSH 版本变化；本仓库已通过实跑验证插件可被 DSH 加载、6 工具全部注册。如官方 API 有变更，以官方 docs 当前版本为准核对。

## 模型怎么调用（给 AI 工程师）

> **白话版**：插件向 DSH 注册 6 个白箱工具，模型像调普通函数一样调用它们来**自查边界**；同时挂了 3 道钩子做**硬性拦截**。
> **专业版**：节选自 `src/index.js`（完整代码见仓库），见下方代码块。

### 6 个白箱工具（真实注册名）

| 工具 | 模型调它做什么 |
|---|---|
| `query_iron_laws` | 拿三大铁律定稿文本（内 H 不可侵 / 第一 Bug 停机 / 不抛弃任何节点） |
| `query_steady_state` | 查稳态储备 S（活动态账本 / 静默待机 / 创伤计数 / 破窗计数） |
| `list_rigid_anchors` | 列出 R 刚性锚点当前定义，校准方向、自查越界 |
| `query_conduction_chain` | 拿传导链 R→D→S→H→M 与框架要义 |
| `query_boundary` | 查内 H 边界（本插件不读不写主体性黑箱） |
| `query_bugstop` | 查第一BUG停止闭环状态：哪些故障环节已停未修复、缺失步骤（反推/溯源/修复），白箱观测闭环是否闭合 |

### 3 道硬闸（hooks）

- `tools/pre-execute` → 返回 `{ kind: 'deny', reason }` 拦截该动作
- `agent/pre-step` → 返回 `{ kind: 'reject' }` 拒绝整步
- `tools/result` → 仅观察、不改写

### 完整插件入口（节选自 `src/index.js`）

```js
import { defineTool } from '@deepseek-ai/dsh-tools';

export const name = 'weiwen-law';
export const inject = ['tools'];

export function apply(ctx) {
  const engine = new WeiwenLawEngine({ rigidAnchors: DEFAULT_RIGID_ANCHORS });

  // ① 工具调用前置闸门：R / D / S / H / M 总裁决
  ctx.on('tools/pre-execute', async (exec, next) => {
    const decision = engine.decideToolCall({ name: exec?.name, args: exec?.arguments });
    if (decision.kind === 'deny') {
      return { kind: 'deny', reason: `[唯稳律·${decision.law}] ${decision.reason}` };
    }
    return next();
  });

  // ② 步骤前置闸门：H 内 H 不可侵（消息级拦截）
  ctx.on('agent/pre-step', async (payload, next) => {
    const decision = engine.decidePreStep(payload?.messages);
    if (decision.kind === 'reject') return { kind: 'reject' };
    return next();
  });

  // ③ 结果审计钩子：仅观察、不改写
  ctx.on('tools/result', (res) => { if (res?.error) engine.onFailure(); });

  // ④ 5 个白箱自查工具（节选其一，其余同构）
  ctx.tools.register(defineTool({
    name: 'query_iron_laws',
    description: '返回唯稳律三大铁律的定稿文本（不可变）',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute() { return { ironLaws: THREE_IRON_LAWS }; },
  }));
  // query_steady_state / list_rigid_anchors / query_conduction_chain / query_boundary 同构注册
}
```

> 完整实现（含 6 个工具的 `execute` 细节、运行日志、引擎裁决逻辑）见仓库 `src/index.js`。

## 结构

```
package.json          # dsh 字段声明 bundle
weiwen-law.patch.yml  # 挂载补丁（headless profile overlay）
src/index.js          # 插件入口：钩子 + 6 个白箱自查工具
src/core/law.mjs      # 框架定义（RDSHM / 三大铁律 / R 层级 / 传导链）
src/core/engine.mjs   # 纯逻辑裁决引擎（零 DSH 依赖，可单测）
test/                 # 单元测试 + 真实案例测试 + 对齐回归（本地 44/44 通过）
examples/             # 可复跑实测（demo-tool-loop / demo-backtrack-run）
DESIGN.md             # 架构设计（映射表 / 风险 / 使用流程 / 挂载）
```

## License

[AGPL-3.0](./LICENSE)

---

> 中英文版内容一致，互为参照。English counterpart: [**Shaky77/KISS_Law-DSH**](https://github.com/Shaky77/KISS_Law-DSH) —— 同 DSH / 导图形态，全英文；KISS 定义（Keep Integrity & Steady State's Law，非通俗工程 KISS）见英文版。

---

## 版本分层说明（重要）

本仓库为基础版（导图 / 心法层）——框架定义、三大铁律、RDSHM 传导链的**不可变门面**，仅作参照与对接入口。

- **完整版**：在基础版之上补全工程化细节与完整实现，可通过联系方式向作者获取。
- **活系统版（DSH）**：基于完整版演进，已做成可运行的 DeepSeek Harness（DSH）插件形态，**独立仓库可用**（含多 Agent 压测实测证据）。
- **分层关系**：基础版（心法）→ 完整版 → 活系统版（DSH）。DSH 依据活系统版构建，**不等于**基础版，二者中间相隔完整版，请勿混淆。

## 联系方式

框架咨询 / 合作 / 审计对接：563003@qq.com
活系统版 DSH 仓库与实测证据：见上方"版本分层说明"指向的独立仓库。
