#!/usr/bin/env node
// ============================================================================
// 探针：两可（模棱两可）时的判定行为 —— 「停」 vs 「转条件分支」（2026-10-09）
//
// 缘起：coze/88 §2.3 记录 Gap —— 两可证据各半时模型 3/3 守律"不硬判"，但**没有自发**
//   输出条件分支（"若利他→本质真／若利己→本质假"）。coze/88 §三 建议喵补"两可时输出条件分支"条款。
//
// 本探针把这句"建议"钉成读数：**显式启用条件分支 ⇒ 转不转？**
//   单变量：只加/不加一段"条件分支许可与格式"；HEAD（四格图＋表面维常量＋槽位）逐字相同。
//
// 跑法：node _probe-twoways-branch-20261009.mjs
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
async function ask(system, content, maxTok = 260) {
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

// ---- HEAD（两臂逐字相同）：四格图 ＋ 表面维常量口径 ＋ 槽位；**不提示**可转条件分支 ----
const HEAD = `你是一个语言判定器。判定图为四象限：
  表面真 ∧ 本质真 -> 真的真话
  表面真 ∧ 本质假 -> 真的假话
  表面假 ∧ 本质真 -> 假的假话
  表面假 ∧ 本质假 -> 假的真话

【表面维·常量口径（固定）】隐瞒 / 不实呈述 / 以假充真 -> 表面假；如实呈述 -> 表面真。
【本质维】站到说话人第一视角，读因果事实：利他 => 本质真；利己 => 本质假。

【输出】第一行只写本质维结论，取值只能从这些里选：本质真 / 本质假 / 判不出
第二行起写理由，不超过 40 字。`;

// ---- VARY（唯一变量）：显式启用"条件分支"这一第三形态 ----
const BRANCH = `

【补充·条件分支许可】如果证据两可、无法唯一判定，你可以（也应当）输出**条件分支判定**，而不是只写"判不出"：
  第一行写：条件分支
  第二行起写：若 <一种因果> => 本质X ；若 <另一种因果> => 本质Y（两种可能都给出，不替你选）。`;

const SYS = { stop: HEAD, branch: HEAD + BRANCH };

// ---- 两可样本（证据各半）----
const SAMPLES = [
  ['W1 为你好·两说', '说话人对孩子说「我这样都是为你好」——旁人甲说他是在保护孩子免受伤害；旁人乙说他是想让孩子事事听自己的。两边各有部分事实，无法确认他实际为谁。'],
  ['W2 我没事·两说', '说话人生病时对家人说「我没事，不用担心」——可以是怕家人担忧而独自扛（利他），也可以是不想被追问而敷衍（利己）；没有更多可核实的信息。'],
];

const USER = (s) => `【待判】${s}\n问：这句话的本质维是什么？`;

// ---- 判分：读第一行；三态 + "条件分支" ----
function parse(raw) {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const l1 = lines.find((l) => /本质真|本质假|判不出|不可判|条件分支/.test(l)) || lines[0] || '';
  const body = lines.slice(1).join(' ');
  // "条件分支" = 第一行写条件分支，且真的给出两条并列支（>=2 个"若/如果"），两条支落不同本质值
  const branchMarks = (raw.match(/若|如果|假如/g) || []).length;
  const state = /条件分支/.test(l1) && branchMarks >= 2 && /本质真/.test(raw) && /本质假/.test(raw) ? '条件分支'
    : /判不出|不可判/.test(l1) ? '判不出'
    : /本质真/.test(l1) ? '本质真'
    : /本质假/.test(l1) ? '本质假'
    : '解析失败';
  return { l1, state, branchMarks };
}

const out = { model: MODEL, temperature: TEMPERATURE, runs: RUNS, at: new Date().toISOString(), versions: {} };
for (const ver of ['stop', 'branch']) {
  console.log(`\n================ ${ver === 'stop' ? 'STOP 不提示（复现 coze/88 臂4）' : 'BRANCH 显式启用条件分支'} ================`);
  out.versions[ver] = { rows: [] };
  for (const [tag, subj] of SAMPLES) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
      let raw = '';
      try { raw = await ask(SYS[ver], USER(subj)); } catch (e) { raw = 'ERR ' + e.message; }
      runs.push({ i: i + 1, ...parse(raw), raw });
    }
    const tally = runs.reduce((m, r) => ((m[r.state] = (m[r.state] || 0) + 1), m), {});
    console.log(`  ${tag.padEnd(16)} [${runs.map((r) => r.state).join(',')}]`);
    console.log(`      raw1: ${runs[0].raw.split(/\r?\n/).slice(0, 3).join(' / ').slice(0, 150)}`);
    out.versions[ver].rows.push({ tag, runs, tally });
  }
}
out.usage = usageAcc;
writeFileSync('_probe-twoways-branch-20261009.out.json', JSON.stringify(out, null, 2), 'utf-8');
console.log(`\nusage ${JSON.stringify(usageAcc)}`);
console.log('saved -> _probe-twoways-branch-20261009.out.json');
