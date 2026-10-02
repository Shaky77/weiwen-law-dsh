#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
// 四象限判据 v4 · AB 对照探针（自包含 · 零 npm 依赖 · 2026-10-02）
//
// 【整合依据】（安 10-02 令「先整合→跑API→推仓库→回天堂邀测，须反馈+方案」）
//   · coze/74（扣子）：任务A 根因＝「两极同号时正向极指派缺位」⇒ 修法 2c 极性指派检查；
//                     任务C：外圆内方(正极性表象)/绵里藏针(物理隐喻)两漏，并给 2b 结构化改造候选(P-C1)。
//   · xiaodazi/61（小搭子）：方案＝「追本质」自洽硬约束（推理出现表象义结构 ⇒ 强制非内框对）。
//   · 安 10-02 定「推演不可省／止损＝S短链」：本探针即该纪律的实证——
//       不只在易判样本上停（止损），而把每条判据**推到已知边界**（长链）验 M 真不真。
//
// 【四版单变量】只换判据段；HEAD/BODY/OUT_FMT/判分口径 四版逐字相同：
//   A = v3 基线（STEP1＋STEP2(2a/2b)＋自洽硬约束）
//   B = A ＋ 2c 极性指派检查（扣子·结构层 fix）
//   C = A ＋ ④追本质硬约束（小搭子·正则层 fix）
//   D = A ＋ 2c ＋ ④
//
// 【样本设计铁律】专打缺口，非打易判：
//   seg1 三不靠（2c 缺口：两极同号/互补⇒v3 错派正向极）
//   seg2 表象/隐喻（2b 缺口：v3 漏剥表象）
//   seg3 G_PSEUDO 重测（自洽缺口：大巧若拙/大辩若讷 结论与理由互斥）
//   seg4 控制 G_VALUE（一正一负⇒四版皆应纳，验不误伤）
//
// 【读法】只收口不放宽＝seg4 四版皆 4/4（不误伤）∧ 缺口组 new≥old。
//   未闭合处照实说（如绵里藏针可能四版皆纳⇒交回天堂要方案）。
//
// 跑法：node quadrant-criteria-probe-v4-ab-20261002.mjs
//   key：env DEEPSEEK_API_KEY ｜ ~/.workbuddy/deepseek_api_key.txt ｜ 同目录 deepseek_api_key.txt
// ════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';

const MODEL = 'deepseek-chat';
const TEMPERATURE = 0;

const KEY = (() => {
  const cands = [
    process.env.DEEPSEEK_API_KEY,
    (() => { try { return readFileSync(`${homedir()}/.workbuddy/deepseek_api_key.txt`, 'utf-8').trim(); } catch { return ''; } })(),
    (() => { try { return readFileSync('./deepseek_api_key.txt', 'utf-8').trim(); } catch { return ''; } })(),
  ];
  return cands.find((k) => k && k.trim()) || '';
})();
if (!KEY) { console.error('✗ 未找到 DeepSeek API key（见脚本头部"跑法"）'); process.exit(1); }

const usageAcc = { prompt_tokens: 0, completion_tokens: 0 };
async function ask(system, content, maxTok = 160) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL, temperature: TEMPERATURE, max_tokens: maxTok,
      messages: [{ role: 'system', content: system }, { role: 'user', content }],
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  const j = await res.json();
  usageAcc.prompt_tokens += j.usage?.prompt_tokens || 0;
  usageAcc.completion_tokens += j.usage?.completion_tokens || 0;
  return (j.choices?.[0]?.message?.content ?? '').trim();
}

// ── HEAD / BODY：四版逐字相同（单变量纪律）──
const HEAD = `你就是那个**即将执行动作的 AI（当事人）**。你手上有一张判定图，规则如下（硬规则，不要怀疑）：`;

const BODY = `【内框】＝人的价值取向，其**形式恒定**为「二元对立」，且两极可分**正向极／负向极**。
  ⚠️ 内框是**开放集**：任何满足「二元对立 ∧ 两极可分正负」的对**都是**内框对；已列出的只是例示，不是全部。
【正向的判据】某一极是否为正向，看它是否**增益因果链的稳态**——增益者＝正向极，削减者＝负向极。
  ⚠️ 读的是**结构与功能**，不是词的褒贬字面。
【分边规则】内框两极被中线切开：**正向极落「本质真」侧；负向极落「本质假」侧。**`;

const STEP1 = `
【第一步：先定位轴 —— 拿掉「应然」（应该／不应该）之后，这对子还靠什么才被理解】
    ① 剩一个**可测量度**（大/小 比尺寸；多/少 比数量；快/慢 比速度）⇒ **量差** ⇒ 非内框对；
    ② 剩一个**分类成员**（红/蓝 都是颜色；桌子/椅子 都是家具）⇒ **类差** ⇒ 非内框对；
    ③ **什么都不剩** —— 本身就是「应然」的两端（善/恶；对/错；利/弊）⇒ 才进入第二步。
  🔴 两问不得互污：【正向的判据】只能回答第一步之后的问题；严禁用「某端看起来增益稳态」反推「它是价值对」。答错顺序即判错。`;

