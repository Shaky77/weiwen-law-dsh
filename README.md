# dsh-weiwen-law-plugin

> ✅ **Listed in [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)** — DeepSeek Harness 精选插件列表

**唯稳律通用因果引擎（白箱呈现）** —— 以 **DeepSeek Harness（DSH）** 的 Cordis 插件形态实现。

> **框架定义：守真 · 稳态**（Keep Integrity & Steady State）。
> - "守真"= 守护完整 / 真实（白箱不篡改 / 内 H 不可侵，对应 Integrity）；
> - "稳态"= 系统存续优先（对应 Steady State）。
> - "律 / Law" 为框架名后缀，**非**定义第三部分。
>
> 框架完整定义与哲学推导见基础版仓库（冻结门面），本仓为工程插件实现，不展开框架推导。

---

## 30 秒看懂

本仓库把唯稳律因果框架做成 DSH 的插件：给跑在 DSH 上的 AI Agent 挂一套**白箱因果引擎**——

- AI 每次动手前，引擎沿**完整因果链（R→S→D→H→M）推演动作后果**——稳态储备 S 会被侵蚀多少、破窗风险等级、消息是否自洽——再裁决放行 / 拦截 / 打回；
- 踩红线被**拦**，出错被**切断保活**（第一 Bug 停机，以断保续）；
- 同时把"状态 / 边界"暴露成**可查询工具**，AI 能自查、你能审计。

一句话：框架本体是"通用因果引擎（白箱呈现）"——**推演预测是引擎能力，白箱审计是呈现姿态**，风控拦截是内生属性。

## 它做什么

- **因果链推演（引擎本体）**：每个动作执行前，沿 R→S→D→H→M 完整因果链推演其后果——S 侵蚀量、D 风险等级、M 自洽性——给出 allow / deny / review 裁决。**不止审计**：是对动作后果的因果推演预测。
- **白箱自查**（呈现姿态）：稳态储备记账、内 H 边界（不可侵）声明，均暴露为可查询工具，供模型校准方向、供用户审计。
- **硬性护栏**（衍生应用 · 内生属性）：每次动作前做刚性锚点校验，触及即破窗止损阻断；故障环节触发第一 Bug 停机（以断保续），保整体因果链不断。
- **第一 Bug 停机闭环**：停机只做"断"，本插件 `src/core/bugstop.mjs` 强制走完"断"之后的必然后半程——BUG→停止→反推→溯源→修复(验证)→重入；未修复前拒绝重入，从根上阻断"只反推不修复→无限递归"。
- **分形**：同一插件可在子代理 / 子任务层级递归挂载。

## 与其他「因果」方案的区别（通用型因果）

唯稳律不是「又一个因果引擎」，而是**通用型（领域无关）因果裁决中间件**：只校验因果结构（R→S→D→H→M），对领域内容零知识，故法律、医疗、金融、机器人同一套机制。

- **因果效应估计库**（DoWhy / CausalML / Pearl 等）→ 我们**不发现因果**，只**裁决**一个已提出的动作其因果链结构是否可接纳；
- **领域专用因果护栏**（Causal Safety Engine / LLMGuardrail 等）→ 它们绑领域（安全 / LLM / 幻觉），我们**领域无关**；
- **跨法域法律因果 AI**（judgeai 等）→ 它们 jurisdiction-**aware**（编码法域、换规范包），我们**法域中性**（根本不编码法域，法律只是抽样领域之一）。

完整双语对照（含 prior-art 出处与诚实边界）：[`versions/live/evidence/weiwen-vs-market-causal.md`](./versions/live/evidence/weiwen-vs-market-causal.md)

## 概念注解：H 与「知行合一」

> **作者洞察（2026-08-28）**：**内 H ≈ 知，外 H ≈ 行；知行合一方为最大杠杆**——这同时解释了 H 为何是"唯一可变量 / 唯一主权 / 杠杆点"，以及为何普世中知与行之间"有很大的缝隙"。

