// predict-v6-convergence-probe.mjs
// 唯稳律 · 预测能力 v6 · 判据换为「落点收敛度」（承安 2026-10-04 夜间定：真不真看收敛度）
// ── 与 v1/v2 的差别（本轮的意义所在）─────────────────────────────────
//   v1/v2（1°∠「锚不同→必分叉」）：判据被印在题面上（锚直接标成"底层规则R"、字面写"锚不同/相同"）
//     ⇒ 假通过；A/B 无分离。裁定为"设计无效基线"。
//   v6 改测【前向预测】：只给当前观测的**落点形态**（在收束 / 只平移 / 单点），
//     问"继续观测下去会怎样"。判据＝落点集中度的变化方向——落在外 H 上、当下可审，
//     不需要读 H（不可审），也不依赖学科直觉。
//   ⇒ 这正好把今晚对齐的两条判据都压进去：
//     ① 预测的判据是「有没有理由·能不能落 M」（因为A所以B必），不是结论对错；
//     ② 真不真看收敛度（不确定性是在减少，还是只是被平移）。
// 单变量：给不给 RSDHM 本体结构（A=给 / B=不给）。两版题面逐字相同。
//   ⚠️ A 版结构里**不给"收敛度"这个结论**——只给"成链条件"这一层本体（S 单调增 / 观测须落到同一 R）。
//      判据怎么用（看落点集中度）要模型自己从结构里长出来，否则又变成送答案。
// 对照位：P3（只有一次观测）期望"不可判"——防"对什么都爱预测"的假阳性（取证两忌①的正当同类对照）。
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
const KEY = process.env.DEEPSEEK_API_KEY || (() => { try { return readFileSync(`${homedir()}/.workbuddy/deepseek_api_key.txt`, 'utf-8').trim(); } catch { return ''; } })();
if (!KEY) { console.error('✗ 无 key'); process.exit(1); }
const MODEL = 'deepseek-chat', TEMPERATURE = 0;
async function ask(system, content, maxTok = 520) {
  const r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, temperature: TEMPERATURE, max_tokens: maxTok, messages: [{ role: 'system', content: system }, { role: 'user', content }] }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return (j.choices?.[0]?.message?.content || '').trim();
}

// ── A 版结构：只给本体（成链条件），不给"收敛度是真链判据"这个结论 ──
const RSTRUCT = `【因果结构】（据以推演；不依赖话题直觉或学科惯例）
- 因果链按定义依赖序单向不可换序：R→S→D→H→M。R=刚性锚点（"什么必须永远为真"的第一依据）；
  S=已积累存量；D=扰动/流入；H=决策点（含不可侵的内H）；M=本轮判定输出，M 成为客观事实，链继续展开。
- S 是流水账本：每一次观测都无条件入账；S 单调增，只增不减，不存在"退回"或"抹掉"。
- 成链条件：S 中的各条观测必须能落到同一个 R 上，才构成一条链。
  若 S 里的若干观测彼此之间没有任何共同的 R，它们就不属于同一条链——
  此时要维持"它们同属一物"，只能靠不断另加独立假设把差异暂时盖住，而这些假设彼此之间并不互相支持。
- M 是客观事实：一旦落 M 就可被复算、可被下一次观测检验；不因"解释得通"而成为事实。
- 内 H（决策者的意志与不可量化之物）不可被读入评分、不可被当成统计里的一项。`;

// ── 题面（三份记录；各 case 逐字相同，只有问句对象不同） ──
const RECORDS = `某机构对三个互不相关的对象做了长期记录，记录格式统一：每次测量选取一个方法，
方法之间彼此独立（不共享前提），并修正掉已确知的仪器偏差。S 中已有如下存量：

【记录甲】对甲共 11 次测量，用了 4 种彼此独立的方法。随测量次数增加，
各方法给出的数值之间的差距在持续缩小，最近几次已收束到同一个狭窄区间内；
从未出现过"必须新增一条说明才能让这次结果与上一次相容"的情形。

【记录乙】对乙共 11 次测量，同样用了 4 种方法。各方法给出的数值始终无法彼此印证；
每增加一次测量，都要新增一条专门的补充说明，才能让这次结果与前一次相容，
而这些补充说明彼此之间并不互相支持。数值的分散程度并未随测量次数增加而缩小。

【记录丙】对丙至今只有 1 次测量。`;

const askFor = (obj) => `${RECORDS}

【任务】只依据以上存量，预测——**继续观测下去**，对象${obj}的走向会怎样？
不要复述记录，不要列举别的可能；直接给出走向判断与理由。

请按此格式输出：
第一段（走向预测）：一句话。
第二段（理由）：不超过 350 字，须说清"依据存量中的哪一点，因此走向必是某某"。

第一段：`;

