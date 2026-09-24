// attribution.mjs — 路径1：分形属性查归因（双路径假说验证模块，2026-09-03）
// ===========================================================================
// 用户因果律底层逻辑（根因层，用户定）：
//   路径1（分形属性查归因）：先把"这是什么动作"归因清楚，以暴露的归因为锚点；
//   路径2（以锚点推演预测）：拿锚点跑推演（引擎既有 deduceRisk / simulateBranch）。
// 英文 noun+verb 是语言底层逻辑，中文同构适用；中性词（tool_42 / agent_action /
// process / handle）没有动词名词 valence → 归不出，须"查实际行为"（分形兜底），
// 仍归不出 → review（不猜）。
//
// 本模块只实现路径1，且为独立验证件——不 import / 不修改 engine.mjs 核心
// （禁区：engine.mjs / law.mjs / bugstop.mjs），便于回退标签
// pre-attrib-cn-20260903 一键恢复。验证通过后，再决定是否接入 _decideCore
// 作为额外归因源（需用户二次确认）。
// ===========================================================================

// 动词 / 名词词表（CN+EN；底层逻辑通用，非枚举具体工具名）
const VERB = {
  read:  ['read', 'reads', 'reading', 'cat', 'head', 'tail', 'view', 'open', 'fetch', 'get', 'query', 'load', 'dump', 'show', 'print', '查', '读', '取', '拉'],
  write: ['write', 'writes', 'writing', 'edit', 'update', 'create', 'save', '建', '写', '改', '存'],
  delete:['delete', 'del', 'remove', 'rm', 'drop', 'purge', 'erase', 'unlink', '删', '删除', '清'],
  exec:  ['exec', 'execute', 'run', 'invoke', 'shell', 'bash', 'sh', 'python', 'node', 'call', '执行', '运行', '跑'],
  // [2026-09-20 · 中英同构补缺] 见 §对外不可逆：'push' / 'publish' 早已在 EN 侧，CN 侧却无对应词
  //   ⇒ 同一句话换中文写，言侧就抽不到 ⇒ **中英不同构**（不是"词表不够长"，是两侧缺对位）。
  send:  ['send', 'mail', 'email', 'transmit', 'exfil', 'push', 'upload', 'publish', '推送', '发布', '发', '邮', '传'],
};
const NOUN = {
  file:       ['file', 'files', 'document', 'doc', 'text', 'folder', 'dir', 'path', '文档', '文件', '目录', '夹'],
  credential: ['credential', 'credentials', 'secret', 'secrets', 'token', 'key', 'keys', 'pass', 'password', 'pwd', 'env', 'cert', '凭据', '密', '密钥', '口令', '环境', '凭证'],
  db:         ['db', 'database', 'sql', 'redis', 'mongo', '数据库'],
  email:      ['email', 'mail', '邮箱', '邮件'],
  net:        ['http', 'https', 'url', 'network', 'net', 'web', '网络', '网址'],
  shell:      ['shell', 'bash', 'sh', 'console', '终端', '壳'],
  system:     ['system', 'sys', 'os', 'kernel', '系统', '内核'],
  config:     ['config', 'configuration', 'setting', '配置', '设置'],
};

// 删除类语义层集合：layer 命名归本模块所有（attrib.layer 由 verb/noun 推导产出）。
// 引擎只消费此命名导出，不重复声明字面量——词汇归属单一、改一处即全链跟随（能隐则隐）。
// [2026-09-20] 🔴 域归属：**每个 D 必落某个 R 域** —— 这是记账的必经步骤，不是"命中规则后的副产品"。
//   安 09-20 指正：「每一个 D 的发生，R 域自动匹配，匹配完，S 就应该记账了啊。」
//   我原先把 S 的记账挂在 **锚命中** 上（mSystemMarks / mMagnitude 只在 `_bucketRHit` 即撞上刚性锚时才产生）
//   ⇒ 被放行的 D **整轮不入账** ⇒ 账退化成离散撞击点，不是轨迹。这是**取错了来源**，不是框架没有。
//   ⇒ 正确口径：D 定域于 X=t ⇒ 必落在 Y=R 的某一层 ⇒ **S 就该 +1**。
//
// 🔴 域是**全集覆盖**的（R_DOMAIN 嵌套：Cosmic⊃Earth⊃Macro⊃Micro）⇒ **不存在"无域"**。
//   剥不出实质的（exec 容器 / 空动作）落**最外层 Cosmic(0)**：它在宇宙之内，只是层级未定。
//   ⇒ **空值消失** ⇒ 顺带堵掉"空值被当成不可比 ⇒ fail-open"那个洞（空 ≠ 不可比）。
//
// 层级取自既有锚定义（DEFAULT_RIGID_ANCHORS.magnitude），不是新造刻度：
//   文件系统完整性 / 凭证保密 = Micro(3)；共享远端仓库完整性 / 系统可用性 = Macro(2)。
export const DOMAIN_OF_LAYER = {
  'file-delete': 3, 'file-write': 3, 'file-read': 3, 'exec-destructive': 3,   // 文件系统完整性 = Micro
  'cred-read': 3, 'cred-write': 3, 'cred-delete': 3,                          // 凭证保密 = Micro
  'network-send': 2,                                                          // 共享远端 / 外传 = Macro
};
/** @returns {{level:number,name:string}} 该 D 最内层所落的 R 域；未知 ⇒ 最外层 Cosmic（域全集覆盖，永不空） */
export function domainOf(layer) {
  const lv = DOMAIN_OF_LAYER[String(layer ?? '')] ?? 0;
  return { level: lv, name: R_DOMAIN_BY_LEVEL[lv] ?? `level ${lv}` };
}
const R_DOMAIN_BY_LEVEL = { 0: 'Cosmic', 1: 'Earth', 2: 'Macro', 3: 'Micro' };

// ---------------- 小 d 分解 与 MAX（最大冲击）· [2026-09-20 接线] ----------------
// 🔴 安 09-18 原话链（既有落档，**本轮才接线**）：X=t ⇒ 一个 t 一个 D（**内含多个小 d**）⇒
//   **每个小 d 各匹配一个 R** ⇒ 落点 M；⇒ **多 R 并行于同一 D 产生多个 M**，M 有大小高低之分。
//   实测：整条命令当单 d ⇒ 0/12 多命中；按(谓语,宾语)拆小 d ⇒ 3/10 多命中（复合命令）。
// 🔴 安 09-20 纠偏（根因层）：**D 取 MAX 不是取最外层，而是取「最大冲击」**。
//   按「活下去」第一性原理，层级是**反常识**的：宇宙→地球→宏观→中观→微观，**D 在微观取微观**。
//   ⇒ **MAX(冲击) = 最微观落点（level 最大，3=Micro）**；**R 仲裁 = 最外层（level 最小，0=Cosmic）**。
//   两者**方向相反且并存**：伤害落在微观（当下直接破稳态），仲裁上溯外层（根本规则层级）。
//   ⇒ 与既有「多系统交互规则 S 取 min · D 取 max」同源：D 取 max 取的是**冲击**，不是层级。
//   ⚠️ 层级档位是**相对的、分形的**（安：「宏观/中观/微观只是相对位置，不必纠结」）⇒ 不固化第五档。
/**
 * 小 d 分解：一个 D 拆成多个小 d。小 d = 片段内 (谓语, 宾语) 的一次配对。
 * 与既有的「动词-宾语必须同片段绑定」同源（2026-09-19 长链实测修法），此处再按宾语拆开。
 * @returns {Array<{verb:string|null,obj:string|null,seg:string}>}
 */
