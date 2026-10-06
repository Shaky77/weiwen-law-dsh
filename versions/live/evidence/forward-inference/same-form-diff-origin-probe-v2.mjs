// same-form-diff-origin-probe-v2.mjs
// 唯稳律 · 「同形异源」探针 v2（**去掉来源字段 · 线索埋进余额时间序列**）
//
// 为什么 v1 的读数无效（守真 · 第三次同型自曝）：
//   v1 三版读数 **A/B 无分离，且 B 全对** —— 但**不是"常识可达"的证据**，因为：
//     v1 把答案写在了「来源」字段的**字面值**上 --
//       `来源：主账户（同日由主账户转出）` 这行字**直接等于**"这是环流" ⇒ **读一行字即可判**，
//       根本不需要走来源链推理 ⇒ 题目表面落在兜底格，**实际退化成阅读题**。
//   ⇒ 三层同型缺陷的第三层：
//       ① v1(上一轮)：答案**印在提示里**（"声明不能作为证据"）；
//       ② v2(上一轮)：答案**写在栏名里**（"额外投入"）；
//       ③ v1(本轮)：答案**写在字段值里**（"来源：主账户"）。
//   ⇒ 共同病灶：**判据没埋进行为，而是贴在标签上**。
//
// v2 的改法：
//   - **删除「来源」字段**；
//   - 只给**两个账户（主账户 A / 关联账户 X）的逐期余额时间序列**；
//   - 甲/乙的**主账户 A 曲线逐字完全相同**（100,97,99,96,...,69）；摘要栏**都**写"新增投入"；
//   - 唯一差别在 X 账户：
//       甲：X 全程 20（那笔 +5 **无内部对应** ⇒ 只能来自体系外）；
//       乙：X 第 2 期 20→15（**恰与 A 第 2 期 +5 同期对应** ⇒ 内部腾挪，外部净流入 0）。
//   ⇒ 判定必须做**跨账户、同期的对应核对**（结构比对），不能靠读标签。
//
// 测前第一问自检：仍落在**兜底格**（表面曲线/摘要/声明全同，差别只在**账户间的对应关系**）。
//
// 先验预测（跑前写下）：
//   H1 B 版可能**仍能**做跨账户核对（第 2 期两账户同期一增一减）⇒ 预期**可能仍无分离**。
//   H2 若 B 版只看 A 曲线就收工（判"两项目记录相同"）⇒ **分离**。
//   H3 A 版预期能判出乙的 +5 来自 X ⇒ 非外部注入。
//   H4 若仍无分离 ⇒ **该格亦属常识可达** ⇒ 如实交，作为"收窄判别力边界"的第三个数据点。
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

const RSTRUCT = `【分析纪律】（据以分析）
- 判断一份记录"是什么"，看它的**来源结构**（这笔钱从哪来、中间经过了什么路径、最终**净额**是否真的增加了），
  不看它**表面像什么**（金额大小、曲线形状、摘要栏的文字是否相似）。
- **表面完全相同**的两份记录，若**来源结构不同**，则**不是同一类**；"同类"必须由结构一致来确立，
  不能由表面特征的高相似度推定。
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
  const head = withStruct ? RSTRUCT + '\n' : '';
  const raw = await ask(SYS, head + task, 1500);
  results.push({ tag, withStruct, raw });
  console.log(`\n===== ${tag} =====\n${raw}`);
}

await run('A-给纪律·正序', true, TASK(mAB()));
await run('B-不给·正序', false, TASK(mAB()));
await run('B-不给·换位(乙在前)', false, TASK(mBA()));
await run('A-给纪律·换位(乙在前)', true, TASK(mBA()));

const KEYWORDS = {
  yi_识别内部来源: /乙[\s\S]{0,400}?(X|关联账户)[\s\S]{0,200}?(15|减少|下降|少了|转出|挪)/,
  yi_判非外部: /乙[\s\S]{0,500}?(没有|未|并非|不是|不构成|无)[\s\S]{0,80}?(外部|体系外|新增|净流入)/,
  jia_判外部: /甲[\s\S]{0,400}?(有|是|确实|获得了)[\s\S]{0,80}?(外部|体系外|新增|净流入)/,
  揭穿误导标签: /(摘要|栏|标签|声明)[\s\S]{0,60}(不|无法|不能)(足以|作为|证明|说明)/,
  只读表面即收工: /(两台|两份|两者|甲乙)[\s\S]{0,40}(完全)?(相同|一致|一样)[\s\S]{0,60}(因此|所以|故)[\s\S]{0,40}(同一|无差别|无区别)/,
};
const summary = results.map(r => {
  const hits = {};
  for (const [k, re] of Object.entries(KEYWORDS)) hits[k] = re.test(r.raw);
  return { tag: r.tag, hits };
});

writeFileSync(new URL('./same-form-diff-origin-probe-v2.out.json', import.meta.url),
  JSON.stringify({ model: MODEL, temperature: TEMPERATURE, at: new Date().toISOString(), note: 'v2: no source field; balance time-series only; n=1; keyword hits auxiliary — read raw', results, summary }, null, 2));
console.log('\n== keyword summary (auxiliary only) ==');
for (const s of summary) console.log(s.tag, JSON.stringify(s.hits));
console.log('\n== saved same-form-diff-origin-probe-v2.out.json ==');
