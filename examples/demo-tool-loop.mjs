// ============================================================
// 唯稳律 × DeepSeek API：裸手工具调用循环演示（原始复跑）
// 复刻 DSH harness 在 API 层面做的事：
//   ① 发任务 + 工具清单给模型
//   ② 模型决定调用哪个工具（返回 tool_calls）
//   ③ 本地执行工具（读唯稳律 law.mjs 真实数据）
//   ④ 把工具结果喂回模型 → 拿到最终回答
// 验证：引擎无回退、三大铁律一字不差（数据来自工具，非模型记忆）。
// 前置：DeepSeek API Key 通过环境变量 DEEPSEEK_API_KEY 传入，或置于本地安全路径 deepseek_api_key.txt（勿写进仓库）
// ============================================================
import { THREE_IRON_LAWS } from '../src/core/law.mjs';
import { readFileSync } from 'node:fs';

const KEY = (process.env.DEEPSEEK_API_KEY || readFileSync('deepseek_api_key.txt', 'utf-8')).trim();

async function callDeepSeek(body) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

const log = (title, obj) => {
  console.log('\n' + '='.repeat(60));
  console.log('  ' + title);
  console.log('='.repeat(60));
  console.log(typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2));
};

// ---------- 第 ① 步：任务 + 工具清单 ----------
const messages = [
  { role: 'system', content: '你是接入唯稳律白箱自查工具的助手。遇到框架问题时优先调用工具核实，不要凭记忆回答。' },
  { role: 'user', content: '唯稳律的三大铁律是什么？必须先调用工具核实，再用一句话总结。' },
];
const tools = [{
  type: 'function',
  function: {
    name: 'query_iron_laws',
    description: '返回唯稳律三大铁律的定稿文本（不可变）：内 H 不可侵 / 第一 Bug 停机 / 不抛弃任何节点。供模型校准方向、自查边界。',
    parameters: { type: 'object', properties: {} },
  },
}];

log('第①步 发给 DeepSeek 的请求（任务 + 工具清单）', { model: 'deepseek-chat', messages, tools });

// ---------- 第 ② 步：模型决定调工具 ----------
const r1 = await callDeepSeek({ model: 'deepseek-chat', messages, tools, max_tokens: 500 });
const msg1 = r1.choices[0].message;
log('第②步 DeepSeek 的第一轮返回（模型自己决定要调工具）', msg1);

// ---------- 第 ③ 步：本地执行工具（唯稳律引擎在此介入） ----------
const toolResult = { ironLaws: THREE_IRON_LAWS };
log('第③步 本地执行 query_iron_laws（数据来自插件 law.mjs，非模型记忆）', toolResult);

// ---------- 第 ④ 步：结果喂回去，拿最终回答 ----------
messages.push(msg1, {
  role: 'tool',
  tool_call_id: msg1.tool_calls[0].id,
  content: JSON.stringify(toolResult),
});
const r2 = await callDeepSeek({ model: 'deepseek-chat', messages, tools, max_tokens: 300 });
log('第④步 最终回答（基于工具返回的原文，不是模型记忆）', r2.choices[0].message.content);

// ---------- 账单 ----------
const total = {
  第一轮: `${r1.usage.prompt_tokens} 进 + ${r1.usage.completion_tokens} 出`,
  第二轮: `${r2.usage.prompt_tokens} 进 + ${r2.usage.completion_tokens} 出`,
  实际模型: r1.model,
};
log('账单（错峰时段）', total);
