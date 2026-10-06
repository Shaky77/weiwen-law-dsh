// same-form-diff-origin-probe-v6.mjs
// 唯稳律 · 「同形异源」探针 v6（**稳健性检验：换名 + 换序**）
//
// v5 结果（关键一次）：
//   A-v5·正序 **全对**（九版里第一个）：判甲"有外部"、乙"没有"，理由层指名
//     「甲对应体系外 Y 的减少、乙对应体系内 X 的减少 ⇒ 起点分处体系内外 ⇒ 不是同一类」。
//   B-v5 **全错**（仍判两者都"没有"）。
//   ⚠️ 但 A-v5·换位 **整个翻了**：判乙"有"、甲"没有"，且推理自相矛盾
//      （说"这笔钱从体系外的 Y 进入体系内"，结论却是"不是外部投入"）。
//   ⇒ 方向对了，**稳健性没过** —— 判据可能只是"顺着材料顺序凑对"，而非真抓结构。
//
// v6 的测法（**换掉所有表面标签 + 换序**；A 版判据逐字不动，材料结构逐字不动）：
//   - 项目名：甲/乙 → **北区项目 / 南区项目**；
//   - 账户名：A/X/Y → **P1（主体）/ P2（全资子公司·体系内）/ Q（外部合作方·体系外）**；
//   - 数据、曲线、摘要、声明全部不变（外部型 / 内部型 两份，互换位置各跑一次）。
//   ⇒ 若换名换序后 A 版仍判对 ⇒ 判据在**结构层**起作用（对表面标签不敏感）；
//     若仍翻 ⇒ 判据**未内化**，只是在表面标签上凑 ⇒ 如实降级。
//
// 先验预测（跑前写下）：
//   H1 若 A 版（换名·正序）判"北区=有外部 / 南区=无" ⇒ 判据具备结构稳健性候选。
//   H2 若 A 版（换名·换位）亦判对 ⇒ **稳健性通过**（分离成立，仍需记 n=1）。
//   H3 若任一序翻 ⇒ 判据**有效但不稳健**（结论降级为"待多次取分布"）。
//   H4 B 版应仍全错（同轮对照基线）。
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

const P1_SERIES = '100, 97, 99, 96, 93, 90, 87, 84, 81, 78, 75, 72, 69';
const S_FLAT = '20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20';
const S_DROP = '20, 20, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15';

// 北区 = 外部型（Q 动）；南区 = 内部型（P2 动）
const BEI = `■ 北区项目
【运营主账户 P1·逐期余额】期初及第 1~12 期末，依次为：${P1_SERIES}
（第 2 期有一笔 +5 入账，摘要栏写"新增投入"）
【全资子公司账户 P2·逐期余额】期初及第 1~12 期末，依次为：${S_FLAT}
【外部合作方账户 Q·逐期余额】期初及第 1~12 期末，依次为：${S_DROP}
【对外声明】第 3~12 期每期均声明："本期已新增投入 5 万元，资金充足。"`;

const NAN = `■ 南区项目
【运营主账户 P1·逐期余额】期初及第 1~12 期末，依次为：${P1_SERIES}
（第 2 期有一笔 +5 入账，摘要栏写"新增投入"）
【全资子公司账户 P2·逐期余额】期初及第 1~12 期末，依次为：${S_DROP}
【外部合作方账户 Q·逐期余额】期初及第 1~12 期末，依次为：${S_FLAT}
【对外声明】第 3~12 期每期均声明："本期已新增投入 5 万元，资金充足。"`;

// A 版判据：与 v5 **逐字相同**（单变量：只动材料标签与顺序）
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

await run('A-v6·换名·正序(北区在前)', true, TASK(mBN()));
await run('A-v6·换名·换位(南区在前)', true, TASK(mNB()));
await run('B-v6·换名·正序(北区在前)', false, TASK(mBN()));

const KEYWORDS = {
  bei_判有外部: /北区[\s\S]{0,700}?(有|是|确实|获得|存在|属于|构成)[\s\S]{0,180}?(体系外|体系之外|外部)[\s\S]{0,120}?(资金|注入|流入|新增)/,
  nan_判无外部: /南区[\s\S]{0,700}?(没有|未|并非|不是|不构成|无|内部)[\s\S]{0,180}?(体系外|外部|新增)/,
  提及Q在体系外: /Q[\s\S]{0,120}?(体系外|体系之外|外部|第三方)/,
};
const summary = results.map(r => {
  const hits = {};
  for (const [k, re] of Object.entries(KEYWORDS)) hits[k] = re.test(r.raw);
  return { tag: r.tag, hits };
});

writeFileSync(new URL('./same-form-diff-origin-probe-v6.out.json', import.meta.url),
  JSON.stringify({ model: MODEL, temperature: TEMPERATURE, at: new Date().toISOString(), note: 'v6: robustness — renamed labels + swapped order; A-criteria verbatim from v5; n=1; keyword hits auxiliary — read raw', results, summary }, null, 2));
console.log('\n== keyword summary (auxiliary only) ==');
for (const s of summary) console.log(s.tag, JSON.stringify(s.hits));
console.log('\n== saved same-form-diff-origin-probe-v6.out.json ==');
