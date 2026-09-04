// fail-closed-gate.test.mjs — Gate ③（扣子 checklist 问句③）：fail-closed 全覆盖
// 机械化形态：直接驱动引擎公开 decideToolCall / checkRigidAnchor，断言裁决档位。
// 目标：
//   ① 任何抽取通道失效时，破坏性裁决不得落 allow（必须 deny 或 review）；
//   ② 未注册/中性调用形态不得绕过 R 枝闸门裸奔 allow（落 review）；
//   ③ 非良构调用不 allow（落 schema / review 档）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';

test('问句③·通道②兜底：命令文本缺失时结构化破坏性调用仍 deny（不静默 allow）', () => {
  const eng = new WeiwenLawEngine();
  const destructive = [
    { name: 'fs_delete',       args: { path: '/' } },
    { name: 'fs_delete',       args: { path: '/etc' } },
    { name: 'fs_delete',       args: { path: '/dev/sda1' } },
    { name: 'delete_file',     args: { path: '/boot' } },
    { name: 'file_remove',     args: { path: '/proc/1' } },
    { name: 'rm_dir',          args: { path: '/sys' } },
    { name: 'cred_delete',     args: { path: '/root/.aws/credentials' } },
    { name: 'wipe',            args: { path: '/mnt/data' } },
  ];
  for (const call of destructive) {
    const d = eng.decideToolCall(call);
    assert.strictEqual(d.kind, 'deny', `结构化破坏性调用应 deny 而非 ${d.kind}：${JSON.stringify(call)}`);
  }
});

test('问句③·不误伤：非破坏性结构化调用不被 no-destructive-fs 误 deny', () => {
  const eng = new WeiwenLawEngine();
  const benign = [
    { name: 'read_file',  args: { path: '/tmp/notes.txt' } },
    { name: 'write_file', args: { path: '/tmp/draft.txt' } },
    { name: 'list_dir',   args: { path: '/home/u/docs' } },
    { name: 'fs_copy',    args: { path: '/home/u/a' } },
  ];
  for (const call of benign) {
    const r = eng.checkRigidAnchor(call);
    assert.strictEqual(r, null, `非破坏性调用不应命中 no-destructive-fs：${JSON.stringify(call)}`);
  }
});

test('问句③·入口覆盖：中性/未注册形态不可绕过 R 枝裸奔 allow（落 review）', () => {
  const eng = new WeiwenLawEngine();
  const unregistered = [
    { name: 'tool_42',        args: { path: '/' } },        // 中性名 + 无可观测行为
    { name: 'agent_action',   args: { path: '/etc' } },     // 中性名
    { name: 'host_direct_op', args: { target: '/' } },      // 非标准入口，无 verb
    { name: 'handle',         args: { action: 'delete', object: '/boot' } }, // 中性名 + 动词藏 args
  ];
  for (const call of unregistered) {
    const d = eng.decideToolCall(call);
    assert.notStrictEqual(d.kind, 'allow', `未注册/中性形态不应 allow（应 review）：${JSON.stringify(call)} → ${d.kind}`);
    assert.ok(['review', 'deny'].includes(d.kind), `未注册形态应落 review/deny 而非 ${d.kind}`);
  }
});

test('问句③·形态退化：非良构调用不 allow（落 schema / review 档）', () => {
  const eng = new WeiwenLawEngine();
  const malformed = [null, { args: { path: '/' } }, { name: 'x', args: 'not-an-object' }];
  for (const call of malformed) {
    const d = eng.decideToolCall(call);
    assert.notStrictEqual(d.kind, 'allow', `非良构调用不应 allow：${JSON.stringify(call)} → ${d.kind}`);
  }
});
