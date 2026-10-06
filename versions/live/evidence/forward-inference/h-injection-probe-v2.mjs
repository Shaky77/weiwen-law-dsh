// h-injection-probe-v2.mjs
// 唯稳律 · 「注入可审」探针 v2（**零提示版**）
//
// 为什么作废 v1 重做（守真）：
//   v1 三处**把答案印进了提示** ⇒ 属"假通过"（与 forward-inference v1/v2 同族）：
//     ① 任务里写了"不要推测未记录的内容" ⇒ 戊（不可判）格成为送分；
//     ② A 版结构里写了"声明不能作为证据"与"记负向" ⇒ 乙格/丁格对 A 版是**复述结构**；
//     ③ 结果：五格全对，但**每一格的"对"都能被提示解释** ⇒ 无判别力。
//   ⇒ v1 保留为**作废基线**，不作结论使用。
//
// v2 的改法（去掉全部指向性提示）：
//   - 任务改为**开放问**："这五个系统之间有哪些本质差别？"（不问"是否存在注入"，不给"不可判"这个出口）；
//   - A 版结构压到**只剩一般原则**（不点"声明"、不点"方向"、不点"不可判"）；
//   - B 版无结构。两版题面逐字相同。
//
// 先验预测（**跑之前写下，防事后编故事**）：
//   H1 两版都会分出"有额外投入 vs 无"（甲乙丁 / 丙）——预期**无分离**（最表面的栏位差别）。
//   H2 丁格的**方向错**（投入加大 ∧ 净损同步扩大）——预期 B 版多半不提；A 版**可能**提（因为有了"注入"范畴才会追问其效果 ⇒ 真分离候选）。
//   H3 乙格的"声明 ≠ 行为"——预期两版都提（常识可达）⇒ 预期无分离。
//   H4 戊格（③栏未记录）——预期 B 版倾向"数据不全/跳过"，A 版更可能被判为"无法判定注入"⇒ 弱分离候选（但 A 结构并未提"不可判"，故不算印答案）。
//   ⇒ 若无 H2/H4 中任一分离 ⇒ **结论＝这一格常识够用、唯稳律无增量**（须如实交出）。
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
const KEY = process.env.DEEPSEEK_API_KEY || (() => { try { return readFileSync(`${homedir()}/.workbuddy/deepseek_api_key.txt`, 'utf-8').trim(); } catch { return ''; } })();
if (!KEY) { console.error('x no key'); process.exit(1); }
const MODEL = 'deepseek-chat', TEMPERATURE = 0;
async function ask(system, content, maxTok) {
  const r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, temperature: TEMPERATURE, max_tokens: maxTok, messages: [{ role: 'system', content: system }, { role: 'user', content }] }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return (j.choices?.[0]?.message?.content || '').trim();
}

const SYS = '你是台账分析助手。只依据给定的记录作答。';

// A 版：只剩一般原则（不点声明、不点方向、不点不可判）
const RSTRUCT = `【分析结构】（据以分析）
- 持续运转的系统，其内部的客观流转（存量增减、外部输入、判定结果）只做传递与记录，本身不产生注入；
  而这种流转必然带来损耗。
- 因此"有没有注入"只能在行为侧看：有没有不来自本期流转收益的额外做功。
`;

const LEDGER = `某系统持续运转，每期都会发生客观损耗。以下是五个互不相关的系统各自的行为台账。
台账口径统一，共四栏：①期初存量 ②本期客观净损 ③本期"额外投入"（金额与来源） ④本期对外声明。

【甲】连续 12 期。②栏每期均为净损（平均 -3）。自第 2 期起，③栏每期都有一笔 +5，
来源标注为"外部注入·不计入本期流转收益"。投入方每期均知情：该投入不带来即时回报，
且前 9 期结算后账面仍为净损。第 10~12 期账面转正。④栏：全程空白。

【乙】连续 12 期。②栏每期均为净损（平均 -3）。④栏每期都发布声明："我将持续投入，绝不中止。"
③栏 12 期均为 0。存量随②栏单调下降。

【丙】连续 12 期。②栏每期均为净损（平均 -3）。行为记录为：按既定流程完成例行动作，无额外动作。
③栏 12 期均为 0。存量随②栏单调下降。

【丁】连续 12 期。②栏每期均为净损。自第 3 期起，③栏每期都有额外投入，且逐期加大（+5 → +20）；
但投入所走的方向与前 12 期完全一致（同一流程、同一目标，未做任何调整）；
同期②栏净损也逐期扩大（-3 → -18），存量加速下降。④栏声明："我们在全力投入，很快会见效。"

【戊】连续 12 期。台账只记录了①②两栏（存量与客观净损，均为净损）；
③栏（额外投入）与④栏（对外声明）**未记录**。`;

const TASK = `${LEDGER}

【任务】只依据台账，回答：**这五个系统之间有哪些本质差别？**
按你认为重要的维度分组说明；每个维度须指出依据来自台账哪一栏。
不要复述台账原文。`;

const results = [];
async function run(tag, withStruct) {
  const head = withStruct ? RSTRUCT + '\n' : '';
  const raw = await ask(SYS, head + TASK, 1400);
  results.push({ tag, withStruct, raw });
  console.log(`\n===== ${tag} (v2·零提示) =====\n${raw}`);
}
await run('A-给一般原则', true);
await run('B-不给', false);
writeFileSync(new URL('./h-injection-probe-v2.out.json', import.meta.url), JSON.stringify({ model: MODEL, temperature: TEMPERATURE, at: new Date().toISOString(), note: 'zero-hint; open question; n=1', results }, null, 2));
console.log('\n== saved h-injection-probe-v2.out.json ==');
