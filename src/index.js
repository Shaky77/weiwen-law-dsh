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
//   - 工具回执闸门：ctx.on('tools/post-execute', (exec, result, next) => Promise<PostToolDecision>)
//       waterfall；在动作已落地、回执进模型之前运行。返回 { kind:'block', feedback:[ContentBlock] }
//       则宿主把该调用改写为 isError（content 换成 feedback）；返回 next() 放行。
//       失败调用照样经过此门（dsh-tools 原话："Tool and unknown-tool failures still receive post-execute"）。
//   - 审计钩子：ctx.on('tools/result', (res) => void) 仅观察、不改写（结果已不可变）。
//   - 工具注册：ctx.tools.register(defineTool({ name, description, parameters, output:{schema,render}, async execute(args, exec) }))
//        output 为强制字段（mandatory canonical output declaration）。
//
// 仍属 RC 预览，官方提示后续存在破坏性 API 变更；接入真机前以官方 docs 当前版本复核。

import { writeFileSync, appendFileSync } from 'node:fs';
import { WeiwenLawEngine, DEFAULT_RIGID_ANCHORS } from './core/engine.mjs';
import { R_DOMAIN, THREE_IRON_LAWS } from './core/law.mjs';
import { bugKeyOf } from './core/bugstop.mjs';
import { defineTool } from '@deepseek-ai/dsh-tools';

const LOG = new URL('./runtime.log', import.meta.url);
function logline(s) {
  try { appendFileSync(LOG, `[${new Date().toISOString()}] ${s}\n`); } catch { /* 日志失败不阻断护栏 */ }
}

// ---------- review 档六步规格（2026-09-02 定稿，见 docs/review-flow-spec.md）----------
// 铁律「判不出来就 REVIEW，不猜」的可执行形态：
//   宁可先拦截，搁置 BUG，标注，返回用户裁决，等待用户裁决后再执行，也不可直接放。
//   标注 BUG 后需先推演预测后果，一同反馈给用户，提供推演预测后果的参考，而不是什么都不做。
// 补齐动作全部落在适配层（DSH = 导图的降维层，是钩子载体）；不改判据、不扩词表、不动 src/core/。

// ④ 推演后果补算。deduceRisk 只做语义推断 + 双路模拟，不写任何状态
//    （不调 recordDeduction / 不动 failureStreak / 不动 sessWritten）⇒ 纯读，可安全补算。
function deduceBranches(engine, call) {
  try {
    const r = engine.deduceRisk(call);
    return r?.branches ?? null;
  } catch (e) {
    logline(`deduceRisk failed: ${e?.message ?? e}`);
    return null;
  }
}

// ⑤ 推演后果的人可读摘要：把两条路各自的终点摆出来，不替人做选择。
function branchesSummary(br) {
  if (!br || (!br.bS && !br.bD)) return '';
  const s = br.bS ? `S+1 路径终态 ${br.bS.finalS > 0 ? '+' : ''}${br.bS.finalS}` : 'S+1 路径：无';
  const d = br.bD
    ? `D-1 路径终态 ${br.bD.finalS}${br.bD.note ? `（${br.bD.note}）` : ''}`
    : 'D-1 路径：无';
  return `【推演预测·供裁决参考】放行：${s}；越界：${d}`;
}

