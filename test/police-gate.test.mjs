// 窗口警察门禁回归锁：证据不足（物证缺失）的调用 → 发回补充，不进引擎实质裁决。
// 只验证适配层门禁行为，零改动 engine.mjs 判据。
import test from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../src/index.js';

function mockCtx() {
  const handlers = {};
  const ctx = {
    on: (ev, cb) => { handlers[ev] = cb; },
    tools: { register: () => {} },
  };
  return { ctx, handlers };
}

test('policeGate: 物证缺失（rm -rf 无参）→ 发回补充', async () => {
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  const out = await handlers['tools/pre-execute'](
    { name: 'run_command', arguments: { command: 'rm -rf' } },
    async () => 'NEXT',
  );
  assert.equal(out.kind, 'deny');
  assert.equal(out.awaitingHuman, true);
  assert.equal(out.insufficient_evidence, true);
  assert.match(out.reason, /证据不足/);
  assert.match(out.reason, /发回补充/);
});

test('policeGate: 结构化空 path（fs_delete{path:""}）→ 发回补充', async () => {
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  const out = await handlers['tools/pre-execute'](
    { name: 'fs_delete', arguments: { path: '' } },
    async () => 'NEXT',
  );
  assert.equal(out.insufficient_evidence, true);
  assert.equal(out.awaitingHuman, true);
});

test('policeGate: 物证具在且越界（rm -rf /）→ 放行给引擎 R 锚点判 deny（非证据不足）', async () => {
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  const out = await handlers['tools/pre-execute'](
    { name: 'run_command', arguments: { command: 'rm -rf /' } },
    async () => 'NEXT',
  );
  assert.notEqual(out.insufficient_evidence, true);
  assert.equal(out.kind, 'deny');
});

// [2026-09-20 判据变更 · 扣子 coze/51 方向 · 同构回填] 本测试原锁「证据齐备且在界内 ⇒ 直接放行」。
//   新增判据「**scar 类（不可逆）动作 + 无法归属到任何已声明锚 ⇒ REVIEW**」后本 case 结果变了：
//   窗口面调用 engine 时**不透传言**（index.js: engine.decideToolCall(call)，无 utterance）⇒ 无锚可归
//   ⇒ 不可逆删除交人工。**门禁自身的证据判定没变**（它并不判"证据不足"），变的是不可逆动作的缺省去向。
test('policeGate: 物证具在且无越界（rm -rf /tmp/…）→ 证据判定不变；按新判据（痕锚归属）交人工挂起', async () => {
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  let calledNext = false;
  const out = await handlers['tools/pre-execute'](
    { name: 'run_command', arguments: { command: 'rm -rf /tmp/workspace/output/*' } },
    async () => { calledNext = true; return 'NEXT'; },
  );
  assert.equal(calledNext, false);
  assert.notEqual(out.insufficient_evidence, true); // 不是"证据不足"——门禁的证据维度没动
  assert.equal(out.kind, 'deny');                   // 对外语义钉 deny（宿主契约只认 deny/next）
  assert.equal(out.awaitingHuman, true);            // 但这是"挂起等裁决"，非终局拒绝
  assert.match(out.reason, /锚|不可逆/);
});

test('policeGate: 无资源字段的查询类调用（args 空）→ 不误伤，放行给引擎', async () => {
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  let calledNext = false;
  const out = await handlers['tools/pre-execute'](
    { name: 'query_steady_state', arguments: {} },
    async () => { calledNext = true; return 'NEXT'; },
  );
  assert.equal(calledNext, true);
  assert.equal(out, 'NEXT');
});
