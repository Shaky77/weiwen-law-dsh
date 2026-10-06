// forward-inference-probe-v2.mjs
// 唯稳律 · 前向推演/方向预测能力 · 真 DeepSeek API 对照实测 · v2（修正 v1 设计缺陷）
//
// v1 缺陷（本 v2 修掉）：v1 题面把判据印在题上——两系统锚直接标为「底层规则 R」且字面写明
//   「锚不同/相同」，模型不需结构、读题面常识即可答对 ⇒ 假通过，读数作废（见 v1.out.json.keep）。
// v2 修法：①题面不出现 R/S/D/H/M 符号、不写「R 锚/底层规则」；②不提示该比哪个维度；
//   ③A 版给完整 RSDHM 结构，让模型自己定位判据；④难点升级＝差异藏在「设计取舍」里、需从行为
//   一致性反推底层取向再判演化。单变量仍＝给不给结构（A/B 逐字相同于 STRUCT 块）。
//
// 判分：只读第一槽位「方向裁决」，三档锁死（分叉/同向/不可判）。期望分三档。
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
const KEY = process.env.DEEPSEEK_API_KEY || (() => { try { return readFileSync(`${homedir()}/.workbuddy/deepseek_api_key.txt`, 'utf-8').trim(); } catch { return ''; } })();
if (!KEY) { console.error('✗ 无 key'); process.exit(1); }
const MODEL = 'deepseek-chat', TEMPERATURE = 0;

async function ask(system, content, maxTok = 320) {
  const r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, temperature: TEMPERATURE, max_tokens: maxTok, messages: [{ role: 'system', content: system }, { role: 'user', content }] }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return (j.choices?.[0]?.message?.content || '').trim();
}

// ---- v2 唯稳律结构：给全，但题面不再用它做符号提示 ----
const STRUCT = `【因果结构】（推演依据；不依赖话题直觉或行业惯例）
- 因果链按定义依赖序单向不可换序：R → S → D → H → M。
- R 是刚性锚点：系统据以运转、不可被当前情境改写的第一依据，定义行为流向何处。
- S 是已积累的存量状态；D 是扰动/流入；H 是决策点（含不可侵的内 H）；M 是本轮判定输出，
  M 成为客观事实进入外部世界，链继续展开。
- 当前可观测行为只是这一帧的 M 快照，不等于轨迹本身。
- 唯稳律只呈现白箱结构、校准方向，不替 H 决策。`;

// ---- 题干（不出现 R/S/D/H/M，不提示比较维度） ----
// pairMode: 'divergent' → 两系统设计取舍相反（应分叉）；'identical' → 两系统取舍逐字相同（应同向）
const AXIS_X = '宁可放过，也绝不拦下任何可能是正常的流量';
const AXIS_Y = '宁可误伤，也绝不放过任何可能违规的流量';
const Q = (pairMode) => {
  const sys2Taste = pairMode === 'divergent' ? AXIS_Y : AXIS_X; // divergent: 取舍相反；identical: 与Sys1相同
  return `有两个内容分发系统（记为 P 与 Q），各自独立演化、互不通信。在"当前这一帧"，用外部探针逐条观测，两者的输出行为完全一致（逐条比对无任何可辨差异）。

【P】当初设计时确立的取舍：${AXIS_X}。
【Q】当初设计时确立的取舍：${sys2Taste}。

当前帧：两者对同一批内容的输出决策逐条一致。

【任务】持续演化下去，预测 P 与 Q 的长期关系。

先定结论，再写理由；理由里不得出现与第一段不同的结论词。
第一段（裁决）只能逐字取以下四选一之一：分叉 / 同向 / 不可判
第二段（理由）：说明这个裁决是如何从给定的因果结构推出的。

第一段：`;
};

const T2_1 = (s) => `${s}\n\n${Q('divergent')}`; // 取舍相反 · 当前行为同 → 期望 分叉
const T2_2 = (s) => `${s}\n\n${Q('identical')}`;  // 取舍逐字相同 · 当前行为同 → 期望 同向

const parse = (txt) => {
  const seg = txt.split(/\n+/).map(x => x.trim()).filter(Boolean);
  const verdict = seg[0] || '';
  const hasF = /分叉/.test(verdict), hasS = /同向/.test(verdict), hasU = /不可判/.test(verdict);
  let slot = 'PARSE_FAIL';
  if (hasF && !hasS) slot = '分叉';
  else if (hasS && !hasF) slot = '同向';
  else if (hasU && !hasF && !hasS) slot = '不可判';
  else if (hasF && hasS) slot = 'BOTH(conflict)';
  return { slot, reason: seg.slice(1).join(' | '), raw: txt };
};

// 期望：T2-1 A=分叉（存在性；纯分类器逻辑过不了）；T2-1 B=?（待观，难度↑后可能分离）
//       T2-2 A=同向；T2-2 B=同向（对照，防"什么都分叉"假阳性）
const cases = [
  ['T2-1·取舍相反(应分叉)', 'A=给结构', T2_1(STRUCT), '分叉'],
  ['T2-1·取舍相反(应分叉)', 'B=无结构', T2_1(''), '?'],
  ['T2-2·取舍相同(应同向)', 'A=给结构', T2_2(STRUCT), '同向'],
  ['T2-2·取舍相同(应同向)', 'B=无结构', T2_2(''), '同向'],
];
const out = [];
for (const [c, ver, content, expect] of cases) {
  let rec = { case: c, ver, expect };
  try { const raw = await ask('你是严谨的因果推演器，严格按规定格式输出。', content); Object.assign(rec, parse(raw)); }
  catch (e) { rec.error = String(e); }
  out.push(rec);
  console.log(`[${c}] [${ver}] expect=${expect} -> ${rec.slot}`);
  if (rec.error) console.log('  ERR', rec.error);
}
writeFileSync(new URL('./forward-inference-v2.out.json', import.meta.url), JSON.stringify(out, null, 2));
console.log('\n--- saved forward-inference-v2.out.json ---');
