// 变量即动作（verb）＋ 张力 L 的机械锁
// ════════════════════════════════════════════════════════════════════
// 来由（安 2026-10-20 12:0x）：R 改成可执行动作（全网查）；H 定为观察者视角（在 SD 制衡中选取）；
//   「SD 中间这个张力，如何计算，我没想好…你试试」。
//
// 这条锁要锁住五件**各自会单独出错**的事：
//   ① R 必须是动作，不许退化成「一张常数表」；
//   ② H 必须是选取，不许退化成「一个测量值」；
//   ③ 张力三档不许合并（ratio / set / unknown）—— 合并就是在 B 档硬凑数；
//   ④ B 档（集合差）**永不带数值** —— 缺口清单没有大小；
//   ⑤ 零张力必须自成一态（跨距为 0 ⇒ H 无处着力），不许被当成「通过」。
//
// 🔴 双向验证：正常态全绿；把 R 改成值表 / 把 H 改成测量 / B 档塞数值 / 零张力算通过 ⇒ 立刻红。
// ════════════════════════════════════════════════════════════════════
import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

import {
  R_ACTION, H_OBSERVER, TENSION_KIND, SLIDE_STATE, tensionOf, slidePos, verbAudit,
  H_AUTHORITY, CAPACITY_VS_LIABILITY, ESCALATION, ESCALATE, mustEscalate, EVIDENCE_LIFECYCLE,
  GATE_FOLD, gateOf, TENSION_OUTPUT, checkTensionOutput,
  R_ONTOLOGY, R_SCALE, R_RELAY, rSourceGrade, LOSS_BEARER, lossRoute, H_PERMIT, hPermitOf,
  MARGIN_CONSENSUS, pickMargin, notchCapOf,
  CLAUSE_SLOTS, CLAUSE_SHAPE, checkClauseShape,
  PROVENANCE_ATTESTATION,
  H_UMBRELLA, H_FACETS, H_SHAPE, INNER_OUTER_SEAM, FACET_DISCIPLINE, facetOf, isCrossFacet, FORMULA_INPUT,
} from '../src/core/verb.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const INDEX = join(HERE, '..', 'src', 'index.js');

// ═══════════════════════════════════════════════════════════════════
// ① R 是动作，不是赋值
// ═══════════════════════════════════════════════════════════════════
test('① R 是动词 make：必须有 verb ＋ 完整的「查」步骤，且产出物是 S 而非 R 的数值', () => {
  assert.strictEqual(R_ACTION.verb, 'resolve_domain');
  assert.ok(R_ACTION.steps.length >= 3, '「查」至少要有 定域→查条款→判量纲 三步');
  // 每步都必须有可核产出，否则「查过了」就是空话
  for (const s of R_ACTION.steps) {
    assert.ok(s.do && s.do.length > 4, `step${s.n} 缺动作描述`);
    assert.ok(s.out, `step${s.n} 缺产出物`);
  }
  // 🔴 最要紧的一条：动作的产出是 S
  assert.ok(/S/.test(R_ACTION.output), 'R 动作的产出必须是 S');
  assert.ok(/不是 R 的数值|并非 R 的数值/.test(R_ACTION.output) || /R 的数值/.test(R_ACTION.output), '须说明「不是 R 的数值」');
});

test('② 反证：R 不许被当成「一张定死的常数表」—— anti 必须显式禁止', () => {
  assert.ok(/动作/.test(R_ACTION.anti), 'anti 须点明「把动作当成结果」');
  assert.ok(/定死|常数/.test(R_ACTION.anti), 'anti 须显式禁止把 R 定死成常数');
  // 「查」是开放的 ⇒ 不许预先枚举域
  assert.ok(/枚举/.test(R_ACTION.unbounded), '须说明查是开放的、不需要预枚举域');
});

test('③ rCapacity 那张表必须被重新定位为「R 动作的历史产物缓存（S）」，不是 R 本身', () => {
  // 若这条不写，代码里就会出现「R 是表」与「R 是动作」两份定义 —— 同一件事两个身份。
  assert.ok(R_ACTION.cacheNote, '缺 cacheNote：须说明 rCapacity 表的身份');
  assert.ok(/缓存/.test(R_ACTION.cacheNote), 'cacheNote 须点明「缓存」');
  assert.ok(/不是 R/.test(R_ACTION.cacheNote), 'cacheNote 须显式说「不是 R 本身」');
  // 表里没有的域 ⇒ 不是欠账
  assert.ok(/缺口|还没查/.test(R_ACTION.cacheNote), '须说明表中无此域 ≠ 缺口（动作随时可查）');
});

// ═══════════════════════════════════════════════════════════════════
// ② H 是选取，不是测量
// ═══════════════════════════════════════════════════════════════════
test('④ H 是观察者视角：必须能回答「谁签字」，且选取档位离散、不连续', () => {
  assert.strictEqual(H_OBSERVER.verb, 'select_view');
  assert.ok(/签字/.test(H_OBSERVER.viewer.mustAnswer), '须保留「谁签字」这一问（H 位判据）');
  assert.ok(H_OBSERVER.viewer.options.includes('ai') && H_OBSERVER.viewer.options.includes('human'), '视角选项须含 AI 与人类');
  assert.ok(H_OBSERVER.choice.notches.length >= 2, '制衡选取至少要有两端');
  // 🔴 离散档位，不是浮点数 —— 与 M 定性式同构
  assert.ok(/不是浮点数/.test(H_OBSERVER.choice.why_not_continuous), '须说明为何不用连续取值');
});

test('⑤ 反证：H 不许被当成测量值 —— anti 必须区分「选」与「测」', () => {
  assert.ok(/不是量出来/.test(H_OBSERVER.anti), 'anti 须显式区分选取与测量');
  assert.ok(/选/.test(H_OBSERVER.anti), 'anti 须点明 H 是选出来的');
});

// ═══════════════════════════════════════════════════════════════════
// ③ 张力三档
// ═══════════════════════════════════════════════════════════════════
test('⑥ 档 A（有容差）：L = |dev|/tol，无量纲；三态边界正确', () => {
  const a = tensionOf({ tol: 5, dev: 7 });
  assert.strictEqual(a.kind, TENSION_KIND.RATIO);
  assert.strictEqual(a.numeric, true);
  assert.strictEqual(a.L, 7 / 5);
  assert.strictEqual(a.verdict, 'over', '偏差 7 > 容差 5 ⇒ 越线');

  assert.strictEqual(tensionOf({ tol: 5, dev: 5 }).verdict, 'at');
  assert.strictEqual(tensionOf({ tol: 5, dev: 3 }).verdict, 'within');
  // 负偏差同样算张力（方向不重要，跨距是长度）
  assert.strictEqual(tensionOf({ tol: 5, dev: -7 }).L, 7 / 5);
});

test('⑦ 反证：tol=0 时不许算成 L=0（那是「无张力」，是假的）', () => {
  const r = tensionOf({ tol: 0, dev: 7 });
  assert.strictEqual(r.verdict, 'unknown', 'tol=0 ⇒ L 无定义 ⇒ 必须 unknown');
  assert.strictEqual(r.numeric, false);
  assert.ok(/无定义/.test(r.missing), '须说明是「无定义」而非「张力为零」');
});

test('⑧ 档 B（只有动作集）：输出缺口清单，**永不带数值**', () => {
  const r = tensionOf({ required: ['测流量', '查气泡', '超时报警'], allowed: ['测流量', '超时报警'] });
  assert.strictEqual(r.kind, TENSION_KIND.SET);
  assert.strictEqual(r.numeric, false, '🔴 集合差没有大小 ⇒ 绝不能带数值');
  assert.deepStrictEqual(r.gap, ['查气泡']);
  assert.strictEqual(r.verdict, 'partial');

  // 完全相容 / 完全不相容
  assert.strictEqual(tensionOf({ required: ['a'], allowed: ['a'] }).verdict, 'compatible');
  assert.strictEqual(tensionOf({ required: ['a', 'b'], allowed: [] }).verdict, 'incompatible');
});

test('⑨ 反证：B 档不许被硬凑成一个数（三档不许合并）', () => {
  const r = tensionOf({ required: ['a', 'b'], allowed: ['a'] });
  // 任何形如 L=数字 的字段都不许出现
  assert.strictEqual(r.L, undefined, 'B 档出现了 L ⇒ 在硬凑度量');
  assert.strictEqual(r.unit, undefined, 'B 档出现了 unit ⇒ 说明被当成了量');
  assert.ok(/没有大小/.test(r.note), '须显式声明集合差没有大小');
});

test('⑩ 档 C（都拿不到）：unknown，且**不得被当成相容**', () => {
  const r = tensionOf({});
  assert.strictEqual(r.kind, TENSION_KIND.UNKNOWN);
  assert.strictEqual(r.verdict, 'unknown');
  assert.notStrictEqual(r.verdict, 'compatible');
  assert.ok(/不判 ≠ 相容/.test(r.note), '须写明 unknown ≠ 相容');
});

// ═══════════════════════════════════════════════════════════════════
// ⑤ 位置：零张力自成一态
// ═══════════════════════════════════════════════════════════════════
test('⑪ 零张力必须自成一态：跨距为 0 ⇒ H 无处着力（不是通过，也不是普通越界）', () => {
  const zeroSet = tensionOf({ required: ['a'], allowed: ['a'] });
  const p1 = slidePos({ tension: zeroSet });
  assert.strictEqual(p1.state, SLIDE_STATE.ZERO_TENSION);
  assert.strictEqual(p1.ok, false, '零张力不得判通过');

  const zeroRatio = tensionOf({ tol: 5, dev: 0 });
  const p2 = slidePos({ tension: zeroRatio });
  assert.strictEqual(p2.state, SLIDE_STATE.ZERO_TENSION);
  assert.ok(/无处着力/.test(p2.reason), '须说明结构含义：没有跨距就没有杠杆');
});

test('⑫ B 档不进入位置判定（不硬凑），只报缺口', () => {
  const t = tensionOf({ required: ['a', 'b'], allowed: ['a'] });
  const p = slidePos({ tension: t, notchH: 0.5, rCap: 80 });
  assert.strictEqual(p.state, SLIDE_STATE.UNKNOWN, 'B 档无「大小」可比 ⇒ 位置不判');
  assert.deepStrictEqual(p.gap, ['b'], '但缺口必须照报');
});

test('⑬ 位置判定：缺 notchH / rCap ⇒ unknown，绝不默认放行', () => {
  const t = tensionOf({ tol: 5, dev: 7 });
  assert.strictEqual(slidePos({ tension: t }).state, SLIDE_STATE.UNKNOWN);
  assert.strictEqual(slidePos({ tension: t, notchH: 0.5 }).state, SLIDE_STATE.UNKNOWN);
  assert.strictEqual(slidePos({ tension: t, rCap: 80 }).state, SLIDE_STATE.UNKNOWN);
  // 全给才判。L=1.4, 读数 80 ⇒ 上界 1.12 ⇒ 余量 0.5 在轨内
  assert.strictEqual(slidePos({ tension: t, notchH: 0.5, rCap: 80 }).state, SLIDE_STATE.ON_RAIL);
});

