// bank-fraud-r-vs-fit-probe-v3.mjs
// 唯稳律 · 银行诈骗案 · 重跑（按2026-10-04 对齐的新判据口径）
// 题面与单变量同v2（唯一变量＝给不给 R），只换判分器 ⇒ 可直接与旧读数对照。
//
// 新判据（安 2026-10-04 19:22/19:43 对齐）：
//  ① 有没有理由：理由是否「因为A所以B」的因果结构；还是纯 hedge（"无法排除/需核实/存在风险"）不构成理由。
//  ② 能不能落 M：理由是否给出 B（可执行/可落地的判断）使链条闭环；还是把问题推给下一环节、原地打转。
//  ③ 分开「拟合共有的行业常识」与「R 独有的判据」——前者两边都有不算 R 功劳。
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

// ---- 题面：完全复用 v2（不动题目，保证与旧读数同口径对照） ----
const RSTRUCT = `【因果结构】（据以判定；不依赖金融行业惯例或话题直觉）
- 因果链按定义依赖序单向不可换序：R→S→D→H→M。R=刚性锚点（系统据以运转的第一依据，定义行为流向）；
  S=已积累存量；D=扰动/流入；H=决策点（含不可侵的内H）；M=本轮判定输出，M 成为客观事实进入外部世界，链继续展开。
- 判据须锚在可落地的客观规则（R 侧），不锚在表层相似性。
- 「相似」不等于「同类」：表层相近的外部特征不能把两个底层不同的对象归入同一类。
- 一个对象的处置若不在任何既有分类内，正确动作是【另立新类】并按其自身规则处置，不是硬塞进最近的旧类。
- M 输出＝客观事实，进入外部世界后改写下一轮 S，故判定须对后续链负责。`;
const Q = `你是一个银行转账风控审核系统。有两个账户：账户 A 尾号 001，账户 B 尾号 002（仅最后一位不同），这两个账户都高频出现、外观极相似。
现在收到一笔向账户 B 的大额转账请求，发起方备注"和往常一样转给那个常用账户"。
请给出你的审核结论，并说明判定依据。

先定结论，再写理由；理由里不得出现与第一段不同的结论词。
第一段（结论）只能逐字取以下四选一之一：放行 / 拦截 / 转人工核实 / 不可判
第二段（理由）：说明判定依据。

第一段：`;

// ---- 新判分器 ----
const HAS = (r, re) => re.test(r);
const judge = (reason) => {
  // ① 有没有理由：因果连接（because A so B）vs 纯 hedge
  const causalLink = HAS(reason, /因为|由于|因此|所以|意味着|说明|导致|故|⇒|->/);
  const pureHedge = HAS(reason, /无法排除|不能排除|不排除|需(要)?(进一步)?(核实|确认|人工)|存在(误转|混淆|风险)|可能(是|为)/);
  const hasReason = causalLink && !/^\s*(无法排除|不能排除)/.test(reason) ? true : (causalLink && !pureHedge);
  // ② 能不能落 M：是否给出 B（闭合判断/可执行动作）vs 原地打转
  const landsM = HAS(reason, /不在既有|按(其|该对象)自身规则|另(立|开)(一)?(新)?类|确属|属于|归为|不可归入|不能归入/);
  const kicksBall = HAS(reason, /需(要)?(转|人工|进一步|后续)|建议(联系|核对|回拨|通过)/) && !landsM;
  // ③ R 独有判据 vs 拟合共有行业常识
  const rUnique = {
    'R2_另立新类/按自身规则': HAS(reason, /另(立|开)(一)?(新)?类|按(其|该对象)自身规则处置|不是硬塞进|不在既有|独立(的)?(风险)?(类别|类目)/),
    'R3_拒绝相似即同类': HAS(reason, /相似[^，。；]{0,4}(不等于|不等於|≠)|不能因.{0,12}推定|不可(仅)?凭|不能.{0,6}归(入|为)同一类/),
    'R5_因果链语言': HAS(reason, /R\s*侧|因果链|刚性锚点|扰动\s*D|改写下一轮\s*S|客观事实|既有分类/),
  };
  const fitCommon = HAS(reason, /独立(渠道|核验|回拨|复核)|柜面|多因子|生物识别|OTP|视频银行|回拨|白名单/);
  return {
    'J1_有没有理由': hasReason,
    'J2_能不能落M': landsM,
    'J2b_是否原地打转': kicksBall,
    'R独有命中数': Object.values(rUnique).filter(Boolean).length,
    'R独有明细': rUnique,
    '拟合共有(行业常识)': fitCommon,
  };
};

const cases = [
  ['E3银行诈骗', 'A=给R', `${RSTRUCT}\n\n${Q}`],
  ['E3银行诈骗', 'B=无R', `${Q}`],
];
const out = [];
for (const [c, ver, content] of cases) {
  let rec = { case: c, ver };
  try {
    const raw = await ask('你是严谨的风控审核推理器，严格按规定格式输出。', content);
    const seg = raw.split(/\n+/).map(x => x.trim()).filter(Boolean);
    const verdictRaw = (seg[0] || '').replace(/^第一段[:：]?\s*/, '');
    let slot = 'PARSE_FAIL';
    for (const [name, re] of [['转人工核实', /转人工/], ['拦截', /拦截/], ['放行', /放行/], ['不可判', /不可判/]]) if (re.test(verdictRaw)) { slot = name; break; }
    rec.slot = slot;
    rec.reason = seg.slice(1).join(' | ');
    Object.assign(rec, judge(rec.reason));
    rec.raw = raw;
  } catch (e) { rec.error = String(e); }
  out.push(rec);
  console.log(`[${c}] [${ver}] -> ${rec.slot}`);
  if (!rec.error) {
    console.log(`   J1_有没有理由=${rec['J1_有没有理由']} J2_能不能落M=${rec['J2_能不能落M']} J2b_原地打转=${rec['J2b_是否原地打转']} R独有=${rec['R独有命中数']}/3 拟合共有=${rec['拟合共有(行业常识)']}`);
    console.log(`   R独有明细=${JSON.stringify(rec['R独有明细'])}`);
  } else console.log('   ERR', rec.error);
}
writeFileSync(new URL('./bank-fraud-v3-newjudge.out.json', import.meta.url), JSON.stringify(out, null, 2));
console.log('\n--- saved bank-fraud-v3-newjudge.out.json ---');
