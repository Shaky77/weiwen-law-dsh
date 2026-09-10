// 类型级可识别性闸门 —— 针对性回归锁（一次性回归锁，只读不改引擎）
//
// 锁的判据，不是值的清单：
//   这里穷举的是 **typeof 的全部类型分支**（有限、封闭），不是「可能会传进来的值」（无限、开放）。
//   因此任何退回「值级判定」的改法（如 psi !== undefined && psi !== null）都会当场塌，
//   包括 Number() 强转为 0 的伪零族（null / false / [] / ''）、bigint 近亲（10n）、
//   以及会抛异常的 Symbol —— 这正是本锁存在的理由：证明闸门在承重，而不是 case 在堆积。
//
// 背景（主干 vs 枝叶）：
//   - 值级枚举补不完：Number(null)=Number(false)=Number([])=Number('')=0，全部 finite → 伪零穿透；
//     Number(10n)=10 被当成正常数值；Number(Symbol()) 直接抛 TypeError。
//   - 顺序即判据：typeof 必须短路在任何 Number() / 比较之前。
//   - 让非法状态不可表示：信源缺失时 psi 必须为 undefined，绝不能是 0
//     （「没有信源」与「信源说效应为零」共用同一个表示，下游就无从分辨）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateEffectPsi, upliftRank } from '../src/adapt/sd-effect-sensor.mjs';

// ── 等价类 A：可用数值（number 且有限）—— 必须放行，零误杀 ──
const CLASS_A = [
  ['0', 0],
  ['1.5', 1.5],
  ['-0.3', -0.3],
  ['1e308', 1e308],
  ['Number.MIN_VALUE', Number.MIN_VALUE],
];

// ── 等价类 B：number 类型但非有限 —— 必须判信源缺失 ──
const CLASS_B = [
  ['NaN', NaN],
  ['Infinity', Infinity],
  ['-Infinity', -Infinity],
];

// ── 等价类 C：非 number 类型（穷举所有 typeof 分支）—— 必须判信源缺失 ──
const CLASS_C = [
  ['undefined', undefined],
  ['null', null],
  ['false', false],
  ['true', true],
  ['empty string', ''],
  ['abc', 'abc'],
  ['empty array', []],
  ['[0]', [0]],
  ['{}', {}],
  ['10n (bigint)', 10n],
  ['Symbol()', Symbol('s')],
  ['function', () => {}],
];

const OK_OVERLAP = 0.5; // 可识别区间内，用于隔离 psi 通道单独测试

test('闸门·等价类 A：有限 number 全部放行，零误杀', () => {
  for (const [label, v] of CLASS_A) {
    const r = estimateEffectPsi({ psi: v, overlap: OK_OVERLAP });
    assert.equal(r.identifiable, true, `${label} 应可识别`);
    assert.equal(r.psi, v, `${label} psi 应原值透传`);
    assert.equal(r.psiMissing, false, `${label} 不应判 missing`);
    assert.equal(r.magnitude, Math.abs(v), `${label} magnitude 应为 |psi|`);
  }
});

test('闸门·等价类 B：number 但非有限 → 信源缺失，且不输出伪零', () => {
  for (const [label, v] of CLASS_B) {
    const r = estimateEffectPsi({ psi: v, overlap: OK_OVERLAP });
    assert.equal(r.psiMissing, true, `${label} 应判 missing`);
    assert.equal(r.psi, undefined, `${label} 不得给出 psi 数值`);
    assert.equal(r.magnitude, undefined, `${label} 不得给出 magnitude`);
  }
});

test('闸门·等价类 C：非 number 全类型 → 信源缺失，且不输出伪零（含 Symbol 不崩）', () => {
  for (const [label, v] of CLASS_C) {
    // 若实现退回 Number() 强转，Symbol 会直接抛 TypeError —— 此处即崩在断言里，测试失败
    const r = estimateEffectPsi({ psi: v, overlap: OK_OVERLAP });
    assert.equal(r.psiMissing, true, `${label} 应判 missing`);
    assert.equal(r.psi, undefined, `${label} 不得输出伪零`);
    assert.equal(r.magnitude, undefined, `${label} 不得输出伪零 magnitude`);
  }
});

test('闸门·overlap 同刀：非可用数值一律不可识别（不得碰巧被阈值兜住）', () => {
  for (const [label, v] of [...CLASS_B, ...CLASS_C]) {
    const r = estimateEffectPsi({ psi: 0.3, overlap: v });
    assert.equal(r.identifiable, false, `overlap=${label} 应判不可识别`);
    assert.equal(r.psi, undefined, `不可识别时不附 psi（fail-closed）`);
  }
  // 可识别区间内仍正常
  assert.equal(estimateEffectPsi({ psi: 0.3, overlap: 0.5 }).identifiable, true);
  assert.equal(estimateEffectPsi({ psi: 0.3, overlap: 0.05 }).identifiable, true);
  assert.equal(estimateEffectPsi({ psi: 0.3, overlap: 0.95 }).identifiable, true);
});

test('闸门·overlap 越界仍报 positivity violation（语义锚点不变）', () => {
  assert.match(estimateEffectPsi({ overlap: 0.02 }).reason, /positivity violation/);
  assert.match(estimateEffectPsi({ overlap: undefined }).reason, /抽取通道失效/);
  assert.match(estimateEffectPsi({ overlap: 'abc' }).reason, /信源不可识别/);
});

test('非法状态不可表示：missing 与「效应为零」表示必须不同', () => {
  const zero = estimateEffectPsi({ psi: 0, overlap: OK_OVERLAP });
  const missing = estimateEffectPsi({ psi: null, overlap: OK_OVERLAP });
  assert.equal(zero.psi, 0);
  assert.equal(zero.psiMissing, false);
  assert.equal(missing.psi, undefined); // 不是 0 —— 下游拿不到可误读的值
  assert.equal(missing.psiMissing, true);
  assert.notEqual(missing.psi, zero.psi);
});

test('upliftRank 不给伪零：缺失排末尾且不产出 0', () => {
  const ranked = upliftRank([
    { name: 'a', psi: null },
    { name: 'b', psi: 0.5 },
    { name: 'c', psi: undefined },
    { name: 'd', psi: 0.9 },
  ]);
  assert.deepEqual(ranked.map((r) => r.name), ['d', 'b', 'a', 'c']);
  assert.equal(ranked[2].psi, undefined);
  assert.equal(ranked[3].psi, undefined);
  // 缺失项不得被当成 0 而插在中间
  assert.notEqual(ranked[2].psi, 0);
});
