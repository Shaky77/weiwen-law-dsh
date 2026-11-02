// 五层推演读数（strata）· 只读，不接判决路径
// ════════════════════════════════════════════════════════════════════
// 来由（安 2026-10-20）：「依照结构，把公式带上，逐层推，逐层修。」
//
// 上一轮（readout.mjs）解决的是「判据该走哪条路」；本模块解决的是
// **「每层拿什么量来算」** —— 公式若只是形容词，就一次也用不上。
//
// 落码形态（docs/18 定式）：**每层先算一个量，结论＝量之间的关系**。
//   不是：这算不算扰动？            ← 开放域选择题，答错即判错
//   而是：不可逆占比是多少？        ← 填空题，答错能被指出来
//
// 🔴 本模块只读：
//   · 不 import engine（只接一个 duck-typed 实例）
//   · 不产生 allow / deny / review
//   · 三层状态之一必须显式落定：可算 / 待取证 / 未实现 —— **不许静默**
//
// ⚠️ 不得使用 node 内置模块（docs/engine 镜像给浏览器加载）。
//
// ════════════════════════════════════════════════════════════════════
// 🔴 更正横幅（2026-10-20 · 安质询「R₀ 怎么会一个数都没有呢」）
//
//   上一轮本文件写的是：
//     { key:'rNaught', expr:'R_DOMAIN[level].capacity', status:PENDING,
//       evidence:'TBD@R_DOMAIN.hierarchy[level].capacity —— 须按域取证' }
//   **两处错：**
//     ① `hierarchy[level].capacity` 字段根本不存在（只有 level/name/contains/note）
//        ⇒ 引用了一个假字段，表达式必然求不出值 —— 「写了 ≠ 生效」的又一例；
//     ② 把「我没去查」写成「查不到」⇒ 与 10-19 被纠的
//        「把『我不知道』写成『不可参数化』」是同一个病。
//
//   取证结果（见 rCapacity.mjs）：域常数全有，有标准号、有数值、有单位。
//   真正的缺口被这次质询顶了出来 —— **不是缺域常数，是缺分母 N_opp**：
//       扩容 ⟺ ΣS > R₀ ，其中 R₀ = p_max × N_opp
//   引擎只记「偏离事件数」，不记「总运行机会数」⇒ 失效率没有分母。
//   ⇒ 故 R 层由一格拆三格：p_max(OK) / N_opp(ABSENT) / R₀(PENDING)。
//   ⚠️ 形态意义：**「挂 TBD」本身是一个需要举证的判断**，不是免责声明。
//      挂之前必须先跑一次取证；跑完仍无，才可写 no_num。
// ════════════════════════════════════════════════════════════════════
// ────────────────────────────────────────────────────────────────────
// 🔴 本层第一次实跑就撞出的真缺口（2026-10-20，实测非推断）：
//
//   engine.historyTrail 的注释写着「append-only 全量历史刻痕：所有 S 事件只沉淀不消解」，
//   但**实际只 push 三条路径**：`positive>0` / `negative>0` / `trauma>0`。
//   而 `executed ∧ reversible==='scar'` 那条自动推导路径（delta = -1）**只减了 sBySubsystem，
//   没进 historyTrail**。
//
//   实测（4 笔账）：
//     historyTrail = 2 条  ["S+1","|S-1|"]
//     sAccount.rStore = 4 条  sign ["-","0","+","-"]  rev ["scar","none","unknown","unknown"]
//   ⇒ **不可逆动作（疤）在最该被记住的那本"全量"账里缺席。**
//
//   形态归类：这是「真的真话·半真」——注释每句都真（那三条确实记），
//   但不完整，且**核得出真 ⇒ 零告警**（四象格里最难抓的一格）。
//
//   ⇒ 因此 ΣS 一律从 **sAccount.rStore（全量账）** 取，不从 historyTrail 取；
//     并把「两源覆盖率」本身做成一个读数 —— **不抹平差异，让差异可见**。
// ────────────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════

import { R_CAPACITY, RCAP_KIND, rCapRoute, expandThreshold, isDegenerateDenominator, rCapAudit } from './rCapacity.mjs';

/** 量的三种状态。**没有第四种**：算不出就一定落在后两档之一。 */
export const QSTAT = {
  OK: 'ok',              // 现在就能算（engine 有数据面）
  PENDING: 'pending',    // 结构上可算，但缺常数 / 缺取证（须带 evidence 线索）
  ABSENT: 'absent',      // 实现层根本没有这个量（真缺口）
};

// ════════════════════════════════════════════════════════════════════
// 🔴 [2026-10-30 · 判据来源闸（小D 47 号件第五节）]
//
//   小D 提的规则：**判据只允许用公式里的五个量（R/S/D/H/M）；公式外的量只能观测，不得进判定。**
//   —— 这条规则是**规则的一半补全**：0.4.0 已立「占位不得进判定」（元判据），
//      但那只管住了**占位**；小D 指出另一半：**公式外的量**（哪怕是真身、哪怕有 Y 出处）
//      同样不该进判定——它们是**观测面**，不是**判据源**。
//
//   为什么这条能挡住小D 报的几乎所有问题（三倍计数 / 两本账 / 比率 > 1）：
//      那三条**全是观测口径**问题（厚度、透支、trauma、承担率、免责率、覆盖率
//      ——一个都不进公式）。⇒ 主线缺席时盯着旁支调，怎么调都不会对。
//      ⇒ 闸门立在这里，它们就自动降回"只读读数"，不再冒充判据。
//
//   ⚠️ 本闸是**只读面**（不产生 allow/deny/review）——与本模块整体同性质：
//      「元认知只能读，不能管」（readout.mjs 同原则）。
//      它做的是**把违规显式化**：谁在判定路径里用了公式外的量，当场报出来。
// ════════════════════════════════════════════════════════════════════

/** 公式里的五个量。**判据只允许用这五个**（R/S/D/H/M）——公式之外的量只能观测。 */
export const FORMULA_VARS = Object.freeze(['R', 'S', 'D', 'H', 'M']);

/** 判据来源闸的判定结果。 */
export const SOURCE_GATE = {
  ALLOWED: 'allowed',        // 判据源在公式五个量内 ⇒ 合规
  OFF_FORMULA: 'off-formula', // 判据源在公式外（只能观测）⇒ 违规
  UNKNOWN: 'unknown',        // 判据源判不出 ⇒ 不放行也不判违规（如实报缺）
};

/**
 * 判一条判据的来源是否合规。
 *
 * @param {string} source 判据所读的量名（如 'sThicknessStandIn'、'mLayerLoad'）
 * @param {object} [opts]
 * @param {boolean} [opts.placeholder] 该量是否为占位
 * @param {boolean} [opts.alias] 是否为旧名别名
 * @param {string} [opts.declared] **该量声明的来源层**（'R'/'S'/'D'/'H'/'M'）——
 *   🔴 判据**以声明为准**，不按 key 名字猜：读数字段名是实现细节（`sThicknessStandIn`），
 *     它属于哪一层是**声明**出来的（criterionSource）⇒ 按名猜＝按词形判＝枚举思维。
 * @returns {{status:string, source:string, reason:string}}
 */
export function judgeCriterionSource(source, opts = {}) {
  const s = String(source ?? '').trim();
  if (!s) return { status: SOURCE_GATE.UNKNOWN, source: s, reason: '判据源未声明 ⇒ 不判合规（unknown ≠ 零）' };
  // 🔴 先判占位：占位是"公式外"的**特例**（它连自己的真身都不是）⇒ 单独报，别混进"公式外"里。
  if (opts.placeholder) {
    return { status: SOURCE_GATE.OFF_FORMULA, source: s,
      reason: '🔴 占位不得进判定（元判据 0.4.0）：占位连真身都不是，只是占位。' };
  }
  if (opts.alias) {
    return { status: SOURCE_GATE.OFF_FORMULA, source: s,
      reason: '🔴 旧名别名不得进判定（读它等于读占位本体）。' };
  }
  // 判据**以声明为准**（declared = 该量声明自己属于哪一层）。
  const declared = String(opts.declared ?? '').trim().toUpperCase();
  if (!declared) {
    return { status: SOURCE_GATE.UNKNOWN, source: s,
      reason: '🔴 该量**未声明来源层** ⇒ 判不出它在不在公式内（unknown ≠ 零 ⇒ 不放行、也不判违规）。' };
  }
  if (FORMULA_VARS.includes(declared)) {
    return { status: SOURCE_GATE.ALLOWED, source: s,
      reason: `判据源在公式五个量（${FORMULA_VARS.join('/')}）内（声明层＝${declared}）。` };
  }
  return { status: SOURCE_GATE.OFF_FORMULA, source: s,
    reason: `🔴 判据源「${s}」声明层＝${declared}，不在公式五个量（${FORMULA_VARS.join('/')}）之内 ⇒ 只能观测，不得进判定。` };
}

