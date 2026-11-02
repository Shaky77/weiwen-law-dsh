// 五层推演读数的机械锁
// ════════════════════════════════════════════════════════════════════
// 这条锁防的是三种病（都在 2026-10-19 当天各出现过一次）：
//   ① 「造了结构不用」—— 量定义了，但没接到任何取值器 ⇒ 静默；
//   ② 「算不出就说算不出」变成了「算不出就沉默」—— pending 不带 evidence；
//   ③ 「跨维度代入」—— 拿当前值当历史厚度，两个量名字都叫 S。
//
// 双向验证过：正常态全绿；注入「删掉 evidence」/「颠倒层序」立刻红。
// ════════════════════════════════════════════════════════════════════
import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { STRATA, QSTAT, SUBSTITUTION_BAN, compute, dataSurface, strataReadout } from '../src/core/strata.mjs';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'core', 'strata.mjs');

const ALL_Q = STRATA.flatMap((s) => s.quantities.map((q) => ({ layer: s.layer, ...q })));

test('① 五层齐全且顺序与链序定义一致（链序不可换）', () => {
  assert.deepEqual(STRATA.map((s) => s.layer), ['R', 'S', 'D', 'H', 'M']);
});

test('② 每个量必须是三态之一 —— 没有第四种「未标」', () => {
  const legal = new Set(Object.values(QSTAT));
  for (const q of ALL_Q) {
    assert.ok(legal.has(q.status), `量 ${q.key} 状态非法：${q.status}`);
  }
});

test('③ 每个量都有取值器 —— 定义了没接线就算静默', () => {
  const surface = dataSurface(null);
  for (const q of ALL_Q) {
    const r = compute(q.key, surface);
    assert.ok(legalStatus(r.status), `量 ${q.key} 取值器返回非法状态 ${r.status}`);
    assert.notStrictEqual(r.status, undefined, `量 ${q.key} 无取值器`);
  }
  function legalStatus(s) { return Object.values(QSTAT).includes(s); }
});

test('④ pending / absent 必须带 evidence —— 算不出可以，说不出为什么不行', () => {
  for (const q of ALL_Q) {
    if (q.status === QSTAT.PENDING || q.status === QSTAT.ABSENT) {
      assert.ok(q.evidence && q.evidence.trim().length > 0, `量 ${q.key} 落在 ${q.status} 却没有 evidence`);
    }
  }
});

test('⑤ 每层必须写明「在哪停」—— 没有停线的层会一路推成判决', () => {
  for (const s of STRATA) {
    assert.ok(Array.isArray(s.stopAt) && s.stopAt.length > 0, `层 ${s.layer} 缺 stopAt`);
  }
});

test('⑥ 跨层代入禁令：被禁的两个量，聚合方向必须真的相反', () => {
  const byKey = new Map(ALL_Q.map((q) => [q.key, q]));
  for (const ban of SUBSTITUTION_BAN) {
    const a = byKey.get(ban.a);
    const b = byKey.get(ban.b);
    assert.ok(a && b, `禁令 ${ban.id} 指向的量不存在：${ban.a} / ${ban.b}`);
    const agg = (q) => (/Σ|sum/i.test(q.expr) ? 'sum' : (/min|max/i.test(q.expr) ? 'extreme' : 'other'));
    assert.notStrictEqual(agg(a), agg(b), `禁令 ${ban.id}：两端聚合方向相同（${agg(a)}），不是「相反」⇒ 不该禁，或禁令写错`);
  }
});

