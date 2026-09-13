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

test('policeGate: 物证具在且无越界（rm -rf /tmp/x）→ 放行（next）', async () => {
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  let calledNext = false;
  const out = await handlers['tools/pre-execute'](
    { name: 'run_command', arguments: { command: 'rm -rf /tmp/workspace/output/*' } },
    async () => { calledNext = true; return 'NEXT'; },
  );
  assert.equal(calledNext, true);
  assert.equal(out, 'NEXT');
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
