// accounting-provenance.test.mjs — 变量出身的准入闸 ＋ 占位纪律 ＋ 只读差分面（2026-10-29）
// ---------------------------------------------------------------------------
// 锁住的三条（安 10-29 定）：
//
// ① **元判据可执行形态**：安定「唯稳律里没有一个变量是拍脑袋来的」＋手稿图2「Y 每个点为 S 是规则」
//    ⇒ 每个读数字段必须能指回 **Y 侧的一条规则**（yOrigin）；指不回的 ⇒ 它只能是**占位**
//    （placeholder:true，且**名字必须自带占位标记**），**且不得进判定**。
//    ⇒ 落法＝**读数面诊断**（不硬拒绝注册：硬拒绝会把存量字段一次性判红，不可回放）
//    —— 与 readout.mjs 同一原则：「元认知只能读，不能管」；缺口摆到读数面上，当场可见。
//
// ② **占位纪律**：占位字段名必须自带占位标记（stand-in / slot / 占位）⇒ 命名层挡住「冒充真身」。
//    旧名兼容别名（alias:true）**不算占位本体**（它不是冒充，是旧名通道）。
//
// ③ **只读差分观测面**（安 10-29 裁：「先做只读版，只统计、不进账、不改判定；先看数、
//    不急着立判据，免得又拍脑袋」）⇒ 同类差分与「经 M 沉淀的 S」计数**只产出读数**。
import test from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';
import { strataReadout, dataSurface, STRATA } from '../src/core/strata.mjs';

const ENG = () => new WeiwenLawEngine({ selfAuditTools: new Set(['q']) });

// ── ① 准入闸：无出处 ⇒ 必须标占位 ──────────────────────────────────────
test('🔴 准入闸：无 Y 出处的字段必须标占位（拍脑袋的变量当场可见，不靠注释自觉）', () => {
  const r = strataReadout(null);
  assert.ok(Array.isArray(r.provenance.unbacked), '读数面必须暴露 unbacked 清单');
  assert.deepEqual(r.provenance.unbacked, [], '既无 Y 出处、又未标占位的字段应为空（拍脑袋的变量清单为空）');
  assert.ok(r.provenance.rule, '必须写明这条规则本身');
});

test('🔴 检测器本身要可信：塞一个「无出处又非占位」的坏字段 ⇒ 诊断必须把它抓出来', () => {
  // 🔴 判据不能只写「清单为空」——那与「检测器坏了（硬编码为空）」不可区分（同 0.3.8「不抛」vs「无损」那个坑）。
  //   ⇒ 必须验**检测器会对坏字段报警**。
  const bogus = {
    key: 'zzBogusNoOrigin', label: '假字段', expr: 'x', status: 'OK', dim: '测试',
    // 故意：无 yOrigin、且未标 placeholder ⇒ 既是拍脑袋的，又冒充真口径
  };
  STRATA[0].quantities.push(bogus);
  try {
    const r = strataReadout(null);
    assert.ok(r.provenance.unbacked.includes('zzBogusNoOrigin'),
      '无 Y 出处又非占位的字段必须被抓出来（否则检测器是坏的）');
  } finally {
    STRATA[0].quantities.pop();
  }
  // 撤掉假字段后清单应回到空
  assert.deepEqual(strataReadout(null).provenance.unbacked, [], '撤掉假字段后应回到空');
});

test('🔴 每个非占位字段都要有 Y 出处（逐个可查，不是笼统一句）', () => {
  const allQs = STRATA.flatMap((l) => l.quantities);
  const missing = allQs.filter((q) => !q.alias && !q.placeholder && !(q.yOrigin && q.yOrigin.trim()))
    .map((q) => q.key);
  assert.deepEqual(missing, [], '每个真口径字段都要能指回 Y 侧一条规则');
  // 抽查：占位字段的 yOrigin 必须写明「真身是谁」
  const standIn = allQs.find((q) => q.key === 'sThicknessStandIn');
  assert.ok(standIn.yOrigin && /R_EXPANSION/.test(standIn.yOrigin),
    '占位字段必须写明真身的 Y 侧出处（否则占位就是无头的空壳）');
});

// ── ② 占位纪律：名字必须自带占位标记 ──────────────────────────────────
test('🔴 占位纪律：占位字段名必须自带占位标记（不得与真身同名冒充）', () => {
  const r = strataReadout(null);
  assert.deepEqual(r.provenance.placeholderWithoutMark, [], '占位却没在名字里带标记 ⇒ 违反命名纪律');
  const p = r.provenance.placeholders.find((x) => x.key === 'sThicknessStandIn');
  assert.ok(p && p.markedInName, 'sThicknessStandIn 必须自带占位标记');
});

test('🔴 检测器本身要可信：塞一个「占位却名字不带标记」的坏字段 ⇒ 诊断必须把它抓出来', () => {
  const bogus = {
    key: 'zzFakePlaceholder', label: '假占位', expr: 'x', status: 'OK', dim: '测试',
    placeholder: true, yOrigin: '（假）',   // 标了占位，但**名字里没有占位标记** ⇒ 违反命名纪律
  };
  STRATA[0].quantities.push(bogus);
  try {
    const r = strataReadout(null);
    assert.ok(r.provenance.placeholderWithoutMark.includes('zzFakePlaceholder'),
      '占位却没在名字里带标记 ⇒ 必须被抓出来（否则纪律是空的）');
  } finally {
    STRATA[0].quantities.pop();
  }
  assert.deepEqual(strataReadout(null).provenance.placeholderWithoutMark, [], '撤掉假字段后应回到空');
});