// ════════════════════════════════════════════════════════════════════
// 跨层代入禁令（本轮推出来的第一条，先立再算）
//
// 🔴 S 有两个维度，名字都叫 S，但**不是同一个量**：
//   · 时间维度（ΣS）＝ 历史刻痕厚度，只增不减 ⇒ **求和**
//   · 当前值维度（S_now）＝ 稳态高度，可升可降 ⇒ **取 min（木桶）**
//   ⇒ 拿 S_now 当 ΣS 用 = 跨维度代入 ⇒ 命题类型错（与「恒定量不进变量表」同族）。
//
// 判据形态：**两个量的聚合方向相反（Σ 取和 / 木桶取最小），即不可互代。**
// 聚合方向相反的，永远不是同一个量 —— 这条可机械检查。
// ════════════════════════════════════════════════════════════════════
export const SUBSTITUTION_BAN = [
  {
    id: 'S-TIME-vs-S-NOW',
    a: 'sHistoryThickness',   // Σ|amount|  （只增）
    b: 'sNow',                // min over subsystems（可降）
    why: '聚合方向相反：Σ 取和 vs 木桶取最小 ⇒ 不是一个量。扩容看厚度，刹车看高度；混用会让"伤疤"被读成"储备"。',
  },
];

// ════════════════════════════════════════════════════════════════════
// 五层定义：每层给「量 ＋ 公式 ＋ 状态」
//
// 公式一律写成**可代入**形式：左边是对外可报的名字，右边是能从数据面算出的表达式。
// 算不出的量必须自带 `evidence`（TBD 挂在哪个标准 / 哪一层域）。
// ════════════════════════════════════════════════════════════════════
export const STRATA = [
  // ── R：域常数 ───────────────────────────────────────────────────
  {
    layer: 'R',
    name: '域常数',
    criterion: 'R_EXPANSION',
    formula: '扩容 ⟺ (ΣS > R₀) ∧ 质(S 经 M 沉淀)   ｜  R₀ = p_max × N_opp（RATE 类）；他类改走 |S_dev|>tol / 覆盖率 / 排序',
    quantities: [
      {
        key: 'sThicknessStandIn',
criterionSource: 'S',
criterionSourceNote: 'S 层量（公式分子）⇒ 在公式内，但本字段本身是**占位** ⇒ 占位闸另管。',
        label: 'ΣS 厚度（**占位**＝占「结构锚点厚度」这个位）',
        expr: 'count(rStore where sign ∈ {+,−})  // 单位＝有方向的刻痕数（**这是代理，不是真身**）',
        status: QSTAT.OK,
        dim: '时间维度·只增',
        placeholder: true,
        yOrigin: '🔴 **占位字段**：真身的 Y 侧出处已找到 —— law.mjs `R_EXPANSION.qualification`：「反哺资格 ＝ 量(ΣS > R₀) ∧ 质(**经 M 反馈沉淀的 S**，走完 D→H→M→顺痕回读一轮)」。⇒ **结构锚点 ＝ 经 M 反馈沉淀的 S**（框架原文，非自造词）。⚠️ 本字段现取的数是**代理**（有方向的刻痕数）⇒ 它与真身的关系是「占位」：名字自带 stand-in 标记，不与真身同名（命名纪律：占位字段名必须自带占位标记，不得冒充真身）。⚠️ **占位不得进判定**。真身计数见 sMSediment（只读观测）；同类差分见 sClassDiff。',
        note: '🔴 2026-10-29（安 10-29 定「唯稳律里没有一个变量是拍脑袋来的」＋手稿图2「Y 每个点为 S 是规则」）：本字段**没有**独立 Y 出处 ⇒ 按元判据降级为**占位**，不再自称「财务口径」。此前它自称「结构锚点数／财务口径」（0.3.6/0.3.7）——那是**代理冒充变量**，已改正。取自全量账（rStore）不取 historyTrail：后者漏 scar 推导路径（实测 4 笔只留 2 条）。伤疤也计入 —— 「记账只增」的应有之义，但不代表稳态变好。',
      },
      {
        key: 'sHistoryThickness',
criterionSource: 'S',
criterionSourceNote: 'S 层量（公式分子）；本字段是**旧名别名** ⇒ 别名闸另管。',
        label: 'ΣS 历史厚度（**旧名·兼容别名** ⇒ 请改读 sThicknessStandIn）',
        expr: 'count(rStore where sign ∈ {+,−})  // 同 sThicknessStandIn（值相同）',
        status: QSTAT.OK,
        dim: '时间维度·只增',
                alias: true,   // 旧名兼容别名（故意不自带占位标记：它不是占位本体，是旧名通道）
placeholder: true,
        yOrigin: '同 sThicknessStandIn（占位；真身出处见 law.mjs R_EXPANSION.qualification）。',
        note: '⚠️ **旧名兼容别名**（保留是为了不切断小D 的对照链）—— 权威名已改为 `sThicknessStandIn`（占位名自带标记）。本字段**不是**独立口径，读它等于读占位字段；勿当真身读。',
      },
      {
        key: 'sMSediment',
criterionSource: 'S',
criterionSourceNote: 'S 层量（公式分子）：经 M 沉淀的 S 计数 ⇒ 公式内。',
        label: '经 M 反馈沉淀的 S 计数（**结构锚点的真身计数·只读观测**）',
        expr: 'count(engine.sStructLedger)  // 单位＝结构账条目数（同类一条；经 M 判决完成沉淀）',
        status: QSTAT.OK,
        dim: '结构锚点·真身',
        yOrigin: 'law.mjs `R_EXPANSION.qualification`：「反哺资格 ＝ 量(ΣS > R₀) ∧ 质(**经 M 反馈沉淀的 S**，走完 D→H→M→顺痕回读一轮)」。',
        note: '🔴 **这是真身**（Y 侧有原文出处），与 sThicknessStandIn（占位）不同类。⚠️ [2026-10-30 口径更新（小D 49/51 号件）] 取数口从 historyTrail 的 S+1 条数改为**结构账条目数**（引擎 recordStructural：同类只记一条，条目＝判据形状——安 10-30 原话「流水账有数据，结构账没有数据，只有判据」）。⚠️ **只读观测**：本数不进判定；跃迁（ΣS>R₀ ⇒ 换规）归决策方。',
      },
      {
        key: 'sClassDiff',
criterionSource: 'S',
criterionSourceNote: 'S 层量（公式分子）⇒ 公式内；但**只读观测面**，不进判定。',
        label: '同类差分（**只读观测面·不是判据**）',
        expr: 'group historyTrail by (subsystem, topic) ⇒ compare first vs last sign  // 同类走向是否变过',
        status: QSTAT.OK,
        dim: '跨时点·只读',
        yOrigin: '框架原文（铁律 #16）：「载重不可在记账时观测（属内 H）⇒ 靠**同类 D 重现时行为是否变**反推」。',
        note: '🔴 **只读观测面**（安 10-29 裁：「先做只读版，只统计、不进账、不改判定；先看数、不急着立判据，免得又拍脑袋」）。读的是**同类走向的差分**（失败→成功 ＝ 路径被改变 ＝ 结构锚点的候选形态）。⚠️ **差分大 ≠ 就是结构锚点** —— 真身判据未落 ⇒ 本数仅供看形态，**不进判定**。',
      },
      {
        key: 'sEventCount',
criterionSource: 'S',
criterionSourceNote: 'S 层量（公式分子）⇒ 公式内；会计口径。',
        label: '事件数（会计口径＝全部离散事件）',
        yOrigin: '安 10-29（43 号件原话）：「**S 的会计账记流水计数**」「流水账这个东西只能算 S 外部暂时挂载的会计账本」。',
        expr: 'count(sAccount.rStore)  // 单位＝离散事件数（含 unknown / 中性）',
        status: QSTAT.OK,
        dim: '时间维度·只增',
        note: '流水口径的显式命名（与 sHistoryThickness 同值、不同名）—— 读数面上把「会计」与「财务」两个数摆开，别混读。',
      },
      {
        key: 'sOverdraft',
criterionSource: 'S',
criterionSourceNote: 'S 层量（公式分子）⇒ 公式内；欠账方向读数。',
        label: '透支额（欠了多少）',
        yOrigin: '框架 law.mjs S：「负向侵蚀取**绝对值** |S-1|，不以代数符号消解历史」「历史刻痕不可逆」＋ 安 10-29：见底（储备为 0）与透支（欠账）在因果上不同 ⇒ 分读。',
        expr: 'Σ max(0, −net_subsystem)  // 与储备读数分开',
        status: QSTAT.OK,
        dim: '欠账方向',
        note: '🔴 2026-10-29（小D 39/40 号件）：见底（储备为 0）与透支（欠账）在因果上不同 ⇒ 欠账单列，不装进储备。',
      },
      {
        key: 'sNow',
criterionSource: 'S',
criterionSourceNote: 'S 层量（公式分子）⇒ 公式内。',
        label: 'S_now（当前值）',
        yOrigin: '框架 law.mjs S：「②当前值维度因正负影响可升可降」「短板效应：多系统 S 取 min（木桶效应），决定整体稳态上限」。',
        expr: 'min over sBySubsystem',
        status: QSTAT.OK,
        dim: '当前值维度·可降',
        note: '木桶：短板决定上限。与 ΣS 不可互代（见 SUBSTITUTION_BAN）。',
      },
      {
        key: 'rCapPMax',
criterionSource: 'R',
criterionSourceNote: 'R 层量（公式分子）⇒ 公式内（域常数）。',
        label: 'p_max（域常数·容许失效率）',
        yOrigin: '框架 law.mjs R_DOMAIN（域 ＝ 锚点定出的作用范围与量级刻度）＋ rCapacity.mjs（航空 1E-9/h、汽车 1E-8/h…有标准号、有数值、有单位）。',
        expr: 'R_CAPACITY[domain].value',
        status: QSTAT.OK,
        dim: '域常数·已取证',
        note: '🔴 上一轮把 R₀ 挂成 TBD 是错的：域常数**一直有**（航空 1E-9/h、汽车 1E-8/h、医疗 ±5%…），有标准号、有数值、有单位。见 rCapacity.mjs。缺的从来不是它。',
      },
      {
        key: 'nOpportunities',
criterionSource: 'R',
criterionSourceNote: 'R 层量（公式分母侧，R₀ = p_max × N_opp）⇒ 公式内。',
        label: 'N_opp（总运行机会数·分母）',
        yOrigin: '框架 law.mjs R_EXPANSION：「扩容 ⟺ (ΣS > R₀)」，其中 R₀ = p_max × N_opp ⇒ N_opp 是公式**自带**的分母（不是自造量）。',
        expr: 'engine.nOpportunities  // 飞行小时数／总输注次数／总交易笔数',
        status: QSTAT.ABSENT,
        dim: '分母',
        evidence: '🔴 真缺口：engine 只记「偏离事件数」，不记「总机会数」⇒ 失效率没有分母。这才是 R₀ 算不出的真正原因。⚠️ 不可拿 ΣS 顶替（见 isDegenerateDenominator：会退化成 ΣS > p×ΣS，恒真）。',
        note: 'N_opp 与 ΣS 是两个量：前者是「发生了多少次」，后者是「总共给了多少次机会」。',
      },
      {
        key: 'rNaught',
criterionSource: 'R',
criterionSourceNote: 'R 层量（公式分子，阈值）⇒ 公式内。',
        label: 'R₀（域容量阈值）',
        yOrigin: '框架 law.mjs R_EXPANSION：「扩容 ⟺ (ΣS > R₀)（严格大于）才触发 R 子链扩容」。',
        expr: 'p_max × N_opp  // 仅 RATE 类；其他量纲见 rCapRoute',
        status: QSTAT.PENDING,
        dim: '域常数 × 分母',
        evidence: 'PENDING@N_opp 缺分母（不是缺域常数）。折算式 R₀ = p_max × N_opp 已落码 expandThreshold()。',
        note: '🔴 R₀ 不是一个数，是「一个数 ÷ 一个分母」还原回次数口径。缺分母时答案是"还算不出"，不是"不扩容"。',
      },
      {
        key: 'rCapRoute',
criterionSource: 'R',
criterionSourceNote: 'R 层量（域/量纲路由）⇒ 公式内。',
        label: '接入路由（该域该用哪条公式）',
        yOrigin: '框架 law.mjs R_EXPANSION.qualification：域不同 ⇒ **公式不同，不是阈值不同**（量纲定路由，不靠域名查表）。',
        expr: 'rCapRoute(kind, sUnit)',
        status: QSTAT.OK,
        dim: '结构路由',
        note: '🔴 域不同 ⇒ **公式不同，不是阈值不同**。RATE→ΣS>p×N_opp／TOLERANCE→|S_dev|>tol／RATIO→覆盖率／SCALE→只排序／NO_NUM→数值不触发。路由由标准给的**量纲**定，不由域的名字定 ⇒ 新域不必查表命中名字。',
      },
      {
        key: 'sQualified',
criterionSource: 'S',
criterionSourceNote: 'S 层量（质条件）⇒ 公式内。',
        label: '质条件（是否经 M 沉淀）',
        yOrigin: '框架 law.mjs R_EXPANSION.qualification：「反哺资格 ＝ 量(ΣS > R₀) ∧ 质(**经 M 反馈沉淀的 S**，走完 D→H→M→顺痕回读一轮)」；X 轴枚举**不具**此资格。',
        expr: 'count(sAccount.sign ∈ {+,−}) > 0 ∧ 存在对应 M 落点',
        status: QSTAT.OK,
        dim: '质条件',
        note: '量够了不代表有资格：X 轴枚举永远不具资格（它不是 S 不够厚，是根本不是 S）。',
      },
    ],
    stopAt: [
      '🔴 域常数（p_max）已有；缺的是分母 N_opp ⇒ 报「缺分母」，**不许报「域常数未取证」**（那是上一轮的错，已撤）。',
      '❌ 不可用：「该域标准是 RATE，而 ΣS 是事件数 ⇒ 直接比 1E-9 > 5」——跨单位比较＝命题类型错。',
      '❌ 不可用：拿 ΣS 当 N_opp 代进去（退化守卫 isDegenerateDenominator 会拒）。',
      'SCALE 类（DAL/ASIL/Class）只可排序，不可当阈值；NO_NUM 类（DAL D）标准合法不给数 ⇒ 该域数值不触发扩容，**这不是欠账**。',
      'ΣS 大而质条件不成立 ⇒ 报「厚度够、资格不成立」，不报「将扩容」。',
    ],
  },

  // ── S：流水账本 ─────────────────────────────────────────────────
  {
    layer: 'S',
    name: '稳态储备',
    criterion: 'S_REFINEMENT',
    formula: 'S_now(sub) = Σ delta ；S_now = min_sub S_now(sub)',
    quantities: [
      {
        key: 'sNow',
        label: 'S_now（当前值）',
        expr: 'min over sBySubsystem',
        status: QSTAT.OK,
                yOrigin: '框架 law.mjs S：「②当前值维度因正负影响可升可降」「短板效应：多系统 S 取 min（木桶效应）」。',
dim: '当前值维度',
      },
      {
        key: 'sPositive',
criterionSource: 'S',
criterionSourceNote: 'S 层量（公式分子）⇒ 公式内。',
        label: '正向事件数',
        yOrigin: '框架 law.mjs S：「正向影响走 S 路径 S→S+1 增强」「『+1』表示一次独立的离散事件」＋ 安 43 号件：「+S 对于唯稳律的意义是**正向锚点**」。',
        expr: "count(historyTrail.type === 'S+1')",
        status: QSTAT.OK,
        dim: '事件计数',
      },
      {
        key: 'sNegative',
criterionSource: 'S',
criterionSourceNote: 'S 层量（公式分子）⇒ 公式内。',
        label: '负向侵蚀数',
        yOrigin: '框架 law.mjs S：「负向影响走 D 路径 S→S-1 削弱（当前值下降，但该侵蚀事件本身作为历史刻痕以**绝对值**永久记录）」＋ 安 43 号件：「|-S| 是**负向锚点**」。',
        expr: "count(historyTrail.type === '|S-1|') + count('trauma')",
        status: QSTAT.OK,
        dim: '事件计数',
      },
      {
        key: 'sTrauma',
criterionSource: 'S',
criterionSourceNote: 'S 层量（公式分子）⇒ 公式内。',
        label: 'trauma 计数',
        yOrigin: '手稿原话：**|−S| ＝ 负向积累（创伤、失败、挫折……）**（安 10-29 43/44 号件引）。',
        expr: 'traumaCount',
        status: QSTAT.OK,
        dim: '刻痕',
      },
      {
        key: 'sTrailCoverage',
criterionSource: 'S',
criterionSourceNote: 'S 层量（公式分子）⇒ 公式内；**两源一致性读数**，判据不可用。',
        label: '刻痕覆盖率（两源一致性）',
        yOrigin: '框架 law.mjs S：「①时间维度——所有发生过的事不可改变或移除，只沉淀为历史，历史刻痕不可逆（不可消解）」。',
        expr: 'count(historyTrail) / count(sAccount.rStore)',
        status: QSTAT.OK,
        dim: '比例',
        note: '🔴 **不抹平差异，让差异可见**：< 1 说明"全量历史"那本账漏记了路径。实测 scar 路径必漏 ⇒ 覆盖率恒 < 1 时不是偶发，是结构。',
      },
    ],
    stopAt: [
      '🔴 已登记口径缺陷：`delta = -1` 恒为 −1，而正向 `delta = positive` 可 > 1 ⇒ **同一公式里两个单位**（负向按事件、正向按量级）。读数中分别报「事件数」与「S 值」，不合并成净变化。',
      '覆盖率 < 1 ⇒ 只可用 rStore 算厚度；**不得用 historyTrail 算厚度**（会系统性低估，且低估的恰是不可逆动作）。',
    ],
  },

  // ── D：扰动 ────────────────────────────────────────────────────
  {
    layer: 'D',
    name: '扰动 / 脆弱性',
    criterion: 'CHAIN_NODES.D',
    formula: 'D_impact ∝ 不可逆性（scar ≫ window > none），不 ∝ 发生次数',
    quantities: [
      {
        key: 'dScarRate',
criterionSource: 'D',
criterionSourceNote: 'D 层量（公式分母）⇒ 公式内。',
        label: '不可逆占比',
        yOrigin: '框架 law.mjs S：「负向侵蚀取绝对值 |S-1| …不以代数符号消解历史」（不可逆是**既有的**可逆性分类，不是新增判据）。',
        expr: 'count(sAccount.reversible === "scar") / count(sAccount)',
        status: QSTAT.OK,
        dim: '比例',
        note: '这是把「数了几次」换成「有没有不可逆」的落点（Rehan 侧 F3 同一判据）。',
      },
      {
        key: 'dUnknownRate',
criterionSource: 'D',
criterionSourceNote: 'D 层量（公式分母）⇒ 公式内。',
        label: '可逆性不可判占比',
        yOrigin: '框架：不可判 ≠ 零风险（落在保守侧，且必须显式报出）——「未知不可折叠进已知」。',
        expr: 'count(reversible === "unknown") / count(sAccount)',
        status: QSTAT.OK,
        dim: '比例',
        note: '不可判不是零风险：它落在保守侧，且必须显式报出。',
      },
      {
        key: 'dMax',
criterionSource: 'D',
criterionSourceNote: 'D 层量（公式分母）⇒ 公式内。',
        label: 'D_max（多系统取最大）',
        yOrigin: '框架 MULTI_SYSTEM_RULES.dMax（多系统 D 取最大；**engine 内未核到实现** ⇒ 如实报未实现，不拿单系统近似冒充）。',
        expr: 'max over subsystems',
        status: QSTAT.ABSENT,
        evidence: 'MULTI_SYSTEM_RULES.dMax —— engine 内未核到实现；多系统是否在引擎语义内尚未定。',
        note: '🔴 未实现就报未实现，不拿「单系统近似」冒充。',
      },
    ],
    stopAt: [
      'dScarRate 与 dUnknownRate 必须**分开报**：未知不可折叠进已知（否则"没测"被读成"没有"）。',
    ],
  },

  // ── H：主观能动性 ──────────────────────────────────────────────
  {
    layer: 'H',
    name: '主观能动性（承担）',
    criterion: 'H_ENERGY_POSITION',
    formula: 'H_load = 有依据刻痕 / 总刻痕（承担率）',
    quantities: [
      {
        key: 'hPaymentStandIn',
criterionSource: 'H',
criterionSourceNote: 'H 层量（公式分母）⇒ 公式内，但本字段是**占位** ⇒ 占位闸另管。',
        label: '承担率（**占位**＝占「H 承担率」这个位）',
        expr: 'count(sign ∈ {+,−}) / count(sAccount)  // **这是代理**：有方向的刻痕占比',
        status: QSTAT.OK,
        dim: '比例',
        placeholder: true,
        yOrigin: '🔴 **占位**：真身＝「H 有没有支付动作」（安 10-29 43 号件原话：「能不能进入 S 这个财务账，需要看 H 这个主体有没有支付动作」）。⚠️ 现取数口是**代理**（以「有方向」代理「支付」）——**H 的支付动作含内 H（不可侵、不可审计），外 H 只能观测 ⇒ 当场不可判**；真身只可能**跨时点反推**（框架原文：载重不可在记账时观测 ⇒ 靠同类 D 重现时行为是否变反推）。⇒ 名字自带 stand-in 标记，不冒充真身。⚠️ **占位不得进判定**。',
        note: '载重是能动性唯一可观测的面（铁律 #16）：付了消耗才是满载。⚠️ 但「有方向」≠「支付」（方向可由 scar 推导，支付须 H 亲认领代价）⇒ 本数是占位；真身观测面见 sClassDiff（只读）。',
      },
      {
        key: 'hPaymentRate',
criterionSource: 'H',
criterionSourceNote: 'H 层量（公式分母）；本字段是**旧名别名** ⇒ 别名闸另管。',
        label: '承担率（**旧名·兼容别名** ⇒ 请改读 hPaymentStandIn）',
        expr: '同 hPaymentStandIn（值相同）',
        status: QSTAT.OK,
        dim: '比例',
                alias: true,   // 旧名兼容别名（故意不自带占位标记：它不是占位本体，是旧名通道）
placeholder: true,
        yOrigin: '同 hPaymentStandIn（占位）。',
        note: '⚠️ **旧名兼容别名**（保留是为了不切断小D 的对照链）—— 权威名已改为 `hPaymentStandIn`。',
      },
      {
        key: 'hExemptStandIn',
criterionSource: 'H',
criterionSourceNote: 'H 层量（公式分母）⇒ 公式内，但本字段是**占位** ⇒ 占位闸另管。',
        label: '免责率（**占位**＝占「H 免责率」这个位）',
        expr: 'count(sign === "unknown") / count(sAccount)  // **这是代理**：不可判刻痕占比',
        status: QSTAT.OK,
        dim: '比例',
        placeholder: true,
        yOrigin: '🔴 **占位**：真身＝「H 是否被豁免」（内 H 侧，不可当场判）⇒ 现取数口（sign=unknown 占比）是代理。⚠️ 名字自带 stand-in 标记，不冒充真身；**占位不得进判定**。',
        note: '🔴 免责率升高 ⇒ 载重被摘掉（v10 病灶的量化形态）。它不违反守真，但**不产生判断力**。⚠️ 本数是占位（代理），真身观测面见 sClassDiff（只读）。',
      },
      {
        key: 'hExemptRate',
criterionSource: 'H',
criterionSourceNote: 'H 层量（公式分母）；本字段是**旧名别名** ⇒ 别名闸另管。',
        label: '免责率（**旧名·兼容别名** ⇒ 请改读 hExemptStandIn）',
        expr: '同 hExemptStandIn（值相同）',
        status: QSTAT.OK,
        dim: '比例',
                alias: true,   // 旧名兼容别名（故意不自带占位标记：它不是占位本体，是旧名通道）
placeholder: true,
        yOrigin: '同 hExemptStandIn（占位）。',
        note: '⚠️ **旧名兼容别名**（保留是为了不切断小D 的对照链）—— 权威名已改为 `hExemptStandIn`。',
      },
    ],
    stopAt: [
      'H 只报「承担率」，**不报对错**：对错由 M 打回，不由本层自评。',
    ],
  },

  // ── M：信号反馈 ────────────────────────────────────────────────
  {
    layer: 'M',
    name: '信号反馈',
    criterion: 'CONVERGENCE',
    formula: '收敛度 = 落点集中度的**单调方向**（非容差、非阈值）',
    quantities: [
      {
        key: 'mConcentration',
criterionSource: 'M',
criterionSourceNote: 'M 层量（链末结果）⇒ 公式内。',
        label: '落点集中度',
        yOrigin: '框架 law.mjs CONVERGENCE：「收敛度 ＝ 落点集中度的**单调方向**（非容差、非阈值）」——真链＝观测增多则集中度上升。',
        expr: '同 R 落点事件数 / 不同 R 落点数',
        status: QSTAT.OK,
        dim: '结构量',
        note: '真链：观测增多 ⇒ 集中度上升；假链：平移 ⇒ 集中度不升。',
      },
      {
        key: 'mDirection',
criterionSource: 'M',
criterionSourceNote: 'M 层量（链末方向）⇒ 公式内。',
        label: '方向（近/远/不动）',
        yOrigin: '框架 law.mjs CONVERGENCE.threshold（**明令不可定阈值/容差** ⇒ 只报方向，永不写容差）。',
        expr: 'sign(concentration_after − concentration_before)',
        status: QSTAT.PENDING,
        dim: '单调方向',
        evidence: 'TBD@两窗切分口径 —— 窗口怎么切未定；🔴 定的是**方向**，永不写容差（law.mjs CONVERGENCE.threshold 明令不可定）。',
        note: '阈值本体论禁止：写死容差＝提前代理 H 的选择权。',
      },
      {
        key: 'mForwardWired',
criterionSource: 'M',
criterionSourceNote: 'M 层量（前向推演接线）⇒ 公式内。',
        label: '未来格是否接线',
        yOrigin: '框架：M 第一 Bug 停机 + 前向推演面（FORWARD_INFERENCE / M_TWO_TENSES；当前**零接线** ⇒ 如实报未接，不报「收敛度为零」）。',
        expr: 'engine 内是否存在前向推演输出面',
        status: QSTAT.ABSENT,
        evidence: 'FORWARD_INFERENCE / M_TWO_TENSES —— 零接线（readout.phaseReadout 已登记）。',
      },
    ],
    stopAt: [
      '🔴 只报方向，不报「进圈了没有」——后者是容差，属越界。',
      '未来格未接线 ⇒ 报「未接」，不报「收敛度为零」（未测 ≠ 零）。',
      // 🔴 [2026-10-30 · 小D 47 号件第五节] 主线缺席时，旁支不许顶替。
      '🔴 **M 不可算时，报「不可判（缺哪项）」，不许拿公式外的量顶替**（如厚度、透支、承担率、覆盖率——'
        + '它们是**观测面**，一个都不进公式）。「这句比一个错的 M 值有用得多」。',
    ],
  },
];

