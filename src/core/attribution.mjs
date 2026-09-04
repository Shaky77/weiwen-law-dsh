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

function commandLayer(cmd) {
  if (!cmd) return null;
  if (/\b(rm|rmdir|shred|unlink|mkfs|format|dd|truncate|wipefs)\b/i.test(cmd)) return 'exec-destructive';
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
