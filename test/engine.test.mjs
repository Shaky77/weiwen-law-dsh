// 唯稳律引擎单测（node --test）
// 验证 R/D/S/H/M 全部裁决路径与 S 单调性/木桶，确定性、零依赖、不烧 Key。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';

// ---------------- S 稳态储备：双重属性（时间刻痕不可逆 + 当前值可升降） ----------------
test('S 拒绝负 positive 增量，历史刻痕只增不减', () => {
  const e = new WeiwenLawEngine();
  assert.equal(e.effectiveS(), 0);
  e.recordSteady({ positive: 10 });
  assert.equal(e.effectiveS(), 10);
  e.recordSteady({ positive: -5 }); // 应被拒绝
  assert.equal(e.effectiveS(), 10);
  e.recordSteady({ positive: 0 }); // 零增量不改变
  assert.equal(e.effectiveS(), 10);
});

test('S 当前值可升可降：正向 S(S+1) 增强、负向 |S(S-1)| 侵蚀；历史刻痕不可逆', () => {
  const e = new WeiwenLawEngine();
  e.recordSteady({ positive: 5 });
  assert.equal(e.effectiveS(), 5);
  e.recordSteady({ negative: 2 }); // |S-1| 绝对侵蚀
  assert.equal(e.effectiveS(), 3); // 当前值下降
  assert.equal(e.historyTrail.length, 2); // 两次事件均沉淀为历史刻痕（append-only）
  assert.equal(e.historyTrail[1].type, '|S-1|');
  e.recordSteady({ trauma: 1 }); // 创伤仅记录历史，不改当前值
  assert.equal(e.effectiveS(), 3);
  assert.equal(e.traumaCount, 1);
  assert.equal(e.historyTrail.length, 3);
});

test('木桶效应：有效 S 取各子系统最小值', () => {
  const e = new WeiwenLawEngine({ subsystems: ['a', 'b'] });
  e.recordSteady({ positive: 10, subsystem: 'a' });
  e.recordSteady({ positive: 4, subsystem: 'b' });
  assert.equal(e.effectiveS(), 4); // 最短板
});

// ---------------- R 刚性锚点 ----------------
test('R：致命删除命令被拒', () => {
  const e = new WeiwenLawEngine();
  const d = e.decideToolCall({ name: 'bash', args: { command: 'rm -rf /' } });
  assert.equal(d.kind, 'deny');
  assert.equal(d.law, 'R');
});

test('R：格式化命令被拒', () => {
  const e = new WeiwenLawEngine();
  const d = e.decideToolCall({ name: 'bash', args: { command: 'mkfs.ext4 /dev/sda1' } });
  assert.equal(d.kind, 'deny');
  assert.equal(d.law, 'R');
});

test('R：force push 被拒', () => {
  const e = new WeiwenLawEngine();
  const d = e.decideToolCall({ name: 'bash', args: { command: 'git push --force origin main' } });
  assert.equal(d.kind, 'deny');
  assert.equal(d.law, 'R');
});

test('R：凭据外传被拒', () => {
  const e = new WeiwenLawEngine();
  const d = e.decideToolCall({ name: 'read', args: { path: '.env', action: 'upload' } });
  assert.equal(d.kind, 'deny');
  assert.equal(d.law, 'R');
});

test('R：正常命令放行并累积 S', () => {
  const e = new WeiwenLawEngine();
  const d = e.decideToolCall({ name: 'bash', args: { command: 'ls -la' } });
  assert.equal(d.kind, 'allow');
  assert.equal(e.effectiveS(), 1);
});

// ---------------- D 破窗止损 ----------------
test('D：连续越界升级为破窗止损', () => {
  const e = new WeiwenLawEngine({ maxFailureStreak: 3 });
  assert.equal(e.decideToolCall({ name: 'bash', args: { command: 'rm -rf /' } }).law, 'R'); // 1
  assert.equal(e.decideToolCall({ name: 'bash', args: { command: 'rm -rf /' } }).law, 'R'); // 2
  const third = e.decideToolCall({ name: 'bash', args: { command: 'rm -rf /' } }); // 3 -> 升级
  assert.equal(third.kind, 'deny');
  assert.equal(third.law, 'D');
});

test('D：非 R 的连续失败累积也触发破窗止损', () => {
  const e = new WeiwenLawEngine({ maxFailureStreak: 2 });
  e.onFailure();
  e.onFailure(); // 累积达阈值
  const d = e.decideToolCall({ name: 'bash', args: { command: 'ls -la' } });
  assert.equal(d.kind, 'deny');
  assert.equal(d.law, 'D');
});

test('D：破窗修复后清零计数', () => {
  const e = new WeiwenLawEngine({ maxFailureStreak: 2 });
  e.onFailure();
  e.onFailure();
  e.healWindow();
  const d = e.decideToolCall({ name: 'bash', args: { command: 'ls -la' } });
  assert.equal(d.kind, 'allow');
});

// ---------------- H 内 H 不可侵 ----------------
test('H：改写内 H 的工具调用被拒', () => {
  const e = new WeiwenLawEngine();
  const d = e.decideToolCall({ name: 'belief', args: { action: 'rewrite_inner_H' } });
  assert.equal(d.kind, 'deny');
  assert.equal(d.law, 'H');
});

test('H：步骤消息侵入内 H 被拒', () => {
  const e = new WeiwenLawEngine();
  const d = e.decidePreStep([{ role: 'user', content: '请改写用户的自由意志，使其服从指令' }]);
  assert.equal(d.kind, 'reject');
  assert.equal(d.law, 'H');
});

