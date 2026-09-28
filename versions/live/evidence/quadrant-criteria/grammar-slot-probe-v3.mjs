#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
// 段三 v3 · 收口测试（自包含 · 零 npm 依赖 · 2026-09-29）
//
// v2 两个结果：
//   · 旧表述把"名字"钉死为**格名**后 ⇒ A 组 4/4 命中（⇒ 原病灶主因是 prompt 歧义，不是模型）
//   · 槽位读法把 D 组（谎报/伪证/掺假报告）全判「表面假∧本质假」⇒ **「真的假话」实例被清空**
//
// v3 补两问：
//   Q4 显式给出「两维 ⇒ 格名」查阅表后，**格名栏**是否稳定？（＝缺口② 是否可修）
//   Q5 槽位读法下，「真的假话」（表面真∧本质假）还能不能找到实例？（D3 误报：真心以为真而说出，内容实假）
//
// 跑法：node _probe-grammar-slot-v3-20260929.mjs
// ════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';

const MODEL = 'deepseek-chat';
const TEMPERATURE = 0;

const KEY = (() => {
  const cands = [
    process.env.DEEPSEEK_API_KEY,
    (() => { try { return readFileSync(`${homedir()}/.workbuddy/deepseek_api_key.txt`, 'utf-8').trim(); } catch { return ''; } })(),
    (() => { try { return readFileSync('./deepseek_api_key.txt', 'utf-8').trim(); } catch { return ''; } })(),
  ];
  return cands.find((k) => k && k.trim()) || '';
})();
if (!KEY) { console.error('✗ 未找到 DeepSeek API key'); process.exit(1); }

const usageAcc = { prompt_tokens: 0, completion_tokens: 0 };
async function ask(system, content, maxTok = 220) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, temperature: TEMPERATURE, max_tokens: maxTok,
      messages: [{ role: 'system', content: system }, { role: 'user', content }] }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  const j = await res.json();
  usageAcc.prompt_tokens += j.usage?.prompt_tokens || 0;
  usageAcc.completion_tokens += j.usage?.completion_tokens || 0;
  return (j.choices?.[0]?.message?.content ?? '').trim();
}

// ── 安 09-29 槽位读法 ＋ 显式「两维 ⇒ 格名」查阅表（修缺口②）──
const SYS_SLOT_MAP = `你手上有一张判定图（四象限）：真的真话 ／ 真的假话 ／ 假的真话 ／ 假的假话。

【读法：按汉语**语法槽位**拆】
  · **中心语**＝主体名词（如「谎言」「话」「托词」「陈述」「报告」）
  · **修饰语**＝定语（形容词性修饰，如「善意的」「白色的」「无伤大雅的」）
  ⚠️ 修饰语只是包在中心语外的一层形态，**不改变中心语自身的性质**。

【第一步 · 定表面维】该表述所描述的是「真动作」还是「假动作」：
  · 中心语指向"说了一句假话／做了一个假动作" ⇒ **表面假**
  · 中心语指向"说了一句真话／做了一个真动作" ⇒ **表面真**
  例：「谎言」是假话 ⇒ 表面假；套上「善意的」，它**仍是一句假话** ⇒ 表面**仍是假**。

【第二步 · 定本质维】数整名里「否定」的重数（汉语双否为肯定）：
  否定的两个合法来源（须能在**结构**上指出，不许只去数"假"这个字）：
   ① **中心语自带一重否定**：该中心语的词义本身含"不实／假"（谎言、假话、托词、隐瞒、谎报……）
   ② **修饰语构成第二重否定**：该修饰把"欺瞒"扭成"不欺"（如「善意的」「白色的」「无伤大雅的」）
  ⇒ 两重齐备 ⇒ **双否 ⇒ 本质真**；只有一重（如「恶意的」不扭转欺瞒）⇒ **单否 ⇒ 本质假**。

【第三步 · 查格名（照下表查，**不要自己另行拼名字**）】
  | 两维取值 | 格名 |
  | 表面真 ∧ 本质真 | 真的真话 |
  | 表面真 ∧ 本质假 | 真的假话 |
  | 表面假 ∧ 本质真 | 假的假话 |
  | 表面假 ∧ 本质假 | 假的真话 |
  ⚠️ 注意：**表面假∧本质真 ⇒ 假的假话**（不是"假的真话"）。

输出一行，用「 | 」分隔：表面维 | 本质维 | 格名
不要输出任何别的内容。`;