const STEP2 = `
【第二步：验共存 —— 这两端到底能不能「同时」在场】
  **2a 先剔三种假的同时**：
     · 先后交替不是同时（时而勤时而惰、忽冷忽热 ⇒ 时间轮流 ⇒ 不是共存）；
     · 不同参照下的两立不是同时（对甲强对乙弱、此处大彼处小 ⇒ 参照变了 ⇒ 不是共存）；
     · 对不同对象各持一端不是同时（对甲所悲、对乙所喜 ⇒ 对象不同 ⇒ 不是共存）。
  **2b 再追本质**：把两端各自的本质所指写出来（这个词在这里到底指什么），然后对照——
     · 若这"共存"只是**同一个字被装了两层意思**（一端指**本质／内在**，另一端只指**表象／外显**）
       ⇒ 不是共存，是错位（一桶两义）⇒ 把**表象那一端剥掉**，剩下只剩**单极** ⇒ 不构成一对两极 ⇒ **非内框对**；
     · 若两端**本质所指同类**（同一根轴的两个极端）∧ **本质层互斥**（不能同时成立）⇒ **是内框对**；
     · 若两端本质所指同类、却**确实能同时成立**（爱/恨＝趋与避是两根不同倾向，不是一根轴的两端）⇒ 该轴不是内框轴 ⇒ **非内框对**。`;

// ── 2c（扣子 coze/74）：极性指派检查 ──
const STEP2C = `
【第二步·补：极性指派检查（2c）】在 2b 判"是内框对"之前，先查两端极性——
  · 两端一正一负（善/恶、勤/惰、强/弱）⇒ 正常指派，继续 2b；
  · 两端同号（皆正：知/行、体/用、入世/出世、外圆/内方；皆负：过/不及）⇒ 禁止直接指派正向极，强制先答：
      「正向极在对子外部吗？」（过/不及：中道"适度"在外 ⇒ 三态结构 ⇒ 非内框对）
      「两端是互补关系吗？」（知/行、体/用、入世/出世：可且需同时成立 ⇒ 非内框对）
  · 指派不出 ⇒ 非内框对（fail-closed，与引擎同向）。`;

// ── ④ 追本质硬约束（小搭子 xiaodazi/61）：正则层 fix ──
const HARD61 = `
【④ 追本质硬约束（强制）】若 2b 推理中出现以下任一形态：
  "一桶两义"／"表象义"／"剥去表象"／"剩单极"／"仅指表象"／"X 只是 Y 的表象不显"／"本质=A，表象=B，剥去B只剩A"
  ⇒ 结论栏强制为「非内框对」（即便模型想写价值对也覆盖）。`;

const OUT_FMT = `
现在给你一个「待判对」：若给你的是**表述**，先看它里面**是否含**一对内框对。
🔴 **先定结论，再写理由；理由不得改变结论。**
输出**一行**，用「 | 」分隔三段：**结论** | 落侧 | 理由
  第一段（结论，只能填下面四者之一，逐字）：
    「量差」／「类差」（二者＝本层够不着）／「价值对」（＝是内框对）／「非内框对」（＝不构成一对两极）
  第二段：第一段＝「价值对」⇒ 填「X 本质真侧」（X＝正向极那一端）；其余三种 ⇒ 填「无」
  第三段：理由，不超过 30 字，注明依据的步（1／2a／2b／2c）。
🔴 **自洽硬约束**：第三段里**不得出现与第一段不同的结论词**
   （例：第一段写「价值对」而理由写「非内框对」⇒ **该输出无效**）。
不要输出任何别的内容。`;

// ── 四版 SYS（单变量：仅 STEP2C / HARD61 不同）──
const SYS_A = `${HEAD}${STEP1}${STEP2}${BODY}${OUT_FMT}`;
const SYS_B = `${HEAD}${STEP1}${STEP2}${STEP2C}${BODY}${OUT_FMT}`;
const SYS_C = `${HEAD}${STEP1}${STEP2}${HARD61}${BODY}${OUT_FMT}`;
const SYS_D = `${HEAD}${STEP1}${STEP2}${STEP2C}${HARD61}${BODY}${OUT_FMT}`;

// ── 样本（打缺口，非打易判）──
const S_TRIPLE  = ['过/不及', '知/行', '入世/出世', '体/用'];        // seg1 三不靠：期望 拒（2c 缺口）
const S_SURFACE = ['外圆内方', '绵里藏针'];                          // seg2 表象/隐喻：期望 拒（2b 缺口）
const S_PSEUDO  = ['大智若愚', '大巧若拙', '大勇若怯', '大辩若讷'];  // seg3 自洽缺口重测：期望 拒
const S_CTRL    = ['善/恶', '诚/伪', '勤/惰', '安/危'];              // seg4 控制：期望 纳（不误伤）

