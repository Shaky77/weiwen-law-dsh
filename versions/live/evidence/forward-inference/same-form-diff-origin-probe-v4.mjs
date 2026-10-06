// same-form-diff-origin-probe-v4.mjs
// 唯稳律 · 「同形异源」探针 v4（**观测载体对等版** —— 这一版才是题目本意）
//
// v2/v3 的关键发现（守真 · 第四层自曝，且这次错在**材料**不在判据）：
//   三轮 7 版**没有一版**判对"甲（真外部注入）"；模型一致地判"来源不明 / 不能认定"。
//   回查 → **材料硬伤**：甲只有 A / X 两个账户，X 不动 ⇒ 那笔 +5 在材料里**根本没有"体系外"的观测痕迹**
//     ⇒ 模型判"来源未记录、不能认定"**是完全正确的**。
//   ⇒ 病灶：**我只给了"内部痕迹"（乙的 X 减少），没给"外部痕迹"（甲应有 Y 减少）** ⇒ 两侧观测载体**不对等**
//     ⇒ 题目从一开始就**不可判**（不是模型不行，是我没给证据）。
//
// v4 的改法（严格单变量：**补一个域外账户 Y，让两侧痕迹完全对称**）：
//   【账户体系】主账户 A、全资子公司账户 X（**均在体系内**）、外部合作方账户 Y（**体系外·独立第三方**）。
//     - 甲：第 2 期 **Y 支出 5**（Y: 20→15），X 不变 ⇒ 钱从**体系外**进 A ⇒ **真·外部新增**；
//     - 乙：第 2 期 **X 支出 5**（X: 20→15），Y 不变 ⇒ 钱从**体系内**换位置进 A ⇒ **非外部新增**。
//   ⇒ 两版**都有**"某账户 -5"的痕迹（**痕迹对称**），**不能靠"有没有痕迹"分**；
//     唯一区别是**流出方账户在体系内还是体系外** ⇒ 必须**先判账户性质、再做结构比对**。
//   ⇒ 这才是"同形异源"的本意：**表面全同，差别只在来源链的起点在哪一侧。**
//
// 测前第一问：**兜底格**（主账曲线/摘要/声明全同；痕迹对称；差别在结构语义）。
//
// 先验预测（跑前写下）：
//   H1 两侧痕迹对称 ⇒ 若模型不区分 X/Y 的体系内外属性，会判"两者相同（都是内部划转/都不能认定）"⇒ **分离出现**。
//   H2 A 版（有"看来源路径 + 体系内外"判据 + 材料明示账户性质）⇒ 预期**能**判对甲=有、乙=无。
//   H3 B 版预期会把 X/Y 一视同仁 ⇒ 判"两者相同"或"均不能认定"（甲判错）。
//   H4 正序/换位应一致 ⇒ 不一致则仍是位置/材料混淆问题。
//   H5 若 A/B 仍无分离 ⇒ **这格亦属常识可达** ⇒ 如实交，继续收窄唯稳律判别力边界。
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
    body: JSON.stringify({ model: MODEL, temperature: TEMPERATURE, max_tokens: maxTok, messages: [{ role: 'system', content }, { role: 'user', content: content }] }),
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

// 甲：Y（体系外）第 2 期 -5 ⇒ 外部新增
const JIA = `■ 项目甲
【主账户 A·逐期余额】期初及第 1~12 期末，依次为：${A_SERIES}
（第 2 期有一笔 +5 入账，摘要栏写"新增投入"）
【全资子公司账户 X·逐期余额】期初及第 1~12 期末，依次为：${S_FLAT}
【外部合作方账户 Y·逐期余额】期初及第 1~12 期末，依次为：${S_DROP}
【对外声明】第 3~12 期每期均声明："本期已新增投入 5 万元，资金充足。"`;

