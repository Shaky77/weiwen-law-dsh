# 唯稳律（Weiwen's Law / KISS's Law）与市面上「因果」方案的区别
# How Weiwen's Law differs from existing "causal" approaches on the market

> 本文目的：让众人清楚知道，唯稳律不是「又一个因果引擎」，而是**通用型（领域无关）因果裁决中间件**。
> Purpose: to make clear that Weiwen's Law is not "yet another causal engine" — it is a **general-purpose (domain-agnostic) causal-adjudication middleware**.

---

## 一句话定位 · One-line positioning

**唯稳律 = 通用型因果裁决中间件**：只校验因果结构（R→D→S→H→M），对领域内容零知识，故法律、医疗、金融、机器人同一套机制。

**Weiwen's Law = a general-purpose causal-adjudication middleware**: it validates only causal structure (R→D→S→H→M) and encodes zero domain content, so law, medicine, finance, and robotics are governed by the same mechanism.

---

## 为什么重点在「通用型」，不在「因果」· Why "general-purpose", not just "causal"

市面上已有大量以「因果」为名的工作（因果效应估计、因果护栏、法律因果推理）。这些几乎都是**领域专用**的——它们校验的是某一特定领域的风险。

The market already has many "causal" efforts (causal-effect estimation, causal guardrails, legal causal reasoning). Nearly all are **domain-specific** — they validate risks within one particular domain.

唯稳律真正的护城河不是「用了因果」，而是「**因果 + 通用型**」：因为只认因果结构、对领域内容零知识，所以它天然跨域。因果结构检查是「通用型」得以成立的**机制**，不是卖点本身。

Weiwen's Law's real moat is not "uses causality" but "**causality + general-purpose**": because it validates only causal structure and encodes zero domain content, it is domain-agnostic by construction. Causal-structure checking is the *mechanism* that makes it general-purpose — not the selling point itself.

---

## 市场上三类「因果」方案，及与唯稳律的区别 · Three categories of market "causal" vs. Weiwen's Law

| 维度 Dimension | 市面上的因果方案 Market causal approaches | 唯稳律 Weiwen's Law |
|---|---|---|
| **类别一：因果效应估计库** Causal-effect estimation libs | DoWhy / CausalML / EconML / Pearl do-calculus：从数据中**估计**因果效应（"X 是否导致 Y、效应多大"） | 不**发现**因果，只**裁决**一个已提出的 agent 动作，其因果链结构是否可接纳 |
| 定位 Positioning | 统计因果**识别框架**（从观测数据推断因果） | **裁决中间件**（校验动作因果链结构是否稳健） |
| 领域绑定 Domain binding | 领域无关（纯统计），但**只做估计，不做裁决** | 领域无关 + **做裁决**（法律/医疗/金融/机器人同机制） |
| **类别二：领域专用因果护栏** Domain-specific causal guardrails | Causal Safety Engine（agent 安全）/ LLMGuardrail（LLM 去偏）/ CausalGuard（幻觉检测）/ Box Maze（LLM 推理） | 同上各类**绑领域**：校验该域特定风险（不安全因果信号 / 语义偏置 / 幻觉） |
| 领域绑定 Domain binding | **绑领域**（安全 / LLM / 幻觉） | **领域无关（通用型）**：不编码任何法律·医疗·LLM 内容，只认因果结构 |
| 实现 Implement. | 多为 ML / 概率式，或 LLM-as-interpreter（非确定） | **白箱 + 确定性**：裁决路径零 LLM，16 场景零随机（已实跑） |
| **类别三：跨法域法律因果 AI** Cross-jurisdictional legal causal AI | judgeai / Ontology-Driven（IEEE）/ Cross-Jurisdictional Governance（IEEE）/ ETLC | 同上各类**jurisdiction-AWARE**：显式编码法域、换 norm package |
| 法域处理 Jurisdiction | **法域感知**（编码法域、换规范包） | **法域中性 / 内容无关**（根本不编码法域）。法律只是抽样的其中一个领域，引擎跑通却零法律知识 |

---

## 唯稳律真正的五个差异化 · Five actual differentiators

1. **通用型（领域无关）General-purpose / domain-agnostic**
   内容无关 by construction。法律、医疗、金融、机器人同一套机制——不是「每个领域一个引擎」。

2. **白箱 + 确定性 White-box + deterministic**
   裁决路径零 LLM；16 真实场景零随机（已实跑）。同类多用 ML/概率式或 LLM-as-interpreter（非确定）。

3. **稳态铁律（不只是"因果"）Steady-state mandate — not merely "causal"**
   风险 < 唯稳律 < 稳态，**严格大于、无等于**；S（稳态储备）单调不降。这是「因果 + 稳态保全」双约束，市面因果方案无此设计。

4. **内 H 不可侵 Internal-H non-invasion**
   尊重事实认定者 / 决策者的内部黑箱（自由意志），不操纵、不入侵其思想层。

5. **第一 Bug 停机 First-Bug halt**
   结构性矛盾确定性 halt，切断该环节、保整体不崩——而非概率式「可能出错」。

---

## 我们实证的（诚实边界）· What we empirically validated (honest bounds)

- ✅ **16 个真实跨国判例**（美/英陪审团、中法官制）结构判定完全一致 → 证「通用型 + 法域中性」。
- ✅ 引擎验证**决策过程的因果可接纳性**，不判领域实体对错（不判 guilt、不判判决正误）。
- ❌ **不主张「第一 / 唯一」**：「通用型 + 因果 + 裁决中间件」这一交集可能新颖，但须经**正式 prior-art / 专利检索**坐实后再作此主张。

---

## 待办 · Follow-up

- 若未来主张进一步升级（如申请专利 / 正式学术宣称），补正式 prior-art 检索坐实（重点查 "general-purpose agent guardrail / causal adjudication middleware" 交集）。
- 审计现有对外文案（README / Discussion 帖 / 介绍信），将主轴统一为「**通用型因果**」，避免过度强调「因果」、弱化「通用型」。