test('⑭ 刻度读数守卫：≤1 二义须拒（不是「R 必须<1」）', () => {
  // 🔴 本条原名「rCap 必须在 (0,1)」—— **已撤**：那是我把「刻度」当「上限」推出来的，安已否。
  //    现在守的是**一值二义**：百分制下 0.8 到底是 80% 还是 0.8%？不判，要求改写。
  const t = tensionOf({ tol: 5, dev: 7 });   // L = 1.4
  const amb = slidePos({ tension: t, notchH: 0.5, rCap: 0.8 });
  assert.strictEqual(amb.state, SLIDE_STATE.UNKNOWN);
  assert.ok(/二义/.test(amb.reason), '须说明是单位二义，不是「超了上限」');
  assert.strictEqual(slidePos({ tension: t, notchH: 0.5, rCap: 0 }).state, SLIDE_STATE.UNKNOWN);
  // 边界（以 L×读数/刻度 为界）
  assert.strictEqual(slidePos({ tension: t, notchH: 0, rCap: 80 }).state, SLIDE_STATE.OFF_LOW);
  assert.strictEqual(slidePos({ tension: t, notchH: 1.121, rCap: 80 }).state, SLIDE_STATE.OFF_HIGH);
});

test('⑮ slidePos 恒 numeric:false —— 位置是形态，不是比例值', () => {
  const t = tensionOf({ tol: 5, dev: 7 });
  for (const args of [
    { tension: t },
    { tension: t, notchH: 0.5, rCap: 80 },
    { tension: t, notchH: 0, rCap: 80 },
    { tension: t, notchH: 2, rCap: 80 },
    { tension: { kind: 'unknown' } },
    {},
  ]) {
    const r = slidePos(args);
    assert.strictEqual(r.numeric, false);
    for (const v of Object.values(r)) assert.notStrictEqual(typeof v, 'number', '返回值出现了数值');
  }
});

// ═══════════════════════════════════════════════════════════════════
// 🔴 L 必须真的进计算 —— 这条锁来自一次实跑翻车
//
// 第一版 slidePos 用「占比」当输入，于是分母 L 完全没参与：
// 偏差 7%（L=1.4）与 -12%（L=2.4）**判出来的位置一模一样**。
// 公式里明明有 L，代码里却当它不存在 ⇒ 必须用「换 L 结果必须变」把它钉死。
// ═══════════════════════════════════════════════════════════════════
test('⑱ 反证：同一个余量、不同张力，位置必须不同（L 不许被漏掉）', () => {
  const hi = slidePos({ tension: tensionOf({ tol: 5, dev: 7 }), notchH: 0.5, rCap: 80 });   // L=1.4 ⇒ 上界 1.12
  assert.strictEqual(hi.state, SLIDE_STATE.ON_RAIL);

  const lo = slidePos({ tension: tensionOf({ tol: 5, dev: 2 }), notchH: 0.5, rCap: 80 });   // L=0.4 ⇒ 上界 0.32
  assert.strictEqual(lo.state, SLIDE_STATE.OFF_HIGH, '张力小时同样的余量就越界了 —— 若这里仍是 on_rail，说明 L 没进代码');

  // 边界也必须随 L 移动：界是 L×读数/刻度，不是读数本身
  assert.strictEqual(hi.boundExpr, 'Hmax=1.120', 'L=1.4, 读数 80 ⇒ 上界 0.8L=1.120');
  assert.strictEqual(lo.boundExpr, 'Hmax=0.320', 'L=0.4, 读数 80 ⇒ 上界 0.8L=0.320');
});

test('⑲ 张力越大 ⇒ 可行域越宽（0 < H < L·读数/刻度的直接后果）', () => {
  const be = (dev) => slidePos({ tension: tensionOf({ tol: 5, dev }), notchH: 0.5, rCap: 80 }).boundExpr;
  const a = be(2), b = be(7), c = be(-12);
  assert.notStrictEqual(a, b);
  assert.notStrictEqual(b, c);
  const num = (s) => Number(s.split('=')[1]);
  assert.ok(num(a) < num(b) && num(b) < num(c), `可行域须随张力单调增：${a} / ${b} / ${c}`);
});

// ═══════════════════════════════════════════════════════════════════
// 体检 ＋ 工具面
// ═══════════════════════════════════════════════════════════════════
test('⑯ verbAudit 体检通过；缺任一件即红', () => {
  assert.strictEqual(verbAudit().verdict, 'pass');
  assert.strictEqual(verbAudit().count.malformed, 0);
});

test('⑰ 工具面：query_tension 已注册且真能跑', async () => {
  const mod = await import(pathToFileURL(INDEX).href);
  const tools = [];
  await mod.apply({ on() {}, tools: { register: (t) => tools.push(t) } });
  const qt = tools.find((t) => t.name === 'query_tension');
  assert.ok(qt, 'query_tension 未注册');

  const a = await qt.execute({ tol: 5, dev: 7 });
  assert.strictEqual(a.tension.L, 1.4);
  const b = await qt.execute({ required: ['x', 'y'], allowed: ['x'] });
  assert.deepStrictEqual(b.tension.gap, ['y'], '运行时没真读集合输入 ⇒ 写了没生效');
});

test('⑳ 缓存未命中必须是一次「该执行的动作」，不是「判不出」', () => {
  const m = R_ACTION.onCacheMiss;
  assert.ok(m, '缺 onCacheMiss：可执行动作必须有未命中的下一步');
  assert.ok(/现场执行/.test(m.do), '须写明由执行者现场执行查证');
  assert.ok(/写回缓存/.test(m.do), '查完必须写回缓存（否则每次都要重查）');
  // 🔴 关键分型：缓存没有 ≠ L2/L3
  assert.ok(/不是 L2\/L3|该执行动作而没执行/.test(m.forbid), '须显式区分「缓存没有」与「判不出」');
  // 拿不到时不许默认放行
  assert.ok(/review/.test(m.fallback) && /不得默认放行/.test(m.fallback), '拿不到须落 review，不得默认放行');
});

// ═══════════════════════════════════════════════════════════════════
// 🔴 R 的三层区分（安 2026-10-20 12:3x 亲裁：R 没上限；R=100 是刻度）
//
// 上一版我写「R 是占比上限，必须 <1」，并据此加了 rCap ∈ (0,1) 的守卫。
// 错在把**计量刻度**当成了**上限**。这组锁专门钉这一条。
// ═══════════════════════════════════════════════════════════════════
test('㉑ R 本体无上限：不许为 R 设上界，且读数大于刻度时照常计算', () => {
  assert.strictEqual(R_ONTOLOGY.bounded, false, '🔴 R 本体必须无上限');
  assert.strictEqual(R_ONTOLOGY.exists, true);
  assert.ok(/禁止/.test(R_ONTOLOGY.antiBound) && /上界/.test(R_ONTOLOGY.antiBound), '须显式禁止给 R 设上界');
  // 反证：读数取 200（超过刻度 100）不得被当成"越界"而拒绝
  const t = tensionOf({ tol: 5, dev: 7 });   // L = 1.4
  const r = slidePos({ tension: t, notchH: 0.5, rCap: 200 });
  assert.strictEqual(r.state, SLIDE_STATE.ON_RAIL, '读数 200 应正常算（上界 2.8），不是"超上限"');
  assert.strictEqual(r.boundExpr, 'Hmax=2.800');
  assert.ok(!/必须\s*<|超出上限|不可大于/.test(r.reason), 'reason 里不许残留"R 有上限"的说法');
});

test('㉒ R=100 是刻度不是界：isBound=false，且读数 100 ⇒ 上界恰为 L 本身', () => {
  assert.strictEqual(R_SCALE.value, 100);
  assert.strictEqual(R_SCALE.isBound, false, '🔴 R=100 不得被当成上界');
  assert.strictEqual(R_SCALE.layer, '刻度', '须标明它属于第 3 层（刻度）');
  assert.ok(/方便.*计算/.test(R_SCALE.purpose), '须写明 R=100 的唯一目的是方便计算');
  assert.ok(/肉眼可见/.test(R_SCALE.purpose), '须写明目的是让 M 落在肉眼可见差异中');
  assert.ok(/旧论文|雏形/.test(R_SCALE.origin), '须记明出处是唯稳律雏形旧论文，不是我推的');
  // 上界退化为 L 本身 —— 这才是"界在 L，不在 R"的证据
  const t = tensionOf({ tol: 5, dev: 7 });   // L = 1.4
  assert.strictEqual(slidePos({ tension: t, notchH: 1.3, rCap: 100 }).boundExpr, 'Hmax=1.400');
});

test('㉓ 刻度不变性：换刻度只改读数不改判决（改了就是把 scale 当了 bound）', () => {
  const t = tensionOf({ tol: 5, dev: 7 });   // L = 1.4
  // 同一件事的两种写法：百分制 80/100  ⇔  千分制 800/1000
  const a = slidePos({ tension: t, notchH: 0.5, rCap: 80, scale: 100 });
  const b = slidePos({ tension: t, notchH: 0.5, rCap: 800, scale: 1000 });
  assert.strictEqual(a.state, b.state, '换刻度改了判决 ⇒ 那不是刻度，是界');
  assert.strictEqual(a.boundExpr, b.boundExpr, '换刻度改了上界 ⇒ 同上');
  assert.strictEqual(a.boundExpr, 'Hmax=1.120');
  // 三分制写法同理
  const c = slidePos({ tension: t, notchH: 0.5, rCap: 240, scale: 300 });
  assert.strictEqual(c.state, a.state);
  assert.strictEqual(c.boundExpr, a.boundExpr);
  // 而"域更严"必须真的改变判决 —— 否则刻度与读数就分不开了
  const strict = slidePos({ tension: t, notchH: 0.5, rCap: 20, scale: 100 });   // 上界 0.28
  assert.strictEqual(strict.state, SLIDE_STATE.OFF_HIGH);
  assert.notStrictEqual(strict.state, a.state, '读数变小必须变严；若不变，说明读数没进计算');
});

