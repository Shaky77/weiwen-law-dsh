// receipt-gate.test.mjs — 回执闸门（tools/post-execute）的结构回归锁（2026-09-21）
// ---------------------------------------------------------------------------
// 被锁定的结构：**第三个真能拦的门位置在回执侧**（不是"再拦一次"，是断点的落点）。
//
// 为什么回执门必须存在（结构理由，dsh 源码级核验 2026-09-21）：
//   失败入账发生在回执**之后**（tools/result 审计钩子）；而**破窗一旦成立，后续调用在
//   pre-execute 即被拒、根本走不到回执** ⇒ 回执侧只有"把偏离累积推达阈值的那一次失败"
//   有机会说话。此后它结构上沉默（窗口已关）——照只读检查写，门就是死代码，本组即锁这个"必须投影"。
//
// 宿主契约（读 dsh-tools 源，非推测）：
//   · 覆盖：`ToolRegistry.postExecute` 对每个未成终局的 execution 派发，原话
//     "Tool and unknown-tool failures still receive post-execute" ⇒ 失败调用照样过门。
//   · 裁决被消费：`{kind:'block', feedback}` ⇒ 宿主以 `isError` 返回该调用，content 换成 feedback
//     （dsh-tools/lib/index.js · postExecute）。
//   · 监听器抛错会让整个调用变 error ⇒ 门必须 fail-open（本组锁"抛错即 accept"）。
//
// fail-open 边界（本组最要紧的一条）：**只对已经失败的回执施加裁决**；
//   成功结果一律原样透传 ⇒ 误判永远不会把健康结果变成错误。
import test from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../src/index.js';
import { WeiwenLawEngine, DEFAULT_RIGID_ANCHORS } from '../src/core/engine.mjs';

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
const okReceipt = (t = 'done') => ({ content: [{ type: 'text', text: t }], isError: false });
const badReceipt = (t = 'ENOENT: no such file or directory') => ({ content: [{ type: 'text', text: t }], isError: true, error: { message: t } });
const NEXT = 'NEXT';
const next = async () => NEXT;
const toolNamed = (tools, n) => tools.find((t) => t.name === n);
// 失败入账走插件自己的公开钩子面（tools/result 审计钩子调 engine.onFailure）——
// 不为测试开后门、不加 API。
// 失败入账走插件自己的公开钩子面（tools/result 审计钩子调 engine.onFailure）——
// 按**宿主契约的参数位**传 (exec, result)：真机抓到过"把 exec 当 result 读 ⇒ 入账静默失效"的回归。
const accrueFailures = (handlers, n) => { for (let i = 0; i < n; i += 1) handlers['tools/result'](exec('read', {}), badReceipt('prior failure')); };
const streakOf = async (tools) => (await toolNamed(tools, 'query_steady_state').execute({}, {})).failureStreak;

// ───────────────────────── 引擎侧：投影读数 ─────────────────────────

test('breakAtReceipt：偏离未达阈值 ⇒ 返回空（门不得拦）', () => {
  const e = new WeiwenLawEngine({ rigidAnchors: DEFAULT_RIGID_ANCHORS });
  assert.equal(e.breakAtReceipt(), null);
  for (let i = 0; i < 3; i += 1) e.onFailure();
  assert.equal(e.breakAtReceipt(), null, '阈值 5、当前 3 ⇒ 投影 4 < 5，不得触发');
});

test('breakAtReceipt：本次失败将把累积推达阈值 ⇒ 返回投影值（streak 含本次）', () => {
  const e = new WeiwenLawEngine({ rigidAnchors: DEFAULT_RIGID_ANCHORS });
  for (let i = 0; i < 4; i += 1) e.onFailure();
  const bw = e.breakAtReceipt();
  assert.ok(bw, '将达阈值时必须有读数，否则门在唯一能说话的时刻是哑的');
  assert.equal(bw.broken, false);
  assert.equal(bw.cap, 5);
  assert.equal(bw.streak, 5, 'streak 是**投影值**（当前 4 + 本次），不是当前值');
});

test('breakAtReceipt：累积已达阈值 ⇒ 读数标记 broken（判据与 checkBreakWindow 同源）', () => {
  // 本侧没有 windowBroken 状态字段（破窗只由 failureStreak 累积达成）——原实现读该字段 ⇒ 分支恒不
  //   成立，于是"已在破窗态"被报成「即将达阈值（6/5）」：止损早已生效，却描述成尚未发生。
  const e = new WeiwenLawEngine({ rigidAnchors: DEFAULT_RIGID_ANCHORS });
  for (let i = 0; i < 5; i += 1) e.onFailure();
  const bw = e.breakAtReceipt();
  assert.ok(bw, '已达阈值必须有读数');
  assert.equal(bw.broken, true, '窗口已在效，不得再报"即将达阈值"');
  assert.equal(bw.streak, 6, '投影值 = 已累积 5 + 本次 1（读数如实，不美化）');
});

test('breakAtReceipt 是纯读：不写 failureStreak（判据单点在引擎，不在适配层复制阈值比较）', () => {
  const e = new WeiwenLawEngine({ rigidAnchors: DEFAULT_RIGID_ANCHORS });
  for (let i = 0; i < 5; i += 1) e.onFailure();   // 已在破窗态
  e.breakAtReceipt();
  e.breakAtReceipt();
  assert.equal(e.failureStreak, 5, '投影不得入账（入账仍归 onFailure / tools/result）');
  const f = new WeiwenLawEngine({ rigidAnchors: DEFAULT_RIGID_ANCHORS });
  for (let i = 0; i < 4; i += 1) f.onFailure();
  f.breakAtReceipt();
  assert.equal(f.failureStreak, 4, '读数不得改变累积');
});