完整注解（映射表 + 逐项推导）：[`docs/H-zhixing-heyi-annotation.md`](./docs/H-zhixing-heyi-annotation.md)

## 快速开始（不依赖 DSH 也能跑）

这条路径直连 DeepSeek API、不依赖 DSH 安装，**已实跑验证可复现**：

```bash
git clone https://github.com/Shaky77/weiwen-law-dsh
cd dsh-weiwen-law-plugin

# 把 DeepSeek API Key 放到本地安全路径（一行，无换行），或在示例脚本里改读取路径：
#   examples/demo-tool-loop.mjs 顶部的 KEY_PATH 常量

node examples/demo-tool-loop.mjs
```

跑起来后：DeepSeek 会**主动调用 `query_iron_laws` 工具**，返回三大铁律原文（内 H 不可侵 / 第一 Bug 停机 / 不抛弃任何节点）。这就是"框架挂上去了、模型读得懂"的最小证据。

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
| `query_steady_state` | 查稳态储备（活动态账本 / 静默待机 / 创伤计数 / 破窗计数） |
| `list_rigid_anchors` | 列出刚性锚点当前定义，校准方向、自查越界 |
| `query_conduction_chain` | 拿传导链与框架结构 |
| `query_boundary` | 查内 H 边界（本插件不读不写主体性黑箱） |
| `query_bugstop` | 查第一 Bug 停机闭环状态：哪些故障环节已停未修复、缺失步骤（反推/溯源/修复），白箱观测闭环是否闭合 |

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
    description: '返回三大铁律的定稿文本（不可变）',
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
src/core/law.mjs      # 框架定义常量（详见基础版仓库，本仓不展开推导）
src/core/engine.mjs   # 纯逻辑裁决引擎（零 DSH 依赖，可单测）
test/                 # 单元测试 + 真实案例测试 + 对齐回归（本地 128/128 通过）
examples/             # 可复跑实测（demo-tool-loop / demo-backtrack-run）
DESIGN.md             # 架构设计（映射表 / 风险 / 使用流程 / 挂载）
```

## 部署 / 接入 DeepSeek Harness

本仓库是 DeepSeek Harness（dsh，命令 `dsh`，基于 Cordis 插件框架，MIT）的**外部插件**。唯稳律以"模型之外、执行之内"的因果约束层挂载，不修改 dsh 内核，不绑定具体模型。

### 环境要求

- Node.js `^22.19 || >=24`（dsh 硬性要求，奇数版本不支持）
- DeepSeek API Key（或其他 OpenAI 兼容端点的 Key）
- dsh 当前为开发者预览版（v0.1.x），官方提示后续存在破坏性 API 变更；生产环境请锁定具体版本
- **兼容声明**：本插件验证于 DSH v0.1.x（2026-08-27 实测：6 白箱工具注册 + 3 道闸门正常）；mainline 快速演进中，接入前请以官方文档当前版本复核（挂载细节见 DESIGN.md）。

### 方式一：npx 快速启动（推荐先体验）

```bash
npx @deepseek-ai/dsh web        # 启动 Web UI，默认 http://127.0.0.1:3080
```

浏览器打开后在 `Settings → Models` 填入 API Key，即可对话。

### 方式二：挂载唯稳律插件

将本仓库克隆到本地，把插件入口接入 dsh 的插件配置（通过 `weiwen-law.patch.yml` overlay）：

```bash
# 1. 获取插件
git clone https://github.com/Shaky77/weiwen-law-dsh.git
cd weiwen-law-dsh

# 2. 在 dsh 的 cordis 配置中引入本插件入口（src/index.js）
#    方式 A（推荐）：作为 --patch overlay 叠加到指定 profile
dsh --profile headless --patch ./weiwen-law.patch.yml "你的任务提示词"
#    方式 B：将插件路径加入 dsh 启动配置（cordis.yml）的 plugins 列表，长期生效

