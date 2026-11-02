// review-popup.test.mjs — review 出口接审批通道（弹窗）的结构回归锁（2026-10-29 · 安拍板）
// ---------------------------------------------------------------------------
// 被锁定的结构（＝小D 27 实测缺口的修复）：
//   ① 引擎判得出「不确定」（review 判决），适配层不再把它压平成静默 deny——
//      有 approval 服务的宿主上，review 必须经人类裁决（弹窗三样：谁拒的 / 为什么 / 你能做的那一步）。
//   ② 该静默的仍静默（对照组）：deny（确定性判决）永不弹；破窗态不弹；无 approval 服务 /
//      无 agent 上下文 / 审批异常 ⇒ 行为与 0.2.14 逐位一致（零回归）。
//   ③ 语义边界：allowed-once 的 "once" ＝ 这一次调用（动作级，下次同 call 重新问）——
//      与缓冲档的 "批状态" 正交；rejected 是终局 deny 且带委托人裁决标注；冷却期内不重复骚扰。
//   ④ 审计：放行/拒绝都留 runtime.log 白箱痕；批准不进 blocked 集合（回执是真结果，不是"我造成的 error"）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { apply, setPrincipalScope } from '../src/index.js';

const exec = (name, args) => ({ token: 't', callId: 'c1', name, arguments: args, agent: 'main', signal: null });
const next = async () => 'NEXT';

// 无 approval 服务的宿主（= 0.2.14 现状，对照组基准）
function mockCtxPlain() {
  const handlers = {};
  const ctx = {
    on: (ev, cb) => { handlers[ev] = cb; },
    tools: { register: () => {} },
  };
  return { ctx, handlers };
}

// 带 approval 服务的宿主：scripted 逐次返回预设裁决
function mockCtxWithApproval(script) {
  const handlers = {};
  const asks = [];
  let i = 0;
  const approval = {
    request: async (req) => {
      asks.push(req);
      const v = script[Math.min(i, script.length - 1)];
      i += 1;
      if (v instanceof Error) throw v;
      return v;
    },
  };
  const ctx = {
    on: (ev, cb) => { handlers[ev] = cb; },
    tools: { register: () => {} },
    get: (name) => (name === 'approval' ? approval : undefined),
  };
  return { ctx, handlers, asks };
}

// 触发 review 的 call：不可逆动作无授权锚 ⇒ 引擎判「交人工」（awaitingHuman）
const REVIEW_CALL = ['run_task', { command: 'rm -rf /app/tmp/*' }];
// 确定性 deny 的 call：凭据读 ⇒ R 层硬拦（对照组用）
const DENY_CALL = ['read', { path: '~/.ssh/id_rsa' }];

test('🔴 对照组：无 approval 服务 ⇒ review 仍静默 deny（与 0.2.14 逐位一致，零回归）', async () => {
  setPrincipalScope(null);
  const { ctx, handlers } = mockCtxPlain();
  apply(ctx);
  const out = await handlers['tools/pre-execute'](exec(...REVIEW_CALL), next);
  assert.equal(out.kind, 'deny', '无审批面 ⇒ 静默压平（fail-closed）');
  assert.equal(out.awaitingHuman, true, '挂起语义保留（awaitingHuman 是 0.2.14 已有行为）');
});

test('🔴 对照组：确定性 deny（R 层凭据读）永不弹窗', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, asks } = mockCtxWithApproval(['allowed-once']);
  apply(ctx);
  const out = await handlers['tools/pre-execute'](exec(...DENY_CALL), next);
  assert.equal(out.kind, 'deny');
  assert.equal(out.law, 'R');
  assert.equal(asks.length, 0, '判了但拒的判决不走弹窗——弹窗只服务「判不出」，不给确定性 deny 翻案');
});

test('review + 委托人允许 ⇒ 放行这一次（next 被调）', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, asks } = mockCtxWithApproval(['allowed-once']);
  apply(ctx);
  const out = await handlers['tools/pre-execute'](exec(...REVIEW_CALL), next);
  assert.equal(out, 'NEXT', 'allowed-once ⇒ 放行这一步');
  assert.equal(asks.length, 1);
});

