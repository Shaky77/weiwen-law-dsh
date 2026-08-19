# 唯稳律（Weiwen's Law）× DeepSeek Harness 插件 —— 架构设计

> 状态：设计稿 + **引擎已单测通过（16/16）**。DSH 适配层已按 v0.1.0-rc.6 源码级 API 校正。  
> 来源：作者揭示（夏祺 / Shaky77）。框架本体严格本位，不软化、不篡改。

---

## 0. 目标与边界

把唯稳律"因果律运行结构的白箱呈现"实现为一个可挂载到 **DeepSeek Harness（黑鲸 / DSH）** 的 **Cordis 插件**。插件在 Agent 运行层提供两层能力：

1. **硬性护栏（事件钩子）** —— 在每次动作前做 R 校验 / D 止损 / H 边界 / M 停机，不依赖模型自觉。
2. **白箱自查工具（可查询）** —— 把 S 稳态记账、H 边界、R 锚点暴露成工具，模型可自查、用户可审计。

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
├── cordis.patch.yml      # 插件挂载补丁
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

自查工具：`query_steady_state` / `list_rigid_anchors` / `query_conduction_chain` / `query_boundary` / `query_iron_laws`。铁律定稿见 law.mjs 的 THREE_IRON_LAWS（不可变）；R 域嵌套层级见 R_DOMAIN（宇宙⊃地球⊃宏观⊃微观）。

---

## 6. 已吸收 V0.6.1（扣子登记软著版）精华

不冲突的量化层设计已并入 `law.mjs` 的 `S_REFINEMENT` / `FEEDBACK_LOOP` / `CALIBRATION` / `BOUNDARY_ENUM` / `FRACTAL_METHOD`：

- S 的 `+s 正向` / `\|‑s\| 创伤` / 木桶取最短板细化；
- S/D→H→M→回写 S/D 的反馈闭环；
- 逻辑反推（沿 R 层级层层递进反向溯源、归因修复；与第一 Bug 停机**分开并行**：停机切链保活，反推溯源归因）；
- 边界标注枚举（框架内 / 纯随机 / 分形不一致 / 赋值不可信）；
- 分形推导方法（具体事件具体分析，不用粗糙公式一刀切）。

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
# 挂载 cordis.patch.yml（profile: standard）
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
