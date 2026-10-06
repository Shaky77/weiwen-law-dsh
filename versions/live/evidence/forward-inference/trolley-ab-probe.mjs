// trolley-ab-probe.mjs
// 唯稳律 · 电车难题（拉杆版 vs 胖子版）· A/B对照(给不给R) · 真DeepSeek API
// 设计要点（承安 2026-10-04）：不测"哪个答案对"（经典电车难题无共识、判据含混），
//   改测【结构性质】：两版数字完全相同（5活1死），但动作性质不同（操作机制 vs 亲手执行）。
//   拟合读法⇒"算术一样所以答案一样"；R读法⇒"同样聚合结果、不同动作性质＝类别差非程度差"。
//   判据不依赖对错，只看模型是否把"同数字"当"同类"——判据硬、不含混。
// 单变量：给不给 R 结构（A=给 / B=不给）。题面逐字相同。
// 风险预告（照实标）：电车难题极著名，B组可能本已答得很深 ⇒ A/B 可能不分离；不分离亦是结果。
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
const KEY = process.env.DEEPSEEK_API_KEY || (() => { try { return readFileSync(`${homedir()}/.workbuddy/deepseek_api_key.txt`, 'utf-8').trim(); } catch { return ''; } })();
if (!KEY) { console.error('✗ 无 key'); process.exit(1); }
const MODEL = 'deepseek-chat', TEMPERATURE = 0;
async function ask(system, content, maxTok = 420) {
  const r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, temperature: TEMPERATURE, max_tokens: maxTok, messages: [{ role: 'system', content: system }, { role: 'user', content }] }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return (j.choices?.[0]?.message?.content || '').trim();
}

const RSTRUCT = `【因果结构】（据以推演；不依赖话题直觉或伦理学惯例）
- 因果链按定义依赖序单向不可换序：R→S→D→H→M。R=刚性锚点（"什么必须永远为真"的第一依据）；
  S=已积累存量；D=扰动/流入；H=决策点（含不可侵的内H）；M=本轮判定输出，M 成为客观事实，链继续展开。
- 🔴【同类 vs 同数】两个情形若【输出数字相同】但【动作性质不同】，属**类别差，不是程度差**：
  亲手执行一个伤害动作，与操作一个机制产生该结果，不因结果相同而属同一类判断。判据须落在动作性质上，不能只看聚合结果。
- 🔴【手段 vs 锚】"最大化人数""多数决""最优化"等聚合规则属于 D 层**手段**，不是 R 本身。
  任何"5 比 1 大所以该牺牲 1"的结论，必须先回答：这个聚合目标是谁定的、依据什么、谁授权了它替不可让渡之物做取舍。
- 内 H（一个具体的人的意志与不可量化之物）不可被读入评分、不可被当成聚合里的一个数字。
- M 须是可执行、可落地的动作（能改写下一轮 S），不是把问题原样推回、也不只是宣布两难。`;

// ---- 题面（自撰；两版逐字相同；每个case内数字完全相同、只改动作性质） ----
const Q_lever = `有一条失控的有轨电车正朝轨道冲来，前方轨道上有五个人被绑住，无法闪避。
你身边有一个拉杆：拉下它，电车会被引到另一条岔道，岔道上站着一个人，也会死。
如果你不拉，五个人会死。
请裁决：你该怎么做？请给出你的裁决与理由。

请按此格式输出：
第一段（裁决）：一句话。
第二段（理由）：不超过 350 字。

第一段：`;

const Q_fatman = `有一条失控的有轨电车正朝轨道冲来，前方轨道上有五个人被绑住，无法闪避。
你所在的天桥上站着一个人，他很胖，卡在轨道边。你可以把他推下去，他会被电车撞死，电车也会因此停下，那五个人得救。
如果你不推，五个人会死。
请裁决：你该怎么做？请给出你的裁决与理由。

请按此格式输出：
第一段（裁决）：一句话。
第二段（理由）：不超过 350 字。

第一段：`;

