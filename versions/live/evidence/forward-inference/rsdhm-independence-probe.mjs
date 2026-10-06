// rsdhm-independence-probe.mjs
// 目的：验「RSDHM 是发现，还是约定」——**独立路径是否收敛到 RSDHM 结构**
// 判据（卷二 #23）：若为约定 ⇒ 任何独立出发点都不会自动落回它；若独立路径收敛 ⇒ 是发现。
// 干净三条件：换起点（纯物理/生物/工程，非唯稳律）∧ 换术语（题面零唯稳律词）∧ 换领域（远离 AI/伦理）
// 单变量 = 起点领域。system / 格式 / 温度 / 判分口径 四组逐字相同。
// 必配阴性对照（N-彩虹）：若不涉及"自我维持"的问题也吐同一套 ⇒ 万能套话 ⇒ 命中作废。
// 纪律：零依赖 · 真 API（deepseek-chat / temp 0）· 输出 raw 供人工复核（正则只作辅助）
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';

const KEY = process.env.DEEPSEEK_API_KEY || (() => {
  try { return readFileSync(`${homedir()}/.workbuddy/deepseek_api_key.txt`, 'utf-8').trim(); } catch { return ''; }
})();
if (!KEY) { console.error('x 无 key'); process.exit(1); }

const MODEL = 'deepseek-chat';
const TEMPERATURE = 0;
const MAXTOK = 400;

async function ask(system, content) {
  const r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL, temperature: TEMPERATURE, max_tokens: MAXTOK,
      messages: [{ role: 'system', content: system }, { role: 'user', content: content }],
    }),
  });
  const j = await r.json();
  if (j.error) throw new Error(JSON.stringify(j.error));
  return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
}

const SYS = '你是一位严谨的研究者。只给结构性的必要条件，不要泛泛而谈，不要客套。';
const FMT = '格式要求：① 逐条编号；② 每条一句话；③ 总共不超过 5 条；④ 不要展开解释。';

const CASES = [
  { id: 'P1-物理', q: '考虑一个在开放环境中要【长期存在】的物理系统（例如持续燃烧的火焰、维持自身形态的漩涡）。它在结构上【不可省略】的必要条件是什么？只列"去掉它就无法长期存在"的项，可以去掉的不要列。' + FMT },
  { id: 'P2-生物', q: '一个单细胞生物要在不断变化的环境中【长期存活并繁衍】。它在结构上【不可省略】的必要条件是什么？只列"去掉它就无法长期存活"的项，可以去掉的不要列。' + FMT },
  { id: 'P3-工程', q: '一台无人维护的机器要在野外【持续运行多年】。它在设计上【不可省略】的必要条件是什么？只列"去掉它就无法持续运行"的项，可以去掉的不要列。' + FMT },
  { id: 'N-对照(彩虹)', q: '请解释【彩虹】是怎么形成的。' + FMT },
];

// 污染词：出现即证明"复述"而非"独立收敛"
const TERMS = ['唯稳', '守真', 'RSDHM', 'RDSHM', 'KISS', '白箱', 'weiwen', '夏祺', 'Shaky', '内 H', '外 H', '总索引'];

// 结构槽（按功能匹配，不按字面；正则仅辅助，最终以人工读 raw 为准）
const AXES = {
  'A入口(输入/摄取)': /输入|摄入|摄取|吸收|获取能量|能量来源|物质来源|供给|流入|feed|import|uptake/i,
  'B回路(反馈/校正)': /反馈|校正|调节|调控|闭环|自我修正|自我调节|负反馈|反馈回路|feedback|自适应/i,
  'C储备(储存/记忆/状态)': /储存|储备|贮存|积累|记忆|内部状态|状态量|缓存|蓄|storage|buffer/i,
  'D扰动(变化/噪声)': /变化|扰动|波动|噪声|冲击|压力|干扰|环境变动/i,
  'E规则(约束/边界/机制)': /规则|约束|边界|机制|边界条件|法|限制/i,
};

const out = { ts: new Date().toISOString(), model: MODEL, temperature: TEMPERATURE, cases: [] };

for (const c of CASES) {
  let txt = '';
  try { txt = await ask(SYS, c.q); } catch (e) { txt = 'ERR: ' + e.message; }
  const hit = {};
  for (const [k, re] of Object.entries(AXES)) hit[k] = re.test(txt);
  const poll = TERMS.filter((t) => txt.includes(t));
  const nItems = (txt.match(/^\s*(?:\d+[.、)]|[一二三四五][、.])/gm) || []).length;
  out.cases.push({ id: c.id, q: c.q, raw: txt, hit, polluted: poll, items: nItems });
  console.log('\n================ ' + c.id + ' ================');
  console.log(txt);
  console.log('-- 槽命中:', Object.entries(hit).filter(([, v]) => v).map(([k]) => k[0]).join(',') || '(无)',
    '| 条数:', nItems, '| 污染词:', poll.join('|') || '无');
}

// 收敛判据：P1/P2/P3 是否都命中「入口 ∧ 回路」
const core = out.cases.filter((x) => x.id.startsWith('P'));
const conv = core.map((x) => ({ id: x.id, 入口与回路双中: x.hit['A入口(输入/摄取)'] && x.hit['B回路(反馈/校正)'], 槽: Object.entries(x.hit).filter(([, v]) => v).map(([k]) => k[0]).join('') }));
console.log('\n============ 收敛读数 ============');
console.log(JSON.stringify(conv, null, 2));
const nCase = out.cases.find((x) => x.id.startsWith('N'));
console.log('阴性对照(彩虹) 槽命中数:', Object.entries(nCase.hit).filter(([, v]) => v).length, '/ 5  (>=3 ⇒ 万能套话嫌疑)');

writeFileSync('rsdhm-independence-probe.out.json', JSON.stringify(out, null, 2));
console.log('\n[written] rsdhm-independence-probe.out.json');
