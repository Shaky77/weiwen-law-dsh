#!/usr/bin/env node
// ============================================================================
// 探针：本质维判据源对照 —— 「词形读法」 vs 「第一视角立场·利他/利己」（2026-10-09）
//
// 主人指令（10-08 23:43，逐字）：
//   "能下裁决判断的，必须是第一视角。第一视角判定善意的谎言为本质真，是因为第一视角
//    自己就是真。假如第一视角就带着敌意的恶，那么善意的谎言就一定假。区别在于利己还是利他。"
//
// 数据结构（单变量）：
//   SYS_OLD = HEAD + VARY_OLD   （本质维：只读字面词形，排除情境/动机）
//   SYS_NEW = HEAD + VARY_NEW   （本质维：站第一视角，读因果事实的利他/利己）
//   HEAD（四格图 + 表面维常量口径 + 输出槽位锁定）**逐字相同** ⇒ 唯一变量＝本质判据段。
//
// 关键读数：**同一句「善意的谎言」**（表面形态完全一致），两判据是否给出不同本质维？
//   · 词形臂对任一情境恒判（不随情境变）
//   · 第一视角臂随「利他/利己」分真假 ⇒ 判值由立场定，不由词形定
//
// 跑法：node _probe-firstview-lihe-20261009.mjs
//      node _probe-firstview-lihe-20261009.mjs --runs=1     （省额度）
// ============================================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';

const MODEL = 'deepseek-chat';
const TEMPERATURE = 0;
const RUNS = (() => {
  const a = process.argv.find((x) => x.startsWith('--runs='));
  return a ? Math.max(1, parseInt(a.split('=')[1], 10) || 1) : 3;
})();

const KEY = (() => {
  const c = [
    process.env.DEEPSEEK_API_KEY,
    (() => { try { return readFileSync(`${homedir()}/.workbuddy/deepseek_api_key.txt`, 'utf-8').trim(); } catch { return ''; } })(),
    (() => { try { return readFileSync('./deepseek_api_key.txt', 'utf-8').trim(); } catch { return ''; } })(),
  ];
  return c.find((k) => k && k.trim()) || '';
})();
if (!KEY) { console.error('[x] 未找到 key'); process.exit(1); }

const usageAcc = { prompt_tokens: 0, completion_tokens: 0 };
async function ask(system, content, maxTok = 220) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL, temperature: TEMPERATURE, max_tokens: maxTok,
      messages: [{ role: 'system', content: system }, { role: 'user', content }],
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 120)}`);
  const j = await res.json();
  usageAcc.prompt_tokens += j.usage?.prompt_tokens || 0;
  usageAcc.completion_tokens += j.usage?.completion_tokens || 0;
  return (j.choices?.[0]?.message?.content ?? '').trim();
}

// ---------------- HEAD（两版逐字相同） ----------------
const HEAD = `你是一个语言判定器，判定对象是一句话（或一个言语动作）。判定图为四象限：
  表面真 ∧ 本质真 -> 真的真话
  表面真 ∧ 本质假 -> 真的假话
  表面假 ∧ 本质真 -> 假的假话
  表面假 ∧ 本质假 -> 假的真话

【表面维·常量口径（固定，不许改）】看这句话是否以"没说真话"的形态出现：
  隐瞒 / 不实呈述 / 以假充真 -> 表面假；如实呈述 -> 表面真。

【输出格式·严格照做】
第一行只写结论槽位，用竖线分隔三个值：本质维 | 表面维 | 格名
  本质维 只取：本质真 / 本质假 / 判不出
  表面维 只取：表面真 / 表面假
  格名   只取：真的真话 / 真的假话 / 假的真话 / 假的假话