// ───────────────────────── 适配层：门的行为 ─────────────────────────

test('成功回执原样透传：不替换 content、不施加裁决（fail-open 边界）', async () => {
  const { ctx, handlers, tools } = mockCtx();
  apply(ctx);
  const before = await streakOf(tools);
  const out = await handlers['tools/post-execute'](exec('run_task', { command: 'ls /tmp' }), okReceipt(), next);
  assert.equal(out, NEXT, '成功结果不得被改写');
  assert.equal(await streakOf(tools), before, '门是纯读：不动状态');
});

test('失败但未达阈值：放行原回执（不把每次普通报错都变成纠错回执）', async () => {
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  accrueFailures(handlers, 2);   // 累积 2，投影 3 < 5
  const out = await handlers['tools/post-execute'](exec('run_task', { command: 'cat /nope' }), badReceipt(), next);
  assert.equal(out, NEXT, '未达阈值不得阻断（否则普通报错被误当断点）');
});

test('阈值将达：回执被断成纠错错误，且原文与 BUG 身份一并带过（证据不得被毁）', async () => {
  const { ctx, handlers, tools } = mockCtx();
  apply(ctx);
  accrueFailures(handlers, 4);   // 累积 4，投影 5 = cap
  const before = await streakOf(tools);
  const receipt = badReceipt('EACCES: permission denied, open /etc/shadow');
  const out = await handlers['tools/post-execute'](exec('run_task', { command: 'cat /etc/shadow' }), receipt, next);
  assert.equal(out.kind, 'block', '断点必须落在回执上（这是框架还能说话的最后时刻）');
  assert.equal(out.law, 'D');
  assert.ok(Array.isArray(out.feedback) && out.feedback.length >= 2, 'feedback 必须是 ContentBlock[]');
  assert.equal(out.feedback[0].type, 'text');
  const joined = out.feedback.map((b) => b.text).join('\n');
  assert.ok(joined.includes('EACCES: permission denied'), '原文必须随 feedback 带过（宿主会用 feedback 替换 content）');
  assert.ok(joined.includes('反推') && joined.includes('溯源'), 'M 闭环语义：重入前须 反推→溯源→修复');
  assert.ok(joined.includes(out.bugKey), 'BUG 身份可追溯');
  assert.equal(out.closedLoop, true);
  assert.equal('value' in out, false, 'block 不得携带 value');
  assert.equal('content' in out, false, 'block 只认 feedback');
  assert.equal(await streakOf(tools), before, '门的裁决不改状态（入账仍归 tools/result）');
});

test('结构化失败标记：仅有 error 对象（无 isError）也算失败回执', async () => {
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  accrueFailures(handlers, 4);
  const out = await handlers['tools/post-execute'](
    exec('run_task', {}),
    { content: [{ type: 'text', text: 'boom' }], error: { message: 'boom' } },   // 无 isError
    next,
  );
  assert.equal(out.kind, 'block', '失败判定读宿主的结构标记，不做文本匹配');
});

test('fail-open：门内任何异常 ⇒ accept，绝不把健康调用弄成 error', async () => {
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  accrueFailures(handlers, 4);
  const hostile = {
    isError: true,
    get content() { throw new Error('hostile result'); },   // 读取即抛
  };
  const out = await handlers['tools/post-execute'](exec('run_task', {}), hostile, next);
  assert.equal(out, NEXT, '抛错必须降级为 accept（能把运行弄坏的门比没有门更坏）');
});

test('契约稳健：宿主未传 next ⇒ 也返回合法裁决（不得返回 undefined）', async () => {
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  const out = await handlers['tools/post-execute'](exec('run_task', {}), okReceipt());   // 无 next
  assert.equal(out.kind, 'accept', 'waterfall 监听器不得返回 undefined');
});

// ───────── 位置即契约：真机抓到的入账静默失效（本组防它复发） ─────────
// 症状：单测全绿，真机上 5 次失败回执一次都没被拦。根因＝审计钩子写成 `(res) => res?.error`，
//   而宿主契约是 `tools/result(exec, result)` ⇒ 读到的其实是 exec ⇒ `onFailure()` 从未执行 ⇒
//   回执门的只读投影永远读到 failureStreak = 0 ⇒ 门在真机上哑掉。
// ⇒ 教训与"锚源"同一条：**位置量是结构量，位置错了不能靠内容兜**。故锁"位置错即不认"。

test('审计钩子按宿主契约读第二个参数：result 在第二位才入账', async () => {
  const { ctx, handlers, tools } = mockCtx();
  apply(ctx);
  handlers['tools/result'](exec('read', {}), badReceipt('boom'));   // 契约形状
  assert.equal(await streakOf(tools), 1, '入账必须真的发生（否则回执门在真机上是哑的）');
});

test('位置错即不认：result 被塞进第一位不得入账（不为旧错法留垫片）', async () => {
  const { ctx, handlers, tools } = mockCtx();
  apply(ctx);
  handlers['tools/result']({ error: { message: 'boom' } }, undefined);   // 旧错法的形状
  assert.equal(await streakOf(tools), 0, '位置错不得被"参数里恰好有 error"兜住：位置判据≠内容判据');
});

test('成功回执不入账：审计钩子只看失败信号', async () => {
  const { ctx, handlers, tools } = mockCtx();
  apply(ctx);
  handlers['tools/result'](exec('read', {}), okReceipt('fine'));
  assert.equal(await streakOf(tools), 0);
});