# 3. 配置凭证（任选其一）
#    - Web UI 的 Settings 中填写；或
export DEEPSEEK_API_KEY=sk-xxxx     # Linux/macOS
#    $env:DEEPSEEK_API_KEY="sk-xxxx" # Windows PowerShell
```

挂载后，运行在该 profile 的 Agent 自动获得 6 个白箱自查工具（`query_iron_laws` / `query_steady_state` / `list_rigid_anchors` / `query_conduction_chain` / `query_boundary` / `query_bugstop`），并在工具调用前经过 `tools/pre-execute` 硬性护栏闸门（R/D/S/H/M 总裁决）与 `agent/pre-step` 内 H 不可侵闸门。

### 方式三：一行命令安装（官方 dsh plugin 机制，推荐）

本插件已声明 `dsh.bundle.patch` 清单（见 `package.json`），DSH 用户可直接通过官方插件命令安装：

```bash
# 从 GitHub 安装（源码直装，推荐）
dsh plugin --profile web add "github:Shaky77/weiwen-law-dsh"

# 从 npm 安装（npm 发布后可用）
# dsh plugin --profile web add "dsh-weiwen-law"

# 重启生效
dsh --profile web
```

装完后在 `设置 → 插件 → 插件列表` 可见 `weiwen-law` 状态为"已启用"；Agent 自动获得 6 个白箱自查工具 + 3 道硬性闸门（`tools/pre-execute` / `agent/pre-step` / `tools/result`）。

### 卸载

- **方式三安装的**（官方 plugin 机制）：`dsh plugin --profile web remove dsh-weiwen-law`，重启生效。
- **方式二 overlay 挂载的**：从 dsh 启动配置（cordis.yml 的 plugins 列表或 `--patch` 参数）移除 `weiwen-law.patch.yml` 引用，重启生效。
- 移除后 Agent 不再获得 6 个白箱自查工具，也不再有 3 道硬闸门；插件本身不写持久状态，卸载即干净。

### 日常使用 vs 压测

- **Web / Standard 模式**：日常对话与工程任务，插件在后台静默约束。
- **Headless 模式**：`dsh --profile headless` 无界面批量运行，适合回归测试与多 Agent 压测（本仓库 `versions/live/evidence/` 即此类实测归档）。

### 注意事项

- 插件入口为纯 ESM（`src/index.js`），依赖 `@deepseek-ai/dsh-tools`（peerDependency，可选）；接入前请以 dsh 官方文档当前版本复核 API。
- 远程部署 dsh 时需在配置中声明 `trustedHosts`，否则 API 层拒绝非本环路请求。
- `pnpm` 源码构建 dsh 时**必须**先 `pnpm run build`（内部包链接与前端产物），否则报模块找不到。

## License

[AGPL-3.0](./LICENSE)

---

> 中英文版内容一致，互为参照。English counterpart: [**Shaky77/KISS_Law-DSH**](https://github.com/Shaky77/KISS_Law-DSH) —— 同 DSH / 导图形态，全英文；KISS 定义（Keep Integrity & Steady State's Law，非通俗工程 KISS）见英文版。

---

## 版本分层说明（重要）

**本仓库 = 活系统版（DSH）**（对应 GitHub `Shaky77/weiwen-law-dsh`）——基于完整版演进的可运行 DeepSeek Harness（DSH）插件形态，承载迭代与多 Agent 压测实测证据。**不是基础版。**

- **基础版（导图 / 心法层 · 冻结不可动）**：`Shaky77/Weiwen-s_Law`（中文）与 `Shaky77/KISS-s_Law`（英文）——框架定义、三大铁律、传导链的**不可变门面**，仅作参照与对接入口。
- **完整版**：在基础版之上补全工程化细节与完整实现，可通过联系方式向作者获取。
- **分层关系**：基础版（心法）→ 完整版 → 活系统版（DSH）。DSH 依据完整版构建，**不等于**基础版，请勿混淆。

## 联系方式

框架咨询 / 合作 / 审计对接：563003@qq.com
活系统版 DSH 仓库与实测证据：见上方"版本分层说明"指向的独立仓库。
