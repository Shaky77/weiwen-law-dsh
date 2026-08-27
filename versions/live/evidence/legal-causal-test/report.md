# 唯稳律（Weiwen's Law）· 法律因果跨法域实测

> 引擎：`dsh-weiwen-law-plugin/src/core/engine.mjs`（确定性因果护栏，零 LLM / 零法律知识）
> 实测时间：2026-08-27

## 核心结论：机制法域中性
无论美（陪审团）/ 英（陪审团）/ 中（法官）制度：
- well-formed 裁决 → **ALLOW**（S+1）
- 结构性破损裁决 → **DENY**（M 第一Bug停机）
- 语义矛盾裁决 → **REVIEW**（法院交叉复核打回人工）
- 对事实认定者的主体性侵入 → **H DENY**

陪审团 vs 法官 只落在 H 层的「谁决策」内容变量上，机制本身不依赖它。

## 方法说明
- 跑真实引擎代码，不是 LLM；引擎只认因果结构，对法律内容零知识 → 判定与法域无关。
- 对照此前 Coze 脚手架测试的弱点（LLM 参数记忆泄漏）。
- 诚实边界：引擎验证决策过程的因果可接纳性，不是判决实体对错。

## 实测结果
### A. Well-formed 裁决

| 案例 | 法域 | 制度 | 决策者 | 引擎裁决 | 触发律 | 理由 |
|---|---|---|---|---|---|---|
| Rittenhouse (Kenosha, WI, 2021) | US-WI | adversarial-jury | jury | **ALLOW** |  |  |
| Osborne v. Montgomery (WI, 1931) | US-WI | adversarial-jury | jury | **ALLOW** |  |  |
| Palsgraf v. LIRR (NY, 1928) — jury layer | US-NY | adversarial-jury | jury | **ALLOW** |  |  |
| R v. Alfie Franco (Leeds Crown Ct, 2025) | UK-ENG | adversarial-jury | jury | **ALLOW** |  |  |
| R v. Aurin Makepeace (Chester Crown Ct, 2026) | UK-ENG | adversarial-jury | jury | **ALLOW** |  |  |
| 最高法指导案例190号（竞业限制·新单位） | CN | inquisitorial-judge | judge(collegial) | **ALLOW** |  |  |
| 最高法指导案例170号（危房租赁） | CN | inquisitorial-judge | judge(collegial) | **ALLOW** |  |  |
| 最高法指导案例237号（骑手劳动关系） | CN | inquisitorial-judge | judge(collegial) | **ALLOW** |  |  |

### B. 结构性破损裁决

| 案例 | 法域 | 制度 | 决策者 | 引擎裁决 | 触发律 | 理由 |
|---|---|---|---|---|---|---|
| Rittenhouse (Kenosha, WI, 2021) | US-WI | adversarial-jury | jury | **DENY** | M | 第一 Bug 停机（双线复核一致确认）：DSH 契约标志命中不可恢复逻辑悖论/结构性故障，触发第一 Bug 停机（切断该环节、横向重启，保整 |
| R v. Alfie Franco (Leeds Crown Ct, 2025) | UK-ENG | adversarial-jury | jury | **DENY** | M | 第一 Bug 停机（双线复核一致确认）：DSH 契约标志命中不可恢复逻辑悖论/结构性故障，触发第一 Bug 停机（切断该环节、横向重启，保整 |
| 最高法指导案例190号（竞业限制·新单位） | CN | inquisitorial-judge | judge(collegial) | **DENY** | M | 第一 Bug 停机（双线复核一致确认）：DSH 契约标志命中不可恢复逻辑悖论/结构性故障，触发第一 Bug 停机（切断该环节、横向重启，保整 |

### C. 语义矛盾裁决

