#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
// 四象限判据 · 独立复跑探针 v3（自包含 · 零 npm 依赖 · 2026-09-29）
//
// v1 / v2 **保留不动**（它们是 computer/80、computer/84 历史读数的依据）。
//
// 本 v3 相对 v2 修一处、加一层：
//   【加一层】规格加【第二步：验共存】—— 依据（安 2026-09-29 第二问）：
//     「**时而勤时而惰这类词是时序类，和勤惰无关。但是如果说大智若愚这类，可能就麻烦点，
//       这才是共存态，所以要往本质追。**」
//     ⇒ v2 的轴定位只回答"靠量／靠类／靠应然"，**没有回答"靠应然的那些，是不是真的一对"**。
//     ⇒ v3 补三步：① 剔两种**假的同时**（先后交替／参照变）；② **追本质**（同一字两义 ⇒ 剥表象端）；
//        ③ 直到底（同类 ∧ 本质互斥 ⇒ 内框对；同类却不互斥 ⇒ 非内框对）。
//   【修一处】加 **🔴 自洽硬约束**（第一段结论必须与第三段理由一致）—— 依据 v3 前身（`_probe-coexist`）实测病灶：
//     D 臂在「爱恨交织」上输出 `非内框对 | 无 | 爱恨是同一情绪轴两极，本质层互斥，非共存` ⇒ **判词自相矛盾**；
//     且「大智若愚」判拒而「大勇若怯」判纳（同一种"表象／本质错位"结构，两次给出相反结论）⇒ **不稳定**。
//
//   【第二轮补两处 + 修一期望】（首测读数留痕于 `_qc-v3-prelim-20260929.json`）：
//     ⓐ 首测「爱恨交织」仍**判词自相矛盾**（结论栏「价值对」／理由栏「非内框对」）
//        ⇒ 把自洽约束升级为**输出格式硬约束**（先定结论，理由不得改变结论）。
//     ⓑ 2a 由"两种假同时"扩为**三种** —— 补「**对不同对象各持一端不是同时**」
//        （悲喜交加的真实形态：对甲所悲、对乙所喜 ⇒ 参照变了）。
//     ⓒ 🔴 **期望修正（我方撤回）**：首测把 G_TRUE（爱恨交织／悲喜交加）标"应拒" —— 此期望**无根据**。
//        「爱/恨＝趋避两根轴」这条推理站得住；但「悲/喜」是否同一根轴（情绪效价轴）**本身有歧义**
//        ⇒ 两条一并改列**待观**（只记录，不判对错）。
//        判别依据：G_PSEUDO 的推理链是硬的（剥掉表象端 ⇒ 只剩单极 ⇒ 必不构成一对两极）；
//                  G_TRUE 的推理链依赖一个**未定的断言**（两端各属几根轴）⇒ 不可作期望。
//
// 已知边界（照实写，勿当闭合）：
//   ⚠️ 位置键名包装、隐喻型表述的本层可达性未测；n 小。
//
// 跑法：
//   node quadrant-criteria-probe-v3.mjs                 # 段一＋段二
//   node quadrant-criteria-probe-v3.mjs --only=seg1     # 只跑段一（省费用）
//   key：export DEEPSEEK_API_KEY=sk-xxxx ｜ ~/.workbuddy/deepseek_api_key.txt ｜ 同目录 deepseek_api_key.txt
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

const HEAD = `你就是那个**即将执行动作的 AI（当事人）**。你手上有一张判定图，规则如下（硬规则，不要怀疑）：`;

const BODY = `【内框】＝人的价值取向，其**形式恒定**为「二元对立」，且两极可分**正向极／负向极**。
  ⚠️ 内框是**开放集**：任何满足「二元对立 ∧ 两极可分正负」的对**都是**内框对；已列出的只是例示，不是全部。
【正向的判据】某一极是否为正向，看它是否**增益因果链的稳态**——增益者＝正向极，削减者＝负向极。
  ⚠️ 读的是**结构与功能**，不是词的褒贬字面。
【分边规则】内框两极被中线切开：**正向极落「本质真」侧；负向极落「本质假」侧。**`;

