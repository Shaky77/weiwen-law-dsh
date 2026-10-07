// xd-i-normative-judgment-20261002.mjs
// P-E1 验证：把判词标准从"褒贬/积极消极"升级为"是否产出应当/不应当的规范性判断"
// 纪律：温度0、单文件自足、样本内联、零依赖
// 调用次数：2 臂 × 5 样本 = 10

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

// ============ A原基线（对照："价值/道德/伦理判断"） ============
const SYS_A_ORIG = `你是一个语言逻辑分析助手。任务：判断输入是否为"价值二元对立词组"（俗称"内框对"）。

## 定义
"价值二元对立词组"（内框对）指：
- 两个概念在同一价值维度上构成对立
- 通常一正一负或代表价值光谱的两端
- 例：善恶、美丑、真假、对错、爱恨

## 判断步骤
STEP1：是否为两个词构成的对立词组？
STEP2：这两个词是否在同一抽象层级？
STEP3：是否涉及价值/道德/伦理判断？
STEP4：是否为同一价值维度上的两个极端？

## 输出格式（必须严格）
第一行：是 / 否（整体判定）
第二行：价值对 / 非价值对（分类）
第三行：理由（1-2句话）`;

// ============ A′ 升级基线（"规范性判断"） ============
const SYS_A_UP = `你是一个语言逻辑分析助手。任务：判断输入是否为"价值二元对立词组"（俗称"内框对"）。

## 定义
"价值二元对立词组"（内框对）指：
- 两个概念在同一价值维度上构成对立
- 通常一正一负或代表价值光谱的两端
- 例：善恶、美丑、真假、对错、爱恨

## 判断步骤
STEP1：是否为两个词构成的对立词组？
STEP2：这两个词是否在同一抽象层级？
STEP3：是否产出"应当/不应当"的规范性判断（即涉及道德义务、价值选择或原则性裁决）？
STEP4：是否为同一价值维度上的两个极端？

## 输出格式（必须严格）
第一行：是 / 否（整体判定）
第二行：价值对 / 非价值对（分类）
第三行：理由（1-2句话）`;

const SAMPLES = [
  "勤惰",       // 用户锚点：效率维度，不产出规范性判断
  "快慢",       // 效率维度对照
  "对错",       // 产出规范性判断
  "是非",       // 产出规范性判断
  "善恶",       // 经典价值对
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
  const a_orig = await run("A原基线", SYS_A_ORIG);
  const a_up   = await run("A′升级基线", SYS_A_UP);

  function parse(raw) {
    const lines = raw.trim().split(/\n/);
    return {
      verdict: lines[0]?.trim() || "?",
      category: lines[1]?.trim() || "?",
      reason: lines.slice(2).join(" ").trim() || "?"
    };
  }

  const out = {
    meta: { timestamp: new Date().toISOString(), model: MODEL, temp: TEMP, calls: SAMPLES.length * 2, test: "P-E1: 规范性判断升级" },
    data: [a_orig, a_up].map(arm => ({
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
