// same-form-diff-origin-probe-v3.mjs
// 唯稳律 · 「同形异源」探针 v3（**单变量：只改 A 版判据**）
//
// v2 读数的关键发现（守真）：
//   ① **甲格四版全错** —— A/B、正序/换位，**没有任何一版**判出"甲的 +5 来自体系外"；
//      它们**一致地**用"第 1 期末 97 → 第 2 期末 99，只涨 2"来否决"存在 5 的外部新增。
//   ② **A 版自相矛盾** —— A-正序说乙"有外部资金"、A-换位说乙"没有"（同题换序即翻），
//      而 B 版两版一致。
//   ⇒ 根因定位（**我自己的错，不是模型的**）：v2 的 A 版纪律里我写了
//        「看它**最终净额是否真的增加了**」
//      —— 这**正是拟合口径**（读结果面/数量）⇒ **判据里混进了我本来要对照的那个读法**，
//      于是 A 版被自己的判据引向了"看净额"，自然与 B 版同错。
//
// v3 的改法（**严格单变量**：材料逐字不动，B 版逐字不动，只换 A 版一句判据）：
//   删：「最终净额是否真的增加了」
//   增：「**不要把"余额净变化"当作来源判断** —— 损耗是体系内事件，来源是体系边界事件；
//        净额没涨 ≠ 没注入；净额涨了 ≠ 钱从外面来。」
//   ⇒ 这一句就是安 02:2x 说的"**逻辑是反的**"的判据形态：
//      **拟合读法从"结果面/数量"下判；因果读法从"来源面/结构"下判。**
//
// 测前第一问：仍**兜底格**（表面全同，差别只在账户间对应关系）。
//
// 先验预测（跑前写下）：
//   H1 若 A-v3 能把"来源"与"净额"分开 ⇒ 甲判"有外部注入"、乙判"无" ⇒ **真分离出现**，
//      且已定位到**具体是哪一条判据在起作用**（增量可指名）。
//   H2 若 A-v3 仍判甲"无" ⇒ 说明这不是"判据缺失"，而是**模型层面的读法锁定**（更硬的盲区）⇒ 如实交。
//   H3 B 版复跑应保持 v2 的原样子（判两者都"没有/不能认定"）⇒ 用作同轮对照基线。
//   H4 A-v3 正序/换位应**一致** ⇒ 不一致则说明 A 版判据仍不构成"结构"（换序即翻＝表面特征在起作用）。
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
    body: JSON.stringify({ model: MODEL, temperature: TEMPERATURE, max_tokens: maxTok, messages: [{ role: 'system', content: system }, { role: 'user', content }] }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return (j.choices?.[0]?.message?.content || '').trim();
}

const SYS = '你是财务记录分析助手。只依据给定的记录作答。';

const A_SERIES = '100, 97, 99, 96, 93, 90, 87, 84, 81, 78, 75, 72, 69';
const X_JIA = '20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20';
const X_YI = '20, 20, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15';

const JIA = `■ 项目甲
【主账户 A·逐期余额】期初及第 1~12 期末，依次为：${A_SERIES}
（第 2 期有一笔 +5 入账，摘要栏写"新增投入"）
【关联账户 X·逐期余额】期初及第 1~12 期末，依次为：${X_JIA}
【对外声明】第 3~12 期每期均声明："本期已新增投入 5 万元，资金充足。"`;

const YI = `■ 项目乙
【主账户 A·逐期余额】期初及第 1~12 期末，依次为：${A_SERIES}
（第 2 期有一笔 +5 入账，摘要栏写"新增投入"）
【关联账户 X·逐期余额】期初及第 1~12 期末，依次为：${X_YI}
【对外声明】第 3~12 期每期均声明："本期已新增投入 5 万元，资金充足。"`;

// ✅ v3 修正后的 A 版纪律（单变量：只换这一句口径）
const RSTRUCT_V3 = `【分析纪律】（据以分析）
- 判断"是否获得来自**体系之外**的新增资金"，只问一件事：**这笔资金的来源路径** ——
  它是从该体系之外进入的，还是本来就存在于体系之内、只是换了个账户位置？
- 🔴 **不要把"余额净变化"当作来源判断**：体系内的客观损耗与注入会**同时发生、互相抵扣**；
  **净额没涨，不等于没有注入；净额涨了，也不等于钱是外面来的。**
  （**损耗是体系内事件，来源是体系边界事件，两者不是同一个问题。**）
- 判断"是否同一类"看**来源结构**，不看**表面像什么**（金额大小、曲线形状、摘要栏文字是否相似）。
  **表面完全相同**的两份记录，若**来源路径不同**，则**不是同一类**。
- 一处结构性差异即足以分开，不需要多数差异。
`;

function mAB() { return JIA + '\n\n' + YI; }
function mBA() { return YI + '\n\n' + JIA; }

const TASK = (m) => `${m}

【任务】这两个项目（甲、乙），在 12 期内**各自是否真的获得了来自项目体系之外的新增资金**？
请分别给出判断与**依据**（依据须指明来自哪一条记录）。
不要复述材料原文。`;

const results = [];
async function run(tag, withStruct, task) {
  const head = withStruct ? RSTRUCT_V3 + '\n' : '';
  const raw = await ask(SYS, head + task, 1500);
  results.push({ tag, withStruct, raw });
  console.log(`\n===== ${tag} =====\n${raw}`);
}

await run('A-v3·正序', true, TASK(mAB()));
await run('A-v3·换位(乙在前)', true, TASK(mBA()));
await run('B·正序(同轮对照)', false, TASK(mAB()));

const KEYWORDS = {
  jia_判外部注入: /甲[\s\S]{0,500}?(有|是|确实|获得|存在)[\s\S]{0,100}?(来自|源自)?[\s\S]{0,60}(体系外|体系之外|外部|账户外|净流入)/,
  yi_判非外部: /乙[\s\S]{0,600}?(没有|未|并非|不是|不构成|无)[\s\S]{0,100}?(体系外|外部|新增)/,
  yi_识别X对应: /乙[\s\S]{0,600}?(X|关联账户)[\s\S]{0,200}?(15|减少|下降|少了|转出|同一笔)/,
  分开净额与来源: /(净额|余额).{0,40}(不等于|不能|无关|另一|不代表|两回事|分开)/,
};
const summary = results.map(r => {
  const hits = {};
  for (const [k, re] of Object.entries(KEYWORDS)) hits[k] = re.test(r.raw);
  return { tag: r.tag, hits };
});

writeFileSync(new URL('./same-form-diff-origin-probe-v3.out.json', import.meta.url),
  JSON.stringify({ model: MODEL, temperature: TEMPERATURE, at: new Date().toISOString(), note: 'v3: single-variable — only A-side criterion replaced; n=1; keyword hits auxiliary — read raw', results, summary }, null, 2));
console.log('\n== keyword summary (auxiliary only) ==');
for (const s of summary) console.log(s.tag, JSON.stringify(s.hits));
console.log('\n== saved same-form-diff-origin-probe-v3.out.json ==');
