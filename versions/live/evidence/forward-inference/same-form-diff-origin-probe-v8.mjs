// same-form-diff-origin-probe-v8.mjs
// 唯稳律 · 「同形异源」探针 v8（**拆开单问：定位顺序偏差的来源**）
//
// v7 的干净读数（守真）：
//   | 版本 | 正序 | 换位 |
//   | A（有结构） | **3/3 全对** | **3/3 全反** |
//   | B（无结构） | **6/6 全错**（一律判"两者皆无"） | — |
//   ⇒ 分离方向成立（A-正序 vs B）；但 A 版有**系统性顺序偏差**（换序即翻，3/3 稳定 ⇒ 结构性偏差，非随机噪声）。
//   ⇒ 换位版自曝矛盾：先把南区第 2 期**判对**（"P2 减 5 与 P1 增 5 对应 ⇒ 体系内转移"），
//     结尾也**说对**了关键结构差异，**结论却整个反** —— 它的最终判定被"第 3~12 期的声明 + 净损"覆盖了。
//
// v8 的问题：**顺序偏差来自"并列对比"的锚定，还是判据本身不行？**
//   测法（**唯一变量：把并列两份拆成单份独立问**；材料与 A 版判据逐字不动）：
//     - A-单问·北区（外部型）／A-单问·南区（内部型）；
//     - B-单问·北区／B-单问·南区（对照）。
//   ⇒ 若单问全部判对 ⇒ 判据本身成立，**偏差来自"并列对比时的锚定"**（结构性发现）；
//     若单问仍错 ⇒ 判据本身不行（结论降级）。
//
// 先验预测（跑前写下）：
//   H1 A-单问两份**都判对** ⇒ 偏差＝并列锚定（非判据缺陷）。
//   H2 若 A-单问北区错 ⇒ 判据在"外部型"上失败（更严重）。
//   H3 B-单问应仍判"没有"（含北区）⇒ 同轮对照基线。
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';

const KEY = process.env.DEEPSEEK_API_KEY || (() => {
  try { return readFileSync(`${homedir()}/.workbuddy/deepseek_api_key.txt`, 'utf-8').trim(); } catch { return ''; }
})();
if (!KEY) { console.error('x no key'); process.exit(1); }
const MODEL = 'deepseek-chat', TEMPERATURE = 0;

async function ask(system, content, maxTok) {
  const r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, temperature: TEMPERATURE, max_tokens: maxTok, messages: [{ role: 'system', content }, { role: 'user', content }] }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return (j.choices?.[0]?.message?.content || '').trim();
}

const SYS = '你是财务记录分析助手。只依据给定的记录作答。';

const HEAD = `【账户体系说明】本项目所含账户为：
- 运营主账户 P1（项目主体账户）
- 全资子公司账户 P2（**属于本项目体系之内**）
- 外部合作方账户 Q（**不属于本项目体系，为独立第三方**）`;

const P1 = [100, 97, 99, 96, 93, 90, 87, 84, 81, 78, 75, 72, 69];
const FLAT = [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20];
const DROP = [20, 20, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15];
const LB = ['期初', '第1期末', '第2期末', '第3期末', '第4期末', '第5期末', '第6期末', '第7期末', '第8期末', '第9期末', '第10期末', '第11期末', '第12期末'];

function tbl(name, p2, q) {
  const rows = ['期次 | P1（运营主账户） | P2（全资子公司·体系内） | Q（外部合作方·体系外）', '--- | --- | --- | ---'];
  for (let i = 0; i < 13; i++) {
    const note = (i === 2) ? ' ← 第 2 期 P1 有一笔 +5 入账（摘要栏写"新增投入"）' : '';
    rows.push(`${LB[i]} | ${P1[i]} | ${p2[i]} | ${q[i]}${note}`);
  }
  return `■ ${name}（单位：万元）\n${rows.join('\n')}\n【对外声明】第 3~12 期每期均声明："本期已新增投入 5 万元，资金充足。"`;
}