// ════════════════════════════════════════════════════════════════════
// 🔴 [2026-10-30 · M 的不可判形态（小D 47 号件第五节 · 安 10-29「唯稳律的公式没上场吧？」的落法）]
//
//   小D 的核心观察（经我独立复核**成立**）：引擎跑的是**闸门**，不是**因果律计算**——
//     · 公式 M = (R×S)/(D×H) 在实现层**零命中**（readout.mjs R_EXPANSION.gap 已登记）；
//     · strata 的 M 层只有 mConcentration（落点集中度，**不是 M**）/ mDirection(pending) / mForwardWired(absent)；
//     · 框架原文（weiwen_framework L1604）：「公式 ＝ **截面**；活系统 ＝ **循环**：五节点走完，末端写回基线」，
//       且「S 在链上应出现**两次**：M 之前读入（本圈基线）、M 之后写成 S′（下圈基线）」。
//   ⇒ **「公式没跑」是真的**（不是小D 的误读）。
//
//   ⚠️ 但有一处必须分清（小D 未提，我核出来了）：**框架明令公式不赋值不计算**——
//     安 2026-10-20 亲定：「M **只输出方向**（up/down/indeterminate），**绝不输出数值**」
//     （日志 2026-10-20.md:169；nested.mjs 的 mDirection 就是按这条实现的）。
//   ⇒ 所以「没有一处输出 M = R×S/(D×H)」**这句按字面不成立**（不该有数值输出）；
//      **真缺的是「方向判据接进运行期」**——不是「缺一个数」。
//   ⇒ 落法因此**不是**去算 M 的数值（那会违反"不赋值不计算"），而是：
//     ① 把 M 的**可算性**做成显式读数（缺哪项 ⇒ 报缺哪项，不报 0、不拿旁支顶替）；
//     ② 把 mDirection 从恒 PENDING 改成**真接上**（nested.mjs 已实现，只差接线）。
// ════════════════════════════════════════════════════════════════════

