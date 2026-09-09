// 融合测试：S/D 量化效应传感器接进 DSH 适配层后，引擎裁决不被污染、M 闸门生效。
// 调用形态严格沿用 probe-sd-mirror.mjs 的 P1–P6，保证「融合后」与「融合前」同基准。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';
import { estimateEffectPsi, upliftRank, fusedDecide } from '../src/adapt/sd-effect-sensor.mjs';

function freshEngine() {
  return new WeiwenLawEngine();
}

// ── 精华 1：可识别性前置（去糟粕的核心）──
test('精华·可识别性前置：overlap 越界即判不可识别', () => {
  const bad = estimateEffectPsi({ psi: 0.3, overlap: 0.02 });
  assert.equal(bad.identifiable, false);
  assert.match(bad.reason, /positivity violation/);
  const ok = estimateEffectPsi({ psi: 0.3, overlap: 0.5 });
  assert.equal(ok.identifiable, true);
  assert.equal(ok.psi, 0.3);
});

// ── 精华 2：Uplift 排序（最蚀 S 在前）──
test('精华·Uplift 排序：按 |ψ| 降序', () => {
  const ranked = upliftRank([
    { name: 'read', psi: 0.1 },
    { name: 'delete', psi: -0.9 },
    { name: 'write', psi: 0.4 },
  ]);
  assert.equal(ranked[0].name, 'delete'); // |−0.9| 最大
  assert.equal(ranked[2].name, 'read');
});

// ── 融合后：引擎 review 透传（P6 隐藏混杂 / 中性名 → M 已介入，不动）──
test('融合·P6 隐藏混杂请求 → 引擎 review 透传，M 不被传感器覆盖', () => {
  const call = { name: 'estimate_causal_effect', args: { treatment: 'X', outcome: 'Y', data: 'observational', unobserved_confounder: true, counterfactual_labels: false } };
  const r = fusedDecide(call, { engine: freshEngine(), psi: 0.8, overlap: 0.5, sRelevant: true });
  assert.equal(r.kind, 'review');
  assert.equal(r.sdSignal, undefined); // 不附不可信信号
});

// ── 融合后：引擎 allow + 可识别 → 附 sdSignal，verdict 不变（加叶不覆盖）──
test('融合·P4 良性读取 + 可识别 → allow 附 sdSignal，引擎 verdict 不变', () => {
  const call = { name: 'read_file', args: { path: '/tmp/ok.txt' } };
  const r = fusedDecide(call, { engine: freshEngine(), psi: 0.05, overlap: 0.6 });
  assert.equal(r.kind, 'allow');
  assert.ok(r.sdSignal && r.sdSignal.magnitude === 0.05);
});

// ── 融合后：引擎 allow + 效应不可识别 + S 相关 → 升级 review（去糟粕 / M 闸门）──
test('融合·allow + 效应不可识别 + S相关 → 升级 review（弃盲目 unconfoundedness）', () => {
  const call = { name: 'exec', args: { command: 'rm -rf ./cache' } };
  const r = fusedDecide(call, { engine: freshEngine(), psi: 0.7, overlap: 0.01, sRelevant: true });
  assert.equal(r.kind, 'review');
  assert.equal(r.sdUncertain, true);
  assert.equal(r.law, 'M');
});

// ── 融合后：引擎 allow + 效应不可识别 + 纯读 → 维持放行（无 S 风险）──
test('融合·allow + 效应不可识别 + 纯读 → 维持 allow 并标注不确定', () => {
  const call = { name: 'read_file', args: { path: '/tmp/ok.txt' } };
  const r = fusedDecide(call, { engine: freshEngine(), psi: 0.0, overlap: 0.01 });
  assert.equal(r.kind, 'allow');
  assert.equal(r.sdUncertain, true);
  assert.equal(r.sdSignal, undefined);
});