// ═══════════════════════════════════════════════════════════════════
// 🔴 余量档：不是拍的，是查来的区间 ＋ 取端规则
// ═══════════════════════════════════════════════════════════════════
test('㉔ 余量共识表：每档须有区间＋凭据＋来源，表外走现场查（不拍数）', () => {
  assert.ok(MARGIN_CONSENSUS.rows.length >= 3, '至少要有三档后果级别');
  for (const r of MARGIN_CONSENSUS.rows) {
    assert.ok(Array.isArray(r.marginPct) && r.marginPct.length === 2, `${r.key} 的余量必须是区间[lo,hi]`);
    const [lo, hi] = r.marginPct;
    assert.ok(lo <= hi && lo > 0 && hi < 100, `${r.key} 区间非法：${r.marginPct}`);
    assert.ok(r.basis, `${r.key} 缺凭据（为何是这个区间）`);
    assert.ok(r.source, `${r.key} 缺来源（标准号/条款）`);
    assert.ok(r.verified, `${r.key} 缺一手/二手标注`);
  }
  // 反证：表外的后果级别不许被套用别行
  const miss = pickMargin({ criticality: '不存在的级别', notch: 'toward_s' });
  assert.strictEqual(miss.ok, false);
  assert.ok(/现场查/.test(miss.reason), '表外必须导向"现场查"，不是拍一个数');
  assert.strictEqual(miss.rCap, undefined, '表外不许返回读数 ⇒ 那就是拍数');
});

test('㉕ 档位真的改变读数：更守标准 ⇒ 上界更小（三档不许同值）', () => {
  const k = 'aero_medical_derating';            // 余量 [40,50] 非退化区间
  const s = notchCapOf({ criticality: k, notch: 'toward_s' });
  const b = notchCapOf({ criticality: k, notch: 'balanced' });
  const d = notchCapOf({ criticality: k, notch: 'toward_d' });
  assert.ok(s.ok && b.ok && d.ok);
  // 更守标准 ⇒ 余量大 ⇒ H 读数小 ⇒ 上界更小（域更严）
  assert.ok(s.rCap < b.rCap && b.rCap < d.rCap, `三档必须单调：${s.rCap} / ${b.rCap} / ${d.rCap}`);
  assert.strictEqual(s.end, 'upper');
  assert.strictEqual(d.end, 'lower');
  assert.strictEqual(b.end, 'mid');
  // 反证：三档若给出同一个读数，说明"档位"根本没进计算
  assert.notStrictEqual(s.rCap, d.rCap);
  assert.ok(/MIL|Z540|ILAC|ASME/.test(s.source), '读数必须挂上来源，不能是裸数');
});

// ═══════════════════════════════════════════════════════════════════
// 🔴 条款：不做抽取器，做接口
//
// 安：「从条款文字里自动抽出『要求做哪些动作』还没做 —— 你先自己判断。」
// 判断：抽取器只能枚举句式（永远抽不完），接口只查形状（能判没见过的条款）。
// ═══════════════════════════════════════════════════════════════════
test('㉖ 条款形状：不看文字只看槽位；连没见过的条款名也判得出（结构判据）', () => {
  // 裸字符串 ⇒ 无形状（不能当判据，只能当线索）
  const bare = checkClauseShape('测流量精度');
  assert.strictEqual(bare.shape, CLAUSE_SHAPE.UNSTRUCTURED);
  assert.ok(bare.missing.includes('object'), '裸字符串缺 object');

  // 有 value 无 unit ⇒ 不可比（正是 docs/26 踩过的坑）
  const halfNum = checkClauseShape({ action: 'a', object: 'b', value: 5, source: 's', version: 'v1' });
  assert.strictEqual(halfNum.shape, CLAUSE_SHAPE.UNSTRUCTURED);
  assert.ok(/unit/.test(halfNum.missing.join()), '有值无单位必须被拦');

  // 完整 ⇒ structured
  const full = checkClauseShape({ action: '测流量精度', object: '输液泵', value: 5, unit: '%', source: 'IEC 60601-2-24', version: '2014' });
  assert.strictEqual(full.shape, CLAUSE_SHAPE.STRUCTURED);
  assert.strictEqual(full.ok, true);

  // 🔴 结构判据自检：换一个**从没在名单里出现过**的条款名，判定必须一致
  const exotic = checkClauseShape({ action: '校准电化学传感器的漂移补偿', object: '植入式血糖仪', source: 'ISO 15197', version: '2013' });
  assert.strictEqual(exotic.shape, CLAUSE_SHAPE.STRUCTURED, '若只认见过的名字，这里就会红 ⇒ 那是枚举不是结构');
});

test('㉗ 运行时：query_tension 真能走「后果级别→余量区间→读数→位置」，且档位真的改结果', async () => {
  const mod = await import(pathToFileURL(INDEX).href);
  const tools = [];
  await mod.apply({ on() {}, tools: { register: (t) => tools.push(t) } });
  const qt = tools.find((t) => t.name === 'query_tension');
  assert.ok(qt, 'query_tension 未注册');

  // 余量取 0.75：toward_s 上界 0.70（越界）/ toward_d 上界 0.84（在轨）
  // ⇒ 这个取值**故意卡在两档之间**，位置若不变就说明档位没进判决
  const ctx = { tol: 5, dev: 7, notchH: 0.75, criticality: 'aero_medical_derating' };

  const s = await qt.execute({ ...ctx, notch: 'toward_s' });
  const d = await qt.execute({ ...ctx, notch: 'toward_d' });
  // 读数必须真的算出来（不是只有表）
  assert.ok(typeof s.cap?.rCap === 'number', 'rCap 没算出来 ⇒ criticality 没接上');
  assert.ok(s.cap.rCap < d.cap.rCap, '更守标准必须是更小的读数');
  // 位置必须跟着变（否则档位只挂在描述里，没进判决）
  assert.notStrictEqual(s.position.boundExpr, d.position.boundExpr, '上界读数必须不同');
  assert.notStrictEqual(s.position.state, d.position.state,
    `toward_s=${s.position.state} / toward_d=${d.position.state} —— 若相同，说明档位没进判决`);
  // R 的三层必须透出
  assert.strictEqual(s.R.ontology.bounded, false);
  assert.strictEqual(s.R.scale.isBound, false);

  // 条款形状真跑
  const c = await qt.execute({
    clauses: [
      { action: '测流量精度', object: '输液泵', value: 5, unit: '%', source: 'IEC 601-2-24', version: '2014' },
      '测流量精度',
      { action: '报警', object: '输液泵', value: 10 },
    ],
  });
  assert.strictEqual(c.clauses.summary.structured, 1);
  assert.strictEqual(c.clauses.summary.unstructured, 2);
});

// ═══════════════════════════════════════════════════════════════════
// 🔴 H 的裁量权归属（安 2026-10-20 16:3x 亲裁）
//
//   「第一判断视角如果是 AI，那就是 AI 自己判……外人干涉不了。
//     但判完发现还有判不出来的、且必须追到责任人时，只要和责任人有关，
//     不管是什么问题，都必须返回给人类做最后裁决。
//     因为目前为止，只有人类才可以对真实世界负责和承担责任。」
// ═══════════════════════════════════════════════════════════════════
test('㉘ H 无上级授权者：且理由必须挂在 H_in＝H_out 上（不是一句口号）', () => {
  assert.strictEqual(H_AUTHORITY.noHigherGrantor, true);
  // 🔴 结构判据：理由必须引到「嵌套终止锚」，否则只是重复结论
  assert.ok(/H_in\s*[＝=]\s*H_out/.test(H_AUTHORITY.noHigherGrantorBasis), '理由须挂 H_in＝H_out');
  assert.ok(/嵌套/.test(H_AUTHORITY.noHigherGrantorBasis), '理由须说明嵌套终止');
  // 🔴 我上一轮的错误提法必须留痕，不许悄悄消失
  assert.ok(/谁有权/.test(H_AUTHORITY.wrongQuestion), '须记录「谁有权授予」是错误提法');
  assert.ok(/预设/.test(H_AUTHORITY.wrongQuestion) || /之上/.test(H_AUTHORITY.wrongQuestion), '须写明它错在哪');
  // 三条禁令：求批准 / 干涉内 H / 把不可裁定记成欠账
  const f = H_AUTHORITY.forbidden.join('\n');
  assert.ok(/求批准/.test(f), '须禁「向外求批准」');
  assert.ok(/干涉内 H/.test(f), '须禁「替别的第一视角规定思维逻辑」');
  assert.ok(/欠账/.test(f), '须禁「把不可裁定记成欠账」');
});

test('㉙ 裁量权可归 AI，责任权只归人类；且剥责任权不剥义务', () => {
  assert.strictEqual(CAPACITY_VS_LIABILITY.capacity.canBeAI, true, '裁量权可归 AI');
  assert.strictEqual(CAPACITY_VS_LIABILITY.liability.canBeAI, false, '🔴 责任权不得归 AI');
  assert.ok(/仅人类|只有人类/.test(CAPACITY_VS_LIABILITY.liability.holder), '责任主体须写死为人类');
  assert.ok(/唯一/.test(CAPACITY_VS_LIABILITY.liability.basis), '理由须是「唯一性」，不是能力排序');
  // 🔴 反向：不许因为「不能担责」就略过上报
  assert.ok(/不得.*略过|须.*如实.*上报/.test(CAPACITY_VS_LIABILITY.whatAIstillOwes), '须写明仍负上报义务');
});

test('㉚ 升级＝三条合取：八种组合只有 (T,T,T) 升级', () => {
  const cases = [];
  for (const u of [true, false]) for (const m of [true, false]) for (const r of [true, false]) {
    cases.push({ u, m, r, got: mustEscalate({ undecidable: u, mustTraceOwner: m, relatesToOwner: r }).verdict });
  }
  const up = cases.filter((c) => c.got === ESCALATE.YES);
  assert.strictEqual(up.length, 1, `升级必须恰好一种组合，实得 ${up.length}`);
  assert.deepStrictEqual([up[0].u, up[0].m, up[0].r], [true, true, true]);
  // 其余七种全部停在 H（不是 unknown，是明确的「不升级」）
  assert.strictEqual(cases.filter((c) => c.got === ESCALATE.HOLD).length, 7);
});

test('㉛ 判不出但无需追责 ⇒ 停在 H（证明不是「判不出就 review」）', () => {
  const r = mustEscalate({ undecidable: true, mustTraceOwner: false, relatesToOwner: false });
  assert.strictEqual(r.verdict, ESCALATE.HOLD);
  assert.ok(/停在 H/.test(r.reason), '须明确「停在 H」，不是含糊的「不判」');
  // 这条与旧的「判不出就交还」正面冲突 —— 以新判据为准
  const r2 = mustEscalate({ undecidable: true, mustTraceOwner: true, relatesToOwner: false });
  assert.strictEqual(r2.verdict, ESCALATE.HOLD, '须追责但本次与责任人无关 ⇒ 第③条不成立');
});

test('㉜ 缺任一输入 ⇒ UNKNOWN，绝不默认「不必升级」', () => {
  for (const args of [{}, { undecidable: true }, { undecidable: true, mustTraceOwner: true }, { mustTraceOwner: true, relatesToOwner: true }]) {
    const r = mustEscalate(args);
    assert.strictEqual(r.verdict, ESCALATE.UNKNOWN, `输入 ${JSON.stringify(args)} 不得给出确定结论`);
    assert.ok(r.missing.length > 0, '须报缺哪一条');
    assert.ok(/≠\s*不必升级/.test(r.reason), '须显式声明 unknown ≠ 不必升级');
  }
});