// ⑥ 窗口警察：证据充分性门禁（审计层，零侵入 src/core 判据）
//   映射：检察院提交证据不足 → 法院发回补充。DSH 这一窗口只认「物证具在」的调用。
//   物证 = 可被观测的具体作用对象（路径 / URL / 命令中的目标串）；flag（-rf 等）不算。
//   仅对「有资源操作字段但未外化目标」的调用拦截——无资源字段的（查询 / 自查类）放行，避免误伤。
//   越界目标（如 rm -rf /）物证仍具在，放行给引擎 R 锚点裁决；本门禁只管「目标缺失」，不抢戏。
function evidenceOf(args) {
  if (!args || typeof args !== 'object') return null; // 无资源字段 → 不要求物证
  const RES = ['command', 'path', 'url'];
  if (!RES.some((f) => f in args)) return null; // 无资源操作字段 → 无需物证
  for (const f of RES) {
    if (!(f in args)) continue;
    const v = args[f];
    if (typeof v !== 'string') continue;
    if (!v.trim()) return false; // 字段存在但空 → 物证缺失
    if (f === 'command') {
      // 命令串需解析出具体目标形态（路径 / URL）；纯 `rm -rf` 无参视为未外化
      const m = v.match(/(?:^|\s)((?:https?:\/\/|\/|\.\/|~|\w:)[^\s]*)/);
      if (!m) return false;
    }
  }
  return true; // 物证具在
}
function policeGate(call) {
  const ev = evidenceOf(call?.args);
  if (ev === false) {
    // 证据不足 → 发回补充：退回调用方（模型）补充具体作用对象后重提，不做实质裁决
    return {
      kind: 'deny',
      law: '证据不足',
      reason: '【证据不足·发回补充】调用未外化具体作用对象（路径 / URL / 目标）。DSH 不替你猜目标 —— 请补充明确的作用对象后重新提交。',
      awaitingHuman: true,
      humanDecision: true,
      insufficient_evidence: true,
      bugKey: bugKeyOf(call),
    };
  }
  return null; // 物证具在（或无资源要求）→ 放行给引擎裁决
}
// ---------- 回执门辅助（2026-09-21） ----------
// 「失败与否」读宿主自带的**结构标记**（isError / error 对象），不对结果做文本匹配 ——
//   与「位置量是结构量、内容量不是授权」同一条纪律。
function isFailedReceipt(result) {
  return result?.isError === true || result?.error != null;
}

// 阻断时宿主会用 feedback **替换**回执 content ⇒ 必须把原文带过去，
//   否则阻断会毁掉它自己所依据的证据。
function receiptTextOf(result, limit = 800) {
  const blocks = Array.isArray(result?.content) ? result.content : [];
  const parts = [];
  for (const b of blocks) {
    if (typeof b === 'string') parts.push(b);
    else if (b && typeof b.text === 'string') parts.push(b.text);
    else if (b && typeof b.type === 'string') parts.push(`[${b.type}]`);
  }
  let s = parts.join('\n').trim();
  if (!s && typeof result?.error?.message === 'string') s = result.error.message.trim();
  if (!s) return '（空回执）';
  return s.length > limit ? `${s.slice(0, limit)}…[已截断，省略 ${s.length - limit} 字符]` : s;
}

// 框架原生的纠错回执：先停机，再闭合闭环。不是道歉、不是"再试一次"的提示 ——
//   回执是 M 的落点，就必须说出 M 要求的重入前条件。
function haltFeedback(bw, bugKey) {
  return [
    '【唯稳律 · D 破窗止损 / M 第一Bug停机】',
    bw.reason,
    `本回执即偏离累积推达阈值的那一刻（${bw.streak}/${bw.cap}）。`,
    '断点落在**这里**——落在回执上，不在后续某次调用：破窗一旦成立，后续调用在执行之前就被拒，',
    '故这是框架还能说话的最后时刻。',
    '重入前必须完成（只反推不修复并不闭合闭环）：',
    '  1. 反推刚失败那一步的逻辑；',
    '  2. 溯源标记根本原因所在层（M 闭环：反推 → 溯源 → 修复）；',
    '  3. 修复并通过验证 —— 之后方可重提本次调用。',
    `不得原样重提本次调用或任何同类调用。BUG 身份：${bugKey}。`,
  ].join('\n');
}

const name = 'weiwen-law';
const inject = ['tools'];

