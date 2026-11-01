// ⚠️ 本文件由 scripts/build-docs-engine.mjs 生成，请勿手改。
// 源：src/core/readout.mjs ｜ 改源码后运行 npm run build:docs
// 一致性由 test/docs-engine-sync.test.mjs 断言（手工镜像必漂移，故不靠人眼对账）。
// 读数层（readout）· 只读，不接判决路径
// ════════════════════════════════════════════════════════════════════
// 病灶（2026-10-20 实测）：
//   law.mjs 导出 27 条判据，其中 10 条自带 `boundary` / `placement` 字段，明文写着
//   「本常量 ＝ 判据形态声明，**非引擎运行期判据位，不改变放行 / 拦截逻辑**」。
//   ⇒ 它们没被引用 **不是漏接，是设计如此**。
//   但「设计如此」此前只写在字段里，**没有任何机械位置承载它** ⇒ 全部显示为"零引用"，
//   与真缺口（`R_EXPANSION`：engine 里 grep「扩容」零命中）混在同一堆里，无法区分。
//
// 本条通路的设计原则（防"越修越严"，见 docs/runway-and-criterion §四）：
//   **元认知只能「读」，不能「管」。** 本模块不 import engine、不改任何判决、
//   不参与 pre-execute / post-execute；只回答三个问题：
//     ① 库里有哪几条判据？
//     ② 每条该走哪条路（判决 / 读数 / 声明 / 未定）？
//     ③ 三时相（过去·现在·未来）各接没接？
//
// ⚠️ 本模块**不得使用 node 内置模块** —— `docs/engine` 镜像给浏览器加载，
//   凡引入 `node:fs` 等会使 `browserUnsafeImports` 判红（见 test/docs-engine-sync）。

// 四种归属。刻意留 `unmapped` 一档：**分不出就写分不出，不假装分类是客观的。**
export const SLOT = {
  JUDGE: 'judge',       // 进判决 / 计算路径，应当被代码引用
  READOUT: 'readout',   // 二级读数：只呈现，不改判决（本模块承载）
  DECLARE: 'declare',   // 声明 / 标注位：本就不该进代码路径
  UNMAPPED: 'unmapped', // 归属未定 ⇒ 待判清单（不是通过，是欠账）
};

