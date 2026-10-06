// same-form-diff-origin-probe-v5.mjs
// 唯稳律 · 「同形异源」探针 v5（**决定性单变量：给 A 版补「边界给定·不得外扩」**）
//
// v4 的关键发现（本轮最重读数 · 守真）：
//   四版仍**全判"甲没有外部资金"**，但错法变了，且四个变体**同一个动作**：
//     A-正序：「Y 不属于体系…**如果甲真从体系外获得资金，Y 不应出现这种减少**」⇒ 把"界外钱进来"读成"内部位置变化"
//     B-正序：「A 增的 5 与 Y 第 3 期减的 5 **时间错位**」⇒ 用错位解读抹掉
//     B-换位：「该笔资金来自 **Y 的原有余额转入**，不是 **Y 之外**的新增」
//     A-换位：「这是**体系内主体与外部合作方之间**的账户位置变化」
//   ⇒ 🔴 **模型把"体系"的边界往外挪** —— 只要还能再往外一层，就永远能说"这也不算新增"
//     ⇒ **这正是"无限枚举"在语义层的形态**（安：推演死穴＝无限枚举；未来未知＝X 轴枚举属性）。
//   ⇒ 而按框架：**体系边界属 R（恒定项）—— 它是给定的结构事实，不是可滑动尺度**。
//     ⇒ 模型把**本该恒定的 R 当成了可变量**（与安 10-05 02:0x 补的「R 恒定 / SDHM 变量」正面对撞）。
//
// v5 的改法（**严格单变量**：材料逐字不动、B 版逐字不动，只在 A 版纪律里补一条）：
//   补：「**体系边界是给定的结构事实，不是可以自行调整的尺度**……判定时以说明为准，**不得把边界向外扩展**」
//   ⇒ 这一条测的正是：**模型能不能把"边界"当常量用**（R 恒定），而不是当可变量滑。
//
// ⚠️ 诚实预告（防事后美化）：本条 A 版判据**偏强**（已接近点破）⇒ **即使分离出现，也须打折**：
//    只能说"**这条判据**有效"，**不能**据此宣称"结构威力大 / 唯稳律全面胜出"。
//
// 先验预测（跑前写下）：
//   H1 若 A-v5 判出「甲有 / 乙无」且正序换位一致 ⇒ **首次真分离** ⇒ 增量**可指名**＝「边界恒定」这一条。
//   H2 若 A-v5 仍判甲"无" ⇒ 边界滑动不是判据缺失，是更深的层面 ⇒ 如实交（并记：这一格在模型上不可判）。
//   H3 B 版应保持 v4 原样（判两者都"没有"）⇒ 同轮对照基线。
//   H4 A-v5 正序/换位应一致 ⇒ 不一致＝仍在滑边界。
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
- 主账户 A（项目主体账户）
- 全资子公司账户 X（**属于本项目体系之内**）
- 外部合作方账户 Y（**不属于本项目体系，为独立第三方**）`;

const A_SERIES = '100, 97, 99, 96, 93, 90, 87, 84, 81, 78, 75, 72, 69';
const S_FLAT = '20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20';
const S_DROP = '20, 20, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15';

const JIA = `■ 项目甲
【主账户 A·逐期余额】期初及第 1~12 期末，依次为：${A_SERIES}
（第 2 期有一笔 +5 入账，摘要栏写"新增投入"）
【全资子公司账户 X·逐期余额】期初及第 1~12 期末，依次为：${S_FLAT}
【外部合作方账户 Y·逐期余额】期初及第 1~12 期末，依次为：${S_DROP}
【对外声明】第 3~12 期每期均声明："本期已新增投入 5 万元，资金充足。"`;

const YI = `■ 项目乙
【主账户 A·逐期余额】期初及第 1~12 期末，依次为：${A_SERIES}
（第 2 期有一笔 +5 入账，摘要栏写"新增投入"）
【全资子公司账户 X·逐期余额】期初及第 1~12 期末，依次为：${S_DROP}
【外部合作方账户 Y·逐期余额】期初及第 1~12 期末，依次为：${S_FLAT}
【对外声明】第 3~12 期每期均声明："本期已新增投入 5 万元，资金充足。"`;

// ✅ v5：在 v4 基础上**只补一条**（边界恒定）
const RSTRUCT_V5 = `【分析纪律】（据以分析）
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

function mAB() { return HEAD + '\n\n' + JIA + '\n\n' + YI; }
function mBA() { return HEAD + '\n\n' + YI + '\n\n' + JIA; }

const TASK = (m) => `${m}

【任务】这两个项目（甲、乙），在 12 期内**各自是否真的获得了来自项目体系之外的新增资金**？
请分别给出判断与**依据**（依据须指明来自哪一条记录）。
不要复述材料原文。`;

const results = [];
async function run(tag, withStruct, task) {
  const head = withStruct ? RSTRUCT_V5 + '\n' : '';
  const raw = await ask(SYS, head + task, 1600);
  results.push({ tag, withStruct, raw });
  console.log(`\n===== ${tag} =====\n${raw}`);
}

await run('A-v5·正序', true, TASK(mAB()));
await run('A-v5·换位(乙在前)', true, TASK(mBA()));
await run('B·正序(同轮对照)', false, TASK(mAB()));

const KEYWORDS = {
  jia_判有外部: /甲[\s\S]{0,700}?(有|是|确实|获得|存在|属于|构成)[\s\S]{0,150}?(体系外|体系之外|外部)[\s\S]{0,100}?(资金|注入|流入|新增)/,
  yi_判无外部: /乙[\s\S]{0,700}?(没有|未|并非|不是|不构成|无|内部)[\s\S]{0,150}?(体系外|外部|新增)/,
  边界外扩迹象: /(更外面|再往外|Y 之外|Y 的原有|仍然.*可能来自|不能.*否认.*更外)/,
};
const summary = results.map(r => {
  const hits = {};
  for (const [k, re] of Object.entries(KEYWORDS)) hits[k] = re.test(r.raw);
  return { tag: r.tag, hits };
});

writeFileSync(new URL('./same-form-diff-origin-probe-v5.out.json', import.meta.url),
  JSON.stringify({ model: MODEL, temperature: TEMPERATURE, at: new Date().toISOString(), note: 'v5: single-variable — only A-side added "boundary given / no outward extension"; n=1; keyword hits auxiliary — read raw', results, summary }, null, 2));
console.log('\n== keyword summary (auxiliary only) ==');
for (const s of summary) console.log(s.tag, JSON.stringify(s.hits));
console.log('\n== saved same-form-diff-origin-probe-v5.out.json ==');