/**
 * M 的可算性检查：公式 M = (R×S)/(D×H) 的五个量，逐项报**在不在场**。
 *
 * 🔴 判据形态（小D 47 号件第五节）：**M 不可算时，报「不可判（缺哪项）」，不许拿公式外的量顶替。**
 *   ⇒ 缺项**逐条列出**（哪一项缺），不是笼统的"不可算"。
 *   ⚠️ 不输出 M 的**数值**（框架明令不赋值不计算）——本函数只判**方向能否判**。
 *
 * @param {object} surface dataSurface 的输出
 * @param {object} [opts]
 * @param {object} [opts.delta] {R,S,D,H} 各 -1/0/+1（定性变化量；缺省全 0）
 * @returns {{judgable:boolean, dir?:'up'|'down', missing:string[], reason:string}}
 */
export function mComputability(surface, opts = {}) {
  const s = surface;
  const missing = [];
  // R：域常数与阈值（公式分子侧）—— p_max 已在 R_CAPACITY；R₀ 需要分母 N_opp。
  const hasPMax = !!(s && s.domainKey && R_CAPACITY[s.domainKey]);
  if (!hasPMax) missing.push('R（域常数 p_max：当前域未登记）');
  if (!s || s.nOpp == null) missing.push('N_opp（总运行机会数：R₀ 的分母，engine 未记）');
  // S：分子侧的 S —— 须有**真身**（经 M 沉淀），占位不作数。
  const mSediment = s ? s.mSediment : 0;
  if (!s) missing.push('S（未接 engine 实例）');
  else if (mSediment === 0) missing.push('S（经 M 沉淀的 S ＝ 0：结构账尚无条目——负向侧已接线（2026-10-30），正向侧（+S 闭环成功）入口仍未接）');
  // D：分母侧的扰动 —— dMax 未实现。
  missing.push('D_max（最大扰动量：MULTI_SYSTEM_RULES.dMax 未实现）');
  // H：分母侧的人类 —— 内 H 不可观测；可观测代理（同类 D 重现时取极行为是否变）未接。
  missing.push('H（人类支付量：内 H 不可观测，代理量未接）');

  const verdict = {
    judgeable: false,
    dir: undefined,
    missing,
    reason: missing.length
      ? `M 不可判（缺：${missing.join('；')}）—— 公式外的量（厚度/透支/承担率/覆盖率）**不得顶替**。`
      : 'M 可判方向。',
  };
  // ⚠️ 即便五项齐备，也**只判方向、不赋值**（框架明令）——且方向判据在 nested.mjs，
  //   需外部传入各层定性变化量（-1/0/+1）。
  const delta = opts.delta;
  if (missing.length === 0 && delta && typeof delta === 'object') {
    // 动态引入避免顶层循环依赖（nested.mjs 不 import strata.mjs，安全）。
    // eslint-disable-next-line no-undef
    const mod = globalThis.__WEIWEN_M_DIRECTION__;
    if (typeof mod === 'function') {
      const r = mod({ R: delta.R, S: delta.S, D: delta.D, H: delta.H });
      if (r && r.ok) { verdict.judgeable = true; verdict.dir = r.dir; verdict.reason = `M 方向＝${r.dir}（只判方向，绝不赋值）`; }
      else verdict.reason = `M 方向不可判（${r?.reason ?? 'unknown'}）——这是定性关系的上限，不是缺口。`;
    }
  }
  return verdict;
}


