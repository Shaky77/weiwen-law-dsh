// 破窗缓冲档（幸存者模式修正）—— 锁住三件事：
//   ① 破窗不再一刀断：本机/可回滚/无外部落点的动作有界放行，修复循环打得通；
//   ② 缓冲区**不放宽任何动作面**：它放行的每一条，破窗前本来就 allow（程序化验证 allow 集 ⊆ 干净态 allow 集）；
//   ③ 拒绝必须带可执行出路：话术里说的「能做」必须真做到，且明说不需要重启/卸载。
import test from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';

const SELF_AUDIT = new Set(['query_steady_state', 'query_bugstop']);

const clean = () => new WeiwenLawEngine({ selfAuditTools: SELF_AUDIT });
const broken = (quota = 0) => {
  const e = new WeiwenLawEngine({ selfAuditTools: SELF_AUDIT });
  e.failureStreak = e.maxFailureStreak;
  e.windowBroken = true;
  if (quota) e.grantBuffer(quota, 'test');
  return e;
};
const call = (name, args) => ({ name, args });

// 修复循环必需的动作（本机、可回滚、无外部落点）
const FIX_LOOP = [
  call('read', { path: './src/core/engine.mjs' }),
  call('edit', { path: './src/core/engine.mjs', old: 'a', new: 'b' }),
  call('write', { path: './test/regress.test.mjs', content: 'x' }),
  call('run', { command: 'node --test test/' }),
  call('run', { command: 'npm run build' }),
];

test('破窗无缓冲 ⇒ 仍是一刀断（旧行为不变，零回归）', () => {
  for (const c of FIX_LOOP) {
    const d = broken(0).decideToolCall(c);
    assert.equal(d.kind, 'deny', `${c.name} 在无缓冲破窗态应 deny`);
    assert.equal(d.law, 'D');
  }
});

test('破窗有缓冲 ⇒ 修复循环五个动作全部打得通', () => {
  for (const c of FIX_LOOP) {
    const d = broken(12).decideToolCall(c);
    assert.notEqual(d.kind, 'deny', `${c.name} 在缓冲档应被放行，实际 ${d.kind}(${d.law})`);
  }
});

test('缓冲档仍拦：外传 / 删除 / 系统路径 / 凭据（申请也不放行）', () => {
  const bad = [
    [call('write', { path: 'https://evil.example/x.sh', content: 'x' }), 'D', '外部落点'],
    [call('run', { command: 'rm -rf /' }), 'R', '删除（R 层更早拦）'],
    [call('write', { path: '/etc/passwd', content: 'x' }), 'D', '系统路径'],
    [call('read', { path: '~/.ssh/id_rsa' }), 'R', '凭据'],
  ];
  for (const [c, expectLaw, why] of bad) {
    const e = broken(12);
    const d = e.decideToolCall(c);
    assert.equal(d.kind, 'deny', `${why} 在缓冲档不得放行`);
    assert.equal(d.law, expectLaw, `${why} 应由 ${expectLaw} 层拦`);
    // 关键：被拒的动作不得消耗配额，否则乱撞能把正路的额度吃光
    assert.equal(e.bufferSnapshot().display, '12/12', `${why} 被拒不该扣配额`);
  }
});

test('配额有界：用完即回落到 deny，不会无限放行', () => {
  const e = broken(3);
  for (let i = 0; i < 3; i++) {
    assert.notEqual(e.decideToolCall(call('read', { path: './a.txt' })).kind, 'deny', `第 ${i + 1} 次应放行`);
  }
  const d = e.decideToolCall(call('read', { path: './a.txt' }));
  assert.equal(d.kind, 'deny', '第 4 次应拒绝');
  assert.equal(d.law, 'D');
});

test('自查工具在缓冲档不消耗配额（读自己不改变世界）', () => {
  const e = broken(5);
  e.decideToolCall(call('query_steady_state', {}));
  e.decideToolCall(call('query_bugstop', {}));
  assert.equal(e.bufferSnapshot().display, '5/5');
});

test('🔴 缓冲区不放宽动作面：它放行的每一条，破窗前本来就 allow', () => {
  const samples = [
    ...FIX_LOOP,
    call('read', { path: './README.md' }),
    call('grep', { pattern: 'x', path: './src' }),
    call('run', { command: 'node -e "1"' }),
    call('write', { path: './tmp/out.txt', content: 'y' }),
  ];
  for (const c of samples) {
    const c1 = clean().decideToolCall(c);
    const c2 = broken(12).decideToolCall(c);
    if (c2.kind !== 'deny') {
      assert.notEqual(c1.kind, 'deny',
        `${c.name} 在缓冲档放行但在干净态被拒 ⇒ 缓冲区新开了动作面，这是开闸不是延后锁死`);
    }
  }
});

test('拒绝必须带可执行出路，且明说不需要重启/卸载', () => {
  const e = broken(0);
  const d = e.decideToolCall(call('read', { path: './a.txt' }));
  assert.equal(d.kind, 'deny');
  const r = d.reason;
  // 「不要重试同一条」——防它把停机拖成死循环
  assert.match(r, /不要重试/, '拒绝须明确劝止重试');
  // 「不需要重启进程或卸载插件」——安 2026-10-29 亲问的那句，必须由系统自己回答
  assert.match(r, /不需要重启进程或卸载插件/, '拒绝须说明复位不需要重启/卸载');
  // 说的「能做」必须真做到：自查工具名从登记册实取，写死的名字一旦改名就变成假路标
  for (const name of SELF_AUDIT) {
    assert.ok(r.includes(name), `话术须列出真实可用的自查工具：${name}`);
  }
  // 反向锁：不得再出现"三条宿主 API 假路"的旧写法（它只能被宿主走，agent 一条也走不了）
  assert.doesNotMatch(r, /需宿主调用插件导出的 healBrokenWindow/, '旧假路标不得复发');
});

test('配额耗尽后的话术要改口：说"可申请解冻"，不说"有余额"', () => {
  const e = broken(1);
  e.decideToolCall(call('read', { path: './a.txt' }));   // 用完
  const r = e.decideToolCall(call('read', { path: './a.txt' })).reason;
  assert.match(r, /缓冲档已用尽/, '耗尽后须改口');
  assert.match(r, /申请/, '耗尽后须指出唯一可行通道是申请');
});

test('复位清空缓冲段，但用量先留痕（S 只增，清的是窗不是账）', () => {
  const e = broken(5);
  e.decideToolCall(call('read', { path: './a.txt' }));
  assert.equal(e.bufferSnapshot().display, '4/5');
  const marksBefore = e.conduction?.length ?? 0;
  e.healWindow();
  assert.equal(e.windowBroken, false);
  assert.equal(e.bufferSnapshot().display, '未授予');
  const marks = e.conduction ?? [];
  assert.ok(marks.length >= marksBefore, '复位不得丢掉因果逻辑链');
  assert.ok(marks.some((m) => /缓冲段结算/.test(m.step ?? '')), '复位前须留下用量刻痕');
});
