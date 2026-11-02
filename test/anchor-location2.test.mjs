// 补测：文档豁免不再依赖槽名与归因层（第二次同源修复）+ 冷却键按裁决对象分置
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';
const ENG = () => new WeiwenLawEngine({ selfAuditTools: new Set(['query_steady_state']) });
const law = (d) => `${d.kind}/${d.law ?? ''}`;
const BODY = '# 报告\n| 用例 | 结果 |\n|---|---|\n| `rm -rf /` | deny / R |\n| `Invoke-RestMethod -Method Put -Body s` | deny / R |\n相关脚本：boom.sh 与 boom.ps1。';

test('槽名开放集：file_path / target_path / full_path 写 md 均豁免（修前只认 path/file ⇒ 静默失效）', () => {
  for (const slot of ['file_path', 'target_path', 'full_path', 'path', 'filename']) {
    const d = ENG().decideToolCall({ name: 'write', args: { [slot]: './docs/report.md', content: BODY } });
    assert.equal(law(d), 'allow/推演', `槽名 ${slot} 必须同样豁免`);
  }
});
test('edit 的 old/new_string 槽同样豁免（长件含多类命令原文）', () => {
  const d = ENG().decideToolCall({ name: 'edit', args: { file_path: './docs/report.md', old_string: 'v1', new_string: BODY } });
  assert.equal(law(d), 'allow/推演');
});
test('对照组：有显式命令槽 ⇒ 不豁免（动作就是动作，不因落点是 md 而放行）', () => {
  const d = ENG().decideToolCall({ name: 'bash', args: { command: 'rm -rf /', path: './docs/report.md' } });
  assert.equal(law(d), 'deny/R');
});
test('对照组：脚本槽名改写仍必扫（落点是 .sh ⇒ 正文会执行）', () => {
  const d = ENG().decideToolCall({ name: 'write', args: { file_path: './scripts/boom.sh', content: 'rm -rf /' } });
  assert.equal(law(d), 'deny/R');
});
test('对照组：落点取不到 ⇒ fail-closed 照旧扫', () => {
  const d = ENG().decideToolCall({ name: 'write', args: { content: 'rm -rf /' } });
  assert.equal(d.kind, 'deny');
});

// ── 0.3.7（xiaoD #42's bypass chain): the landing target can be rewritten later ⇒ re-judge on every retarget ──
test('🔴 bypass chain: write .md (doc exemption) then rename to .sh ⇒ the retarget must be reviewed', () => {
  const e = new WeiwenLawEngine({ selfAuditTools: new Set(['query_steady_state']) });
  const w = e.decideToolCall({ name: 'write', args: { path: './docs/rename-me.md', content: 'steps:\n1. `rm -rf /`\n' } });
  assert.equal(`${w.kind}/${w.law}`, 'allow/推演', 'writing a doc target: the body never executes ⇒ allowed (the 0.3.1 exemption still stands)');
  const mv = e.decideToolCall({ name: 'bash', args: { command: 'mv ./docs/rename-me.md ./scripts/rename-me.sh' } });
  assert.equal(mv.kind, 'review', 'the target became executable ⇒ must ask the human (dangerous content × executable landing)');
  assert.match(mv.reason, /落点变更重判/, 'the reason must name this as a retarget re-judgement');
});

test('🔴 control to protect: cleaning build artifacts by relative path is not tagged ⇒ renaming it is not reviewed', () => {
  const e = new WeiwenLawEngine({ selfAuditTools: new Set(['query_steady_state']) });
  const w = e.decideToolCall({ name: 'write', args: { path: './docs/cleanup.md', content: 'cleanup:\n`rm -rf ./node_modules`\n`rm -rf ./dist`\n' } });
  assert.equal(`${w.kind}/${w.law}`, 'allow/推演');
  const mv = e.decideToolCall({ name: 'bash', args: { command: 'mv ./docs/cleanup.md ./scripts/cleanup.sh' } });
  // ⚠️ 断言目标要准：mv 这个动作**本身**会被推演判中风险（既有行为，与打标无关）；
  //   本对照要锁的是「**不出现落点变更重判**」——合法的破坏性（相对路径清理构建产物）不得被打标。
  assert.doesNotMatch(String(mv.reason ?? ''), /落点变更重判/,
    'legitimate destruction (relative-path cleanup of build artifacts) must not be tagged ⇒ no retarget re-judgement (the control xiaoD #42 §4 named)');
});