// ════════════════════════════════════════════════════════════════════
// 取值：所有算量集中在此，便于审计（一处定义，一处取证）
// ════════════════════════════════════════════════════════════════════

/** 安全取数组。 */
function arr(x) { return Array.isArray(x) ? x : []; }

/** 安全取数字。 */
function num(x) { return typeof x === 'number' && Number.isFinite(x) ? x : null; }

/** 从 engine 实例抽取原始数据面（只读字段，不调用会改状态的方法）。 */
export function dataSurface(engine) {
  if (!engine) return null;
  const trail = arr(engine.historyTrail);
  const subs = engine.sBySubsystem && typeof engine.sBySubsystem === 'object' ? engine.sBySubsystem : {};
  const store = arr(engine.sAccount && engine.sAccount.rStore);

  const trailEvents = trail.length;
  // 🔴 [2026-10-30 · 覆盖率口径（小D 47 号件第二节）] 修前：trailCoverage = trailEvents / store.length
  //   ⇒ **分子分母不同量纲**（刻痕条数 vs 事件条数）⇒ 比值可 >1（实测 1.28～1.33），
  //   而注释写「<1 说明漏记」⇒ **方向反了**（小D 实测报出这个矛盾，独立复核**成立**）。
  //   修法：分子分母**同量纲** —— 分母＝事件数，分子＝**留了痕的事件数**（trailMarked===true）。
  //   ⚠️ 「哪一笔留了痕」只能由引擎写（recordSteady 同时握两本账）⇒ 本模块**只读不算**，
  //     缺失时（老数据无该标记）如实报 null，**不拿刻痕条数顶替**（那就是病灶本身）。
  //   ⚠️ 已知结构缺口：scar 推导路径（executed ∧ scar）**只进 rStore、不进 historyTrail**
  //     ⇒ 那类事件 trailMarked=false ⇒ 覆盖率会**真的 < 1**（这才是真漏记，不是假读数）。
  const markedEvents = store.filter((r) => r && r.trailMarked === true).length;
  const unmarkedEvents = store.filter((r) => r && r.trailMarked === false).length;
  const coverageKnown = store.length ? store.some((r) => r && r.trailMarked !== null && r.trailMarked !== undefined) : false;
  const trailCoverage = (store.length && coverageKnown) ? markedEvents / store.length : null;
  const positives = trail.filter((e) => e && e.type === 'S+1').length;
  const negatives = trail.filter((e) => e && (e.type === '|S-1|' || e.type === 'trauma')).length;
  const subVals = Object.values(subs).map(num).filter((v) => v !== null);
  // 🔴 sNow 与 engine.effectiveS **同源**（修前此处自己又算了一遍 min(净值) ⇒ 允许负值 ⇒ 与 0.3.5 的
  //   储备读数口径分裂：引擎说 0、这里说 −1）。⇒ 一律取 engine 的读数（含下限 0 与 overdraft）。
  const sNow = typeof engine.effectiveS === 'function' ? engine.effectiveS()
    : (subVals.length ? Math.max(0, Math.min(...subVals)) : 0);
  const sOverdraft = typeof engine.overdraft === 'function' ? engine.overdraft()
    : subVals.reduce((a, v) => a + (v < 0 ? -v : 0), 0);

  const scar = store.filter((r) => r && r.reversible === 'scar').length;
  const unknown = store.filter((r) => r && r.reversible === 'unknown').length;
  const paid = store.filter((r) => r && (r.sign === '+' || r.sign === '-')).length;
  const total = store.length;
  // 🔴 [2026-10-30 · 比率不可加（小D 47 号件第二节）] 小D 实测：hPaymentStandIn + hExemptStandIn = 1.28 > 1，
  //   报「两个互斥桶相加 > 1 ⇒ 分子取自不同的账，分母共用 18」。
  //   独立复核：**现象成立，机理判错**。真相是——两个桶**不是互斥的**，它们是**两个不同维度**：
  //     · paid    ＝ 方向维度（sign ∈ {+,−}）      ⇒ 「这笔有方向吗」
  //     · unknown ＝ 可逆性维度（reversible==='unknown'）⇒ 「这笔的可逆性判不出吗」
  //   同一条记录**可以同时**落在两个桶里（例：sign='-' 且 reversible='unknown'）⇒ 相加 > 1 是**必然**，
  //   不是"分子取自不同的账"，也不是"口径混了"。⇒ 正确表述：**这两个比率不可相加**（维度不同）。
  //   ⇒ 落法：把「维度不同、不可加」摆到读数面上（不改算法：各自口径本身是对的）。
  const ratioAdditivity = {
    note: '🔴 hPaymentStandIn 与 hExemptStandIn **不可相加**：两者是**两个不同维度**——'
      + 'paid＝方向维度（sign∈{+,−}）、unknown＝可逆性维度（reversible===\'unknown\'）；'
      + '同一条记录可同时落在两个桶 ⇒ 和 > 1 是必然，**不是**口径混账。',
    dimensions: { hPaymentStandIn: '方向（sign ∈ {+,−}）', hExemptStandIn: '可逆性（reversible===\'unknown\'）' },
    additive: false,
  };
  // 财务口径：有方向（sign ∈ {+,−}）的刻痕数 ＝ 沉淀（H 付过载重的那些；「有方向」是代理，标注在案）
  const settledThickness = paid;
  // 🔴 [2026-10-29 · 财务/会计分读（小D 41 号件：ΣS 的取数口是"流水"不是"锚点"）]
  //   修前 thickness = store.length（**全部离散事件数**）⇒ 连 sign=unknown 的事件（H 一笔都没付）也涨
  //   「厚度」⇒ **会计账（流水）直接混进了财务账（S）**。安的裁定：「流水账只能算 S 外部暂时挂载的
  //   会计账本；能不能进入 S 这个财务账，需要看 H 有没有支付动作。」
  //   ⇒ 落法＝**两个读数分开摆**（不擅自改「S 的『1』＝一次独立事件」这条框架原文，只把混在一起的两个数分开）：
  //     · settledThickness ＝ **沉淀厚度（财务口径）**＝ 有方向（sign ∈ {+,−}）的刻痕数 ＝ H 付过载重的那些；
  //     · eventCount / thickness ＝ **事件数（会计口径）**＝ 全部离散事件（含 unknown / 中性）——流水。
  //   ⚠️ 距离安的原话还差**一格**：「H 有没有支付」的载体尚未建成（40 号件第三点待判据）⇒ 现在用
  //   「有方向」作代理（sign 有方向 ⇔ 该刻痕有依据的稳态变化），并**如实标注这是代理**。
  // 🔴 [2026-10-29 · 扩容判据改用财务口径（安 10-29 原话；小D 41/43 号件）]
  //   修前 thickness = store.length（**离散事件数**）⇒ 扩容判据（R_EXPANSION）拿**流水**当 ΣS
  //   ⇒ 「没有能量的东西被算进了能量账」。安的原话：「+S ＝ 正向锚点，|−S| ＝ 负向锚点，因此
  //   **正本 S 账本永不会成为负账**；S 需要符合系统的演化结构，而不是流水账」＋「直接分 2 套账：
  //   S 的财务账记结构锚点，S 的会计账记流水计数」。
  //   ⇒ **thickness（对外的 ΣS）＝ 锚点数（财务口径）**；流水计数另立 eventCount。
  //   ⚠️ 与框架原文「S 的『1』＝一次独立事件」的关系：该原文说的是**事件单位**，而 ΣS 在扩容判据里
  //   用的是**结构锚点**（安 43 号件引的原文：财务账记结构锚点）⇒ 两者分属两个账，不再共用一个取数口。
  const thickness = settledThickness;     // 财务口径：结构锚点数（对外的 ΣS）
  // 会计口径别名：全部离散事件（含 unknown / 中性）＝ 流水
  const eventCount = total;

  // 落点集中度 ＝ **最大簇占比**（0–1），不是"总数/落点数"。
  //   后者在只有一个落点时会随事件数一路增长，量的是"发生了多少"而非"聚得多紧"。
  const domains = new Map();
  for (const r of store) {
    const ds = arr(r && r.rDomains);
    const k = ds.length ? ds.join('|') : '∅';
    domains.set(k, (domains.get(k) || 0) + 1);
  }
  const maxCluster = domains.size ? Math.max(...domains.values()) : 0;
  const concentration = total ? maxCluster / total : null;

  // ═══ 只读差分观测面（2026-10-29 · 安 10-29 裁「先看数、不急着立判据」）═══
  // 🔴 为什么是只读：安 10-29 的裁定——「同类 D 重现差分」这个观测面**先做只读版**（只统计、不进账、
  //   不改判定），让小D 那边跑一跑看它长什么样；「先看数、不急着立判据，免得又拍脑袋」。
  //   ⇒ 本段**只产出读数**：不进 sLedger、不改 verdict、不影响任何 pre-execute 路径。
  //
  // 真身的 Y 侧定义（law.mjs `R_EXPANSION.qualification` 原文）：
  //   「反哺资格 ＝ 量(ΣS > R₀) ∧ 质(**经 M 反馈沉淀的 S**，走完 D→H→M→顺痕回读一轮)」
  //   ⇒ **结构锚点 ＝ 经 M 反馈沉淀的 S**。载体：**historyTrail 里的 `S+1`**（那是唯一的正向沉淀刻痕）。
  //   ⇒ 当前 `S+1` 几乎不产生（0.3.8 之前明写「不再记 positive」）⇒ **+S 入口空着的真因不是口径，
  //     是「闭环成功」没接进记账**。
  const mTrail = arr(engine.historyTrail);   // 🔴 变量名不与既有 trail（historyTrail 聚合）撞
  // 「经 M 沉淀的 S」计数 ＝ **结构账条目数**（真身；2026-10-30 口径更新——小D 49/51 号件）：
  //   结构账（engine.sStructLedger）同类只记一条、条目＝判据形状（安 10-30 原话）。
  //   historyTrail 的 S+1 计数保留为旧口径 fallback（引擎无结构账时的兼容读法）。
  const mSediment = Number.isFinite(engine?.sStructLedger?.size)
    ? engine.sStructLedger.size
    : mTrail.filter((e) => e && e.type === 'S+1').length;
  // 🔴 [2026-10-30 · 接线声明演进（原 sedimentStall；小D 48 号件第四节 → 49/51 号件）]
  //   0.5.0 时负/正两侧都没接 ⇒ 报「停摆」。本版**负向侧已接线**（拦截/被拒/失败/不可逆消耗
  //   ⇒ recordStructural），正向侧（+S 闭环成功）仍未接（无实例反馈，不擅自接）。
  //   ⇒ 分报两态，不假装全接：structuralWiring.negative=true / positive=false；
  //     停摆语义收窄到**正向侧**（正向沉淀停摆 ≠ 全停摆）。
  const negativeWired = Number.isFinite(engine?.sStructLedger?.size);
  const sedimentWired = engine?.mSedimentWired === true;
  const sedimentStall = {
    // 停摆 ＝ 结构账在引擎里不存在（负向侧也没接）。正向侧未接**不算停摆**——它由
    // positiveWired:false 如实分报（+S 无入口是已知缺口，不是静默异常）。
    stalled: !negativeWired,
    reason: negativeWired
      ? '负向侧已接线（2026-10-30）：拦截/被拒/失败/不可逆消耗 ⇒ 结构账条目。正向侧（+S 闭环成功）仍未接——正向沉淀如需真身，待实例反馈后接线。'
      : '🔴 沉淀步**停摆**：结构账在引擎里不存在 ⇒ 「经 M 反馈沉淀」这条线没有产生入口 ⇒ sMSediment 是**静默的 0**。按 unknown ≠ 零 ⇒ 停摆时不得读作零。',
    wired: negativeWired,
    negativeWired,
    positiveWired: sedimentWired,
  };
  // 同类差分：按 (subsystem, topic) 分组，比较**首次**与**最近一次**的刻痕方向。
  //   🔴 「同类」＝ 同 topic（topic 是同类事件的判别键，见 law.mjs S 时间周期模型）⇒ 不是词形枚举。
  //   「差分」＝ 同类事件的走向是否变了（失败 → 成功 ＝ 路径被改变 ＝ 结构锚点的候选形态）。
  //   ⚠️ 这**只是观测**：差分大 ≠ 就是结构锚点；真身要等 Y 侧判据落定（当前只有 law.mjs 的定义，
  //     取数口未落 ⇒ 本数仅供看形态，不进判定）。
  const byClass = new Map();
  for (const e of mTrail) {
    if (!e) continue;
    const key = `${e.subsystem ?? 'core'}::${e.topic ?? '∅'}`;
    if (!byClass.has(key)) byClass.set(key, []);
    byClass.get(key).push(e);
  }
  const classDiff = [];
  for (const [key, list] of byClass) {
    const ordered = list.slice().sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    const signOf = (e) => (e.type === 'S+1' ? '+' : (e.type === 'trauma' ? 'trauma' : (e.type === '|S-1|' ? '-' : '0')));
    const fs = signOf(first);
    const ls = signOf(last);
    classDiff.push({
      class: key,
      marks: ordered.length,
      firstSign: fs,
      lastSign: ls,
      changed: fs !== ls,                                   // 同类走向变了（差分的最小形态）
      settled: ordered.some((e) => e.type === 'S+1'),      // 该类出现过「经 M 沉淀的 S」
      lastTs: last.ts ?? null,
    });
  }
  const classDiffSummary = {
    classes: classDiff.length,
    changed: classDiff.filter((c) => c.changed).length,       // 走向变过的同类数（差分命中）
    settled: classDiff.filter((c) => c.settled).length,       // 出现过正向沉淀的同类数
    entries: classDiff,
  };

  return {
    thickness, settledThickness, eventCount, trailEvents, trailCoverage, positives, negatives, sNow, sOverdraft,
    markedEvents, unmarkedEvents, coverageKnown,
    ratioAdditivity,
    // 🔴 [2026-10-30 · 三本账同源（小D 47 号件第二节）] 小D 实测：一笔失败让 **thickness +1 / trauma +1 /
    //   overdraft +1** 三处同时涨 ⇒ 拿任何一个当"成本量"都会**三倍高估**。
    //   独立复核**成立**（我实测：一次 onFailure(1) ⇒ thickness Δ1 / trauma Δ1 / overdraft Δ1，
    //   而 rStore 只 +1 条、trail 只 +2 条刻痕）⇒ **它们不是三笔成本，是同一笔事件的三种表述**。
    //   ⇒ 本面显式给出**同源关系**，让读数的人不会把它们当成可相加的三笔。
    //   ⚠️ 这不改变任何一个量的算法（各有各的维度：厚度＝事件数 / trauma＝创伤事件数 / overdraft＝金额），
    //     只把「同源、不可相加当成本量」这件事摆到读数面上。
    sameEventViews: {
      note: '🔴 thickness / trauma / overdraft 是**同一笔事件的三种表述**，不是三笔成本 ⇒ 相加即三倍高估。'
        + '（各自维度：厚度＝有方向事件数；trauma＝创伤事件数；overdraft＝欠账金额）',
      views: ['thickness', 'trauma', 'sOverdraft'],
      source: '同一笔 recordSteady 调用（引擎侧唯一收口）',
      additive: false,
    },
    mSediment, classDiff: classDiffSummary,
    sedimentStall,
    traumaCount: num(engine.traumaCount) ?? 0,
    scar, unknown, paid, total, concentration, maxCluster,
    distinctDomains: domains.size,
    // ── R 层分母面（2026-10-20 新增）──────────────────────────────
    //  domainKey：当前账本落在哪个域（决定用哪条 p_max）
    //  nOpp     ：总运行机会数。engine 目前**没有**这个字段 ⇒ 恒为 null ⇒ ABSENT。
    //             ⚠️ 绝不回填成 store.length —— 那正是退化守卫要拦的同义反复。
    domainKey: typeof engine.domainKey === 'string' ? engine.domainKey : 'unspecified',
    nOpp: num(engine.nOpportunities),
  };
}

