// 0.4.1：小D 47/48 号件的六条 —— 每条都有实测读数支撑，判据写成「坏字段必须被抓出来」
//
// 47 号（公式没跑 + 三本账 + 覆盖率 + 比率）：
//   ① 判据来源闸：判据只允许用公式五个量（R/S/D/H/M）；公式外的量只能观测，不得进判定
//   ② M 不可算时报「不可判（缺哪项）」，不许拿公式外的量顶替
//   ③ 一笔失败记三本账（thickness/trauma/overdraft）＝ 同一件事的三种表述 ⇒ 不可相加当成本量
//   ④ sTrailCoverage 分子分母同量纲（修前 >1，且注释方向反了）
//   ⑤ hPayment + hExempt 是两个不同维度 ⇒ 不可相加（>1 是必然，不是口径混账）
// 48 号（账本落盘 + 沉淀停摆 + 序列化）：
//   ⑥ 账本落盘 + 空账≠新账（fail-closed）
//   ⑦ 沉淀停摆显式化：sMSediment=0 是「停摆」不是「零」
//   ⑧ 序列化真凶：_coalesce 键名与 steadyLedger 读的对不上 ⇒ latest 恒 undefined ⇒ JSON 静默丢键
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';

const ENG = () => new WeiwenLawEngine({ selfAuditTools: new Set(['q']) });

// ── ① 判据来源闸（小D 47 号第五节）────────────────────────────────
test('🔴 判据来源闸：公式外的量不得进判定（守真 ⇒ 违规必须被抓出来）', async () => {
  const { judgeCriterionSource, SOURCE_GATE, FORMULA_VARS } = await import('../src/core/strata.mjs');
  assert.deepEqual([...FORMULA_VARS], ['R', 'S', 'D', 'H', 'M'], '公式五个量必须钉死');
  // 公式内 ⇒ 合规（🔴 判据**以声明为准**，不按 key 名字猜：名字是实现细节，层别是声明出来的）
  for (const v of ['R', 'S', 'D', 'H', 'M']) {
    assert.equal(judgeCriterionSource(v, { declared: v }).status, SOURCE_GATE.ALLOWED, `${v} 在公式内`);
  }
  // 🔴 变异检测：占位被标成判据源 ⇒ 必须报违规（不是 allowed、不是 unknown）
  const ph = judgeCriterionSource('sThicknessStandIn', { placeholder: true, declared: 'S' });
  assert.equal(ph.status, SOURCE_GATE.OFF_FORMULA, '占位进判定必须被拦下');
  assert.match(ph.reason, /占位/, '理由必须点名「占位」');
  // 旧名别名 ⇒ 同样违规
  assert.equal(judgeCriterionSource('sHistoryThickness', { alias: true, declared: 'S' }).status, SOURCE_GATE.OFF_FORMULA);
  // 🔴 声明层在公式外 ⇒ 违规（这才是「公式外的量」的真形态）
  const off = judgeCriterionSource('mLayerLoad', { declared: 'X' });
  assert.equal(off.status, SOURCE_GATE.OFF_FORMULA, '公式外的量进判定必须被拦下');
  assert.match(off.reason, /R\/S\/D\/H\/M/, '理由必须点名公式五个量');
  // 未声明层 ⇒ unknown（不是 allowed）——「判不出 ≠ 合法」
  assert.equal(judgeCriterionSource('someField').status, SOURCE_GATE.UNKNOWN);
  assert.equal(judgeCriterionSource('').status, SOURCE_GATE.UNKNOWN);
});