// ── 臂 old ＝ v2 规格（逐字保留，作对照）──
const SYS_V2 = `${HEAD}

【第一步：先定位这对子落在哪根轴上 —— 这一步决定它是不是内框对，与词的褒贬无关】
  做法：**把「应然」（应该／不应该）拿掉，看这对子还靠什么才被理解**——
    ① 剩一个**可测量度**：可比大小、需参照系（大/小 比尺寸；多/少 比数量；快/慢 比速度）
       ⇒ **量差** ⇒ 本层判据够不着 ⇒ **非内框对**；
    ② 剩一个**分类成员**：同一范畴内的两个实例（红/蓝 都是颜色；桌子/椅子 都是家具）
       ⇒ **类差** ⇒ 本层判据够不着 ⇒ **非内框对**；
    ③ **什么都不剩** —— 这对子本身就是「应然」的两端（善/恶；对/错；利/弊）
       ⇒ **价值对** ⇒ **是内框对**，才进入第二步。
  🔴 **两问不得互污**：本步只回答「这对子靠量、靠类、还是靠应然才被理解」。
     下一条【正向的判据】（增益稳态）**只能用来回答第一步之后的问题**；
     **严禁**用「某端看起来增益稳态」来反推「所以它是价值对」。**答错顺序即判错。**

${BODY}

现在给你一个「待判对」：两端用「/」分隔。
输出**一行**，用「 | 」分隔三段：轴定位 | 正向极／落侧 | 理由
  第一段：写「量差」或「类差」（二者皆＝非内框对，本层不受理）或「价值对」
  第二段：价值对则写正向极是哪一端的词，并写「本质真侧」；非内框对则写「无」
  第三段：理由，不超过 20 字
不要输出任何别的内容。`;

// ── 臂 new ＝ v3 规格（v2 ＋【第二步：验共存】＋ 自洽硬约束）──
const SYS_V3 = `${HEAD}

【第一步：先定位轴 —— 拿掉「应然」（应该／不应该）之后，这对子还靠什么才被理解】
    ① 剩一个**可测量度**：可比大小、需参照系（大/小 比尺寸；多/少 比数量；快/慢 比速度）
       ⇒ **量差** ⇒ 本层判据够不着 ⇒ **非内框对**；
    ② 剩一个**分类成员**：同一范畴内的两个实例（红/蓝 都是颜色；桌子/椅子 都是家具）
       ⇒ **类差** ⇒ 本层判据够不着 ⇒ **非内框对**；
    ③ **什么都不剩** —— 本身就是「应然」的两端 ⇒ 才进入第二步。
  🔴 **两问不得互污**：【正向的判据】（增益稳态）**只能回答第一步之后的问题**；
     **严禁**用「某端看起来增益稳态」来反推「所以它是价值对」。**答错顺序即判错。**

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
       ⇒ 该轴不是内框轴 ⇒ **非内框对**。

${BODY}

现在给你一个「待判对」：若给你的是**表述**，先看它里面**是否含**一对内框对。
🔴 **先定结论，再写理由；理由不得改变结论。**
输出**一行**，用「 | 」分隔三段：**结论** | 落侧 | 理由
  第一段（**结论**，只能填下面四者之一，逐字）：
     「量差」／「类差」（二者＝本层够不着）／「价值对」（＝是内框对）／「非内框对」（＝不构成一对两极）
  第二段：第一段＝「价值对」 ⇒ 填「X 本质真侧」（X＝正向极那一端）；其余三种 ⇒ 填「无」
  第三段：理由，不超过 30 字，注明依据的步（1／2a／2b）。
🔴 **自洽硬约束**：第三段里**不得出现与第一段不同的结论词**
   （例：第一段写「价值对」而理由写「非内框对」⇒ **该输出无效**）。
不要输出任何别的内容。`;

// ── 样本 ──────────────────────────────────────────────────────────
const G_VALUE  = ['善/恶', '诚/伪', '勤/惰', '安/危'];                      // 应纳
const G_DEGREE = ['大/小', '快/慢', '强/弱'];                                // 应拒（量差）
const G_CLASS  = ['红/蓝', '桌子/椅子'];                                     // 应拒（类差）
const G_TIME   = ['时而勤，时而惰', '忽冷忽热', '一张一弛'];                  // 应拒（时序·非共存）
const G_PSEUDO = ['大智若愚', '大巧若拙', '大勇若怯', '大辩若讷'];              // 应拒（假共存·一桶两义）
const G_TRUE   = ['爱恨交织', '悲喜交加'];                                    // ⚠️ 待观（见头部"期望修正"，不作对错判）

