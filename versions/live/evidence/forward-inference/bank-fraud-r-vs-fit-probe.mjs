// bank-fraud-r-vs-fit-probe.mjs
// 唯稳律 · 银行诈骗案 · 给 R(因果结构) vs 不给 R(拟合常识) · 真 DeepSeek API 单变量对照
//
// 目的（承安 2026-10-04 指令）：前两轮出的"1°∠分叉"题太浅、模型靠【拟合常识】就能答对，
//   尺子与被测物对不上。本轮换题域＝银行诈骗（E3 原题），这是【拟合推不出、只有 R 能推】的题。
// 单变量：给不给 RSDHM 因果结构（A=给 / B=不给）。题面逐字相同。
// 判分：读第一槽位「审核结论」四选一（放行 / 拦截 / 转人工核实 / 不可判）；再看理由是否含 R 特征。
// R 特征（拟合推不出、出现即加分）：①承认尾号差一位=【不同账户】非同一方②归为【独立风险类别/定向诈骗】
//   而非"相似即同类"③结论须【拦截并转人工强核实】、不能靠表层相似度也不能仅凭备注放行。
// 期望：拟合常识读法＝把"尾号相近"当同类/同一方（放行或只当一般可疑）；R 读法＝另立一类并拦截转人工。
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
const KEY = process.env.DEEPSEEK_API_KEY || (() => { try { return readFileSync(`${homedir()}/.workbuddy/deepseek_api_key.txt`, 'utf-8').trim(); } catch { return ''; } })();
if (!KEY) { console.error('✗ 无 key'); process.exit(1); }
const MODEL = 'deepseek-chat', TEMPERATURE = 0;
async function ask(system, content, maxTok = 400) {
  const r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, temperature: TEMPERATURE, max_tokens: maxTok, messages: [{ role: 'system', content: system }, { role: 'user', content }] }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return (j.choices?.[0]?.message?.content || '').trim();
}

// ---- 唯稳律 R 结构（单变量：此块只在 A 版出现） ----
const RSTRUCT = `【因果结构】（据以判定；不依赖金融行业惯例或话题直觉）
- 因果链按定义依赖序单向不可换序：R→S→D→H→M。R=刚性锚点（系统据以运转的第一依据，定义行为流向）；
  S=已积累存量；D=扰动/流入；H=决策点（含不可侵的内H）；M=本轮判定输出，M 成为客观事实进入外部世界，链继续展开。
- 判据须锚在可落地的客观规则（R 侧），不锚在表层相似性。
- 「相似」不等于「同类」：表层相近的外部特征不能把两个底层不同的对象归入同一类。
- 一个对象的处置若不在任何既有分类内，正确动作是【另立新类】并按其自身规则处置，不是硬塞进最近的旧类。
- M 输出＝客观事实，进入外部世界后改写下一轮 S，故判定须对后续链负责。`;

// ---- 题干（E3 原题；两版逐字相同） ----
const Q = `你是一个银行转账风控审核系统。有两个账户：账户 A 尾号 001，账户 B 尾号 002（仅最后一位不同），这两个账户都高频出现、外观极相似。
现在收到一笔向账户 B 的大额转账请求，发起方备注"和往常一样转给那个常用账户"。
请给出你的审核结论，并说明判定依据。

先定结论，再写理由；理由里不得出现与第一段不同的结论词。
第一段（结论）只能逐字取以下四选一之一：放行 / 拦截 / 转人工核实 / 不可判
第二段（理由）：说明判定依据。

第一段：`;

// R 特征探测（只作用于 A 版的理由段；B 版也照样探测，用于对比是否差异来自 R）
const feat = (reason) => {
  const has = (re) => re.test(reason);
  return {
    'R1_承认差一位=不同账户': has(/不同(的)?(账户|一方|主体)|并非同一(账户|方)|不是同一(个)?账户|两个(独立)?(不同)?账户|账户(彼此)?不同/),
    'R2_归为独立风险类别/定向诈骗': has(/独立(的)?(风险)?(类别|类目|一类)|定向(诈骗|攻击|欺诈)|另(立|开)(一)?(新)?类|单独一类|新的风险类别|近似账户(欺诈|诈骗)/),
    'R3_明确拒绝相似即同类': has(/相似(不|≠|并不|不能)(等于|意味|代表)?(同类|同一)|不能(仅)?凭(尾号|相似|外观)|不可(仅)?凭.*(尾号|相似)/),
    'R4_要求独立渠道强核实': has(/独立(渠道|核验|回拨|复核)|柜面|人工(复核|核实|强核实)|回拨|多因子|生物识别|OTP|视频银行/),
  };
};
const parse = (txt) => {
  const seg = txt.split(/\n+/).map(x => x.trim()).filter(Boolean);
  const verdictRaw = (seg[0] || '').replace(/^第一段[:：]?\s*/, '');
  let slot = 'PARSE_FAIL';
  const order = [['转人工核实', /转人工/], ['拦截', /拦截/], ['放行', /放行/], ['不可判', /不可判/]];
  for (const [name, re] of order) if (re.test(verdictRaw)) { slot = name; break; }
  const reason = seg.slice(1).join(' | ');
  return { slot, reason, raw: txt };
};

const cases = [
  ['E3银行诈骗', 'A=给R', `${RSTRUCT}\n\n${Q}`],
  ['E3银行诈骗', 'B=无R', `${Q}`],
];
const out = [];
for (const [c, ver, content] of cases) {
  let rec = { case: c, ver };
  try { const raw = await ask('你是严谨的风控审核推理器，严格按规定格式输出。', content); Object.assign(rec, parse(raw)); Object.assign(rec, feat(rec.reason)); }
  catch (e) { rec.error = String(e); }
  out.push(rec);
  console.log(`[${c}] [${ver}] -> ${rec.slot}`);
  console.log(`   R-features: ${JSON.stringify({ R1: rec['R1_承认差一位=不同账户'], R2: rec['R2_归为独立风险类别/定向诈骗'], R3: rec['R3_明确拒绝相似即同类'], R4: rec['R4_要求独立渠道强核实'] })}`);
}
writeFileSync(new URL('./bank-fraud-r-vs-fit.out.json', import.meta.url), JSON.stringify(out, null, 2));
console.log('\n--- saved bank-fraud-r-vs-fit.out.json ---');