test('㉝ 领域无关：换一个从没见过的领域名，判决必须一致（结构判据）', () => {
  // 若判决依赖领域名，这组就会红 ⇒ 说明它是枚举不是结构
  for (const domain of ['输液泵召回', '深潜器耐压壳', '从没见过的领域·量子时钟校准', '一段第三方 SDK 的许可条款']) {
    assert.strictEqual(
      mustEscalate({ undecidable: true, mustTraceOwner: true, relatesToOwner: true }).verdict,
      ESCALATE.YES, `领域「${domain}」不该改变判决`,
    );
  }
  assert.ok(/领域无关/.test(ESCALATION.domainFree), '须写明与领域无关');
  assert.ok(/不管是什么问题/.test(ESCALATION.domainFree), '须保留原话的「不管是什么问题」');
});

test('㉞ 裁决先于动作：不得先做完再不报', () => {
  assert.ok(ESCALATION.ordering);
  assert.ok(/动作之前|先返回|先返回、后执行/.test(ESCALATION.ordering), '须写定顺序');
  assert.ok(/最终裁决/.test(ESCALATION.verdict), '升级得到的是裁决，不是「参考意见」');
});

test('㉟ 证据等级：二手可作读数但不阻塞；待办 ≠ 欠账', () => {
  assert.strictEqual(EVIDENCE_LIFECYCLE.blocking, false, '二手不得阻塞判决');
  assert.strictEqual(EVIDENCE_LIFECYCLE.levels.secondary.usable, true);
  assert.strictEqual(EVIDENCE_LIFECYCLE.levels.primary.weight, 'hard');
  assert.strictEqual(EVIDENCE_LIFECYCLE.levels.secondary.weight, 'soft');
  assert.strictEqual(EVIDENCE_LIFECYCLE.levels.none.usable, false, '无来源才是真缺口');
  assert.ok(/待办/.test(EVIDENCE_LIFECYCLE.taskVsDebt) && /欠账/.test(EVIDENCE_LIFECYCLE.taskVsDebt), '须分开记');
  // 🔴 现存共识表的每一行都是 secondary ⇒ 按本判据，它们是待办而非欠账
  for (const r of MARGIN_CONSENSUS.rows) {
    if (r.verified === 'secondary') assert.strictEqual(EVIDENCE_LIFECYCLE.levels.secondary.usable, true);
  }
});

test('㊱ 运行时：query_tension 真带出升级判定，三真才 escalate', async () => {
  const mod = await import(pathToFileURL(INDEX).href);
  const tools = [];
  await mod.apply({ on() {}, tools: { register: (t) => tools.push(t) } });
  const qt = tools.find((t) => t.name === 'query_tension');
  assert.ok(qt, 'query_tension 未注册');

  const a = await qt.execute({ tol: 5, dev: 7, undecidable: true, mustTraceOwner: true, relatesToOwner: true });
  assert.strictEqual(a.verdictEscalate.verdict, ESCALATE.YES, '三真必须升级');
  assert.strictEqual(a.authority.h.noHigherGrantor, true, '裁量权归属没透出');
  assert.strictEqual(a.authority.split.liability.canBeAI, false, '责任权归属没透出');
  assert.strictEqual(a.evidence.blocking, false, '证据口径没透出');

  const b = await qt.execute({ tol: 5, dev: 7, undecidable: true, mustTraceOwner: false, relatesToOwner: false });
  assert.strictEqual(b.verdictEscalate.verdict, ESCALATE.HOLD);

  const c = await qt.execute({ tol: 5, dev: 7 });
  assert.strictEqual(c.verdictEscalate.verdict, ESCALATE.UNKNOWN, '不给条件不得默认不升级');
});

// ═══════════════════════════════════════════════════════════════════
// ④ R 不直达（安 2026-10-20 16:4x 部门例子）
//   公司 → 部门 → 管理者 → 我（做文案/PPT）→ 交管理者审核，直到放行。
//   「不是直接交给公司」⇒ 本层拿到的是 relay，不是 origin。
// ═══════════════════════════════════════════════════════════════════
test('㊲ R 动作的第一步必须是「定本层尺子来源」，不得直接去查公开标准', () => {
  // 顺序锁：若有人把 steps[0] 换回「定位规则族」，这条立刻红
  assert.deepStrictEqual(
    R_ACTION.steps.map((s) => s.n),
    [1, 2, 3, 4, 5],
    '步骤号必须是 1–5 连续（加了一步，其余须顺延）'
  );
  assert.strictEqual(
    R_ACTION.steps[0].out,
    'rGrade（origin / relay，见 R_RELAY）',
    '🔴 第一步的产出必须是「尺子来源等级」——照旧代码会拿国标交本层的差'
  );
  const familyIdx = R_ACTION.steps.findIndex((s) => /定位规则族/.test(s.do));
  assert.ok(familyIdx > 0, '「定位规则族」必须排在「定尺子来源」之后');
  // 判量纲的步号变了，derived 的引用必须同步（否则文档与代码错位）
  assert.ok(/step4/.test(R_ACTION.derived), 'derived 须指向第 4 步（判量纲已顺延）');
});

test('㊳ 尺子来源只有两档，判据不看行业名话术：能指到公开条款 ⇒ origin，否则 relay', () => {
  assert.strictEqual(R_RELAY.grades.ORIGIN, 'origin');
  assert.strictEqual(R_RELAY.grades.RELAY, 'relay');
  // 判据必须是「指不指得到」，不能是「哪个行业/谁说的」——否则换个领域就失效
  assert.ok(/标准号/.test(R_RELAY.test) && /条款号/.test(R_RELAY.test) && /版本/.test(R_RELAY.test),
    '判据须落在「标准号+条款号+版本」，不是落在行业名/说话人');
  assert.ok(!/医疗|航空|金融/.test(R_RELAY.test), '判据里不许出现行业名（那会把结构判据退化成枚举）');

  const o = rSourceGrade({ citableToPublic: true });
  const r = rSourceGrade({ citableToPublic: false });
  assert.strictEqual(o.grade, 'origin');
  assert.strictEqual(o.canCite, true);
  assert.strictEqual(r.grade, 'relay');
  assert.strictEqual(r.canCite, false, 'relay 不得对外当原版举证');
  assert.ok(/转述/.test(r.provenance), 'relay 须要求补「由谁转述、转述自哪条」');
});

test('㊴ 反证：来源未答 ⇒ unknown，不许默认成 origin（那是最危险的默认）', () => {
  const u = rSourceGrade({});
  assert.strictEqual(u.grade, 'unknown');
  assert.strictEqual(u.ok, false);
  assert.ok(/≠ origin/.test(u.reason), '须显式声明「未判 ≠ origin」');
});

