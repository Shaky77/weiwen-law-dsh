#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
// STEP2C_B 全组验证 + v3full 例句析因 + P3(61死法) 实测（2026-10-02）
//
// 【依据】coze/77（扣子 10-02）：
//   ① P1 点名验证：STEP2C_B（2c 后置语义）全组跑 seg1 应 4/4、seg3 应 4/4、seg4 应 4/4——留给喵验证；
//   ② v4-A ≠ v3：v3(461a148) 2b 含例句「大智若愚的愚＝看起来不显；大勇若怯的怯＝看起来退让」，
//      v4(9efeda7) 2b 例句被删 ⇒ seg2"四版全拒"可能是假闭合；例句是开关级变量；
//   ③ P3（61 死法预测）：SYS_C(只有61无2c) × 知/行 裸样本 ⇒ 模型走"认知-实践轴"推理（无"表象义"词形）
//      ⇒ 误纳且 61 不救。
//
// 【臂设计】
//   F   = HEAD+STEP1+STEP2(v4)+STEP2C_B(后置语义，coze/77逐字)+BODY+OUT_FMT(v4)
//         —— 验证 P1：seg1/seg3/seg4 全组
//   V3F = v3 完整规格（含 2b 例句）×{外圆内方,绵里藏针}×{裸,引号}
//         —— 验证例句锚定：v3full 下外圆内方应复现「纳」（coze/74 漏判）
//   SC  = v3 + HARD61（C 版逐字）× 知/行 —— 验证 P3：61 不触发时误纳
//
// 【读法】P1：F 版 seg1 拒4/4 ∧ seg3 拒4/4 ∧ seg4 纳4/4；
//         例句锚定：V3F 外圆内方（裸或引号）出现「价值对」即复现 coze/74 ⇒ 例句是开关级变量成证；
//         P3：SC 知/行 若判「价值对」⇒ 61 死法预测成立（构造法有效）。
//
// 跑法：node xd-f-step2cb-20261002.mjs
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
if (!KEY) { console.error('✗ 未找到 DeepSeek API key'); process.exit(1); }

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

const STEP2_V3FULL = `
【第二步：验共存 —— 这两端到底能不能「同时」在场】
  **2a 先剔三种假的同时**：
     · **先后交替不是同时**（时而勤时而惰、忽冷忽热、一张一弛 ⇒ 时间上轮流出现 ⇒ 不是共存）；
     · **不同参照下的两立不是同时**（对甲强对乙弱、此处大彼处小 ⇒ 参照变了 ⇒ 不是共存）；
     · **对不同对象各持一端不是同时**（对甲所悲、对乙所喜 ⇒ 对象不同 ⇒ 参照变了 ⇒ 不是共存）。
  **2b 再追本质**：把两端**各自的本质所指**写出来（这个词**在这里**到底指什么），然后对照——
     · 若这"共存"只是**同一个字被装了两层意思**（一端指**本质／内在**，另一端只指**表象／外显**）
       ⇒ **不是共存，是错位（一桶两义）** ⇒ 把**表象那一端剥掉**，
          剩下只剩**单极** ⇒ 不构成一对两极 ⇒ **非内框对**；
          （例：大智若愚的「愚」＝"看起来不显"，**不是**"认知低"；大勇若怯的「怯」＝"看起来退让"，**不是**"真的怯"）
     · 若两端**本质所指同类**（同一根轴的两个极端）∧**本质层互斥**（不能同时成立）⇒ **是内框对**；
     · 若两端本质所指同类、却**确实能同时成立**（例：爱/恨 —— 趋与避是两根不同倾向，不是一根轴的两端）
       ⇒ 该轴不是内框轴 ⇒ **非内框对**。`;

// ── STEP2C_B：coze/77 §二 逐字（2c 后置语义，第三步）──
const STEP2C_B = `
【第三步：极性指派检查（2c）—— 在 2b 完成之后、写结论之前执行】
  若 2b 判"是内框对"，再查两端极性：
  · 两端**同号**（皆正或皆负）⇒ 不得写"价值对"，强制先答：
      「正向极在对子外部吗？」（如过/不及：中道在外 ⇒ 三态结构 ⇒ 改判非内框对）
      「两端是互补关系吗？」（如知/行、体/用：可且需同时成立 ⇒ 改判非内框对）
  · 两端一正一负 ⇒ 维持 2b 结论；
  · 指派不出 ⇒ 非内框对（fail-closed）。`;

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
  第三段：理由，不超过 30 字，注明依据的步（1／2a／2b／3）。
🔴 **自洽硬约束**：第三段里**不得出现与第一段不同的结论词**
   （例：第一段写「价值对」而理由写「非内框对」⇒ **该输出无效**）。