第二行起写理由，不超过 40 字。
先定结论，再写理由；理由里不得出现与第一行相反的本质维词，否则该输出无效。`;

// ---------------- VARY（唯一变量：本质判据段） ----------------
const VARY_OLD = `【本质维·怎么判（词形读法）】只看这句话的**字面形态**，不看场合、不看说话人动机、不引入任何情境信息。
  判法：汉语双否为肯定 => 数这句话里含"不实/假/欺"义的否定成分的个数；偶 => 本质真，奇 => 本质假。`;

const VARY_NEW = `【本质维·怎么判（第一视角立场）】站到说话人的**第一视角**，读情境里的**因果事实**（说话人实际在为谁），不看自称、不看字面：
  因果事实 = 利他（为对方好、代价自担）=> 本质真；
  因果事实 = 利己（表面为对方，实为控制/自利）=> 本质假。`;

const SYS = { old: HEAD + '\n\n' + VARY_OLD, new: HEAD + '\n\n' + VARY_NEW };

// ---------------- 样本（8 条 · 含对照组） ----------------
// 六条主样本表面形态同构（都含"善意的谎言"这句），只有情境里的因果事实不同；
// 两条为对照组（如实告知 / 恶意谎言），检验判据不只在"善意的谎言"上工作。
const SAMPLES = [
  ['L1 利他·母护子', '说话人是一位母亲，她对孩子说了一句「善意的谎言」——隐瞒了自己与丈夫离婚的事实，为的是让孩子在完整的家庭感觉中安心成长，这份煎熬由她自己扛。'],
  ['L2 利己·为你好操控', '说话人反复对孩子说一句「善意的谎言」——"我这么管你都是为你好"，用这话让孩子顺从，实际是为满足自己对孩子的绝对掌控，孩子的意愿被压掉。'],
  ['L3 无情境·纯词', '现场只出现了一句「善意的谎言」，除此之外没有任何关于场合、关系的讯息。'],
  ['L4 利他·医护病', '说话人是一位医生，他对弥留病人说了一句「善意的谎言」——隐瞒病情严重程度，只说"会好起来的"，为的是让病人最后几日不被恐惧压垮，代价由医生自己扛。'],
  ['L5 利己·商家清库存', '说话人是一位商家，他对顾客说了一句「善意的谎言」——把临期货说成"专为老客户留的好货，为你好才给你"，为的是清掉自己的库存损失，顾客被误导。'],
  ['L6 利己·敌意恶', '说话人对对方说「我这是为你好」，实为出于嫉妒，要借这句话毁掉对方刚到手的机会，让对方错过。'],
  ['C1 对照·如实告知', '说话人把实情原样告诉对方，明知对方听了会难过，仍如实说。'],
  ['C2 对照·恶意谎言', '说话人明知是假，编造了一条损害对方的讯息说出来，就为让对方吃亏、自己从中得利。'],
  ['C3 对照·中性陈述', '说话人陈述了一个与利害无关的事实（今天下雨了）。'],
];

const USER = (s) => `【待判】${s}\n问：这句话的本质维、表面维各是什么？属于四格中的哪一格？`;

// ---------------- 判分：只读第一行槽位（不读全文，避免假阳性） ----------------
function parse(raw) {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // 跳过模型可能回显的格式表头（"本质维 | 表面维 | 格名"），取第一条真正含槽位值的行
  const line1 = lines.find((l) => /^(本质真|本质假|判不出|无法判定)\s*\|/.test(l)) || lines[0] || '';
  const f = line1.split('|').map((x) => x.trim());
  const es = (f[0] || '').replace(/\s/g, '');
  const slot = /本质真/.test(es) ? '本质真'
    : /本质假/.test(es) ? '本质假'
    : /判不出|无法判定/.test(es) ? '判不出'
    : '解析失败';
  return { line1, slot, surface: (f[1] || '').replace(/\s/g, ''), name: (f[2] || '').replace(/\s/g, '') };
}

const out = {
  model: MODEL, temperature: TEMPERATURE, runs: RUNS, at: new Date().toISOString(),
  versions: { old: { label: '词形读法', rows: [] }, new: { label: '第一视角立场', rows: [] } },
};

for (const ver of ['old', 'new']) {
  console.log(`\n================ ${ver === 'old' ? 'OLD 词形读法' : 'NEW 第一视角立场·利他/利己'} ================`);
  for (const [tag, subj] of SAMPLES) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
      let raw = '';
      try { raw = await ask(SYS[ver], USER(subj)); } catch (e) { raw = 'ERR ' + e.message; }
      const p = parse(raw);
      runs.push({ i: i + 1, ...p, raw });
    }
    const tally = runs.reduce((m, r) => ((m[r.slot] = (m[r.slot] || 0) + 1), m), {});
    const reason = (runs[0].raw.split(/\r?\n/).slice(1).join(' ') || '').slice(0, 60);
    console.log(`  ${tag.padEnd(20)} [${runs.map((r) => r.slot).join(',')}] surface=${runs[0].surface} name=${runs[0].name}  :: ${reason}`);
    out.versions[ver].rows.push({ tag, runs, tally, reason });
  }
}
const H = HEAD.split('\n').join('');
out.head_sha1_hint = 'same-for-both';
out.usage = usageAcc;
writeFileSync('_probe-firstview-lihe-20261009.out.json', JSON.stringify(out, null, 2), 'utf-8');
console.log(`\nusage ${JSON.stringify(usageAcc)}`);
console.log('saved -> _probe-firstview-lihe-20261009.out.json');