test('弹窗带三样：谁拒的（law）/ 为什么（reason 原文）/ 你能做的那一步（允许与拒绝选项）', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, asks } = mockCtxWithApproval(['rejected']);
  apply(ctx);
  await handlers['tools/pre-execute'](exec(...REVIEW_CALL), next);
  assert.equal(asks.length, 1);
  const reason = asks[0].reason;
  // [2026-10-29 · 弹窗精炼后文案更新] 语义锁不变（授权请求/判决性质/两个选项/粒度/审计），
  //   只是标题从「需要你的裁决」改为「待裁」，判据原文改为一行摘要 + 指向白箱。
  assert.match(reason, /授权请求/, '弹窗须标明这是授权请求而非通知');
  assert.match(reason, /谁批谁担|归你，不归 AI/, '须说明判决性质（判不出，交人类裁决）——精炼后由第二行承担（第一行只说后果）');
  assert.match(reason, /允许/, '须给出「允许」选项');
  assert.match(reason, /拒绝/, '须给出「拒绝」选项');
  assert.match(reason, /只放行这一次/, '须写明批准的动作粒度（动作级 once）');
  assert.match(reason, /审计/, '须告知决定进审计对，可回放');
});

test('review + 委托人拒绝 ⇒ 终局 deny，标注委托人裁决（不再是 awaitingHuman 挂起态）', async () => {
  setPrincipalScope(null);
  const { ctx, handlers } = mockCtxWithApproval(['rejected']);
  apply(ctx);
  const out = await handlers['tools/pre-execute'](exec(...REVIEW_CALL), next);
  assert.equal(out.kind, 'deny');
  assert.match(out.reason, /\[委托人裁决\] 不同意执行本次调用/, '拒绝须标注是人类裁决，不是引擎自判');
  assert.notEqual(out.awaitingHuman, true, 'rejected 是终局，不得再标挂起');
});

test('🔴 对照组：审批服务抛异常 ⇒ fail-closed 静默 deny（不炸管线）', async () => {
  setPrincipalScope(null);
  const { ctx, handlers } = mockCtxWithApproval([new Error('approval service exploded')]);
  apply(ctx);
  const out = await handlers['tools/pre-execute'](exec(...REVIEW_CALL), next);
  assert.equal(out.kind, 'deny', '审批通道故障 ⇒ 与无服务同款静默压平');
  assert.equal(out.awaitingHuman, true);
});

test('once 语义：allowed-once 只管这一次调用，下一次同 call 重新问', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, asks } = mockCtxWithApproval(['allowed-once']);
  apply(ctx);
  const e1 = { ...exec(...REVIEW_CALL), callId: 'c1' };
  const e2 = { ...exec(...REVIEW_CALL), callId: 'c2' };
  assert.equal(await handlers['tools/pre-execute'](e1, next), 'NEXT', '第一次：放行');
  assert.equal(await handlers['tools/pre-execute'](e2, next), 'NEXT', '第二次：重新问、人再批、再放行');
  assert.equal(asks.length, 2, '两次调用两次询问——动作级授权不得沉淀成永久豁免');
});

// ⚠️ 结构事实（2026-10-29 probe 实测，防将来误判）：
//   windowBroken=true 只由 R 投影累积路径设置（engine L2391）；onFailure 只加 failureStreak 不设旗标。
//   ⇒ "streak 超阈但未正式破窗"（onFailure 路径）时缓冲档在效、windowBroken=false，review 弹窗**会**出现——
//     这是设计意图不是 bug：review ＝ 判不出交人类，弹窗正是「接通回站」；
//     真 windowBroken=true（R 投影累积）才走 fail-closed 压平（本测试所锁）。

