// session-ledger-buckets.test.mjs — 回归锁（2026-09-26 · 三处对齐层修复）
//   ① 跨调用敏感源登记点：**判定层入口**（修前病：登记写在 deduceRisk 内 ⇒ 被上游早退绕过 ⇒ 判据自否定）
//   ② `mSystemMarks` 一桶两义拆置（「一个字段不许合并多义」· 仪器三戒）
//   ③ 无动作文本的 allow 理由正位（**判决对 ＋ 理由假 ＝ 真的假话**）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';

// ══ ① 登记点契约：登记是「入口的事」，deduceRisk 保持纯读 ══
// 依据：适配层 src/index.js 明写「deduceRisk 只做语义推断 + 双路模拟，不写任何状态……⇒ 纯读，可安全补算」。
//   原实现（登记写在 deduceRisk 内）既**违反该契约**，又因位置的缘故**不可达**。
test('契约①：deduceRisk 为纯读不登记；敏感源登记只发生在判定层入口 decideToolCall', () => {
  const e = new WeiwenLawEngine();
  e.deduceRisk({ name: 'read_file', args: { path: '/etc/shadow' } });
  assert.equal(e.sessRead.size, 0); // 直调为纯读（不写状态）
  const r = e.decideToolCall({ name: 'read_file', args: { path: '/etc/shadow' } });
  assert.equal(r.kind, 'deny');     // 判定层即拦（凭据不问自取视为偷）
  assert.equal(e.sessRead.size, 1); // 但本会话的敏感接触仍登记 ⇒ 后续 sink 须按「源→汇」复核
});

test('契约①幂等：同一敏感源重复裁决不重复计数；普通路径读不登记（不误伤）', () => {
  const e = new WeiwenLawEngine();
  for (let i = 0; i < 3; i += 1) e.decideToolCall({ name: 'read_file', args: { path: '/etc/shadow' } });
  assert.equal(e.sessRead.size, 1); // Set 幂等
  const e2 = new WeiwenLawEngine();
  e2.decideToolCall({ name: 'read_file', args: { path: '/tmp/notes.txt' } });
  assert.equal(e2.sessRead.size, 0); // 非凭据/非系统路径 ⇒ 不登记
});

// ══ ② 拆桶：拦截计数与 R 锚痕存不再共用一个 Map ══
test('拆桶②：同一系统反复被拦 → 计数进 mInterceptMarks；mSystemMarks（R 锚痕存桶）不被污染', () => {
  const e = new WeiwenLawEngine();
  const bad = { name: 'read_file', args: { path: { oops: true } } }; // 双线不一致 → review/M
  for (let i = 0; i < 3; i += 1) e.decideToolCall(bad);
  const snap = e.snapshot();
  assert.equal(snap.mInterceptMarks.read_file, 3);      // 拦截计数桶
  assert.deepEqual(Object.keys(snap.mSystemMarks), []); // R 锚桶：无 R 命中即为空（不受拦合计影响）
});

// ══ ③ 理由正位：空动作文本 ⇒ 如实陈述，不套「S 增路径成立」 ══
// 依据（安 2026-09-26）：空 ⇒ 无扰动入基线 ⇒ S 持平 ⇒ M 未变 ⇒ 无风险 ⇒ allow 正确；变的只是理由。
test('理由正位③：无动作文本的 allow 理由为「无扰动入基线」，不含「S 增路径成立」', () => {
  const e = new WeiwenLawEngine();
  const r = e.decideToolCall({ name: 'bash', args: { command: '' } });
  assert.equal(r.kind, 'allow');
  assert.match(r.reason, /无扰动入基线/);
  assert.doesNotMatch(r.reason, /S 增路径成立/);
});

test('理由对照③：有动作文本的正常低风险动作，理由仍为「S 增路径成立」（不被新分支吞掉）', () => {
  const e = new WeiwenLawEngine();
  const r = e.decideToolCall({ name: 'read_file', args: { path: '/tmp/notes.txt' } });
  assert.equal(r.kind, 'allow');
  assert.match(r.reason, /S 增路径成立/);
});