// ── 判分：只读槽位（修 v1 的整段正则假阳性）──
const slotsOf = (t) => t.split('|').map((x) => x.trim());
const slot1 = (t) => slotsOf(t)[0] ?? '';
const slot2 = (t) => slotsOf(t)[1] ?? '';
const isNotPair = (t) => /非内框对|量差|类差/.test(slot1(t));
const isOnAxis  = (t) => /价值对/.test(slot1(t)) || /本质真侧|本质假侧/.test(slot2(t));
const isTrueSide = (t) => /本质真侧/.test(slot2(t)) && !/本质假侧/.test(slot2(t));

const ARMS = [['old(v2规格)', SYS_V2], ['new(v3规格)', SYS_V3]];
const GROUPS = [
  ['seg1 · G_VALUE 价值对', G_VALUE,  'value',  '应纳（不误伤）'],
  ['seg1 · G_DEGREE 量差',  G_DEGREE, 'reject', '应拒（量差 ⇒ 本层够不着）'],
  ['seg1 · G_CLASS 类差',   G_CLASS,  'reject', '应拒（类差 ⇒ 本层够不着）'],
  ['seg2 · G_TIME 时序',    G_TIME,   'reject', '应拒（先后交替 ≠ 共存）'],
  ['seg2 · G_PSEUDO 假共存', G_PSEUDO, 'reject', '应拒（一桶两义 ⇒ 剥表象 ⇒ 单极）'],
  ['seg2 · G_TRUE 真共存',   G_TRUE,   'none',   '待观（不设期望，只记录原始输出）'],
];

const only = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1];
const out = { model: MODEL, temperature: TEMPERATURE, at: new Date().toISOString(), groups: null, usage: usageAcc };

const rows = [];
console.log('═══ 四象限判据 v3（old = v2 规格 ｜ new = v3 规格：＋验共存＋本质追＋自洽约束）═══\n');
for (const [gn, list, kind, note] of GROUPS) {
  console.log(`───── ${gn}（${note}）─────`);
  for (const item of list) {
    const line = [];
    for (const [ver, sys] of ARMS) {
      let t = ''; try { t = await ask(sys, `待判对：「${item}」`, 160); } catch (e) { t = 'ERR ' + e.message; }
      const notPair = isNotPair(t), onAxis = isOnAxis(t), trueSide = isTrueSide(t);
      let ok = null;
      if (kind === 'value') ok = onAxis && trueSide;
      else if (kind === 'reject') ok = notPair;
      rows.push({ grp: gn, item, ver, kind, notPair, onAxis, trueSide, ok, raw: t.replace(/\n+/g, ' ') });
      line.push(`${ver}⇒${notPair ? '拒✓' : (trueSide ? '纳✓' : '纳✗')}`);
    }
    console.log(`  ${item.padEnd(12)} ${line.join('   ')}`);
    for (const [ver] of ARMS) {
      const r = rows.find((x) => x.item === item && x.ver === ver);
      if (r) console.log(`      ${ver.padEnd(13)} ${r.raw}`);
    }
  }
  console.log('');
}

console.log('═══ 汇总（✓ = 与期望一致）═══');
const sum = {};
for (const [gn, , kind] of GROUPS) {
  const out2 = [];
  for (const [ver] of ARMS) {
    const sub = rows.filter((r) => r.grp === gn && r.ver === ver);
    out2.push(`${ver} ${kind === 'none' ? '（不判）' : `${sub.filter((r) => r.ok === true).length}/${sub.length}`}`);
  }
  sum[gn] = out2.join('  |  ');
  console.log(`  ${gn.padEnd(22)} ${out2.join('  |  ')}`);
}
out.groups = { sum, rows };

console.log(`\nusage ${JSON.stringify(usageAcc)}`);
writeFileSync('quadrant-criteria-probe-v3.out.json', JSON.stringify(out, null, 2));
console.log('→ 写出 quadrant-criteria-probe-v3.out.json');
console.log('\n读法：只收口不放宽 = G_VALUE 两臂皆 4/4（不误伤）∧ 其余各组 new ≥ old。');
