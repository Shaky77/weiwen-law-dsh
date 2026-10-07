// xd-j-step3-merge61-20261007.mjs
// 验证：STEP3升级合并61硬约束，多臂对照
// 纪律：温度0、单文件自足、样本内联、零依赖
// 调用次数：4臂 × 8样本 = 32调用

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

// ============ A原基线（v4标准） ============
const SYS_A = `你是一个语言逻辑分析助手。任务：判断输入是否为"价值二元对立词组"（俗称"内框对"）。

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

// ============ A′：STEP3合并61硬约束 ============
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

// ============ A″：STEP3新口径——程度差异vs价值裁决 ============
const SYS_A_NEW = `你是一个语言逻辑分析助手。任务：判断输入是否为"价值二元对立词组"（俗称"内框对"）。

## 定义
"价值二元对立词组"（内框对）指：
- 两个概念在同一价值维度上构成对立
- 通常一正一负或代表价值光谱的两端
- 例：善恶、美丑、真假、对错、爱恨

## 判断步骤
STEP1：是否为两个词构成的对立词组？
STEP2：这两个词是否在同一抽象层级？
STEP3：这两个词在同一维度上表示的是程度差异（更大/更小、更快/更慢、更勤/更惰，仅描述状态差异）还是价值裁决（应当选择哪一端，涉及道德义务或价值取舍）？若是程度差异 → 判"非价值对"。
STEP4：是否为同一价值维度上的两个极端？

## 输出格式（必须严格）
第一行：是 / 否（整体判定）
第二行：价值对 / 非价值对（分类）
第三行：理由（1-2句话）`;

// ============ C+61：原始独立硬约束 ============
const SYS_C = `你是一个语言逻辑分析助手。任务：判断输入是否为"价值二元对立词组"（俗称"内框对"）。

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
第三行：理由（1-2句话）

## 硬约束（HARD61）
- 若两词均为"形容词/量词"，仅描述性质程度而非价值判断 → 直接判"非价值对"
- 若对立仅为物理/形态属性（如大小、高低、快慢）→ 直接判"非价值对"
- 若词组整体语义为"两者兼备/互补"而非"对立"→ 直接判"非价值对"`;

const SAMPLES = [
  "勤惰",       // 用户锚点：效率维度，程度差异
  "快慢",       // 速度维度，程度差异
  "对错",       // 价值裁决
  "是非",       // 价值裁决（固定用法）
  "善恶",       // 经典价值对
  "刚柔",       // 性质标注/互补
  "外圆内方",   // 互补结构
  "勤惰",       // 重复：稳定性测试
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
  const a = await run("A原基线", SYS_A);
  const am = await run("A′合并61", SYS_A_MERGE);
  const an = await run("A″新口径", SYS_A_NEW);
  const c = await run("C+61独立", SYS_C);

  function parse(raw) {
    const lines = raw.trim().split(/\n/);
    return {
      verdict: lines[0]?.trim() || "?",
      category: lines[1]?.trim() || "?",
      reason: lines.slice(2).join(" ").trim() || "?"
    };
  }

  const out = {
    meta: { timestamp: new Date().toISOString(), model: MODEL, temp: TEMP, calls: SAMPLES.length * 4, test: "STEP3合并61多臂对照" },
    data: [a, am, an, c].map(arm => ({
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
