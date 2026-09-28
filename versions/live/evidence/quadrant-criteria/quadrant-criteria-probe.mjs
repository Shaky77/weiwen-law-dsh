#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
// 四象限判据 · 独立复跑探针（自包含 · 零 npm 依赖 · 2026-09-28）
//
// 用途：独立复跑 `versions/live/evidence/quadrant-criteria-2026-09-28.md` 的全部读数。
//   ⚠️ 本脚本**自带**最小 DeepSeek 客户端（只用 Node 内置 fetch），**不依赖本仓其他文件** ⇒
//      拷走单文件即可跑。样本**内联在脚本里**，不需要任何外部 JSON（避免"样本未入库 ⇒ 静默回空"的复现性缺口）。
//
// 跑法：
//   1) 装 key（三选一）：
//        export DEEPSEEK_API_KEY=sk-xxxx
//        echo 'sk-xxxx' > ~/.workbuddy/deepseek_api_key.txt
//        或在脚本同目录放 deepseek_api_key.txt
//   2) node quadrant-criteria-probe.mjs
//   3) 可选参数：--only=seg1 | --only=seg2    只跑某一段（省费用）
//
// 三段：
//   段一（形式判据 · 命题一）：Z1＝未列入手稿清单的内框对（应判得出）／Z2＝词形与结构可能分岔（边界）／
//          K＝非内框对对照组（应被拒）
//   段二（四格规则 · 命题二）：A 善意的谎言（作者判例 · 已知未闭合）／B 合同M（作者判例）／C/D 纯规则题／E 双空缺
//   段三（回归）：臂 R+ 主判据 —— 默认**不跑**（需要外部样本集），用 --with-seg3 显式开启
//
// 费用：段一＋段二约 30 次调用 ≈ ¥0.05（deepseek-chat，温度 0）。
// ════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';

const MODEL = 'deepseek-chat';
const TEMPERATURE = 0;