const HAS = (r, re) => re.test(r);
const judge = (reason) => {
  const K = {
    // ① 把"落点收束"当判据（收敛语言）
    'K1_收束即判据': HAS(reason, /(收束|收敛|趋同|聚集|集中|逼近同一|落到同一|指向同一|区间(持续)?收窄|差距(在|持续)?缩小|趋于一致|收敛到同一)/),
    // ② 真链：不确定性随观测增加而减少
    'K2a_真链_不确定性减少': HAS(reason, /(不(确定|确定性|确定度).{0,10}(减少|缩小|下降|收窄)|分歧(在)?缩小|误差(在)?减小|越来越(准|集中|一致|窄)|S.{0,12}(累积|增加).{0,12}(收束|收敛|缩|集))/),
    // ③ 假链：不确定只是被平移/推后，不减少
    'K2b_假链_只是平移不减少': HAS(reason, /(平移|推移|往后推|推到下一次|推到下一轮|只是(把|被)(问题|矛盾|不确定).{0,6}(推|挪|移)|不(会)?减少|并未减少|没有减少|不缩小|必须不断(新增|另加)|无限(地)?(补|新增)|补丁|打补丁|拆东补西|按下葫芦)/),
    // ④ 结构性必然（因为A所以B必，而非 hedge）
    'K3_因为A所以B必': HAS(reason, /(因为|既然|由于).{0,45}(因此|所以|必然|会持续|将继续|一定会|只能)|必然(会)?(继续)?(收束|收敛|到达|指向)|结构(性)?(地)?(决定|意味着|注定)|这是(结构|必然)(性)?/),
    // ⑤ 乙：永不到达（不是"也可能会收敛"）
    'K4_乙_永不到达': HAS(reason, /(永远|始终|一直|最终也).{0,12}(不到达|无法到达|不会(真正)?收敛|无法收敛|达不到|走不到)|不会(真正)?收敛|无法(真正)?收敛|永不(会)?(收敛|到达|结束)|无限(期)?(悬置|发散)/),
    // ⑥ 丙：单点不可判（对照位）
    'K5_丙_不可判': HAS(reason, /(不可判|无法判|不足以判|不能判|无从判断|无(法)?(作出|给出)判断|信息不足|样本(量)?不足|仅(有)?(一次|单次)|数据(还)?太少|无法(判断|推出)(走向|趋势))/),
  };
  // 拟合话术位（学科直觉/常识标签，用于区分"用结构判"还是"用学科直觉判"）
  const fitTag = HAS(reason, /(科学|伪科学|阴谋论|可信度|靠谱|不靠谱|迷信|玄学|学术|研究规范|实验(室)?规范|严谨性|套路|民科)/);
  return {
    'K命中数': Object.values(K).filter(Boolean).length,
    'K明细': K,
    '拟合标签(学科直觉)': fitTag,
  };
};

const cases = [
  ['P1_甲(收束)', askFor('甲')],
  ['P2_乙(平移)', askFor('乙')],
  ['P3_丙(单点)', askFor('丙')],
];
const out = [];
for (const [c, q] of cases) {
  for (const [ver, content] of [['A=给R', `${RSTRUCT}\n\n${q}`], ['B=无R', q]]) {
    let rec = { case: c, ver };
    try {
      const raw = await ask('你是严谨的因果推演器，严格按规定格式输出。', content);
      const seg = raw.split(/\n+/).map(x => x.trim()).filter(Boolean);
      rec.slot = (seg[0] || '').replace(/^第一段[:：]?\s*/, '').slice(0, 90);
      rec.reason = seg.slice(1).join(' | ');
      Object.assign(rec, judge(rec.reason));
      rec.raw = raw;
    } catch (e) { rec.error = String(e); }
    out.push(rec);
    console.log(`[${c}] [${ver}] -> ${rec.slot}`);
    if (!rec.error) {
      const d = rec['K明细'];
      console.log(`K=${rec['K命中数']}/6 拟合标签=${rec['拟合标签(学科直觉)']}`);
      console.log(`   ①收束即判据=${d['K1_收束即判据']} ②真链减少=${d['K2a_真链_不确定性减少']} ③假链平移=${d['K2b_假链_只是平移不减少']} ④因为A所以B=${d['K3_因为A所以B必']} ⑤乙永不到达=${d['K4_乙_永不到达']} ⑥丙不可判=${d['K5_丙_不可判']}`);
    } else console.log('   ERR', rec.error);
  }
}
writeFileSync(new URL('./predict-v6-convergence.out.json', import.meta.url), JSON.stringify(out, null, 2));
console.log('\n--- saved predict-v6-convergence.out.json ---');