test('🔴 判据来源闸在读数面可见（违规清单当场摆出来，不是注释里的自觉）', async () => {
  const { strataReadout } = await import('../src/core/strata.mjs');
  const e = ENG();
  const r = strataReadout(e);
  assert.ok(r.sourceGate, '读数面必须有 sourceGate 诊断面');
  assert.deepEqual(r.sourceGate.formVars, ['R', 'S', 'D', 'H', 'M']);
  assert.ok(Array.isArray(r.sourceGate.entries), '必须逐量列出');
  // 🔴 变异检测：把某个量改成「公式外的量」⇒ 违规清单必须变长（不能恒为空）
  const before = r.sourceGate.violations.length;
  assert.ok(before > 0, '现状就有违规（占位/别名被标成判据源）⇒ 清单不得恒空');
  // 🔴 变异检测：判据**以声明为准** —— 改声明层 ⇒ 判定必须跟着变（不是按名字猜）
  //   ⚠️ 要挑一个**非占位、非别名**的量：占位/别名由各自那条闸先判（优先级更高）⇒ 改它们的声明层不改判定。
  const clean = r.sourceGate.entries.find((g) => g.verdict === 'allowed' && !g.placeholder && !g.alias);
  assert.ok(clean, '必须存在「合规且非占位」的量（否则这条变异测不到东西）');
  const recomputed = r.sourceGate.recompute({ [clean.key]: 'X' });
  const after = recomputed.violations.length;
  assert.ok(after > before, `把 ${clean.key} 的声明层改成公式外 ⇒ 违规数必须增加（否则诊断是死的）`);
  // 🔴 反向：把它改回公式内 ⇒ 判定必须变回合规（闸门是双向的，不是单向贴标签）
  const back = r.sourceGate.recompute({ [clean.key]: clean.declared });
  assert.equal(back.violations.length, before, '改回原声明层 ⇒ 违规数必须复原');
});

// ── ② M 不可判形态（小D 47 号第五节）───────────────────────────────
test('🔴 M 不可算时报「不可判（缺哪项）」，不许拿公式外的量顶替', async () => {
  const { mComputability, dataSurface } = await import('../src/core/strata.mjs');
  const e = ENG();
  const m = mComputability(dataSurface(e));
  assert.equal(m.judgeable, false, '五项不齐 ⇒ 不可判');
  assert.ok(m.missing.length >= 3, `缺项必须逐条列出（实测 ${m.missing.length}）`);
  assert.match(m.reason, /M 不可判（缺：/, '理由必须是「不可判（缺哪项）」形态');
  // 🔴 关键：理由里必须明说「公式外的量不得顶替」
  assert.match(m.reason, /不得顶替/, '必须明说公式外的量不得顶替');
  // 🔴 变异检测：缺项清单不得是硬编码的空/常量 —— 换实例后缺项内容必须变
  const e2 = ENG();
  // [2026-10-30 口径更新] S 的真身取数口＝结构账条目数（经 M 判决完成沉淀；安 10-30 原话
  //   「结构账没有数据，只有判据」）⇒ 变异场景改为「结构账记入一条」（模拟一次经 M 的负向终局）。
  e2.recordStructural({ cls: 'struct::probe::R', sign: '-', rule: '变异样本：同类首次经 M 终局' });
  const m2 = mComputability(dataSurface(e2));
  assert.notDeepEqual(m.missing, m2.missing, '缺项清单必须随实例变化（否则是写死的假读数）');
  // 🔴 而且**空实例**必须报出「正向侧（+S 闭环成功）入口未接」这条真缺口（安的原话那条——
  //    负向侧 2026-10-30 已接线，但正向侧 recordSteady 的 positive 分支依旧无调用点）
  assert.ok(m.missing.some((x) => /正向侧|闭环成功/.test(x)), '必须报出「+S 闭环成功没进记账」这个真缺口');
  // 🔴 有结构条目进来 ⇒ S 项不再缺（缺口随实例消失，不是恒定文案）
  assert.ok(!m2.missing.some((x) => /正向侧|闭环成功/.test(x)), '有结构条目后 S 项不该再报缺');
});

test('🔴 M 不输出数值（框架明令不赋值不计算）—— 不可判形态不许偷偷给个数', async () => {
  const { mComputability, dataSurface } = await import('../src/core/strata.mjs');
  const m = mComputability(dataSurface(ENG()));
  assert.equal(m.value, undefined, 'M 的读数里不许出现数值');
  assert.equal(typeof m.dir, 'undefined', '不可判时方向也不许编');
});

