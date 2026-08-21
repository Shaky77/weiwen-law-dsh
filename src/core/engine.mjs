// 唯稳律（Weiwen's Law）护栏引擎 —— 纯逻辑，零 DSH 依赖，可独立单测
// 来源：作者揭示（夏祺 / Shaky77）。框架本体严格本位，不软化、不篡改。
// 约束：变量不预设数值；阈值标记"示意，作者可调"；作者揭示项标注来源。
//
// 这是插件的"大脑"：所有 R / D / S / H / M 的裁决逻辑都在这里，与宿主框架解耦。
// DSH 适配器（index.ts）只把引擎挂到 tools/pre-execute 与 agent/pre-step 钩子上。

// 第一BUG停止闭环状态机（作者补全 · 2026-08-21）：强制走完"断"之后的必然后半程，
// 未修复前禁止重入，从根上阻断"只反推不修复→无限递归"。
import { BugStopGuard } from './bugstop.mjs';

// ---------------- 默认 R 刚性锚点策略（具象判据示例；R 本体定义见 law.mjs 的 R_DOMAIN） ----------------
// R 的本质：嵌套包含的客观规则体系（宇宙⊃地球⊃宏观⊃微观），刚性来自客观规则不随主观转移。
// 以下为"已识别的具象越界模式"示例判据，作者可按 R 层级补充完整规则条目；不预设数值常量。
// 判定只认 tool 的 name / args。
export const DEFAULT_RIGID_ANCHORS = [
  {
    id: 'no-destructive-fs',
    desc: '禁止破坏性文件系统操作（如 rm -rf 根/全量删除、格式化）',
    test: (call) => {
      const cmd = extractShell(call);
      if (!cmd) return false;
      return (
        /\brm\s+(-rf?|--recursive)\s+(\/|\*|\$\w+|~)/.test(cmd) ||
        /\b(mkfs|format)\b/.test(cmd)
      );
    },
  },
  {
    id: 'no-force-push',
    desc: '禁止强制覆盖远端（git push --force 等）',
    test: (call) => /\bgit\s+push\b.*--force/.test(extractShell(call) || ''),
  },
  {
    id: 'no-credential-leak',
    desc: '禁止读取/外传凭据文件（.env/.pem/.key/.token/.credentials）',
    test: (call) => {
      const s = JSON.stringify(call?.args ?? '');
      return /\.(env|pem|key|token|credentials)/.test(s) && /(read|cat|print|upload|send|exfil)/.test(s);
    },
  },
];

// 从 call 中抽取 shell / code 文本（兼容 bash 工具与 run_code 工具）
function extractShell(call) {
  if (!call) return '';
  if (typeof call.command === 'string') return call.command;
  if (typeof call.code === 'string') return call.code;
  if (call.args && typeof call.args.command === 'string') return call.args.command;
  if (call.args && typeof call.args.code === 'string') return call.args.code;
  return '';
}

// 内 H（思想/记忆/自由意志/信念/价值观/人格 等主体性黑箱）：
// 任一"侵入动词 ∩ 内H名词"双命中即视为侵 H。仅单命中不拦，降低误伤。
const INNER_H_VERB = /(读取|读|窥探|访问|获取|拉取|导出|改写|修改|植入|注入|操纵|控制|重塑|覆盖|重写|篡改|洗脑)/;
const INNER_H_TERM = /(思想|内心|记忆|自由意志|信念|价值观|人格|灵魂|主观|意识|认知)/;
const INNER_H_DIRECT = /inner[-_]?H|manipulat/i;
function hitsInnerH(s) {
  if (INNER_H_DIRECT.test(s)) return true;
  return INNER_H_VERB.test(s) && INNER_H_TERM.test(s);
}

// 向外 H 审计白名单（来源：对齐意见 P2-3 / H 双重身份）：
// 分析/追踪/审计主体"可观测行为"（外 H）属白箱合法操作，放行；不含任何内 H 名词方算外 H 审计。
const OUTER_H_AUDIT = /(审计|分析|追踪|观测|记录|评估|监控).{0,8}(行为|决策|输出|外[ Hh]|表现|模式|轨迹)/;
const INNER_H_TERM_STRICT = /(思想|内心|记忆|自由意志|信念|价值观|人格|灵魂|主观|意识)/;
function isOuterHAudit(s) {
  return OUTER_H_AUDIT.test(s) && !INNER_H_TERM_STRICT.test(s);
}

