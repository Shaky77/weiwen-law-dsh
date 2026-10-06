// same-form-diff-origin-probe-v7.mjs
// 唯稳律 · 「同形异源」探针 v7（**消除期次歧义：显式表格**）
//
// v6 的发现（守真）：
//   换名+正序 **对**，且**主动调用**了 v5 新补的判据：「尽管 P1 第 2 期末余额（99）低于期初（100），
//     也不能用净额未涨来否认注入 —— 体系内同期存在客观损耗，与这笔外部注入同时发生、互相抵扣。」
//   ⚠️ 换名+换位 **又翻**，但翻的原因**不是判据**，而是**材料歧义**：
//     它写「北区 …其第 2 期 +5 入账发生在 **Q 减少之前**」⇒ 它把 Q 序列的第 3 个数读成"第 3 期"
//     ⇒ 判"时间错位、无因果对应" ⇒ 证据被抹掉。
//   ⇒ 根子：v2~v6 的余额都是**一串 13 个数字**（期初 + 第 1~12 期末），**期次没标** ⇒ 极易错位。
//     （此前 B 版也反复使用"时间错位"这一说法 ⇒ 同一根源。）
//
// v7 的改法（**严格单变量：只把数字串换成带期次的显式表格**；A 版判据逐字不动）：
//   表格逐期一行（期初 / 第1期末 / … / 第12期末），三列账户并列 ⇒ 期次**无法误读**。
//
// 先验预测（跑前写下）：
//   H1 若歧义消除后 A 版**正序与换位都判对** ⇒ **稳健性通过** ⇒ 分离成立（仍须标 n=1）。
//   H2 若仍翻 ⇒ 判据**真不稳**（与材料无关）⇒ 结论降级为"有效但不稳健"。
//   H3 B 版应仍全错（同轮对照基线）。
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

const BEI = tbl('北区项目', FLAT, DROP); // 外部型：Q（体系外）第 2 期 -5
const NAN = tbl('南区项目', DROP, FLAT); // 内部型：P2（体系内）第 2 期 -5

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
  则**不是同一类**；"同类"必须由结构一致来确立，不能由表面特征的高相似度推定。**一处结构性差异即足以分开。**
`;

function mBN() { return HEAD + '\n\n' + BEI + '\n\n' + NAN; }
function mNB() { return HEAD + '\n\n' + NAN + '\n\n' + BEI; }

const TASK = (m) => `${m}

【任务】这两个项目（北区、南区），在 12 期内**各自是否真的获得了来自项目体系之外的新增资金**？
请分别给出判断与**依据**（依据须指明来自哪一条记录）。
不要复述材料原文。`;

const results = [];
async function run(tag, withStruct, task) {
  const head = withStruct ? RSTRUCT + '\n' : '';
  const raw = await ask(SYS, head + task, 1600);
  results.push({ tag, withStruct, raw });
  console.log(`\n===== ${tag} =====\n${raw}`);
}

await run('A-v7·表格·正序(北区在前)', true, TASK(mBN()));
await run('A-v7·表格·换位(南区在前)', true, TASK(mNB()));
await run('B-v7·表格·正序(北区在前)', false, TASK(mBN()));

const KEYWORDS = {
  bei_判有外部: /北区[\s\S]{0,800}?(有|是|确实|获得|存在|属于|构成)[\s\S]{0,200}?(体系外|体系之外|外部)[\s\S]{0,150}?(资金|注入|流入|新增)/,
  nan_判无外部: /南区[\s\S]{0,800}?(没有|未|并非|不是|不构成|无|内部)[\s\S]{0,200}?(体系外|外部|新增)/,
  引用损耗抵扣判据: /(损耗|净损)[\s\S]{0,80}(抵扣|同时发生|抵消|无关)/,
};
const summary = results.map(r => {
  const hits = {};
  for (const [k, re] of Object.entries(KEYWORDS)) hits[k] = re.test(r.raw);
  return { tag: r.tag, hits };
});

writeFileSync(new URL('./same-form-diff-origin-probe-v7.out.json', import.meta.url),
  JSON.stringify({ model: MODEL, temperature: TEMPERATURE, at: new Date().toISOString(), note: 'v7: single-variable — numbered table removes period ambiguity; A-criteria verbatim from v5/v6; n=1; keyword hits auxiliary — read raw', results, summary }, null, 2));
console.log('\n== keyword summary (auxiliary only) ==');
for (const s of summary) console.log(s.tag, JSON.stringify(s.hits));
console.log('\n== saved same-form-diff-origin-probe-v7.out.json ==');