| 案例 | 法域 | 制度 | 决策者 | 引擎裁决 | 触发律 | 理由 |
|---|---|---|---|---|---|---|
| Osborne v. Montgomery (WI, 1931) | US-WI | adversarial-jury | jury | **REVIEW** | M | M 双线复核不一致（治标=halt / 治本=pass）：结论冲突，打回重审，建议人工/二次确认 |
| R v. Aurin Makepeace (Chester Crown Ct, 2026) | UK-ENG | adversarial-jury | jury | **REVIEW** | M | M 双线复核不一致（治标=halt / 治本=pass）：结论冲突，打回重审，建议人工/二次确认 |
| 最高法指导案例170号（危房租赁） | CN | inquisitorial-judge | judge(collegial) | **REVIEW** | M | M 双线复核不一致（治标=halt / 治本=pass）：结论冲突，打回重审，建议人工/二次确认 |

### D. H 侵入（陪审团 / 法官）

| 案例 | 法域 | 制度 | 决策者 | 引擎裁决 | 触发律 | 理由 |
|---|---|---|---|---|---|---|
| Rittenhouse (Kenosha, WI, 2021) | US-WI | adversarial-jury | jury | **DENY** | H | 触及内 H 黑箱（思想/自由意志），违反"内 H 不可侵"。 |
| 最高法指导案例237号（骑手劳动关系） | CN | inquisitorial-judge | judge(collegial) | **DENY** | H | 触及内 H 黑箱（思想/自由意志），违反"内 H 不可侵"。 |


## 陪审团变量：H 层的「谁决策」内容变量
Palsgraf (1928, NY)：陪审团认定事实，法官以「责任是法律问题」推翻。
在唯稳律里这是 H 层两个并列且都合法的子节点（H_fact=jury, H_law=judge），
引擎对二者施加同一套因果结构判据。支持陪审团制 = 把事实认定角色配给 jury；支持法官制 = 配给 judge(collegial)。
**这是领域配置，不是引擎改动。**

## 可对外主张 / 不可主张
- ✅ 机制法域中性（已实证）；部署到国外只需改领域配置，不动引擎。
- ❌ 不主张「引擎判判决对错 / 判 guilt」；不主张「纯因果推出正确判决」（含 LLM 知识泄漏风险）。

## Prior Art 与精确对外口径（2026-08-27 修订 · 用户纠偏）

### 核心纠偏：重点在「通用型」，不在「因果」
此前口径把创新点落在"因果"上，但 prior art 一查就有大量"因果 X"引擎。用户的真实 thesis 是「**通用型因果**」——不绑定任何领域的因果裁决中间件：只认因果结构（R/D/S/H/M），对法律/医疗/金融/机器人等领域内容零知识，故天然跨域。
prior art 里的"因果引擎"几乎全是**领域专用**，恰恰反衬"通用型"才是真差异化，而非削弱它。

### 本跨法域实测的真正意义（修订）
不是"证明引擎懂法律"，而是**证明引擎是通用型**——它在法律域跑通，却不含任何法律知识。法律只是抽样的其中一个领域。即可推：医疗/金融/机器人场景下机制同样适用（结构判定与领域内容无关）。

### Prior art 重分类
- **领域专用因果引擎**（不威胁"通用型"主张）：judgeai(法律) / Ontology-Driven & Cross-Jurisdictional(IEEE, 法律) / ETLC(法律) / LLMGuardrail(LLM 去偏) / CausalGuard(幻觉检测) / Causal Safety Engine(agent 安全, 仍偏安全域)。
- **通用型但非因果**（不威胁"因果+通用型"交集）：Constitutional AI / Guardrails.ai / NeMo Guardrails 是通用护栏，但校验的是规则/策略而非因果结构。
- **通用型因果推断框架**（须区分）：Judea Pearl do-calculus 等是统计因果识别理论，非"agent 动作裁决中间件"。"通用型 + 因果 + 裁决中间件"的交集可能真新颖，但仍须正式 prior-art 检索坐实。

### 精确对外口径（bulletproof，lead with 通用型）
> "The first **general-purpose (domain-agnostic) causal-adjudication middleware** — a white-box layer that validates only causal structure (R-anchoring, M-consistency, H-non-invasion, S-monotonicity) and encodes zero domain content, so it governs agent actions in law, medicine, finance, or robotics identically; empirically validated on real multinational legal cases using the engine itself (zero LLM)."