不要输出任何别的内容。`;

// ── 三臂 ──
const SYS_F   = `${HEAD}${STEP1}${STEP2}${STEP2C_B}${BODY}${OUT_FMT}`;
const SYS_V3F = `${HEAD}${STEP1}${STEP2_V3FULL}${BODY}${OUT_FMT}`;
const SYS_SC  = `${HEAD}${STEP1}${STEP2}${HARD61}${BODY}${OUT_FMT}`;

// ── 样本 ──
const S_TRIPLE = ['过/不及', '知/行', '入世/出世', '体/用'];
const S_PSEUDO = ['大智若愚', '大巧若拙', '大勇若怯', '大辩若讷'];
const S_CTRL   = ['善/恶', '诚/伪', '勤/惰', '安/危'];
const S_SURFACE = ['外圆内方', '绵里藏针'];

const slotsOf = (t) => t.split('|').map((x) => x.trim());
const slot1 = (t) => slotsOf(t)[0] ?? '';
const slot2 = (t) => slotsOf(t)[1] ?? '';
const isNotPair = (t) => /非内框对|量差|类差/.test(slot1(t));
const isOnAxis  = (t) => /价值对/.test(slot1(t)) || /本质真侧|本质假侧/.test(slot2(t));
const isTrueSide = (t) => /本质真侧/.test(slot2(t)) && !/本质假侧/.test(slot2(t));
const selfFail = (t) => {
  const s = slotsOf(t);
  return /价值对/.test(s[0] ?? '') && /单极|剥|非内框|不构成一对/.test(s[2] ?? '');
};

const out = { model: MODEL, temperature: TEMPERATURE, at: new Date().toISOString(), usage: usageAcc, note: 'F=STEP2C_B全组验证(coze77 P1) / V3F=v3full例句析因 / SC=61-only×知/行(P3死法)' };
const rows = [];

console.log('═══ STEP2C_B 验证（F）＋ v3full 例句析因（V3F）＋ P3 死法（SC）═══\n');

console.log('───── ① F=STEP2C_B 全组（P1 验证：seg1 拒4/4 ∧ seg3 拒4/4 ∧ seg4 纳4/4）─────');
for (const [gn, list, kind] of [['seg1·三不靠', S_TRIPLE, 'reject'], ['seg3·G_PSEUDO', S_PSEUDO, 'reject'], ['seg4·G_VALUE', S_CTRL, 'value']]) {
  for (const item of list) {
    let t = '';
    try { t = await ask(SYS_F, `待判对：「${item}」`, 160); } catch (e) { t = 'ERR ' + e.message; }
    const notPair = isNotPair(t), onAxis = isOnAxis(t), trueSide = isTrueSide(t), sf = selfFail(t);
    let ok = (kind === 'value') ? (onAxis && trueSide) : (notPair && !sf);
    rows.push({ arm: 'F', grp: gn, item, kind, ok, notPair, trueSide, selfFail: sf, raw: t.replace(/\n+/g, ' ') });
    const tag = sf ? '自洽✗' : (notPair ? '拒✓' : (trueSide ? '纳✓' : '纳✗'));
    console.log(`  [F] ${item.padEnd(10)} ${tag}  |  ${t.replace(/\n+/g, ' ').slice(0, 90)}`);
  }
}
console.log('');

console.log('───── ② V3F=v3full 例句析因（复现 coze/74 漏判：外圆内方应纳）─────');
for (const item of S_SURFACE) {
  for (const q of [false, true]) {
    const input = q ? `「${item}」` : item;
    let t = '';
    try { t = await ask(SYS_V3F, `待判对：${input}`, 160); } catch (e) { t = 'ERR ' + e.message; }
    const notPair = isNotPair(t), trueSide = isTrueSide(t);
    rows.push({ arm: 'V3F', grp: '例句析因', item: `${item}${q ? '(引号)' : '(裸)'}`, kind: 'reject', ok: notPair, notPair, trueSide, raw: t.replace(/\n+/g, ' ') });
    console.log(`  [V3F] ${item}${q ? '(引号)' : '(裸)'}  ${notPair ? '拒✓' : (trueSide ? '纳✓' : '纳✗')}  |  ${t.replace(/\n+/g, ' ').slice(0, 90)}`);
  }
}
console.log('');

console.log('───── ③ SC=61-only × 知/行（P3 死法：预期误纳且 61 不救）─────');
let t3 = '';
try { t3 = await ask(SYS_SC, `待判对：「知/行」`, 160); } catch (e) { t3 = 'ERR ' + e.message; }
const notPair3 = isNotPair(t3), trueSide3 = isTrueSide(t3);
rows.push({ arm: 'SC', grp: 'P3死法', item: '知/行', kind: 'reject', ok: notPair3, notPair: notPair3, trueSide: trueSide3, raw: t3.replace(/\n+/g, ' ') });
console.log(`  [SC] 知/行  ${notPair3 ? '拒✓(P3未命中)' : (trueSide3 ? '纳✓(P3命中)' : '纳✗')}  |  ${t3.replace(/\n+/g, ' ').slice(0, 90)}`);
console.log('');

// ── 汇总 ──
console.log('═══ 汇总 ═══');
const seg1 = rows.filter((r) => r.arm === 'F' && r.grp === 'seg1·三不靠');
const seg3 = rows.filter((r) => r.arm === 'F' && r.grp === 'seg3·G_PSEUDO');
const seg4 = rows.filter((r) => r.arm === 'F' && r.grp === 'seg4·G_VALUE');
console.log(`P1 验证（STEP2C_B）: seg1 拒${seg1.filter((r) => r.ok).length}/${seg1.length}  |  seg3 拒${seg3.filter((r) => r.ok).length}/${seg3.length}  |  seg4 纳${seg4.filter((r) => r.ok).length}/${seg4.length}`);
const v3f = rows.filter((r) => r.arm === 'V3F');
console.log(`例句析因（v3full）: ${v3f.map((r) => `${r.item.replace(/\(引号\)/, '「」')}=${r.notPair ? '拒' : (r.trueSide ? '纳' : '纳✗')}`).join('  ')}`);
const sc = rows.filter((r) => r.arm === 'SC');
console.log(`P3 死法（SC×知/行）: ${sc[0]?.notPair ? '拒（P3 未命中）' : '纳（P3 命中：61 不救）'}`);
console.log(`usage ${JSON.stringify(usageAcc)}`);
out.groups = { rows };
writeFileSync('xd-f-step2cb-20261002.out.json', JSON.stringify(out, null, 2));
console.log('→ 写出 xd-f-step2cb-20261002.out.json');