// ════════════════════════════════════════════════════════════════════
// 判据登记表 —— 27 条，逐条给出「该走哪条路」
//
// 登记纪律：
//   · `gap` 非空 ＝ **该接却没接**，必须显式登记（不许静默）；
//   · `slot: unmapped` ＝ 判不出归属，列出待判，**不视为通过**；
//   · `selfDeclared` ＝ 该常量自带 boundary / placement 自声明（由 law.mjs 实测得来，非人工填）。
// ════════════════════════════════════════════════════════════════════
export const CRITERION_REGISTRY = {
  // ── 判决 / 计算位 ──────────────────────────────────────────────
  RSDHM: {
    slot: SLOT.JUDGE,
    role: '链定义：R→S→D→H→M 及各节点意义',
  },
  R_DOMAIN: {
    slot: SLOT.JUDGE,
    role: 'R 域刚性锚点层级（供 magnitude / 破窗权重 / 上溯链取用）',
  },
  THREE_IRON_LAWS: {
    slot: SLOT.JUDGE,
    role: '三大铁律（白箱工具返回，不可变）',
  },
  CONDUCTION_CHAIN: {
    slot: SLOT.JUDGE,
    role: '因果逻辑链序 R→S→D→H→M（不可跳跃、不可逆序）',
    gap: 'engine.mjs:1753 硬编码 `const ORDER = [\'R\',\'S\',\'D\',\'H\',\'M\']` 自行排序，**未引用本常量** ⇒ 链序有两份定义；law.mjs 侧改动不会同步到引擎（重造，非缺口）。',
  },
  FRACTAL_PROPERTY: {
    slot: SLOT.JUDGE,
    role: '分形属性：横向递归 ＋ 纵向跃迁',
    gap: '只实现横向递归；**纵向跃迁（S 反哺 R）零实现** —— 见 R_EXPANSION.gap',
  },
  S_REFINEMENT: {
    slot: SLOT.JUDGE,
    role: 'S 细化：S±1 双路径、创伤刻痕、木桶效应',
    gap: 'engine 内部硬编码字符串 \'S+1\' / \'|S-1|\' / \'trauma\' 自行实现，**未引用本常量** ⇒ 同一语义两处各写一遍（重造，非缺口）',
  },
  R_EXPANSION: {
    slot: SLOT.JUDGE,
    role: 'R 扩容：ΣS > R₀（严格大于）才触发子链扩容；含反哺资格（量 ∧ 质）',
    gap: '🔴 **真缺口**：engine.mjs 内 grep「扩容」「ΣS」**零命中**；本常量唯一引用是 engine.mjs:386 的**注释**。S 反哺 R 的纵向跃迁在实现层不存在 ⇒ 分形只有横向。',
  },

  // ── 二级读数位（本模块承载） ────────────────────────────────────
  CALIBRATION: {
    slot: SLOT.READOUT,
    role: '逻辑反推：沿 R 包含层级逐层反溯（症状层→子链 R→母链 R→客观规则层）',
    selfDeclared: false,
    gap: 'bugstop 实现了「反推→溯源→修复」流程与 `traced` 标记，但**未沿 R_DOMAIN.hierarchy 逐层反溯**（bugstop 内 grep R_DOMAIN 零命中）⇒ 记的是"溯过"，不是"溯到哪一层"。半接。',
  },
  FORWARD_INFERENCE: {
    slot: SLOT.READOUT,
    role: '前向推演：沿 Y 轴推、不沿 X 轴推；终止条件＝收敛度',
    selfDeclared: true,
  },
  CONVERGENCE: {
    slot: SLOT.READOUT,
    role: '收敛度：新增观测 ⇒ 落点是否收紧（推演真伪的当下判据）',
    selfDeclared: true,
  },
  M_TWO_TENSES: {
    slot: SLOT.READOUT,
    role: 'M 的两个时态：追溯 M（过去）／未来 M（前瞻校准）',
    selfDeclared: true,
  },
  REASON_LANDING: {
    slot: SLOT.READOUT,
    role: '理由层判分：这条理由能不能把链推到下一格（落 M）',
    selfDeclared: true,
  },
  REVIEW_BOUNDARY: {
    slot: SLOT.READOUT,
    role: 'review 边界：链厚可审 / 链源不可审',
    selfDeclared: true,
  },
  S_TIME_MODEL: {
    slot: SLOT.READOUT,
    role: 'S 时间属性：同类只调用最新版、旧版静默待机（sStandby）、累加成 +N/-N',
    gap: 'engine 已实现 `_coalesce` / `sStandby`（行为对），但**未引用本常量** ⇒ 重造，非缺口',
  },

  // ── 声明 / 标注位（本就不该进代码路径） ─────────────────────────
  SIGNIFICANCE_TABLE: {
    slot: SLOT.DECLARE,
    role: '五节点意义总览（标注位，自述"非判据位、非匹配名单"）',
    selfDeclared: true,
  },
  CLASS_BEFORE_MEASURE: {
    slot: SLOT.DECLARE,
    role: '测/比/判之前先过分类关（恒定项 vs 变量项）',
    selfDeclared: true,
  },
  H_ENERGY_POSITION: {
    slot: SLOT.DECLARE,
    role: 'H 的能量学定位（内 H 不可侵的根据：换根＋推导）',
    selfDeclared: true,
  },
  FALLBACK_MODE: {
    slot: SLOT.DECLARE,
    role: '兜底机制定位（唯稳律非拟合的常态替代）',
    selfDeclared: true,
  },
  EXISTENCE_NOT_QUANTITATIVE: {
    slot: SLOT.DECLARE,
    role: '存在性 ≠ 定量（溯源器非预测器）',
    selfDeclared: true,
  },
  FRAMEWORK_BOUNDARIES: {
    slot: SLOT.DECLARE,
    role: '框架核心边界（被动触发 / 预测不决策 / 责任隔离…）',
  },
  BOUNDARY_ENUM: {
    slot: SLOT.DECLARE,
    role: '判定结论落点的分类枚举',
  },
  FRACTAL_METHOD: {
    slot: SLOT.DECLARE,
    role: '分形推导方法（具体事件具体分析）',
  },
  THREE_CORE_RULES: {
    slot: SLOT.DECLARE,
    role: '三大核心运行规则（与铁律②同构的表述）',
  },
  DIALECTICAL_UNITY: {
    slot: SLOT.DECLARE,
    role: '辩证统一原则',
  },
  FEEDBACK_LOOP: {
    slot: SLOT.DECLARE,
    role: 'M 经 H₀ 分流的回流路径（说明性；engine 侧有对应注释指路）',
    gap: 'engine 只以注释指路（engine.mjs:1102），**无回流计算**。若日后要做，须先定它是计算位还是说明位 —— 现在按说明位登记。',
  },

  // ── 归属未定（待判清单，不视为通过） ───────────────────────────
  MULTI_SYSTEM_RULES: {
    slot: SLOT.UNMAPPED,
    role: '多系统交互：S 取 min / D 取 max / 只通过 D 间接影响',
    note: '`sMin` 在 `effectiveS()`（Math.min）里**有实现但未引用常量**；`dMax` 未核。判它是"计算位"还是"说明位"需先定多系统是否在引擎语义内。',
  },
  SD_GAME: {
    slot: SLOT.UNMAPPED,
    role: 'S-D 博弈：H 在 S 与 D 之间动态滑动',
    note: '描述 H 的选择空间，非引擎可算量；但也非纯声明。归位取决于「H 的选择要不要在读数层呈现」这一决定。',
  },
};

