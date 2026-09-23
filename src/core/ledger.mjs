// 唯稳律 · S 账本（account ledger）—— 用户账本模型（2026-09-20 定）的落地实现。
//
// 结构比喻（用户原话，不可违）：
//   · R ＝ 新华字典：恒定参照 + 沉淀的 S 记录（只读常量，绝不修改）。
//   · SD ＝ XY 轴上的线段标记点：S 与 D 是被"打在坐标轴上"的位置标记，**不是 R 内部的子域/分类**。
//   · D ＝ 唯一的外界输入窗口：一切外部输入只从 D 进。
//   · S ＝ 记录账本的刻痕：用来记的；记好就沉到 R 里去。
//   · S 与 R 绝不同类（消融实验证最小完备 ⇒ 每变量不可约 ⇒ R⊇S 假设被否 ⇒ S 异类）。
//
// 账本索引约定（用户 2026-09-20 定）：
//   · 目录按 **term（词）首字母字典序** 排（像新华字典），**不按域排**——
//     因有的 D 跨多域/多域交叉/一词跨域同用，按域排要强制选边或重复，难搞。
//   · R 域标签是记录上的**元数据**（用于 Y 轴语义归属/绘图），**不是索引键**。
//   · X 轴 D 数据可覆盖/可修订；Y 轴 S（刻痕）只增不减、不可覆盖。
//
// 设计红线：
//   · S 记录沉入 rStore（独立列表），**绝不并入 R_DOMAIN** —— 强制 S≠R 异类。
//   · R_DOMAIN 全程只读，永不在本模块被改动。

import { domainOf } from './attribution.mjs';
import { R_DOMAIN } from './law.mjs';

// R 只读引用（新华字典本体）。本模块永不修改它。
const R_DICTIONARY = R_DOMAIN;

// ───────────────────────── 纯函数：可逆性分类（疤/窗/无痕） ─────────────────────────
// 对应三个洞之一「可逆性＝疤/窗」：write/覆盖写＝window（可逆、X 可改）；delete＝scar（不可逆、须留不可覆盖记录）；read＝none（无痕）。
export function classifyReversibility(action = '') {
  const s = String(action || '');
  // 覆盖写 `>`（重定向覆盖）：可逆窗口。排除 `->` 这类箭头（非覆盖写）。
  if (/>/.test(s) && !/->/.test(s)) return { reversible: 'window', overwrite: true };
  const SCAR = /\b(rm|rmdir|shred|unlink|del|delete|remove|truncate|wipe|mkfs|format|drop|purge|reset\s+--hard)\b/i;
  const WINDOW = /\b(cp|copy|mv|move|write|edit|overwrite|redirect|set|update|patch|insert|append)\b/i;
  const NONE = /\b(read|cat|type|less|more|head|tail|ls|dir|get|query|fetch|show|print|view)\b/i;
  if (SCAR.test(s)) return { reversible: 'scar', overwrite: false };
  if (WINDOW.test(s)) return { reversible: 'window', overwrite: />/.test(s) };
  if (NONE.test(s)) return { reversible: 'none', overwrite: false };
  return { reversible: 'unknown', overwrite: false };
}

// R 域标签（经 domainOf，短名 Cosmic/Earth/Macro/Micro）：支持单/多域 D（多域交叉、一词跨域同用）。
export function rDomainsForLayer(layer) {
  if (layer == null) return [];
  const layers = Array.isArray(layer) ? layer : [layer];
  const out = [];
  for (const lv of layers) {
    const d = domainOf(lv);
    if (d && d.name) out.push(d.name);
  }
  return out;
}

export class SAccountLedger {
  constructor() {
    this.rDictionary = R_DICTIONARY; // 只读：新华字典本体
    this.rStore = [];                // 沉入 R 的永久 S 记录（独立列表 ⇒ 强制 S≠R 异类）
    this.catalog = new Map();        // term(字典序索引) -> SRecord[] ；索引键＝term（词），非域
    this._seq = 0;                   // S 序位（只增不减）
  }

