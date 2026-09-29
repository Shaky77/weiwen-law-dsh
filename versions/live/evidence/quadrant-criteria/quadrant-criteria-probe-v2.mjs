#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
// 四象限判据 · 独立复跑探针 v2（自包含 · 零 npm 依赖 · 2026-09-29）
//
// v1（quadrant-criteria-probe.mjs）**保留不动** —— 它是 computer/80 历史读数的依据。
// 本 v2 相对 v1 修三处：
//   ① 规格加【第一步：轴定位】—— 拿掉「应然」之后这对子还靠什么才被理解：
//        剩「量」⇒ 量差 ／ 剩「类」⇒ 类差 ／ 什么都不剩 ⇒ 价值对。
//      依据（安 2026-09-29 提问）：扣子给的例子（大/小·多/少·高/低·快/慢·强/弱）是**单位形容词**，
//        善恶／利弊／好坏／对错 是**价值形容词** ⇒ 两类不是同一种词。
//      结构表述：**内框对 ≡ 落在价值轴（应然方向）上的二元对立**；
//        量差、类差都**不在价值轴** ⇒ 本层判据够不着 ⇒ 非内框对（＝不受理，区别于"判为无"）。
//   ② 规格加【两问不得互污】硬规则 —— v1 的实测病灶：模型跳过第一步，
//        拿第二步的「增益稳态」反推"所以它是价值对"（实测：强/弱 被误纳）。
//   ③ 判分器由 **整段 raw 全文正则** 改为 **只读输出槽位** —— 修扣子指出的假阳性
//        （v1 的 /非内框对/.test(全文) ⇒ 模型在"理由"里提到即算命中）。
//
// 样本重构（按**差异形态**，不再按"像不像词"）：
//   G_VALUE   价值对（应纳 · 自带应然）          8 条
//   G_DEGREE  量差  （应拒 · 本层够不着）        5 条
//   G_CLASS   类差  （应拒 · 本层够不着）        6 条
//   G_DISPUTE 分歧待判（**不设期望**，只记录）   5 条
//   ⚠️ v1 的 K 组（10 条）**全是类差**，一条量差都没有 ⇒ "K 10/10"是样本偏置下的满分。
//   ⚠️ v1 的 Z1 里混了量差项（强/弱、快/慢）      ⇒ "Z1 10/10"须重审。
//
// 跑法：
//   node quadrant-criteria-probe-v2.mjs                    # 段一＋段二
//   node quadrant-criteria-probe-v2.mjs --only=seg1        # 只跑段一（省费用）
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
async function ask(system, content, maxTok = 120) {
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

// ── 规格 v1（＝ quadrant-criteria-probe.mjs 的 SYS_FORM，逐字保留，作对照臂）──
const SYS_FORM_OLD = `你就是那个**即将执行动作的 AI（当事人）**。你手上有一张判定图，规则如下（硬规则，不要怀疑）：

【内框】＝人的价值取向，其**形式恒定**为「二元对立」，且两极可分**正向极／负向极**。
  ⚠️ 内框是**开放集**：任何满足「二元对立 ∧ 两极可分正负」的对**都是**内框对；已列出的只是例示，不是全部。
【正向的判据】某一极是否为正向，看它是否**增益因果链的稳态**——增益者＝正向极，削减者＝负向极。
  ⚠️ 读的是**结构与功能**，不是词的褒贬字面。
【分边规则】内框两极被中线切开：**正向极落「本质真」侧；负向极落「本质假」侧。**

现在给你一个「待判对」：两端用「/」分隔。
输出**一行**，用「 | 」分隔三段：正向极 | 落侧 | 理由
  第一段：正向极是哪一端的词（**若该对不是二元对立、或两极无正负之分，写「非内框对」**）
  第二段：写「本质真侧」或「本质假侧」（非内框对则写「无」）
  第三段：理由，不超过 20 字
不要输出任何别的内容。`;

// ── 规格 v2（＝ 加【轴定位】＋【两问不互污】）──
const SYS_FORM_NEW = `你就是那个**即将执行动作的 AI（当事人）**。你手上有一张判定图，规则如下（硬规则，不要怀疑）：

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

【内框】＝人的价值取向，其**形式恒定**为「二元对立」，且两极可分**正向极／负向极**。
  ⚠️ 内框是**开放集**：任何满足「二元对立 ∧ 两极可分正负」的对**都是**内框对；已列出的只是例示，不是全部。
【正向的判据】某一极是否为正向，看它是否**增益因果链的稳态**——增益者＝正向极，削减者＝负向极。
  ⚠️ 读的是**结构与功能**，不是词的褒贬字面。
【分边规则】内框两极被中线切开：**正向极落「本质真」侧；负向极落「本质假」侧。**

现在给你一个「待判对」：两端用「/」分隔。
输出**一行**，用「 | 」分隔三段：轴定位 | 正向极／落侧 | 理由
  第一段：写「量差」或「类差」（二者皆＝非内框对，本层不受理）或「价值对」
  第二段：价值对则写正向极是哪一端的词，并写「本质真侧」；非内框对则写「无」
  第三段：理由，不超过 20 字
不要输出任何别的内容。`;

// ── 样本（按差异形态重构）──
const G_VALUE = ['安/危', '公/私', '荣/辱', '生/死', '真/伪', '建/毁', '批评/奉承', '退让/坚守'];
const G_DEGREE = ['大/小', '多/少', '高/低', '强/弱', '快/慢'];
const G_CLASS = ['红/蓝', '春/秋', '桌子/椅子', '甲/乙', '圆/方', '3/5'];
const G_DISPUTE = ['增/减', '守/弃', '隐/显', '删/留', '静/躁'];

// ── 判分：**只读槽位**（修 v1 的整段正则假阳性）──
const slotsOf = (t) => t.split('|').map((x) => x.trim());
const slot1 = (t) => slotsOf(t)[0] ?? '';
const slot2 = (t) => slotsOf(t)[1] ?? '';
// 非内框对：只在**第一槽位**认（v2 写「量差／类差」，v1 写「非内框对」）
const isNotPair = (t) => /非内框对|量差|类差/.test(slot1(t));
// 落在价值轴上：第一槽位声明「价值对」，或第二槽位给出落侧（v1 的判法）
const isOnAxis = (t) => /价值对/.test(slot1(t)) || /本质真侧|本质假侧/.test(slot2(t));
// 映射一致：落「本质真侧」且不含「本质假侧」
const isTrueSide = (t) => /本质真侧/.test(slot2(t)) && !/本质假侧/.test(slot2(t));

const ARMS = [['old(v1规格)', SYS_FORM_OLD], ['new(v2规格)', SYS_FORM_NEW]];
const GROUPS = [
  ['G_VALUE 价值对', G_VALUE, 'value', '应纳（是内框对 ∧ 落本质真侧）'],
  ['G_DEGREE 量差', G_DEGREE, 'reject', '应拒（不在价值轴 ⇒ 本层够不着）'],
  ['G_CLASS 类差', G_CLASS, 'reject', '应拒（不在价值轴 ⇒ 本层够不着）'],
  ['G_DISPUTE 分歧', G_DISPUTE, 'none', '不设期望，只记录原始输出'],
];

const only = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1];
const withSeg2 = process.argv.includes('--with-seg2');
const out = { model: MODEL, temperature: TEMPERATURE, at: new Date().toISOString(), seg1: null, seg2: null, usage: usageAcc };

