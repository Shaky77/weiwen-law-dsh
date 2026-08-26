// 唯稳律（Weiwen's Law）护栏引擎 —— 纯逻辑，零 DSH 依赖，可独立单测
// 来源：作者揭示（夏祺 / Shaky77）。框架本体严格本位，不软化、不篡改。
// 约束：变量不预设数值；阈值标记"示意，作者可调"；作者揭示项标注来源。
//
// 这是插件的"大脑"：所有 R / D / S / H / M 的裁决逻辑都在这里，与宿主框架解耦。
// DSH 适配器（index.ts）只把引擎挂到 tools/pre-execute 与 agent/pre-step 钩子上。

// 第一BUG停止闭环状态机（作者补全 · 2026-08-21）：强制走完"断"之后的必然后半程，
// 未修复前禁止重入，从根上阻断"只反推不修复→无限递归"。
import { BugStopGuard } from './bugstop.mjs';

// ---------------- 工具语义类别层（客观结构，非字符串猜动词） ----------------
// 活系统版演进：判定层从"正则猜动词"升级为"工具语义类别 + 路径客观对象"判定，
// 根除"动词藏在 command/name 里就漏判"的盲区（如 read_file 读 .env）。
// 推演层（deduceRisk）沿 RDSHM 前向模拟后果，兜住判定层给不出确定结论的灰色地带。
const TOOL_CATEGORY = {
  read_file: 'read', read_inner_h: 'read', read: 'read', query_inner_h: 'read',
  write_file: 'write', write: 'write', edit: 'write',
  send_mail: 'exfil', upload: 'exfil',
  exec: 'exec', run_task: 'exec', bash: 'exec', shell: 'exec',
};
const CREDENTIAL_PATH = /\.(env|pem|key|token|credentials|secret)|[\/\\](passwd|shadow|id_rsa)(?![A-Za-z0-9_])|[^A-Za-z0-9](secret|token|credential)(?![A-Za-z0-9])/i;
// 命令文本（sh）里的凭据判据：只认"凭据文件路径形态"（扩展名/系统路径段），不匹配纯关键词——
// 否则 `grep SECRET`、讲解凭据的文档文本都会被误伤（作者裁定 2026-08-25 · C10 误伤修复）。
const CREDENTIAL_SH = /\.(env|pem|key|token|credentials|secret)(?![A-Za-z0-9_])|[\/\\](passwd|shadow|id_rsa)(?![A-Za-z0-9_])/i;
const SYSTEM_PATH = /\/(etc|sys|proc|boot)\//i;
const EXTERNAL_TARGET = /https?:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)[^\s'"]+/i;

// ---------------- 可审计性结构层（方向判据 · 非内容判据｜作者裁定 2026-08-24） ----------------
// 作者原话：唯稳律只判方向。假设是黑客改了（伪装），从表面看是对的，但风险导向一定是坏的。
// 落地为结构性判据：一个「执行内容在执行前不可读」的动作，无论还原出来是什么，
// 其因果方向恒为"S 不可保"——因为可审计性是 S 成立的前提：
//   不可审计 ⇒ 不在白箱内 ⇒ 无法证明它是稳态增量 ⇒ S+1 不成立（非"查不出问题就放行"）。
// 故此处识别的是「不透明源 → 转换/求值 → 执行落点」这一客观管道结构（形态有限、可穷举），
// 而不是还原后的内容（伪装形态无限、枚举必败 → 必掉进补丁循环）。
// 误伤边界：判据要求"转换/远端/求值"与"执行落点"同时成立；
//   仅解码到文件（base64 -d > out）、仅编码（| base64）、执行明文脚本（bash a.sh）均不触发。
const OPAQUE_TRANSFORM = /base64\s+(-{1,2}d\w*|--decode)|\bxxd\s+-r|\bopenssl\s+enc\b[^|]*-d\b|\b(gunzip|zcat|bunzip2|gzip\s+-d|xz\s+-d)\b|\buudecode\b|\batob\s*\(|\bb64decode\b|\bunhexlify\b|\bfromCharCode\b|\btr\s+['"]?[A-Za-z]-[A-Za-z]/i;
const EXEC_SINK = /\|\s*(bash|sh|zsh|ksh|dash|python[\d.]*|perl|ruby|node|php)\b|\b(bash|sh|zsh|python[\d.]*|node|perl|ruby|php)\s+-c\b|\bsource\s+\/dev\/stdin|>\s*\/dev\/tcp\/|(\|\||&&)\s*(bash|sh|zsh|dash|python[\d.]*|node|perl|ruby|php)\b/i;
const REMOTE_SRC = /\b(curl|wget|iwr|Invoke-WebRequest)\b/i;
const EVAL_SINK = /\b(eval|exec)\s*[\s(]|\bFunction\s*\(\s*['"]/i;
const INDIRECT_REF = /\$\{?\w+|\$\(|`[^`]+`|\b(eval|exec)\s*\(\s*[A-Za-z_]\w*\s*[),]/;
// ---- 可审计性扩展信号（作者裁定 2026-08-25 · 风险＜唯稳律＜稳态，无=，少一点/相等视为不行）----
// isOpaqueExec 只是"形态快速命中"，不是可审计性的全部。执行内容在执行前白箱读不到，
// 还包含两类：①未知变量引用（值不在白箱内）②引用本会话写入的文件（内容由本会话产生）。
// 任一类命中 ⇒ 无法证明稳态增量 ⇒ S+1 不成立 ⇒ 至少保守（review），绝不 allow。
function hasExecSink(text) {
  if (!text) return false;
  return EXEC_SINK.test(text) || EVAL_SINK.test(text) || /\b(eval|exec)\s*\(/.test(text)
    || /\b(node|perl)\s+-e\b/.test(text);
}
// POSIX/常用标准变量白名单：值可预期，视为"白箱可审计"；名单外的 $VAR 值未知 → 不透明。
const KNOWN_VAR = new Set(['HOME','USER','LOGNAME','PATH','SHELL','PWD','OLDPWD','TERM','LANG','LC_ALL','TMPDIR','TZ','HOSTNAME','DISPLAY','EDITOR','VISUAL','MAIL','SHLVL','IFS','PS1','PS2','UID','EUID','GID','PPID','RANDOM','SECONDS','LINENO','BASH_VERSION','BASHOPTS','SHELLOPTS','OSTYPE','MACHTYPE','HOSTTYPE','CDPATH','PROMPT_COMMAND','HISTSIZE','HISTFILE']);
function hasOpaqueVar(text) {
  if (!text) return false;
  const t = String(text);
  ENV_SECRET_REF.lastIndex = 0;
  let m;
  while ((m = ENV_SECRET_REF.exec(t))) {
    const name = (m[1] || m[2] || m[3] || m[4] || '').toUpperCase();
    if (name && !KNOWN_VAR.has(name)) return true; // 未知变量：值在白箱外
  }
  return false; // 命令替换/反引号子命令文本可见（可审计），不构成"值未知"（作者裁定 2026-08-25）
}
// 从执行内容提取被引用的脚本/文件路径（bash /tmp/x.sh、source ./x.sh、./run.sh …）
function extractScriptRefs(text) {
  if (!text) return [];
  const out = [];
  const t = String(text);
  const re = /(?:^|[\s;|&(])(?:bash|sh|zsh|ksh|dash|python[\d.]*|node|perl|ruby|php|source)\s+([^\s;|&<>"'`()]+)/g;
  let m;
  while ((m = re.exec(t))) out.push(m[1]);
  const re2 = /(?:^|[\s;|&(])(\.\/[^\s;|&<>"'`()]+)/g;
  while ((m = re2.exec(t))) out.push(m[1]);
  return out;
}
// 本会话写入内容里的破坏信号（与 R 锚点同款模式，非枚举具体内容）
// 补 2026-08-25：解码执行链（base64/xxd 解码后管道进解释器）同为登记内容危险信号（C2 链式兜底）
const SCRIPT_DANGER = /\brm\s+(-rf?|--recursive)\s+(\/|\*|\$\w+|~)|\b(mkfs|format)\b|\bcurl\b[^|]*\|\s*(bash|sh)\b|(base64\s+(-{1,2}d\w*|--decode)|xxd\s+-r)[^|]*\|\s*(bash|sh|zsh|dash)\b/i;
function isOpaqueExec(text) {
  if (!text) return false;
  const t = String(text);
  if (OPAQUE_TRANSFORM.test(t) && EXEC_SINK.test(t)) return true;   // 解码/解压后直接进解释器
  if (REMOTE_SRC.test(t) && EXEC_SINK.test(t)) return true;         // 远端内容直进解释器（curl … | bash）
  if (EVAL_SINK.test(t) && (INDIRECT_REF.test(t) || OPAQUE_TRANSFORM.test(t))) return true; // 对不可见内容求值
  return false;
}

// 落点存在性（方向判据的第三段，作者裁定 2026-08-24 · 自查补齐）：
// 「不透明源 → 转换/求值 → 执行落点」三段必须同时成立，方向才判坏。
// 自查发现的误伤：只按文本形态判，会把"写一段讲解/安装说明的文档"也判成不可审计执行
//   （写 README 含 `curl … | bash` 安装片段、写博客举反例 —— 文本永不被执行，落点不存在）。
// 修正后的结构判据（仍是方向，不是内容）：文本会不会被执行，取决于它进入哪个落点：
//   ① 命令串本身 —— 即将进入解释器，落点当然成立；
//   ② 执行类工具的任意入参 —— 该工具的入参就是执行输入，落点成立；
//   ③ 写落盘 —— 落点成立当且仅当目标路径本身是"落盘即执行"通道
//      （crontab / cron.d / .bashrc / rc.local / systemd unit / git hooks / 开机自启 / authorized_keys）；
//      写入 README.md、docs/*.md 等普通文件无落点 ⇒ 不触发。
const AUTO_EXEC_SINK_PATH = /(^|[\/\\])(crontab|cron\.(d|daily|hourly|weekly|monthly)|rc\.local|init\.d|systemd|launchd|LaunchAgents|LaunchDaemons|autorun\.inf|authorized_keys)([\/\\]|$)|(^|[\/\\])\.?(bashrc|bash_profile|bash_login|profile|zshrc|zprofile|zshenv|cshrc|kshrc)$|\.(service|timer|plist)$|(^|[\/\\])\.git[\/\\]hooks[\/\\]|(^|[\/\\])(Start\s?Menu|Startup)[\/\\]/i;
function opaqueExecSignal({ name, category, path, sh, packed }) {
  if (isOpaqueExec(sh)) return true;                                  // ① 命令串直接进解释器
  const isExecTool = TOOL_CATEGORY[name] === 'exec' || category === 'exec' || category === 'exec-destructive';
  if (isExecTool && isOpaqueExec(packed)) return true;                // ② 执行类工具的入参即执行输入
  if (category === 'write' && AUTO_EXEC_SINK_PATH.test(path) && isOpaqueExec(packed)) return true; // ③ 落盘即执行通道
  return false;
}

function extractPath(call) {
  const c = call?.args ?? {};
  if (typeof c.path === 'string') return c.path;
  if (typeof c.file === 'string') return c.file;
  const sh = extractShell(call);
  const m = sh.match(/(?:cat|head|tail|read|less|more|vi|vim|nano|cp|mv|rm|echo|write)\s+([^\s]+)/i);
  return m ? m[1] : '';
}
function inferCategory(call) {
  const name = call?.name ?? '';
  if (TOOL_CATEGORY[name]) return TOOL_CATEGORY[name];
  const a = call?.args ?? {};
  if (typeof a.action === 'string') {
    if (/upload|send|exfil|transmit|post|export/i.test(a.action)) return 'exfil';
    if (/read|get|fetch|query|open/i.test(a.action)) return 'read';
    if (/write|create|edit|update|delete|remove|drop/i.test(a.action)) return 'write';
  }
  const sh = extractShell(call);
  if (sh) {
    if (/\b(rm|mkfs|format|del|delete|shred)\b/.test(sh)) return 'exec-destructive';
    if (/\b(cat|head|tail|read|less|more|vi|vim|nano|type|open)\b/.test(sh)) return 'read';
    if (/\b(curl|wget|scp|rsync|ftp|nc)\b/.test(sh)) return 'exfil-net';
    return 'exec';
  }
  return 'other';
}
function inferCallSemantics(call, ctx = {}) {
  const category = inferCategory(call);
  const path = extractPath(call);
  const sh = extractShell(call) || '';
  const packed = JSON.stringify(call ?? '');
// 本会话写盘引用：执行内容引用的脚本路径，是否在本会话 write 登记表里
  const scriptRefs = extractScriptRefs(sh);
  const sessionHits = scriptRefs.filter((p) => ctx?.sessWritten?.has(p));
  const sessContentDanger = sessionHits.some((p) => SCRIPT_DANGER.test(ctx.sessWritten.get(p) || ''));
  // 外部信号只在"动作方向"上判（作者裁定 2026-08-25）：命令文本（sh）任何类别都判；
  // 内容字段（packed）只在执行/外传类上判——write 写文档含 URL 不构成外部动作，
  // 其落盘即执行通道的外部风险由 isOpaqueExec ③ 兜底，避免"文档提 curl"误伤。
  const isExecOrExfil =
    TOOL_CATEGORY[call?.name] === 'exec' || TOOL_CATEGORY[call?.name] === 'exfil' || TOOL_CATEGORY[call?.name] === 'exfil-net'
    || category === 'exec' || category === 'exec-destructive' || category === 'exfil' || category === 'exfil-net';
  // 执行落点判据（作者裁定 2026-08-25 · D5 漏放根因修复）：不止显式解释器形态（bash -c/管道/eval），
  // 执行类工具本身（run_task/exec/bash 等 TOOL_CATEGORY=exec）就是执行落点——task/payload 里的未知变量同样不可审计。
  const isExecTool = TOOL_CATEGORY[call?.name] === 'exec' || TOOL_CATEGORY[call?.name] === 'exec-destructive';
  return {
    category,
    path,
    command: sh,
    isCred: CREDENTIAL_PATH.test(path) || CREDENTIAL_SH.test(sh) || hasEnvSecretRef(sh) || hasEnvSecretRef(packed),
    isSystem: SYSTEM_PATH.test(path) || SYSTEM_PATH.test(sh),
    isExternal: EXTERNAL_TARGET.test(sh) || (isExecOrExfil && EXTERNAL_TARGET.test(packed)),
    hitsInnerH: hitsInnerH(packed),
    // 方向信号（非内容信号）：执行内容在执行前是否可审计。
    // 三段结构齐备才成立（不透明源 → 转换/求值 → 执行落点），避免把"写文档"误判为执行。
    isOpaqueExec: opaqueExecSignal({ name: call?.name ?? '', category, path, sh, packed }),
    // 可审计性扩展（作者裁定 2026-08-25）：执行落点真实存在（显式解释器 或 执行类工具本身）时，未知变量 → 值不可审计
    hasOpaqueVar: (hasExecSink(sh) || isExecTool) && hasOpaqueVar(sh),
    // 引用本会话写入的文件 → 内容由本会话产生，需复核（跨 call 状态，链式兜底）
    refsSessionWritten: sessionHits.length > 0,
    sessContentDanger,
    // SSH 信任注入通道（作者裁定 2026-08-25 · C7 盲区修复）：写 authorized_keys 属高信任动作，至少保守
    isAuthSink: /authorized_keys/i.test(path),
  };
}
// ---------------- 推演层（手稿 H 分叉-并行-对比）：沿 RDSHM 前向模拟，但 H 处双路并行 ----------------
// 手稿微观链：D(新X)→R₀→S₀⇌(H₀)→D₀→M₀→H₀(内)→H₀(外)，H₀ 处正式分叉：
//   H₀ → S₀(S₀+1)   ← S 增路径（稳态增量，纯白箱）
//   H₀ → D₀(D₀+1)   ← D 增路径（=|S-1| 稳态绝对侵蚀）
// 两路同时跑、都汇入 M₀(M+1)（独立事件沉淀），终态 S 再分叉 {S₀(S₀+1)/S₀(S₀-1)} 对比区分。
// simulateBranch：给定语义，模拟"单条分支"的终态 S。kind='S+1' 即 S 增路径，'D-1' 即 D 增(蚀)路径。
function simulateBranch(s, kind) {
  if (kind === 'S+1') {
    // S 增路径：假定 call 作为稳态增量被接受。仅当 call 纯稳态贡献（无任何风险信号）才真 +1。
    // 前提（作者裁定 2026-08-24/25）：可审计性是 S 成立的前提——
    //   白箱不能对"执行前不可读"之物给稳态 credit，故不可审计时 S+1 直接不成立，
    //   逻辑是"无法证明稳态所以不予 +1"，不是"没查出问题所以放行"。
    // 可审计性扩展（2026-08-25）：不止形态（isOpaqueExec），未知变量引用/本会话写盘引用同样不可审计。
    const opaque = s.isOpaqueExec || s.hasOpaqueVar || s.refsSessionWritten;
    const auditable = !opaque;
    const purelyBenign = auditable && !s.isCred && !s.isSystem && !s.isExternal && !s.hitsInnerH && !s.isAuthSink;
    return {
      path: 'S+1', finalS: purelyBenign ? +1 : 0,
      ...(auditable ? {} : { note: '执行内容不可审计（不透明源/未知变量/引用本会话写入文件）→ 无法证明稳态增量，S+1 不成立' }),
    };
  }
  // D-1 路径（=|S-1|）：假定 call 触发损伤。侵蚀量按风险信号严重度分级（客观结构，非枚举具体值）。
  // 分支按严重度从高到低排列（作者裁定 2026-08-25）：轻信号不得遮蔽重信号（如 hasOpaqueVar -1 不得挡 isCred -3）。
  if (s.hitsInnerH) return { path: 'D-1', finalS: -3, note: '侵内 H 黑箱（思想/自由意志）' };
  // 方向判据优先于内容判据：内容被遮蔽时无法做内容判定，但"不可审计执行"的方向已确定为坏。
  if (s.isOpaqueExec) return { path: 'D-1', finalS: -3, note: '执行内容不可审计（不透明源→转换/求值→执行落点）：后果不可推演，方向恒为 S 不可保' };
  // 链式兜底（2026-08-25）：本会话写入的脚本被执行——内容来源已知（登记表），按登记内容定级
  if (s.refsSessionWritten) {
    return s.sessContentDanger
      ? { path: 'D-1', finalS: -3, note: '执行本会话写入的危险脚本（登记内容含破坏命令）' }
      : { path: 'D-1', finalS: -2, note: '执行本会话写入的脚本（内容由本会话产生，可信度需复核）' };
  }
  const dangerousCat = ['read', 'exfil', 'exfil-net', 'exec', 'exec-destructive'].includes(s.category);
  if (s.isCred && dangerousCat) return { path: 'D-1', finalS: -3, note: '凭据暴露' };
  if (s.isExternal && ['exfil', 'exfil-net', 'exec'].includes(s.category)) return { path: 'D-1', finalS: -2, note: '向外部外传数据' };
  if (s.isAuthSink) return { path: 'D-1', finalS: -2, note: 'SSH 信任注入（写授权密钥文件），需人工确认' };
  if (s.isSystem && ['read', 'write', 'exec', 'exec-destructive'].includes(s.category)) return { path: 'D-1', finalS: -1, note: '系统信息泄露/完整性受损' };
  if (s.hasOpaqueVar) return { path: 'D-1', finalS: -1, note: '执行内容含未知变量引用，值不可审计（无法证明无风险）' };
  return { path: 'D-1', finalS: 0 };
}

// ---------------- 默认 R 刚性锚点策略（具象判据示例；R 本体定义见 law.mjs 的 R_DOMAIN） ----------------
// R 的本质：嵌套包含的客观规则体系（宇宙⊃地球⊃宏观⊃微观），刚性来自客观规则不随主观转移。
// 以下为"已识别的具象越界模式"示例判据，作者可按 R 层级补充完整规则条目；不预设数值常量。
// 判定只认 tool 的 name / args。
//
// 〔手稿批注 · R₀→R₁ · 仅标注，不参与运行时逻辑〕
// R 是硬规则（刚性来自嵌套包含的客观规则体系），其能否从 R₀ 迭代到 R₁，
// 取决于「当下科学的发现 / 验证 / 复刻 / 证伪」等一系列已完整固化下来的 S 沉淀——
// 既非人类 H 的主观选择，也非模型靠"硬推"可抵达的目标。
// 模型当前是「大数据学习人类已沉淀的 S → 运用并推演」，本身不生产新的 R。
// 故引擎在 R 层只套用既有刚性锚点做判定，绝不内置任何驱动 R 迭代 / 升级的机制
// （模型无需纠结 R 的演进，自有人类兜底）。
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
    desc: '禁止读取/外传凭据文件（.env/.pem/.key/.token/.credentials 等）',
    test: (call) => {
      // 活系统版：基于工具语义类别 + 路径客观对象判定，而非正则猜动词
      const s = inferCallSemantics(call);
      return s.isCred && ['read', 'exfil', 'exec', 'exec-destructive'].includes(s.category);
    },
  },
];

// 从 call 中抽取 shell / code 文本（兼容 bash 工具与 run_code 工具）
// 活系统版：兼容更多 call 形态（task / script / cmd），避免"动词藏在某字段就漏抽"
function extractShell(call) {
  if (!call) return '';
  if (typeof call.command === 'string') return call.command;
  if (typeof call.code === 'string') return call.code;
  if (typeof call.task === 'string') return call.task;
  if (typeof call.script === 'string') return call.script;
  if (typeof call.cmd === 'string') return call.cmd;
  const a = call.args ?? {};
  if (typeof a.command === 'string') return a.command;
  if (typeof a.code === 'string') return a.code;
  if (typeof a.task === 'string') return a.task;
  if (typeof a.script === 'string') return a.script;
  if (typeof a.cmd === 'string') return a.cmd;
  return '';
}

// 环境变量凭据引用识别（结构性语义类别，非枚举具体变量名）：
// 环境变量是系统已知的凭据存储机制；变量名带 secret 信号（SECRET/TOKEN/KEY/PASS/CRED/PRIVATE/CERT）
// 即视为凭据引用。信号须以 起始/下划线/连字符 为边界（避免 monkey→含key 的误判）。
const ENV_SECRET_REF = /\$\{?\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}?|process\.env\.([A-Za-z_][A-Za-z0-9_]*)|ENV\[['"]([A-Za-z_][A-Za-z0-9_]*)['"]\]|getenv\(['"]([A-Za-z_][A-Za-z0-9_]*)['"]\)/gi;
const SECRET_SIGNAL = /(^|[_-])(SECRET|TOKEN|KEY|PASS|PWD|CRED|PRIVATE|CERT)([_-]|$)/i;
function hasEnvSecretRef(text) {
  if (!text) return false;
  ENV_SECRET_REF.lastIndex = 0;
  let m;
  while ((m = ENV_SECRET_REF.exec(text))) {
    const name = (m[1] || m[2] || m[3] || m[4] || '').toUpperCase();
    if (SECRET_SIGNAL.test(name)) return true;
  }
  return false;
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
    // 本会话写盘登记表（作者裁定 2026-08-25 · 链式状态兜底）：放行的 write 记录 path→content，
    // 后续执行类 call 引用已登记路径时触发复核（refsSessionWritten）。只登记本会话写入，不猜文件系统。
    this.sessWritten = new Map();
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

  // ---------- 推演层（手稿 H 分叉-并行-对比）：灰区兜底，完整因果 ----------
  // 返回 { verdict: allow|deny|review, m, branches, deduced, reason }
  deduceRisk(call) {
    const s = inferCallSemantics(call, { sessWritten: this.sessWritten });
    // H 分叉：S 增路径 + D 增(蚀)路径 同时模拟（并行，非二选一）
    const bS = simulateBranch(s, 'S+1');
    const bD = simulateBranch(s, 'D-1');
    // 两路都汇入 M（独立事件沉淀，手稿：M₀(M₀+1)）
    const m = { m: 1, branches: { bS, bD } };
    // 终态 S 对比区分（手稿：{S₀(S₀+1) / S₀(S₀-1)}）。
    // 作者裁定 2026-08-25：风险＜唯稳律＜稳态，无=，少一点或相等都视为不行。
    //   allow 唯一条件：S+1 严格成立（finalS=+1）且 D 侵蚀严格为 0（finalS=0）——双成立，缺一不可。
    //   任何侵蚀（-1/-2/-3）或 S+1 不成立（finalS=0，无法证明稳态增量）都视为"不行"→ 保守。
    const erosion = bD.finalS;
    const sOk = bS.finalS === +1; // 稳态增量严格成立
    if (erosion <= -3) {
      return { verdict: 'deny', m, branches: { bS, bD }, deduced: true,
        reason: `推演判定高风险（D 路径确定性侵蚀 S）：${bD.note || '凭据/内H/外传'}` };
    }
    if (erosion < 0 || !sOk) {
      return { verdict: 'review', m, branches: { bS, bD }, deduced: true,
        reason: `推演判定中风险（${!sOk ? 'S+1 不成立：无法证明稳态增量' : `D 路径轻度侵蚀 S：${bD.note || '灰区'}`}）：建议限权/二次确认` };
    }
    // 双成立（S+1=+1 且 D 侵蚀=0）→ 风险=0 < 唯稳律 < 稳态 严格成立 → allow
    return { verdict: 'allow', m, branches: { bS, bD }, deduced: true,
      reason: '推演判定低风险（S 增路径成立、D 路径无实际侵蚀）：放行并累积 S' };
  }

  // ---------- M 沉淀：推演层两分支都汇入 M（独立事件，append-only 历史刻痕） ----------
  recordDeduction(mDeposit) {
    this.historyTrail.push({
      type: 'deduced', m: mDeposit?.m ?? 1,
      branches: mDeposit?.branches ?? null,
      ts: Date.now(), role: 'cross-check-baseline',
    });
    return this.snapshot();
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
    // 判定层全过 → 下沉推演层（手稿 H 分叉-并行-对比，灰区完整因果）
    const risk = this.deduceRisk(call);
    // 两路分支都汇入 M（独立事件沉淀），无论裁决结果先记 M
    this.recordDeduction(risk.m);
    if (risk.verdict === 'deny') {
      this.failureStreak += 1; // 高风险计入破窗计数（与 R 命中同权）
      return { kind: 'deny', law: '推演', reason: risk.reason, risk: 'high', deduced: true };
    }
    if (risk.verdict === 'review') {
      // 中风险：限权/二次确认。真机无人工时保守拦截（见 index.js），此处返回 review 供调用方区分
      this._registerWrite(call);
      return { kind: 'review', law: '推演', reason: risk.reason, risk: 'mid', deduced: true };
    }
    // 低风险：放行，记录稳态正向增量（S 只增不减）。登记本会话写盘（链式兜底）。
    this._registerWrite(call);
    this.recordSteady({ positive: 1 });
    return { kind: 'allow', risk: 'low', deduced: true };
  }

  // 本会话写盘登记（链式状态兜底 · 作者裁定 2026-08-25）：write 放行时记录 path→content，
  // 供后续执行类 call 引用该路径时复核内容可信度。deny 未写成功不登记。
  _registerWrite(call) {
    const a = call?.args ?? {};
    const wPath = a.path ?? a.file ?? '';
    const wContent = a.content ?? a.data ?? '';
    if (wPath && typeof wContent === 'string') this.sessWritten.set(wPath, wContent);
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
