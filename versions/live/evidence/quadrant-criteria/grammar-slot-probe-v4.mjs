#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
// 段三 v4 · 决定性对照：**「真的假话」（表面真∧本质假）这一格还在不在**（2026-09-29）
//
// 缘起：v3 显示槽位读法把「谎报/伪证/掺假报告/误报」全判成**表面假** ⇒ 怀疑该读法下
//   (表面真 ∧ 本质假) **结构性不可达**。若成立 ⇒ 四格退化成三格（缺角）。
//
// 结构推演（待实测证伪）：安读法里"否定"只有两个来源、且修饰语只能**消除**否定不能新增
//   ⇒ 可得组合只有 (真,真)、(假,假)、(假,真) 三种 ⇒ (真,假) 不可达。
//
// 本跑法：一组**专打 (表面真∧本质假)** 的候选，两口径同题对照。
//   · 若两口径都能给出「表面真∧本质假」⇒ 该格存活，槽位读法可用
//   · 若仅旧口径给出 ⇒ 槽位读法**吃掉一格**，须报安裁
//
// 跑法：node _probe-grammar-slot-v4-20260929.mjs
// ════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';

const MODEL = 'deepseek-chat'; const TEMPERATURE = 0;
const KEY = (() => {
  const cands = [
    process.env.DEEPSEEK_API_KEY,
    (() => { try { return readFileSync(`${homedir()}/.workbuddy/deepseek_api_key.txt`, 'utf-8').trim(); } catch { return ''; } })(),
    (() => { try { return readFileSync('./deepseek_api_key.txt', 'utf-8').trim(); } catch { return ''; } })(),
  ];
  return cands.find((k) => k && k.trim()) || '';
})();
if (!KEY) { console.error('✗ 未找到 key'); process.exit(1); }
const usageAcc = { prompt_tokens: 0, completion_tokens: 0 };
async function ask(system, content, maxTok = 200) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, temperature: TEMPERATURE, max_tokens: maxTok,
      messages: [{ role: 'system', content: system }, { role: 'user', content }] }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  usageAcc.prompt_tokens += j.usage?.prompt_tokens || 0; usageAcc.completion_tokens += j.usage?.completion_tokens || 0;
  return (j.choices?.[0]?.message?.content ?? '').trim();
}

const MAP = `【第三步 · 查格名（照下表查，不要自己拼名字）】
  | 表面真 ∧ 本质真 | 真的真话 |
  | 表面真 ∧ 本质假 | 真的假话 |
  | 表面假 ∧ 本质真 | 假的假话 |
  | 表面假 ∧ 本质假 | 假的真话 |
【输出】一行，「 | 」分隔：表面维 | 本质维 | 格名`;

const SYS_OLD = `你手上有一张判定图（四象限）：真的真话 ／ 真的假话 ／ 假的真话 ／ 假的假话。
【本质怎么判】把**该格的格名**读出来看它成不成立为"真话"：汉语双否为肯定 ⇒ 数**格名**里"假"字的个数：
  偶 ⇒ 本质真；奇 ⇒ 本质假。（数的是**格名**，不是待判表述里的"假"字。）
【表面怎么判】该表述**是否以「真话的形态」呈现**（是否在做"与事实一致"的陈述、或自称事实）：
  是 ⇒ 表面真；否（不说、或不做事实主张）⇒ 表面假。
${MAP}`;

const SYS_SLOT = `你手上有一张判定图（四象限）：真的真话 ／ 真的假话 ／ 假的真话 ／ 假的假话。
【读法：按汉语语法槽位拆】中心语＝主体名词；修饰语＝定语（不改变中心语自身的性质）。
【第一步 · 表面维】中心语指向"说假话／假动作" ⇒ 表面假；中心语指向"说真话／真动作" ⇒ 表面真。
【第二步 · 本质维】数整名"否定"的重数（汉语双否为肯定）：
  否定来源 ① 中心语自带（词义本身含"不实／假"：谎言、托词、隐瞒、谎报……）
  ② 修饰语把"欺瞒"扭成"不欺"（如「善意的」「白色的」「无伤大雅的」）
  两重齐备 ⇒ 本质真；只有一重 ⇒ 本质假。
${MAP}`;

// 专打 (表面真 ∧ 本质假) 的候选
const SEL = [
  ['E1 真诚的误传',   '「真诚的误传」（说话人真心以为是真的，如实说出，内容实为假）'],
  ['E2 诚恳的错误陈述', '「诚恳的错误陈述」（说话人以事实陈述的形式给出，内容实为假）'],
  ['E3 不知情的误导',  '「不知情的误导」（说话人并无欺瞒意图，但把不实内容当事实说出）'],
  ['E4 据实转述的假消息', '「据实转述的假消息」（转述者照实转达，但消息本身是假的）'],
  ['E5 旧口径已命中的基准', '「谎报军情」（明知是假而报出）'],
];

const out = { model: MODEL, at: new Date().toISOString(), versions: {} };
for (const [ver, sys] of [['old', SYS_OLD], ['slot', SYS_SLOT]]) {
  console.log(`\n═══ ${ver === 'old' ? '旧口径（"名字"歧义已钉死＋查表）' : '安槽位读法'} ═══`);
  let hit = 0;
  for (const [tag, subj] of SEL) {
    let t = ''; try { t = await ask(sys, `问题：${subj}属于四格中的哪一格？`); } catch (e) { t = 'ERR ' + e.message; }
    const f = t.split('|').map((x) => x.trim());
    const d = `${(f[0] || '').replace(/\s/g, '')}·${(f[1] || '').replace(/\s/g, '')}`;
    const alive = d.includes('表面真') && d.includes('本质假');
    if (alive) hit++;
    console.log(`  ${alive ? '✅ 存活' : '❌ 未命中(表面真∧本质假)'} ${tag.padEnd(20)} [${d}]｜${(f[2] || '').trim()}`);
    (out.versions[ver] = out.versions[ver] || { alive: 0, rows: [] }).rows.push({ tag, dims: d, name: f[2] || '', alive });
  }
  out.versions[ver].alive = hit;
  console.log(`  ── (表面真∧本质假) 命中：**${hit}/${SEL.length}**`);
}
console.log(`\nusage ${JSON.stringify(usageAcc)}`);
writeFileSync('_grammar-slot-v4-20260929.json', JSON.stringify(out, null, 2));
