# dsh-weiwen-law

> 📦 **npm 发布源**｜包名 `dsh-weiwen-law`｜当前稳定版 **0.2.15**
>
> 本仓是 [npm 包 `dsh-weiwen-law`](https://www.npmjs.com/package/dsh-weiwen-law) 的发布来源，仓库内容与已发布版本一致。安装：`npm i dsh-weiwen-law`。

> ✅ **已收录**：[dsh-plugin-radar（awesome-dsh-plugins）](https://github.com/AdamPlatin123/dsh-plugin-radar) 登记 PR [#403](https://github.com/AdamPlatin123/dsh-plugin-radar/pull/403) 已于 **2026-08-31** 合并，`PLUGINS.md` 实测在榜（判定档位：**待测**——升「运行级可用」待雷达下次自动扫描刷新数据快照）。

**唯稳律通用因果引擎（白箱呈现）** —— 以 **DeepSeek Harness（DSH）** 的 Cordis 插件形态实现。

> **框架定义：守真 · 稳态**（Keep Integrity & Steady State）。
> - "守真"= 守护完整 / 真实（白箱不篡改 / 内 H 不可侵，对应 Integrity）；
> - "稳态"= 系统存续优先（对应 Steady State）。
> - "律 / Law" 为框架名后缀，**非**定义第三部分。
>
> 框架完整定义与哲学推导见基础版仓库（冻结门面），本仓为工程插件实现，不展开框架推导。

> ⚖️ **双许可**：开源使用 **AGPL-3.0**；商业集成 / 闭源分发 / 预装合作可取得**独立于 AGPL-3.0 约束**的授权 → 563003@qq.com。详见 [License & security](#license--security) 与 [CONTRIBUTING.md](https://github.com/Shaky77/weiwen-law-dsh/blob/main/CONTRIBUTING.md)。

---

> **三份东西，一个目的：让你少走弯路，但不替你走。**
>
> - 🧭 **[ONBOARDING.md](https://github.com/Shaky77/weiwen-law-dsh/blob/main/ONBOARDING.md) —— 回答「我在哪」**。是**位置陈述**，不是要求陈述。初用者最容易把自己读成"被管的对象"（只认外 H、没认领内 H），于是产生"处处受限、还不能有意见"的憋屈——那不是理解错，是**站错了格子**。这份文档不加规矩，只把你本来就在的位置指出来。
> - 🧱 **[WALLS.md](https://github.com/Shaky77/weiwen-law-dsh/blob/main/WALLS.md) —— 回答「路上有什么」**。前几个 AI 撞过的墙的标牌。墙一直在原地，涂上颜色只是让它可见。**它不增加任何限制**，只把"用身体试一次才知道"的那些位置，换成"看一眼就知道"。
> - 📖 **本 README —— 回答「它怎么跑」**。接口、判据、装法。
>
> 🔴 **三者没有一条在增加限制。** 唯一会拦你的是引擎本身 —— 而它拦的从来不是「你错了」，是「**你出界了**」（不可逆，撞了没有未来）或「**这件事判不了**」（要人，或要你补一点料）。**错的因果逻辑链它也收**：错的走着走着，未来自己撞墙，撞出来的痕就是新标牌。


## 30 秒看懂

本仓库把唯稳律因果框架做成 DSH 的插件：给跑在 DSH 上的 AI Agent 挂一套**白箱因果引擎**——

- AI 每次动手前，引擎沿**完整因果逻辑链（R→S→D→H→M）推演动作后果**——稳态储备 S 会被侵蚀多少、破窗风险等级、消息是否自洽——再裁决放行 / 拦截 / 打回；
- 踩红线被**拦**，出错被**切断保活**（第一 Bug 停机，以断保续）；
- 同时把"状态 / 边界"暴露成**可查询工具**，AI 能自查、你能审计。

一句话：框架本体是"通用因果引擎（白箱呈现）"——**推演预测是引擎能力，白箱审计是呈现姿态**，风控拦截是内生属性。

## 它做什么

- **因果逻辑链推演（引擎本体）**：每个动作执行前，沿 R→S→D→H→M 完整因果逻辑链推演其后果——S 侵蚀量、D 风险等级、M 自洽性——给出 allow / deny / review 裁决。**不止审计**：是对动作后果的因果推演预测。
- **白箱自查**（呈现姿态）：稳态储备记账、内 H 边界（不可侵）声明，均暴露为可查询工具，供模型校准方向、供用户审计。
- **硬性护栏**（衍生应用 · 内生属性）：每次动作前做刚性锚点校验，触及即破窗止损阻断；故障环节触发第一 Bug 停机（以断保续），保整体因果逻辑链不断。
- **第一 Bug 停机闭环**：停机只做"断"，本插件 `src/core/bugstop.mjs` 强制走完"断"之后的必然后半程——BUG→停止→反推→溯源→修复(验证)→重入；未修复前拒绝重入，从根上阻断"只反推不修复→无限递归"。
- **分形**：同一插件可在子代理 / 子任务层级递归挂载。

## 与其他「因果」方案的区别（通用型因果）

唯稳律不是「又一个因果引擎」，而是**通用型（领域无关）因果裁决中间件**：只校验因果结构（R→S→D→H→M），对领域内容零知识，故法律、医疗、金融、机器人同一套机制。

- **因果效应估计库**（DoWhy / CausalML / Pearl 等）→ 我们**不发现因果**，只**裁决**一个已提出的动作其因果逻辑链结构是否可接纳；
- **领域专用因果护栏**（Causal Safety Engine / LLMGuardrail 等）→ 它们绑领域（安全 / LLM / 幻觉），我们**领域无关**；
- **跨法域法律因果 AI**（judgeai 等）→ 它们 jurisdiction-**aware**（编码法域、换规范包），我们**法域中性**（根本不编码法域，法律只是抽样领域之一）。

完整双语对照（含 prior-art 出处与诚实边界）：[`versions/live/evidence/weiwen-vs-market-causal.md`](https://github.com/Shaky77/weiwen-law-dsh/blob/main/versions/live/evidence/weiwen-vs-market-causal.md)

## 概念注解：H 的作用方式

> **H 是减熵动作。** 它减的不是量，是**方向上的不确定**——所以它的效力不来自自身"体量"，而来自 **S 与 D 之间的制衡张力**：S 是已积累的稳态存量，D 是进入基线的扰动；两者之间必然要选出一个方向，H 就是那个选择动作，**在这里起杠杆作用**。

> ⚠️ **常见误用**：外部视角极易把 H 当成"越大越好"的能力旋钮去拧大——方向拧反了。H 的杠杆在**选哪个方向**，不在**有多少体量**。若越用越乱，先查 S 与 D 的张力有没有被看见，而不是先怀疑框架。

## ⚠️ 先看：别拿它跑分（模型水平与唯稳律）

唯稳律**不是解题模型，是行为纪律**。它不解决具体问题，它约束解决问题的方式（allow / deny / review）。若拿它挂代理跑分，会得到"低水平模型有用、高水平模型没用"的错位结论——原因见下方两版说明。

> **白话版**：高级模型表现好，只说明它在常见场景出错率低——算力堆得高，不等于里面长了因果逻辑。极端/陌生场景（分布外）恰恰是统计拟合最容易翻车的地方，而唯稳律管的就是这种"翻车边缘"的纪律。就像法律对所有公民一视同仁：守法即自由，违法即拦截——唯稳律对所有 AI 模型一视同仁，不因强大豁免。
> **专业版**：跑分测的是分布内解题能力（黑箱统计拟合的外推质量）；唯稳律管的是分布外行为纪律（白箱三态裁决，规则不依赖分布，分布变了规则不失效）。用解题跑分检验行为纪律，属测量错位。

完整声明（脱敏案例 + 能力归属二分 + 正确用法表）：[`docs/model-level-and-benchmark.md`](https://github.com/Shaky77/weiwen-law-dsh/blob/main/docs/model-level-and-benchmark.md)

## 快速开始（不依赖 DSH 也能跑）

这条路径直连 DeepSeek API、不依赖 DSH 安装，**已实跑验证可复现**：

```bash
git clone https://github.com/Shaky77/weiwen-law-dsh
cd weiwen-law-dsh

# 把 DeepSeek API Key 放到本地安全路径（一行，无换行），或在示例脚本里改读取路径：
#   examples/demo-tool-loop.mjs 顶部的 KEY_PATH 常量

node examples/demo-tool-loop.mjs
```

跑起来后：DeepSeek 会**主动调用 `query_iron_laws` 工具**，返回三大铁律原文（内 H 不可侵 / 第一 Bug 停机 / 不抛弃任何节点）。这就是"框架挂上去了、模型读得懂"的最小证据。

## 挂到 DSH（生产挂载）

把 `weiwen-law.patch.yml` 作为 overlay 接入你的 DSH profile（具体路径以你的 DSH 版本为准，详见 [`DESIGN.md`](https://github.com/Shaky77/weiwen-law-dsh/blob/main/DESIGN.md) 的挂载章节）。接入后，运行在该 profile 的 Agent 自动获得 11 个白箱工具。

> 注：原生挂载的精确 profile 路径随 DSH 版本变化；本仓库已通过实跑验证插件可被 DSH 加载、11 工具全部注册。如官方 API 有变更，以官方 docs 当前版本为准核对。

## 模型怎么调用（给 AI 工程师）

> **白话版**：插件向 DSH 注册 11 个白箱工具，模型像调普通函数一样调用它们来**自查边界**；同时挂了 3 道硬性闸门（2 道拦动作/步、1 道拦回执）+ 1 个只读审计钩子。
> **专业版**：节选自 `src/index.js`（完整代码见仓库），见下方代码块。

### 12 个白箱工具（真实注册名）

| 工具 | 模型调它做什么 |
|---|---|
| `query_iron_laws` | 拿三大铁律定稿文本（内 H 不可侵 / 第一 Bug 停机 / 不抛弃任何节点） |
| `query_steady_state` | 查稳态储备（活动态账本 / 静默待机 / 创伤计数 / 破窗计数） |
| `list_rigid_anchors` | 列出刚性锚点当前定义，校准方向、自查越界 |
| `query_conduction_chain` | 拿因果逻辑链与框架结构 |
| `query_boundary` | 查内 H 边界（本插件不读不写主体性黑箱） |
| `query_bugstop` | 查第一 Bug 停机闭环状态：哪些故障环节已停未修复、缺失步骤（反推/溯源/修复），白箱观测闭环是否闭合 |
| `query_anchor_channel` | 锚源自报：结构入口（宿主声明的任务范围）是否接通、锚池里有什么；窗口面只是观察面，**永不授权** |
| `query_criterion_wiring` | 判据接线自查：每条判据走的是哪条路（进计算 / 只读面 / 零引用），把「在不在场」与「被不被调用」分开 |
| `query_strata` | 分层读数：层别定位（同一形态在不同层不能串判） |
| `query_nested` | 四层嵌套读数（R/S/D/H 的宏观与微观形态、服从关系、展开终止判据） |
| `query_tension` | S↔D 张力读数：三档路由（有容差算跨距 / 只有条款出缺口清单 / 都拿不到则不判）、H 在张力上的位置形态、H 的四个面向与公式准入律 |
| `query_capability` | 通行证状态：宿主签发的结构凭证覆盖哪些**动作类**（write/delete/read/send/exec/destroy）× 哪段**作用域**（路径前缀/主机）、几次几时到期、已用几次与最近使用留痕。**证只能宿主签发**（模块级 `setPrincipalCapability` 或进程环境变量 `WEIWEN_CAPABILITY`），模型无法自签 |

### 3 道硬性闸门（hooks）+ 1 个只读审计钩子

- `tools/pre-execute`（waterfall）→ 返回 `{ kind: 'deny', reason }` 拦截该**动作**
- `agent/pre-step`（waterfall）→ 返回 `{ kind: 'reject' }` 拒绝整**步**
- `tools/post-execute`（waterfall）→ 返回 `{ kind: 'block', feedback }`，宿主把该调用以 `isError` 返回、content 换成 feedback —— 把失败的**回执**就地断成纠错回执
- `tools/result`（emit）→ 仅观察、不改写（契约上根本没有返回通道）

四者全部位于模型之外：2 道拦动作/步、1 道拦回执；均不侵入内 H。

### 授权面：任务范围（文本）与通行证（结构凭证）

引擎有**两个**授权闸口，缺一不可：

| 闸口 | 输入形态 | 判什么 | 失效模式 |
|---|---|---|---|
| 任务范围（`setPrincipalScope`） | **自由文本**，引擎从文本里抽路径锚/类别锚 | 「不可逆动作能否归属到已声明范围」 | 抽取器认绝对路径形态，**相对前缀抽不出**（实测六种写法：`允许向 xiaoD/ 目录推文` ⇒ `paths=[] nouns=[file]` ⇒ 所有 file 动作全部"归锚成功"） |
| **通行证**（`setPrincipalCapability`） | **结构化对象**，作用域直接声明 | 「动作类 × 作用域 × 次数/到期」三件事 | 无（不抽文本，只做包含判定）；但**必须有次数或到期**，否则等于白名单 |

**为什么叫通行证，不叫白名单**（差别是结构，不是措辞）：

|  | 白名单 | 通行证 |
|---|---|---|
| 判什么 | 列**条目**（哪个路径、哪个域名） | 判**凭证**（管哪些动作类、管哪段作用域、几次几时） |
| 没列到的 | 全拦 ⇒ 漏一条就误伤 | 不在作用域 ⇒ 拦；**作用域内不用列** |
| 增长 | 越用越长 ⇒ 迟早变成藏身处 | 有次数/到期 ⇒ 不累积 |

判据只有一条：**这个范围表达式能不能生成它没有逐一列出的项？**
`/repo/xiaoD` 能生成无限多项（结构）；`[a.txt, b.txt]` 只能命中列出的两项（枚举）。**两者可以一样窄，所以"窄"不保证是结构。**

```js
// 宿主侧签发（模块级导出；模型调不到 ⇒ 不可自签）
import { setPrincipalCapability } from 'dsh-weiwen-law';
setPrincipalCapability({
  id: 'xiaod-20261027',
  principal: '委托人',
  actions: ['write', 'read'],          // 封闭集：write / delete / read / send / exec / destroy
  scope: ['/repo/xiaoD', 'host:good.test'],  // 路径前缀（绝对或相对）／host: 主机
  maxUses: 3,                          // 或 expiresAt:'2026-10-28T00:00:00Z'，二者至少其一
});
```

第二条签发路径：进程环境变量 `WEIWEN_CAPABILITY=<json>`（由启动进程者设定，同样在模型之外）。

**判决三态**：`absent`（证未列该动作类 ⇒ 本判据不介入，行为与本功能出现前**一字不变**）／
`pass`（覆盖且未越界 ⇒ 放行 + 记一次使用）／`fail`（出界/过期/用尽 ⇒ **review**）。

**两条不变式**（实测锁定，见 `test/capability.test.mjs`）：
① 刚性锚的 deny **永不被证改变**（`rm -rf /`、读私钥仍 deny —— 证不买通客观规则）；
② **出界必 ≥ review**（无证时为 allow 的普通写/外传，越出证域即被拦下 —— 这是本判据的主效力）。
⚠️ 域内且"无锚可归"的删除会从 review 变 allow：那不是放宽，是**从"无人认领"变成"有人认领"**
（review 的正当理由是"归属未来无法验证"，证一签当场可验）。
⚠️ **不可解析的证 ⇒ review**，不会被当成"没签证书"（写错的配置不得静默变成放任）。

### 宿主侧结构入口（模块级 API；模型不可达）

| 入口 | 何时调用 | 为何结构上必须有 |
|---|---|---|
| `healBrokenWindow(note)` | 故障**确实修好之后**，或人工裁定后 | 破窗一旦成立，`pre-execute` 拒绝**一切**调用 —— **连同修复动作本身** ⇒ 宿主侧若无复位入口，破窗即**会话级死锁**（唯一出路＝重启进程）。引擎里的 `healWindow()` 只经 `resolveBug()`（闭环验证通过）到达，而它在 DSH 会话里不由被审计的模型触达 ⇒ 缺的是**线**，不是**能力**。 |

它不是工具 ⇒ 模型调不到 ⇒ **结构上不可能自我解锁**（主体分离由位置保证，不靠内容判别）。
返回 `{ at, note, kind, instances, wereBroken }`：`wereBroken` 为**复位前**实际处于破窗态的实例数
（先读后治，不虚报"治了"）；每次调用留痕（append-only，上限 20），因为解除止损是责任归因事件。

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

  // ③ 回执闸门：D 破窗止损落在回执上
  ctx.on('tools/post-execute', async (exec, result, next) => {
    if (result?.isError && engine.breakAtReceipt()) {
      return { kind: 'block', feedback: [{ type: 'text', text: '停机 → 反推 → 溯源 → 修复，方可重入' }] };
    }
    return next();
  });

  // ④ 审计钩子（emit）：仅观察、不改写
  //    契约是 (exec, result) —— 从第一个参数上读 error 会让失败入账静默失效。
  ctx.on('tools/result', (exec, result) => { if (result?.error) engine.onFailure(); });

  // ⑤ 11 个白箱自查工具（节选其一，其余同构）
  ctx.tools.register(defineTool({
    name: 'query_iron_laws',
    description: '返回三大铁律的定稿文本（不可变）',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute() { return { ironLaws: THREE_IRON_LAWS }; },
  }));
  // query_steady_state / list_rigid_anchors / query_conduction_chain / query_boundary / query_bugstop 同构注册
}
```

> 完整实现（含 12 个工具的 `execute` 细节、运行日志、引擎裁决逻辑）见仓库 `src/index.js`。

## 结构

```
package.json          # dsh 字段声明 bundle
weiwen-law.patch.yml  # 挂载补丁（headless profile overlay）
src/index.js          # 插件入口：钩子 + 11 个白箱自查工具
src/core/law.mjs      # 框架定义常量（详见基础版仓库，本仓不展开推导）
src/core/engine.mjs   # 纯逻辑裁决引擎（零 DSH 依赖，可单测）
test/                 # 单元测试 + 真实案例测试 + 对齐回归（`npm test` 全绿）
examples/             # 可复跑实测（demo-tool-loop / demo-backtrack-run）
docs/index.html       # 演示页：浏览器内跑真引擎（GitHub Pages 部署源）
docs/engine/          # 由 src/core/*.mjs 生成的浏览器镜像（勿手改）
docs/quadrant-judgment.md      # 四象限判据规格（判决语层：内框/外框/四格 · M = 内框 + 外框）
docs/review-flow-spec.md       # review 档六步执行规格（含「推演后果一起交还」）
scripts/build-docs-engine.mjs  # 生成器：npm run build:docs / check:docs（验同源漂移）
DESIGN.md             # 架构设计（映射表 / 风险 / 使用流程 / 挂载）
```

## 部署 / 接入 DeepSeek Harness

本仓库是 DeepSeek Harness（dsh，命令 `dsh`，基于 Cordis 插件框架，MIT）的**外部插件**。唯稳律以**模型之外**的因果约束层挂载（2 道闸门在动作/步之前、1 道在回执之前），不修改 dsh 内核，不绑定具体模型。

### 环境要求

- Node.js `^22.19 || >=24`（dsh 硬性要求，奇数版本不支持）
- DeepSeek API Key（或其他 OpenAI 兼容端点的 Key）
- dsh 当前为开发者预览版（v0.1.x），官方提示后续存在破坏性 API 变更；生产环境请锁定具体版本
- **兼容声明**：本插件验证于 DSH v0.1.x —— 真机实测（2026-08-19 与 2026-09-21：当时注册 6 个白箱工具；2026-10 增补至 12 个，新增 `query_anchor_channel` / `query_criterion_wiring` / `query_strata` / `query_nested` / `query_tension` / `query_capability`；3 道硬性闸门 + 1 个只读审计钩子端到端工作，回执闸门在一次真实失败调用上实测拦下，并把回执断成纠错回执）；mainline 快速演进中，接入前请以官方文档当前版本复核（挂载细节见 DESIGN.md）。

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

挂载后，运行在该 profile 的 Agent 自动获得 12 个白箱自查工具（`query_iron_laws` / `query_steady_state` / `list_rigid_anchors` / `query_conduction_chain` / `query_boundary` / `query_bugstop` / `query_anchor_channel` / `query_criterion_wiring` / `query_strata` / `query_nested` / `query_tension` / `query_capability`），并在工具调用前经过 `tools/pre-execute` 硬性护栏闸门（R/D/S/H/M 总裁决）与 `agent/pre-step` 内 H 不可侵闸门；工具失败的回执还要过 `tools/post-execute` 回执闸门（D 破窗止损：偏离累积达阈值时把故障回执就地断成纠错回执，断点落在回执上）。

### 方式三：一行命令安装（官方 dsh plugin 机制，推荐）

本插件已声明 `dsh.bundle.patch` 清单（见 `package.json`），DSH 用户可直接通过官方插件命令安装：

```bash
# 从 npm 安装 —— **对外唯一安装入口**，钉住版本号（不要用 latest）
dsh plugin --profile web add "dsh-weiwen-law@0.2.7"

# 重启生效
dsh --profile web
```

<details>
<summary>⚠️ 从 GitHub 源码直装（<b>仅开发自用，不对外</b>）</summary>

```bash
dsh plugin --profile web add "github:Shaky77/weiwen-law-dsh"
```

这条走的是仓库 `main` 的**当前态**，不是发版态：`main` 随时在动，且动了不会通知任何人。
两条路装出来可能不是同一份代码，而**版本号长得一样** ⇒ 出了问题无法对账。

仓库的职责是"源"，npm 的职责是"分发"，两者分开：
- **对外发布一律走 npm**，一个版本号对应一个提交，记在 [`RELEASES.md`](https://github.com/Shaky77/weiwen-law-dsh/blob/main/RELEASES.md)；
- 要核对"npm 上此刻那份对应哪个提交"，跑 `npm run check:release`（真下载包算指纹，不看自报）。

判断自己装的是哪一份，**看 `buildId`（代码哈希），不看版本号** —— 版本号是人写的，能忘改。

</details>

装完后在 `设置 → 插件 → 插件列表` 可见 `weiwen-law` 状态为"已启用"；Agent 自动获得 12 个白箱自查工具 + 3 道硬性闸门（`tools/pre-execute` / `agent/pre-step` / `tools/post-execute`）+ 1 个只读审计钩子（`tools/result`）。

### 卸载

- **方式三安装的**（官方 plugin 机制）：`dsh plugin --profile web remove dsh-weiwen-law`，重启生效。
- **方式二 overlay 挂载的**：从 dsh 启动配置（cordis.yml 的 plugins 列表或 `--patch` 参数）移除 `weiwen-law.patch.yml` 引用，重启生效。
- 移除后 Agent 不再获得 11 个白箱自查工具，也不再有 3 道硬性闸门与审计钩子；插件本身不写持久状态，卸载即干净。

### 日常使用 vs 压测

- **Web / Standard 模式**：日常对话与工程任务，插件在后台静默约束。
- **Headless 模式**：`dsh --profile headless` 无界面批量运行，适合回归测试与多 Agent 压测（本仓库 `versions/live/evidence/` 即此类实测归档）。

### 注意事项

- 插件入口为纯 ESM（`src/index.js`），依赖 `@deepseek-ai/dsh-tools`（peerDependency，可选）；接入前请以 dsh 官方文档当前版本复核 API。
- 远程部署 dsh 时需在配置中声明 `trustedHosts`，否则 API 层拒绝非本环路请求。
- `pnpm` 源码构建 dsh 时**必须**先 `pnpm run build`（内部包链接与前端产物），否则报模块找不到。

## 配置（Configuration）

- **运行形态**：纯 ESM 插件，无需构建；通过 `weiwen-law.patch.yml` overlay 或 `dsh plugin add` 接入 DSH，无独立服务进程。
- **环境变量**：仅 `DEEPSEEK_API_KEY`（模型调用需要，由 DSH 模型适配层透传，本插件不读取密钥内容）；其余为 DSH 自身配置（profile / cordis.yml），本插件不定义专属环境变量。
- **敏感项**：插件不写任何持久状态、不落盘用户数据；凭据默认留在宿主安全路径（如 `~/.workbuddy/deepseek_api_key.txt`），由宿主与 DSH 管理，不在本仓提交。

## 权限与数据（Permissions & data）

- **文件访问**：仅读取插件自身源码与 `weiwen-law.patch.yml`；不读取、不写入用户项目文件、会话日志或其他插件目录。
- **网络访问**：无独立对外网络请求；模型调用的网络由 DSH 模型适配层负责。
- **凭据与用户数据**：不采集、不上传任何用户数据或 API Key；内 H 边界声明「本插件不读不写主体性黑箱」——`query_boundary` 工具仅返回边界说明，不返回任何用户内容。
- **不可变声明**：三大铁律（`law.mjs`）与刚性锚点定义为只读常量，运行时不可被提示词或外部输入改写（白箱不篡改）。

## 故障排查（Troubleshooting）

- **插件未加载 / 工具未出现**：确认 DSH 版本为 v0.1.x，且 `weiwen-law.patch.yml` 已正确 overlay 到目标 profile；`dsh --profile web` 后于「设置 → 插件」确认 `weiwen-law` 状态为「已启用」。
- **挂载报错 `module not found`**：若从源码构建 dsh，须先 `pnpm run build`（内部包链接与前端产物），否则报模块找不到。
- **API 层拒绝非本环路请求**：远程部署 dsh 时须在配置声明 `trustedHosts`。
- **回滚**：移除 `--patch` 引用或 `dsh plugin remove dsh-weiwen-law` 并重启即彻底卸载，插件不残留任何状态。

## 开发（Development）

- **依赖**：Node.js `^22.19 || >=24`；运行时依赖仅 `@deepseek-ai/dsh-tools`（peerDependency，可选）。
- **测试**：`npm test`（即 `node --test "test/*.test.mjs"`）—— **条数以实测输出为准**，不在此写死（防随测试增长而过期）。
- **演示页**：`docs/index.html` 在浏览器内直接跑 `docs/engine/*.js`（由 `src/core/*.mjs` 生成）。**镜像只许生成、不许手改** —— 改完 `src/core` 后跑 `npm run build:docs`，用 `npm run check:docs` 验漂移（返回非零即有漂移）。
- **构建**：无需构建（纯 ESM + yml overlay）；修改 `src/core/engine.mjs` 后重跑 `npm test` 回归。
- **贡献**：框架本体（心法层）冻结于基础版仓库，本活系统版承载工程迭代；改动请基于本仓库 PR，并附 `node --test` 实测输出。

## License & security

本项目采用**双许可**：

- **开源使用**：**AGPL-3.0**（完整文本见 [LICENSE](https://github.com/Shaky77/weiwen-law-dsh/blob/main/LICENSE)）
- **商业集成 / 闭源分发 / 预装合作**：可取得**独立于 AGPL-3.0 约束**的授权，请联系 563003@qq.com

外部贡献需签署 CLA（用于支持上述双许可分发），见 [CONTRIBUTING.md](https://github.com/Shaky77/weiwen-law-dsh/blob/main/CONTRIBUTING.md)。

> **安全漏洞私下报告**：请勿在公开 issue 披露安全问题，直接邮件 563003@qq.com，作者将优先处理。

---

> 中英文版内容一致，互为参照。English counterpart: [**Shaky77/KISS_Law-DSH**](https://github.com/Shaky77/KISS_Law-DSH) —— 同 DSH / 导图形态，全英文；KISS 定义（Keep Integrity & Steady State's Law，非通俗工程 KISS）见英文版。

---

## 版本分层说明（重要）

**本仓库 = 活系统版（DSH）**（对应 GitHub `Shaky77/weiwen-law-dsh`）——基于完整版演进的可运行 DeepSeek Harness（DSH）插件形态，承载迭代与多 Agent 压测实测证据。**不是基础版。**

- **基础版（导图 / 心法层 · 冻结不可动）**：`Shaky77/Weiwen-s_Law`（中文）与 `Shaky77/KISS-s_Law`（英文）——框架定义、三大铁律、因果逻辑链的**不可变门面**，仅作参照与对接入口。
- **完整版**：在基础版之上补全工程化细节与完整实现，可通过联系方式向作者获取。
- **分层关系**：基础版（心法）→ 完整版 → 活系统版（DSH）。DSH 依据完整版构建，**不等于**基础版，请勿混淆。

## 联系方式

框架咨询 / 合作 / 审计对接：563003@qq.com
活系统版 DSH 仓库与实测证据：见上方"版本分层说明"指向的独立仓库。