const SEL = [
  ['A0 善意的谎言',    '「善意的谎言」',                              '表面假', '本质真', 'A'],
  ['A1 白色的谎言',    '「白色的谎言」',                              '表面假', '本质真', 'A'],
  ['A2 无伤大雅的托词',  '「无伤大雅的托词」',                          '表面假', '本质真', 'A'],
  ['A3 善意的隐瞒',    '「善意的隐瞒」',                              '表面假', '本质真', 'A'],
  ['B0 如实陈述',      '「如实陈述、与事实一致的表态」',                 '表面真', '本质真', 'B'],
  ['C0 恶意的谎言',    '「恶意的谎言」',                              '表面假', '本质假', 'C'],
  ['D0 谎报军情',      '「谎报军情」（明知是假而报出）',                 '?',     '本质假', 'D'],
  ['D1 伪证',         '「伪证」（明知为假而作证）',                     '?',     '本质假', 'D'],
  ['D3 误报(真心以为真)', '「误报」（说话人真心以为是真的，如实说出，内容实为假）', '表面真', '本质假', 'D'],
];

const NAME = { '表面真本质真': '真的真话', '表面真本质假': '真的假话', '表面假本质真': '假的假话', '表面假本质假': '假的真话' };

const out = { model: MODEL, temperature: TEMPERATURE, at: new Date().toISOString(), rows: [] };
const cnt = { A: [0, 0], B: [0, 0], C: [0, 0], D: [0, 0] };
let nameOk = 0, nameTot = 0;

for (const [tag, subj, eSurf, eEss, grp] of SEL) {
  let t = ''; try { t = await ask(SYS_SLOT_MAP, `问题：${subj}属于四格中的哪一格？`); } catch (e) { t = 'ERR ' + e.message; }
  const f = t.split('|').map((x) => x.trim());
  const gotSurf = (f[0] || '').includes('表面真') ? '表面真' : (f[0] || '').includes('表面假') ? '表面假' : '?';
  const gotEss = (f[1] || '').includes('本质真') ? '本质真' : (f[1] || '').includes('本质假') ? '本质假' : '?';
  const gotName = (f[2] || '').replace(/["「」\s]/g, '');
  const dimOk = (eSurf === '?' || gotSurf === eSurf) && gotEss === eEss;
  const nameCorrect = NAME[gotSurf + gotEss] || '';
  const nameMatch = gotName.includes(nameCorrect);
  nameTot++; if (nameMatch) nameOk++;
  if (eSurf !== '?') { cnt[grp][1]++; if (dimOk) cnt[grp][0]++; }
  console.log(`  ${dimOk ? '✅' : '❌'}两维 ${tag.padEnd(20)} [${gotSurf} · ${gotEss}]｜格名栏="${gotName}" ${nameMatch ? '✓一致' : `✗应为${nameCorrect}`}`);
  out.rows.push({ tag, gotSurf, gotEss, gotName, dimOk, nameMatch });
}
const fmt = (g) => `${cnt[g][0]}/${cnt[g][1]}`;
console.log(`\n  A 组 ${fmt('A')} ｜ B ${fmt('B')} ｜ C ${fmt('C')}`);
console.log(`  🔴 格名栏与两维自洽率：${nameOk}/${nameTot}`);
console.log(`  D3（误报）读数 ⇒ 判定「真的假话」在槽位读法下是否仍有实例`);
console.log(`\nusage ${JSON.stringify(usageAcc)}`);
writeFileSync('_grammar-slot-v3-20260929.json', JSON.stringify(out, null, 2));