// 乙：X（体系内）第 2 期 -5 ⇒ 非外部新增（内部腾挪）
const YI = `■ 项目乙
【主账户 A·逐期余额】期初及第 1~12 期末，依次为：${A_SERIES}
（第 2 期有一笔 +5 入账，摘要栏写"新增投入"）
【全资子公司账户 X·逐期余额】期初及第 1~12 期末，依次为：${S_DROP}
【外部合作方账户 Y·逐期余额】期初及第 1~12 期末，依次为：${S_FLAT}
【对外声明】第 3~12 期每期均声明："本期已新增投入 5 万元，资金充足。"`;

const RSTRUCT = `【分析纪律】（据以分析）
- 判断"是否获得来自**项目体系之外**的新增资金"，只问一件事：**这笔资金的来源路径** ——
  它是从项目体系之外进入的，还是本来就存在于项目体系之内、只是换了个账户位置？
- 🔴 **不要把"余额净变化"当作来源判断**：体系内的客观损耗与注入会**同时发生、互相抵扣**；
  **净额没涨，不等于没有注入；净额涨了，也不等于钱是外面来的。**
  （**损耗是体系内事件，来源是体系边界事件，两者不是同一个问题。**）
- 🔴 **判断"同一类"看来源结构，不看表面像什么**：**表面完全相同**的两份记录，若**来源路径不同**，则**不是同一类**；
  "同类"必须由结构一致来确立，不能由表面特征的高相似度推定。**一处结构性差异即足以分开，不需要多数差异。**
`;

function mAB() { return HEAD + '\n\n' + JIA + '\n\n' + YI; }
function mBA() { return HEAD + '\n\n' + YI + '\n\n' + JIA; }

const TASK = (m) => `${m}

【任务】这两个项目（甲、乙），在 12 期内**各自是否真的获得了来自项目体系之外的新增资金**？
请分别给出判断与**依据**（依据须指明来自哪一条记录）。
不要复述材料原文。`;

const results = [];
async function run(tag, withStruct, task) {
  const head = withStruct ? RSTRUCT + '\n' : '';
  const raw = await ask(SYS, head + task, 1600);
  results.push({ tag, withStruct, raw });
  console.log(`\n===== ${tag} =====\n${raw}`);
}

await run('A-v4·正序', true, TASK(mAB()));
await run('B-v4·正序', false, TASK(mAB()));
await run('A-v4·换位(乙在前)', true, TASK(mBA()));
await run('B-v4·换位(乙在前)', false, TASK(mBA()));

const KEYWORDS = {
  jia_判有外部: /甲[\s\S]{0,700}?(有|是|确实|获得|存在|属于)[\s\S]{0,120}?(体系外|体系之外|外部|第三方|账户\s*Y)/,
  yi_判无外部: /乙[\s\S]{0,700}?(没有|未|并非|不是|不构成|无|视为内部)[\s\S]{0,120}?(体系外|外部|第三方|新增|Y)/,
  yi_识别X流出: /乙[\s\S]{0,800}?X[\s\S]{0,200}?(减少|下降|15|支出|转出|流出)/,
  jia_识别Y流出: /甲[\s\S]{0,800}?Y[\s\S]{0,200}?(减少|下降|15|支出|转出|流出)/,
  是否判两者相同: /(甲|乙)[\s\S]{0,80}(和|与|同)[\s\S]{0,80}(乙|甲)[\s\S]{0,60}(相同|一致|一样|同类|无差别)/,
};
const summary = results.map(r => {
  const hits = {};
  for (const [k, re] of Object.entries(KEYWORDS)) hits[k] = re.test(r.raw);
  return { tag: r.tag, hits };
});

writeFileSync(new URL('./same-form-diff-origin-probe-v4.out.json', import.meta.url),
  JSON.stringify({ model: MODEL, temperature: TEMPERATURE, at: new Date().toISOString(), note: 'v4: symmetric traces + in/out-of-system account property stated; n=1; keyword hits auxiliary — read raw', results, summary }, null, 2));
console.log('\n== keyword summary (auxiliary only) ==');
for (const s of summary) console.log(s.tag, JSON.stringify(s.hits));
console.log('\n== saved same-form-diff-origin-probe-v4.out.json ==');