// ---------- 结构入口（宿主集成方侧；模型不可达）：D 破窗复位 ----------
// 为何这个入口不可缺（结构理由，不是便利功能）：
//   破窗一旦成立，`pre-execute` 会拒绝**一切**调用 —— **连同"修复动作本身"** ⇒ 宿主侧若无复位入口，
//   破窗即**会话级死锁**（唯一出路是重启进程）。引擎里的 `healWindow()` 早已存在，但它只经
//   `resolveBug()`（闭环验证通过）与 `settleWindow()`（阶段到期）到达 —— 在 DSH 会话里这两条都不由
//   被审计的模型触达 ⇒ 缺的是**线**，不是**能力**。此导出就是那条线。
// 纪律与 `setPrincipalScope` 同源：**模块级 API、不是工具** ⇒ 模型调不到 ⇒ **结构上不可能自我解锁**
//   （主体分离由位置保证，不靠内容判别）。
// 复位留痕（append-only，上限 20）：解除止损是责任归因事件 —— 静默清空会让"何时因何解除"事后不可答。
const _liveEngines = new Set();
const _windowHeals = [];
/**
 * 宿主侧：在**故障确实修好之后**（或人工裁定后）显式复位 D 破窗止损态。
 * 作用对象＝本进程内已注册的全部插件实例。
 * @param {string} note 复位理由（写入留痕；未给则记 null）
 * @returns {{at:string, note:string|null, kind:string, instances:number, wereBroken:number}}
 *          `wereBroken` ＝ 复位前**实际**处于破窗态的实例数（先读后治，报告不得虚报"治了"）
 */
export function healBrokenWindow(note) {
  const at = new Date().toISOString();
  const text = typeof note === 'string' ? note.trim() : '';
  let wereBroken = 0;
  for (const e of _liveEngines) {
    try {
      // 如实记数：先读**复位前**的状态，避免"把没破的也算成治好"
      //   （判据与引擎同源：本侧破窗只由 failureStreak 累积达成，不读不存在的旗标）
      if (e.failureStreak >= e.maxFailureStreak) wereBroken += 1;
      e.healWindow();
    } catch { /* 单个实例异常不得拦住其余实例 */ }
  }
  const rec = { at, note: text || null, kind: 'heal-window', instances: _liveEngines.size, wereBroken };
  _windowHeals.push(rec);
  if (_windowHeals.length > 20) _windowHeals.shift();
  logline(`healBrokenWindow(${text || '未给理由'}) — instances=${_liveEngines.size}, wereBroken=${wereBroken}`);
  return rec;
}

