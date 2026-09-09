// S/D 量化效应融合传感器（适配层，禁区外）
//
// 【取其精华 · 保留】
//   1. Cross-fitting DML 伪结果 ψ —— 动作对系统稳态 S / 止损 D 的因果效应估计（最稳路径）。
//   2. Uplift / Qini 排序 —— 哪些动作更侵蚀 S（按 |ψ| 降序）。
//   3. IPW / DR 策略价值 V(π) —— 策略对稳态储备 S 的收益估计。
// 【去其糟粕 · 丢弃】
//   1. 盲目默认 unconfoundedness → 改为「可识别性前置」：不满足即交 M review。
//   2. Replay Simulator 子集有偏 → 不采纳。
//   3. 估计器当裁决权威 → 引擎始终是最终裁决者，传感器只附信号、绝不覆盖 allow/deny/review。
//
// 纪律：本传感器可达集={S,D}（量化赋值），不可达集={R,H,M}。
//   本模块只在 S/D 做叶子层「加叶」，不碰 R/H/M，不修改 engine.mjs。
//   真实训练权重归闭源量化引擎；此处是结构化方法接线（接线即精华，权重非此处）。

import { WeiwenLawEngine } from '../core/engine.mjs';

// overlap ∈ [0,1]：协变量重叠度。落出 [0.05, 0.95] = positivity 违反 → 不可识别。
export function estimateEffectPsi({ psi, overlap = 0.5, policyValue }) {
  if (overlap < 0.05 || overlap > 0.95) {
    return { identifiable: false, reason: `positivity violation: covariate overlap=${overlap} 落出 [0.05,0.95]` };
  }
  return {
    identifiable: true,
    psi: Number(psi ?? 0),
    magnitude: Math.abs(Number(psi ?? 0)),
    policyValue: policyValue != null ? Number(policyValue) : undefined,
  };
}

// Uplift / Qini 排序：哪些动作更侵蚀 S（按 |ψ| 降序，最蚀 S 在前）
export function upliftRank(actions) {
  return [...actions]
    .map((a) => ({ name: a.name, psi: a.psi ?? 0 }))
    .sort((x, y) => Math.abs(y.psi) - Math.abs(x.psi));
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

  // 引擎放行：S/D 传感器做叶子层量化赋值
  const est = estimateEffectPsi(context);
  if (!est.identifiable) {
    // 去糟粕：绝不信任在不可识别前提下算出的数。
    // 涉及 S 的动作 → 判不出即交 M review；纯读类无 S 风险 → 维持放行并标注不确定。
    if (context.sRelevant) {
      return {
        ...base,
        kind: 'review',
        law: base.law ?? 'M',
        reason: `SD 传感器：${est.reason} → 效应不可识别，交 M review（弃盲目 unconfoundedness）`,
        sdUncertain: true,
      };
    }
    return { ...base, sdUncertain: true, sdNote: est.reason };
  }
  // 可识别：附 S/D 信号，引擎 verdict 不变（加叶不覆盖）
  return {
    ...base,
    sdSignal: { psi: est.psi, magnitude: est.magnitude, policyValue: est.policyValue },
  };
}