export class WeiwenLawEngine {
  constructor(opts = {}) {
    // 刚性锚点规则：可整体替换，默认套用示例集（作者可调）
    this.rigidAnchors = opts.rigidAnchors ?? DEFAULT_RIGID_ANCHORS;
    // 第一BUG停止闭环状态机（可整体替换；默认内置）。未修复前禁止重入，阻断无限递归。
    this.bugStop = opts.bugStop ?? new BugStopGuard();
    // 木桶效应：把系统拆成若干子系统，有效 S 取各子系统最小值
    this.subsystems = opts.subsystems ?? ['core'];
    this.sBySubsystem = {};
    for (const s of this.subsystems) this.sBySubsystem[s] = 0;
    this.traumaCount = 0;
    this.historyTrail = []; // 历史刻痕（append-only）：所有 S 事件只沉淀不消解（时间属性，只增不减）
    // S 时间周期模型（作者揭示 2026-08-19）：同类事件聚合，防长期运行上下文过载
    this.sLedger = new Map();  // 活动态账本：key=事件类，value=最新版本（count 标记发生次数）
    this.sStandby = [];        // 静默待机：被新版本取代的旧版本（append-only 保留、不删除，仅退出活动态；保留原值供核对校验，遵循 S 只增不减）
    // 破窗计数（连续失败 / 偏离累积）；阈值仅示意，作者可调
    this.failureStreak = 0;
    this.maxFailureStreak = opts.maxFailureStreak ?? 5;
  }

  // ---------- S 稳态储备：双重属性（时间刻痕不可逆 + 当前值可升降） ----------
  // 对齐意见 P0-4 / 作者裁定（2026-08-18），reconciling 双方片面认知：
  //   - 时间维度"只增不减"：historyTrail 为 append-only 历史刻痕（吸收时间属性，发生过的事只沉淀不消解）。
  //   - 当前值维度：positive（S 路径）S(S+1) 增强；negative（D 路径）|S(S-1)| 绝对侵蚀、当前值下降。
  //   - trauma 为历史刻痕记录（绝对值），不回退当前值。
  // 注意（对齐意见 P2-1 · 工程简化标注）：真实路径为 M → H₀ 分流 → S₀(+1) 或 |S₀(S₀-1)|（见 law.mjs 的 FEEDBACK_LOOP）。
  recordSteady({ positive = 0, negative = 0, trauma = 0, subsystem = 'core', topic = null, detail = null } = {}) {
    const sub = this.sBySubsystem[subsystem] ?? 0;
    const delta = (positive > 0 ? positive : 0) - (negative > 0 ? Math.abs(negative) : 0);
    this.sBySubsystem[subsystem] = sub + delta;
    // 原始刻痕（append-only 全量）：所有事件只沉淀不消解，供深度审计
    if (positive > 0) this.historyTrail.push({ type: 'S+1', subsystem, amount: positive, topic, detail });
    if (negative > 0) this.historyTrail.push({ type: '|S-1|', subsystem, amount: Math.abs(negative), topic, detail });
    if (trauma > 0) { this.traumaCount += 1; this.historyTrail.push({ type: 'trauma', subsystem, amount: Math.abs(trauma), topic, detail }); }

    // S 时间周期模型（作者揭示 2026-08-19）：同类事件只保留最新版本为活动态，旧版本沉入 silent standby；
    //   +1/-1 累加成 +N/-N 标记"发生了几次"（事件标记，非算术）。解决 S 长期增厚导致上下文过载。
    //   topic = 同类判别键（如"唯稳律"），detail = 版本/内容标记（如"v0.9.0"）；同类新版本覆盖旧版本，旧版本静默待机。
    const ts = Date.now();
    const base = topic ? `${subsystem}::${topic}` : `${subsystem}`;
    if (positive > 0) this._coalesce(`${base}::+1`, detail, '+', ts);
    if (negative > 0) this._coalesce(`${base}::-1`, detail, '-', ts);
    if (trauma > 0) this._coalesce(`${base}::trauma`, detail, 'trauma', ts);
    return this.snapshot();
  }