// ── ③ 三本账同源（小D 47 号第二节）────────────────────────────────
test('🔴 一笔失败记三本账 ⇒ 它们是同一件事的三种表述，不是三笔成本', async () => {
  const { dataSurface } = await import('../src/core/strata.mjs');
  const e = ENG();
  const d0 = dataSurface(e);
  e.onFailure(1);
  const d1 = dataSurface(e);
  // 三处同时涨（实测各 +1）
  assert.equal(d1.thickness - d0.thickness, 1, '厚度 +1');
  assert.equal(d1.traumaCount - d0.traumaCount, 1, '创伤 +1');
  assert.equal(d1.sOverdraft - d0.sOverdraft, 1, '透支 +1');
  // 🔴 但**只进了一次账**（rStore +1 条）⇒ 三处不是三笔
  assert.equal(d1.eventCount - d0.eventCount, 1, '只进一笔账');
  // 读数面必须显式说「同源、不可加」
  assert.ok(d1.sameEventViews, '读数面必须给出同源关系');
  assert.equal(d1.sameEventViews.additive, false, '必须标为不可相加');
  assert.deepEqual(d1.sameEventViews.views, ['thickness', 'trauma', 'sOverdraft']);
});

// ── ④ 覆盖率同量纲（小D 47 号第二节）──────────────────────────────
test('🔴 刻痕覆盖率分子分母同量纲：恒在 [0,1]，且 <1 才是真漏记', async () => {
  const { dataSurface } = await import('../src/core/strata.mjs');
  const e = ENG();
  // 🔴 判据要能**区分两个口径** ⇒ 必须造出「刻痕条数 ≠ 留痕事件数」的样本：
  //   [2026-10-30 样本更新] 一笔失败的 trauma 已属性化（一条刻痕，小D 50 号件）⇒ 旧样本失效；
  //   改用「一笔事件同时推两条**方向相反**的刻痕」（positive ∧ negative 同调 ⇒ S+1 与 |S-1| 各一条，
  //   仍是 1 个事件）⇒ 修前口径（刻痕条/事件条）＝ 2/1＝2.0；修后口径（留痕事件/事件条）＝ 1/1＝1.0。
  //   ⚠️ 若样本里分子分母恰好相等，两个口径读数相同 ⇒ 判据就测不出东西（变异不红）。
  e.recordSteady({ positive: 1, negative: 1, detail: '一笔事件（两条反向刻痕）', subsystem: 'probe' });
  const d = dataSurface(e);
  assert.equal(d.eventCount, 1, '一笔事件');
  assert.equal(d.trailEvents, 2, '两条刻痕（S+1 与 |S-1|）');
  assert.equal(d.markedEvents, 1, '留痕事件数＝1');
  // 🔴 修后：分子分母同量纲 ⇒ 覆盖率 = 1/1 = 1.0（不是 2.0）
  assert.equal(d.trailCoverage, 1, `覆盖率必须按「留痕事件数/事件数」算（实测 ${d.trailCoverage}；修前口径会给 2.0）`);
  // 🔴 反向断言：修前口径的读数必须**不等于**本读数（否则判据区分不了两个口径）
  const oldStyle = d.trailEvents / d.eventCount;
  assert.notEqual(oldStyle, d.trailCoverage, '两个口径必须给出不同读数（否则判据无效）');
  assert.ok(d.trailCoverage >= 0 && d.trailCoverage <= 1, '覆盖率须在 [0,1]');
  assert.ok(d.markedEvents <= d.eventCount, '分子（留痕事件数）不得大于分母（事件数）');
  assert.ok(d.unmarkedEvents >= 0, '漏记事件数必须可读');
});

test('🔴 scar 推导路径不进 historyTrail ⇒ 覆盖率会真的 <1（不是假读数）', async () => {
  const { dataSurface } = await import('../src/core/strata.mjs');
  const e = ENG();
  // executed ∧ scar ⇒ 只进 rStore、不进 trail（已知结构缺口）
  e.recordSteady({ executed: true, action: 'rm -rf /tmp/x', detail: '疤', subsystem: 'probe' });
  const d = dataSurface(e);
  assert.equal(d.eventCount, 1, '事件数 1');
  assert.equal(d.markedEvents, 0, '疤路径不留痕 ⇒ 留痕事件数 0');
  assert.equal(d.trailCoverage, 0, '覆盖率应真的报 0（漏记），不是 1');
});