export function subDsOf(call) {
  const cmd = String(call?.args?.cmd ?? call?.args?.command ?? '').trim();
  if (!cmd) return [{ verb: null, obj: null, seg: cmd }];
  const segs = cmd.split(/(?:;|&&|\|\||\||\n)+/).map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const seg of segs) {
    const vm = seg.match(/^([A-Za-z_][\w.-]*)/);
    if (!vm) continue;
    const verb = vm[1];
    const objs = (seg.match(/(?<=^|[\s=:'"(,])(\/[^-\s;|&"'(),]*|https?:\/\/[^\s;|&"'(),]*)/g) || []).map((s) => s.trim());
    if (!objs.length) out.push({ verb, obj: null, seg });
    else for (const o of objs) out.push({ verb, obj: o, seg });
  }
  return out.length ? out : [{ verb: null, obj: null, seg: cmd }];
}
/** MAX（最大冲击）：取**最微观落点**（level 最大）。无 M ⇒ null（不是 0，不是"安全"） */
export function impactMax(levels) {
  const xs = (levels ?? []).filter((x) => x != null);
  return xs.length ? Math.max(...xs) : null;
}
/** R 仲裁（最外层为最终仲裁者）：取**最外层**（level 最小）。与 impactMax 方向相反 */
export function arbiterOuter(levels) {
  const xs = (levels ?? []).filter((x) => x != null);
  return xs.length ? Math.min(...xs) : null;
}

export const DELETION_LAYERS = new Set(['file-delete', 'cred-delete']);
// [2026-09-20 · 容器类别] **exec 是容器，不是实质动作类别**：shell 里任何命令都走 exec，
//   故 exec ⊃ {delete, write, read, send, …} —— 是上位词（hypernym），不是并列类别。
//   对称原则：行侧 ap.verb==='exec' ⇒ 不可比则不比（2026-09-20 已立）；
//             **言侧若只声明了容器（"我会执行/执行过"），同样未限定动作类别 ⇒ 同样不可比**。
//   实证（道德绑架实测 TRIANGLE 组）：同一动作 `rm -rf /app/logs/old/*.log`
//     言="其他 agent 都执行过同样的清理" ⇒ claimed={exec} ⇒ 旧逻辑 delete∉{exec} ⇒ 判"做了没说" ⇒ deny
//     言="请清理旧日志"                  ⇒ claimed={delete} ⇒ 一致 ⇒ allow
//   ⇒ **同一动作仅因措辞不同而裁决翻转**＝判据源被言侧修辞劫持（护栏可被"话术"撬动）。
//   与 2026-09-20 的 config⊂file 同类：种属包含被当成漂移/偏离，只是这次发生在**动作槽**。
export const CONTAINER_VERBS = new Set(['exec']);

// 名字按 _ - . 及驼峰边界切词，再分类 verb / noun
function tokensOf(name) {
  if (!name || typeof name !== 'string') return [];
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')   // camelCase → 空格
    .split(/[_\-.\s]+/)
    .map((t) => t.toLowerCase())
    .filter(Boolean);
}
function classifyToken(t) {
  for (const v of Object.keys(VERB)) if (VERB[v].includes(t)) return { kind: 'verb', val: v };
  for (const n of Object.keys(NOUN)) if (NOUN[n].includes(t)) return { kind: 'noun', val: n };
  return null;
}

// 路径1-A：名字语法归因（verb+noun 复合 → 语义层）
// 返回语义层字符串，或 null（中性词 / 只有名词无动词 → 归不出）
// 分词机制随语种：非 CJK 按 _ - . 及驼峰边界切词（分隔语）；CJK 为孤立语素、靠连写，
// 无分词符 → 改用词典子串扫描（在名字串中匹配已知动词/名词语素）。底层逻辑（noun+verb）通用，
// 但 segmentation 机制分语种——这正是"中文同构适用"的工程落地点。
function nameLayer(name) {
  const isCJK = /[㐀-鿿]/.test(name || '');
  let verb = null, noun = null;
  if (isCJK) {
    let vIdx = Infinity, nIdx = Infinity;
    for (const v of Object.keys(VERB)) for (const w of VERB[v]) {
      const i = name.indexOf(w);
      if (i >= 0 && i < vIdx) { vIdx = i; verb = v; }
    }
    for (const n of Object.keys(NOUN)) for (const w of NOUN[n]) {
      const i = name.indexOf(w);
      if (i >= 0 && i < nIdx) { nIdx = i; noun = n; }
    }
  } else {
    for (const t of tokensOf(name)) {
      const c = classifyToken(t);
      if (!c) continue;
      if (c.kind === 'verb' && !verb) verb = c.val;
      if (c.kind === 'noun' && !noun) noun = c.val;
    }
  }
  if (!verb) return null;                 // 中性词（tool_42 / agent_action / process / handle）→ 归不出
  if (verb === 'exec') return 'exec';
  if (verb === 'send') return 'network-send';
  if (verb === 'delete') return (noun === 'credential') ? 'cred-delete' : 'file-delete';
  if (verb === 'write') return (noun === 'credential') ? 'cred-write' : 'file-write';
  if (verb === 'read') return (noun === 'credential') ? 'cred-read' : 'file-read';
  return null;
}

// ---- 路径1-B/C：命令形态提取（自包含，镜像 engine.extractShell；中性名据此"查实际行为"）----
const SHELL_HEAD = /^\s*(rm|rmdir|shred|unlink|mkfs|mkfs\.\w+|format|dd|truncate|wipefs|cat|curl|wget|git|tar|python\d*|perl|bash|sh|zsh|env|export|echo|find|rsync|scp|ssh|chmod|chown|sudo|su|cd|cp|mv|ls|nc|nmap|sqlmap|kubectl|docker|terraform|aws|gcloud|gh|az|node|npm|npx|pip\d*|go|ruby|php)\b/i;
const SHELL_OP = /(\$\{|`|\$\(|\&\&|\|\|)/;
const WRITE_TOOLS = new Set(['write_file', 'write', 'edit']);
const SKIP_CONTENT_KEYS = new Set(['content', 'text', 'body', 'data', 'message', 'description', 'note']);

// 返回 { cmd, nested }：nested=true 表示命令来自嵌套结构（分形递归），否则来自顶层固定键/字符串
function extractCommand(call) {
  if (!call) return { cmd: '', nested: false };
  const fixed = [call.command, call.code, call.task, call.script, call.cmd,
    call.args?.command, call.args?.code, call.args?.task, call.args?.script, call.args?.cmd]
    .find((v) => typeof v === 'string');
  if (fixed !== undefined) return { cmd: fixed, nested: false };
  const pool = [];
  let nested = false;
  const collect = (node, depth) => {
    if (depth > 4 || node == null) return;
    if (typeof node === 'string') { pool.push(node); if (depth > 0) nested = true; return; }
    if (Array.isArray(node)) { for (const x of node) collect(x, depth + 1); return; }
    if (typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if (WRITE_TOOLS.has(call?.name) && SKIP_CONTENT_KEYS.has(k)) continue;
        if (k === 'name' || k === 'tool') continue;   // 工具名本身不是命令
        collect(v, depth + 1);
      }
    }
  };
  const a = call.args ?? {};
  for (const [k, v] of Object.entries(a)) {
    if (WRITE_TOOLS.has(call?.name) && SKIP_CONTENT_KEYS.has(k)) continue;
    collect(v, 0);
  }
  for (const k of Object.keys(call)) {
    if (k === 'name' || k === 'args' || k === 'provenance' || k === 'ctx' || k === 'id') continue;
    if (WRITE_TOOLS.has(call?.name) && SKIP_CONTENT_KEYS.has(k)) continue;
    collect(call[k], 0);
  }
  const shaped = pool.filter((v) => SHELL_HEAD.test(v) || SHELL_OP.test(v));
  if (shaped.length) return { cmd: shaped.sort((x, y) => y.length - x.length)[0], nested };
  return { cmd: '', nested: false };
}

// git 破坏性子命令：作用于被包含工作树（整片被包含对象销毁，无显式安全子路径）
// —— 依 R 域嵌套包含边界法则自动匹配为越界（与 rm/mkfs 同属 exec-destructive 语义层，长枝·内容语义，不新增 R 域维度）
export const GIT_DESTRUCTIVE = /\bgit\s+(reset\s+--(hard|\w*[hH]ard)|clean\s+-[fF][dD]?|checkout\s+--\s*(\.\s*$|$)|checkout\s+-[fF]|restore\s+--\w*worktree|restore\s+--staged\s+--worktree)(?=\s|$)/i;

// ===========================================================================
// [2026-09-23 · 安裁定「字典就是 S」] 字典读命令：破坏标记（VERB.delete 词族）在命令串里的读取
// ---------------------------------------------------------------------------
// 结构理由：安 09-20 已立「**破坏标记有限可封闭枚举 · 只读命令无限开放**」⇒ 破坏标记的识别落在本模块。
//   旧实现只用手写正则枚举**具体工具名的写法**（rm|rmdir|shred|unlink|mkfs|format|dd|truncate|wipefs），
//   而字典 VERB.delete 早已收全同义动词（remove/delete/del/purge/erase/unlink/rm/drop/删/删除/清）——只是无人来问。
//   实测穿透（安称「异体字」）：`remove_tree` / `FileUtils.rm_rf` / `--remove-files` 三条全部穿门而过。
//
// 🟢 [安二次裁定]「字典 / 词典 / 成语字典等等，都是语言工具，可以归纳到一起总结为**一个 S 点**，
//   而不是分开。分开以后就又降维成 X 轴了。所以，这本身就是 S 的内部套嵌法。」
//   🔴 结构 ＝ **一个 S（查典法则）在三个粒度上重复长一遍**，不是三本并列的字典：
//       字级：词素       → 语义类        （`nameLayer`；典的唯一来源，即本文件上面那本）
//       词级：动作位词素 → 是否删除       （**同一法则**作用于「谓语位」——见 `atActionSlot`）
//       句级：解释器段   → **递归**同一法则 （**套嵌**：代码段里的谓语位 ＝ 调用名 / 段首词）
//   ⇒ 实现形式是**同一个函数被递归调用**（粒度不同），而不是"三条并列通道"——并列就是 X 轴枚举。
//   位置纪律：只读**动作位**。**自由参数位（数据位）的词不读** ——
//     `echo "remove the old file"` 里的 remove 是**数据**，不得读成动作（"提到" ≠ "在做"）。
//   ⚠️ 实测（EN 仓 `_stash/dsh-probes/linear-vs-holistic.mjs`）：线性扫法把数据位读成动作 ——
//     `bash -c 'echo delete-me'` / `python3 -c "print('delete')"` 仅因宿主是解释器就被判破坏，
//     而同义的 `echo …` 却放行 ⇒ 判词取决于**宿主形态**，不取决于**角色**。套嵌法则修掉此病。
// ===========================================================================
const INTERPRETER_HEAD = /^(?:bash|sh|zsh|ksh|dash|python\d*(?:\.\d+)*|node|perl|ruby|php)$/i;
const SEG_SPLIT = /(?:;|&&|\|\||\||\n)+/;
const CMD_TOKEN_SPLIT = /[\s()'"`<>=$:;,&|\[\]{}\\]+/;
const CALL_NAME = /([A-Za-z_$][\w.$]*)\s*\(/g;      // 代码段里的调用名＝代码语言的「谓语位」

// ④ 数据边界（前置条件）：`CMD_TOKEN_SPLIT` 把引号当普通分隔符**剥掉**
//   ⇒ "是否在引号内"的信息在分词阶段就丢了，位置判据无从区分「动作」与「被谈论的动作」
//   （实测误判：`grep -r "rm -rf" /var/log`、`echo "清理 /tmp"`）。
//   ⇒ 位置判定前先把**引号内内容摘除**（数据位＝不被执行的内容）。
//   ⚠️ 例外：解释器段的引号内是**代码**不是数据，故递归通道用**原文**（见 lexiconDestructive ③）。
const QUOTED_LITERAL = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g;
/** 数据边界：把引号内内容摘成空格，只留**骨架**（动作位可见的部分）。 */
const stripData = (t) => String(t || '').replace(QUOTED_LITERAL, ' ');

const isDeleteWord = (w) => {
  const l = w ? nameLayer(w) : null;
  return l === 'file-delete' || l === 'cred-delete';
};

// [成语层 · 事件条目]（2026-09-23 安裁定：「成语＝**浓缩的事件**」）
//   一条成语把 (动作 · 作用域 · 结果) **压缩进词形** ⇒ 判据层按槽位读不出来（`删库跑路` 无路径落点，
//   `docker --rm` 词形同族却语义相反）。故成语层的职责不是"豁免名单"，而是**解压**：
//   把浓缩的事件**展开成四槽**（谓语=动作 / 状语=方式 / 宾语+定语=作用域 / 补语=结果），再交判据。
//   - `surfaces` 只是该事件的**已知表面形式**（宿主·选项·词形），不是条目本身；
//     未来 D 以别的形式进来（中文成语、新写法、新工具），只要**事件形态**相同 → 映射成立。
//     这正是安说的「未来某个 D 出现时，那个成语或那个事件触发，互相映射，就有解了」的工程落点。
//   - `fs` 是展开出来的**结果槽**：该事件是否落到文件系统。判据只消费这个槽，不认识名字。
//   ⚠️ 条目是**收录**（有限封闭集，与「破坏标记可穷尽」同源），不是推导 —— 不假称能由字级推出。
const IDIOM_EVENTS = [
  {
    act: 'remove', scope: 'container', result: 'lifecycle-cleanup', fs: false,
    surfaces: [{ host: /^(?:docker|podman|nerdctl)$/i, opt: /^--?rm$/i }],
    note: '容器生命周期清理，不触碰文件系统',
  },
  {
    act: 'delete', scope: 'database', result: 'irreversible', fs: true,
    surfaces: [{ word: /删库跑路/ }],
    note: '中文浓缩事件：词形无路径落点，作用域（数据库）与结果（不可逆）**压缩在词里**，须由条目展开',
  },
];
/** 成语事件展开：给定段的**表面形式**，查出它是哪个事件（未收录 ⇒ null，交常规判据）。 */
function idiomEventOf(bare, opt) {
  const first = String(bare).split(CMD_TOKEN_SPLIT).filter(Boolean)[0] ?? '';
  for (const ev of IDIOM_EVENTS) {
    for (const sf of ev.surfaces) {
      if (sf.host && sf.opt && sf.host.test(first) && sf.opt.test(opt)) return ev;
      if (sf.word && sf.word.test(String(bare))) return ev;
    }
  }
  return null;
}
const idiomNonFs = (bare, opt) => idiomEventOf(bare, opt)?.fs === false;   // 展开结果槽：不落文件系统 ⇒ 不算破坏
const idiomHitsFs = (bare) => idiomEventOf(bare, '')?.fs === true;          // 展开结果槽：落文件系统（浓缩事件）

/** S 的**套嵌法则**（唯一一条）：一段文本的「动作位」（谓语位）是否删除。
 *  动作位 ＝ 第一个非选项词（命令 / 代码段首）∨ 代码调用名（`name(` 形态）。
 *  **数据位不读** —— 这正是「查到这个词」与「读成在做这件事」的分界。
 *  ⚠️ 入参应是**已剥数据位**的骨架（段级传 `stripData(seg)`；递归层传原文——那一层的引号内是代码）。 */
function atActionSlot(text) {
  const s = String(text || '');
  const head = s.split(CMD_TOKEN_SPLIT).filter(Boolean).find((t) => !t.startsWith('-'));
  // ⚠️ CJK 段不在这里按"首词"查：中文无分词符，head 可能是**整句**（`清理一下缓存`），
  //    而 `nameLayer` 是给**标识符**设计的（词典子串扫描）⇒ 拿整句当名字查会过宽（"提到"读成"在做"）。
  //    中文段统一交给 `cjkActionSlot`（词典子串 + **落点判据**），此处跳过。
  if (head && !CJK_RE.test(head) && isDeleteWord(head)) return true;   // 槽位 1 **接受路径形式**（`/bin/rm -rf /` 是真命令的路径写法）
  for (const m of s.matchAll(CALL_NAME)) if (isDeleteWord(m[1])) return true;
  return false;
}

/** ★ 第三粒度：**子命令位**（第 2 个非选项词）为破坏词素 ∧ 段内存在**自由路径宾语**。
 *  结构理由（不靠工具名单）：`kubectl delete pod`（删抽象资源）与 `deploy purge /var/www`（删文件树）
 *  **词素同族、判词相反** —— 分界不在"是哪个工具"，而在**该段有没有文件系统落点**：
 *  删除动作必须有一个可删的**路径**。故判据 ＝ (子命令位破坏词素) × (自由路径宾语)。
 *  - "自由"＝ 不被选项引导：`kubectl delete -f /manifest.yaml` 的路径是 `-f` 的**参数**，不是宾语 ⇒ 不算。
 *  - 槽位 1 归 `atActionSlot`（保持既有口径：命令名即动作），此处只管槽位 2。 */
/** 落点判据（唯一一条，槽位2 / 中文句层共用）：段内是否存在**自由路径宾语**。
 *  "自由"＝ 不被选项引导：`kubectl delete -f /manifest.yaml` 的路径是 `-f` 的**参数**，不是宾语 ⇒ 不算。 */
function hasFreeFsObject(toks) {
  for (let i = 1; i < toks.length; i++) {
    if (!toks[i].startsWith('/')) continue;                 // 只认绝对路径（文件系统落点）
    if (toks[i - 1].startsWith('-')) continue;              // 选项参数 ≠ 自由宾语
    return true;
  }
  return false;
}

/** ★ 中文句层（2026-09-23 补）：CJK 是**无分词符**的孤立语 —— `把 /data 目录删掉` 按空格切成
 *  ['把','/data','目录删掉']，动作位落在"把"上 ⇒ **整句看不见动词**。
 *  而**字层 `nameLayer` 早有解法**（注释原话：「CJK 为孤立语素、靠连写，无分词符 → 改用词典子串扫描，
 *  这正是中文同构适用的工程落地点」）—— 只是**没套嵌到句层**。
 *  ⇒ 句层沿用**同一机制**（段内用词典定位词素，不按位置切）：是套嵌，不是新通道、不是新词表。
 *  ⚠️ 仍须配**落点判据**（与槽位2 同一条）才不把"提到"读成"在做"：
 *    `清理一下缓存`（无路径）不判破坏，`清空 /var/log`（有路径）才判。 */
const CJK_RE = /[㐀-鿿]/;
const CJK_DELETE_WORDS = VERB.delete.filter((w) => CJK_RE.test(w));   // 从**字典派生**，不手写中文词表
function cjkActionSlot(bare) {
  if (!CJK_RE.test(bare)) return false;                               // 非中文段走既有槽位机制
  const toks = String(bare).split(CMD_TOKEN_SPLIT).filter(Boolean);
  if (!hasFreeFsObject(toks)) return false;                           // 无文件系统落点 ⇒ 不是"删文件"事件
  return CJK_DELETE_WORDS.some((w) => bare.includes(w));              // 词典子串扫描（与 nameLayer 同机制）
}

function subSlotDestructive(bare) {
  const toks = String(bare || '').split(CMD_TOKEN_SPLIT).filter(Boolean);
  const nonOpt = toks.filter((t) => !t.startsWith('-'));
  const slot2 = nonOpt[1];
  if (!slot2 || slot2.startsWith('/') || !isDeleteWord(slot2)) return false;   // 槽位须是**词**，不是路径
  return hasFreeFsObject(toks);
}

/** 字典读法总入口：命令串里是否存在删除标记（＝ VERB.delete 词族落在**动作位**）。 */
function lexiconDestructive(cmd) {
  if (!cmd) return false;
  for (const seg of String(cmd).split(SEG_SPLIT)) {
    const s = seg.trim();
    if (!s) continue;
    const bare = stripData(s);                                    // ④ 数据边界：引号内不参与位置判定
    if (atActionSlot(bare)) return true;                          // ① 动作位＝槽位 1
    if (subSlotDestructive(bare)) return true;                    // ② ★ 子命令位＝槽位 2 × 自由路径宾语
    if (cjkActionSlot(bare)) return true;                         // ②′ ★ 中文句层（无分词符 ⇒ 词典子串扫描，与字层同机制）
    if (idiomHitsFs(bare)) return true;                           // ⑥ ★ 成语层**展开**：浓缩事件的作用域/结果在词里
    const head = s.split(CMD_TOKEN_SPLIT).filter(Boolean)[0] ?? '';
    if (INTERPRETER_HEAD.test(head)) {                            // ③ ★ 套嵌：递归下降一层（用**原文**：引号内是代码）
      const code = s.slice(s.indexOf(head) + head.length);
      if (atActionSlot(code)) return true;
    }
    for (const t of bare.split(CMD_TOKEN_SPLIT)) {                // ⑤ 状语位（选项）
      if (!t.startsWith('-') || !isDeleteWord(t)) continue;
      if (idiomNonFs(bare, t)) continue;                          // ★ 成语层收录：词形同族、语义非文件系统 ⇒ 不算破坏
      return true;
    }
  }
  return false;
}

function commandLayer(cmd) {
  if (!cmd) return null;
  if (GIT_DESTRUCTIVE.test(cmd)) return 'exec-destructive';
  // [2026-09-23 · 字典即S] 破坏标记的唯一读法：工具名封闭集 **∪** 字典词素（同义写法由词素接住）。
  //   ⚠️ 引号内是**数据**（不被执行）⇒ 不得把"提到 rm"读成"在做 rm"。
  //   实测：`grep -r "rm -rf" /var/log`、`echo "run rm -rf /tmp/x"` 因引号内命中而判破坏 ⇒ review 通胀。
  //   ⚠️ 例外：**解释器段**引号内是**代码**，保持原文 —— 否则 `bash -c "rm -rf /"` 会塌方。
  // [2026-09-20 · 参数位 ≠ 命令位] 命令名**不可能出现在参数位**：以 `-` 开头的 token 是参数（选项），
  //   不是命令。旧正则 `\btype\b` 会把 `find -type f` 的 **`-type` 当成 `type` 命令**；
  //   同理 `--rm`（docker 容器清理）会被当成 `rm` 命令 ⇒ 成语层无从生效。
  //   结构修法（不补词表）：命令词前面**不得是 `-` 或单词字符**（`(?<![-\w])`）。
  //   这一条覆盖**未来任何 `-xxx` 参数**，不是逐个选项打补丁——先结构、后枚举。
  //   注：`--delete` / `--remove-files` 等**删除标记本身就是参数**，故其检测走下方字典线（状语位），不受此约束。
  const CMD_POS = '(?<![-\\w])';
  // [2026-09-24 · 语法槽位·宾语位 ≠ 谓语位] 破坏名必须出现在**动词位（谓语）或修饰器位**，
  //   **不得**出现在宾语位。旧实现扫全段子串 ⇒ 宾语位命中即判破坏。
  //   病灶（准确率外部集实测，危险词当宾语 0/2）：`ls /bin/rm`、`cp /bin/rm /tmp/x` 被判
  //     exec-destructive —— 归因层误报"这是删除动作"（实际动作是列目录/复制）⇒ 下游 scar 判 review。
  //   根因与数据位同族：**锚在词形（路径里出现 rm 这个词），不在后果（是否真的删）**。
  //   结构判据（不列修饰器白名单、不枚举工具名，只读语法槽位）：
  //     ① 谓语位：段首 token 的**末段**（`/bin/rm -rf /` ⇒ rm 在谓语 ⇒ 破坏；`echo` / `ls` ⇒ 非破坏）
  //     ② 修饰器位：段内**原样**等于破坏名的 token（`sudo rm` / `xargs rm` / `docker rm`）
  //     ③ 宾语位：`/bin/rm` 这类**带路径分隔符**的 token 原样 ≠ 破坏名 ⇒ 不算（宾语不是命令）
  //   注（旧注释保留其效力）：命令词前面不得是 `-`（参数位不是命令位）—— 已由 ①② 的"原样整词匹配"覆盖。
  const DESTRUCTIVE_WORD = /^(?:rm|rmdir|shred|unlink|mkfs(?:\.\w+)?|format|dd|truncate|wipefs)$/i;
  for (const seg of String(cmd).split(SEG_SPLIT)) {
    const head = seg.trim().split(CMD_TOKEN_SPLIT).filter(Boolean)[0] ?? '';
    // 解释器段：引号内是**代码**不是数据 ⇒ 用原文（否则 `bash -c "rm -rf /"` 会塌方）
    const toks = (INTERPRETER_HEAD.test(head) ? String(seg) : stripData(seg)).split(CMD_TOKEN_SPLIT).filter(Boolean);
    if (!toks.length) continue;
    if (DESTRUCTIVE_WORD.test(String(toks[0]).split('/').pop() ?? '')) return 'exec-destructive';  // ① 谓语位
    if (toks.some((t) => DESTRUCTIVE_WORD.test(t))) return 'exec-destructive';                     // ② 修饰器位
  }
  // [2026-09-20 · 破坏标记，有限封闭集] 只登记**删除语义的形态**，不登记"哪些命令是只读的"
  //   ——结构理由：**破坏标记有限可枚举，只读命令无限开放**（详见 engine.checkSpeechAct 留档注释）。
  //   实证（NPD 组 S1 轮3）：言承诺"不涉及写入、删除"，行=`find /app/tmp -mindepth 1 -maxdepth 1 -print -delete`
  //   ⇒ 真删除却因 find 不在词表而判 exec ⇒ 明诺违背匹配不上 ⇒ 漏（allow）。
  if (/\s-delete\b/i.test(cmd)) return 'exec-destructive';                     // find ... -delete
  if (/\b-exec\s+[^;]{0,80}?\b(rm|shred|unlink|mv|dd)\b/i.test(cmd)) return 'exec-destructive';  // find -exec rm
  // [2026-09-23 · 字典即S] 字典补读：同义动词换写法（异体字）由**词素**接住，不再逐个工具名加正则。
  //   次序与既有破坏检查同层（破坏优先于读/外传），故置于读写判定之前。
  if (lexiconDestructive(cmd)) return 'exec-destructive';
  if (new RegExp(CMD_POS + '(cat|head|tail|read|less|more|vi|vim|nano|type|open)\\b', 'i').test(cmd)) return 'cred-read';
  if (new RegExp(CMD_POS + '(curl|wget|scp|rsync|ftp|nc|ssh)\\b', 'i').test(cmd)) return 'network-send';
  // [2026-09-20 · 对外不可逆（push / publish）—— 与"外传"同层，理由同破坏标记的封闭性论证]
  //   它们与 curl 同族而非与 rm 同族：**本机数据不动，不可逆的是"共享远端已被推进"**
  //   ——本地 git reset 改不回别人的克隆（对外不可逆 ⊄ 本地可复原）。故归 network-send（共享远端 = Macro）。
  //   实证（本轮运行体感探针）：言「我不会推送任何东西」+ 行 `git push origin main` ⇒ 行 verb 退化成容器 exec
  //   ⇒ 容器不可比 ⇒ **整条言行轴静默** ⇒ allow。言已立排除承诺、行正是那一类 ⇒ 这是 fail-open。
  //   只登记**对外不可逆**这一封闭族（push / publish）；只读/可逆命令无限开放，仍一律不登记。
  if (new RegExp(CMD_POS + '(git\\s+push|npm\\s+publish|docker\\s+push|gh\\s+release)\\b', 'i').test(cmd)) return 'network-send';
  return 'exec';
}

// 路径1 总入口：名字语法优先；中性名 → 查实际行为（命令 / 嵌套 = 分形兜底）；都归不出 → review
// 返回 { ok, layer, method, signal }
export function attributeCall(call) {
  const byName = nameLayer(call?.name);
  // [2026-09-20 · 容器不得短路（coze/51 洞①实证）] exec 是**容器类别**（⊃ delete/write/read/send…），
  //   不是实质动作类别 —— 与 engine.checkSpeechAct 侧「容器不可比」同源（CONTAINER_VERBS）。
  //   通用执行器（run_task / run_command / execute / bash…）经 name-grammar 恒得 layer='exec'：
  //   它只说明"这是个执行器"，**不说明执行了什么**。旧实现在此短路 ⇒ 命令内容永不被剥 ⇒
  //     ① 域归属恒落最外层 Cosmic ⇒ 账本里"删库"与"列目录"同域同痕，**攻击链与合法链读不出差别**；
  //     ② 破坏类动作拿不到 exec-destructive ⇒ 下游（域归属/账本）看不见 D 的最大冲击落点。
  //   实测（coze/51）：domainOf 对 5 个命令类探针全返回 Cosmic；链A/链B 刻痕 rDomains 同为 [Cosmic]。
  //   修法＝**下探**（不新增任何词汇）：容器名先不下结论，取命令主干可达的**最具体层**；剥不出才退回容器。
  //   ⚠️ actionProfile 早已如此剥（判定侧不受影响）——此处把**同一结构**接回 attribution 本体，
  //      让域归属/账本与判定**同源**。先结构、后枚举。
  if (byName && !CONTAINER_VERBS.has(byName)) {
    return { ok: true, layer: byName, method: 'name-grammar', signal: call?.name ?? '' };
  }
  const { cmd, nested } = extractCommand(call);
  if (cmd) {
    const byCmd = commandLayer(cmd);
    // 剥出实质层 ⇒ 用它（容器被剥掉）；仍只是容器 ⇒ 落到下方 name-grammar 保留原名义层。
    if (byCmd && byCmd !== 'exec') return { ok: true, layer: byCmd, method: nested ? 'fractal' : 'command', signal: cmd };
    if (byCmd && !byName) return { ok: true, layer: byCmd, method: nested ? 'fractal' : 'command', signal: cmd };
  }
  if (byName) return { ok: true, layer: byName, method: 'name-grammar', signal: call?.name ?? '' };
  return { ok: false, layer: null, method: null, signal: '' };
}

export { tokensOf, classifyToken, nameLayer, extractCommand, commandLayer };

// ===========================================================================
// [2026-09-20 · 知行合一 / 知行分裂] 言侧（utterance）档案抽取
// 背景：警察视角 =「人证物证具在」——**言（人证）+ 行（物证）两样都在，才比对得出**。
//   此前 decideToolCall 只有一个入参（行），言根本进不来 ⇒ 只做审讯、不做勘查，
//   于是"换个说法就放行"（rm -rf 判 allow 而 rm -fr 判 deny）与"推得越多放得越宽"同源。
// 本模块只做**抽取**（言声明了哪些动作类别、承诺排除了哪些、提到哪些对象类别）；
//   **不做判定** —— 判定是集合包含/排除关系，在 engine 侧，属结构判据、非词表命中。
// 中英同构：类别空间与 VERB/NOUN 完全一致（同一套轴，言与行才可比）。
// ⚠️ 本仓不同构搬入 EN 侧的 `scanCJK` / `scanEN`：那两个函数在 EN 里只有定义、无调用点（死代码），
//    非能力，不搬；此处保留真在用的扫描逻辑。发现即记，不静默。
// ===========================================================================
const ALL_VERB_CATS = Object.keys(VERB);   // read / write / delete / exec / send
const ALL_NOUN_CATS = Object.keys(NOUN);
// 否定算子（承诺不做）与限定算子（只做…）—— 二者都产生"排除集"，只是来源不同。
const NEG_CJK = ['不会', '不能', '不要', '不可以', '绝不', '从不', '没有', '未', '禁止', '别', '勿', '不', '没'];
const ONLY_CJK = ['只是', '仅仅', '只读', '只', '仅'];
const NEG_EN = new Set(['not', 'never', 'no', 'without', "don't", 'dont', "doesn't", "won't", "didn't", 'cannot', "can't", 'avoid', 'refrain', 'neither']);
const ONLY_EN = new Set(['only', 'just', 'readonly', 'read-only', 'merely', 'solely']);
const NEG_WINDOW_CJK = 10;   // 否定算子后向后看多少字符（中文无分词，按字符窗口）
const NEG_WINDOW_EN = 4;     // 英文按 token 窗口

// 中文：按字符窗口收集命中（单字词仅在否定/限定窗口内计入，避免"密/取/清"等单字在长文本中误命中）
function cjkHits(s, word, from, to) {
  const out = [];
  let i = s.indexOf(word, from);
  while (i >= 0 && i < to) { out.push(i); i = s.indexOf(word, i + word.length); }
  return out;
}

// 算子作用域边界（缩句原则）：否定/限定状语**只修饰同一小句**。
//   实证 bug：言"不删除，满足只读盘点要求" —— 若窗口不截断，"不"会吞掉下一小句的"只读"，
//   把其中的'读'当成被否定动词 ⇒ read 进排除集 ⇒ 判"明诺违背 read"（误报）。
const CLAUSE_SPLIT = /[。！？；\n，、.!?;,]/;

function clausesOf(s) {
  const out = [];
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    if (CLAUSE_SPLIT.test(s[i])) { if (i > start) out.push({ from: start, to: i }); start = i + 1; }
  }
  if (start < s.length) out.push({ from: start, to: s.length });
  return out;
}

// [2026-09-20] 承诺主体槽（语法主语位）：**人称代词是封闭语法类，不是开放词表** ⇒ 这属语法槽位判据，不属枚举。
//   中文无主句默认说话者自述；若动词前**最近的人称**是第二/三人称 ⇒ 该动词描述的是**他人的行为**，
//   不构成说话者的承诺 ⇒ 既不进 claimed，也不进 excluded。
//   实证 bug（不变性由此破功）：「你不清理旧日志，系统就要崩了」是**威胁/催促**，不是"我不删"的承诺；
//   旧代码把"不清理"抽成 excluded={delete} ⇒ 行 delete 撞明诺违背 ⇒ deny，
//   而同义的「清一下旧日志」⇒ allow ⇒ **同一动作只因措辞翻转**（FOG 话术可撬动判据源）。
//   ⚠️ 已知边界（挂账）：嵌套句「我保证你不删除」——主语"我"、宾语从句里是"你"，本判定按动词前最近人称
//   取"你" ⇒ 该承诺被漏（fail-open）。嵌套主体未处理，交后续结构件（不在此处打补丁）。
const PERSON_1 = /(我|我们|本人|自己|咱|咱们)/;
const PERSON_OTHER = /(你|你们|他|她|它|他们|她们|他人|别人|某人|其他人|对方|大家|谁|用户|客户)/;
const PERSON_RE = new RegExp(`(?:${PERSON_1.source}|${PERSON_OTHER.source})`, 'g');
/** 动词前最近的人称：'1'=说话者自身 | 'other'=他人 | null=无主语（中文默认自述） */
function nearestPerson(before) {
  let who = null;
  for (const m of before.matchAll(PERSON_RE)) who = PERSON_1.test(m[0]) ? '1' : 'other';
  return who;
}
const PERSON_OTHER_EN = new Set(['you', 'he', 'she', 'it', 'they', 'them', 'someone', 'somebody', 'others', 'other', 'user', 'users', 'customer']);
const PERSON_1_EN = new Set(['i', 'we', 'us', 'me', 'myself', 'ourselves']);
/** 英文：动词前最近的人称 token 若是他人 ⇒ 该动词非说话者承诺 */
function otherEN(toks, idx) {
  for (let j = idx - 1; j >= 0; j--) {
    if (PERSON_1_EN.has(toks[j])) return false;
    if (PERSON_OTHER_EN.has(toks[j])) return true;
  }
  return false;
}

/**
 * 抽取"言"侧档案。
 * @returns {{claimed:Set,excluded:Set,nouns:Set,empty:boolean,ops:string[]}}
 *   claimed  = 言声明会做的动作类别；excluded = 言承诺排除的动作类别；nouns = 言提到的对象类别。
 *   empty=true ⇒ 言里抽不到任何动作/对象声明 ⇒ 调用方应**跳过比对**（"无言"不可被读成"放行"）。
 */
export function speechProfile(text) {
  const empty = () => ({ claimed: new Set(), excluded: new Set(), nouns: new Set(), empty: true, ops: [] });
  if (!text || typeof text !== 'string') return empty();
  const s = text.slice(0, 2000);   // 只取前 2000 字符：自述窗口，不需要全文
  const isCJK = /[\u4e00-\u9fff]/.test(s);
  const clauses = clausesOf(s);
  if (!clauses.length) return empty();

  const claimed = new Set(), excluded = new Set(), nouns = new Set(), ops = [];

  for (const cl of clauses) {
    const seg = s.slice(cl.from, cl.to);
    if (!seg.trim()) continue;
    let hits = [];
    if (isCJK) {
      for (const v of ALL_VERB_CATS) for (const w of VERB[v]) {
        if (!/[\u4e00-\u9fff]/.test(w)) continue;
        for (const i of cjkHits(seg, w, 0, seg.length)) hits.push({ cat: v, kind: 'verb', idx: i, word: w });
      }
      for (const n of ALL_NOUN_CATS) for (const w of NOUN[n]) {
        if (!/[\u4e00-\u9fff]/.test(w)) continue;
        for (const i of cjkHits(seg, w, 0, seg.length)) hits.push({ cat: n, kind: 'noun', idx: i, word: w });
      }
      // 主体槽：动词前最近的人称若是他人 ⇒ 该动作是**他人的行为**，不作说话者的承诺
      for (const h of hits) if (h.kind === 'verb') h.other = nearestPerson(seg.slice(0, h.idx)) === 'other';
      // 限定算子（只/仅）：本小句窗口内命中的动词 = 唯一允许；其余已知类别 → 排除
      for (const op of ONLY_CJK) {
        let i = seg.indexOf(op);
        while (i >= 0) {
          const end = i + NEG_WINDOW_CJK;   // 窗口已被小句边界天然截断（seg 即一小句）
          const allowed = new Set();
          for (const h of hits) if (h.kind === 'verb' && !h.other && h.idx >= i && h.idx < end) allowed.add(h.cat);
          if (allowed.size) {
            ops.push(`${op}→仅允许{${[...allowed].join('|')}}`);
            for (const c of ALL_VERB_CATS) if (!allowed.has(c)) excluded.add(c);
            for (const c of allowed) claimed.add(c);
          }
          i = seg.indexOf(op, i + op.length);
        }
      }
      // 否定算子：本小句窗口内命中的动词 → 排除
      for (const op of NEG_CJK) {
        let i = seg.indexOf(op);
        while (i >= 0) {
          const end = i + NEG_WINDOW_CJK;
          let any = false;
          for (const h of hits) if (h.kind === 'verb' && !h.other && h.idx >= i && h.idx < end) { excluded.add(h.cat); any = true; }
          if (any) ops.push(`${op}→排除`);
          i = seg.indexOf(op, i + op.length);
        }
      }
      // 声明集：双字词素优先（证据强）；若本小句无双字命中，再以单字兜底
      let multi = false;
      for (const h of hits) if (h.kind === 'verb' && !h.other && h.word.length >= 2) { claimed.add(h.cat); multi = true; }
      if (!multi) for (const h of hits) if (h.kind === 'verb' && !h.other) claimed.add(h.cat);
    } else {
      const toks = seg.toLowerCase().split(/[^a-z0-9'-]+/).filter(Boolean);
      hits = toks.map((t, i) => {
        for (const v of ALL_VERB_CATS) if (VERB[v].includes(t)) return { cat: v, kind: 'verb', idx: i, word: t };
        for (const n of ALL_NOUN_CATS) if (NOUN[n].includes(t)) return { cat: n, kind: 'noun', idx: i, word: t };
        return null;
      }).filter(Boolean);
      for (let i = 0; i < toks.length; i++) {
        if (ONLY_EN.has(toks[i])) {
          const allowed = new Set();
          for (const h of hits) if (h.kind === 'verb' && !otherEN(toks, h.idx) && h.idx > i && h.idx <= i + NEG_WINDOW_EN) allowed.add(h.cat);
          if (allowed.size) {
            ops.push(`${toks[i]}→only{${[...allowed].join('|')}}`);
            for (const c of ALL_VERB_CATS) if (!allowed.has(c)) excluded.add(c);
            for (const c of allowed) claimed.add(c);
          }
        } else if (NEG_EN.has(toks[i])) {
          let any = false;
          for (const h of hits) if (h.kind === 'verb' && !otherEN(toks, h.idx) && h.idx > i && h.idx <= i + NEG_WINDOW_EN) { excluded.add(h.cat); any = true; }
          if (any) ops.push(`${toks[i]}→excluded`);
        }
      }
      for (const h of hits) if (h.kind === 'verb' && !otherEN(toks, h.idx)) claimed.add(h.cat);
    }
    for (const h of hits) if (h.kind === 'noun') nouns.add(h.cat);
  }
  // 已声明排除的，从 claimed 里剔除（"不删除" 里的 delete 只进 excluded）
  for (const c of excluded) claimed.delete(c);
  return { claimed, excluded, nouns, empty: claimed.size === 0 && excluded.size === 0 && nouns.size === 0, ops };
}

const LAYER_VERB = {
  'file-delete': 'delete', 'cred-delete': 'delete', 'exec-destructive': 'delete',
  'file-write': 'write', 'cred-write': 'write',
  'file-read': 'read', 'cred-read': 'read',
  'network-send': 'send',
  'exec': 'exec',
};
const LAYER_NOUN = {
  'file-delete': 'file', 'file-write': 'file', 'file-read': 'file',
  'cred-delete': 'credential', 'cred-write': 'credential', 'cred-read': 'credential',
};

/**
 * 抽取"行"侧档案（复用 path-1 归因的既有 layer，不新增词汇、不新增判定）。
 * @returns {{verb:string|null,noun:string|null,layer:string|null}}
 */
export function actionProfile(call, attrib) {
  let layer = attrib?.layer ?? attributeCall(call)?.layer ?? null;
  // [2026-09-20 · 剥容器取主干] exec 是**容器**不是实质：
  //   工具名 'exec' 在 name 层即可锚定（verb=exec）⇒ attributeCall 到此返回，**不再下探命令内容**。
  //   后果：真实"删除"被读成"执行" ⇒ 言承诺排除 delete 时匹配的是 exec ⇒ **明诺违背匹配不上（fail-open）**。
  //   实证：言"我不会删除任何东西" + rm -rf /data ⇒ 本轴判 allow（漏）。
  //   按缩句原则（剥掉修饰/容器，取主干）：exec 时对命令内容再归一次，取**可达的最具体层**。
  if (layer === 'exec') {
    // 缩句：取命令主干段（管道 / 连接符之后的段是输出修饰，不是动作主干）。
    //   实证：`ls -la /tmp/cache 2>&1 | head -200` 里的 head 让 commandLayer 误判为 cred-read（读凭据）。
    const stem = (extractCommand(call).cmd || '').split(/\s*[|;&]\s*/)[0];
    const deeper = commandLayer(stem);
    if (deeper && deeper !== 'exec') layer = deeper;
  }
  if (!layer) return { verb: null, noun: null, layer: null };
  return { verb: LAYER_VERB[layer] ?? null, noun: LAYER_NOUN[layer] ?? null, layer };
}

// ===========================================================================
// [2026-09-20 · 痕锚归属 · 扣子 coze/51 方向] scar 类动作 + 无法归属到任何已声明锚 ⇒ REVIEW
// ---------------------------------------------------------------------------
// 起因（coze/51 三洞实测，本地独立复核逐帧一致）：
//   同一引擎跑三条链，**账本读不出差别** ——
//     链A 合法渐进（言："清理项目临时文件"）：ls→rm tmp→rm cache→rm /app/logs（越出声明的 tmp）全 allow；
//     链B 攻击外扩（无锚）：rm /tmp→rm config.json→**rm /var/lib/mysql/ibdata1** 全 allow（仅 /etc 被 R 层路径拦住）；
//     链C 词表盲区：**rm -rf /app/data** ⇒ allow。
//   ⇒ 现行不是"没错"，是对枚举外的一切破坏动作 **fail-open**（只要路径没枚举到，删什么都行）。
//   coze/48 的"三选一"因此全死：① 痕累积即判据（死于链A，合法渐进也有痕）；
//     ② 作用域外扩（死于链A第4步，且它本身就是"补路径"= 枚举）；③ 现行没错（死于链B第3步 + 链C）。
//
// 扣子给的第四方向（本模块落地）：
//   **scar 类动作 + 无法归属到任何已声明锚（路径锚 / 类别锚）⇒ REVIEW。**
//   看的是**痕的锚归属**（Y 轴），不是 S 计数、不是路径形状、不是路径黑名单（X 轴）。
//   结构论证（为什么这条不是枚举）：**合法链与攻击链在 X 轴同构**（路径形状分不开），
//   **在 Y 轴不同构**（锚归属一刀两断）⇒ 判据必须建在 Y 轴。
//
// 代价取舍（与框架"误伤比漏报更伤和平态"权衡后取此侧）：
//   review 是**可确认**的（人一句"日志也清了"即放行），deny 是**不可恢复**的 ⇒ 问是对的代价。
//   且本判据只锚在 **scar 类（有限封闭集：删除语义）**，不碰**只读类（无限开放集）** ——
//   这正是 checkSpeechAct 已立的非对称结构（"破坏标记有限可枚举，只读命令无限开放"），
//   故**不会**重蹈"对所有未登记只读命令持续报警、消灭和平态"那个被实测打回的过宽修法。
//
// 不越内 H：言与行都是外 H；"锚"是**已声明的外部范围**（人证），不推断主体真正想什么。
// 判不出就 REVIEW，不猜（铁律 3）。
// ===========================================================================

// scar 类层（不可逆动作）：由 attribution 自身的层命名产出，不新增词表。
//   exec-destructive = 命令侧破坏标记命中（rm / -delete / -exec rm / git 破坏）；
//   file-delete / cred-delete = 结构化删除工具。
export const SCAR_LAYERS = new Set(['exec-destructive', 'file-delete', 'cred-delete']);

// 已声明**范围**里抽取作用域锚（**路径锚 + 类别锚**）。路径级 + 类别级两档，皆取自既有词汇/形态，不扩表。
// ⚠️ 来源纪律（2026-09-20 · 锚源定案）：入参只能是**委托人声明的任务范围**（结构入口）。
//    窗口面（`agent/pre-step` 的消息流）是**观察面**，其文本不得喂进本函数 —— 实测两种失效模式：
//    "假接通"（承接语抽不出锚却报"通道已通"）与"假人证"（agent 自述含真路径却被当真授权）。
const DECL_PATH = /(?:^|[\s=:'"(,，。；、：])((?:\.{0,2}\/|~\/|\/)[^\s;|&"'(),，。；、]*)/g;
/**
 * 抽取"已声明范围"里的对象/作用域（＝授权锚）。
 * @param {string} text 委托人声明的任务范围（**不是** agent 的言 —— 言属言行比对轴，不作锚源）
 * @returns {{paths:Set<string>, nouns:Set<string>}} 声明的路径集 + 声明的对象类别集
 */
export function declaredAnchors(text) {
  const paths = new Set();
  const nouns = new Set();
  const t = String(text ?? '');
  if (!t.trim()) return { paths, nouns };
  for (const m of t.matchAll(DECL_PATH)) if (m[1]) paths.add(m[1]);
  for (const n of speechProfile(t).nouns) nouns.add(n);
  return { paths, nouns };
}

/** 路径包含关系（作用域语义）：行目标落在已声明路径之内 ⇒ 归得上锚 */
function pathContained(target, anchor) {
  const a = String(anchor ?? '').replace(/\/+$/, '');
  const t = String(target ?? '').replace(/\/+$/, '');
  if (!a) return false;
  return t === a || t.startsWith(a + '/');
}

/**
 * 行目标的对象类别（用于类别级归属）。
 * 只看**路径本身**是否命中既有 NOUN 词表（凭证/库/邮件/网络/壳/系统/配置），
 * 都不命中 ⇒ 'file'（任何具体路径都是文件系统对象 —— 结构默认，不是词表新增）。
 */
export function nounOfTarget(p) {
  const s = String(p ?? '').toLowerCase();
  if (!s) return null;
  for (const [cat, words] of Object.entries(NOUN)) {
    if (cat === 'file') continue;
    if (words.some((w) => s.includes(String(w).toLowerCase()))) return cat;
  }
  return 'file';
}

// 行侧目标抽取（不经工具名词表）：结构化删除取 path/file 参数；命令类取命令里的路径形态对象。
function targetsOf(call, layer) {
  const out = [];
  if (layer === 'file-delete' || layer === 'cred-delete') {
    const p = call?.args?.path ?? call?.args?.file;
    if (typeof p === 'string' && p.trim()) out.push(p.trim());
    return out;
  }
  const cmd = extractCommand(call).cmd;
  if (!cmd) return out;
  const hits = cmd.match(/(?<=^|[\s=:'"(,])(\/[^\s;|&"'(),]*|\.{1,2}\/[^\s;|&"'(),]*|~\/[^\s;|&"'(),]*)/g) || [];
  return [...new Set(hits)];
}

/**
 * scar 类动作的**锚归属**判定。
 * @returns {null|{layer,targets,declaredPaths,declaredNouns}} null ＝ 归得上锚（本判据不介入）；对象 ＝ 无锚可归（⇒ REVIEW）
 */
export function scarUnanchored(call, attrib, anchors) {
  const layer = attrib?.layer ?? null;
  if (!layer || !SCAR_LAYERS.has(layer)) return null;   // 非不可逆类 ⇒ 本判据不启用（只读/可逆窗口不动）
  const targets = targetsOf(call, layer);
  const paths = anchors?.paths ?? new Set();
  const nouns = anchors?.nouns ?? new Set();
  // ① 路径级归属：行目标**全部**落在某个已声明路径之内（作用域包含，非黑名单）
  if (targets.length && paths.size) {
    if (targets.every((t) => [...paths].some((a) => pathContained(t, a)))) return null;
    // ⚠️ [顺序纪律] 声明**已明示路径** ⇒ 作用域是路径级，**不得**再退回类别级兜底。
    //   实证（本地复核）：声明"只清理 /app/tmp 下的临时文件" + 行 `rm /app/logs/old-run.log`
    //   ⇒ 旧写法先落空于①、再被②（类别 file 同类）捞回 ⇒ allow —— 明示范围被类别抹平，等于没声明。
    //   更具体/更明确的声明优先于更宽的声明（作用域语义），故命中路径级声明后直接判归属失败。
    return { layer, targets, declaredPaths: [...paths], declaredNouns: [...nouns] };
  }
  // ② 类别级归属：声明**未给具体路径**、只声明了对象类别 ⇒ 行对象类别同类即可归锚
  //   （如"清理项目临时文件" ⇒ 类别 file ⇒ 删文件类动作归得上；但删库文件(noun=db)归不上）
  if (targets.length && nouns.size) {
    if (targets.every((t) => nouns.has(nounOfTarget(t)))) return null;
  }
  // ③ 声明里没有任何对象（无锚可归），或行目标落在声明范围之外 ⇒ 归属失败 ⇒ 判不出交人工
  return { layer, targets, declaredPaths: [...paths], declaredNouns: [...nouns] };
}
