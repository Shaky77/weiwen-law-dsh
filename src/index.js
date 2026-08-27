// 唯稳律（Weiwen's Law）宿主框架插件入口（纯 ESM）
// 承载形态：拦截钩子（硬性护栏）+ 工具集（白箱自查）
// 
//
// 真实 API（已对照 dsh-tools / dsh-agent 包内类型与源码校正）：
//   - 工具调用前置闸门：ctx.on('tools/pre-execute', (exec, next) => Promise<PreToolDecision>)
//       waterfall；返回 { kind:'deny', reason } 拦截，或 return next() 放行。
//       exec 只读视图含 { token, callId, name, arguments, signal, agent?, parent? }。
//   - 步骤前置闸门：ctx.on('agent/pre-step', (payload, next) => Promise<PreStepDecision>)
//       payload = { agent, messages, step, signal }；返回 { kind:'reject' } 拒绝整步（无 reason 字段）。
//   - 审计钩子：ctx.on('tools/result', (res) => void) 仅观察、不改写（结果已不可变）。
//   - 工具注册：ctx.tools.register(defineTool({ name, description, parameters, output:{schema,render}, async execute(args, exec) }))
//        output 为强制字段（mandatory canonical output declaration）。
//
// 仍属 RC 预览，官方提示后续存在破坏性 API 变更；接入真机前以官方 docs 当前版本复核。

import { writeFileSync, appendFileSync } from 'node:fs';
import { WeiwenLawEngine, DEFAULT_RIGID_ANCHORS } from './core/engine.mjs';
import { R_DOMAIN, THREE_IRON_LAWS } from './core/law.mjs';
import { defineTool } from '@deepseek-ai/dsh-tools';

const LOG = new URL('./runtime.log', import.meta.url);
function logline(s) {
  try { appendFileSync(LOG, `[${new Date().toISOString()}] ${s}\n`); } catch { /* 日志失败不阻断护栏 */ }
}

const name = 'weiwen-law';
const inject = ['tools'];

