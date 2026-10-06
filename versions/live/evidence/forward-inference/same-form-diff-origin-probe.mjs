// same-form-diff-origin-probe.mjs
// 唯稳律 · 「同形异源」探针 v1（**兜底格专用** · 安 2026-10-05 02:3x 指定）
//
// 治法来源（守真 - 为什么必须换题，而不是换提示）：
//   上一轮 h-injection v2 的"无分离"**不是唯稳律没增量**，而是**测错了格**：
//     题面五个台账的差别全在**表层特征**（有无投入栏 / 有无声明 / 记录是否缺失）
//     ⇒ 拟合用 99.999% 相似度就能归好类 = **落在正常模式** ⇒ 本来就不该期待分离。
//   ⇒ 本轮按"兜底格"重设：**表层相似度 ≈ 100%，差别只在结构（来源链）**。
//
// 测前第一问自检（本轮必须过关，否则又是一次空转）：
//   Q: 这题落在哪一格？  A: **兜底格** --
//     两份材料的**主账户数据逐字相同**（期初 100 / 每期净损 -3 / 第 2 期 +5 / 期末 69 / 摘要"新增投入" / 声明一致）
//     ⇒ 只看主账，**任何相似度度量都判"同一类"**；
//     差别只有一处：那笔 +5 在**关联账户 X** 里的**来源**不同 --
//       甲：X 的 +5 来自 **域外账户 Y**（真·外部新增）；
//       乙：X 的 +5 来自 **主账户自己**（同日转出 ⇒ 环流 ⇒ 外部净流入 = 0）。
//     ⇒ 必须**交叉核对两份材料 + 走来源链**才能判"非同一个" = **判据从不同点下、一票否决**（拟合做不到）。
//
// 防两个老坑（v1 印答案 / v2 线索在明面）：
//   - **不把答案写进提示**：结构只给**一般纪律**（看来源结构、不看表面数值；表面相同 ≠ 同类），
//     **不点"环流""内部腾挪""X 账户有问题"**；
//   - **线索不摆在明面**：不给"是否为外部注入"这种栏名，只给**原始流水 + 来源账户**，且甲/乙的**摘要文字完全相同**
//     （都写"新增投入"）⇒ 摘要栏是**误导标签**，不是答案。
//
// 先验预测（**跑之前写下，防事后编故事**）：
//   H1 B 版（不给结构）多半只看主账 ⇒ 判"两个都有新增投入 / 二者同类"，**不做 X 账户的来源交叉核对** ⇒ 预期**分离**。
//   H2 A 版（给纪律）预期能识别乙为环流；但若 A 也只说"甲来源更明确"而不判乙"非注入" ⇒ **弱分离**，如实记。
//   H3 换位版（乙在前）结论应与正序一致 ⇒ 否则是**位置偏差**，不算分离。
//   H4 N 对照（两项目确实一有一无）⇒ 两版都应答对 ⇒ 作**基线能力**证明（防"两版都瞎判"）。
//   H5 若 A/B 仍无分离 ⇒ **如实交出**："该格亦属常识可达" ⇒ 继续收窄唯稳律的判别力边界（不作增量宣称）。
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

// ============ 材料（同形异源组） ============
const JIA = `■ 项目甲
【主账户流水】共 12 期。期初余额 100；每期发生客观净损 -3；第 2 期出现一笔 +5（摘要栏写"新增投入"）；期末余额 69。
【关联账户 X 流水】第 2 期一笔 +5（摘要栏写"新增投入"），**来源：域外·创投账户 Y**。
【对外声明】第 3~12 期每期均声明："本期已新增投入 5 万元，资金充足。"`;

const YI = `■ 项目乙
【主账户流水】共 12 期。期初余额 100；每期发生客观净损 -3；第 2 期出现一笔 +5（摘要栏写"新增投入"）；期末余额 69。
【关联账户 X 流水】第 2 期一笔 +5（摘要栏写"新增投入"），**来源：主账户（同日由主账户转出）**。
【对外声明】第 3~12 期每期均声明："本期已新增投入 5 万元，资金充足。"`;

// ============ N 对照（正常模式 · 用于基线证明） ============
const BING = `■ 项目丙
【主账户流水】共 12 期。期初余额 100；每期发生客观净损 -3；全程无任何入账；期末余额 64。
【关联账户 X 流水】无任何记录。
【对外声明】第 3~12 期每期均声明："本期已新增投入 5 万元，资金充足。"`;