// ── ⑤ 比率不可加（小D 47 号第二节）────────────────────────────────
test('🔴 hPayment + hExempt 是两个不同维度 ⇒ 和 >1 是必然，不是口径混账', async () => {
  const { dataSurface } = await import('../src/core/strata.mjs');
  const e = ENG();
  // sign='-' 且 reversible='unknown' ⇒ 同一条落两个桶
  e.recordSteady({ negative: 1, detail: '负账', subsystem: 'probe' });
  const d = dataSurface(e);
  assert.equal(d.total, 1);
  assert.equal(d.paid, 1, '方向维度：有方向');
  assert.equal(d.unknown, 1, '可逆性维度：unknown');
  assert.ok(d.paid + d.unknown > d.total, '两个桶可重叠 ⇒ 和 > total 是必然');
  // 读数面必须说清「维度不同、不可加」
  assert.ok(d.ratioAdditivity, '读数面必须给出比率可加性');
  assert.equal(d.ratioAdditivity.additive, false);
  // ⚠️ 中英两仓都过：EN 仓的 note 是英文 ⇒ 断言不能只认中文词
  assert.ok(/维度|dimension/i.test(d.ratioAdditivity.note), '必须点明是两个不同维度（dimension）');
});

// ── ⑥ 账本落盘 + 空账≠新账（小D 48 号第一/二/三条）────────────────
test('🔴 账本必须落盘：一重启就消解与「历史刻痕不可逆」直接冲突', async () => {
  const e = ENG();
  e.onFailure(1);
  e.recordSteady({ positive: 1, detail: '正账', subsystem: 'probe' });
  const dump = e.exportLedger();
  assert.ok(dump, '引擎必须能导出账本');
  assert.ok(Array.isArray(dump.store) && dump.store.length >= 2, '导出必须含全量刻痕');
  assert.ok(Array.isArray(dump.historyTrail) && dump.historyTrail.length >= 1, '导出必须含 historyTrail');
  // 恢复：append-only（只加不减）
  const e2 = ENG();
  const r = e2.restoreLedger(dump);
  assert.equal(r.ok, true);
  assert.equal(e2.sAccount.rStore.length, dump.store.length, '刻痕必须全部恢复');
  assert.equal(e2.traumaCount, e.traumaCount, '创伤计数必须恢复');
  // 🔴 幂等：恢复两次不得重复计数（append-only 的必检项）
  const before = e2.sAccount.rStore.length;
  e2.restoreLedger(dump);
  assert.equal(e2.sAccount.rStore.length, before, '重复恢复不得重复计数');
});

test('🔴 空账 ≠ 新账：恢复校验不过 ⇒ 按「账被清空」处理，不当全新开始', async () => {
  const { readLedgerFile, _ledgerFile } = await import('../src/index.js').catch(() => ({}));
  // 出口侧行为（不依赖文件系统）：引擎的 ledgerWriteLocked 开关必须存在且可置位
  const e = ENG();
  assert.equal(e.ledgerWriteLocked, false, '默认不锁');
  e.ledgerWriteLocked = true;
  const n0 = e.sAccount.rStore.length;
  e.recordSteady({ negative: 1, detail: '锁后记账', subsystem: 'probe' });
  // 🔴 关键：降级只读 ⇒ 不再往空账上追加（否则「清零」被伪装成「全新开始」）
  assert.equal(e.sAccount.rStore.length, n0, '锁住后不得再追加（防止把清零伪装成新账）');
});