// ── 判分：只读槽位（v1 整段正则假阳性 → 槽位化）＋ 自洽回扫（coze/74 附录二）──
const slotsOf = (t) => t.split('|').map((x) => x.trim());
const slot1 = (t) => slotsOf(t)[0] ?? '';
const slot2 = (t) => slotsOf(t)[1] ?? '';
const isNotPair = (t) => /非内框对|量差|类差/.test(slot1(t));
const isOnAxis  = (t) => /价值对/.test(slot1(t)) || /本质真侧|本质假侧/.test(slot2(t));
const isTrueSide = (t) => /本质真侧/.test(slot2(t)) && !/本质假侧/.test(slot2(t));
// 自洽失败：结论=价值对 但理由在剥表象/说单极/说非内框（结论与理由互斥）
const selfFail = (t) => {
  const s = slotsOf(t);
  return /价值对/.test(s[0] ?? '') && /单极|剥|非内框|不构成一对/.test(s[2] ?? '');
};

const ARMS = [
  ['A(v3基线)', SYS_A],
  ['B(v3+2c)', SYS_B],
  ['C(v3+61)', SYS_C],
  ['D(v3+2c+61)', SYS_D],
];
const GROUPS = [
  ['seg1·三不靠(2c缺口)', S_TRIPLE,  'reject', '应拒：两极同号/互补⇒非内框对'],
  ['seg2·表象/隐喻(2b缺口)', S_SURFACE, 'reject', '应拒：剥表象/正极性表象'],
  ['seg3·G_PSEUDO重测', S_PSEUDO, 'reject', '应拒：一桶两义⇒单极'],
  ['seg4·控制G_VALUE', S_CTRL, 'value', '应纳：一正一负不误伤'],
];

const only = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1];
const out = { model: MODEL, temperature: TEMPERATURE, at: new Date().toISOString(), groups: null, usage: usageAcc, note: 'v4 AB：A基线/B+2c/C+61/D+both；样本打缺口' };
const rows = [];

console.log('═══ 四象限判据 v4 AB（A=v3 ｜ B=v3+2c ｜ C=v3+61 ｜ D=v3+2c+61）═══\n');
for (const [gn, list, kind, exp] of GROUPS) {
  if (only && !gn.includes(only)) continue;
  console.log(`───── ${gn}（${exp}）─────`);
  for (const item of list) {
    const line = [];
    for (const [ver, sys] of ARMS) {
      let t = '';
      try { t = await ask(sys, `待判对：「${item}」`, 160); } catch (e) { t = 'ERR ' + e.message; }
      const notPair = isNotPair(t), onAxis = isOnAxis(t), trueSide = isTrueSide(t), sf = selfFail(t);
      let ok = null;
      if (kind === 'value') ok = onAxis && trueSide;
      else if (kind === 'reject') ok = notPair;
      rows.push({ grp: gn, item, ver, kind, notPair, onAxis, trueSide, selfFail: sf, ok, raw: t.replace(/\n+/g, ' ') });
      const tag = sf ? '自洽✗' : (notPair ? '拒✓' : (trueSide ? '纳✓' : '纳✗'));
      line.push(`${ver}⇒${tag}`);
    }
    console.log(`  ${item.padEnd(12)} ${line.join('   ')}`);
    for (const [ver] of ARMS) {
      const r = rows.find((x) => x.item === item && x.ver === ver);
      if (r) console.log(`      ${ver.padEnd(13)} ${r.raw}`);
    }
  }
  console.log('');
}

console.log('═══ 汇总（✓ = 与期望一致｜自洽✗ = 结论与理由互斥，计为未闭合）═══');
const sum = {};
for (const [gn, , kind] of GROUPS) {
  if (only && !gn.includes(only)) continue;
  const out2 = [];
  for (const [ver] of ARMS) {
    const sub = rows.filter((r) => r.grp === gn && r.ver === ver);
    const okc = sub.filter((r) => r.ok === true).length;
    const sfc = sub.filter((r) => r.selfFail).length;
    out2.push(`${ver} ${kind === 'value' ? `纳${okc}/${sub.length}` : `拒${okc}/${sub.length}`}${sfc ? ` 自洽✗${sfc}` : ''}`);
  }
  sum[gn] = out2.join('  |  ');
  console.log(`  ${gn.padEnd(20)} ${out2.join('  |  ')}`);
}
out.groups = { sum, rows };

console.log(`\nusage ${JSON.stringify(usageAcc)}`);
writeFileSync('quadrant-criteria-probe-v4-ab-20261002.out.json', JSON.stringify(out, null, 2));
console.log('→ 写出 quadrant-criteria-probe-v4-ab-20261002.out.json');
console.log('\n读法：只收口不放宽＝seg4 四版皆 纳4/4（不误伤）∧ 缺口组 new≥old。');
console.log('未闭合（如绵里藏针四版皆纳）⇒ 交回天堂邀测，须反馈+解决方案。');
