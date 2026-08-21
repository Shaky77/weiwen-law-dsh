// 第一BUG停止闭环状态机单测（node --test）
// 验证：BUG → 停止 → 反推 → 溯源 → 修复(验证) → 重入 闭环；
//       未修复前禁止重入（从根上阻断"只反推不修复→无限递归"）。
// 确定性、零依赖、不烧 Key。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';
import { BugStopGuard } from '../src/core/bugstop.mjs';

// ---------------- 阻断无限递归：带原BUG重跑被拒 ----------------
test('闭环：第一BUG停止后，带原BUG反复重跑一律拒绝（阻断无限递归）', () => {
  const e = new WeiwenLawEngine();
  const broken = { name: 'reason', args: {}, paradox: true };
  const d1 = e.decideToolCall(broken);
  assert.equal(d1.kind, 'deny');
  assert.equal(d1.law, 'M');
  assert.ok(d1.bugKey);
  // 模拟"无限递归"：反复用同一 broken call 重跑
  for (let i = 0; i < 12; i++) {
    const d = e.decideToolCall(broken);
    assert.equal(d.kind, 'deny');
    assert.equal(d.closedLoop, true);
    assert.ok(Array.isArray(d.missing) && d.missing.length > 0, '应告知缺失步骤');
  }
});

// ---------------- 闭环闭合后：重入放行 ----------------
test('闭环：完成 反推→溯源→修复(验证) 后，重入放行', () => {
  const e = new WeiwenLawEngine();
  const broken = { name: 'reason', args: {}, paradox: true };
  const d1 = e.decideToolCall(broken);
  const key = d1.bugKey;
  assert.ok(key);

  e.reverseBug(key);                         // 逻辑反推（溯）
  e.traceBug(key, 'R 客观规则层：前提失真');  // 溯源标记
  const fixed = { name: 'reason', args: {}, paradox: false }; // 修复：去除悖论标志
  const res = e.resolveBug(key, fixed);      // 默认验证：fixed 不再触发第一BUG停机
  assert.equal(res.ok, true);

  const d2 = e.decideToolCall(fixed);
  assert.equal(d2.kind, 'allow'); // 修复后放行
});

// ---------------- 核心补强点：只反推不修复，仍禁止重入 ----------------
test('闭环：只做逻辑反推、不修复，依旧禁止重入', () => {
  const e = new WeiwenLawEngine();
  const broken = { name: 'reason', args: {}, selfReference: true };
  e.decideToolCall(broken);
  const key = e.bugStopSnapshot()[0].bugKey;
  e.reverseBug(key); // 仅反推，不修复
  const d = e.decideToolCall(broken);
  assert.equal(d.kind, 'deny');
  assert.equal(d.closedLoop, true);
  assert.ok(d.missing.includes('解决/修复(验证)'));
});

// ---------------- BugStopGuard 单元 ----------------
test('BugStopGuard：halt→reverse→trace→resolve 状态流转正确', () => {
  const g = new BugStopGuard();
  const call = { name: 'x', args: {}, deadlock: true };
  const { bugKey } = g.halt(call);
  assert.equal(g.canReenter(call).allowed, false);
  g.reverse(bugKey);
  g.trace(bugKey, '微观层：竞态');
  const ok = g.resolve(bugKey, { name: 'x', args: {}, deadlock: false }, (fix) => fix.deadlock !== true);
  assert.equal(ok.ok, true);
  assert.equal(g.canReenter(call).allowed, true); // 修复后该签名不再阻
});

test('BugStopGuard：稳定身份——同签名多次 halt 命中同一记录（闸门才能持续生效）', () => {
  const g = new BugStopGuard();
  const call = { name: 'y', args: { a: 1 }, paramTypeError: true };
  const k1 = g.halt(call).bugKey;
  const k2 = g.halt(call).bugKey; // 第二次 halt（模拟重跑）
  assert.equal(k1, k2);
  assert.equal(g.stops.get(k1).attempts, 2);
});