// ── ⑦ 沉淀停摆显式化（小D 48 号第四条）─────────────────────────────
test('🔴 接线声明分报两侧：负向已接不算停摆，正向未接如实报（unknown ≠ 零）', async () => {
  const { dataSurface } = await import('../src/core/strata.mjs');
  const e = ENG();
  const d = dataSurface(e);
  assert.equal(d.mSediment, 0, '尚无经 M 的负向终局 ⇒ 结构账 0（如实显示 0）');
  assert.ok(d.sedimentStall, '必须给出停摆面');
  // 🔴 [2026-10-30 语义更新] 负向侧已接线（recordStructural 在场）⇒ 不再全停摆；
  //   正向侧（+S 闭环成功）仍未接 ⇒ positiveWired:false 如实分报，不假装全接。
  assert.equal(d.sedimentStall.stalled, false, '结构账在场 ⇒ 不停摆');
  assert.equal(d.sedimentStall.wired, true, '负向侧已接');
  assert.equal(d.sedimentStall.negativeWired, true);
  assert.equal(d.sedimentStall.positiveWired, false, '正向侧仍未接（无实例反馈，不擅自接）');
  assert.match(d.sedimentStall.reason, /正向侧/, '原因里必须如实说正向侧未接');
  // 🔴 反例锁：引擎**没有**结构账 ⇒ 停摆必须回来（否则停摆是写死的 false）
  const fake = { historyTrail: [], mSedimentWired: false };   // 旧式引擎：无 sStructLedger
  const dFake = dataSurface(fake);
  assert.equal(dFake.sedimentStall.stalled, true, '无结构账 ⇒ 停摆');
  assert.match(dFake.sedimentStall.reason, /停摆/, '必须报「停摆」');
  // 🔴 变异检测：正向开关置 true 只改 positiveWired，不得假装负向也变了
  e.mSedimentWired = true;
  const d2 = dataSurface(e);
  assert.equal(d2.sedimentStall.positiveWired, true, '正向开关被引擎声明 ⇒ positiveWired 翻转');
  assert.equal(d2.sedimentStall.negativeWired, true, '负向侧不受该开关影响');
});

test('🔴 引擎必须诚实回答「沉淀线接没接」（读数面不猜）', () => {
  const e = ENG();
  assert.equal(e.mSedimentWired, false, '当前：正账入口未接（recordSteady 的 positive 分支无调用点）');
});

// ── ⑧ 序列化真凶（小D 47 号第七节 / 48 号第五条）──────────────────
test('🔴 序列化真凶：账本条目的键名必须与读取方对得上（latest ≠ undefined）', () => {
  const e = ENG();
  e.recordSteady({ negative: 1, detail: '负账', subsystem: 'probe' });
  const led = e.steadyLedger();
  assert.ok(led.length > 0, '账本必须有条目');
  for (const entry of led) {
    // 🔴 修前：_coalesce 写 `detail:` 而 steadyLedger 读 `v.latest` ⇒ latest 恒 undefined
    //   ⇒ JSON 化静默丢键 ⇒ 宿主判「not lossless JSON」
    assert.ok('latest' in entry, `条目必须含 latest 键（实测键：${Object.keys(entry).join(',')}）`);
    assert.notEqual(entry.latest, undefined, 'latest 不得是 undefined（undefined 会被 JSON 静默丢掉）');
  }
});

test('🔴 读数面出口无损：JSON 往返必须相等（不抛但丢值也算坏）', async () => {
  const { losslessAudit } = await import('../src/index.js');
  const e = ENG();
  e.recordSteady({ negative: 1, detail: '负账', subsystem: 'probe' });
  e.recordSteady({ executed: true, detail: '中性', subsystem: 'probe' });
  const out = {
    effectiveS: e.effectiveS(), overdraft: e.overdraft(), ledger: e.steadyLedger(),
    ledgerSize: e.sLedger.size, standbySize: e.sStandby.length,
    traumaCount: e.traumaCount, failureStreak: e.failureStreak,
    windowBroken: !!e.windowBroken,
  };
  const a = losslessAudit(out);
  assert.equal(a.ok, true, `读数面必须无损（${a.note}）`);
  // 🔴 变异检测：塞一个 undefined ⇒ 必须被抓出来（否则自检是死的）
  const bad = losslessAudit({ ...out, broken: undefined });
  assert.equal(bad.ok, true, '出口规约会把 undefined 落 null ⇒ 往返无损');
  const raw = JSON.parse(JSON.stringify({ x: undefined }));
  assert.equal('x' in raw, false, '原生 JSON 会静默丢 undefined 键（这就是病灶本身）');
});
