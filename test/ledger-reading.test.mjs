// 0.3.5：小D 39/40 号件的两条硬伤 —— ① 读数面吐非法 JSON（序列化 bug）
//                                             ② 负值口径违例：见底与透支混在一起
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';

const ENG = () => new WeiwenLawEngine({ selfAuditTools: new Set(['q']) });

test('🔴 序列化加固：账本条目带**真不可序列化**的值 ⇒ 读数面必须仍能 JSON 化', () => {
  const e = ENG();
  const cyclic = { name: 'loop' }; cyclic.self = cyclic;      // 循环引用 ⇒ JSON.stringify 抛错
  const withFn = { fn: () => 1 };                              // 函数 ⇒ JSON 化会丢（非 lossless）
  e.recordSteady({ positive: 1, detail: '正账', subsystem: 'probe' });
  e.recordSteady({ negative: 1, detail: cyclic, subsystem: 'probe' });
  e.recordSteady({ negative: 1, detail: withFn, subsystem: 'probe' });
  e.recordSteady({ executed: true, negative: 1, attrib: { layer: 'network-send', method: 'command', signal: 'curl -X PUT' }, action: 'curl -X PUT', subsystem: 'exfil' });
  assert.doesNotThrow(() => JSON.stringify(e.snapshot()), 'snapshot 必须可序列化（循环引用不得带进账本）');
  assert.doesNotThrow(() => JSON.stringify(e.steadyLedger()), 'ledger 必须可序列化');
  // 🔴 关键：宿主报的是「value is not **lossless** JSON」——JSON 化**不抛**但**静默丢值**（函数/循环
  //   被丢）也算坏。⇒ 判据是**无损**：读数面里的文本字段必须是字符串，JSON 往返后内容不丢。
  const roundTrip = JSON.parse(JSON.stringify(e.steadyLedger()));
  for (const entry of roundTrip) {
    for (const [k, v] of Object.entries(entry)) {
      if (v !== null && typeof v === 'object') {
        assert.fail(`账本条目字段 ${k} 仍是对象 ⇒ JSON 往返会丢值（not lossless）：${JSON.stringify(v).slice(0, 60)}`);
      }
    }
  }
  const raw = JSON.stringify(e.steadyLedger());
  assert.ok(raw.length > 0, 'ledger 不得为空（条目存在但读不出来＝假读数）');
});

test('🔴 见底与透支分开：effectiveS 是储备读数（下限 0），overdraft 是欠了多少', () => {
  const e = ENG();
  e.recordSteady({ positive: 2, detail: '入账', subsystem: 'probe' });
  // 木桶读数：effectiveS = min(各子系统净值) ⇒ core 仍是 0 ⇒ 最短板是 core ⇒ 读数 0（这是木桶，不是欠账）。
  assert.equal(e.sBySubsystem.probe, 2, '该子系统的净值＝入账量');
  assert.equal(e.effectiveS(), 0, '木桶最短板（core=0）⇒ 储备读数为 0');
  assert.equal(e.overdraft(), 0, '此时无欠账');
  e.recordSteady({ negative: 5, detail: '侵蚀', subsystem: 'probe' });
  assert.equal(e.sBySubsystem.probe, -3, '子系统的净值可���负（那是事实，不是储备读数）');
  assert.equal(e.effectiveS(), 0, '储备读数下限 0（到 0 = 没有储备，不是负储备）');
  assert.equal(e.overdraft(), 3, '欠账单独给量（透支额），不装进储备');
});

test('透支读数在快照里可见（欠账要读得到，不能伪装成"还剩一点"）', () => {
  const e = ENG();
  e.recordSteady({ negative: 2, detail: '侵蚀', subsystem: 'core' });
  const snap = e.snapshot();
  assert.equal(snap.effectiveS, 0);
  assert.equal(snap.overdraft, 2, '透支额必须在读数面');
});

test('中性刻痕不虚增储备（放行 ≠ 增益：sign=0 只留痕）', () => {
  const e = ENG();
  e.recordSteady({ executed: true, detail: '中性动作', subsystem: 'core' });
  assert.equal(e.effectiveS(), 0, '中性刻痕不改储备');
  assert.equal(e.overdraft(), 0, '中性刻痕不产生透支');
});

// ── 0.3.6（小D 41 号件）：ΣS 的取数口是"流水"不是"锚点" —— 财务与会计两个读数必须分开 ──
test('🔴 unknown 事件（H 一笔没付）只涨事件数，不涨沉淀厚度（会计账不得混进财务账）', async () => {
  const { dataSurface } = await import('../src/core/strata.mjs');
  const e = ENG();
  e.recordSteady({ positive: 1, detail: '有方向', subsystem: 'probe' });
  e.recordSteady({ negative: 1, detail: '有方向负', subsystem: 'probe' });
  e.recordSteady({ executed: true, detail: 'unknown 事件（H 没付）', subsystem: 'probe' });
  const d = dataSurface(e);
  assert.equal(d.eventCount, 3, '会计口径：三条离散事件');
  assert.equal(d.settledThickness, 2, '财务口径：只有有方向的两条算沉淀');
  // [2026-10-29 · 扩容判据改用财务口径（安 43 号件原话）] thickness（对外的 ΣS）＝**结构锚点数**
  //   ⇒ 扩容判据不再拿流水当 ΣS；流水计数在 eventCount。
  assert.equal(d.thickness, 2, '对外的 ΣS（thickness）＝ 结构锚点数（财务口径）');
  assert.equal(d.eventCount, 3, '流水计数在 eventCount（会计口径）');
});

test('🔴 sNow 与引擎储备读数同源（不得一处 0 一处 −1）', async () => {
  const { dataSurface } = await import('../src/core/strata.mjs');
  const e = ENG();
  e.recordSteady({ negative: 3, detail: '侵蚀', subsystem: 'probe' });
  const d = dataSurface(e);
  assert.equal(d.sNow, e.effectiveS(), 'sNow 必须与 engine.effectiveS 同源');
  assert.ok(d.sNow >= 0, '储备读数不得为负');
  assert.equal(d.sOverdraft, e.overdraft(), '透支额必须与 engine.overdraft 同源');
});