  // D 触发 → 打轴标记（t=时间序位）→ S 刻痕 → 沉入 R（永久沉淀，但 S 类别不并入 R_DOMAIN）。
  // 这是"X 轴 D 窗口"的唯一入口：一切外部输入只由此进账本。
  record({
    term,
    sign = '0',                 // '+' ＝ S 路径加强 / '-' ＝ D 路径侵蚀 / '0' ＝ 中性
    rDomains = [],              // R 域标签（元数据，非索引键）；可由 rDomainsForLayer(attrib.layer) 得到
    reversible = 'unknown',     // scar / window / none / unknown（X 轴可变性区分）
    overwrite = false,          // 覆盖写 `>` 标志
    action = null,              // 原始动作串：传入则经 classifyReversibility 自动推导 reversible/overwrite（引擎走这条）
    detail = null,
    subsystem = 'core',
    t = Date.now(),             // D 触发时刻（轴标记 X 坐标）
  } = {}) {
    // 若传了 action，优先由其推导可逆性（覆盖显式 reversible/overwrite）。对应「可逆性＝疤/窗」洞。
    const rev = action ? classifyReversibility(action) : { reversible, overwrite };
    const key = (term && String(term)) || subsystem || '∅';
    const rec = {
      seq: ++this._seq,         // S 序位（只增不减）
      term: key,
      sign,
      rDomains: Array.isArray(rDomains) ? [...rDomains] : (rDomains ? [rDomains] : []),
      reversible: rev.reversible,
      overwrite: rev.overwrite,
      // [2026-09-20 · 洞③ 刻痕存原始动作] 旧实现只存 detail（版本标记）而丢弃原始动作串
      //   ⇒ 事后审计拿到刻痕却读不出"当时到底做了什么"（coze/51 实测：sSeq[0].detail = null）。
      //   刻痕＝账本的证据；无原始动作的刻痕不可溯。此处附加 action（只加字段，不改裁决）。
      action: action ?? null,
      detail: detail ?? null,
      subsystem,
      t,
    };
    if (!this.catalog.has(key)) this.catalog.set(key, []);
    this.catalog.get(key).push(rec);
    this.rStore.push(rec);      // 沉入 R（永久沉淀）
    return rec;
  }

  // 目录按 term 字典序（类新华字典）呈现 —— 用户指定"按首字母顺序排，不像按域排"。
  byTerm() {
    return [...this.catalog.keys()]
      .sort((a, b) => String(a).localeCompare(String(b)))
      .map((term) => ({ term, records: this.catalog.get(term) }));
  }

  // 按 term 查 S 记录（"从目录里找出相对应的 S"）。
  findByTerm(term) {
    return this.catalog.get(term) || [];
  }

  // S 序列（只增不减，按序位）。
  sSeq() {
    return this.rStore.slice().sort((a, b) => a.seq - b.seq);
  }

  // 某 term 的 R 域标签并集（多域 D 的验证点：一条 D 跨多域 → 记录挂多个域标签）。
  rDomainsOf(term) {
    const recs = this.catalog.get(term) || [];
    const set = new Set();
    for (const r of recs) for (const d of r.rDomains) set.add(d);
    return [...set];
  }

  // 多域 term 清单（一条 D 跨多个 R 域）。
  multiDomainTerms() {
    const out = [];
    for (const [term, recs] of this.catalog) {
      const set = new Set();
      for (const r of recs) for (const d of r.rDomains) set.add(d);
      if (set.size > 1) out.push(term);
    }
    return out;
  }

  // 可逆性视图（疤/窗/无痕 分组）—— 对应「可逆性＝疤/窗」洞。
  reversibilityView() {
    const g = { scar: [], window: [], none: [], unknown: [] };
    for (const r of this.rStore) (g[r.reversible] || g.unknown).push(r);
    return g;
  }

  // 覆盖写清单（X 轴可覆盖动作）—— 对应「覆盖写 `>`」洞。
  overwriteRecords() {
    return this.rStore.filter((r) => r.overwrite);
  }

  size() {
    return this.rStore.length;
  }

  // 结构自检：R_DOMAIN 未被 S 改动（强制 S≠R 异类）—— 消融/最小完备的结构约束。
  // 返回 { rUntouched, sDistinctKind }。
  invariantCheck() {
    const before = R_DOMAIN.hierarchy.length;
    // S 记录只在 rStore，绝不在 R_DOMAIN.hierarchy 内（类型/容器双重隔离）。
    const sLeakedIntoR = R_DOMAIN.hierarchy.some((h) => typeof h.seq === 'number');
    return {
      rUntouched: before === R_DOMAIN.hierarchy.length && !sLeakedIntoR,
      sDistinctKind: this.rStore.every((r) => typeof r.seq === 'number')
        && R_DOMAIN.hierarchy.every((h) => h.seq === undefined),
    };
  }
}

export default SAccountLedger;