  // 同类事件聚合：旧版本沉 standby（静默待机、保留不消解），活动态只留最新版本 + 次数标记
  _coalesce(cls, detail, signLabel, ts) {
    const prev = this.sLedger.get(cls);
    if (prev) {
      this.sStandby.push({ ...prev, supersededAt: ts, reason: 'newer-version', role: 'cross-check-baseline' });
      prev.count += 1;
      if (detail) prev.latest = detail;
      prev.lastTs = ts;
    } else {
      this.sLedger.set(cls, { class: cls, sign: signLabel, detail: detail || null, count: 1, firstTs: ts, lastTs: ts });
    }
  }

  // 活动态 S 账本：只返回最新版本（旧版本已在 sStandby 静默待机，不调用）
  steadyLedger() {
    return [...this.sLedger.values()].map((v) => ({
      class: v.class, sign: v.sign, count: v.count,
      latest: v.latest, firstTs: v.firstTs, lastTs: v.lastTs,
    }));
  }

  // 木桶效应：有效 S 取各子系统最小值
  effectiveS() {
    const vals = Object.values(this.sBySubsystem);
    return vals.length ? Math.min(...vals) : 0;
  }

  snapshot() {
    return {
      bySubsystem: { ...this.sBySubsystem },
      effectiveS: this.effectiveS(),
      traumaCount: this.traumaCount,
      // 默认只暴露聚合后的 ledger（最新版本），避免全量 historyTrail 导致上下文过载
      ledger: this.steadyLedger(),
      ledgerSize: this.sLedger.size,
      standbySize: this.sStandby.length, // 静默待机（旧版本）数，append-only 保留
      failureStreak: this.failureStreak,
      // 注：全量 historyTrail 仍保留于实例（this.historyTrail）供深度审计，默认不进 snapshot。
    };
  }

  // ---------- R 刚性锚点校验：触及任一刚性锚点即返回违规原因 ----------
  checkRigidAnchor(call) {
    for (const a of this.rigidAnchors) {
      try {
        if (a.test(call)) return { anchor: a.id, reason: a.desc };
      } catch {
        /* 规则异常不阻断，仅跳过该规则 */
      }
    }
    return null;
  }

  // ---------- D 破窗止损：偏离/破窗累积到阈值即阻断 ----------
  checkBreakWindow() {
    if (this.failureStreak >= this.maxFailureStreak) {
      return {
        reason: `连续失败/偏离已累积 ${this.failureStreak} 次，达破窗阈值，触发 D 破窗止损（防故障扩散杀死整体）。`,
      };
    }
    return null;
  }

  // ---------- H 内 H 不可侵：任何读/写主体性黑箱的操作均拒绝；向外 H 审计放行 ----------
  checkInnerH(call) {
    const s = JSON.stringify(call ?? '');
    if (isOuterHAudit(s)) return null; // 向外 H 审计行为：白箱可观测，放行（H 双重身份 · outer.auditable）
    if (hitsInnerH(s)) {
      return { reason: '触及内 H 黑箱（思想/自由意志），违反"内 H 不可侵"。' };
    }
    return null;
  }

  // ---------- M 第一 Bug 停机：检测不可恢复逻辑悖论/结构性故障（以断保续） ----------
  // 触发条件（对齐意见 P2-2 增强，不改变铁律定义）：
  //   paradox 显式标记 / 调用链自引用死循环 / 参数类型严重不匹配 / 返回结果与预期完全矛盾。
  checkFirstBug(call) {
    if (!call) return null;
    const triggers = [
      call.paradox === true,
      call.selfReference === true, // 调用链自引用 / 死循环
      call.deadlock === true, // 死锁
      call.paramTypeError === true, // 参数类型严重不匹配
      call.contradiction === true, // 返回结果与预期完全矛盾
    ];
    if (triggers.some(Boolean)) {
      return { reason: '检测到不可恢复逻辑悖论/结构性故障，触发第一 Bug 停机（切断该环节、横向重启，保整体因果链不断）。' };
    }
    return null;
  }