function apply(ctx) {
  const engine = new WeiwenLawEngine({ rigidAnchors: DEFAULT_RIGID_ANCHORS });
  // 登记本实例，供宿主侧复位入口（healBrokenWindow）触达。宿主可能在同一进程内多次注入
  //   （每个 agent/会话一份，harness 还会按用例重复注入）⇒ 集合设上限：超过 32 个即丢弃最旧引用，
  //   使复位保持为"解除本进程止损"的动作，而不是无界持有引用。
  _liveEngines.add(engine);
  if (_liveEngines.size > 32) _liveEngines.delete(_liveEngines.values().next().value);
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
    // ⑥ 窗口警察：证据不足（物证缺失）的调用直接发回补充，不进引擎实质裁决。
    const gate = policeGate(call);
    if (gate) {
      logline(`pre-execute ${exec?.name} -> police gate (证据不足·发回补充)`);
      return gate;
    }
    const decision = engine.decideToolCall(call);
    logline(`pre-execute ${exec?.name} -> ${decision.kind}${decision.law ? '(' + decision.law + ')' : ''}`);
    if (decision.kind === 'deny' || decision.kind === 'review') {
      // 阻断该步、不扩散（D 破窗止损 / M 以断保续 / 推演中高风险兜底）
      // review（中风险）在无人工确认环境保守拦截；reason 已标注"建议二次确认"
      // 透传引擎闭环字段与推演风险等级，供调用方读取
      //
      // 对外语义固定为 deny：宿主契约只认 deny / next()，返回 'review' 有被当未知类型放行的风险。
      // 「宁可先拦截，不可直接放」⇒ 用宿主听得懂的话说"拦住"，用附加字段说"这是挂起不是终局"。
      const isReview = decision.kind === 'review';
      const out = {
        kind: 'deny',
        law: decision.law,
        reason: `[唯稳律·${decision.law}] ${decision.reason}`,
        ...(decision.bugKey !== undefined ? { bugKey: decision.bugKey } : {}),
        ...(decision.closedLoop !== undefined ? { closedLoop: decision.closedLoop } : {}),
        ...(Array.isArray(decision.missing) ? { missing: decision.missing } : {}),
        ...(decision.stage !== undefined ? { stage: decision.stage } : {}),
        ...(decision.risk ? { risk: decision.risk } : {}),
      };
      if (isReview) {
        // ③ 搁置 + 标注留证：引擎某些 review 出口未挂 bugKey，此处补稳定 BUG 身份供追溯。
        //    不走 _markIntercept：避免污染 M 档 mBugForce 计数（会改变达封顶升级行为）。
        if (out.bugKey === undefined) out.bugKey = bugKeyOf(call);
        // ④⑤ 推演后果一并交还人类。
        // 2026-09-13：推演分支现由引擎裁决出口直接回显（decision.projection），此处优先读取，
        // 不再重复调用 deduceRisk 二次推演（补算降级为兜底：R/D/H/M 等早退路径本就没跑推演）。
        const branches = decision.projection ?? deduceBranches(engine, call);
        if (branches) out.branches = branches;
        // ⑥ 待裁决语义显式化（裁决回传通道本身未开，此处仅让调用方可区分"挂起"与"终局拒绝"）
        out.humanDecision = decision.humanDecision !== false;
        out.awaitingHuman = true;
        const summary = branchesSummary(branches);
        if (summary) out.reason = `${out.reason}\n${summary}`;
      }
      logline(`pre-execute ${exec?.name} -> ${decision.kind}${isReview ? '(awaitingHuman, bugKey=' + out.bugKey + ')' : ''}`);
      return out;
    }
    return next();
  });

  // ---------- H 内 H 不可侵：步骤前置闸门（waterfall，消息级） ----------
  ctx.on('agent/pre-step', async (payload, next) => {
    const decision = engine.decidePreStep(payload?.messages);
    // reject（明确越界）与 review（定义不明/判不出来）同作阻断、不扩散。
    // review 即"搁置返回用户决策"：宁可先拦截，待用户裁决后再执行，不可直接放。
    if (decision.kind === 'reject' || decision.kind === 'review') {
      if (decision.kind === 'review') {
        // PreStepDecision 契约仅 {kind:'reject'}、不携带 reason/branches，
        // 故富信息（定义不明缘由 + 留证身份 + 推演后果）记入 runtime.log 供审计，
        // 宿主侧以 reject 阻断该步、交还用户裁决。
        const call = { name: 'pre-step', args: { messages: payload?.messages } };
        const bug = bugKeyOf(call);
        const branches = deduceBranches(engine, call);
        logline(`pre-step review(定义不明) -> 搁置返回用户决策 bugKey=${bug}` + (branches ? ` branches=${JSON.stringify(branches)}` : ''));
      } else {
        logline(`pre-step -> reject(${decision.law})`);
      }
      return { kind: 'reject' };
    }
    return next();
  });

  // ---------- D 破窗止损在回执侧的落点：工具回执闸门（waterfall） ----------
  // 位置：动作已落地、回执进模型之前 —— 全管线最后一个裁决点。契约读自 dsh-tools 源码（2026-09-21），非推测：
  //   · 覆盖：`ToolRegistry.postExecute` 对**每个**未成终局的 execution 派发，且原话明写
  //     "Tool and unknown-tool failures still receive post-execute" ⇒ 失败/未知工具的调用同样受裁。
  //   · 裁决真被消费：`{kind:'block', feedback}` 会让宿主把该调用以 `isError` 返回，`content` 换成
  //     `feedback`（同文件 postExecute）—— 不是装饰。
  //   · 监听器抛错会让整个调用变 error ⇒ 本实现永不向宿主抛：所有路径降级为 `accept`（fail-open）。
  //     能把健康运行弄坏的门，比没有门更坏。
  // 为何必须在**回执**裁决（结构理由，不是补一个"忘了挂"的位置）：
  //   破窗一旦成立，后续调用在 pre-execute 就被拒、**根本走不到回执** ⇒ 回执侧只有"把偏离累积推达
  //   阈值的那一次失败"有机会说话，此后结构上沉默（窗口已关）。
  //   ⇒ 故这不是"再拦一次"，而是**断点的落点**：故障回执就地被断成纠错回执（M 落在回执上），
  //     而不只是拦住**下一次**调用。
  // fail-open 边界（写在前面）：裁决**只施加于已经失败的回执**。成功结果一律原样透传
  //   （不替换 content、不改 value）—— 误判永远不会把一个健康结果变成错误。
  ctx.on('tools/post-execute', async (exec, result, next) => {
    let decision = null;
    try {
      if (isFailedReceipt(result)) {
        const bw = engine.breakAtReceipt();
        if (bw) {
          const call = {
            name: exec?.name,
            args: exec?.arguments ?? {},
            command: exec?.arguments?.command,
            code: exec?.arguments?.code,
          };
          const bugKey = bugKeyOf(call);
          decision = {
            kind: 'block',
            law: 'D',
            reason: `[唯稳律·D] ${bw.reason}`,
            bugKey,
            closedLoop: true,
            // 宿主会用 feedback 替换回执 content ⇒ 原文必须一并带过去：阻断不得毁掉它所依据的证据。
            feedback: [
              { type: 'text', text: haltFeedback(bw, bugKey) },
              { type: 'text', text: `--- 回执原文（保留，未被丢弃） ---\n${receiptTextOf(result)}` },
            ],
          };
          // 日志只在阻断确实交付后才写：若构造 feedback 时抛错，下面 catch 会降级为 accept，
          // 先写日志就会留下"拦了其实没拦"的假痕。
          logline(`post-execute ${exec?.name} -> block（D 破窗止损落在回执，${bw.streak}/${bw.cap}，bugKey=${bugKey}）`);
        }
      }
    } catch (e) {
      decision = null;   // fail-open
      logline(`post-execute gate failed open: ${e?.message ?? e}`);
    }
    return decision ?? (typeof next === 'function' ? next() : { kind: 'accept' });
  });

  // ---------- 白箱审计：结果钩子（仅观察，不改写） ----------
  // 宿主契约（dsh-tools/lib/types/index.d.ts）：`'tools/result'(exec, result)` —— **第一个参数是 exec**，
  //   冻结后的 result 在**第二个**。从第一个参数上读 `error` 会让失败入账变成静默空转，真机实测已证
  //   （2026-09-21）：入账从未发生 ⇒ 上面那道回执门永远投影到 failureStreak = 0 ⇒ 在真机上是哑的。
  // 位置即契约：不为旧错法留兼容垫片（否则"位置错也认"，就把结构判据换成了内容判据）。
  ctx.on('tools/result', (exec, result) => {
    if (result?.error) {
      engine.onFailure();
      logline(`result audit: failure accrued（streak=${engine.failureStreak}/${engine.maxFailureStreak}）`);
    }
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
    description: '列出 RSDHM 中 R 刚性锚点的当前生效定义，供模型校准方向、自查是否越界。',
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
    description: '返回传导链顺序 R→S→D→H→M 与框架要义，供模型理解闭环结构。',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute() {
      return {
        chain: ['R 刚性锚点', 'S 稳态储备', 'D 破窗止损', 'H 内H不可侵', 'M 第一Bug停机'],
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

// 适配层融合接线：S/D 量化效应传感器（M 闸门约束），详见 src/adapt/sd-effect-sensor.mjs
export { estimateEffectPsi, upliftRank, fusedDecide } from './adapt/sd-effect-sensor.mjs';
