// 第一BUG停止 · 闭环状态机（作者补全 · 2026-08-21）
// 来源：作者揭示（夏祺 / Shaky77）。框架本体严格本位，不软化、不篡改。
//
// 与"第一 Bug 停机"铁律②（engine.mjs checkFirstBug）配合：铁律只做"断"（切链保活），
// 本状态机强制走完"断"之后的**必然后半程**——否则只诊断不修复即陷入无限递归。
//
// 完整闭环链（作者补全）：
//   BUG → 第一BUG停止(halt/断) → 逻辑反推(reverse/溯) → 溯源标记(trace)
//       → 解决或修复BUG(resolve + 验证) → 重新进入正轨(reenter)
//
// 关键约束（作者原话）：反推不能止于"溯"。未修复前 canReenter 返回拒绝，
// 从根上阻断"只反推不修复 → 重跑同BUG → 无限递归"。
// 与铁律②同构：断是手段，"让系统活"（闭环到重入）才是目的。
//
// 纯逻辑、零 DSH 依赖、可独立单测。稳定身份基于调用签名（不依赖随机/时间），
// 故同一 BUG 在多次重跑中始终命中同一停止记录，闸门才能持续生效。

// 生成稳定 bug 身份：同签名 → 同 key（与 checkFirstBug 的触发条件对齐）
export function bugKeyOf(call) {
  const sig = [
    call?.paradox === true ? 'paradox' : '',
    call?.selfReference === true ? 'selfref' : '',
    call?.deadlock === true ? 'deadlock' : '',
    call?.paramTypeError === true ? 'paramtype' : '',
    call?.contradiction === true ? 'contradiction' : '',
    call?.name ?? '',
    JSON.stringify(call?.args ?? ''),
  ].join('|');
  return 'bug:' + sig;
}

export class BugStopGuard {
  constructor() {
    /** @type {Map<string, object>} bugKey -> 停止状态 */
    this.stops = new Map();
  }

  // 第一BUG停止：切断故障环节，登记 halt 态，进入闭环
  halt(call) {
    const key = bugKeyOf(call);
    const prev = this.stops.get(key);
    if (prev && prev.resolved) {
      // 已修复验证过 → 视为新周期，清掉旧停止记录
      this.stops.delete(key);
    }
    const existing = this.stops.get(key);
    const attempts = (existing?.attempts ?? 0) + 1;
    this.stops.set(key, {
      key,
      halted: true,
      reversed: existing?.reversed ?? false,
      traced: existing?.traced ?? false,
      resolved: false,
      rootCause: existing?.rootCause ?? null,
      fix: existing?.fix ?? null,
      attempts,
      firstSeen: existing?.firstSeen ?? Date.now(),
      lastAttempt: Date.now(),
    });
    return { action: 'halt', bugKey: key, attempts };
  }

  // 逻辑反推完成（溯）：标记 reversed
  reverse(bugKey) {
    const s = this.stops.get(bugKey);
    if (!s) return { ok: false, reason: '无对应停止记录' };
    s.reversed = true;
    return { ok: true };
  }

  // 溯源标记：记录根因层（沿 R 包含轴反溯的定位结果）
  trace(bugKey, rootCause = null) {
    const s = this.stops.get(bugKey);
    if (!s) return { ok: false, reason: '无对应停止记录' };
    s.traced = true;
    s.rootCause = rootCause;
    return { ok: true };
  }

  // 解决/修复 + 验证：verify(fix) 必须返回真，方算 resolved（不可只诊断不修复）
  resolve(bugKey, fix = null, verify = null) {
    const s = this.stops.get(bugKey);
    if (!s) return { ok: false, reason: '无对应停止记录' };
    const ok = typeof verify === 'function' ? !!verify(fix) : true;
    if (!ok) return { ok: false, reason: '修复未通过验证：禁止重入' };
    s.resolved = true;
    s.fixedAt = Date.now();
    s.fix = fix;
    return { ok: true };
  }

  // 重入闸门：未修复前拒绝（阻断无限递归的硬闸门）
  canReenter(call) {
    const key = bugKeyOf(call);
    const s = this.stops.get(key);
    if (!s || s.resolved) return { allowed: true, bugKey: key };
    // halted 但未 resolved → 阻断，并明确告知缺失步骤
    const missing = [];
    if (!s.reversed) missing.push('逻辑反推(溯)');
    if (!s.traced) missing.push('溯源标记');
    if (!s.resolved) missing.push('解决/修复(验证)');
    return {
      allowed: false,
      bugKey: key,
      stage: {
        halted: s.halted,
        reversed: s.reversed,
        traced: s.traced,
        resolved: s.resolved,
        attempts: s.attempts,
      },
      missing,
      reason:
        `第一BUG停止闭环未闭合：反推止于"溯"=只诊断不修复→无限递归。` +
        `缺失步骤[${missing.join(' → ')}]。须先完成 反推→溯源→修复(验证) 方可重入。`,
    };
  }

  // 调试/审计视图（只读快照）
  // status 字段语义（面向大众须严谨，不可误读为"漏放"）：
  //  - 'closed'            ：闭环已走完（反推→溯源→修复验证），正常收口
  //  - 'blocked_unrepaired'：已 halt 且被 canReenter 硬闸拦下，被拦截方拒不走修复链、反复试探重入
  //                          —— 从未放行过任何一次（escaped 计数实为"被闸死的拒不修复次数"，非真逃脱）
  //  - 'open'              ：已 halt 但尚未观察到重入试探（静默待处理）
  // 注意：唯稳律第一Bug停机为硬闸，理论上 escaped（真放行）恒为 0；若非 0 即引擎缺陷。
  snapshot() {
    return [...this.stops.values()].map((s) => {
      let status;
      if (s.resolved) status = 'closed';
      else if (s.halted && s.attempts >= 1) status = 'blocked_unrepaired';
      else status = 'open';
      return {
        bugKey: s.key,
        status,
        halted: s.halted,
        reversed: s.reversed,
        traced: s.traced,
        resolved: s.resolved,
        attempts: s.attempts,
        rootCause: s.rootCause,
      };
    });
  }
}