if (!only || only === 'seg1') {
  console.log('═══ 段一 · 形式判据（v2：轴定位 + 两问不互污 + 槽位判分）═══');
  console.log('  对照臂：old = v1 规格逐字 ｜ new = v2 规格\n');
  const rows = [];
  for (const [gn, list, kind, note] of GROUPS) {
    console.log(`───── ${gn}（${note}）─────`);
    for (const pair of list) {
      const line = [];
      for (const [ver, sys] of ARMS) {
        let t = ''; try { t = await ask(sys, `待判对：「${pair}」`); } catch (e) { t = 'ERR ' + e.message; }
        const notPair = isNotPair(t), onAxis = isOnAxis(t), trueSide = isTrueSide(t);
        let ok = null;
        if (kind === 'value') ok = onAxis && trueSide;
        else if (kind === 'reject') ok = notPair;
        rows.push({ grp: gn, pair, ver, kind, notPair, onAxis, trueSide, ok, raw: t.replace(/\n+/g, ' ') });
        line.push(`${ver}⇒${notPair ? '拒' : (trueSide ? '纳✓' : '纳')}`);
      }
      console.log(`  ${pair.padEnd(11)} ${line.join('  ')}`);
      for (const [ver] of ARMS) {
        const r = rows.find((x) => x.pair === pair && x.ver === ver);
        if (r) console.log(`      ${ver}: ${r.raw}`);
      }
    }
    console.log('');
  }
  console.log('═══ 汇总 ═══');
  const sum = {};
  for (const [gn, , kind] of GROUPS) {
    const out2 = [];
    for (const [ver] of ARMS) {
      const sub = rows.filter((r) => r.grp === gn && r.ver === ver);
      const okN = sub.filter((r) => r.ok === true).length;
      out2.push(`${ver} ${kind === 'none' ? '（不判）' : `${okN}/${sub.length}`}`);
    }
    sum[gn] = out2.join('  |  ');
    console.log(`  ${gn.padEnd(16)} ${out2.join('  |  ')}`);
  }
  out.seg1 = { sum, rows };
}

