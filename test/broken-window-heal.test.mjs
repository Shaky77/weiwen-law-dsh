// broken-window-heal.test.mjs — 破窗复位（宿主侧结构入口）的结构回归锁（2026-09-21）
// ---------------------------------------------------------------------------
// 被锁定的结构：**破窗不是会话死锁** —— 止损态必须有一条从外部（宿主机）复位它的线。
//
// 为什么这条线必须有（结构理由，不是便利功能）：
//   破窗一旦成立，`pre-execute` 拒绝**一切**调用 —— **连同"修复动作本身"** ⇒ 宿主侧若无复位入口，
//   破窗即会话级死锁（唯一出路＝重启进程）。引擎里 `healWindow()` 早已存在，但只经
//   `resolveBug()`（闭环验证通过）到达，而它在 DSH 会话里不由被审计的模型触达 ⇒ 缺的是**线**，
//   不是**能力**。
//
// 结构纪律（本组同时锁住的第二条）：
//   · 复位入口是**模块级 API，不是工具** ⇒ 模型调不到 ⇒ **结构上不可能自我解锁**
//     （与 `setPrincipalScope` 同源：主体分离由位置保证，不靠内容判别）。
//   · 复位必须**如实记数**（先读复位前状态再治）——报告不得把"没破的"也算成"治过的"。
import test from 'node:test';
import assert from 'node:assert/strict';
import { apply, healBrokenWindow } from '../src/index.js';

function mockCtx() {
  const handlers = {};
  const tools = [];
  const ctx = {
    on: (ev, cb) => { handlers[ev] = cb; },
    tools: { register: (t) => { tools.push(t); } },
  };
  return { ctx, handlers, tools };
}

const exec = (name, args) => ({ token: 't', callId: 'c1', name, arguments: args, signal: null });
const badReceipt = (t = 'prior failure') => ({ content: [{ type: 'text', text: t }], isError: true, error: { message: t } });
const NEXT = 'NEXT';
const next = async () => NEXT;
const toolNamed = (tools, n) => tools.find((t) => t.name === n);
const accrueFailures = (handlers, n) => { for (let i = 0; i < n; i += 1) handlers['tools/result'](exec('read', {}), badReceipt()); };
const streakOf = async (tools) => (await toolNamed(tools, 'query_steady_state').execute({}, {})).failureStreak;
const probeCall = () => exec('read', { file_path: '/tmp/ok.txt' });   // 无害调用：唯一可能被拒的理由只有破窗

// 这一条先跑：到此刻为止本进程内不应有任何实例处于破窗态（后面的用例自会制造，并各自收尾）。
test('复位如实记数：无实例破窗时 wereBroken = 0（不虚报"治了"）', () => {
  const rec = healBrokenWindow('自检：此刻不应有实例处于破窗态');
  assert.equal(rec.kind, 'heal-window');
  assert.equal(rec.wereBroken, 0, '未破窗不得报成治好（先读后治）');
  assert.equal(rec.note, '自检：此刻不应有实例处于破窗态', '复位必须留痕（何时因何解除）');
});

test('破窗成立 ⇒ pre-execute 拒绝一切调用；宿主复位后同一调用被放行（止损不是死锁）', async () => {
  const { ctx, handlers, tools } = mockCtx();
  apply(ctx);
  accrueFailures(handlers, 5);   // 偏离累积 = cap
  assert.equal(await streakOf(tools), 5, '入账走公开钩子面（按契约参数位）');

  const denied = await handlers['tools/pre-execute'](probeCall(), next);
  assert.equal(denied?.kind, 'deny', '破窗成立后未达终局的调用必须在执行前被拒');
  assert.ok(String(denied.reason).includes('破窗'), '拒绝理由须点名破窗止损（可归因，不是笼统 deny）');

  const rec = healBrokenWindow('故障已修好并通过验证（测试）');
  assert.ok(rec.wereBroken >= 1, '复位报告须承认此前确有实例在破窗态');

  const released = await handlers['tools/pre-execute'](probeCall(), next);
  assert.equal(released, NEXT, '复位后必须真的放行——否则破窗即会话级死锁，无从修复');

  const cleared = await streakOf(tools);
  assert.equal(cleared, 0, '复位须归零累积（真解除窗口，而不是只改一个读数）');
});

test('复位入口不是工具：模型面看不到它（结构入口 ≠ 工具面，自我解锁结构上不可能）', () => {
  const { ctx, tools } = mockCtx();
  apply(ctx);
  const leaked = tools.find((t) => t.name === 'healBrokenWindow' || t.name === 'heal_broken_window');
  assert.equal(leaked, undefined, '复位入口一旦成为工具，被审计方即可自我解锁');
});

test('复位留痕：同一入口多次调用持续可溯（不静默清空）', () => {
  healBrokenWindow('留痕自检 #1');
  const rec = healBrokenWindow('留痕自检 #2');
  assert.equal(rec.note, '留痕自检 #2');
  assert.ok(rec.at, '留痕须带时间（"何时解除的"必须查得出）');
});