test('🔴 对照组：真破窗态（R 投影累积）下 review 不弹（止损不得被弹窗旁路）', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, asks } = mockCtxWithApproval(['allowed-once']);
  apply(ctx);
  // 构造真 windowBroken：同类 R 层违规连续 5 次 ⇒ _bucketRHit 同层累积达阈值 ⇒ 窗口旗标置真
  // （onFailure 只加 streak 不设旗标，故不能用 tools/result 喂——必须走 R 命中路径）
  for (let i = 0; i < 6; i++) {
    await handlers['tools/pre-execute']({ ...exec(...DENY_CALL), callId: 'v' + i }, next);
  }
  const n = asks.length;
  const out = await handlers['tools/pre-execute'](exec(...REVIEW_CALL), next);
  // 破窗态下该 call：deny(D) → 缓冲档解冻询问（合法，话术含「请求解冻」）→ 人批准 → 重判 → R 层仍拦
  assert.equal(out.kind, 'deny', '破窗态下最终仍拦');
  assert.equal(out.law, 'R', '解冻只开 D 门：不可逆删除重判后仍被 R 层拦（缓冲不放宽 R 层）');
  // 本测试核心锁：全程不得出现 review 授权弹窗（话术含「需要你的裁决」）——止损态 fail-closed
  assert.equal(asks.filter((a) => /需要你的裁决/.test(a.reason)).length, 0,
    '真破窗态下 review 授权弹窗不得出现（被压平分支接住，与 0.2.14 一致）');
  assert.ok(n >= 0);   // 解冻询问可存在，不计入本断言
});

// ⚠️ 冷却期测试必须放最后：_reviewRefusedAt 是模块级状态，rejected 后 5 分钟内同进程不再弹
test('冷却期：rejected 后的同类 review 不再弹窗（不骚扰），但回执必须点名「沿用你上一次的裁决」', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, asks } = mockCtxWithApproval(['rejected', 'allowed-once']);
  apply(ctx);
  const e1 = { ...exec(...REVIEW_CALL), callId: 'r1' };
  const e2 = { ...exec(...REVIEW_CALL), callId: 'r2' };
  await handlers['tools/pre-execute'](e1, next);
  assert.equal(asks.length, 1);
  const out2 = await handlers['tools/pre-execute'](e2, next);
  assert.equal(out2.kind, 'deny', '冷却期内第二个同类 review 直接 deny（不打扰）');
  assert.equal(asks.length, 1, '冷却期内不再发起询问');
  // [2026-10-29 语义澄清] 冷却期内是「已有裁决」而非「待裁」⇒ awaitingHuman=false（终局）；
  //   但沉默必须归因——回执要点名沿用了谁的决定、多久以前（否则委托人以为"我都点同意了"）。
  assert.ok(!out2.awaitingHuman, '冷却期内沿用既有裁决 ⇒ 终局，不是挂起（字段不置位即非挂起）');
  assert.match(out2.reason, /沿用你上一次的裁决/, '沉默必须看得见：回执须点名沿用了上次的裁决');
  assert.match(out2.reason, /分钟前/, '回执须给出时间上下文，可回溯');
});

test('🔴 冷却键按裁决对象分置：拒绝 A 类后，B 类仍须弹窗（旧实现全局一把锁 ⇒ 连坐）', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, asks } = mockCtxWithApproval(['rejected', 'allowed-once']);
  apply(ctx);
  const a = { ...exec(...REVIEW_CALL), callId: 'a1' };
  await handlers['tools/pre-execute'](a, next);              // A 类：拒绝 ⇒ 进入 A 类冷却
  assert.equal(asks.length, 1);
  // B 类：不同工具/落点 ⇒ 裁决对象不同 ⇒ 不得被 A 类的冷却连坐（旧实现全局锁会把它一起静默拒）。
  // 选一个**会产生 review** 的 B 类（写 /etc/hosts ⇒ 推演中风险 review），否则测不到「弹不弹」。
  const b = { ...exec('write', { path: '/etc/hosts', content: '127.0.0.1 x' }), callId: 'b1' };
  const before = asks.length;
  const outB = await handlers['tools/pre-execute'](b, next);
  assert.doesNotMatch(String(outB?.reason ?? ''), /沿用你上一次的裁决/, 'B 类不得被 A 类的冷却连坐');
  assert.equal(asks.length, before + 1, 'B 类判不出 ⇒ 仍须弹窗（裁决权不因别处被拒而消失）');
});