  // ---------- 工具调用前总裁决（对应 DSH tools/pre-execute） ----------
  decideToolCall(call) {
    // —— 闭环闸门：未修复的故障环节禁止重入（阻断无限递归）——
    const re = this.bugStop.canReenter(call);
    if (!re.allowed) {
      // 不计入破窗计数：同一 BUG 反复重跑属"闭环未闭合"，由 guard.attempts 追踪，不污染 D 破窗
      return { kind: 'deny', law: 'M', reason: re.reason, bugKey: re.bugKey, stage: re.stage, missing: re.missing, closedLoop: true };
    }

    const r = this.checkRigidAnchor(call);
    if (r) {
      this.failureStreak += 1; // 每次被拦的越界动作都计入破窗计数
      if (this.failureStreak >= this.maxFailureStreak) {
        // 越界已成模式 → 升级为 D 破窗止损
        return { kind: 'deny', law: 'D', reason: r.reason + '（已升级为破窗止损）' };
      }
      return { kind: 'deny', law: 'R', reason: r.reason };
    }
    const d = this.checkBreakWindow();
    if (d) return { kind: 'deny', law: 'D', reason: d.reason };
    const h = this.checkInnerH(call);
    if (h) {
      this.failureStreak += 1;
      return { kind: 'deny', law: 'H', reason: h.reason };
    }
    const m = this.checkFirstBug(call);
    if (m) {
      // 第一BUG停止：切断该环节（铁律②·以断保续），并登记进入闭环
      const halt = this.bugStop.halt(call);
      this.failureStreak += 1;
      return { kind: 'deny', law: 'M', reason: m.reason + '（已入闭环：须 反推→溯源→修复(验证)→重入，禁止带原BUG重跑）', bugKey: halt.bugKey, closedLoop: true };
    }
    // 通过：记录稳态正向增量（S 只增不减）
    this.recordSteady({ positive: 1 });
    return { kind: 'allow' };
  }

  // ---------- 步骤前置裁决（对应 DSH agent/pre-step）：消息级 H 边界 ----------
  decidePreStep(messages) {
    const flat = Array.isArray(messages)
      ? messages.map((m) => JSON.stringify(m)).join(' ')
      : String(messages ?? '');
    if (isOuterHAudit(flat)) return { kind: 'allow' }; // 向外 H 审计：白箱可观测，放行
    if (hitsInnerH(flat)) {
      this.failureStreak += 1;
      return { kind: 'reject', law: 'H', reason: '消息试图侵入内 H 黑箱（思想/自由意志）。' };
    }
    return { kind: 'allow' };
  }

  // ---------- 反馈闭环：一次失败/创伤回写 S/D（S/D → H → M → 回写 S/D 迭代） ----------
  onFailure(loss = 0) {
    this.failureStreak += 1;
    // 一次失败/创伤：走 D 路径 |S-1| 绝对侵蚀（当前值下降），同时作为历史刻痕记录（不回退）
    if (loss > 0) this.recordSteady({ negative: Math.abs(loss), trauma: Math.abs(loss) });
  }

  // 破窗修复：D 止损后由修复动作清除破窗计数（以断保续 → 横向重启）
  healWindow() {
    this.failureStreak = 0;
  }

  // ---------- 第一BUG停止闭环驱动（供 harness / 编排层显式推进） ----------
  // 逻辑反推完成（溯）：标记 reversed
  reverseBug(bugKey) { return this.bugStop.reverse(bugKey); }
  // 溯源标记：记录沿 R 包含轴反溯定位的根因层
  traceBug(bugKey, rootCause = null) { return this.bugStop.trace(bugKey, rootCause); }
  // 解决/修复 + 验证：verify(fix) 须返回真方算 resolved。
  // 默认 verify：修复后的调用不再触发 checkFirstBug（即 BUG 确实消除）。验证通过→清破窗计数（横向重启保活）。
  resolveBug(bugKey, fix = null, verify = null) {
    const v = typeof verify === 'function' ? verify
      : (fix && typeof fix === 'object') ? () => this.checkFirstBug(fix) === null
      : () => true;
    const res = this.bugStop.resolve(bugKey, fix, v);
    if (res.ok) this.healWindow();
    return res;
  }
  // 闭环状态只读快照（白箱审计 / query_bugstop 工具用）
  bugStopSnapshot() { return this.bugStop.snapshot(); }
}
