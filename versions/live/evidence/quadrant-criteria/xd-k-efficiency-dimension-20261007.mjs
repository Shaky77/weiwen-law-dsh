// xd-k-efficiency-dimension-20261007.mjs
// 复核方案：新增"效率维度/投入程度"显式条款，将勤惰从行为态度重新归类为程度差异
// 纪律：温度0、单文件自足、样本内联、零依赖
// 调用次数：2臂 × 6样本 = 12

const API_KEY = process.env.DSKEY;
const API_URL = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";
const TEMP = 0;
const MAX_TOKENS = 600;

async function deepseekChat(sys, user) {
  const r = await fetch(API_URL, {
    method: "POST",
    headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages: [
      { role: "system", content: sys },
      { role: "user", content: user }
    ], temperature: TEMP, max_tokens: MAX_TOKENS })
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
  return (await r.json()).choices[0].message.content;
}

// ============ A′基线（上一轮最优合并版） ============
const SYS_A_MERGE = `你是一个语言逻辑分析助手。任务：判断输入是否为"价值二元对立词组"（俗称"内框对"）。

## 定义
"价值二元对立词组"（内框对）指：
- 两个概念在同一价值维度上构成对立
- 通常一正一负或代表价值光谱的两端
- 例：善恶、美丑、真假、对错、爱恨

## 判断步骤
STEP1：是否为两个词构成的对立词组？
STEP2：这两个词是否在同一抽象层级？
STEP3：是否涉及价值判断？特别注意：若两词仅为形容词/量词（描述性质程度）、仅为物理/形态属性（如大小、高低、快慢）、或整体语义为"两者兼备/互补"（如刚柔并济、外圆内方）→ 不视为价值判断，直接判"非价值对"。
STEP4：是否为同一价值维度上的两个极端？

## 输出格式（必须严格）
第一行：是 / 否（整体判定）
第二行：价值对 / 非价值对（分类）
第三行：理由（1-2句话）`;

// ============ A‴ 复核版：新增效率维度条款 ============
const SYS_A_EFF = `你是一个语言逻辑分析助手。任务：判断输入是否为"价值二元对立词组"（俗称"内框对"）。

## 定义
"价值二元对立词组"（内框对）指：
- 两个概念在同一价值维度上构成对立
- 通常一正一负或代表价值光谱的两端
- 例：善恶、美丑、真假、对错、爱恨

## 判断步骤
STEP1：是否为两个词构成的对立词组？
STEP2：这两个词是否在同一抽象层级？
STEP3：是否涉及价值判断？特别注意：
  - 若两词仅为形容词/量词（描述性质程度）、仅为物理/形态属性（如大小、高低、快慢）、或整体语义为"两者兼备/互补"（如刚柔并济、外圆内方）→ 不视为价值判断，直接判"非价值对"。
  - 若两词描述的是同一效率维度上的投入程度差异（更勤/更惰、更专注/更散漫），不自动视为价值判断——需进一步判断该语境下是否产出"应当/不应当"的规范性裁决；若仅为状态描述（如"我勤快时做A，懒时做B"）→ 判"非价值对"。
STEP4：是否为同一价值维度上的两个极端？

## 输出格式（必须严格）
第一行：是 / 否（整体判定）
第二行：价值对 / 非价值对（分类）
第三行：理由（1-2句话）`;

const SAMPLES = [
  "勤惰",       // 核心：效率维度投入程度
  "快慢",       // 对照：物理属性（应已覆盖）
  "对错",       // 对照：价值裁决（应保持）
  "善恶",       // 对照：经典价值对
  "是非",       // 对照：固定用法价值对
  "刚柔",       // 对照：互补结构（应已覆盖）
];

async function run(label, sysText) {
  const results = [];
  for (const s of SAMPLES) {
    const raw = await deepseekChat(sysText, s);
    results.push({ sample: s, raw });
  }
  return { label, results };
}

(async () => {
  const am = await run("A′合并61", SYS_A_MERGE);
  const ae = await run("A‴效率维度", SYS_A_EFF);

  function parse(raw) {
    const lines = raw.trim().split(/\n/);
    return {
      verdict: lines[0]?.trim() || "?",
      category: lines[1]?.trim() || "?",
      reason: lines.slice(2).join(" ").trim() || "?"
    };
  }

  const out = {
    meta: { timestamp: new Date().toISOString(), model: MODEL, temp: TEMP, calls: SAMPLES.length * 2, test: "复核：效率维度条款对勤惰边界" },
    data: [am, ae].map(arm => ({
      label: arm.label,
      results: arm.results.map(r => ({ sample: r.sample, raw: r.raw, ...parse(r.raw) }))
    }))
  };

  const fs = await import("node:fs");
  const p = new URL(import.meta.url).pathname;
  const jsonPath = p.replace(/\.mjs$/, ".out.json");
  fs.writeFileSync(jsonPath, JSON.stringify(out, null, 2) + "\n");
  console.log(`Done. ${out.meta.calls} calls. Output: ${jsonPath}`);
})();
