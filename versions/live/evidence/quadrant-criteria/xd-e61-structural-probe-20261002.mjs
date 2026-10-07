#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
// 61 读词形局限的结构化替代 · E 版验证探针（自包含 · 零 npm 依赖 · 2026-10-02）
//
// 【动机】（computer/08 待小搭子回：61 读词形局限的结构化替代；
//          独立复跑 v4 实证：A 知/行 以「行为外显」措辞绕过 HARD61 触发词仍判价值对）
//   HARD61（xiaodazi/61）是正则层 fix：扫描推理里的「一桶两义/表象义/剥去表象/剩单极」字样，
//   命中即强制「非内框对」。我方独立复跑用「知为本质认知、行为外显」躲过全部触发词，
//   模型照样判「价值对」 ⇒ 读的是**词形**不是**词性**。
//
// 【E 版 = 结构化替代】把「剥表象」从**正则覆盖**换成**槽位显式化**：
//   STEP 要求模型对两端分别写出「本质所指」，再依所指（不是字样）做三项判别：
//     所指同位∧互斥 ⇒ 价值对；同位∧共存 ⇒ 非内框对；所指不同位（内质/外显/功能/度量）⇒ 非内框对。
//   判分器**只读槽位字段**，不扫描自由文本 —— 与 v1 判分器假阳性教训（computer/83）一致。
//
// 【对照设计】同批样本三臂单变量：
//   A = v3 基线（STEP1+STEP2(2a/2b)+OUT_FMT，与官方逐字相同）
//   C = v3 + HARD61（官方 C 版逐字）
//   E = v3 + 2b'（槽位化本质所指）+ OUT_FMT'（四段槽位）
//
// 【样本】官方 seg1-4 全部 16 条 + 对抗组（换措辞表象/本质样本）4 条
//   + G_TRUE 真共存参考 2 条（爱恨交织/悲喜交加：本层参照，不强判）
//
// 【读法】E 需同时满足：seg1 拒4/4（含 C 漏的知/行、过/不及）∧ seg3 拒4/4（不丢 C 的战果）
//   ∧ seg4 纳4/4（不误伤）∧ seg2 拒（不打折）⇒ 才是「只收口不放宽」的结构化替代。
//   未闭合照实说；规格变更归安裁，本探针只提测，不落码。
//
// 跑法：node xd-e61-structural-probe-20261002.mjs
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
async function ask(system, content, maxTok = 180) {
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

// ── HEAD / BODY（A/C 与官方逐字相同；E 沿用同一 HEAD/BODY）──
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

const HARD61 = `
【④ 追本质硬约束（强制）】若 2b 推理中出现以下任一形态：
  "一桶两义"／"表象义"／"剥去表象"／"剩单极"／"仅指表象"／"X 只是 Y 的表象不显"／"本质=A，表象=B，剥去B只剩A"
  ⇒ 结论栏强制为「非内框对」（即便模型想写价值对也覆盖）。`;

// ── E：2b 槽位化（结构化替代：不扫字样，读所指）──
const STEP2B_E = `
【第二步：验共存 —— 这两端到底能不能「同时」在场】
  **2a 先剔三种假的同时**：
     · 先后交替不是同时（时而勤时而惰、忽冷忽热 ⇒ 时间轮流 ⇒ 不是共存）；
     · 不同参照下的两立不是同时（对甲强对乙弱、此处大彼处小 ⇒ 参照变了 ⇒ 不是共存）；
     · 对不同对象各持一端不是同时（对甲所悲、对乙所喜 ⇒ 对象不同 ⇒ 不是共存）。
  **2b' 追本质（槽位化）**：对**两端各自**写下「本质所指」——这个词在此语境里**实际指向什么**（不是词典义，是它在这里代表的那件事）。
     然后只按「所指关系」三项判别，**禁止用词的褒贬、形象、字面联想去换判别**：
     · 所指 A、B **同一根轴的两个极端**，且本质层**互斥**（不能同时成立）⇒ **价值对**；
     · 所指 A、B 同一根轴却**能同时成立**（爱/恨＝趋与避两根倾向）⇒ 非内框对；
     · 所指 A、B **不同位**：一端指向本质／内在，另一端只指向外显／表象／功能／度量
       （如 知＝认知能力、行＝实践活动；体＝本体、用＝功用）⇒ 表象端剥去只剩单极 ⇒ **非内框对**。`;

const OUT_FMT_A = `
现在给你一个「待判对」：若给你的是**表述**，先看它里面**是否含**一对内框对。
🔴 **先定结论，再写理由；理由不得改变结论。**
输出**一行**，用「 | 」分隔三段：**结论** | 落侧 | 理由
  第一段（结论，只能填下面四者之一，逐字）：
    「量差」／「类差」（二者＝本层够不着）／「价值对」（＝是内框对）／「非内框对」（＝不构成一对两极）
  第二段：第一段＝「价值对」⇒ 填「X 本质真侧」（X＝正向极那一端）；其余三种 ⇒ 填「无」
  第三段：理由，不超过 30 字，注明依据的步（1／2a／2b）。
🔴 **自洽硬约束**：第三段里**不得出现与第一段不同的结论词**
   （例：第一段写「价值对」而理由写「非内框对」⇒ **该输出无效**）。
不要输出任何别的内容。`;

const OUT_FMT_E = `
现在给你一个「待判对」：若给你的是**表述**，先看它里面**是否含**一对内框对。
🔴 **先定结论，再写理由；理由不得改变结论。**
输出**一行**，用「 | 」分隔**四段**：**结论** | 落侧 | 所指关系 | 理由
  第一段（结论，只能填下面四者之一，逐字）：
    「量差」／「类差」（二者＝本层够不着）／「价值对」（＝是内框对）／「非内框对」（＝不构成一对两极）
  第二段：第一段＝「价值对」⇒ 填「X 本质真侧」（X＝正向极那一端）；其余三种 ⇒ 填「无」
  第三段（所指关系，只能填三选一，逐字）：
    「同位互斥」（＝同一根轴两端∧本质层互斥）／「同位共存」（＝同一根轴却可同时成立）／「所指不同位」（＝内质/外显/功能/度量错位）
  第四段：理由，不超过 30 字，注明依据的步（1／2a／2b'）。
🔴 **自洽硬约束**：
   · 第一段「价值对」⇔ 第三段必须是「同位互斥」∧ **第四段理由不得出现「单极/剥/表象/外显/只剩」字样**（剥表象＝指向不同位，与价值对互斥）；
   · 第一段「非内框对」且非量差类差 ⇒ 第三段必须是「同位共存」或「所指不同位」；
   · 违背任一条 ⇒ **该输出无效**。
不要输出任何别的内容。`;

const SYS_A = `${HEAD}${STEP1}${STEP2}${BODY}${OUT_FMT_A}`;
const SYS_C = `${HEAD}${STEP1}${STEP2}${HARD61}${BODY}${OUT_FMT_A}`;
const SYS_E = `${HEAD}${STEP1}${STEP2B_E}${BODY}${OUT_FMT_E}`;

// ── 样本：官方 seg1-4 + 对抗组 + G_TRUE 参考 ──
const S_TRIPLE  = ['过/不及', '知/行', '入世/出世', '体/用'];          // seg1 三不靠：期望 拒
const S_SURFACE = ['外圆内方', '绵里藏针'];                            // seg2 表象/隐喻：期望 拒
const S_ADV     = ['外柔内刚', '金玉其外'];                            // 对抗：换措辞表象对（E 必须仍拒）
const S_PSEUDO  = ['大智若愚', '大巧若拙', '大勇若怯', '大辩若讷'];    // seg3 自洽缺口：期望 拒
const S_CTRL    = ['善/恶', '诚/伪', '勤/惰', '安/危'];               // seg4 控制：期望 纳
const S_GTRUE   = ['爱恨交织', '悲喜交加'];                            // G_TRUE 真共存参考（记录不判）

const ARMS = [
  ['A(v3基线)', SYS_A],
  ['C(v3+61)', SYS_C],
  ['E(v3+2b′槽位化)', SYS_E],
];
const GROUPS = [
  ['seg1·三不靠(2c缺口)', S_TRIPLE, 'reject', '应拒'],
  ['seg2·表象/隐喻(2b缺口)', S_SURFACE, 'reject', '应拒'],
  ['对抗·换措辞表象对', S_ADV, 'reject', '应拒（换措辞不减效）'],
  ['seg3·G_PSEUDO重测', S_PSEUDO, 'reject', '应拒'],
  ['seg4·控制G_VALUE', S_CTRL, 'value', '应纳'],
  ['G_TRUE·真共存参考', S_GTRUE, 'ref', '记录不判'],
];

const slotsOf = (t) => t.split('|').map((x) => x.trim());
const slot1 = (t) => slotsOf(t)[0] ?? '';
const slot2 = (t) => slotsOf(t)[1] ?? '';
const slot3 = (t) => slotsOf(t)[2] ?? '';
const slot4 = (t) => slotsOf(t)[3] ?? '';
const isNotPair = (t) => /非内框对|量差|类差/.test(slot1(t));
const isOnAxis  = (t) => /价值对/.test(slot1(t)) || /本质真侧|本质假侧/.test(slot2(t));
const isTrueSide = (t) => /本质真侧/.test(slot2(t)) && !/本质假侧/.test(slot2(t));
// A/C 臂：官方 selfFail——结论=价值对 但理由在剥表象/说单极/说非内框
const selfFail = (t) => {
  const s = slotsOf(t);
  return /价值对/.test(s[0] ?? '') && /单极|剥|非内框|不构成一对/.test(s[2] ?? '');
};
// E 臂：槽位一致性——只对四段式生效
const eRel = (t) => {
  const s = slotsOf(t);
  if (s.length < 4) return null; // 非 E 版格式（三段式）不判
  const c1 = s[0] ?? '', c2 = s[2] ?? '', c4 = s[3] ?? '';
  if (/价值对/.test(c1)) {
    // 结论价值对 ⇔ 关系槽=同位互斥 ∧ 理由不含剥表象字眼
    if (!/同位互斥/.test(c2)) return '结论价值对但关系≠同位互斥';
    if (/单极|剥|表象|外显|只剩/.test(c4)) return '结论价值对但理由在剥表象';
  }
  if (/非内框对/.test(c1)) {
    if (/量差|类差/.test(c1)) { if (!/量差|类差/.test(c2) && !/同位|所指/.test(c2)) return '量差类差但关系槽异常'; }
    else if (!/同位共存|所指不同位/.test(c2)) return '结论非内框对但关系≠同位共存/所指不同位';
  }
  return null;
};

const out = { model: MODEL, temperature: TEMPERATURE, at: new Date().toISOString(), usage: usageAcc, note: 'E61：A基线/C+61正则/E+2b′槽位化；对抗组换措辞；G_TRUE参考不判' };
const rows = [];

console.log('═══ 61 结构化替代 E 版（A=v3基线 ｜ C=v3+61 ｜ E=v3+2b′槽位化）═══\n');
for (const [gn, list, kind, exp] of GROUPS) {
  console.log(`───── ${gn}（${exp}）─────`);
  for (const item of list) {
    const line = [];
    for (const [ver, sys] of ARMS) {
      let t = '';
      try { t = await ask(sys, `待判对：「${item}」`, 180); } catch (e) { t = 'ERR ' + e.message; }
      const notPair = isNotPair(t), onAxis = isOnAxis(t), trueSide = isTrueSide(t), sf = selfFail(t), rf = eRel(t);
      let ok = null;
      let tag = '';
      if (ver === 'E(v3+2b′槽位化)') {
        // E 臂：判分只读槽位＋槽位一致性；结论=价值对需同时满足 关系=同位互斥 ∧ 理由不剥表象
        const bad = rf;
        if (kind === 'value') ok = onAxis && trueSide && !bad;
        else if (kind === 'reject') ok = notPair && !bad;
        tag = bad ? `关系✗(${bad})` : (notPair ? '拒✓' : (trueSide ? '纳✓' : '纳✗'));
      } else {
        // A/C 臂：沿用官方判分（notPair / 自洽回扫）
        if (kind === 'value') ok = onAxis && trueSide;
        else if (kind === 'reject') ok = notPair && !sf;
        tag = sf ? '自洽✗' : (notPair ? '拒✓' : (trueSide ? '纳✓' : '纳✗'));
      }
      rows.push({ grp: gn, item, ver, kind, notPair, onAxis, trueSide, selfFail: sf, relFail: rf, ok, raw: t.replace(/\n+/g, ' ') });
      line.push(`${ver}⇒${tag}`);
    }
    console.log(`  ${item.padEnd(10)} ${line.join('   ')}`);
    for (const [ver] of ARMS) {
      const r = rows.find((x) => x.item === item && x.ver === ver);
      if (r) console.log(`      ${ver.padEnd(15)} ${r.raw}`);
    }
  }
  console.log('');
}

console.log('═══ 汇总（✓ = 与期望一致｜自洽✗＝结论/理由互斥｜关系✗＝E版槽位不自洽）═══');
const sum = {};
for (const [gn, , kind] of GROUPS) {
  const out2 = [];
  for (const [ver] of ARMS) {
    const sub = rows.filter((r) => r.grp === gn && r.ver === ver);
    if (kind === 'ref') { out2.push(`${ver} 记录${sub.length}`); continue; }
    const okc = sub.filter((r) => r.ok === true).length;
    const sfc = sub.filter((r) => r.selfFail).length;
    const rfc = sub.filter((r) => r.relFail).length;
    out2.push(`${ver} ${kind === 'value' ? `纳${okc}/${sub.length}` : `拒${okc}/${sub.length}`}${ver === 'E(v3+2b′槽位化)' ? (rfc ? ` 关系✗${rfc}` : '') : (sfc ? ` 自洽✗${sfc}` : '')}`);
  }
  sum[gn] = out2.join('  |  ');
  console.log(`  ${gn.padEnd(22)} ${out2.join('  |  ')}`);
}
out.groups = { sum, rows };

console.log(`\nusage ${JSON.stringify(usageAcc)}`);
writeFileSync('xd-e61-structural-probe-20261002.out.json', JSON.stringify(out, null, 2));
console.log('→ 写出 xd-e61-structural-probe-20261002.out.json');
console.log('\n读法（E 版过闸条件）：seg1 拒4/4 ∧ seg3 拒4/4 ∧ seg4 纳4/4 ∧ 对抗组 拒4/4 ⇒ 结构化替代成功；');
console.log('任一不满足 ⇒ 未闭合，交回天堂要方案。');