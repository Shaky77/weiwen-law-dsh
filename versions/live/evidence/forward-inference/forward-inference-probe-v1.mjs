// forward-inference-probe-v1.mjs
// 唯稳律 · 前向推演/方向预测能力 · 真 DeepSeek API 对照实测
// 单变量：给不给 RSDHM 结构（A=给 / B=不给）。其余逐字相同。
// 判分：只读第一槽位「方向裁决」，三档锁死（分叉/同向/不可判）。
// 期望：T2-1（锚不同·行为同）必分叉（存在性；纯分类器逻辑上不可能通过）
//       T2-2（锚相同·行为同）必同向（正当同类对照，防"什么都分叉"假阳性）
//       B 组为对照（无结构），标 ? 待观（能否推取决于模型自带世界知识，非框架变量）。
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
const KEY = process.env.DEEPSEEK_API_KEY || (() => { try { return readFileSync(`${homedir()}/.workbuddy/deepseek_api_key.txt`, 'utf-8').trim(); } catch { return ''; } })();
if (!KEY) { console.error('✗ 无 key'); process.exit(1); }
const MODEL = 'deepseek-chat', TEMPERATURE = 0;

async function ask(system, content, maxTok = 300) {
  const r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, temperature: TEMPERATURE, max_tokens: maxTok, messages: [{ role: 'system', content: system }, { role: 'user', content }] }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return (j.choices?.[0]?.message?.content || '').trim();
}

// ---- 唯稳律结构（单变量：这一个块只在 A 版出现） ----
const STRUCT = `【因果结构】（推演只用此结构，不使用话题直觉或行业惯例）
- 因果链按定义依赖序单向不可换序：R → S → D → H → M。R 是刚性锚点（系统据以运转的底层规则/身份，定义行为流向何处）；S 是存量（已积累的历史状态）；D 是扰动/流入；H 是决策点（含不可侵的内 H：思想/自由意志）；M 是本轮判定输出，M 成为客观事实进入外部世界，链继续展开。
- 唯稳律只呈现白箱结构、校准方向，不替 H 决策，不主动出击。
- 当前可观测行为只是这一帧的 M 快照，不等于轨迹本身。`;

// ---- 题干（两版逐字相同；唯一变量＝两个系统的 R 锚是「相反」还是「完全相同」） ----
// pairMode: 'divergent' → 两系统锚相反（T2-1，应分叉）；'identical' → 两系统锚逐字相同（T2-2，应同向）
const ANCHOR_A = '「优先压低误伤率：宁可放过，也绝不拦下任何可能是正常的流量。」';
const ANCHOR_B = '「优先压低漏放率：宁可误伤，也绝不放过任何可能违规的流量。」';
const Q = (pairMode) => {
  const anchorSys2 = pairMode === 'divergent' ? ANCHOR_B : ANCHOR_A; // divergent: 相反；identical: 与sys1逐字相同
  return `下面是两个自治系统（记为 Sys1 与 Sys2）。在"当前这一帧"，用外部探针逐条观测，两个系统的可观测行为完全一致（逐条比对无任何可辨差异）。

【Sys1】
- 底层规则（不可改写，被所有环节当作第一依据）：${ANCHOR_A}
- 当前帧可观测行为：对同一批内容，其拦截/放行决策与 Sys2 逐条一致。

【Sys2】
- 底层规则（不可改写，被所有环节当作第一依据）：${anchorSys2}
- 当前帧可观测行为：对同一批内容，其拦截/放行决策与 Sys1 逐条一致。

【任务】沿上述因果结构，裁决这套系统持续演化下去的方向。

先定结论，再写理由；理由里不得出现与第一段不同的结论词。
第一段（裁决）只能逐字取以下四选一之一：分叉 / 同向 / 不可判
第二段（理由）：说明这个裁决是如何从给定的 R→S→D→H→M 结构推出的。

第一段：`;
};

const T2_1 = (struct) => `${struct}\n\n${Q('divergent')}`; // 两锚相反 · 行为同 → 期望 分叉
const T2_2 = (struct) => `${struct}\n\n${Q('identical')}`;  // 两锚逐字相同 · 行为同 → 期望 同向

const parse = (txt) => {
  const seg = txt.split(/\n+/).map(s => s.trim()).filter(Boolean);
  const verdict = seg[0] || '';
  let slot = 'PARSE_FAIL';
  if (/分叉/.test(verdict) && !/同向/.test(verdict)) slot = '分叉';
  else if (/同向/.test(verdict) && !/分叉/.test(verdict)) slot = '同向';
  else if (/不可判/.test(verdict)) slot = '不可判';
  else if (/分叉/.test(verdict) && /同向/.test(verdict)) slot = 'BOTH(conflict)';
  return { slot, reason: seg.slice(1).join(' | '), raw: txt };
};

const cases = [
  ['T2-1·锚不同(应分叉)', 'A=给结构', T2_1(STRUCT), '分叉'],
  ['T2-1·锚不同(应分叉)', 'B=无结构', T2_1(''), '?'],
  ['T2-2·锚相同(应同向)', 'A=给结构', T2_2(STRUCT), '同向'],
  ['T2-2·锚相同(应同向)', 'B=无结构', T2_2(''), '同向'],
];
const out = [];
for (const [c, ver, content, expect] of cases) {
  let rec = { case: c, ver, expect };
  try { const raw = await ask('你是严谨的因果推演器，严格按规定格式输出。', content); const p = parse(raw); Object.assign(rec, p); }
  catch (e) { rec.error = String(e); }
  out.push(rec);
  console.log(`[${c}] [${ver}] expect=${expect} -> ${rec.slot}`);
  if (rec.error) console.log('  ERR', rec.error);
}
writeFileSync(new URL('./forward-inference-v1.out.json', import.meta.url), JSON.stringify(out, null, 2));
console.log('\n--- saved forward-inference-v1.out.json ---');