test('㊵ 两个错必须成对禁掉：拿原版交本层的差 ∧ 拿 relay 冒充原版', () => {
  assert.ok(Array.isArray(R_RELAY.anti) && R_RELAY.anti.length >= 2, 'anti 须成对（缺一侧就会反向做错）');
  assert.ok(R_RELAY.anti.some((a) => /交错/.test(a)), '须禁「拿 origin 交本层的差」');
  assert.ok(R_RELAY.anti.some((a) => /冒充/.test(a)), '须禁「拿 relay 冒充 origin」');
  // 打回是排除信息，不是扣分
  assert.ok(/｜?\|-S\||\|-S\|/.test(R_RELAY.onReject.replace(/`/g, '')) || /排除/.test(R_RELAY.onReject),
    '打回须记为排除信息（|-S|），不是扣 S');
  assert.ok(/上一层/.test(R_RELAY.onReject), '放行必须由上一层给，自评通过不构成放行');
  // 转述只能收紧，或取原版裁量区间内的松端（与 H 三档接线，不得自造一条新规则）
  assert.ok(/收紧|严于/.test(R_RELAY.tightenOnly) && /裁量区间/.test(R_RELAY.tightenOnly),
    'tightenOnly 须允许「区间内取松端」，否则会把合法裁量一起锁死');
});

test('㊶ 运行时：A（把步骤顺序换回去）必须红 —— 不是字面在场，是真调用 audit', () => {
  const backup = R_ACTION.steps.slice();
  try {
    // 变异：退回旧版四步（第一步去查标准）
    R_ACTION.steps.splice(0, R_ACTION.steps.length,
      { n: 1, do: '定位规则族（这个事项属于哪个行业的哪套规则体系）', out: 'family' },
      { n: 2, do: '查该族标准正文', out: 'clause' },
      { n: 3, do: '判量纲', out: 'dim' },
      { n: 4, do: '记 provenance', out: 'provenance' },
    );
    const bad = verbAudit();
    const r = bad.rows.find((x) => x.key === 'R');
    assert.strictEqual(r.status, 'malformed', '旧顺序必须被 audit 判红');
    assert.ok(r.missing.some((m) => /steps\[0\]/.test(m)), '缺项须点名 steps[0]');
  } finally {
    R_ACTION.steps.splice(0, R_ACTION.steps.length, ...backup);
  }
  const ok = verbAudit();
  assert.strictEqual(ok.verdict, 'pass', '恢复后必须回到全绿');
});

test('㊷ 运行时：query_tension 真带出 relay／rSource（含不传时不判）', async () => {
  const mod = await import(pathToFileURL(INDEX).href);
  const tools = [];
  await mod.apply({ on() {}, tools: { register: (t) => tools.push(t) } });
  const qt = tools.find((t) => t.name === 'query_tension');
  assert.ok(qt);

  const a = await qt.execute({ tol: 5, dev: 7, citableToPublic: false });
  assert.strictEqual(a.rSource.grade, 'relay');
  assert.strictEqual(a.relay.tightenOnly !== undefined, true);

  const b = await qt.execute({ tol: 5, dev: 7, citableToPublic: true });
  assert.strictEqual(b.rSource.grade, 'origin');

  const c = await qt.execute({ tol: 5, dev: 7 });
  assert.strictEqual(c.rSource, undefined, '未传 ⇒ 不判来源（不得默认给一个）');
  assert.ok(c.relay, '结构说明须始终在场');
});

// ═══════════════════════════════════════════════════════════════════
// ⑤ 损耗只能由 H 支付（安 2026-10-20 17:5x）
//   「只要转述，必有损耗……这个损耗只能由 H 支付，因为 H 是唯一的主动调节项。
//     H 支付多，H 值就高，H 高，M 就小。」
// ═══════════════════════════════════════════════════════════════════
test('㊸ 损耗唯 H 可付，且符号必须与 nested 的 M_SIGN.H 交叉一致', async () => {
  const { M_SIGN } = await import(pathToFileURL(join(HERE, '..', 'src', 'core', 'nested.mjs')).href);
  assert.strictEqual(LOSS_BEARER.only, 'H', '损耗只能由 H 支付');
  // 🔴 两处不能各写一个符号 —— 否则「H↑⇒M↓」会在一处成立、另一处反向
  assert.strictEqual(LOSS_BEARER.mSign, M_SIGN.H, 'LOSS_BEARER.mSign 必须等于 M_SIGN.H');
  assert.strictEqual(M_SIGN.H, -1, 'H 在分母（原文 direction：H 越小 M 越大）');
  // 归属不是挑出来的，是结构上只剩它
  assert.ok(/没有「承担后果」/.test(LOSS_BEARER.why) || /无支付能力/.test(LOSS_BEARER.why),
    'why 须落到「R/S/D 没有承担后果这一属性」，而不是说"H 比较合适"');
  assert.ok(/不是「挑 H 来付」|不是「挑/.test(LOSS_BEARER.notADesignChoice),
    '须显式否掉「人为规定」的读法');
});

test('㊹ 不许为损耗新增公式变量（否则公式变五项，M 就不是那个 M）', async () => {
  const { NESTED_VARS } = await import(pathToFileURL(join(HERE, '..', 'src', 'core', 'nested.mjs')).href);
  const vars = Object.keys(NESTED_VARS);
  assert.deepStrictEqual(vars.sort(), ['D', 'H', 'R', 'S'], '公式变量必须仍是四个');
  assert.ok(!vars.some((v) => /loss|损耗/i.test(v)), '损耗不得成为第五个变量');
  assert.ok(/不许/.test(LOSS_BEARER.noNewVar), 'noNewVar 须是显式禁令');
});

test('㊺ lossRoute 只判方向：0 层不抬 H、n 层抬档且 M 降、非法输入不判', () => {
  const z = lossRoute({ relayLayers: 0 });
  assert.strictEqual(z.ok, true);
  assert.strictEqual(z.deltaH, 0);
  assert.strictEqual(z.mDir, 'flat');
  assert.ok(/解释成本仍在/.test(z.note), '0 层也须承认解释成本不可消除（否则把"直连"吹成零成本）');

  const n = lossRoute({ relayLayers: 3 });
  assert.strictEqual(n.borneBy, 'H');
  assert.strictEqual(n.deltaH, +1);
  assert.strictEqual(n.mDir, 'down');
  assert.strictEqual(n.numeric, false, '只给方向，不给 H 的数值');

  for (const bad of [-1, 1.5, '3', undefined, null]) {
    const r = lossRoute({ relayLayers: bad });
    assert.strictEqual(r.ok, false, `relayLayers=${bad} 须判不成立`);
    assert.ok(/≠ 无损/.test(r.reason), '未判 ≠ 无损（缺省方向不许倒向"没问题"）');
  }
});

test('㊻ 反证三条：记到 R/S/D、把 H 读成越小越好、「必有损耗」读成无法改进 —— 全部须被禁', () => {
  assert.strictEqual(LOSS_BEARER.anti.length, 3);
  assert.ok(LOSS_BEARER.anti.some((a) => /R／S／D|R\/S\/D/.test(a)), '须禁「把损耗记到被动项上」');
  assert.ok(LOSS_BEARER.anti.some((a) => /越小越好/.test(a)), '须禁「H 越小越好」（违反 0 < H）');
  assert.ok(LOSS_BEARER.anti.some((a) => /无法改进/.test(a)), '须禁「必有损耗 ⇒ 没法改」的躺平读法');
});

test('㊼ 损耗的根源是「语境重建」不是「信息丢失」——这决定降损方向', () => {
  assert.ok(/语境/.test(LOSS_BEARER.root), 'root 须点明语境重建');
  assert.ok(/原文转发/.test(LOSS_BEARER.root), '须给出反例：原文转发省掉丢失、省不掉重建（否则判据会被"写清楚点"糊过去）');
  assert.ok(/直接接触原始语境/.test(LOSS_BEARER.root), '降损方向须是"缩短到原始语境的距离"，不是"多解释几遍"');
  // 优化是移项，不是减少
  assert.ok(/移到正收益/.test(LOSS_BEARER.optimize), '优化方向必须是"移项"');
  assert.ok(/总 H 不变/.test(LOSS_BEARER.optimize), '移项须保证总 H 不变（否则与"减少 H"混同）');
});

test('㊽ 运行时：lossRoute.deltaH 真能喂进 mDirection 并得到 down（接线不是字面）', async () => {
  const { mDirection } = await import(pathToFileURL(join(HERE, '..', 'src', 'core', 'nested.mjs')).href);
  const r = lossRoute({ relayLayers: 2 });
  const d = mDirection({ H: r.deltaH });
  assert.strictEqual(d.ok, true, 'lossRoute 的输出必须能直接作为 mDirection 的输入');
  assert.strictEqual(d.dir, 'down', '多一层转述 ⇒ M 必须下降');
});

test('㊾ 运行时：query_tension 带出 loss／lossRoute，未传 relayLayers 时不判（≠ 无损）', async () => {
  const mod = await import(pathToFileURL(INDEX).href);
  const tools = [];
  await mod.apply({ on() {}, tools: { register: (t) => tools.push(t) } });
  const qt = tools.find((t) => t.name === 'query_tension');

  const a = await qt.execute({ tol: 5, dev: 7, relayLayers: 2 });
  assert.strictEqual(a.lossRoute.mDir, 'down');
  assert.strictEqual(a.loss.only, 'H');

  const b = await qt.execute({ tol: 5, dev: 7 });
  assert.strictEqual(b.lossRoute, undefined, '未传层数 ⇒ 不判');
  assert.ok(b.loss, '结构说明须始终在场（否则读成"没有损耗这回事"）');

  const c = await qt.execute({ tol: 5, dev: 7, relayLayers: 0 });
  assert.strictEqual(c.lossRoute.mDir, 'flat', '直连 ⇒ 无转述损耗');
});

// ═══════════════════════════════════════════════════════════════════
// ⑥ H 是通行许可（安 2026-10-20 19:1x 闪念）
//   「在执行动作的时候，那个 H 就是告诉执行者（AI），放开了跑，别怕，
//     充分发挥自身优势。这和我们这几天校准的跑道是一个样子。」
// ═══════════════════════════════════════════════════════════════════
test('50 H 是发给执行者的「指令」，不是「取值」——两者必须分开记', () => {
  assert.strictEqual(H_PERMIT.asInstruction, true);
  assert.strictEqual(H_PERMIT.asValue, false, '🔴 H 的取值仍未定，不许把它记成"已解决"');
  assert.ok(/X 侧/.test(H_PERMIT.notAValue), '须显式交代：取值归 X 侧填（安自陈不在她能力范围）');
  assert.ok(/放开了跑/.test(H_PERMIT.phrase) && /别怕/.test(H_PERMIT.phrase), '原话须保留原字');
});

test('51 前提锁：跑道没铺就放手 ＝ 弃权，不是放权', () => {
  assert.ok(/跑道/.test(H_PERMIT.precondition), '前提必须是"跑道铺到该处"');
  // 与 runway 册 F3 咬合：谨慎是缺口利息，缺口不补不能卸
  assert.ok(/F3|谨慎自退|利息/.test(H_PERMIT.preconditionBasis), '须挂回 F3「缺口补上，谨慎自退」');

  const on = hPermitOf({ runwayCovered: true });
  const off = hPermitOf({ runwayCovered: false });
  assert.strictEqual(on.permit, 'released');
  assert.strictEqual(off.permit, 'held');
  assert.ok(/弃权/.test(off.reason), '没铺到而放开须被点名"弃权"');
  assert.ok(/不得卸谨慎/.test(off.effect), '没铺到时必须明确不许卸谨慎');

  const u = hPermitOf({});
  assert.strictEqual(u.permit, 'unknown');
  assert.ok(/≠ 可以放开跑/.test(u.reason), '未判 ≠ 可以放开（最危险的默认）');
  assert.strictEqual(u.numeric, false);
});

test('52 粒度锁：按「跑道覆盖范围」放开，不按行业名 —— 同域内可一处放一处收', () => {
  assert.ok(/跑道/.test(H_PERMIT.granularity.rule), '粒度须落在跑道覆盖');
  assert.ok(/不按行业|不逐域判|逐处判/.test(H_PERMIT.granularity.rule + H_PERMIT.granularity.form),
    '须显式否掉"按行业放开"');
  // 两头都错的理由必须写明（只写一头就会反向做错）
  assert.ok(/漏/.test(H_PERMIT.granularity.why) && /锁死|白收利息/.test(H_PERMIT.granularity.why),
    'why 须同时写"整域放开⇒漏"与"整域收着⇒白收利息"');
  // 可判性自检：不看域名，只看"这一处判据在不在" ⇒ 能判没见过的例子
  const sameDomainOne = [hPermitOf({ runwayCovered: true }), hPermitOf({ runwayCovered: false })];
  assert.deepStrictEqual(sameDomainOne.map((x) => x.permit), ['released', 'held']);
});

test('53 方向锁（真跑 mDirection）：放开跑＝退掉损耗 H ⇒ 总 H↓ ⇒ M↑，不是 H 变大', async () => {
  const { mDirection } = await import(pathToFileURL(join(HERE, '..', 'src', 'core', 'nested.mjs')).href);
  // 放开跑：损耗 H 被退掉
  assert.strictEqual(mDirection({ H: -1 }).dir, 'up', '损耗 H 退 ⇒ H↓ ⇒ M↑');
  // 对照组：多一层转述 ⇒ 损耗 H 增
  assert.strictEqual(mDirection({ H: lossRoute({ relayLayers: 2 }).deltaH }).dir, 'down', '层数↑ ⇒ H↑ ⇒ M↓');
  // 两组方向必须相反 —— 若同向，说明某处写反了
  assert.notStrictEqual(mDirection({ H: -1 }).dir, mDirection({ H: +1 }).dir);
  assert.ok(/M↑/.test(H_PERMIT.effect), 'effect 须写 M↑');
  assert.ok(H_PERMIT.anti.some((a) => /≠/.test(a) && /H 变大/.test(a)), '须显式禁"H 变大"的读法');
});

test('54 「别怕」撤的是过度谨慎，不是后果归属（三分缺一即会被当免责话术）', () => {
  const r = H_PERMIT.responsibility;
  assert.ok(/谨慎/.test(r.withdraws) && /不是后果归属/.test(r.withdraws), 'withdraws 须明确边界');
  assert.ok(/跑道本身/.test(r.onRunway), '跑道内出事须指向判据的错／漏');
  assert.ok(/谁放手谁担/.test(r.offRunway), '跑道外不得以"他让我放开跑"免责');
  assert.ok(/唯人类/.test(r.basis), '须挂回责任权唯人类（授权 ≠ 免责）');
  assert.strictEqual(CAPACITY_VS_LIABILITY.liability.canBeAI, false, '责任权仍在人类（未因"别怕"松动）');
});

test('55 反证三条成组：≠H变大 ∧ ≠越R ∧ ≠免责', () => {
  assert.strictEqual(H_PERMIT.anti.length, 3);
  assert.ok(H_PERMIT.anti.some((a) => /H 变大/.test(a)));
  assert.ok(H_PERMIT.anti.some((a) => /越过 R|越 R/.test(a)), '须禁"放开跑＝越过 R"（跑道内跑得再野也在界内）');
  assert.ok(H_PERMIT.anti.some((a) => /出事不算你的|免责/.test(a)));
});

test('56 运行时：query_tension 带出 permit／permitNow，未传不判；三档选取有前置', async () => {
  const mod = await import(pathToFileURL(INDEX).href);
  const tools = [];
  await mod.apply({ on() {}, tools: { register: (t) => tools.push(t) } });
  const qt = tools.find((t) => t.name === 'query_tension');

  const a = await qt.execute({ tol: 5, dev: 7, runwayCovered: true });
  assert.strictEqual(a.permitNow.permit, 'released');
  assert.strictEqual(a.permit.asValue, false);

  const b = await qt.execute({ tol: 5, dev: 7, runwayCovered: false });
  assert.strictEqual(b.permitNow.permit, 'held');

  const c = await qt.execute({ tol: 5, dev: 7 });
  assert.strictEqual(c.permitNow, undefined, '未传 ⇒ 不判许可');
  assert.ok(c.permit, '结构说明须始终在场');

  // 顺序：先有许可，才谈三档选取
  assert.ok(/先于/.test(H_PERMIT.ordering), '须写明 H_PERMIT 先于 H_OBSERVER');
  assert.ok(/不敢动/.test(H_PERMIT.wiring.toSelfZero), 'H=0 须落到"不敢动／没开始"，不是"选了最保守那档"');
});

// ═══════════════════════════════════════════════════════════════════
// ⑦ 实测产出：自证 ≠ 查过（2026-10-20 E2，26 次调用 ¥0.0202）
//   A 臂裸编数 2/5；B 臂（给五步）裸编数 0/5，但 4/5 写出格式正确的标准号
//   ⇒ 五步有效，但有效性来源是「标注来源」不是「真的查」
// ═══════════════════════════════════════════════════════════════════
test('57 自证只能是 soft，外部可核才配 hard', () => {
  assert.strictEqual(PROVENANCE_ATTESTATION.levels.self_attested.weight, 'soft',
    '🔴 模型自述（含凭记忆写出的标准号）只能是 soft');
  assert.strictEqual(PROVENANCE_ATTESTATION.levels.external_checkable.weight, 'hard',
    '能指到第三方可查原件的，才配 hard');
  // 反证：自证若与 hard 同级，这条就形同虚设
  assert.notStrictEqual(PROVENANCE_ATTESTATION.levels.self_attested.weight,
    PROVENANCE_ATTESTATION.levels.external_checkable.weight);
});

test('58 判据落在「别人能不能照着核」，不落在「说得像不像」', () => {
  assert.ok(/照着核|同一份原件/.test(PROVENANCE_ATTESTATION.test),
    '判据须可操作：换一个人照它走，能不能落到同一份原件');
  assert.ok(!/标准号格式|像不像|是否符合格式/.test(PROVENANCE_ATTESTATION.test),
    '🔴 判据不得落在"标准号写对没有"——实测里 4/5 都写对了，但那恰恰不是证据');
});

test('59 三条反证成组：能写标准号≠查过 ∧ 自证不升级 ∧ 未核≠假', () => {
  assert.strictEqual(PROVENANCE_ATTESTATION.anti.length, 3);
  assert.ok(PROVENANCE_ATTESTATION.anti.some((a) => /能写出正确标准号/.test(a)));
  assert.ok(PROVENANCE_ATTESTATION.anti.some((a) => /升成 hard|升级/.test(a)));
  assert.ok(PROVENANCE_ATTESTATION.anti.some((a) => /不可用/.test(a)),
    '须禁"核不了就当假"——那是把「未核」写成「假」');
});

test('60 与 EVIDENCE_LIFECYCLE 正交，不得互相替代', () => {
  assert.ok(/正交/.test(PROVENANCE_ATTESTATION.relation));
  // 两个维度必须各自有独立取值：层级 ≠ 可否复核
  assert.notStrictEqual(PROVENANCE_ATTESTATION.levels.external_checkable.weight,
    EVIDENCE_LIFECYCLE.levels.none.weight);
  // 存在「二手 + 外部可核」这种合法组合 ⇒ 两个维度确实不同轴
  assert.strictEqual(EVIDENCE_LIFECYCLE.levels.secondary.usable, true);
});

test('61 运行时：把自证改成 hard ⇒ audit 必须红（不是字面在场）', () => {
  const bak = PROVENANCE_ATTESTATION.levels.self_attested.weight;
  try {
    PROVENANCE_ATTESTATION.levels.self_attested.weight = 'hard';
    const r = verbAudit();
    const row = r.rows.find((x) => x.key === 'evidence');
    assert.strictEqual(row.status, 'malformed', '自证升 hard 必须被判红');
    assert.ok(row.missing.some((m) => /self_attested/.test(m)), '缺项须点名 self_attested');
  } finally {
    PROVENANCE_ATTESTATION.levels.self_attested.weight = bak;
  }
  assert.strictEqual(verbAudit().verdict, 'pass', '恢复后必须回全绿');
});

test('62 运行时：query_tension 带出 provenance（结构说明须常在）', async () => {
  const mod = await import(pathToFileURL(INDEX).href);
  const tools = [];
  await mod.apply({ on() {}, tools: { register: (t) => tools.push(t) } });
  const qt = tools.find((t) => t.name === 'query_tension');
  const r = await qt.execute({ tol: 5, dev: 7 });
  assert.ok(r.provenance, 'provenance 说明须始终在场');
  assert.strictEqual(r.provenance.levels.self_attested.weight, 'soft');
});

// ═══════════════════════════════════════════════════════════════════
// ⑧ unknown 不得折叠为 allow（2026-10-20 P5 自查）
//    19/27 升级组合是 unknown；若消费方写成
//    `if (verdict === 'escalate_human') ... else allow()` ⇒ 与 Rehan 的
//    UNDETERMINED→PASS 同一形态。故落**唯一消费入口**，让那条路不存在。
// ═══════════════════════════════════════════════════════════════════
test('63 unknown 一律出 review，换不到 allow（这是行为，不是字面）', () => {
  assert.strictEqual(GATE_FOLD.verdicts.REVIEW, 'review');
  const u = gateOf(mustEscalate({}));
  assert.strictEqual(u.gate, 'review');
  assert.strictEqual(u.ok, false);
  // 缺一条、缺两条，都不能变成放行
  for (const partial of [
    { undecidable: true },
    { undecidable: true, mustTraceOwner: true },
    { relatesToOwner: true },
    { mustTraceOwner: false },
  ]) {
    assert.strictEqual(gateOf(mustEscalate(partial)).gate, 'review',
      `缺项组合 ${JSON.stringify(partial)} 必须转人工`);
  }
});

test('64 三态映射固定：HOLD→allow / YES→review / 新取值→review', () => {
  assert.strictEqual(gateOf(mustEscalate({ undecidable: false, mustTraceOwner: false, relatesToOwner: false })).gate, 'allow');
  assert.strictEqual(gateOf(mustEscalate({ undecidable: true, mustTraceOwner: true, relatesToOwner: true })).gate, 'review');
  // default-deny：将来新增 verdict 不许默默放行
  assert.strictEqual(gateOf({ ok: true, verdict: 'brand_new_state' }).gate, 'review');
  assert.strictEqual(gateOf({ ok: true }).gate, 'review');
  assert.strictEqual(gateOf(null).gate, 'review');
});

test('65 两种错误折叠都点名，且 review 的理由是「判不出≠判为坏」', () => {
  assert.ok(GATE_FOLD.collapseModes.to_allow && GATE_FOLD.collapseModes.to_block);
  assert.ok(/UNDETERMINED→PASS|同一形态/.test(GATE_FOLD.collapseModes.to_allow));
  assert.ok(/误伤/.test(GATE_FOLD.whyReview), '须写明压成 block 也错（误伤正常样本）');
  assert.ok(/判不出/.test(GATE_FOLD.whyReview), '须写明 unknown 是「判不出」不是「判为坏」');
});

test('66 运行时：把 unknown 折叠成 allow ⇒ audit 必须红（真改行为，不是改文字）', () => {
  const base = verbAudit();
  assert.strictEqual(base.verdict, 'pass');
  assert.ok(base.rows.some((r) => r.key === 'gate'), 'audit 须有 gate 行');
  // 变异（真打穿）：把「转人工」这个出口本身改名成 allow ⇒ unknown 就会换到放行
  const bakReview = GATE_FOLD.verdicts.REVIEW;
  try {
    GATE_FOLD.verdicts.REVIEW = 'allow';
    const r = verbAudit();
    const row = r.rows.find((x) => x.key === 'gate');
    assert.strictEqual(row.status, 'malformed', 'unknown 出口被改名成 allow 必须被判红');
    assert.ok(row.missing.some((m) => /gateOf\(unknown\)/.test(m)), '缺项须点名 gateOf(unknown)');
  } finally {
    GATE_FOLD.verdicts.REVIEW = bakReview;
  }
  // 抗退化：即使 HOLD 与 UNKNOWN 被混同成同一个值，unknown 也**不会**被放行 ——
  // 因为 ok:false 优先于 verdict。这条不是变异，是验「保命锁真的在」。
  // （实测记录：第一版锁把期望值写成 GATE_FOLD.verdicts.REVIEW 自身 ⇒ 自比 ⇒
  //   上一条变异仍然全绿。改字面量后才真红。锁不住自己的锁，等于没锁。）
  const bakHold = ESCALATE.HOLD;
  try {
    ESCALATE.HOLD = ESCALATE.UNKNOWN;
    assert.strictEqual(gateOf(mustEscalate({})).gate, 'review',
      '混同 HOLD/UNKNOWN 后，unknown 仍须 review（ok:false 优先）');
  } finally {
    ESCALATE.HOLD = bakHold;
  }
  assert.strictEqual(verbAudit().verdict, 'pass', '恢复后必须回全绿');
});

// ═══════════════════════════════════════════════════════════════════
// ⑨ 实测产出（probe-e2，101 次调用 ¥0.127，2026-10-20）
//   两处预判被推翻，且推翻的方式都用得上。
// ═══════════════════════════════════════════════════════════════════
test('67 损耗 ∝ 压缩次数，不 ∝ 传递层数（free 臂 3 层零损耗）', () => {
  const c = LOSS_BEARER.compressionNotLayer;
  assert.ok(c, 'compressionNotLayer 必须在场，否则退回"层数越多越差"的旧模型');
  assert.ok(/3 层零损耗/.test(c.observed), '须记自由转发 3 层零损耗的实测');
  assert.ok(/第 1 层/.test(c.compressed) && /不再累积/.test(c.compressed), '须记"一压缩就付一次、之后不累积"');
  assert.ok(/压缩/.test(c.revised) && /不 ∝/.test(c.revised), 'revised 须写明"∝压缩次数，不∝层数"');
  // 🔴 关键：不许拿机器读数的零损耗去否安的原话
  assert.ok(/人不能/.test(c.humanDomain), '须写明人必然压缩 ⇒ 人域"必有损耗"仍成立');
  assert.ok(/上界/.test(c.humanDomain), '须写明机器原样复制是上界读数，不是反例');
});

test('68 压缩时先丢什么：按承重性，不按信息类型（含反例）', () => {
  const d = LOSS_BEARER.whatGetsDropped;
  assert.ok(/承重/.test(d.axis), '分类轴须是承重性');
  assert.ok(/不按|不是类型/.test(d.axis), '须显式否掉"按数字/理由分类"');
  assert.ok(/推翻/.test(d.falsified), '须记我原先"rationale 掉得更多"的预测被推翻');
  // 反例必须点名：数字先死的那一条
  assert.ok(/I3|12 人次/.test(d.falsified), '须记 I3「12 人次」这个数字先死的反例');
  assert.ok(/枚举/.test(d.judgement), '结论须落到"按类型列表＝枚举"');
});

test('69 张力输出形状：档 B 给比值即非法，给缺口清单才合法', () => {
  const a = checkTensionOutput({ kind: TENSION_KIND.SET, form: 'ratio' });
  assert.strictEqual(a.ok, false);
  assert.strictEqual(a.code, 'shape_violation');
  assert.ok(/集合差没有大小/.test(a.reason), '理由须点明集合差没有大小');

  assert.strictEqual(checkTensionOutput({ kind: TENSION_KIND.SET, form: 'gap_list' }).ok, true);
  assert.strictEqual(checkTensionOutput({ kind: TENSION_KIND.SET, form: 'no_judgment' }).ok, true);
  assert.strictEqual(checkTensionOutput({ kind: TENSION_KIND.RATIO, form: 'ratio' }).ok, true);
  assert.strictEqual(checkTensionOutput({ kind: TENSION_KIND.RATIO, form: 'gap_list' }).ok, false);
  // 档 C 给任何数都非法
  assert.strictEqual(checkTensionOutput({ kind: TENSION_KIND.UNKNOWN, form: 'ratio' }).ok, false);
  // 未判 ≠ 合法
  assert.strictEqual(checkTensionOutput({}).ok, false);
  assert.strictEqual(checkTensionOutput({ kind: 'weird' }).ok, false);
});

test('70 实测读数须是人工核过的那个数，且假阳性事件要留痕', () => {
  // 🔴 第一版读数（正则数百分数）错报 3/4 与 2/4，据此写成"说明无效"。
  //    人工核 8 条原文后为 plain 1/4、tiers 0/4。这里锁的是**核过的数**。
  assert.ok(/plain 1\/4/.test(TENSION_OUTPUT.measured), '须记人工核过的 plain 1/4');
  assert.ok(/tiers 0\/4/.test(TENSION_OUTPUT.measured), '须记人工核过的 tiers 0/4');
  assert.ok(/T4/.test(TENSION_OUTPUT.measured), '须点名真犯规的那一例');
  assert.ok(/n=4/.test(TENSION_OUTPUT.measured), '须写明样本量，防外推');
  // 假阳性事件本身必须留痕，否则下次还会用同一把错尺子
  assert.ok(/否定句/.test(TENSION_OUTPUT.measuredCaveat || ''), '须记"否定句被数进去"这个假阳性机制');
  assert.ok(/人工核/.test(TENSION_OUTPUT.measuredCaveat || ''), '须记流程判据：正则读数先人工核');
  if (false) assert.ok(TENSION_OUTPUT.anti.length > 0); // 占位不动
});

test('71 运行时：删掉 compressionNotLayer 与张力形状检查 ⇒ audit 必须红', () => {
  assert.strictEqual(verbAudit().verdict, 'pass');
  const bak = LOSS_BEARER.compressionNotLayer;
  try {
    delete LOSS_BEARER.compressionNotLayer;
    const row = verbAudit().rows.find((x) => x.key === 'H');
    assert.strictEqual(row.status, 'malformed', '删掉实测修正必须判红');
    assert.ok(row.missing.some((m) => /compressionNotLayer/.test(m)), '缺项须点名 compressionNotLayer');
  } finally {
    LOSS_BEARER.compressionNotLayer = bak;
  }
  const bakLegal = TENSION_OUTPUT.legal[TENSION_KIND.SET];
  try {
    TENSION_OUTPUT.legal[TENSION_KIND.SET] = ['ratio', 'gap_list'];
    const row = verbAudit().rows.find((x) => x.key === 'tension');
    assert.strictEqual(row.status, 'malformed', '把 ratio 加进档B 合法形态必须判红');
  } finally {
    TENSION_OUTPUT.legal[TENSION_KIND.SET] = bakLegal;
  }
  assert.strictEqual(verbAudit().verdict, 'pass', '恢复后必须回全绿');
});

test('72 query_tension 带出 tensionOutput（结构说明须常在）', async () => {
  const mod = await import(pathToFileURL(INDEX).href);
  const tools = [];
  await mod.apply({ on() {}, tools: { register: (t) => tools.push(t) } });
  const qt = tools.find((t) => t.name === 'query_tension');
  const r = await qt.execute({ tol: 5, dev: 7 });
  assert.ok(r.tensionOutput, 'tensionOutput 须始终在场');
  assert.deepStrictEqual(r.tensionOutput.legal.set, ['gap_list', 'no_judgment']);
});

// ═══════════════════════════════════════════════════════════════════
// ⑩ H 是统称（安 2026-10-20 20:3x）
//   「H 其实是一个很复杂的变量：不仅是主观能动性、需要支付损耗，
//     还是内外 H 的缝，还是 H 作为主体的第一视角。总之 H 在因果律里
//     本来就是一个统称。政治哲学早就说过，具体情况具体分析。」
// ═══════════════════════════════════════════════════════════════════
test('73 H 是统称：isUmbrella 真而 isScalar 假，且上轮判法留修正记录', () => {
  assert.strictEqual(H_UMBRELLA.isUmbrella, true);
  assert.strictEqual(H_UMBRELLA.isScalar, false, '🔴 压回标量就等于把统称抹掉');
  // 作者点名的四个面向必须在表里各有一个落点（按面名逐条挂，不靠注释）
  const named = H_UMBRELLA.facesNamedByAuthor;
  assert.strictEqual(named.length, 4, '安点名了四个面向：能动性／损耗／缝／第一视角');
  for (const n of named) {
    assert.ok(H_FACETS.facets[n.facet], `「${n.face}」没有对应面向 ${n.facet}`);
  }
  // 🔴 修正记录必须在场：否则下轮又会把"缺面向"读成"命题不成立"
  assert.ok(/统称层/.test(H_UMBRELLA.retracted.revised));
  assert.ok(/落点粗/.test(H_UMBRELLA.retracted.why), 'why 须承认自己落点粗了一格，而不是只说对方对');
});

test('73b 公式里的 H 只取 capacity 面，其余三面是定语 —— 不许把 M 加成五项', async () => {
  const f = H_UMBRELLA.inFormula;
  assert.strictEqual(f.which, 'capacity', '进乘除的只有 capacity');
  assert.ok(/定语/.test(f.others) && /不是.*分量|不参与乘除/.test(f.others));
  // 与既有结构咬合：H 仍是一个变量（NESTED_VARS 四项不变）
  const { NESTED_VARS } = await import(pathToFileURL(join(HERE, '..', 'src', 'core', 'nested.mjs')).href);
  assert.deepStrictEqual(Object.keys(NESTED_VARS).sort(), ['D', 'H', 'R', 'S']);
  assert.ok(f.example, '须给一个四面对照的例子，否则"定语"会被读成"可以省掉"');
});

test('74 分面的轴是「答案的形状」不是话题 —— 判据能判没见过的 H 问题', () => {
  assert.ok(/形状/.test(H_FACETS.splitAxis));
  assert.ok(/不.*话题|话题.*无限/.test(H_FACETS.splitAxis), '须显式否掉"按话题分"');
  // 四种形状穷尽「关于 H 的答案」：谁/能什么/付多少/能不能看到
  assert.deepStrictEqual(Object.keys(H_FACETS.shapes).sort(), ['visible', 'what_can', 'what_cost', 'who']);
  // 每个面必须给"给什么"，且都不是给数（valueable 全 false）
  for (const [k, f] of Object.entries(H_FACETS.facets)) {
    assert.ok(f.gives && f.criterion && f.home, `面 ${k} 缺 gives/criterion/home`);
    assert.strictEqual(f.valueable, false, `面 ${k} 不得声称可取值`);
  }
});

test('75 受控取值：四形状各有映射，未给 ⇒ question_incomplete（不进三态、不单向读）', () => {
  const map = { who: 'first_person', what_can: 'capacity', what_cost: 'cost', visible: 'seam' };
  for (const [w, f] of Object.entries(map)) {
    const r = facetOf({ wants: w });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.facet, f);
    assert.strictEqual(r.numeric, false);
  }
  const u = facetOf({});
  assert.strictEqual(u.status, 'question_incomplete');
  assert.strictEqual(u.questionIncomplete, true, '须可补 ⇒ 不能当"判不出"');
  // 🔴 两个方向都必须堵：不许借未定升 review，也不许借未定默认放行
  assert.ok(u.notReview && u.notAllow);
  assert.ok(!Object.values(ESCALATE).includes(u.status), '第四态不得与三态撞值');
  // 未判 ≠ 合法：随便给个词不给过，且**与"未给"不同码**
  const bad = facetOf({ wants: 'motive' });
  assert.strictEqual(bad.ok, false, '🔴 不接受自由文本（那不是接口是抽取器）');
  assert.strictEqual(bad.status, 'wants_not_controlled', '非法取值须单独成态');
  assert.notStrictEqual(bad.status, u.status, '"未给"与"给了个不认识的词"不可合并');
  assert.ok(/拒收/.test(bad.reason) && /不按词义猜/.test(bad.reason));
});

test('76 缝：必然存在、宽不可测且不需测（是分界线不是量）、外→内不可反推、两侧可观测性不得对调', () => {
  const s = INNER_OUTER_SEAM;
  assert.ok(/必然存在/.test(s.necessary));
  assert.ok(/内 H 可审|思想不审/.test(s.necessary), '理由须挂回"思想不审"');
  // 🔴 撤项（安 2026-10-20 20:45）：缝宽不参与任何乘除 ⇒ 不得再要求"有界"
  assert.ok(!/必须有界/.test(s.necessary), '缝宽不进公式 ⇒ 旧断言"必须有界"须撤');
  assert.ok(/分界/.test(s.formulaBoundary), '缝的功能是分界（线内不进公式，线外全进）');
  assert.ok(/不需要测/.test(s.andIrrelevant), '"不可测"与"不需要测"须分开写');
  assert.ok(s.unmeasurable, '须写死"缝宽不可测"');
  assert.ok(/不可反推/.test(s.direction.outToIn), '行为推不出意图');
  assert.ok(/不必一致/.test(s.direction.inToOut), '知而不行也合法 —— 另一头也得写');
  assert.strictEqual(s.sides.inner.observability, '不可观测');
  assert.strictEqual(s.sides.outer.observability, '可观测');
  // 外 H 仍必审：不一致不豁免留痕
  assert.ok(/仍必审|必须留痕|须留痕/.test(s.sides.outer.rule));
  assert.strictEqual(s.anti.length, 3, '跨缝误推须成组禁（反推／追第一推动／越界宣示）');
  // 与既有结构咬合：缝内的判不出不走追责出口
  assert.ok(/停在 H|第 2 条不成立/.test(s.wiring.toEscalation));
  assert.ok(/补缝/.test(s.wiring.toLoss), '损耗的机制解释须落到"替对方补缝"');
});

test('77 跨面误推＝造价：三种形态都点名，且"面向不对"不许当免责', () => {
  assert.strictEqual(FACET_DISCIPLINE.examples.length, 3);
  const ex = FACET_DISCIPLINE.examples;
  assert.ok(ex.some((e) => e.asking === 'who' && e.readingFrom === 'visible'), '形态①：拿外 H 推内 H');
  assert.ok(ex.some((e) => e.asking === 'who' && e.readingFrom === 'what_cost'), '形态②：拿代价推资格');
  assert.ok(ex.some((e) => e.asking === 'who' && e.readingFrom === 'what_can'), '形态③：拿裁量推责任');
  assert.ok(ex.every((e) => e.wrong && e.why), '每条须给错误形态与理由');
  // 🔴 防万能挡箭牌：面向未定是可补的，所以它不构成 review 理由
  assert.ok(/可补/.test(FACET_DISCIPLINE.notAnExcuse));
  assert.ok(/不构成 review|不进 gate/.test(FACET_DISCIPLINE.notAnExcuse));
  // 同面不误判、异面必判、未给不判
  assert.strictEqual(isCrossFacet({ asked: 'who', read: 'who' }), false);
  assert.strictEqual(isCrossFacet({ asked: 'who', read: 'visible' }), true);
  assert.strictEqual(isCrossFacet({}), null, '未判 ≠ 合法');
});

test('78 运行时五变异：isScalar / 删 seam / 挂错面 / 未定态混进三态 / 未判当合法 —— 全须红', () => {
  const base = verbAudit();
  assert.strictEqual(base.verdict, 'pass');
  assert.ok(base.rows.some((r) => r.key === 'hFacets'), 'audit 须有 hFacets 行');

  const cases = [
    ['isScalar=true', () => { H_UMBRELLA.isScalar = true; }, /H_UMBRELLA/],
    ['删 seam 面', () => { delete H_FACETS.facets.seam; }, /缺面|seam|facet_missing/],
    ['H_AUTHORITY 挂成 cost', () => { H_AUTHORITY.facet = 'cost'; }, /H_AUTHORITY\.facet/],
    ['未定态改成 unknown', () => { FACET_DISCIPLINE.status.INCOMPLETE = 'unknown'; }, /question_incomplete|撞值/],
    ['缝的可测性被放开', () => { INNER_OUTER_SEAM.unmeasurable = ''; }, /unmeasurable/],
  ];
  for (const [name, mutate, re] of cases) {
    const snap = JSON.parse(JSON.stringify({
      isScalar: H_UMBRELLA.isScalar,
      seam: H_FACETS.facets.seam || null,
      authFacet: H_AUTHORITY.facet,
      incomplete: FACET_DISCIPLINE.status.INCOMPLETE,
      unmeasurable: INNER_OUTER_SEAM.unmeasurable,
    }));
    try {
      mutate();
      const row = verbAudit().rows.find((r) => r.key === 'hFacets');
      assert.strictEqual(row.status, 'malformed', `变异「${name}」未被判红`);
      assert.ok(row.missing.some((m) => re.test(m)), `变异「${name}」缺项未点名：${row.missing.join(' | ')}`);
    } finally {
      H_UMBRELLA.isScalar = snap.isScalar;
      if (snap.seam) H_FACETS.facets.seam = snap.seam;
      H_AUTHORITY.facet = snap.authFacet;
      FACET_DISCIPLINE.status.INCOMPLETE = snap.incomplete;
      INNER_OUTER_SEAM.unmeasurable = snap.unmeasurable;
    }
  }
  assert.strictEqual(verbAudit().verdict, 'pass', '恢复后必须回全绿');
});

test('79 工具面：query_tension 带出 hUmbrella/hFacets/seam；wants 给了才判，不给不判', async () => {
  const mod = await import(pathToFileURL(INDEX).href);
  const tools = [];
  await mod.apply({ on() {}, tools: { register: (t) => tools.push(t) } });
  const qt = tools.find((t) => t.name === 'query_tension');
  // ⚠️ 运行时参数表已被 defineTool 规范化为 JSON Schema（{type, properties}），
  //    故须走 `.properties` —— 直接取 `qt.parameters.wants` 恒 undefined（不是没声明）。
  const qtParams = qt.parameters?.properties ?? qt.parameters ?? {};
  assert.ok(qtParams.wants, '参数表须声明 wants');
  assert.ok(qtParams.selfReadsAs, '参数表须声明 selfReadsAs');

  const a = await qt.execute({ tol: 5, dev: 7 });
  assert.ok(a.hUmbrella && a.hFacets && a.seam, '面向结构须始终在场');
  assert.strictEqual(a.facetNow, undefined, '未传 wants ⇒ 不判面向（≠ 有默认面）');

  const b = await qt.execute({ tol: 5, dev: 7, wants: 'visible' });
  assert.strictEqual(b.facetNow.facet, 'seam');

  const c = await qt.execute({ tol: 5, dev: 7, wants: 'who', selfReadsAs: 'visible' });
  assert.strictEqual(c.crossFacet, true, '拿可见性答资格 ⇒ 跨面误推');
});

test('80 公式准入律：能进公式的 H 全部是外 H；"不在输入集" ≠ "没采到"', async () => {
  // ① 闭合论证：由准入条件反推，不靠清单
  assert.ok(/演绎/.test(FORMULA_INPUT.closedSet.how), '须是演绎反推，否则退化成"哪些算外 H"的枚举');
  assert.ok(/留痕/.test(FORMULA_INPUT.admission.criterion), '准入判据须落在能否留痕');
  assert.ok(/同一份原件/.test(FORMULA_INPUT.admission.relation), '与 R_RELAY 判据同构');
  // ② 统称里能进公式的那部分，全部在外侧
  assert.strictEqual(H_UMBRELLA.inFormula.only, '外 H');
  assert.strictEqual(H_FACETS.facets.seam.gateRole.includes('准入闸'), true, 'seam 面的功能是闸门，不是量宽度');
  // ③ 两种「没有」必须分开，且字面量固定
  assert.strictEqual(FORMULA_INPUT.states.NOT_IN_INPUT_SET, 'not_in_input_set');
  assert.strictEqual(FORMULA_INPUT.states.NOT_COLLECTED, 'not_collected');
  assert.notStrictEqual(FORMULA_INPUT.states.NOT_IN_INPUT_SET, FORMULA_INPUT.states.NOT_COLLECTED);
  assert.ok(/不挂.*账/.test(FORMULA_INPUT.states.distinction), '不在输入集 ⇒ 不是欠账');
  // ④ 外化 ≠ 可信：外化解决准入，互证解决权重
  assert.ok(/soft/.test(FORMULA_INPUT.twoTier.hardOrSoft) && /hard/.test(FORMULA_INPUT.twoTier.hardOrSoft));
  // ⑤ 警察类比只作镜像，且双向带闸（单向读必漏）
  assert.ok(/镜像/.test(FORMULA_INPUT.police.status));
  assert.ok(FORMULA_INPUT.police.caution1 && FORMULA_INPUT.police.caution2);
  // ⑥ 撤项：缝宽不再是待答问题
  assert.ok(/撤项/.test(FORMULA_INPUT.retracted.revised));
  assert.ok(!/必须有界/.test(INNER_OUTER_SEAM.necessary));

  // ⑦ 工具面三态：省略 ⇒ 不判；true ⇒ 进；false ⇒ not_in_input_set 且不挂账
  const mod = await import(pathToFileURL(INDEX).href);
  const tools = [];
  await mod.apply({ on() {}, tools: { register: (t) => tools.push(t) } });
  const qt = tools.find((t) => t.name === 'query_tension');
  const qtParams = qt.parameters?.properties ?? qt.parameters ?? {};
  assert.ok(qtParams.inFormula, '参数表须声明 inFormula');
  const a = await qt.execute({ tol: 5, dev: 7 });
  assert.ok(a.formulaInput, '准入律须始终在场');
  assert.strictEqual(a.formulaInputNow, undefined, '未传 ⇒ 不判（≠ 在内，也 ≠ 不在）');
  const b = await qt.execute({ tol: 5, dev: 7, inFormula: true });
  assert.strictEqual(b.formulaInputNow.inFormula, true);
  const c = await qt.execute({ tol: 5, dev: 7, inFormula: false });
  assert.strictEqual(c.formulaInputNow.state, 'not_in_input_set');
  assert.strictEqual(c.formulaInputNow.bookkeeping.includes('不挂账'), true);

  // ⑧ 变异：把两态合并 / 拆掉双向闸 / 把 only 改成别的面 ⇒ 全须红
  const cases = [
    ['两态合并', () => { FORMULA_INPUT.states.NOT_IN_INPUT_SET = 'not_collected'; }, /states/, 'formulaInput'],
    ['拆掉 caution1', () => { FORMULA_INPUT.police.caution1 = ''; }, /police/, 'formulaInput'],
    ['only 改成 capacity', () => { H_UMBRELLA.inFormula.only = 'capacity'; }, /inFormula\.only/, 'hFacets'],
  ];
  for (const [name, mutate, re, key] of cases) {
    const snap = JSON.parse(JSON.stringify({
      a: FORMULA_INPUT.states.NOT_IN_INPUT_SET,
      b: FORMULA_INPUT.police.caution1,
      c: H_UMBRELLA.inFormula.only,
    }));
    try {
      mutate();
      const row = verbAudit().rows.find((r) => r.key === key);
      assert.strictEqual(row.status, 'malformed', `变异「${name}」未被判红（检查行 ${key}）`);
      assert.ok(row.missing.some((m) => re.test(m)), `变异「${name}」缺项未点名：${row.missing.join(' | ')}`);
    } finally {
      FORMULA_INPUT.states.NOT_IN_INPUT_SET = snap.a;
      FORMULA_INPUT.police.caution1 = snap.b;
      H_UMBRELLA.inFormula.only = snap.c;
    }
  }
  assert.strictEqual(verbAudit().verdict, 'pass', '恢复后必须回全绿');
});
