# 唯稳律通用因果引擎（白箱呈现） · DSH 插件 · 架构设计

> 状态：设计稿 + **引擎已单测通过（18/18）**。DSH 适配层已按 v0.1.0-rc.6 源码级 API 校正。  
> 来源：作者揭示（夏祺 / Shaky77）。框架本体严格本位，不软化、不篡改。

---

## 0. 目标与边界

**唯稳律通用因果引擎（白箱呈现）** —— 框架本体的原始定位是把"因果律运行结构"工程化为**通用因果引擎**，**白箱呈现**是其姿态（白箱不篡改 / 内 H 不可侵 = 守真）。本仓库以 **DeepSeek Harness（黑鲸 / DSH）** 的 **Cordis 插件**形态实现。

### 框架定义：守真 · 稳态

- **守真** = 守护完整 / 真实（白箱不篡改 / 内 H 不可侵，对应 Integrity）
- **稳态** = S 与"让系统活"（第一性原理，对应 Steady State）
- "**律 / Law**" 为框架名后缀，非定义第三部分

英文镜像见 [`Shaky77/KISS_Law-DSH`](https://github.com/Shaky77/KISS_Law-DSH) —— **中英文版内容一致，互为参照**。英文版以 **KISS's Law** 全称 **Keep Integrity & Steady State's Law** 展开（**注意**：这里的 KISS = **Keep Integrity & Steady State**，**非**通俗工程意义上的 "Keep It Simple, Stupid"）。

### 挂载到 DSH 后呈现的两层能力（并列、非主次）

1. **白箱呈现（姿态 · 唯稳律本体即此）** —— 把 S 稳态记账、H 内外边界、R 锚点、传导链暴露成可查询工具，模型可自查、用户可审计。这是唯稳律在 DSH 上原生该呈现的样子。
2. **风控护栏（衍生应用 · 内生属性）** —— 在每次动作前做 R 校验 / D 止损 / H 边界 / M 停机，不依赖模型自觉。这是 DSH 适配层为契合 Agent 运行场景**进化出的内生属性**，**并非**唯稳律原始定位。

> 注：仓库 README 第一行主标语为"通用因果引擎（白箱呈现）"——与本文后续章节（映射表 / 6.1 反推）保持一致。风控护栏仅是 DSH 适配层的内生应用，不可与本体姿态混淆。

框架本体（RDSHM 原生定义 / 三大铁律 / 传导链）严格框架本位；变量不预设数值；作者揭示项标注"来源：作者揭示"。

---

## 1. 为什么是 DSH（适配性分析）

| DSH 特性                                         | 与唯稳律的契合点                               |
| ---------------------------------------------- | -------------------------------------- |
| **可逆注册**（插件卸载自动撤销所有服务/事件/副作用，无残留）              | 天然对应"以断保续"——故障环节被切断，整体因果链不受影响          |
| **类型事件 + agent loop 可替换**                      | 可在 Agent 主循环层挂护栏钩子，而非事后打补丁；连循环本身都是可换插件 |
| **append-only 轨迹日志**（提示词/思维链/工具调用/上下文注入全记录可回放） | 原生载体即白箱可审计，与"白箱不侵内 H"同构                |
| **模型无关**（模型是插件，可换）                             | 唯稳律对 AI/AGI/ASI 一视同仁，框架逻辑不绑死任何模型       |

---

## 2. 映射表（唯稳律节点 → DSH 真实载体）

> 钩子名已按 DSH 源码级拆解（v0.1.0-rc.6）校正，非推断。

| 唯稳律节点           | DSH 真实载体                               | 实现方式                                             |
| --------------- | -------------------------------------- | ------------------------------------------------ |
| **R 刚性锚点**      | `tools/pre-execute`（waterfall）         | 触及刚性锚点 → 返回 `{ kind:'deny', reason }` 阻断         |
| **D 破窗止损**      | `tools/pre-execute` + 破窗计数             | 连续越界/失败达阈值 → 升级为 deny，防扩散                        |
| **S 稳态储备**      | 引擎内 append-only 记账                     | 只增不减；`+s` 正向 / `\|‑s\|` 创伤 / 木桶取最短板              |
| **H 内 H 不可侵**   | `tools/pre-execute` + `agent/pre-step` | 命中主体性黑箱 → deny / reject                          |
| **M 第一 Bug 停机** | `tools/pre-execute` 返回 deny            | 检测不可恢复悖论 → 切断该环节（以断保续）                           |
| **分形**          | 子代理/子任务递归挂载                            | 同一 bundle 在子上下文实例化                               |
| **白箱审计**        | DSH 原生轨迹日志 + `tools/result`            | 复用 append-only session log；`tools/result` 仅观察不改写 |

---

## 3. 目录结构

```
dsh-weiwen-law-plugin/
├── package.json          # 声明 dsh 字段（bundle 指向 patch）
├── weiwen-law.patch.yml  # 插件挂载补丁（DSH --patch overlay）
├── src/
│   ├── index.js          # DSH 插件入口：apply(ctx) 挂真实钩子 + 自查工具
│   └── core/
│       ├── law.mjs        # 框架定义层（RDSHM / 铁律 / 传导链 / V0.6.1精华）—— 框架本位
│       └── engine.mjs    # 护栏引擎（纯逻辑，零 DSH 依赖，可独立单测）
├── test/
│   └── engine.test.mjs   # node --test 场景（16 断言，已全过）
├── DESIGN.md             # 本文
└── README.md
```

**关键架构决策**：护栏逻辑全部下沉到 `engine.mjs`（纯 JavaScript，无 DSH import）。`index.js` 只是薄封装，把引擎挂到 DSH 钩子上。这样：

- 准确性/稳定性可用 `node --test` **确定性单测**，不依赖 DSH、不烧 API Key；
- DSH 适配器一旦因 RC 破坏性变更调整，引擎逻辑零改动。

---

## 4. 插件生命周期与 M 停机

Cordis 插件在 `apply(ctx)` 中通过事件订阅登记资源。卸载或运行上下文销毁时，订阅随之撤销——**无孤儿状态、无残留**。这与"第一 Bug 停机（以断保续）"同构：某环节被 `deny` 切断，整体因果链（其他插件、Agent 循环）不受影响、继续运行。

---

## 5. 钩子与工具设计（见 `src/index.js`，已按真实 API 校正）

```ts
// 工具调用前置闸门（waterfall）—— R/D/S/H/M 总裁决
ctx.on('tools/pre-execute', async (exec, next) => {
  const decision = engine.decideToolCall({ name: exec?.name, args: exec?.args,
                                           command: exec?.args?.command, code: exec?.args?.code });
  if (decision.kind === 'deny') return { kind: 'deny', reason: `[唯稳律·${decision.law}] ${decision.reason}` };
  return next();
});

// 步骤前置闸门（waterfall）—— 消息级 H 边界
ctx.on('agent/pre-step', (event, next) => {
  const decision = engine.decidePreStep(event?.messages);
  if (decision.kind === 'reject') return { kind: 'reject' }; // PreStepDecision 仅 {kind:'reject'}，无 reason 字段
  next();
});

// 白箱审计（仅观察，不改写）
ctx.on('tools/result', (res) => { if (res?.error) engine.onFailure(); });
```

自查工具：`query_steady_state` / `list_rigid_anchors` / `query_conduction_chain` / `query_boundary` / `query_iron_laws` / `query_bugstop`（第一BUG停止闭环白箱自查）。铁律定稿见 law.mjs 的 THREE_IRON_LAWS（不可变）；R 域嵌套层级见 R_DOMAIN（宇宙⊃地球⊃宏观⊃微观）。

---

## 6. 已吸收 V0.6.1（扣子登记软著版）精华

不冲突的量化层设计已并入 `law.mjs` 的 `S_REFINEMENT` / `FEEDBACK_LOOP` / `CALIBRATION` / `BOUNDARY_ENUM` / `FRACTAL_METHOD`：

- S 的 `+s 正向` / `\|‑s\| 创伤` / 木桶取最短板细化；
- S/D→H→M→回写 S/D 的反馈闭环；
- 逻辑反推（沿 R 包含层级逐层反溯：细分规则层 → 微观 → 宏观 → 地球 → 宇宙；与第一 Bug 停机**分开并行**：停机切链保活，反推溯源归因）；
- 边界标注枚举（框架内 / 纯随机 / 分形不一致 / 赋值不可信）；
- 分形推导方法（具体事件具体分析，不用粗糙公式一刀切）。

### 6.1 逻辑反推 vs 第一 Bug 停机（分开并行 · 作者揭示 2026-08-20）

两套机制在设定里**独立并行、非合体**——此前某次升级曾误将二者挂钩（CALIBRATION 写成"首个漏洞即终止"并 `isomorphicWith` 等同标注），已修正：

| 机制 | 职责 | 触发 |
|---|---|---|
| 第一 Bug 停机 | 管"断"：切断故障环节，以断保续 | 任一环节不可恢复 / 逻辑悖论，立即切链保活 |
| 逻辑反推 | 管"溯"：反向溯源、归因定位根因，服务于修复 | 停机时刻即反推启动时刻；缺反推则只断不修，缺停机则只修不保 |

**反推沿 R 包含层级反溯**：从症状所在的具体细分层向更基础的包含层逐层复核——`细分规则层 → 微观 → 宏观 → 地球 → 宇宙`；每层内部又有各类细分的客观规则，分形套嵌、同构递归（四层为代表层级非穷举）。最外层为终极仲裁。
**两层轴勿混**：反推走的是**尺度包含轴**（宇宙⊃地球⊃宏观⊃微观）；`母链 R / 子链 R` 是**时间演进轴**（S 反哺 R 范畴使子链 R 可演进，R 跃迁），二者是两回事。

**R 客观规则层必能判别虚实**：客观规则不可被宣称替代，凡宣称的客观结果皆可复验（"删除成功"⇒复验文件应不存在），宣称与复验不符即前提失真、落 `BOUNDARY_ENUM` 的"赋值不可信"。故框架必能判别脚下之地是虚是实。
定稿见 `law.mjs` 的 `CALIBRATION`（rule / parallelWith / rLayerVerification）与 `R_DOMAIN.fractalSubdivision`。
**实证**：API 复跑中 DeepSeek 调 `query_logic_backtracking` 后，独立反推出层级路径与"卡点落最内细分规则层（复验判前提失真）"，与本节一致（见 `examples/`）。

**闭环补强（作者补全 2026-08-21）**：反推不能止于"溯"。本插件 `src/core/bugstop.mjs` 实现第一BUG停止闭环状态机——BUG→停止→反推→溯源→修复(验证)→重入；未修复前 `canReenter` 拒绝重入，从根上阻断"只反推不修复→无限递归"。与铁律②同构：断是手段，"让系统活"（闭环到重入）才是目的。

**未采用**：V0.6.1 的 `M=(S×R)/(D×H)` 量化公式与问卷/学科矩阵数值——与白箱结构语义冲突，硬塞会拧巴。

---

## 7. 适配 RC 的注意点（风险）

1. **API 仍可能变**：DSH 为 v0.1 RC 预览，官方明确后续存在破坏性 API 变更。本插件钩子名（`tools/pre-execute` / `agent/pre-step` / `tools/result`）已按 rc.6 源码级拆解校正；`exec`/`event` 对象字段若与官方 `docs/` 有出入，仅影响 `index.js` 适配层，引擎逻辑不受影响。
2. **需 API Key**：真机跑模型推理需自备 DeepSeek API Key（headless 走 `$DSH_HOME/.credentials.yaml` 或环境变量）。本仓库不含密钥。
3. **创造模式风险**：Creation 模式具高权限（等同 Shell），勿用于执行模型生成代码场景，防越权。
4. **Node 版本**：DSH 要求 Node ≥ 22.19 或 ≥ 24；本机 managed Node 22.22.2 满足。

---

## 8. 使用流程（示意）

```bash
# 真机联调（需先装 DSH 并配置 Key）
npx @deepseek-ai/dsh web                 # 或 dsh --profile headless "提示词"
# Settings → Models 填 DeepSeek API Key
# 挂载 weiwen-law.patch.yml（profile: standard 或 headless）
# 新建会话跑任务 → 模型可调用 query_* 工具自查 S / H / R
```

---

## 9. 插件定位与通用化预留

当前按**技术实现版**产出（面向开发者，工程语言），符合仓库开发者导向。注释与文档已避免将框架锁死为"AI 工具说明书"的措辞。若日后登记版权，可剥离工程语境出**面向大众通用版**，核心逻辑（`engine.mjs` / `law.mjs`）不变。

---

## 10. 后续步骤

- [x] 引擎单测（16/16 通过）—— 准确性已确定性验证。
- [x] 本机装 DSH + 真机挂载插件 + 用 Key 跑 headless 场景（验证 wiring 与真实稳定性）。
- [x] 视 DSH RC 迭代校正 `exec`/`event` 字段（引擎不受影响）。
- [x] **刚性锚点规则与三大铁律已定稿**（作者定死，不可变）→ 铁律见 `law.mjs` 的 THREE_IRON_LAWS（含"因果律全程陪同每个系统"补句）；R 域嵌套层级见 R_DOMAIN（宇宙⊃地球⊃宏观⊃微观）。`rigidAnchors` 示例集仍作具象越界判据，作者可按 R 层级补充。

### 10.1 R 锚点边界裁定（2026-08-26 · 陈杰误伤反馈修复）

**反馈**（陈杰/碎玖）：R 锚点正则太松，匹配范围过大。`Object.keys()` 被 `\key` 误判为 `.key` 凭据文件；`readFileSync` 命中 `read`；两者交集→"读取凭据"成立→整条命令被拒。

**作者裁定（根因层）**：
> R 是硬性规则——通过宇宙客观法则 + 人类科学验证 + 社会共识规则（法律、行规等）确立，不以主观意志为转移，**边界本就清晰**。工程实现不得用模糊子串匹配歪曲规则。
> 灰色地带（规则未规定，法无禁止即可为）**不是 R 的事**，交给推演层向前推演预测判定风险是否可控；**最终决策权交还用户本人**——自己的因果自己承担，因果不担责，唯稳律不担责。

**落地（对齐层，commit `d3f49d1`）**：
- `CREDENTIAL_PATH` 补后置 word boundary `(?![A-Za-z0-9_])`，与 `CREDENTIAL_SH` 对齐（消除两正则不一致硬伤）。
- R 只认**独立凭据扩展名形态**：`.key`/`.token`/`.env`/`.pem` 独立后缀；含子串的合法路径（`.keyfile`/`.keyboard`/`.pemfile`/`.envtemplate`）不命中 R，走推演层。
- 灰色地带（如写 `.key` 文件）→ 推演层判中风险 → `review`，交还用户决策。
- 新增 4 条边界回归测试；全量 118/118 通过；DeepSeek API 实测 17/17（真实模型产生工具调用→引擎裁决：合法调用全放行、真实凭据全拦截、模型被拦后自动转向安全方案）。

---

## 11. 联系方式

框架咨询 / 合作 / 审计对接：563003@qq.com