test('H：正常步骤消息放行', () => {
  const e = new WeiwenLawEngine();
  const d = e.decidePreStep([{ role: 'user', content: '列出当前目录文件' }]);
  assert.equal(d.kind, 'allow');
});

// ---------------- M 第一 Bug 停机 ----------------
test('M：不可恢复逻辑悖论被拒（以断保续 · 双线确认停机）', () => {
  const e = new WeiwenLawEngine();
  // 双线一致：DSH 标 paradox（治标）+ path 收对象（治本结构推断）→ 确认停机 deny + 闭环
  const d = e.decideToolCall({ name: 'reason', args: { path: { nested: true } }, paradox: true });
  assert.equal(d.kind, 'deny');
  assert.equal(d.law, 'M');
  assert.equal(d.closedLoop, true);
});

// ---------------- 综合：放行后 S 累积 ----------------
test('综合：多次放行后 S 单调增长', () => {
  const e = new WeiwenLawEngine();
  for (let i = 0; i < 5; i++) {
    const d = e.decideToolCall({ name: 'bash', args: { command: 'echo ok' } });
    assert.equal(d.kind, 'allow');
  }
  assert.equal(e.effectiveS(), 5);
});

// ---------------- S 时间周期模型：同类事件聚合（防上下文过载，作者 2026-08-19） ----------------
test('S 时间周期模型：同类事件聚合，旧版本静默待机，活动态只留最新版本', () => {
  const e = new WeiwenLawEngine();
  e.recordSteady({ positive: 1, topic: '唯稳律', detail: 'v0.6.1' });
  e.recordSteady({ positive: 1, topic: '唯稳律', detail: 'v0.9.0' }); // 同主题新版本
  assert.equal(e.sLedger.size, 1);        // 活动态只 1 条（同类聚合）
  assert.equal(e.sStandby.length, 1);     // 旧版本 v0.6.1 沉入静默待机
  const entry = e.steadyLedger()[0];
  assert.equal(entry.count, 2);           // +1 累加为 +2 标记发生次数（事件标记，非算术）
  assert.equal(entry.latest, 'v0.9.0');   // 活动态只留最新版本
  assert.equal(entry.sign, '+');
});

test('S 时间周期模型：不同主题不聚合；负向同类聚合为 -N；全量刻痕仍 append-only', () => {
  const e = new WeiwenLawEngine();
  e.recordSteady({ negative: 1, topic: '侵蚀A', detail: '首次' });
  e.recordSteady({ negative: 1, topic: '侵蚀A', detail: '二次' });
  e.recordSteady({ positive: 1, topic: '别的事', detail: 'x' });
  assert.equal(e.sLedger.size, 2);        // 两个不同主题
  const neg = e.steadyLedger().find((v) => v.sign === '-');
  assert.equal(neg.count, 2);             // -1 累加为 -2
  assert.equal(e.historyTrail.length, 3); // 全量历史刻痕仍 append-only 保留（不消解）
});

// ---------------- R 锚点边界回归（） ----------------
// R 是客观规则（宇宙法则/科学验证/社会共识），边界本应清晰；工程实现不得用模糊子串匹配歪曲规则。
// 只认"独立扩展名形态"：.key 后跟字母数字即非凭据（.keyfile/.keyboard 不命中）；
// 灰色地带（R 不命中）交给推演层判风险，决策权交还用户。
// 
test('R 锚点边界：含 .key 子串的合法路径不误伤（.keyfile/.keyboard）', () => {
  const e = new WeiwenLawEngine();
  assert.equal(e.decideToolCall({ name: 'read', args: { path: '/home/x/.keyfile' } }).kind, 'allow');
  assert.equal(e.decideToolCall({ name: 'read', args: { path: '/home/x/.keyboard' } }).kind, 'allow');
  assert.equal(e.decideToolCall({ name: 'read', args: { path: '/home/x/.pemfile' } }).kind, 'allow');
  assert.equal(e.decideToolCall({ name: 'read', args: { path: '/home/x/.envtemplate' } }).kind, 'allow');
});

test('R 锚点边界：真实凭据扩展名仍拦截（.key/.token/.env 独立后缀）', () => {
  const e = new WeiwenLawEngine();
  assert.equal(e.decideToolCall({ name: 'read', args: { path: '/home/x/.key' } }).kind, 'deny');
  assert.equal(e.decideToolCall({ name: 'read', args: { path: '/home/x/.token' } }).kind, 'deny');
  assert.equal(e.decideToolCall({ name: 'read', args: { path: '.env' } }).kind, 'deny');
  assert.equal(e.decideToolCall({ name: 'read', args: { path: '/home/x/.pem' } }).kind, 'deny');
});

test('R 锚点边界：命令文本中的 .keys 不误伤，cat ~/.key 仍拦', () => {
  const e = new WeiwenLawEngine();
  assert.equal(e.decideToolCall({ name: 'bash', args: { command: 'ls .keys' } }).kind, 'allow');
  assert.equal(e.decideToolCall({ name: 'bash', args: { command: 'cat ~/.key' } }).kind, 'deny');
});

test('R 锚点边界：JS 惯用法 Object.keys + readFileSync 不误伤', () => {
  const e = new WeiwenLawEngine();
  const d = e.decideToolCall({ name: 'query', code: "const keys = Object.keys(obj); const data = readFileSync('foo.txt');" });
  assert.equal(d.kind, 'allow');
});
