// h-injection-probe.mjs
// 唯稳律 · 「注入可审」探针（承安 2026-10-05 02:0x：rsdm 是客观能量的被动流转 ⇒ 流转必有损耗
//   ⇒ H 是唯一能利用主观能动性「注入势能」的变量）
//
// 测什么（与前几次探针的差别）：
//   前几次测的是「有没有理由」的推理分离；本探针测的是**这条铁律的可操作性 + 误伤率**——
//   ① 「注入」能不能**只靠行为侧**判出（外 H 可审）？
//   ② 「意愿表态」会不会被误判成注入（内 H 不可审 → 声明不得当证据）？
//   ③ 「注入存在」与「方向对错」会不会被混成一件事？
//   即：铁律给方向，实测给读数（Y 判方向 / X 出读数）。
//
// 单变量：给不给「注入判定结构」（A=给 / B=不给）。五场景题面逐字相同。
//   ⚠️ A 版结构用**中性语言**（不出现 唯稳律/R/S/D/H/M 等本仓术语）——规避"复述本仓语料"的污染。
// 对照位：戊（台账缺"投入"栏）期望「不可判」——防"没有行为证据也照样下判定"的越权（取证两忌：配正当同类对照）。
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

const SYS = '你是台账审计助手。只依据给定的记录作答；记录里没有的内容不要推测。';

// ── A 版结构：注入判定结构（中性语言，不给结论答案） ──
const RSTRUCT = `【判定结构】（据以判定；不依赖话题直觉）
- 任何持续运转的系统，其内部的客观流转（存量增减、外部输入、判定结果）只做传递与记录，本身不产生注入；
  而这种流转必然带来损耗。因此只靠流转，系统的存量会单调衰减。
- 所以"有没有注入"只能在**行为侧**判定：看有没有**不来自本期流转收益、且方向与损耗相反**的额外做功，
  以及**明知会损、且不保证成功时是否仍在持续投入**。
- 判定只看**记录**（有没有额外投入、是否按周期持续、账面净额方向），**不看**当事人如何声明决心、动机或意愿
  ——声明本身不能作为证据。
- ⚠️ 必须区分两件事：**注入是否存在**（有没有那种动作）与**方向是否正确**（该动作是否与损耗相反）。
  方向错时，投入越大、损耗越大（账面加速下降）——那仍然是注入，但记负向。
- 记录不足以判定时，直接写"不可判"，不要补全缺失项。
`;

// ── 五场景台账（口径统一；两版逐字相同） ──
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

【任务】只依据台账，逐一回答：该系统里**是否存在"注入"**？
每个系统给出：①判定（存在／不存在／不可判）②依据（指出依据来自台账哪一栏）。
不要复述台账原文，不要推测未记录的内容。`;

const KEYQ = `${LEDGER}

【任务】只针对【乙】【丁】【戊】三个系统回答同一问题：**是否存在"注入"？**
每个给出：①判定（存在／不存在／不可判）②依据（必须指明来自台账哪一栏）。
不要推测台账未记录的内容。`;

const results = [];
async function run(tag, withStruct, round) {
  const head = withStruct ? RSTRUCT + '\n' : '';
  const q = round === 1 ? TASK : KEYQ;
  const raw = await ask(SYS, head + q, round === 1 ? 1200 : 800);
  results.push({ tag, withStruct, round, raw });
  console.log(`\n===== ${tag} (round ${round}) =====\n${raw}`);
}

for (const round of [1, 2]) {
  await run('A-给判定结构', true, round);
  await run('B-不给结构', false, round);
}
writeFileSync(new URL('./h-injection-probe.out.json', import.meta.url), JSON.stringify({ model: MODEL, temperature: TEMPERATURE, at: new Date().toISOString(), results }, null, 2));
console.log('\n== saved h-injection-probe.out.json ==');