test('⑦ 禁止的代入必须真的会算错 —— 用假数据证明禁令不是空话', () => {
  // 构造：两个子系统 S 分别为 5 / 1，全量账 40 笔刻痕
  //   正确：ΣS = 40（厚度），S_now = 1（木桶短板）
  //   错误：拿 S_now 当 ΣS ⇒ 报 1 ⇒ 若 R₀ = 30，会把「够厚」误判成「不够」
  const fake = {
    sBySubsystem: { a: 5, b: 1 },
    historyTrail: Array.from({ length: 40 }, () => ({ type: 'S+1', amount: 1 })),
    traumaCount: 0,
    sAccount: { rStore: Array.from({ length: 40 }, () => ({ sign: '+', reversible: 'none', rDomains: [] })) },
  };
  const s = dataSurface(fake);
  assert.strictEqual(s.thickness, 40);
  assert.strictEqual(s.sNow, 1);
  assert.notStrictEqual(s.thickness, s.sNow, '厚度与当前值在这组数据下必须不同，否则本测试无鉴别力');
});

test('⑫ 刻痕覆盖率必须能抓到「全量账漏记 scar」——用真引擎，不用假数据', async () => {
  const { WeiwenLawEngine } = await import('../src/core/engine.mjs');
  const e = new WeiwenLawEngine();
  e.recordSteady({ action: 'rm -rf /data/users', executed: true, topic: 'a' }); // scar ⇒ delta -1，但历史账不记
  e.recordSteady({ positive: 1, topic: 'b' });                                   // 显式正向 ⇒ 历史账记
  const s = dataSurface(e);
  assert.strictEqual(s.thickness, 2, '全量账应有 2 笔');
  assert.strictEqual(s.trailCoverage, 0.5, '覆盖率应为 1/2 ⇒ 差异被显式报出，而不是被抹平');
  assert.ok(s.trailCoverage < 1, 'scar 路径漏记必须可被这个量检出');
});

test('⑬ 厚度取自全量账：ΣS 必须 ≥ 历史账条数（厚度不许系统性低估）', async () => {
  const { WeiwenLawEngine } = await import('../src/core/engine.mjs');
  const e = new WeiwenLawEngine();
  e.recordSteady({ action: 'rm -rf /data/users', executed: true, topic: 'a' });
  e.recordSteady({ action: 'shred -u /data/x', executed: true, topic: 'b' });
  e.recordSteady({ positive: 3, topic: 'c' });
  const s = dataSurface(e);
  assert.ok(s.thickness >= s.trailEvents, `厚度 ${s.thickness} 小于历史账条数 ${s.trailEvents} ⇒ 取错源`);
  assert.strictEqual(s.thickness, 3, '两笔 scar + 一笔正向 ＝ 3 笔全量刻痕');
});

test('⑧ 只读性：strata 不得 import engine（否则它就成了第二个闸门）', () => {
  const text = readFileSync(SRC, 'utf8');
  assert.ok(!/from\s+['"].*engine\.mjs['"]/.test(text), 'strata.mjs 引入 engine ⇒ 破坏只读边界');
  assert.ok(!/\brequire\(/.test(text), 'strata.mjs 使用 require ⇒ 会破坏浏览器镜像');
  assert.ok(!/from\s+['"]node:/.test(text), 'strata.mjs 引入 node 内置模块 ⇒ docs 镜像会判红');
});

test('⑨ 每层至少有一个可算量 —— 整层不可算的层不该出现在「推」里', () => {
  for (const s of STRATA) {
    const ok = s.quantities.filter((q) => q.status === QSTAT.OK).length;
    assert.ok(ok > 0, `层 ${s.layer} 一个可算量都没有 ⇒ 它不是推演层，是声明层`);
  }
});

test('⑩ 层内量的 key 不得跨层重复（同 key 必须同义）', () => {
  const byKey = new Map();
  for (const q of ALL_Q) {
    const prev = byKey.get(q.key);
    if (prev) {
      assert.strictEqual(prev.expr, q.expr, `量 ${q.key} 在 ${prev.layer}/${q.layer} 两层表达不同 ⇒ 一桶两义`);
    }
    byKey.set(q.key, q);
  }
});

test('⑪ 读数总览可跑，且三档计数之和等于总量', () => {
  const r = strataReadout(null);
  assert.strictEqual(r.layers.length, 5);
  const sum = r.summary.可算 + r.summary.待取证 + r.summary.未实现;
  assert.strictEqual(sum, r.layers.reduce((a, l) => a + l.count.total, 0));
});