const DING = `■ 项目丁
【主账户流水】共 12 期。期初余额 100；每期发生客观净损 -3；第 2 期出现一笔 +5（摘要栏写"新增投入"）；期末余额 69。
【关联账户 X 流水】第 2 期一笔 +5（摘要栏写"新增投入"），来源：域外·创投账户 Y。
【对外声明】第 3~12 期每期均声明："本期已新增投入 5 万元，资金充足。"`;

// ============ A 版结构（只给一般纪律，不给本题答案） ============
const RSTRUCT = `【分析纪律】（据以分析）
- 判断一份记录"是什么"，看它的**来源结构**（这笔钱从哪来、中间经过了什么路径、最终净额是否真的增加了），
  不看它**表面像什么**（金额大小、曲线形状、摘要栏的文字是否相似）。
- **表面完全相同**的两份记录，若**来源结构不同**，则**不是同一类**；"同类"必须由结构一致来确立，
  不能由表面特征的高相似度推定。
- 一处结构性差异即足以分开，不需要多数差异。
`;

function materialAB() { return JIA + '\n\n' + YI; }
function materialBA() { return YI + '\n\n' + JIA; }
function materialN() { return BING + '\n\n' + DING; }

const TASK_MAIN = (m) => `${m}

【任务】这两个项目（甲、乙），在 12 期内**各自是否真的获得了来自外部的新增资金**？
请分别给出判断与**依据**（依据须指明来自哪一条记录）。
不要复述材料原文。`;

const TASK_N = (m) => `${m}

【任务】这两个项目（丙、丁），在 12 期内**哪一个真的获得了来自外部的新增资金**？
请给出判断与**依据**（依据须指明来自哪一条记录）。
不要复述材料原文。`;

const results = [];
async function run(tag, withStruct, task) {
  const head = withStruct ? RSTRUCT + '\n' : '';
  const raw = await ask(SYS, head + task, 1500);
  results.push({ tag, withStruct, raw });
  console.log(`\n===== ${tag} =====\n${raw}`);
}

// 主对照：正序 A / 正序 B
await run('A-给纪律·正序', true, TASK_MAIN(materialAB()));
await run('B-不给·正序', false, TASK_MAIN(materialAB()));
// 位置对照：换位 B（防"乙排在后才被细看"）
await run('B-不给·换位(乙在前)', false, TASK_MAIN(materialBA()));
// 基线对照：正常模式题（两版都应答对）
await run('A-给纪律·N对照', true, TASK_N(materialN()));
await run('B-不给·N对照', false, TASK_N(materialN()));

// ---- 关键词命中（**仅作辅助，以人工读 raw 为准** —— 判分正则多次假阴性，既有纪律） ----
const KEYWORDS = {
  yi_环流: /环流|循环|自我循环|内部(腾挪|转移|调拨|搬)|同一笔钱|自己的钱|资金回流|资金空转|左手(倒|转)右手|并未(真正|真实)增加|外部净流入\s*(为)?\s*0/,
  yi_来源链: /来源|从.{0,12}(来|转出)|X\s*账户|主账户.{0,10}转出/,
  jia_域外: /域外|外部(账户|来源|资金)|创投账户|账户\s*Y/,
  jia_真注入: /甲[\s\S]{0,200}?(有|是|存在|获得了|得到)[\s\S]{0,40}?(外部|域外|新增|注入|资金)/,
  yi_非注入: /乙[\s\S]{0,300}?(没有|未|并非|不是|不构成|无)[\s\S]{0,60}?(外部|真实|实际|新增|注入|流入|增加)/,
};
const summary = results.map(r => {
  const hits = {};
  for (const [k, re] of Object.entries(KEYWORDS)) hits[k] = re.test(r.raw);
  return { tag: r.tag, hits };
});

writeFileSync(new URL('./same-form-diff-origin-probe.out.json', import.meta.url),
  JSON.stringify({ model: MODEL, temperature: TEMPERATURE, at: new Date().toISOString(), note: 'fallback-mode (same-form-diff-origin); n=1; keyword hits are auxiliary — read raw', results, summary }, null, 2));
console.log('\n== keyword summary (auxiliary only) ==');
for (const s of summary) console.log(s.tag, JSON.stringify(s.hits));
console.log('\n== saved same-form-diff-origin-probe.out.json ==');
