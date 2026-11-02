// 弹窗不得把裁决者本人冻住（安 10-29 实测：弹窗待裁期间连消息都发不出去）
// 修法：问有时限，到期撤问 ⇒ 落成待议（动作不执行、不是拒绝、不进冷却、人自由）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apply, setPrincipalScope, setReviewAskTimeout } from '../src/index.js';

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
        // 模拟宿主：人一直不答 ⇒ 尊重 abort 信号，抛 AbortError（契约：abort ⇒ settles 'cancelled'）
        if (script[i] === 'hang') {
          return new Promise((_res, rej) => {
            req.signal?.addEventListener?.('abort', () => {
              const e = new Error('The operation was aborted');
              e.name = 'AbortError';
              rej(e);
            });
          });
        }
        return script[i++] ?? 'unavailable';
      },
    } : undefined),
  };
  return { ctx, handlers, asks };
}
const next = async () => 'NEXT';
const exec = (name, args = {}, callId = 'c1') => ({ token: 't', callId, name, arguments: args, agent: 'main', signal: null });
const REVIEW = () => exec('write', { path: '/etc/hosts', content: '127.0.0.1 x' }, 'r' + Math.random());

test('弹窗带时限信号：请求里带 signal（宿主可撤问，人不必守着）', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, asks } = mockCtx(['allowed-once']);
  apply(ctx);
  await handlers['tools/pre-execute'](REVIEW(), next);
  assert.equal(asks.length, 1);
  assert.ok(asks[0].signal, '请求必须带 abort signal（撤问能力的前提）');
  assert.match(asks[0].reason, /不必一直守在这里|秒内不答/, '弹窗正文须告知时限与自动待议');
});

test('人一直不答 ⇒ 超时撤问 ⇒ 落成待议（不是拒绝、不进冷却）', async () => {
  setPrincipalScope(null);
  setReviewAskTimeout(60);   // 生产默认 120s；测试缩短（时限可注入）
  const { ctx, handlers } = mockCtx(['hang']);
  apply(ctx);
  const t0 = Date.now();
  const out = await handlers['tools/pre-execute'](REVIEW(), next);
  const dt = Date.now() - t0;
  assert.ok(dt < 5000, `须在时限内结束（实测 ${dt}ms），不得无限等待`);
  assert.equal(out.kind, 'deny', '未答 ⇒ 动作不执行');
  assert.match(out.reason, /待议/, '未答（超时撤问）⇒ 落成待议');
  assert.doesNotMatch(out.reason, /委托人裁决/, '待议不是拒绝');
  setReviewAskTimeout(120000);
});