// ════════════════════════════════════════════════════════════════════
// 静态读数（不依赖 engine 实例）
// ════════════════════════════════════════════════════════════════════

/** 库内全部判据名（来自登记表）。用于自检与呈现。 */
export function registeredNames() {
  return Object.keys(CRITERION_REGISTRY);
}

/** 按归属分档计数 ＋ 列出各档成员。 */
export function slotStats() {
  const out = { [SLOT.JUDGE]: [], [SLOT.READOUT]: [], [SLOT.DECLARE]: [], [SLOT.UNMAPPED]: [] };
  for (const [name, meta] of Object.entries(CRITERION_REGISTRY)) {
    (out[meta.slot] ?? (out[meta.slot] = [])).push(name);
  }
  const count = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length]));
  return { count, members: out, total: registeredNames().length };
}

/** 该接却没接的登记项（`gap` 非空且归属为 judge / readout）。 */
export function declaredGaps() {
  return Object.entries(CRITERION_REGISTRY)
    .filter(([, m]) => m.gap && (m.slot === SLOT.JUDGE || m.slot === SLOT.READOUT))
    .map(([name, m]) => ({ name, slot: m.slot, gap: m.gap }));
}

/** 归属未定的判据（待判清单）。 */
export function unmapped() {
  return Object.entries(CRITERION_REGISTRY)
    .filter(([, m]) => m.slot === SLOT.UNMAPPED)
    .map(([name, m]) => ({ name, role: m.role, note: m.note }));
}

// ════════════════════════════════════════════════════════════════════
// 三时相读数：过去 / 现在 / 未来
//
// 判据（安 2026-10-19）：因果律完整链＝过去·现在·未来。
// ⇒ 三格各自「接没接」本身就是一个读数 —— 缺的那一格就是下一步的待办，
//   而不是等有人想起来才去查。
// ════════════════════════════════════════════════════════════════════

/**
 * 三时相读数。
 * @param {object|null} engine 可选的引擎实例。**只调用其公开只读方法**（snapshot / effectiveS），
 *                             不写状态、不推导、不改判决。不传则只报"层是否接线"。
 */
export function phaseReadout(engine = null) {
  const hasEngine = !!engine && typeof engine.snapshot === 'function';
  let snap = null;
  if (hasEngine) {
    try { snap = engine.snapshot(); } catch { snap = null; }
  }

  const phases = [
    {
      phase: '过去',
      wired: 'partial',
      carriers: ['CALIBRATION', 'S_TIME_MODEL', 'REVIEW_BOUNDARY'],
      evidence: hasEngine && snap
        ? {
          历史刻痕: snap.traumaCount ?? null,
          静默待机旧版本数: snap.standbySize ?? null,
          S刻痕总数: snap.sAccountSize ?? null,
        }
        : null,
      gap: 'bugstop 记 `traced` 标记，但未沿 R_DOMAIN.hierarchy 逐层反溯 ⇒ 记的是「溯过」，不是「溯到哪一层」',
    },
    {
      phase: '现在',
      wired: 'full',
      carriers: ['RSDHM', 'R_DOMAIN', 'THREE_IRON_LAWS', 'CONDUCTION_CHAIN'],
      evidence: hasEngine && snap
        ? { 有效S: snap.effectiveS ?? null, 活动台账: snap.ledgerSize ?? null }
        : null,
      gap: null,
    },
    {
      phase: '未来',
      wired: 'none',
      carriers: ['FORWARD_INFERENCE', 'CONVERGENCE', 'M_TWO_TENSES'],
      evidence: null,
      gap: '🔴 零接线：无前向推演输出面、无校准点登记。判据已在库（且自带完整终止条件），通路未开',
    },
  ];

  return {
    engineAttached: hasEngine,
    phases,
    summary: {
      全接: phases.filter((p) => p.wired === 'full').length,
      半接: phases.filter((p) => p.wired === 'partial').length,
      零接: phases.filter((p) => p.wired === 'none').length,
    },
  };
}

/**
 * 未来格的判断问句（**读数，非判决**）。
 * 只把库里的判据问句取出来供自查，不产生任何 verdict。
 */
export function askForward() {
  const fi = CRITERION_REGISTRY.FORWARD_INFERENCE;
  return {
    question: '这次推演是沿 X 轴（事件 / 何时 / 多少）还是沿 Y 轴（方向 / 类别差 / 收敛性）展开？',
    deathTrap: '沿时间维度展开 ＝ 真无限 ＝ 无终止条件',
    termination: '推到「落点是否收束到同一 R」即停：收敛 ⇒ R 显形；不收敛 ⇒ 判非链。两种都停。',
    placement: 'readout-only —— 不得作放行 / 拦截开关',
    registrySlot: fi.slot,
  };
}

/** 一次性总览：供工具面 / 自检调用。 */
export function readout(engine = null) {
  return {
    registry: slotStats(),
    gaps: declaredGaps(),
    unmapped: unmapped(),
    phases: phaseReadout(engine),
  };
}
