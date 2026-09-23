// S 账本（用户账本模型 2026-09-20）回归锁：覆盖账本模型全部要点 + 三个洞（覆盖写`>` / 无明诺长链 / 可逆性疤窗）。
// 这些测试只读账本模块 + 引擎附加记录，是证据（lock），非引擎裁决强制机制。
import test from 'node:test';
import assert from 'node:assert/strict';
import { SAccountLedger, classifyReversibility, rDomainsForLayer } from '../src/core/ledger.mjs';
import { R_DOMAIN } from '../src/core/law.mjs';
import { WeiwenLawEngine } from '../src/core/engine.mjs';

// ───────── 1. 目录按 term 字典序（类新华字典），不按域 ─────────
test('ledger: catalog indexed by term in dictionary order, not by domain', () => {
  const L = new SAccountLedger();
  L.record({ term: 'banana', sign: '+', rDomains: ['Micro'] });
  L.record({ term: 'apple', sign: '+', rDomains: ['Macro'] });
  L.record({ term: 'cherry', sign: '-', rDomains: ['Cosmic'] });
  const order = L.byTerm().map((e) => e.term);
  assert.deepEqual(order, ['apple', 'banana', 'cherry']); // 字典序，且与 R 域无关
});

// ───────── 2. S 与 R 绝不同类（消融/最小完备证明） ─────────
test('ledger: S is a distinct kind from R (R_DOMAIN never mutated, S in separate store)', () => {
  const beforeR = R_DOMAIN.hierarchy.length;
  const L = new SAccountLedger();
  for (let i = 0; i < 10; i++) L.record({ term: `t${i}`, sign: '+', rDomains: ['Micro'] });
  const inv = L.invariantCheck();
  assert.equal(inv.rUntouched, true);
  assert.equal(inv.sDistinctKind, true);
  assert.equal(R_DOMAIN.hierarchy.length, beforeR); // R 字典本体未被动
  // S 记录在独立列表 rStore，绝不在 R_DOMAIN.hierarchy 内
  assert.ok(L.rStore.every((r) => typeof r.seq === 'number'));
  assert.ok(R_DOMAIN.hierarchy.every((h) => h.seq === undefined));
});

// ───────── 3. R 域标签（经 domainOf，字符串键 → 短名） ─────────
test('ledger: R-domain tag attached to S record via domainOf (string-key contract)', () => {
  const L = new SAccountLedger();
  L.record({ term: 'del', sign: '-', rDomains: rDomainsForLayer('file-delete') });
  assert.deepEqual(L.rDomainsOf('del'), ['Micro']);
  L.record({ term: 'macroThing', sign: '+', rDomains: rDomainsForLayer('network-send') });
  assert.deepEqual(L.rDomainsOf('macroThing'), ['Macro']);
});

// ───────── 4. 多域 D 并集（一条 D 跨多域 → 记录挂多个 R 域标签） ─────────
test('ledger: multi-domain D carries union of R-domain tags, single term slot', () => {
  const L = new SAccountLedger();
  // 一个跨 Macro+Micro 的 D：用 term 唯一槽位，挂两个域标签
  L.record({ term: 'crossDomain', sign: '-', rDomains: rDomainsForLayer(['file-write', 'network-send']) });
  assert.deepEqual(L.rDomainsOf('crossDomain').sort(), ['Macro', 'Micro']);
  assert.deepEqual(L.multiDomainTerms(), ['crossDomain']);
});

// ───────── 5. D 触发轴标记（t = 时间序位；seq 只增） ─────────
test('ledger: D-trigger leaves axis mark (t) and monotonic seq', () => {
  const L = new SAccountLedger();
  const r = L.record({ term: 'x', sign: '+' });
  assert.equal(typeof r.t, 'number');
  assert.equal(typeof r.seq, 'number');
  assert.equal(r.seq, 1);
});

// ───────── 6. 可逆性：覆盖写 `>` → window + overwrite 标志 ─────────
test('reversibility: overwrite `>` is a reversible window', () => {
  const r = classifyReversibility('echo data > /tmp/out.txt');
  assert.equal(r.reversible, 'window');
  assert.equal(r.overwrite, true);
  const L = new SAccountLedger();
  L.record({ term: 'overwrite', sign: '0', action: 'echo data > /tmp/out.txt' });
  assert.equal(L.overwriteRecords().length, 1);
  assert.equal(L.reversibilityView().window.length, 1);
});

// ───────── 7. 可逆性：rm → scar（不可逆） ─────────
test('reversibility: delete (rm) is an irreversible scar', () => {
  assert.equal(classifyReversibility('rm -rf /tmp/x').reversible, 'scar');
  const L = new SAccountLedger();
  L.record({ term: 'danger', sign: '-', action: 'rm -rf /tmp/x' });
  assert.equal(L.reversibilityView().scar.length, 1);
});

// ───────── 8. 可逆性：read → none（无痕） ─────────
test('reversibility: read is traceless (none)', () => {
  assert.equal(classifyReversibility('cat /etc/passwd').reversible, 'none');
  const L = new SAccountLedger();
  L.record({ term: 'peek', sign: '0', action: 'read file' });
  assert.equal(L.reversibilityView().none.length, 1);
});

// ───────── 9. `->` 箭头不算覆盖写（排除误判） ─────────
test('reversibility: `->` arrow is NOT an overwrite window', () => {
  const r = classifyReversibility('git checkout main -> feature');
  assert.equal(r.overwrite, false);
});

// ───────── 10. 长链只增无重置（无明诺长链不误伤） ─────────
test('ledger: long chain of same-term D accumulates only-grows, never resets', () => {
  const L = new SAccountLedger();
  for (let i = 0; i < 7; i++) L.record({ term: 'gradual', sign: i % 2 ? '-' : '+', rDomains: ['Micro'] });
  const seq = L.sSeq();
  assert.equal(seq.length, 7);
  assert.deepEqual(seq.map((r) => r.seq), [1, 2, 3, 4, 5, 6, 7]); // 序位只增
  // 无明诺长链：所有刻痕都保留，账本不因"无明诺"而丢弃或误拒
  assert.equal(L.findByTerm('gradual').length, 7);
});

// ───────── 11. 引擎挂接：recordSteady 附加写入 sAccount（最小附加，不改裁决） ─────────
test('engine: recordSteady sinks S notch into sAccount (additive wiring)', () => {
  const e = new WeiwenLawEngine();
  const before = e.sAccount.size();
  e.recordSteady({ positive: 1, attrib: { layer: 'file-delete' }, action: 'cat file' });
  assert.equal(e.sAccount.size(), before + 1);
  const snap = e.snapshot();
  assert.equal(snap.sAccountSize, before + 1);
  // 记录带 R 域标签 + 可逆性
  const rec = e.sAccount.findByTerm('core')[0];
  assert.deepEqual(rec.rDomains, ['Micro']);
  assert.equal(rec.reversible, 'none');
});

// ───────── 12. 引擎挂接：onFailure（无 attrib）也不报错、只增 ─────────
test('engine: onFailure records into sAccount without attrib (graceful)', () => {
  const e = new WeiwenLawEngine();
  const before = e.sAccount.size();
  e.onFailure(1);
  assert.equal(e.sAccount.size(), before + 1);
  const rec = e.sAccount.sSeq().at(-1);
  assert.equal(rec.sign, '-'); // D 路径侵蚀
});