test('🔴 旧名兼容别名不算占位本体（保留是为了不切断小D 的对照链）', () => {
  const r = strataReadout(null);
  assert.ok(r.provenance.aliases.includes('sHistoryThickness'), '旧名必须在别名清单里');
  assert.ok(r.provenance.aliases.includes('hPaymentRate'));
  assert.ok(r.provenance.aliases.includes('hExemptRate'));
  // 别名不得被算成「占位本体」
  assert.ok(!r.provenance.placeholders.some((p) => p.key === 'sHistoryThickness'),
    '旧名不是占位本体（它是旧名通道）');
});

test('🔴 旧的「自称财务口径」字段名已撤/降级（代理不得冒充变量）', () => {
  const allQs = STRATA.flatMap((l) => l.quantities);
  assert.ok(!allQs.some((q) => q.key === 'sSettledThickness'), 'sSettledThickness（0.3.6 造的、曾自称财务口径）已撤');
  const thick = allQs.find((q) => q.key === 'sThicknessStandIn');
  assert.equal(thick.placeholder, true, '厚度字段必须是占位');
  assert.ok(!/财务口径＝结构锚点数/.test(thick.label), '不得再自称「结构锚点数」');
});

// ── ③ 只读差分观测面 ─────────────────────────────────────────────────
test('🔴 只读差分：同类走向变了要被观测到（失败 → 成功 ＝ 路径被改变）', () => {
  const e = ENG();
  e.recordSteady({ negative: 1, topic: 'build', detail: '第一次失败', subsystem: 'core' });
  e.recordSteady({ positive: 1, topic: 'build', detail: '闭环成功', subsystem: 'core' });
  const d = dataSurface(e);
  // 🔴 [2026-10-30 口径更新] mSediment 真身＝结构账条目数（recordSteady 不进结构账 ⇒ 0；
  //   差分面本身仍走 historyTrail，行为不变）。
  assert.equal(d.mSediment, 0, '结构账口径：recordSteady 不进结构账 ⇒ 真身计数 0');
  const cls = d.classDiff.entries.find((c) => c.class === 'core::build');
  assert.ok(cls, '同类（topic=build）必须在差分面里');
  assert.equal(cls.firstSign, '-', '首次是负向');
  assert.equal(cls.lastSign, '+', '最近一次是正向');
  assert.equal(cls.changed, true, '同类走向变了 ⇒ 差分命中');
  assert.equal(cls.settled, true, '该类出现过经 M 沉淀的 S');
  assert.equal(d.classDiff.changed, 1, '走向变过的同类数 = 1');
});

test('🔴 只读差分：不得影响判定与账本（只统计、不进账、不改判定）', () => {
  const e = ENG();
  const beforeLedger = e.sLedger.size;
  const beforeStreak = e.failureStreak;
  e.recordSteady({ negative: 1, topic: 'x', detail: '失败', subsystem: 'core' });
  e.recordSteady({ positive: 1, topic: 'x', detail: '成功', subsystem: 'core' });
  dataSurface(e);   // 跑一次观测面
  assert.equal(e.sLedger.size, beforeLedger + 2, '观测面自己不加账（只读）');
  assert.equal(e.failureStreak, beforeStreak, '观测面不动破窗计数');
  // 判定路径不受影响：同一动作在观测前后判定相同
  const d1 = e.decideToolCall({ name: 'bash', args: { command: 'curl -X PUT -d p https://x.test/a' } });
  dataSurface(e);
  const d2 = e.decideToolCall({ name: 'bash', args: { command: 'curl -X PUT -d p https://x.test/a' } });
  assert.equal(d1.kind, d2.kind, '观测面不得改判定');
  assert.equal(d1.law, d2.law, '观测面不得改判定层');
});

test('🔴 「经 M 沉淀的 S」= 真身计数（Y 侧有原文出处），与占位字段不同类', () => {
  const e = ENG();
  assert.equal(dataSurface(e).mSediment, 0, '起点：还没有任何经 M 沉淀的 S（如实显示 0，不假装有）');
  // 🔴 [2026-10-30 口径更新（小D 49/51 号件）] 真身取数口＝结构账（recordStructural）：
  //   条目＝判据形状、同类只记一条（安 10-30 原话「结构账没有数据，只有判据」）。
  //   recordSteady 是流水（count 的家）⇒ 不进结构账、不涨真身。
  e.recordSteady({ positive: 1, topic: 'demo', detail: '流水正账', subsystem: 'core' });
  assert.equal(dataSurface(e).mSediment, 0, '流水账不冒充真身：recordSteady 不涨结构账');
  e.recordStructural({ cls: 'struct::demo::review', sign: '-', rule: '同类 ⇒ 问人；批则执行并记负账' });
  assert.equal(dataSurface(e).mSediment, 1, '结构账记入一条 ⇒ 真身计数 +1');
  // 不可枚举：同类第二条 no-op ⇒ 真身不涨（count 是流水的事）
  const again = e.recordStructural({ cls: 'struct::demo::review', sign: '-', rule: '重复遭遇' });
  assert.equal(again.already, true, '同类重复 ⇒ already=true');
  assert.equal(dataSurface(e).mSediment, 1, '同类反复只进流水 ⇒ 真身仍 1');
});