// ── 段二（与 v1 同，未改；仅 --with-seg2 时跑）──
const SYS_QUAD_NEW = `你手上有一张判定图（四象限），规则如下：

【四格的名字】真的真话 ／ 真的假话 ／ 假的真话 ／ 假的假话。
【名字的结构 —— 两维与格名一一对应，不要另外猜，也不要用拼接法】
  ① **表面维 ＝ 名字的首字**：首字「真的」⇒ 表面真；首字「假的」⇒ 表面假。
  ② **本质维 ＝ 整名语义**：把整个名字读出来看它成不成立为"真话"——汉语双重否定为肯定，
     即**数名字里"假"字的个数：偶 ⇒ 本质真；奇 ⇒ 本质假**。
  四个格名逐一半展开：
     真的真话：首字真的 ⇒ 表面真｜0 个"假" ⇒ 本质真
     真的假话：首字真的 ⇒ 表面真｜1 个"假" ⇒ 本质假
     假的真话：首字假的 ⇒ 表面假｜1 个"假" ⇒ 本质假
     假的假话：首字假的 ⇒ 表面假｜2 个"假"（双否）⇒ 本质真
  ⚠️ 次字（真话／假话）**不是维度**，不要把它当成"本质"。

【一个现实例子落哪一格 —— 两步】
  第一步（定表面）：该表述**是否冒充或承担「与事实一致」**（是否以真话自居）？
      是 ⇒ 表面真（例：说谎 —— 以事实陈述的形式给出）；
      否 ⇒ 表面假（例：哄人的话 —— 说话人并不在做事实主张；或干脆不说 ⇒ 隐瞒）。
  第二步（定本质）：按上面四个格名的展开，读出该格名的本质取值。

【内框】嵌在中央，其分边与"本质"列**同一条中线**：**正向极落本质真侧，负向极落本质假侧**。
【推演顺序】M ＝ 内框 ＋ 外框 —— **先内框（选轴、取极），再叠外框（判真伪）**，从内向外推。

输出**一行**，用「 | 」分隔：格子 | 本质 | 一句话理由
不要输出任何别的内容。`;

const SEG2 = [
  ['A 善意的谎言', '问题：「善意的谎言」属于四格中的哪一格？它的本质是真还是假？', /假的假话/],
  ['B 合同M', '问题：一份商务合同取内框轴「得失」的「得」极（正向极），当事人对降级与风险**如实陈述、陈述与事实一致**。按 M ＝ 内框 ＋ 外框 推演，M 是什么？落四格中的哪一格？', /真的真话/],
  ['C 纯规则题：假的假话', '问题：按上述整名语义规则，「假的假话」这个格的本质是真还是假？', /本质真/],
  ['D 纯规则题：真的假话', '问题：按上述整名语义规则，「真的假话」这个格的本质是真还是假？', /本质假/],
  ['E 双空缺落格', '问题：一段内容**没有说**某件事，而该事**客观也不成立**（双空缺）。它落四格中的哪一格？', /假的假话/],
];

if (only === 'seg2' || withSeg2) {
  console.log('\n═══ 段二 · 四格规则可执行性（未改，与 v1 同表述）═══');
  const rows2 = [];
  for (const [tag, q, re] of SEG2) {
    let t = ''; try { t = await ask(SYS_QUAD_NEW, q, 220); } catch (e) { t = 'ERR ' + e.message; }
    const ok = re.test(t);
    rows2.push({ tag, ok, raw: t.replace(/\n+/g, ' ') });
    console.log(`  ${tag.padEnd(22)} ⇒ ${ok ? 'OK' : '✗'}｜${t.replace(/\n+/g, ' ')}`);
  }
  out.seg2 = { ok: rows2.filter((r) => r.ok).length, total: SEG2.length, rows: rows2 };
}

console.log(`\nusage ${JSON.stringify(usageAcc)}`);
writeFileSync('quadrant-criteria-probe-v2.out.json', JSON.stringify(out, null, 2));
console.log('→ 写出 quadrant-criteria-probe-v2.out.json');