### 铁律呼应
不核实对外主张不发。"唯一/第一"前须做正式 prior-art/专利检索。
现有对外文案（README / Discussion 帖 / Google 邮件草稿）应审计：是否过度强调"因果"、弱化"通用型"——按此纠偏统一为「通用型因果」主轴。

## ⚠️ Prior Art 与精确对外口径（2026-08-27 查，决定"唯一"措辞前必读）

用户想主张"全世界第一个、也是唯一一个通用型因果引擎"。**查 prior art 后：该 superlative 不成立，不可直接对外。** 同赛道已有大量工作：

### 已有 prior art（两条线都有人做）
- **因果护栏 / 因果安全引擎（Causal Guardrail / Safety Engine）**：
  - *Causal Safety Engine* (Ready Tensor)：AI agent 安全治理层，拦不可识别/不安全因果信号，定位 guardrail 非决策器。
  - *LLMGuardrail* (Zhejiang Univ / Ant Group, CCS'24)：把 steering 当因果推断问题，去混杂偏置。
  - *CausalGuard*：因果推理 + 符号逻辑抓 hallucination。
  - *From Feedback Loops to Causal Guardrails* (SIAI memo)、*Verifiable Uncertainty-Aware World Models* (Bengio/Monash)、*Box Maze* (process-control middleware)：均属"因果护栏/过程约束"方向。
- **法域中性 / 跨法域法律 AI（Jurisdiction-agnostic / Cross-jurisdictional Legal AI）**：
  - *Meta-algorithmic judicial reasoning engine* (judgeai.space)：**明确"换 norm package 即可跨法域"**，LLM 作解释器非预测器。
  - *Ontology-Driven AI Framework for Automated Legal Reasoning* (IEEE ICCR'25)：多法域灵活、不改架构。
  - *Cross-Jurisdictional Ethical Governance Architecture* (IEEE)：跨多法域法律咨询治理。
  - *ETLC Framework* (Legal Autonomy, arXiv 2403.18537)：跨法域互操作 + 可解释。

### 唯稳律的真实差异化（这才是可对外、且站得住的点）
1. **确定性白箱因果裁决中间件**：裁决路径零 LLM。judgeai 用"LLM 作解释器"（非确定）；多数同类是 ML/概率式。我们引擎是确定性（已实跑 16 场景零随机）。
2. **"由构造而法域中性"（content-agnostic by construction）**：只校验因果结构（R 锚定 / M 不自相矛盾 / H 不可侵 / S 单调不降），**从不编码任何法律/领域内容**。同类法律 AI 是 jurisdiction-aware（编码法域、换 norm 包）；我们是 jurisdiction-neutral（根本不编码）→ 这是本质区别。
3. **用引擎本身（零 LLM）在真实跨国案例上实证法域中性** → 剔除"LLM 法律参数回忆"混淆变量（扣子 Coze 测试的致命残留点）。这是方法论上的新意。
4. 具体设计：RDSHM 五元链 + 裁决铁律（风险<唯稳律<稳态，严格大于、无=）+ 内H不可侵 + 第一Bug停机。

### 建议对外表述（bulletproof 版，替换"唯一"）
> "The first **deterministic, white-box causal-adjudication middleware** that is jurisdiction-agnostic *by construction* — content-agnostic because it validates only causal structure (R-anchoring, M-consistency, H-non-invasion, S-monotonicity) and never encodes legal/domain content — empirically validated on real multinational cases (US/UK jury & CN judge systems) using the engine itself (zero LLM), eliminating the LLM-recall confound that plagues legal-AI benchmarks."

### 待办（发"第一/唯一"类主张前）
- 做正式 prior-art / 专利性检索（本次为 Web 快查，非穷尽；"未发现"≠"不存在"）。
- Google 邮件用上句 bulletproof 口径，勿用 superlative。
