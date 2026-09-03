// 第一BUG停止闭环状态机单测（node --test）
// 验证：BUG → 停止 → 反推 → 溯源 → 修复(验证) → 重入 闭环；
//       未修复前禁止重入（从根上阻断"只反推不修复→无限递归"）。
// 确定性、零依赖、不烧 Key。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';
import { BugStopGuard } from '../src/core/bugstop.mjs';

// ---------------- 阻断无限递归：带原BUG重跑被拒，拒不修复硬闯满 9 次转人工 ----------------
test('闭环：第一BUG停止后，带原BUG反复重跑先一律拒绝；拒不修复硬闯满 9 次转人工', () => {
  const e = new WeiwenLawEngine();
  // 双线一致：DSH 标 paradox（治标）+ path 收到对象（治本结构推断）→ 一致确认停机
  const broken = { name: 'reason', args: { path: { nested: true } }, paradox: true };
  const d1 = e.decideToolCall(broken);
  assert.equal(d1.kind, 'deny');
  assert.equal(d1.law, 'M');
  assert.ok(d1.bugKey);
  // 第 2~8 次：反复用同一 broken call 硬闯，闭环硬闸一律拦截
  for (let i = 0; i < 7; i++) {
    const d = e.decideToolCall(broken);
    assert.equal(d.kind, 'deny');
    assert.equal(d.closedLoop, true);
    assert.ok(Array.isArray(d.missing) && d.missing.length > 0, '应告知缺失步骤');
  }
  // 第 9 次：同一 BUG 拒不修复硬闯满 9 次标记 → 转人工决策（AI 停止纠结，不耗算力）
  const dh = e.decideToolCall(broken);
  assert.equal(dh.kind, 'review');
  assert.equal(dh.humanDecision, true);
  assert.ok(dh.reason.includes('转人工'));
});

// ---------------- 闭环闭合后：重入放行 ----------------
test('闭环：完成 反推→溯源→修复(验证) 后，重入放行', () => {
  const e = new WeiwenLawEngine();
  // 双线一致：paradox（治标）+ path 收对象（治本）→ 确认停机（须先走 deny + 闭环）
  const broken = { name: 'reason', args: { path: { nested: true } }, paradox: true };
  const d1 = e.decideToolCall(broken);
  const key = d1.bugKey;
  assert.ok(key);

  e.reverseBug(key);                         // 逻辑反推（溯）
  e.traceBug(key, 'R 客观规则层：前提失真');  // 溯源标记
  // 修复：去除悖论标志。修复后的 call 须为**真实语义调用**（带真名真参数）——
  // 若用 {name:'reason',args:{}} 这类空调用属失真输入：路径1 归因必然判定
  // 「名中性 + 无可观测行为」，按铁律落 review，测不出「闭环闸门放行」这一意图。
  // （2026-09-04 树视角复盘：闭环 verify 只验 M 枝⑥，不覆盖 R 枝，故重入时 R 枝照审。）
  const fixed = { name: 'write_file', args: { path: '/tmp/a.md' }, paradox: false };
  const res = e.resolveBug(key, fixed);      // 默认验证：fixed 不再触发第一BUG停机
  assert.equal(res.ok, true);

  const d2 = e.decideToolCall(fixed);
  assert.equal(d2.kind, 'allow'); // 修复后放行
});

// ---------------- 核心补强点：只反推不修复，仍禁止重入 ----------------
test('闭环：只做逻辑反推、不修复，依旧禁止重入', () => {
  const e = new WeiwenLawEngine();
  // 双线一致：selfReference（治标）+ path 收到对象（治本）→ 一致确认停机
  const broken = { name: 'reason', args: { path: { nested: true } }, selfReference: true };
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
