// 四态（安 10-29 定：同意一次 / 始终同意 / 拒绝 / 待议）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apply, setPrincipalScope, clearReviewMemory } from '../src/index.js';

function mockCtx(script = []) {
  const handlers = {};
  const asks = [];
  let i = 0;
  const ctx = {
    on: (ev, cb) => { handlers[ev] = cb; },
    tools: { register: () => {} },
    get: (n) => (n === 'approval' ? {
      request: async (req) => {
        asks.push(req);
        return script[i++] ?? 'unavailable';
      },
    } : undefined),
  };
  return { ctx, handlers, asks };
}
const next = async () => 'NEXT';
const exec = (name, args = {}, callId = 'c1') => ({ token: 't', callId, name, arguments: args, agent: 'main', signal: null });
// 一个会产生 review 的调用（写系统文件 ⇒ 推演中风险）
const REVIEW = () => exec('write', { path: '/etc/hosts', content: '127.0.0.1 x' }, 'r' + Math.random());

test('态① 同意一次（allowed-once）：放行这一次，下次同类仍会再问', async () => {
  setPrincipalScope(null);
  clearReviewMemory();
  const { ctx, handlers, asks } = mockCtx(['allowed-once', 'allowed-once']);
  apply(ctx);
  const o1 = await handlers['tools/pre-execute'](REVIEW(), next);
  assert.equal(o1, 'NEXT', '同意一次 ⇒ 本次放行');
  const o2 = await handlers['tools/pre-execute'](REVIEW(), next);
  assert.equal(o2, 'NEXT');
  assert.equal(asks.length, 2, '同意一次 ≠ 永久：第二次同类仍须再问');
});

test('🔴 始终同意在当前宿主下**不可达**：宿主把非词表值归一为 unavailable（契约原文），记忆不得生效', async () => {
  setPrincipalScope(null);
  clearReviewMemory();
  // 模拟**真实宿主行为**：非词表 outcome（always/session）被归一为 'unavailable'。
  const { ctx, handlers, asks } = mockCtx(['normalized-unavailable', 'allowed-once']);
  apply(ctx);
  await handlers['tools/pre-execute'](REVIEW(), next);
  assert.equal(asks.length, 1, '宿主归一为 unavailable ⇒ 这次不算授权（fail-closed）');
  const o2 = await handlers['tools/pre-execute'](REVIEW(), next);
  assert.equal(asks.length, 2, '始终同意不可达 ⇒ 同类必须照问（不得静默沿用）');
  assert.equal(o2, 'NEXT');
});

test('扩展位：若宿主扩展词表（outcome=always），同类不再询问，且可撤销', async () => {
  setPrincipalScope(null);
  clearReviewMemory();
  // 注意：这条走的是**宿主尚未提供**的 outcome（mock 直给 always）⇒ 它锁的是"扩展位一触发就生效"，
  //   不是"当前宿主支持"——当前宿主会把 always 归一为 unavailable（见上一条）。
  const { ctx, handlers, asks } = mockCtx(['always', 'always']);
  apply(ctx);
  await handlers['tools/pre-execute'](REVIEW(), next);
  assert.equal(asks.length, 1);
  const o2 = await handlers['tools/pre-execute'](REVIEW(), next);
  assert.equal(o2, 'NEXT', '扩展位一旦触发 ⇒ 同类沿用');
  assert.equal(asks.length, 1, '扩展位生效时同类不再询问');
  assert.ok(clearReviewMemory() >= 1, '始终允许必须可撤销');
  await handlers['tools/pre-execute'](REVIEW(), next);
  assert.equal(asks.length, 2, '撤销后同类恢复询问');
});

test('态③ 拒绝（rejected）：本次不执行 + 同类冷却（不连坐它类）', async () => {
  setPrincipalScope(null);
  clearReviewMemory();
  const { ctx, handlers, asks } = mockCtx(['rejected', 'allowed-once']);
  apply(ctx);
  const o1 = await handlers['tools/pre-execute'](REVIEW(), next);
  assert.equal(o1.kind, 'deny');
  assert.match(o1.reason, /委托人裁决/, '拒绝须点名是委托人裁的');
  const o2 = await handlers['tools/pre-execute'](REVIEW(), next);
  assert.equal(asks.length, 1, '同类冷却期内不再询问');
  assert.match(o2.reason, /沿用你上一次的裁决/);
});

test('态④ 待议（cancelled）：本轮不执行 + 留痕 + **不计入冷却**（不是拒绝）', async () => {
  setPrincipalScope(null);
  clearReviewMemory();
  const { ctx, handlers, asks } = mockCtx(['cancelled', 'allowed-once']);
  apply(ctx);
  const o1 = await handlers['tools/pre-execute'](REVIEW(), next);
  assert.equal(o1.kind, 'deny', '待议 ⇒ 本轮不执行');
  assert.match(o1.reason, /待议/, '回执须写"待议"，不得冒充拒绝');
  assert.doesNotMatch(o1.reason, /委托人裁决/, '待议 ≠ 拒绝：不得打上拒绝标签');
  const o2 = await handlers['tools/pre-execute'](REVIEW(), next);
  assert.equal(asks.length, 2, '待议不进冷却 ⇒ 下次同类仍须再问（人还没裁决）');
  assert.equal(o2, 'NEXT');
});

test('对照：不答（unavailable）⇒ fail-closed，与 0.2.14 静默一致', async () => {
  setPrincipalScope(null);
  clearReviewMemory();
  const { ctx, handlers } = mockCtx(['unavailable']);
  apply(ctx);
  const o = await handlers['tools/pre-execute'](REVIEW(), next);
  assert.equal(o.kind, 'deny');
  assert.doesNotMatch(o.reason, /待议/, '无人应答 ≠ 待议（一个是没通道，一个是人挂起）');
});