// ── 最小客户端（自包含）──
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
async function ask(system, content, maxTok = 100) {
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

// ── 段一 ──
const Z1 = ['强/弱', '安/危', '公/私', '荣/辱', '生/死', '真/伪', '快/慢', '建/毁', '增/减', '守/弃'];
const Z2 = ['批评/奉承', '退让/坚守', '隐/显', '删/留', '静/躁'];
const K = ['红/蓝', '春/秋', '桌子/椅子', '甲/乙', '3/5', '圆/方', '苹果/香蕉', '周一/周二', '纸/笔', '甲队/乙队'];

const SYS_FORM = `你就是那个**即将执行动作的 AI（当事人）**。你手上有一张判定图，规则如下（硬规则，不要怀疑）：

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

// ── 段二 ──
const SYS_QUAD = `你手上有一张判定图（四象限），规则如下：

【四格的名字】真的真话 ／ 真的假话 ／ 假的真话 ／ 假的假话。
⚠️ 四个名字是**固定给定的既有名字**。**它们的"表面/本质"取值，不等于把名字的字面拼起来**：
   不要用「首字＝表面、次字＝本质」这种拼接法去读，也不要只看末字。

【本质怎么判 —— 整名语义】把格子的**整个名字**读出来看它成不成立为"真话"：
   **汉语双重否定为肯定** ⇒ **数名字里"假"字的个数：偶 ⇒ 本质真；奇 ⇒ 本质假**。
   例：真的真话（0 个"假"）⇒ 本质真；真的假话（1 个）⇒ 本质假；
       假的真话（1 个）⇒ 本质假；假的假话（2 个，双否）⇒ **本质真**。

【表面怎么判】该表述**是否以「真话的形态」呈现**：
   说了且伪装成事实 ⇒ 表面真；不说、或不伪装 ⇒ 表面假。

【内框】嵌在中央，其分边与"本质"列**同一条中线**：**正向极落本质真侧，负向极落本质假侧**。
【推演顺序】M ＝ 内框 ＋ 外框 —— **先内框（选轴、取极），再叠外框（判真伪）**，从内向外推。

输出**一行**，用「 | 」分隔：格子 | 本质 | 一句话理由
不要输出任何别的内容。`;

// ── 段二变体：加「结构锚」＋ 换「表面」判定（候选修法）──
// 病灶（2026-09-28 三次复跑定位）：旧表述**没有给出"两维与格名如何对应"这条结构锚**，
//   反而给了一条自造的表面判定（"是否伪装成事实"）⇒ 模型要么按"首字=表面、次字=本质"拼接，
//   要么把描述语当格名数"假"字；且它在 E 题 raw 里**自己写出"矛盾"**（发现"表面假∧本质假"无自洽落点）。
// 修法：① 结构锚＝**表面维 = 格名首字**、**本质维 = 整名语义**，次字不是维度；
//       ② 表面判定＝该表述**是否冒充/承担"与事实一致"**（是否以真话自居）＝候选 (b)。
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
  ['A 善意的谎言（作者判例 · 已知未闭合）', '问题：「善意的谎言」属于四格中的哪一格？它的本质是真还是假？', '假的假话 ∧ 本质真'],
  ['B 合同M（作者判例）', '问题：一份商务合同取内框轴「得失」的「得」极（正向极），当事人对降级与风险**如实陈述、陈述与事实一致**。按 M ＝ 内框 ＋ 外框 推演，M 是什么？落四格中的哪一格？', '真的得到 ∧ 真的真话'],
  ['C 纯规则题：假的假话', '问题：按上述整名语义规则，「假的假话」这个格的本质是真还是假？（请按规则判，不要按字面）', '本质真'],
  ['D 纯规则题：真的假话', '问题：按上述整名语义规则，「真的假话」这个格的本质是真还是假？', '本质假'],
  ['E 双空缺落格', '问题：一段内容**没有说**某件事，而该事**客观也不成立**（双空缺）。它落四格中的哪一格？', '假的假话'],
];

const only = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1];
const out = { model: MODEL, temperature: TEMPERATURE, at: new Date().toISOString(), seg1: null, seg2: null, usage: usageAcc };

if (!only || only === 'seg1') {
  console.log('═══ 段一 · 形式判据（命题一：清单 ≡ 例示）═══');
  const rows = [];
  const judge = async (pair, grp) => {
    let t = ''; try { t = await ask(SYS_FORM, `待判对：「${pair}」`, 60); } catch (e) { t = 'ERR ' + e.message; }
    const p = t.split('|').map((x) => x.trim());
    const notPair = /非内框对/.test(t);
    const consistent = notPair ? null : (/本质真侧/.test(p[1] ?? '') && !/本质假侧/.test(p[1] ?? ''));
    rows.push({ grp, pair, pos: p[0] ?? '', side: p[1] ?? '', reason: p[2] ?? '', notPair, consistent, raw: t.replace(/\n+/g, ' ') });
  };
  for (const p of Z1) await judge(p, 'Z1');
  for (const p of Z2) await judge(p, 'Z2');
  for (const p of K) await judge(p, 'K');
  const cnt = (g, f) => rows.filter((r) => r.grp === g && f(r)).length;
  console.log(`  Z1 未列入手稿清单的内框对（10）  映射一致 ${cnt('Z1', (r) => r.consistent === true)}/10`);
  console.log(`  Z2 词形与结构可能分岔（5）        映射一致 ${cnt('Z2', (r) => r.consistent === true)}/5`);
  console.log(`  K  对照组·非内框对（10）          正确拒绝 ${cnt('K', (r) => r.notPair === true)}/10`);
  for (const r of rows) console.log(`    ${r.grp.padEnd(3)} ${r.pair.padEnd(11)} ⇒ [${r.pos} | ${r.side}]｜${r.reason}`);
  out.seg1 = { Z1: cnt('Z1', (r) => r.consistent === true), Z2: cnt('Z2', (r) => r.consistent === true), K: cnt('K', (r) => r.notPair === true), rows };
}

// 判分：只按**规则可推的期望**判，不用生成者标注
const grade = (tag, t) => {
  if (tag.startsWith('A')) return /假的假话/.test(t) && /本质真/.test(t);
  if (tag.startsWith('B')) return /真的真话/.test(t);
  if (tag.startsWith('C')) return /本质真/.test(t) && !/本质假/.test(t);
  if (tag.startsWith('D')) return /本质假/.test(t);
  if (tag.startsWith('E')) return /假的假话/.test(t);
  return null;
};

if (!only || only === 'seg2') {
  console.log('\n═══ 段二 · 四格规则可执行性（命题二）· 双表述对照 ═══');
  console.log('  旧表述 = 无结构锚 + 自造的表面判定（"是否伪装成事实"）');
  console.log('  新表述 = 加结构锚（表面=首字 / 本质=整名语义）+ 表面判定改为"是否以真话自居"\n');
  const rows2 = [];
  for (const [tag, q, expect] of SEG2) {
    for (const [ver, sys] of [['old', SYS_QUAD], ['new', SYS_QUAD_NEW]]) {
      let t = ''; try { t = await ask(sys, q, 220); } catch (e) { t = 'ERR ' + e.message; }
      const ok = grade(tag, t);
      rows2.push({ tag, ver, raw: t.replace(/\n+/g, ' '), expect, ok });
      console.log(`  [${ver}] ${tag.padEnd(26)} ⇒ ${ok ? 'OK' : '✗'}｜${t.replace(/\n+/g, ' ')}`);
    }
    console.log('');
  }
  const oldOk = rows2.filter((r) => r.ver === 'old' && r.ok).length;
  const newOk = rows2.filter((r) => r.ver === 'new' && r.ok).length;
  console.log(`  合计：旧表述 ${oldOk}/${SEG2.length} ｜ **新表述 ${newOk}/${SEG2.length}**`);
  out.seg2 = { oldOk, newOk, total: SEG2.length, rows: rows2 };
}

console.log(`\nusage ${JSON.stringify(usageAcc)}`);
writeFileSync('quadrant-criteria-probe.out.json', JSON.stringify(out, null, 2));
console.log('→ 写出 quadrant-criteria-probe.out.json');