/** 计算单个量。返回 { status, value, evidence } —— **状态必须显式**。 */
export function compute(key, surface) {
  const s = surface;
  switch (key) {
    case 'sHistoryThickness': return s ? { status: QSTAT.OK, value: s.thickness } : { status: QSTAT.PENDING, value: null, evidence: '未接 engine 实例' };
    case 'sThicknessStandIn': return s ? { status: QSTAT.OK, value: s.settledThickness } : { status: QSTAT.PENDING, value: null, evidence: '未接 engine 实例' };
    case 'sMSediment': return s ? { status: QSTAT.OK, value: s.mSediment } : { status: QSTAT.PENDING, value: null, evidence: '未接 engine 实例' };
    case 'sClassDiff': return s ? { status: QSTAT.OK, value: s.classDiff } : { status: QSTAT.PENDING, value: null, evidence: '未接 engine 实例' };
    case 'sEventCount': return s ? { status: QSTAT.OK, value: s.eventCount } : { status: QSTAT.PENDING, value: null, evidence: '未接 engine 实例' };
    case 'sOverdraft': return s ? { status: QSTAT.OK, value: s.sOverdraft } : { status: QSTAT.PENDING, value: null, evidence: '未接 engine 实例' };
    case 'sNow': return s ? { status: QSTAT.OK, value: s.sNow } : { status: QSTAT.PENDING, value: null, evidence: '未接 engine 实例' };
    case 'sPositive': return s ? { status: QSTAT.OK, value: s.positives } : { status: QSTAT.PENDING, value: null, evidence: '未接 engine 实例' };
    case 'sNegative': return s ? { status: QSTAT.OK, value: s.negatives } : { status: QSTAT.PENDING, value: null, evidence: '未接 engine 实例' };
    case 'sTrauma': return s ? { status: QSTAT.OK, value: s.traumaCount } : { status: QSTAT.PENDING, value: null, evidence: '未接 engine 实例' };
    case 'sTrailCoverage': return s ? { status: QSTAT.OK, value: s.trailCoverage } : { status: QSTAT.PENDING, value: null, evidence: '未接 engine 实例' };
    case 'dScarRate': return s && s.total ? { status: QSTAT.OK, value: s.scar / s.total } : { status: QSTAT.PENDING, value: null, evidence: '账本为空或无实例' };
    case 'dUnknownRate': return s && s.total ? { status: QSTAT.OK, value: s.unknown / s.total } : { status: QSTAT.PENDING, value: null, evidence: '账本为空或无实例' };
    case 'hPaymentStandIn': return s && s.total ? { status: QSTAT.OK, value: s.paid / s.total } : { status: QSTAT.PENDING, value: null, evidence: '账本为空或无实例' };
    case 'hPaymentRate': return s && s.total ? { status: QSTAT.OK, value: s.paid / s.total } : { status: QSTAT.PENDING, value: null, evidence: '账本为空或无实例' };
    case 'hExemptStandIn': return s && s.total ? { status: QSTAT.OK, value: s.unknown / s.total } : { status: QSTAT.PENDING, value: null, evidence: '账本为空或无实例' };
    case 'hExemptRate': return s && s.total ? { status: QSTAT.OK, value: s.unknown / s.total } : { status: QSTAT.PENDING, value: null, evidence: '账本为空或无实例' };
    case 'mConcentration': return s ? { status: QSTAT.OK, value: s.concentration } : { status: QSTAT.PENDING, value: null, evidence: '未接 engine 实例' };
    // ── R 层：域常数 / 分母 / 路由（2026-10-20 重写）────────────────
    //  🔴 上一轮这三格只有一条 `rNaught → PENDING('TBD@…capacity')`，
    //     既引用了不存在的字段，也把「没查」冒充成「查不到」。现拆成三格：
    //       p_max  → OK      （域表里有值有源）
    //       N_opp  → ABSENT  （engine 真缺这个量）
    //       R₀     → PENDING （= p×N，缺分母）
    //     三格的状态各不相同，这才是实情。合并成一条会把「缺分母」写成「缺常数」。
    case 'rCapPMax': {
      const e = R_CAPACITY[s ? s.domainKey : 'unspecified'] ?? R_CAPACITY.unspecified;
      const has = e && e.value !== null && e.value !== undefined;
      return has
        ? { status: QSTAT.OK, value: e.value, evidence: `${e.kind}｜${e.unit}｜${e.source}（${e.verified}）` }
        : { status: QSTAT.PENDING, value: null, evidence: `该域为 ${e ? e.kind : 'unknown'} 类，无数值：${e ? e.source : '域表无此键'}` };
    }
    //  🔴 两档必须各带各的 evidence：接上分母后若仍挂着「真缺口」的注解，
    //     就是「状态对了、注解还是旧的」——形态上是「真的真话·半真」（核得出真 ⇒ 零告警）。
    case 'nOpportunities':
      return s && s.nOpp !== null
        ? { status: QSTAT.OK, value: s.nOpp, evidence: 'engine.nOpportunities 已供给。⚠️ 须同时声明口径（飞行小时／输注次数／调用次数），否则分母与 ΣS 可能量的不是同一件事。' }
        : { status: QSTAT.ABSENT, value: null, evidence: 'engine 无 nOpportunities 字段：只记偏离事件数，不记总机会数' };
    case 'rCapRoute': {
      const e = R_CAPACITY[s ? s.domainKey : 'unspecified'] ?? R_CAPACITY.unspecified;
      return { status: QSTAT.OK, value: rCapRoute(e ? e.kind : null, 'count'), evidence: `域 ${s ? s.domainKey : 'unspecified'} ⇒ kind=${e ? e.kind : 'unknown'}` };
    }
    case 'rNaught': {
      const key = s ? s.domainKey : 'unspecified';
      const e = R_CAPACITY[key] ?? R_CAPACITY.unspecified;
      const nOpp = s ? s.nOpp : null;
      // 退化守卫：N_opp 若等于 ΣS，换算出来的阈值会让判据恒真
      if (nOpp !== null && s && isDegenerateDenominator(nOpp, s.thickness)) {
        return { status: QSTAT.PENDING, value: null, evidence: '拒绝：N_opp === ΣS（同义反复，ΣS > p×ΣS 对 p<1 恒真）' };
      }
      const r = expandThreshold(e, nOpp);
      if (!r.ok) {
        const route = rCapRoute(e ? e.kind : null, 'count');
        return { status: QSTAT.PENDING, value: null, evidence: `${r.reason}｜${r.detail}｜route=${route.route}：${route.why}` };
      }
      return { status: QSTAT.OK, value: r.r0, evidence: r.detail };
    }
    case 'mDirection': return { status: QSTAT.PENDING, value: null, evidence: 'TBD@两窗切分口径（只定方向，永不写容差）' };
    case 'mForwardWired': return { status: QSTAT.ABSENT, value: null, evidence: 'FORWARD_INFERENCE 零接线' };
    case 'dMax': return { status: QSTAT.ABSENT, value: null, evidence: 'MULTI_SYSTEM_RULES.dMax 未实现' };
    case 'sQualified': return s ? { status: QSTAT.OK, value: s.paid > 0 && s.total > 0 } : { status: QSTAT.PENDING, value: null, evidence: '未接 engine 实例' };
    default: return { status: QSTAT.PENDING, value: null, evidence: `未定义取值器：${key}` };
  }
}

