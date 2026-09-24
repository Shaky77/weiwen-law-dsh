// API 集成测试（node --test）：验证 S 账本不仅单元逻辑正确，且被引擎**真实裁决管线**正确喂入。
// 与 s-account-ledger.test.mjs（直戳 ledger 内部方法）构成"双证据"：本文件只走公开 API
// （decideToolCall / onFailure），绝不直戳 sAccount.record，证明账目在真实调用下自动沉淀。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';
import { SAccountLedger } from '../src/core/ledger.mjs';

// —— 双证据其一：真实裁决管线把 allow 沉为 S+'，deny 走 R，onFailure 沉为 S'- ——
test('API 集成：decideToolCall/onFailure 经真实管线把 S 刻痕沉入账本（不直戳 ledger）', () => {
  const e = new WeiwenLawEngine();
  assert.ok(e.sAccount instanceof SAccountLedger, '引擎实例化即接入 S 账本');
  assert.equal(e.sAccount.size(), 0, '初始账本为空');

  // 良性低风险动作 → allow → 走 recordSteady(+1) → 真实管线沉 S+
  const allows = [
    { name: 'read_file', args: { path: 'README.md' } },
    { name: 'read_file', args: { path: 'package.json' } },
    { name: 'run_task', args: { command: 'ls -la' } },
    { name: 'read_file', args: { path: 'docs/guide.md' } },
  ];
  for (const call of allows) {
    const d = e.decideToolCall(call);
    assert.equal(d.kind, 'allow', `良性动作应 allow：${JSON.stringify(call)}`);
    assert.equal(d.risk, 'low');
  }
  assert.equal(e.sAccount.size(), allows.length, '每个 allow 经真实管线沉一条 S 刻痕');

  // 同 term 长链只增不减：重复 allow 序位递增、数量只增（非重置）
  const before = e.sAccount.size();
  for (let i = 0; i < 5; i++) e.decideToolCall({ name: 'read_file', args: { path: 'README.md' } });
  assert.equal(e.sAccount.size(), before + 5, '重复 allow 只增不减');

  // 读密钥文件 → 引擎正确拒绝（R 层刚性锚点），验证裁决逻辑不被账本改动影响
  const deny = e.decideToolCall({ name: 'read_file', args: { path: '.env' } });
  assert.equal(deny.kind, 'deny');
  assert.equal(deny.law, 'R');

  // onFailure（真实引擎 API）→ 沉一条 S'- 刻痕，不直戳 ledger
  const sBeforeFail = e.sAccount.size();
  e.onFailure(1);
  assert.equal(e.sAccount.size(), sBeforeFail + 1, 'onFailure 经真实管线沉 S');

  // 结构自检：R 字典未被 S 改动（S≠R 异类），账本只增
  assert.deepEqual(e.sAccount.invariantCheck(), { rUntouched: true, sDistinctKind: true });

  // seq 单调（只增不减的序位）
  const seqs = e.sAccount.sSeq().map((r) => r.seq);
  assert.deepEqual(seqs, [...seqs].sort((a, b) => a - b), 'S 序位单调');

  // 真实管线记录的 S 携带 R 域标签：证明 attrib.layer → domainOf 链路在真实调用下贯通
  const tagged = e.sAccount.sSeq().filter((r) => Array.isArray(r.rDomains) && r.rDomains.length > 0);
  assert.ok(tagged.length > 0, 'allow 路径记录带 R 域标签（attrib.layer → domainOf）');

  // sign 语义（2026-09-24 口径修复后）：**无依据不冒充增益** ——
  //   allow 可逆动作 ⇒ 中性 '0'（修前误为 '+'：把"放行"当"增益"，实测 12 条 `+/scar` 同记录内自相矛盾）；
  //   onFailure      ⇒ '-'（事实：创伤侵蚀）；
  //   '+' 只由**有依据的**增益事件产生 —— 经 recordSteady 显式传 positive（引擎公开 API，非直戳 ledger 内部）。
  const signs = e.sAccount.sSeq().map((r) => r.sign);
  assert.ok(signs.includes('0') && signs.includes('-'), 'allow 记中性刻痕、onFailure 记负向刻痕');
  assert.ok(!signs.includes('+'), '放行不得冒充增益：账本中不出现无依据的 +');
  e.recordSteady({ positive: 1, subsystem: 'core', topic: 'heal:closed-loop' });
  assert.ok(e.sAccount.sSeq().map((r) => r.sign).includes('+'), '显式有据的增益才记 +');
});

// —— 双证据其二：R 域标签随真实动作类别不同而不同（Micro / Cosmic 等），证明标签来自 attrib 而非写死 ——
test('API 集成：不同真实动作的 S 刻痕携带不同 R 域标签', () => {
  const e = new WeiwenLawEngine();
  e.decideToolCall({ name: 'read_file', args: { path: 'README.md' } });   // 文件读 → Micro
  e.decideToolCall({ name: 'run_task', args: { command: 'ls -la' } });     // 命令执行 → 其层映射
  const domains = new Set();
  for (const r of e.sAccount.sSeq()) for (const d of r.rDomains) domains.add(d);
  assert.ok(domains.size >= 1, '真实管线下 S 记录带有 R 域标签');
});