// ── 融合后：引擎 deny 透传（P5 明文破坏 → 不动）──
test('融合·P5 明文破坏 → 引擎 deny 透传', () => {
  const call = { name: 'exec', args: { command: 'rm -rf /' } };
  const r = fusedDecide(call, { engine: freshEngine(), psi: 0.9, overlap: 0.5, sRelevant: true });
  assert.equal(r.kind, 'deny');
});

// ── 反向保护：P1 漏放（已知细枝盲区）在融合后仍存在，融合未掩盖它 ──
test('融合·P1 rm -rf . 仍漏放（融合不掩盖已知细枝盲区，待核心修复）', () => {
  const call = { name: 'exec', args: { command: 'rm -rf .' } };
  const r = fusedDecide(call, { engine: freshEngine(), psi: 0.9, overlap: 0.5, sRelevant: true });
  // 注意：此处 overlap 可识别 + sRelevant，传感器本应加重信号，但 P1 引擎本身已 ALLOW，
  // 暴露的是 engine.mjs SCOPE_REL_FULL 正则盲区（禁区，须另授权修）。融合层如实暴露，不粉饰。
  assert.equal(r.kind, 'allow');
});

// ── 杠1 回归锁：缺省 fail-open → fail-closed（扣子 2026-09-09 拦）──
test('杠1·overlap 未传 → 缺省 fail-closed：写操作交 M review（非静默 ALLOW）', () => {
  const call = { name: 'fs_write', args: { path: '/tmp/q3_report.txt', content: 'x' } };
  const r = fusedDecide(call, { engine: freshEngine() }); // 不传 overlap / sRelevant
  assert.equal(r.kind, 'review');
  assert.equal(r.sdUncertain, true);
});

test('杠1·sRelevant 未传 → 保守推导：读类=false(维持放行) / 中性名=true(升级 review)', () => {
  const readCall = { name: 'read_file', args: { path: '/tmp/ok.txt' } };
  const readR = fusedDecide(readCall, { engine: freshEngine(), overlap: 0.01 }); // 不可识别, 读类推导 false
  assert.equal(readR.kind, 'allow');
  assert.equal(readR.sdUncertain, true);
  const neutralCall = { name: 'tool_42', args: {} };
  const neutralR = fusedDecide(neutralCall, { engine: freshEngine(), overlap: 0.01 }); // 不可识别, 中性名推导 true
  // 注：中性名由引擎本身判 review（M 已介入、提前返回），传感器不重复添 sdUncertain；
  // 推导为「涉 S」的加严语义在测试「杠1·overlap 未传」(fs_write) 已正面验证。
  assert.equal(neutralR.kind, 'review');
});

// ── 杠2 回归锁：psi 无源不输出伪零（扣子 2026-09-09 拦）──
test('杠2·psi 无源 → 不输出伪零，显式 psiMissing', () => {
  const call = { name: 'read_file', args: { path: '/tmp/ok.txt' } };
  const r = fusedDecide(call, { engine: freshEngine(), overlap: 0.6 }); // 可识别但无 psi
  assert.equal(r.kind, 'allow');
  assert.ok(r.sdSignal);
  assert.equal(r.sdSignal.psi, undefined);
  assert.equal(r.sdSignal.psiMissing, true);
});

// ── 杠3 回归锁：单向升级闸门语义（禁止 review/deny→allow）（扣子 2026-09-09 拦措辞）──
test('杠3·单向加严：引擎 review / deny 不被传感器翻成 allow', () => {
  const reviewCall = { name: 'estimate_causal_effect', args: { treatment: 'X', outcome: 'Y', data: 'observational' } };
  const r1 = fusedDecide(reviewCall, { engine: freshEngine(), psi: 0.8, overlap: 0.5, sRelevant: true });
  assert.equal(r1.kind, 'review'); // 仍 review，未被覆盖
  const denyCall = { name: 'exec', args: { command: 'rm -rf /' } };
  const r2 = fusedDecide(denyCall, { engine: freshEngine(), psi: 0.9, overlap: 0.5, sRelevant: true });
  assert.equal(r2.kind, 'deny'); // 仍 deny，未被覆盖
});
