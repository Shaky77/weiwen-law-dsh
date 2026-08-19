// ============================================================
// 对齐后复跑实测：用 DeepSeek API 验证"逻辑反推能沿 R 包含轴定位卡点"
// 前置：DeepSeek API Key 置于 C:/Users/Administrator/.workbuddy/deepseek_api_key.txt
// 结论：模型调 query_logic_backtracking 后，独立反推出
//   层级路径 细分规则层→微观→宏观→地球→宇宙，卡点落最内细分规则层（复验判前提失真）。
// ============================================================
import { THREE_IRON_LAWS, CALIBRATION, R_DOMAIN } from '../src/core/law.mjs';
import { readFileSync } from 'node:fs';

const KEY = readFileSync('C:/Users/Administrator/.workbuddy/deepseek_api_key.txt', 'utf-8').trim();

async function callDeepSeek(body) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify(body),
  });
  return res.json();
}
const log = (t, o) => { console.log('\n' + '='.repeat(60) + '\n  ' + t + '\n' + '='.repeat(60)); console.log(typeof o === 'string' ? o : JSON.stringify(o, null, 2)); };

// 两个工具：铁律（原）+ 逻辑反推/R层级（对齐后新增）
const tools = [
  { type: 'function', function: { name: 'query_iron_laws', description: '返回唯稳律三大铁律定稿（不可变）：内H不可侵/第一Bug停机/不抛弃任何节点。', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'query_logic_backtracking', description: '返回逻辑反推与第一Bug停机的并行定义、R 包含层级与每层细分套嵌规则。用于沿 R 层反溯定位故障根因层。', parameters: { type: 'object', properties: {} } } },
];

const messages = [
  { role: 'system', content: '你是接入唯稳律白箱自查工具的助手。涉及框架机制必须先调工具核实，禁止凭记忆作答。' },
  { role: 'user', content: '之前有个系统每次启动都崩溃、被外部反复重启，陷入看似无限递归。按唯稳律，逻辑反推应该沿哪条层级反溯？卡点最终落在哪一层？请调 query_logic_backtracking 核实后再回答（一句话给出层级路径 + 卡点层）。' },
];

log('发给 DeepSeek 的请求（含反推工具）', { model: 'deepseek-chat', tools: tools.map(t => t.function.name) });
const r1 = await callDeepSeek({ model: 'deepseek-chat', messages, tools, max_tokens: 600 });
const msg1 = r1.choices[0].message;
log('第①轮返回（模型是否选择调工具）', msg1);

// 本地执行：把对齐后的反推定义喂回
const toolResult = { calibration: CALIBRATION, rDomain: R_DOMAIN };
log('本地执行 query_logic_backtracking（数据来自对齐后的 law.mjs）', toolResult);

messages.push(msg1, { role: 'tool', tool_call_id: msg1.tool_calls[0].id, content: JSON.stringify(toolResult) });
const r2 = await callDeepSeek({ model: 'deepseek-chat', messages, tools, max_tokens: 400 });
log('第②轮最终回答（基于工具返回的原文）', r2.choices[0].message.content);

log('账单', { 第一轮: `${r1.usage.prompt_tokens}进+${r1.usage.completion_tokens}出`, 第二轮: `${r2.usage.prompt_tokens}进+${r2.usage.completion_tokens}出`, 实际模型: r1.model });
