// 唯稳律定义对齐回归测试 —— 锁死 2026-08-20 作者揭示的两处对齐，防止日后升级再次写歪：
//   ① 逻辑反推 与 第一 Bug 停机 分开并行（非合体、非 isomorphicWith 等同）
//   ② 反推沿 R 尺度包含轴反溯（细分规则层→微观→宏观→地球→宇宙），两层轴不与时间演进轴（母链/子链 R）混淆
//
// 来源：作者揭示（夏祺 / Shaky77）。变量不预设数值；框架本体严格本位，不软化、不篡改。

import test from 'node:test';
import assert from 'node:assert/strict';
import { CALIBRATION, R_DOMAIN, THREE_IRON_LAWS } from '../src/core/law.mjs';

test('对齐① CALIBRATION 存在且三字段齐全，已无 isomorphicWith 等同标注', () => {
  assert.ok(CALIBRATION, 'CALIBRATION 应存在');
  assert.ok(CALIBRATION.rule, '应有 rule');
  assert.ok(CALIBRATION.parallelWith, '应有 parallelWith');
  assert.ok(CALIBRATION.rLayerVerification, '应有 rLayerVerification');
  assert.ok(!('isomorphicWith' in CALIBRATION), '不得再出现 isomorphicWith 等同标注（此前误将两机制合体）');
});

test('对齐① 逻辑反推 与 第一 Bug 停机 明确为分开并行，而非"同精神/等同"', () => {
  const both = (CALIBRATION.rule + ' ' + CALIBRATION.parallelWith).toLowerCase();
  assert.match(CALIBRATION.parallelWith, /分开并行|并行/, '应声明二者并行');
  assert.ok(!both.includes('同精神'), '不得再写"同精神"式合体');
  assert.ok(!both.includes('等同'), '不得再写"等同"式合体');
  assert.match(CALIBRATION.parallelWith, /停机.*断|切链保活/, '停机=管断/切链保活');
  assert.match(CALIBRATION.parallelWith, /反推.*溯|溯源归因/, '反推=管溯/归因');
});

test('对齐② 反推路径沿 R 尺度包含轴（细分规则层→微观→宏观→地球→宇宙），且不含时间演进轴措辞', () => {
  const rule = CALIBRATION.rule;
  for (const layer of ['微观', '宏观', '地球', '宇宙']) {
    assert.ok(rule.includes(layer), `反推路径应包含 ${layer}`);
  }
  assert.ok(!rule.includes('母链') && !rule.includes('子链'), '反推路径不得混入母链/子链（时间演进轴）');
});

test('对齐② R_DOMAIN 嵌套层级顺序为 宇宙⊃地球⊃宏观⊃微观，且含 fractalSubdivision 分形套嵌', () => {
  const h = R_DOMAIN.hierarchy;
  assert.equal(h.length, 4, '应为四层代表层级');
  assert.equal(h[0].name, '宇宙客观规则');
  assert.equal(h[1].name, '地球客观规则');
  assert.equal(h[2].name, '宏观客观规则');
  assert.equal(h[3].name, '微观客观规则');
  assert.equal(h[0].contains, '地球客观规则');
  assert.equal(h[1].contains, '宏观客观规则');
  assert.equal(h[2].contains, '微观客观规则');
  assert.ok(R_DOMAIN.fractalSubdivision, '应新增 fractalSubdivision');
  assert.match(R_DOMAIN.fractalSubdivision, /分形套嵌|同构递归/, '每层细分规则应分形套嵌、同构递归');
});

test('对齐② 尺度包含轴 与 时间演进轴 不混淆：母链/子链概念不得出现在反推定义中', () => {
  const blob = JSON.stringify(CALIBRATION);
  assert.ok(!blob.includes('母链') && !blob.includes('子链'), 'CALIBRATION 不得混入母链/子链时间演进轴');
});

test('对齐③ R 客观规则层可复验：rLayerVerification 声明宣称与复验不符即前提失真', () => {
  assert.match(CALIBRATION.rLayerVerification, /复验/, '应提及复验');
  assert.match(CALIBRATION.rLayerVerification, /前提失真|赋值不可信/, '应落到前提失真/赋值不可信');
});

test('一致性的前提：第一 Bug 停机铁律与 R 层级定义均仍在线（无回退）', () => {
  assert.equal(THREE_IRON_LAWS.length, 3, '三大铁律仍应为三条');
  assert.ok(THREE_IRON_LAWS[1].includes('第一 Bug 停机'), '铁律② 仍为第一 Bug 停机');
  assert.equal(R_DOMAIN.hierarchy[3].name, '微观客观规则', 'R 层级末层应为微观');
});