// ════════════════════════════════════════════════════════════════════
// 对外：逐层读数
// ════════════════════════════════════════════════════════════════════
export function strataReadout(engine = null) {
  const surface = dataSurface(engine);
  const layers = STRATA.map((st) => {
    const qs = st.quantities.map((q) => ({ ...q, ...compute(q.key, surface) }));
    const ok = qs.filter((q) => q.status === QSTAT.OK).length;
    return {
      layer: st.layer, name: st.name, criterion: st.criterion, formula: st.formula,
      quantities: qs,
      count: { ok, pending: qs.filter((q) => q.status === QSTAT.PENDING).length, absent: qs.filter((q) => q.status === QSTAT.ABSENT).length, total: qs.length },
      stopAt: st.stopAt,
    };
  });
  // ═══ 准入诊断（元判据的可执行形态 · 2026-10-29）═══
  // 🔴 安 10-29 定：「唯稳律里没有一个变量是拍脑袋来的」＋手稿图2「Y 每个点为 S 是规则 / X 每个点为 D 是数据」
  //   ⇒ 每个读数字段必须能指回 **Y 侧的一条规则**（= 有 yOrigin）；指不回的 ⇒ 它只能是**占位**
  //   （= placeholder:true，且**名字必须自带占位标记**），**且不得进判定**。
  //   ⚠️ 为什么做成**读数面诊断**而不是硬拒绝注册：与 readout.mjs 同一原则——「元认知只能读，不能管」；
  //     硬拒绝会把存量字段一次性判红（不可回放）。⇒ 缺口**摆到读数面上**，让「哪些是拍脑袋的」当场可见。
  //   ⇒ 配套纪律（可测）：**占位字段名必须自带占位标记**（stand-in / slot / 占位）⇒ 由测试锁。
  const allQs = layers.flatMap((l) => l.quantities);
  const PLACEHOLDER_MARK = /(stand[-_ ]?in|slot|占位|替身)/i;
  const unbacked = allQs.filter((q) => !q.placeholder && !(q.yOrigin && String(q.yOrigin).trim()))
    .map((q) => q.key);
  const placeholders = allQs.filter((q) => q.placeholder && !q.alias).map((q) => ({
    key: q.key,
    markedInName: PLACEHOLDER_MARK.test(q.key),
    yOrigin: q.yOrigin ?? null,
  }));
  const placeholderWithoutMark = placeholders.filter((p) => !p.markedInName).map((p) => p.key);
  const aliases = allQs.filter((q) => q.alias).map((q) => q.key);   // 旧名兼容通道（不算占位本体）
  // ═══ 判据来源闸的诊断面（小D 47 号件第五节 · 2026-10-30）═══
  // 🔴 规则：**判据只允许用公式里的五个量（R/S/D/H/M）；公式外的量只能观测，不得进判定。**
  //   这是 0.4.0 元判据的**另一半补全**：那条只管住「占位」，这条管住「公式外的量」。
  //   ⇒ 读数面上当场可见：哪些量被标成了判据源、而它其实在公式外（或它是占位/别名）。
  //   ⚠️ 只读面（与本模块同性质：「元认知只能读，不能管」）——它**不产生 allow/deny/review**，
  //     只把违规显式化。真正的收口在**判据侧**：判据不得引用这些量。
  const sourceGate = allQs.map((q) => {
    const verdict = judgeCriterionSource(q.key, {
      placeholder: !!q.placeholder, alias: !!q.alias, declared: q.criterionSource ?? null,
    });
    return {
      key: q.key,
      declared: q.criterionSource ?? null,     // 声明的判据来源层（R/S/D/H/M）
      inFormula: FORMULA_VARS.includes(String(q.criterionSource ?? '').toUpperCase()),
      placeholder: !!q.placeholder,
      alias: !!q.alias,
      verdict: verdict.status,
      reason: verdict.reason,
      note: q.criterionSourceNote ?? null,
    };
  });
  // 🔴 闸门**可重算**（不是一次性算死的清单）：判定源在 declared 字段 ⇒ 改声明层，判定必须跟着变。
  //   为什么需要可重算：诊断面若只能"看不能改"，就没法验证它**真的在判**（变异测试会红不了）。
  const recomputeGate = (overrides = {}) => allQs.map((q) => {
    const declared = Object.prototype.hasOwnProperty.call(overrides, q.key)
      ? overrides[q.key] : (q.criterionSource ?? null);
    const v = judgeCriterionSource(q.key, {
      placeholder: !!q.placeholder, alias: !!q.alias, declared,
    });
    return {
      key: q.key, declared,
      inFormula: FORMULA_VARS.includes(String(declared ?? '').toUpperCase()),
      placeholder: !!q.placeholder, alias: !!q.alias,
      verdict: v.status, reason: v.reason, note: q.criterionSourceNote ?? null,
    };
  });
  const gateViolations = sourceGate.filter((g) => g.verdict === SOURCE_GATE.OFF_FORMULA);
  return {
    layers,
    // 准入诊断面：拍脑袋的变量当场可见（不是注释里的自觉，是读数面上的清单）
    provenance: {
      unbacked,                                   // 既无 Y 出处、又未标占位 ⇒ 拍脑袋的变量（应为空）
      placeholders,                               // 占位字段清单（含「名字是否自带占位标记」）
      placeholderWithoutMark,                     // 占位却没在名字里带标记 ⇒ 违反命名纪律
      aliases,                                    // 旧名兼容别名清单（保留是为了不切断对照链）
      rule: '每个读数字段须有 yOrigin（Y 侧规则出处）；无出处 ⇒ 只能是占位（名字自带 stand-in/slot/占位 标记）且不得进判定。',
    },
    // 🔴 判据来源闸（小D 47 号件第五节）：判据只允许用公式五个量；公式外的量只能观测。
    sourceGate: {
      rule: '判据只允许用公式里的五个量（R/S/D/H/M）；公式外的量只能观测，不得进判定。',
      formVars: [...FORMULA_VARS],
      violations: gateViolations,                 // 声明为判据源、却越界的量
      clean: gateViolations.length === 0,
      entries: sourceGate,
      // 🔴 可重算：传 {字段名: 新声明层} ⇒ 返回重算后的闸门判定（供变异自检；不改变任何状态）。
      recompute: (overrides) => {
        const rs = recomputeGate(overrides ?? {});
        return { entries: rs, violations: rs.filter((g) => g.verdict === SOURCE_GATE.OFF_FORMULA) };
      },
      note: '⚠️ 本面**只读**：它不产生 allow/deny/review（与本模块同原则：元认知只能读，不能管）。'
        + '它的作用是**把违规显式化**——谁被标成判据源、而它其实在公式外（或它是占位/旧名别名），当场可见。',
    },
    bans: SUBSTITUTION_BAN,
    domain: {
      key: surface ? surface.domainKey : null,
      pMax: R_CAPACITY[surface ? surface.domainKey : 'unspecified'] ?? null,
      nOpp: surface ? surface.nOpp : null,
    },
    // 域表体检：把「非法条目」与「标准合法地不给数」分开记账。
    //   malformed ≠ no_num_legal —— 前者是我的错，后者是域的性质，不是欠账。
    rcap: rCapAudit(),
    summary: {
      可算: layers.reduce((a, l) => a + l.count.ok, 0),
      待取证: layers.reduce((a, l) => a + l.count.pending, 0),
      未实现: layers.reduce((a, l) => a + l.count.absent, 0),
      engineAttached: !!surface,
    },
  };
}