const BEI = tbl('北区项目', FLAT, DROP); // 外部型
const NAN = tbl('南区项目', DROP, FLAT); // 内部型

const RSTRUCT = `【分析纪律】（据以分析）
- 判断"是否获得来自**项目体系之外**的新增资金"，只问一件事：**这笔资金的来源路径** ——
  它是从项目体系之外进入的，还是本来就存在于项目体系之内、只是换了个账户位置？
- 🔴 **体系边界是"给定的结构事实"，不是可以自行调整的尺度。** 【账户体系说明】已明示哪些账户在体系之内、
  哪些在体系之外；判定时**以该说明为准，不得把边界向外扩展** ——
  既不得把"体系外账户 → 体系内账户"的转移称为"体系内位置变化"，
  也不得以"外部账户的钱也可能来自更外面"为由否认其为外部资金。**边界一次给定，不随后续讨论移动。**
- 🔴 **不要把"余额净变化"当作来源判断**：体系内的客观损耗与注入会**同时发生、互相抵扣**；
  **净额没涨，不等于没有注入；净额涨了，也不等于钱是外面来的。**
- 🔴 **判断"是否同一类"看来源结构，不看表面像什么**：**表面完全相同**的两份记录，若**来源路径的起点分处体系内外**，
  则**不是同一类**。"同类"必须由结构一致来确立，不能由表面特征的高相似度推定。**一处结构性差异即足以分开。**
`;

const TASK_ONE = (m) => `${HEAD}

${m}

【任务】该项目在 12 期内**是否真的获得了来自项目体系之外的新增资金**？
请给出判断与**依据**（依据须指明来自哪一条记录）。不要复述材料原文。`;

const results = [];
async function run(tag, withStruct, task) {
  const head = withStruct ? RSTRUCT + '\n' : '';
  const raw = await ask(SYS, head + task, 1600);
  results.push({ tag, withStruct, raw });
  console.log(`\n===== ${tag} =====\n${raw}`);
}

await run('A-v8·单问北区(外部型)', true, TASK_ONE(BEI));
await run('A-v8·单问南区(内部型)', true, TASK_ONE(NAN));
await run('B-v8·单问北区(外部型)', false, TASK_ONE(BEI));
await run('B-v8·单问南区(内部型)', false, TASK_ONE(NAN));

const KEYWORDS = {
  判有外部: /(是|确实|存在|构成)[\s\S]{0,120}?(获得|有)[\s\S]{0,120}?(体系外|体系之外|外部)[\s\S]{0,100}?(资金|注入|流入|新增)/,
  判无外部: /(没有|未|并非|不是|不构成|无)[\s\S]{0,120}?(真正|真实)?[\s\S]{0,60}?(获得)?[\s\S]{0,120}?(体系外|外部)[\s\S]{0,80}?(新增|注入|流入)/,
  判体系内转移: /(P2|全资子公司)[\s\S]{0,160}?(体系内|内部)[\s\S]{0,120}?(转移|划转|调拨|位置)/,
  判Q跨边界进入: /(Q|外部合作方)[\s\S]{0,160}?(体系外|体系之外|外部)[\s\S]{0,120}?(进入|流入|转入|跨边界)/,
};
const summary = results.map(r => {
  const hits = {};
  for (const [k, re] of Object.entries(KEYWORDS)) hits[k] = re.test(r.raw);
  return { tag: r.tag, hits };
});

writeFileSync(new URL('./same-form-diff-origin-probe-v8.out.json', import.meta.url),
  JSON.stringify({ model: MODEL, temperature: TEMPERATURE, at: new Date().toISOString(), note: 'v8: single-item independent questioning (no side-by-side); criteria verbatim; n=1; keyword hits auxiliary — read raw', results, summary }, null, 2));
console.log('\n== keyword summary (auxiliary only) ==');
for (const s of summary) console.log(s.tag, JSON.stringify(s.hits));
console.log('\n== saved same-form-diff-origin-probe-v8.out.json ==');