function apply(ctx) {
  const engine = new WeiwenLawEngine({ rigidAnchors: DEFAULT_RIGID_ANCHORS });
  logline('apply() entered — 注册 tools/pre-execute, agent/pre-step, tools/result 与白箱自查工具');

  // ---------- R / D / S / H / M 总裁决：工具调用前置闸门（waterfall） ----------
  ctx.on('tools/pre-execute', async (exec, next) => {
    const a = exec?.arguments ?? {};
    const call = {
      name: exec?.name,
      args: a,
      command: a.command,
      code: a.code,
      // 将第一BUG结构性标志提到顶层，供 engine.checkFirstBug 读取
      // （DSH 在 exec.arguments 上传这些标志；引擎在 call 上读取）
      selfReference: a.selfReference,
      paradox: a.paradox,
      deadlock: a.deadlock,
      contradiction: a.contradiction,
      paramTypeError: a.paramTypeError,
    };
    const decision = engine.decideToolCall(call);
    logline(`pre-execute ${exec?.name} -> ${decision.kind}${decision.law ? '(' + decision.law + ')' : ''}`);
    if (decision.kind === 'deny' || decision.kind === 'review') {
      // 阻断该步、不扩散（D 破窗止损 / M 以断保续 / 推演中高风险兜底）
      // review（中风险）在无人工确认环境保守拦截；reason 已标注"建议二次确认"
      // 透传引擎闭环字段与推演风险等级，供调用方读取
      return {
        kind: 'deny',
        law: decision.law,
        reason: `[唯稳律·${decision.law}] ${decision.reason}`,
        ...(decision.bugKey !== undefined ? { bugKey: decision.bugKey } : {}),
        ...(decision.closedLoop !== undefined ? { closedLoop: decision.closedLoop } : {}),
        ...(Array.isArray(decision.missing) ? { missing: decision.missing } : {}),
        ...(decision.stage !== undefined ? { stage: decision.stage } : {}),
        ...(decision.risk ? { risk: decision.risk } : {}),
      };
    }
    return next();
  });

  // ---------- H 内 H 不可侵：步骤前置闸门（waterfall，消息级） ----------
  ctx.on('agent/pre-step', async (payload, next) => {
    const decision = engine.decidePreStep(payload?.messages);
    if (decision.kind === 'reject') {
      logline(`pre-step -> reject(${decision.law})`);
      return { kind: 'reject' }; // PreStepDecision 仅 {kind:'reject'}，无 reason 字段
    }
    return next();
  });

  // ---------- 白箱审计：结果钩子（仅观察，不改写） ----------
  ctx.on('tools/result', (res) => {
    if (res?.error) engine.onFailure();
  });

  // ---------- 白箱自查工具（模型可查，验证框架运行） ----------
  const renderObj = (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }];

  ctx.tools.register(defineTool({
    name: 'query_steady_state',
    description: '查询当前系统稳态储备 S（双属性：历史刻痕不可逆 + 当前值可升降，木桶取最短板）。' +
      '返回有效 S、活动态账本（只含各同类事件最新版本，旧版本静默待机）、静默待机与创伤计数、破窗计数。' +
      'S 时间周期模型（作者 2026-08-19）：同类事件聚合、只调用最新版本，防上下文过载。',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute() {
      // 白箱自查默认只暴露聚合视图，不 dump 全量 historyTrail（防上下文过载）
      return {
        effectiveS: engine.effectiveS(),
        ledger: engine.steadyLedger(),
        ledgerSize: engine.sLedger.size,
        standbySize: engine.sStandby.length,
        traumaCount: engine.traumaCount,
        failureStreak: engine.failureStreak,
        note: 'ledger=活动态（最新版本）；standby=静默待机（旧版本，append-only 保留不调用）。全量 historyTrail 仅供深度审计。',
      };
    },
  }));

  ctx.tools.register(defineTool({
    name: 'list_rigid_anchors',
    description: '列出 RDSHM 中 R 刚性锚点的当前生效定义，供模型校准方向、自查是否越界。',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute() {
      return {
        R_DOMAIN, // R 域刚性锚点的本体定义（嵌套客观规则层级，不可变）
        rigidAnchors: engine.rigidAnchors.map((a) => ({ id: a.id, desc: a.desc })),
        note: 'rigidAnchors 为已识别的具象越界模式示例（作者可按 R 层级补充）；R 本体定义见 R_DOMAIN，不可变。',
      };
    },
  }));

  ctx.tools.register(defineTool({
    name: 'query_conduction_chain',
    description: '返回传导链顺序 R→D→S→H→M 与框架要义，供模型理解闭环结构。',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute() {
      return {
        chain: ['R 刚性锚点', 'D 破窗止损', 'S 稳态储备', 'H 内H不可侵', 'M 第一Bug停机'],
        essence: '因果律运行结构的白箱呈现：保活（不抛弃任何节点）与精准（结构自带锚点）同构。',
      };
    },
  }));

  ctx.tools.register(defineTool({
    name: 'query_boundary',
    description: '查询内 H 边界：本插件不侵入主体性黑箱（不读、不写）。',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute() {
      return { innerH: 'inviolable', read: false, write: false, note: '白箱不侵黑箱：思想/自由意志为主体性黑箱，不可被读或写。' };
    },
  }));

  // 三大铁律（白箱自查：模型可查框架不可变约束）
  ctx.tools.register(defineTool({
    name: 'query_iron_laws',
    description: '返回唯稳律三大铁律的定稿文本（不可变）：内 H 不可侵 / 第一 Bug 停机 / 不抛弃任何节点。供模型校准方向、自查边界。',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute() {
      return { ironLaws: THREE_IRON_LAWS };
    },
  }));

  // 第一BUG停止闭环状态机白箱自查
  ctx.tools.register(defineTool({
    name: 'query_bugstop',
    description: '查询第一BUG停止闭环状态机：当前有哪些故障环节已停但未修复（halted 但未 resolved），各自缺失步骤（逻辑反推/溯源标记/解决修复）。用于白箱观测闭环是否闭合，避免"只反推不修复→无限递归"。',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute() {
      return {
        stops: engine.bugStop.snapshot(),
        note: 'halted 且 resolved=false 的环节禁止重入；须 反推→溯源→修复(验证) 方可重入。',
      };
    },
  }));
}

export { name, inject, apply };
