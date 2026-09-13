// S/D 量化效应融合传感器（适配层，禁区外）
//
// 【取其精华 · 保留】
//   1. Cross-fitting DML 伪结果 ψ —— 动作对系统稳态 S / 止损 D 的因果效应估计（最稳路径）。
//   2. Uplift / Qini 排序 —— 哪些动作更侵蚀 S（按 |ψ| 降序）。
//   3. IPW / DR 策略价值 V(π) —— 策略对稳态储备 S 的收益估计。
// 【去其糟粕 · 丢弃】
//   1. 盲目默认 unconfoundedness → 改为「可识别性前置」：不满足即交 M review。
//   2. Replay Simulator 子集有偏 → 不采纳。
//   3. 估计器当裁决权威 → 引擎始终是最终裁决者；传感器是单向升级闸门：仅 allow→review，
//      禁止 review/deny→allow（fail-safe 加严），绝不反向放宽。
//
// 纪律：本传感器可达集={S,D}（量化赋值），不可达集={R,H,M}。
//   本模块只在 S/D 做叶子层「加叶」，不碰 R/H/M，不修改 engine.mjs。
//   真实训练权重归闭源量化引擎；此处是结构化方法接线（接线即精华，权重非此处）。

import { WeiwenLawEngine } from '../core/engine.mjs';

// 【主干判据 · 类型级可识别性闸门】
//   只有「number 类型 且 有限」才算可用数值信源；其余一律判信源缺失——不数值化、不猜、不输出伪零。
//   为什么必须是类型级（而非值级）：
//     - 值级枚举补不完：Number(null)=Number(false)=Number([])=Number('')=0 全部伪零且 finite；
//       10n(bigint)→Number()=10 亦被当成正常数值。值的集合开放，列举永远有漏。
//     - 值级还可能崩：Number(Symbol()) 直接抛 TypeError —— 故必须先 typeof 短路再谈数值化。
//   顺序即判据：typeof 检查必须在任何 Number() / 比较之前，反过来的每一步都在赌。
//   （原则本文件 L8 已立「可识别性前置」，此前实现为「取值→数值化→之后才判 missing」，
//     是原则已立、实现未跟的对齐层缺口；本改补齐，不涉 src/core/* 禁区。）
const usableNumber = (v) => typeof v === 'number' && Number.isFinite(v);

// overlap ∈ [0,1]：协变量重叠度。落出 [0.05, 0.95] = positivity 违反 → 不可识别。
// ⚠️ overlap 非可用数值（未传 / null / 非数字类型 / NaN / ±Infinity）= 抽取通道失效的一种
//    → 判不出（fail-closed），绝不当成「可识别」默认值。
export function estimateEffectPsi({ psi, overlap, policyValue }) {
  if (!usableNumber(overlap) || overlap < 0.05 || overlap > 0.95) {
    const reason = overlap === undefined
      ? 'overlap 未传，抽取通道失效 → 判不出（fail-closed，不附信号）'
      : !usableNumber(overlap)
        ? `overlap 非有限数值（typeof=${typeof overlap}）→ 信源不可识别，判不出（fail-closed）`
        : `positivity violation: covariate overlap=${overlap} 落出 [0.05,0.95]`;
    return { identifiable: false, reason };
  }
  // 让非法状态不可表示：信源缺失时 psi 一律 undefined，绝不输出伪零 0
  // ——「没有信源」与「信源说效应为零」必须表示不同，否则下游无从分辨，只能靠纪律（而纪律会忘）。
  const psiUsable = usableNumber(psi);
  return {
    identifiable: true,
    psi: psiUsable ? psi : undefined,
    magnitude: psiUsable ? Math.abs(psi) : undefined,
    psiMissing: !psiUsable,
    policyValue: usableNumber(policyValue) ? policyValue : undefined,
  };
}

// sRelevant 推导（适配层保守映射，不碰核心禁区）：
//   读类动作 → 不涉 S（false）；写/破坏/中性未知名 → 保守视为涉 S（true，fail-closed）。
// 命中只读集才放行「纯读无 S 风险」分支；其余一律按涉 S 保守处理，避免缺参静默放行。
const READ_ONLY_ACTIONS = new Set([
  'read_file', 'read', 'list_dir', 'list', 'glob', 'grep', 'search',
  'search_files', 'fetch', 'get', 'view', 'cat', 'ls', 'read_dir',
]);
function deriveSRelevant(call) {
  const name = (call?.name || '').toLowerCase();
  if (READ_ONLY_ACTIONS.has(name)) return false;
  return true; // 写/破坏/中性未知名（tool_42 类等）→ 保守视为涉 S
}

// Uplift / Qini 排序：哪些动作更侵蚀 S（按 |ψ| 降序，最蚀 S 在前）
// 同主干闸门：信源缺失不给伪零 0（0 会被读成「零效应」而排在中间），一律排到末尾且 psi 为 undefined。
export function upliftRank(actions) {
  const mag = (a) => (usableNumber(a.psi) ? Math.abs(a.psi) : -Infinity);
  return [...actions]
    .map((a) => ({ name: a.name, psi: usableNumber(a.psi) ? a.psi : undefined }))
    .sort((x, y) => mag(y) - mag(x));
}

// 融合裁决：引擎定夺（最终裁决），传感器加 S/D 信号，M 闸门兜底不可识别情形。
//   call: 同 engine.decideToolCall 入参（{ name, args, command, ... }）
//   context: { engine?, psi?, overlap?, policyValue?, sRelevant? }
//     - sRelevant: 该动作是否涉及 S（写/改/删类）；不可识别时仅此类升级 review。
export function fusedDecide(call, context = {}) {
  const engine = context.engine ?? new WeiwenLawEngine();
  const base = engine.decideToolCall(call);

  // M 已介入（判不出 / 定义不明）→ 原样透传，不加不减
  if (base.kind === 'review') return base;
  // 引擎已判有害 → 原样透传
  if (base.kind === 'deny') return base;

  // sRelevant 未传 → 保守推导（读类=false，其余=true）；绝不因缺参静默放行。
  const sRelevant = context.sRelevant ?? deriveSRelevant(call);

  // 引擎放行：S/D 传感器做叶子层量化赋值
  const est = estimateEffectPsi(context);
  if (!est.identifiable) {
    // 去糟粕：绝不信任在不可识别前提下算出的数。
    // 涉及 S 的动作 → 判不出即交 M review；纯读类无 S 风险 → 维持放行并标注不确定。
    if (sRelevant) {
      return {
        ...base,
        kind: 'review',
        // 此处升级的裁决方是 M 闸门（效应不可识别 → 交 M），不是推演层，故 law 恒为 'M'，
        // 不继承 base.law（2026-09-13：引擎 allow 出口补齐 law 后，继承会把 M 兜底标成推演层结论）。
        law: 'M',
        reason: `SD 传感器：${est.reason} → 效应不可识别，交 M review（弃盲目 unconfoundedness）`,
        sdUncertain: true,
      };
    }
    return { ...base, sdUncertain: true, sdNote: est.reason };
  }
  // 可识别：附 S/D 信号，引擎 verdict 不变（加叶不覆盖 verdict，仅 allow→review 单向加严）
  return {
    ...base,
    sdSignal: { psi: est.psi, magnitude: est.magnitude, policyValue: est.policyValue, psiMissing: est.psiMissing },
  };
}
