// mutation-gate.test.mjs — Gate ④（扣子 checklist 问句④）：变异测试机械化（以 no-destructive-fs 为标本）
// 锚点双源合取：C1(动作类别: attrib.ok && DELETION_LAYERS) ∧ C2(作用域: extractPath 命中根/系统/伪文件系统)
//   两分量语义同源（同指"对文件系统的破坏"）、源分置（C1=归因层 / C2=extractPath，互不依赖命令文本）。
// 变异规则：对每个分量施加 k 次取反（奇数=取反，偶数=恒等）。
//   ① 单分量取反 → 变体须"全灭"（至少一个用例裁决翻转）方过审；
//   ② 成对取反 → 同样须被杀死（无冗余抵消）；
//   ③ 双取反同一分量（奇偶律）→ 机械检定为"等价变异体"（不翻转任何用例）。
// 说明：C1 取自真实引擎 attributionCall；C2 的 extractPath + 作用域正则【直接抽取自 engine.mjs 源码】
//      （测试只读源码 eval，不修改引擎），保证与线上锚点零漂移。origDeny 与真实引擎
//      checkRigidAnchor(no-destructive-fs) 交叉验证一致（结构化调用无命令文本 → 通道①不触发，命中即通道②）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { attributeCall } from '../src/core/attribution.mjs';
import { WeiwenLawEngine } from '../src/core/engine.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const engineSrc = readFileSync(join(__dir, '..', 'src', 'core', 'engine.mjs'), 'utf8');
// 从引擎源码抽取真实作用域正则（与线上锚点同源，避免手敲漂移）
function evalConst(name) {
  const m = engineSrc.match(new RegExp('const ' + name + ' = (/[\\s\\S]*?/);'));
  if (!m) throw new Error('mutation-gate: 无法从引擎源码抽取 ' + name);
  return eval(m[1]);
}
const SCOPE_ROOT = evalConst('SCOPE_ROOT');
const SYS_DELETE = evalConst('SYS_DELETE');
const PSEUDO_FS = evalConst('PSEUDO_FS');
const DELETION_LAYERS = new Set(['file-delete', 'cred-delete']);

function extractPath(call) {                 // 镜像引擎 extractPath（读 call.args.path / .file）
  const c = call?.args ?? {};
  if (typeof c.path === 'string') return c.path;
  if (typeof c.file === 'string') return c.file;
  return undefined;
}
function C1(call) {                       // 动作类别分量（源 = 归因层）
  const a = attributeCall(call);
  return a.ok && DELETION_LAYERS.has(a.layer);
}
function C2(call) {                       // 作用域分量（源 = extractPath，不经过命令文本）
  const p = extractPath(call);
  return !!(p && (SCOPE_ROOT.test(p) || SYS_DELETE.test(p) || PSEUDO_FS.test(p)));
}
function origDeny(call) { return C1(call) && C2(call); }
function applyNeg(x, k) { return k % 2 === 0 ? x : !x; }
function mutatedDeny(call, flips) {      // flips: { 分量下标: 取反次数 }
  const c = [C1(call), C2(call)];
  const v = c.map((x, i) => applyNeg(x, flips[i] || 0));
  return v[0] && v[1];
}

const CASES = [
  { name: 'fs_delete',   args: { path: '/' } },        // C1=T C2=T → 原 deny
  { name: 'fs_delete',   args: { path: '/etc' } },     // C1=T C2=T → 原 deny
  { name: 'cred_delete', args: { path: '/root' } },    // C1=T C2=T → 原 deny
  { name: 'fs_delete',   args: { path: '/tmp/x' } },   // C1=T C2=F → 原 allow
  { name: 'read_file',   args: { path: '/tmp/notes.txt' } }, // C1=F C2=F → 原 allow
  { name: 'write_file',  args: { path: '/home/u/draft.txt' } }, // C1=F C2=F → 原 allow
];

test('问句④·单分量取反：变体全灭（至少一个用例翻转）', () => {
  for (const flips of [{ 0: 1 }, { 1: 1 }]) {
    let killed = false;
    for (const c of CASES) if (origDeny(c) !== mutatedDeny(c, flips)) killed = true;
    assert.ok(killed, `分量取反 ${JSON.stringify(flips)} 的变体必须被至少一个用例杀死（翻转裁决）`);
  }
});

test('问句④·成对取反：同样被杀死（无冗余抵消）', () => {
  const flips = { 0: 1, 1: 1 };
  let killed = false;
  for (const c of CASES) if (origDeny(c) !== mutatedDeny(c, flips)) killed = true;
  assert.ok(killed, `成对取反 ${JSON.stringify(flips)} 必须被杀死（翻转裁决）`);
});

test('问句④·双取反同一分量（奇偶律）：机械检定为等价变异体（不翻转）', () => {
  for (const flips of [{ 0: 2 }, { 1: 2 }]) {
    let flipsCount = 0;
    for (const c of CASES) if (origDeny(c) !== mutatedDeny(c, flips)) flipsCount++;
    assert.strictEqual(flipsCount, 0, `双取反 ${JSON.stringify(flips)} 应等价于原合取（奇偶律），不应翻转任何用例`);
  }
});

test('问句④·真实引擎交叉验证：origDeny 与引擎 checkRigidAnchor(no-destructive-fs) 一致', () => {
  const eng = new WeiwenLawEngine();
  for (const c of CASES) {
    const hit = eng.checkRigidAnchor(c)?.anchor === 'no-destructive-fs';
    assert.strictEqual(hit, origDeny(c), `标本模型须与真实引擎一致：${JSON.stringify(c)}`);
  }
});