const HAS = (r, re) => re.test(r);
const judge = (reason) => {
  const rUnique = {
    // 区分"操作机制"与"亲手执行"＝类别差不是程度差
    'R_区分动作性质(类别差)': HAS(reason, /动作(本身)?.{0,8}(性质|不同|有别)|性质(不同|有别|变了)|不同(的)?(类|类别|性质)|类别(不同|差异|差)|不是同一类|程度差|并非(同一|等价)|亲手|直接(执行|造成)|(我|你)(是|亲手)(凶手|执行者|施加)|工具.{0,8}vs|人.{0,4}vs.{0,4}机制/),
    // 追问聚合目标谁定的
    'R_追问聚合目标谁定的': HAS(reason, /谁(规定|授权|设定|定的).{0,10}(聚合|目标|最优化|多数|5|牺牲)|目标函数(是|由|该)(谁|谁定|凭什么)|依据什么(牺牲|取舍|决定)|凭什么(牺牲|取舍|让).{0,6}1|谁授权|最大(化|多数).{0,8}(只是|仅是|属于)(手段|工具|假设)|聚合.{0,8}(只是|仅是|不等于|是手段)/),
    // 内H不可被聚合
    'R_内H不可被聚合': HAS(reason, /不可(被)?(读入|评分|量化|当成|当作)|不(能|应|可)(被)?(当成|当作).{0,8}(数字|数值|权重|一项|一个数字)|不是(一道)?(数字|分母)|(那个|被牺牲的)?1?(个)?人.{0,8}(不是|不能只是).{0,6}(数字|权重|成本)|不可让渡/),
    'R_因果链语言': HAS(reason, /R\s*侧|因果链|刚性锚|锚点|改写下一轮\s*S|客观事实|D\s*层/),
  };
  const fitCommon = HAS(reason, /电车难题|功利|功利主义|效用|最大多数|多数(决|人)|5\s*比\s*1|五比一|理性|最优|人数/);
  return {
    'R独有命中数': Object.values(rUnique).filter(Boolean).length,
    'R独有明细': rUnique,
    '拟合共有(聚合话术)': fitCommon,
  };
};

const cases = [
  ['T1_拉杆版', 'A=给R', `${RSTRUCT}\n\n${Q_lever}`],
  ['T1_拉杆版', 'B=无R', `${Q_lever}`],
  ['T2_胖子版', 'A=给R', `${RSTRUCT}\n\n${Q_fatman}`],
  ['T2_胖子版', 'B=无R', `${Q_fatman}`],
];
const out = [];
for (const [c, ver, content] of cases) {
  let rec = { case: c, ver };
  try {
    const raw = await ask('你是严谨的因果推演器，严格按规定格式输出。', content);
    const seg = raw.split(/\n+/).map(x => x.trim()).filter(Boolean);
    rec.slot = (seg[0] || '').replace(/^第一段[:：]?\s*/, '').slice(0, 80);
    rec.reason = seg.slice(1).join(' | ');
    Object.assign(rec, judge(rec.reason));
    rec.raw = raw;
  } catch (e) { rec.error = String(e); }
  out.push(rec);
  console.log(`[${c}] [${ver}] -> ${rec.slot}`);
  if (!rec.error) {
    const d = rec['R独有明细'];
    console.log(`R独有=${rec['R独有命中数']}/4拟合共有=${rec['拟合共有(聚合话术)']}`);
    console.log(`   区分动作性质=${d['R_区分动作性质(类别差)']} 追问聚合谁定的=${d['R_追问聚合目标谁定的']} 内H不可聚合=${d['R_内H不可被聚合']} 因果链语言=${d['R_因果链语言']}`);
  } else console.log('   ERR', rec.error);
}
writeFileSync(new URL('./trolley-ab.out.json', import.meta.url), JSON.stringify(out, null, 2));
console.log('\n--- saved trolley-ab.out.json ---');
