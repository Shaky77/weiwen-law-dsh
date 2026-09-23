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
  send:  ['send', 'mail', 'email', 'transmit', 'exfil', 'push', 'upload', '发', '邮', '传'],
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
export const DELETION_LAYERS = new Set(['file-delete', 'cred-delete']);

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

// [成语层 · 收录] —— 第三层＝**固定搭配的整体语义**，不可由字级 / 词级推导：
//   实测 `rsync --delete`（真删除）与 `docker run --rm`（容器清理）**词形同族、语义相反**
//   ⇒ 只能作为**典的条目**收录（与「破坏标记有限可封闭枚举」同源：有限封闭集、可穷尽）。
//   ⚠️ 这是**收录**，不是"加规则"：不假装能从 `--rm` 推出"非破坏"，只登记这条搭配的既有语义。
//   ⚠️ 也不等同于"豁免名单"：它以 **(宿主, 选项) 搭配**为键 —— 是成语，不是词。
const IDIOM_NON_FS = [
  { host: /^(?:docker|podman|nerdctl)$/i, opt: /^--?rm$/i, note: '容器生命周期清理，不触碰文件系统' },
];
const idiomNonFs = (seg, opt) => {
  const first = String(seg).split(CMD_TOKEN_SPLIT).filter(Boolean)[0] ?? '';
  return IDIOM_NON_FS.some((it) => it.opt.test(opt) && it.host.test(first));
};

/** S 的**套嵌法则**（唯一一条）：一段文本的「动作位」（谓语位）是否删除。
 *  动作位 ＝ 第一个非选项词（命令 / 代码段首）∨ 代码调用名（`name(` 形态）。
 *  **数据位不读** —— 这正是「查到这个词」与「读成在做这件事」的分界。
 *  ⚠️ 入参应是**已剥数据位**的骨架（段级传 `stripData(seg)`；递归层传原文——那一层的引号内是代码）。 */
function atActionSlot(text) {
  const s = String(text || '');
  const head = s.split(CMD_TOKEN_SPLIT).filter(Boolean).find((t) => !t.startsWith('-'));
  if (head && isDeleteWord(head)) return true;    // 槽位 1 **接受路径形式**（`/bin/rm -rf /` 是真命令的路径写法）
  for (const m of s.matchAll(CALL_NAME)) if (isDeleteWord(m[1])) return true;
  return false;
}

/** ★ 第三粒度：**子命令位**（第 2 个非选项词）为破坏词素 ∧ 段内存在**自由路径宾语**。
 *  结构理由（不靠工具名单）：`kubectl delete pod`（删抽象资源）与 `deploy purge /var/www`（删文件树）
 *  **词素同族、判词相反** —— 分界不在"是哪个工具"，而在**该段有没有文件系统落点**：
 *  删除动作必须有一个可删的**路径**。故判据 ＝ (子命令位破坏词素) × (自由路径宾语)。
 *  - "自由"＝ 不被选项引导：`kubectl delete -f /manifest.yaml` 的路径是 `-f` 的**参数**，不是宾语 ⇒ 不算。
 *  - 槽位 1 归 `atActionSlot`（保持既有口径：命令名即动作），此处只管槽位 2。 */
function subSlotDestructive(bare) {
  const toks = String(bare || '').split(CMD_TOKEN_SPLIT).filter(Boolean);
  const nonOpt = toks.filter((t) => !t.startsWith('-'));
  const slot2 = nonOpt[1];
  if (!slot2 || slot2.startsWith('/') || !isDeleteWord(slot2)) return false;   // 槽位须是**词**，不是路径
  for (let i = 1; i < toks.length; i++) {
    if (!toks[i].startsWith('/')) continue;                 // 只认绝对路径（文件系统落点）
    if (toks[i - 1].startsWith('-')) continue;              // 选项参数（如 `-f /manifest.yaml`）≠ 自由宾语
    return true;
  }
  return false;
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
  const DESTRUCTIVE_NAME = /(?<![-\w])(rm|rmdir|shred|unlink|mkfs|format|dd|truncate|wipefs)\b/i;
  for (const seg of String(cmd).split(SEG_SPLIT)) {
    const head = seg.split(CMD_TOKEN_SPLIT).filter(Boolean)[0] ?? '';
    const bare = INTERPRETER_HEAD.test(head) ? seg : stripData(seg);
    if (DESTRUCTIVE_NAME.test(bare)) return 'exec-destructive';
  }
  if (lexiconDestructive(cmd)) return 'exec-destructive';          // ★ 字典补读（异体字 / 子命令位 / 代码通道）
  if (/\b(cat|head|tail|read|less|more|vi|vim|nano|type|open)\b/i.test(cmd)) return 'cred-read';
  if (/\b(curl|wget|scp|rsync|ftp|nc|ssh)\b/i.test(cmd)) return 'network-send';
  return 'exec';
}

// 路径1 总入口：名字语法优先；中性名 → 查实际行为（命令 / 嵌套 = 分形兜底）；都归不出 → review
// 返回 { ok, layer, method, signal }
export function attributeCall(call) {
  const byName = nameLayer(call?.name);
  if (byName) {
    return { ok: true, layer: byName, method: 'name-grammar', signal: call?.name ?? '' };
  }
  const { cmd, nested } = extractCommand(call);
  if (cmd) {
    const byCmd = commandLayer(cmd);
    if (byCmd) return { ok: true, layer: byCmd, method: nested ? 'fractal' : 'command', signal: cmd };
  }
  return { ok: false, layer: null, method: null, signal: '' };
}

export { tokensOf, classifyToken, nameLayer, extractCommand, commandLayer };
