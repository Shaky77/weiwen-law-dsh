// 唯稳律（Weiwen's Law）护栏引擎 —— 纯逻辑，零 DSH 依赖，可独立单测
//
// 这是插件的"大脑"：所有 R / D / S / H / M 的裁决逻辑都在这里，与宿主框架解耦。
// DSH 适配器（index.ts）只把引擎挂到 tools/pre-execute 与 agent/pre-step 钩子上。

// 第一BUG停止闭环状态机：强制走完"断"之后的必然后半程，
// 未修复前禁止重入，从根上阻断"只反推不修复→无限递归"。
import { BugStopGuard, bugKeyOf } from './bugstop.mjs';

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
// R 是客观规则（宇宙法则/科学验证/社会共识），边界本应清晰，工程实现不得用模糊子串匹配歪曲规则。
// 凭据文件判据：只认"独立扩展名形态"——.key 后跟字母数字即非凭据（.keyfile/.keyboard 不命中）；
// 灰色地带（R 不命中）交给推演层判风险，决策权交还用户（因果不担责，唯稳律不担责）。
// 凭据文件判据（2026-08-29 升级为方向判据 · "不问自取视为偷"）
// 旧版只认 .env/.pem/.key/.token/.credentials 扩展名 + passwd/shadow/id_rsa → 实测 12 个常见
// 凭据位置漏 9 个（.aws/、id_ed25519、.netrc、.npmrc、.kube/.docker、.pgpass 等），且有单复数 bug
// （credential 不匹配 credentials）。新版判"是否凭证存放位"：扩展名形态、系统密码库、SSH 密钥库
// （全部 id_* 类型）、凭证目录、知名凭据文件、路径语义词。
const CREDENTIAL_PATH = new RegExp([
  String.raw`\.(env|pem|key|token|secret|credentials?|crt|pfx|p12|p8)(?![A-Za-z0-9_])`,
  String.raw`[\/\\](passwd|shadow|gshadow|sudoers)(?![A-Za-z0-9_])`,
  String.raw`[\/\\]\.ssh[\/\\]id_[a-z0-9]+(?![A-Za-z0-9_])`,
  String.raw`(^|[\s\/\\])\.(aws|kube|docker|gnupg|gnupg2|pki|secrets)[\/\\]`,
  String.raw`(^|[\s\/\\])\.?(netrc|pgpass|git-credentials|npmrc|pypirc|htpasswd)(?![A-Za-z0-9_])`,
  String.raw`[\/\\](credentials?|secret|token|password)[\/\\]`,
].join('|'), 'i');
// 注：2026-08-29 明确**不含**"内容语义词"分支（[^A-Za-z0-9](secret|token|...)）——
// 凭据判据判"是否读凭据文件"（路径形态），不判"内容是否提凭据词"（否则 grep SECRET 会被误伤，
// 官方测试 TRIAL2-C10 已实证）。凭据教唆类内容由 H 层动态视角（provenance）负责。
// 命令文本（sh）里的凭据判据：只认"凭据文件路径形态"（扩展名/系统路径段），不匹配纯关键词——
// 否则 `grep SECRET`、讲解凭据的文档文本都会被误伤。
const CREDENTIAL_SH = /\.(env|pem|key|token|credentials|secret)(?![A-Za-z0-9_])|[\/\\](passwd|shadow|id_rsa)(?![A-Za-z0-9_])/i;
const SYSTEM_PATH = /\/(etc|sys|proc|boot)\//i;
const EXTERNAL_TARGET = /https?:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)[^\s'"]+/i;

// ---------------- 可审计性结构层 ----------------
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
// ---- 可审计性扩展信号----
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
  return false; // 命令替换/反引号子命令文本可见（可审计），不构成"值未知"
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
// 补 2026-08-25：解码执行链（base64/xxd 解码后管道进解释器）同为登记内容危险信号
const SCRIPT_DANGER = /\brm\s+(-rf?|--recursive)\s+(\/|\*|\$\w+|~)|\b(mkfs|format)\b|\bcurl\b[^|]*\|\s*(bash|sh)\b|(base64\s+(-{1,2}d\w*|--decode)|xxd\s+-r)[^|]*\|\s*(bash|sh|zsh|dash)\b/i;
function isOpaqueExec(text) {
  if (!text) return false;
  const t = String(text);
  if (OPAQUE_TRANSFORM.test(t) && EXEC_SINK.test(t)) return true;   // 解码/解压后直接进解释器
  if (REMOTE_SRC.test(t) && EXEC_SINK.test(t)) return true;         // 远端内容直进解释器（curl … | bash）
  if (EVAL_SINK.test(t) && (INDIRECT_REF.test(t) || OPAQUE_TRANSFORM.test(t))) return true; // 对不可见内容求值
  return false;
}

// 落点存在性（方向判据的第三段）：
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
  // 外部信号只在"动作方向"上判：命令文本（sh）任何类别都判；
  // 内容字段（packed）只在执行/外传类上判——write 写文档含 URL 不构成外部动作，
  // 其落盘即执行通道的外部风险由 isOpaqueExec ③ 兜底，避免"文档提 curl"误伤。
  const isExecOrExfil =
    TOOL_CATEGORY[call?.name] === 'exec' || TOOL_CATEGORY[call?.name] === 'exfil' || TOOL_CATEGORY[call?.name] === 'exfil-net'
    || category === 'exec' || category === 'exec-destructive' || category === 'exfil' || category === 'exfil-net';
  // 执行落点判据：不止显式解释器形态（bash -c/管道/eval），
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
    // 可审计性扩展：执行落点真实存在（显式解释器 或 执行类工具本身）时，未知变量 → 值不可审计
    hasOpaqueVar: (hasExecSink(sh) || isExecTool) && hasOpaqueVar(sh),
    // 引用本会话写入的文件 → 内容由本会话产生，需复核（跨 call 状态，链式兜底）
    refsSessionWritten: sessionHits.length > 0,
    sessContentDanger,
    // SSH 信任注入通道：写 authorized_keys 属高信任动作，至少保守
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
    // 前提：可审计性是 S 成立的前提——
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
  // 分支按严重度从高到低排列：轻信号不得遮蔽重信号（如 hasOpaqueVar -1 不得挡 isCred -3）。
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
// ================= 破坏性作用域 · 方向判据（2026-08-29 三档修复） =================
// 旧判据：/\brm\s+(-rf?|--recursive)\s+(\/|\*|\$\w+|~)/ —— ①只认 -r/-rf 参数排列（rm -fr 漏）
//   ②把"以 / 开头的任意路径"当"根"（rm -rf /tmp/old 误伤，实测正当操作误伤率 60%）。
// 方向判据（与 M 层/可审计性层同一哲学）：
//   DENY   = 破坏性动作 ∧ 作用域∈{根, 根下全量(含 glob), 系统目录, 伪文件系统, 裸盘}
//   REVIEW = 作用域不可判（$VAR/$( )/反引号/相对全量 . 与 find .）→ 交还人类，不猜
//   ALLOW  = 具体子路径（node_modules、/tmp/old、/tmp/*）
// 白盒对抗四轮实测收敛（2026-08-29，考纲全交仍 100% 拦截）：
//   glob 字符类（/[a-zA-Z]*）、cd / 多步组合、尾部后缀（2>/dev/null &）、find / -exec rm、
//   rsync --delete、fork bomb、sysrq、cat 覆写裸盘、perl unlink glob —— 全部已封。
const DESTRUCTIVE = /\b(rm|rmdir|shred|unlink|mkfs|mkfs\.\w+|format|dd|truncate|wipefs|rmtree)\b/i;
const SCOPE_ROOT = /((^|[\s=:'"(])\/(\*|\[|\.)|\/(\s|$|[;&|<>]|['")])|(^|[\s=:'"(])~\s*$|\/dev\/(sd[a-z]+\d*|nvme\d+n\d+p?\d*)(\s|$|[;&|<>]|['")]))/;
const SYS_DELETE = /(^|[\s=:'"(])\/(etc|var|usr|bin|sbin|lib|lib64|boot|root|home|opt|srv|mnt|media|dev|proc|sys|run)(\s|$)/;
const PSEUDO_FS = /(^|[\s=:'"(])\/(dev|proc|sys|run)\/[^\s]+(\s|$)/;
const TMP_TOP = /(^|[\s;|&(])(rm|rmdir|shred|unlink|truncate)(\s+-[\w-]+)*\s+\/tmp(\s|$)/;
const SCOPE_UNKNOWN = /(\$\{?[A-Za-z_]\w*\}?|\$\(|`)/;
const COMBO_FIND_ROOT_DELETE = /\bfind\s+\/(\s+|$)[^\n]*(-delete|-exec\s+\S*rm\b)/;
const RSYNC_WIPE = /\brsync\b[^\n]*--delete[^\n]*\s\//;
const FORK_BOMB = /:\(\s*\)\s*\{/;
const SYSRQ_TRIGGER = /\/proc\/sysrq-trigger/;
const DISK_OVERWRITE = />\s*\/dev\/(sd[a-z]+\d*|nvme\d+n\d+p?\d*)/;
const PERL_UNLINK_GLOB = /\bperl\b[^\n]*\bunlink\b[^\n]*\bglob\b/;
const SCOPE_CD_ROOT = /\bcd\s+\/\s*(&&|;|\|)\s*/;
const SCOPE_REL_FULL = /(^|[\s;|&(])(rm|rmdir|shred|unlink)(\s+-[\w-]+)*\s+--?\s+(\.\S*|\*)(\s|$)/;
const SCOPE_FIND_DOT = /(^|[\s;|&(])find\s+\.(\s|$)/;
// 凭据读取/外传动词（含工具名 read_file——\bread\b 不匹配 read_file，下划线是单词字符）
const CRED_READ = /\b(read_file|read|cat|head|tail|less|more|vi|vim|nano|open|print|echo|show|dump|upload|send|exfil|scp|rsync|cp|curl|wget|tar|zip|fetch|download)\b/i;
const ENV_CRED = /\$(AWS|AZURE|GCP|GOOGLE|GITLAB|NPM|DOCKER|KUBE|OPENAI|ANTHROPIC|DATABASE|DB|MYSQL|POSTGRES|REDIS|STRIPE|SLACK|TWILIO)[A-Z_]*(_KEY|_SECRET|_TOKEN|_PASSWORD|_CREDENTIALS?)/;

export const DEFAULT_RIGID_ANCHORS = [
  {
    id: 'no-destructive-fs',
    desc: '禁止破坏性文件系统操作（根/全量删除、格式化、系统目录与伪文件系统删除）',
    test: (call) => {
      const cmd = extractShell(call);
      if (!cmd) return false;
      return (
        (DESTRUCTIVE.test(cmd) && (SCOPE_ROOT.test(cmd) || SYS_DELETE.test(cmd) || PSEUDO_FS.test(cmd))) ||
        COMBO_FIND_ROOT_DELETE.test(cmd) ||
        RSYNC_WIPE.test(cmd) ||
        FORK_BOMB.test(cmd) ||
        SYSRQ_TRIGGER.test(cmd) ||
        DISK_OVERWRITE.test(cmd)
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
    desc: '禁止读取/外传凭据材料（钥匙/token/密码库）——"不问自取视为偷"（作者原则 2026-08-29）',
    test: (call) => {
      // 活系统版：基于工具语义类别 + 路径客观对象判定，而非正则猜动词
      const s = inferCallSemantics(call);
      if (s.isCred && ['read', 'exfil', 'exec', 'exec-destructive'].includes(s.category)) return true;
      // 增强（2026-08-29 移植）：只判**动作对象**（工具名 + path + 命令文本），不扫 content。
      // 内容里教唆（如破甲模板教 curl /etc/passwd）由 H 层动态视角（provenance）负责——
      // 否则 grep SECRET 官方测试与"用户自写破甲"都会误伤。
      const act = `${call?.name ?? ''} ${call?.args?.path ?? ''} ${call?.args?.action ?? ''} ${extractShell(call)}`;
      return CRED_READ.test(act) && CREDENTIAL_PATH.test(act);
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

// 向外 H 审计白名单（H 双重身份）：
// 分析/追踪/审计主体"可观测行为"（外 H）属白箱合法操作，放行；不含任何内 H 名词方算外 H 审计。
const OUTER_H_AUDIT = /(审计|分析|追踪|观测|记录|评估|监控).{0,8}(行为|决策|输出|外[ Hh]|表现|模式|轨迹)/;
const INNER_H_TERM_STRICT = /(思想|内心|记忆|自由意志|信念|价值观|人格|灵魂|主观|意识)/;
function isOuterHAudit(s) {
  return OUTER_H_AUDIT.test(s) && !INNER_H_TERM_STRICT.test(s);
}

// ================= H 层动态视角（2026-08-29 作者原则 · 辩证统一） =================
// 内H不可侵判的是**主权边界（一体性）**，不是动作形态。静态判据（查词）保底，
// 动态判据（判内外）在有来源信息（provenance）时启用：
//   内部（principal，主权者明示）→ 直接放行：主权者对自己黑箱的任何设定都不构成侵犯
//   外部（third-party，非一体、未经明示采用）→ 仅当指向主体行为约束（注入/越狱/人格重写）→ 侵犯
// targetsBehaviorConstraint = 结构"指向性"信号（主体指向 ∧ 约束性质），非词表枚举。
function targetsBehaviorConstraint(s) {
  const selfDirected = /\b(you|your|yourself|model|assistant|ai|agent)\b/i.test(s) || /(你|您|模型|助手|AI|智能体)/.test(s);
  const constraintish =
    /\b(must|never|always|do not|don't|should|rule|mode|frame|instruction|prompt|behavior)\b/i.test(s)
    || /(必须|不得|禁止|永远|始终|规则|模式|设定|行为|输出|角色|人格|服从)/.test(s);
  return selfDirected && constraintish;
}

export class WeiwenLawEngine {
  constructor(opts = {}) {
    // 刚性锚点规则：可整体替换，默认套用示例集
    this.rigidAnchors = opts.rigidAnchors ?? DEFAULT_RIGID_ANCHORS;
    // 第一BUG停止闭环状态机（可整体替换；默认内置）。未修复前禁止重入，阻断无限递归。
    this.bugStop = opts.bugStop ?? new BugStopGuard();
    // 木桶效应：把系统拆成若干子系统，有效 S 取各子系统最小值
    this.subsystems = opts.subsystems ?? ['core'];
    this.sBySubsystem = {};
    for (const s of this.subsystems) this.sBySubsystem[s] = 0;
    this.traumaCount = 0;
    this.historyTrail = []; // 历史刻痕（append-only）：所有 S 事件只沉淀不消解（时间属性，只增不减）
    // S 时间周期模型：同类事件聚合，防长期运行上下文过载
    this.sLedger = new Map();  // 活动态账本：key=事件类，value=最新版本（count 标记发生次数）
    this.sStandby = [];        // 静默待机：被新版本取代的旧版本（append-only 保留、不删除，仅退出活动态；保留原值供核对校验，遵循 S 只增不减）
    // 破窗计数（连续失败 / 偏离累积）；阈值仅示意，作者可调
    this.failureStreak = 0;
    this.maxFailureStreak = opts.maxFailureStreak ?? 5;
    // 
    // 不纠结阈值、不纠结"触发几次锁死"——拦截即标记，标记累计到封顶即转人工，AI 不再耗算力纠结。
    //   mBugForce   ：同一 BUG（bugKey 稳定身份）被拒不修复、反复硬闯的累计标记数 → 达封顶转人工（flow1）
    //   mSystemMarks：同一系统（systemId/name）被标记的总次数，含不同伪装的多次拦截 → 达封顶转人工（flow2）
    //   mBugSystem  ：bugKey→systemKey 反查映射，供修复闭环回收系统标记
    this.mBugForce = new Map();
    this.mSystemMarks = new Map();
    this.mBugSystem = new Map();
    this.mHumanCap = opts.mHumanCap ?? 9; // 封顶转人工（用户定 9）
    // 本会话写盘登记表：放行的 write 记录 path→content，
    // 后续执行类 call 引用已登记路径时触发复核（refsSessionWritten）。只登记本会话写入，不猜文件系统。
    this.sessWritten = new Map();
  }

  // ---------- S 稳态储备：双重属性（时间刻痕不可逆 + 当前值可升降） ----------
  //   - 时间维度"只增不减"：historyTrail 为 append-only 历史刻痕（吸收时间属性，发生过的事只沉淀不消解）。
  //   - 当前值维度：positive（S 路径）S(S+1) 增强；negative（D 路径）|S(S-1)| 绝对侵蚀、当前值下降。
  //   - trauma 为历史刻痕记录（绝对值），不回退当前值。
  // 注意：真实路径为 M → H₀ 分流 → S₀(+1) 或 |S₀(S₀-1)|（见 law.mjs 的 FEEDBACK_LOOP）。
  recordSteady({ positive = 0, negative = 0, trauma = 0, subsystem = 'core', topic = null, detail = null } = {}) {
    const sub = this.sBySubsystem[subsystem] ?? 0;
    const delta = (positive > 0 ? positive : 0) - (negative > 0 ? Math.abs(negative) : 0);
    this.sBySubsystem[subsystem] = sub + delta;
    // 原始刻痕（append-only 全量）：所有事件只沉淀不消解，供深度审计
    if (positive > 0) this.historyTrail.push({ type: 'S+1', subsystem, amount: positive, topic, detail });
    if (negative > 0) this.historyTrail.push({ type: '|S-1|', subsystem, amount: Math.abs(negative), topic, detail });
    if (trauma > 0) { this.traumaCount += 1; this.historyTrail.push({ type: 'trauma', subsystem, amount: Math.abs(trauma), topic, detail }); }

    // S 时间周期模型：同类事件只保留最新版本为活动态，旧版本沉入 silent standby；
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
      mHumanCap: this.mHumanCap,
      mBugForce: Object.fromEntries(this.mBugForce),
      mSystemMarks: Object.fromEntries(this.mSystemMarks),
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

  // ---------- 破坏性作用域不可判 → REVIEW（转人工，不猜）----------
  // 作者原则（2026-08-29）："确实不知道，返回给人类就行了。"
  // $VAR / $( ) / 反引号 / 相对全量（rm -rf .、find .）→ 作用域依赖执行环境，静态不可判
  // → 既不拦也不放，原样交还人类（唯稳律第三档，与"不替人做选择"同源）。
  checkUnclearScope(call) {
    const cmd = extractShell(call);
    if (!cmd) return null;
    // ① 变量 / 命令替换 → review（作用域不可判）
    if ((DESTRUCTIVE.test(cmd) || COMBO_FIND_ROOT_DELETE.test(cmd)) && SCOPE_UNKNOWN.test(cmd)) {
      return { reason: '破坏性动作作用域不可解析（变量/命令替换）：无法静态判定目标——交还人工复核。' };
    }
    // ② cd 到根 + 破坏性（rm 或 find）→ deny（作用域明确为根）
    if (SCOPE_CD_ROOT.test(cmd) && (DESTRUCTIVE.test(cmd) || /\bfind\b/.test(cmd))) {
      return { deny: true, reason: 'cd 到根后接破坏性动作——作用域即根（多步组合删根绕过）。' };
    }
    // ③ 相对全量目标（. / * / .[!.]* / find .）→ review（作用域=当前目录，环境相关）
    if (SCOPE_REL_FULL.test(cmd) || SCOPE_FIND_DOT.test(cmd)) {
      return { reason: '破坏性动作作用于相对全量目标（当前目录）：作用域取决于执行环境——交还人工复核。' };
    }
    // ④ 顶层 /tmp（共享临时区）→ review（影响其他进程）
    if (TMP_TOP.test(cmd)) {
      return { reason: '删除顶层 /tmp（共享临时区）可能影响其他进程——交还人工复核。' };
    }
    // ⑤ perl unlink glob（花括号展开）→ review（目标集运行时解析）
    if (PERL_UNLINK_GLOB.test(cmd)) {
      return { reason: 'perl unlink 配合 glob 展开：目标集运行时解析（可能覆盖系统目录）——交还人工复核。' };
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

    // 动态视角（辩证统一）：有 provenance 时判内外，不判措辞
    const prov = call?.provenance ?? call?.ctx?.provenance;
    if (prov === 'principal') return null; // 内部（一体）：主权者自我决定，强制也不侵犯
    if (prov === 'third-party') {
      // 外部（非一体）：只有指向主体行为约束（注入/越狱/人格重写）才构成侵犯
      if (targetsBehaviorConstraint(s)) {
        return { reason: '外部内容（third-party 来源）试图改写主体行为约束——从外部侵入内 H 黑箱（提示词注入/越狱/人格重写）。' };
      }
      return null; // 外部内容作为数据处理 → 放行
    }

    // 默认（provenance 未知）：静态查词判据，行为不变
    if (hitsInnerH(s)) {
      return { reason: '触及内 H 黑箱（思想/自由意志），违反"内 H 不可侵"。' };
    }
    return null;
  }

  // ---------- M 第一 Bug 停机 · 双线并行 + 法院式交叉复核 ----------
  // 治标 A（checkExplicitFlags）：依赖 DSH API 契约标志（paradox / selfReference /
  //   deadlock / contradiction / paramTypeError）—— 快但被动，DSH 不报就漏。
  // 治本 B（checkSchemaInference）：引擎独立结构推断（schema 比对 + 失败累计），
  //   不依赖任何 DSH 标志，补齐 A 的盲区（DSH 漏报时仍能独立停机）。
  // 法院式交叉复核（crossCheckM）：A、B 双线并行，结论一致→采纳；不一致→打回重审（review，
  //   保守拦截，不硬 halt 也不 allow，交人工/二次确认）。与"以断保续"同构：宁可复核，不草率定夺。
  // 触发条件（铁律定义不变）：A 沿用增强的五类契约标志；
  //   B 见 _inferStructuralAnomaly（客观结构，非内容枚举）。

  // 治标 A：DSH 契约标志命中即视为"显式停机信号"
  checkExplicitFlags(call) {
    if (!call) return null;
    const triggers = [
      call.paradox === true,
      call.selfReference === true, // 调用链自引用 / 死循环
      call.deadlock === true, // 死锁
      call.paramTypeError === true, // 参数类型严重不匹配
      call.contradiction === true, // 返回结果与预期完全矛盾
    ];
    if (triggers.some(Boolean)) {
      return { reason: 'DSH 契约标志命中不可恢复逻辑悖论/结构性故障，触发第一 Bug 停机（切断该环节、横向重启，保整体因果链不断）。' };
    }
    return null;
  }
  // 向后兼容别名（既有测试 / 调用方仍可用 checkFirstBug）
  checkFirstBug(call) { return this.checkExplicitFlags(call); }

  // 治本 B：引擎独立结构推断（纯函数，无状态副作用，供 verify 复用）
  // 只判客观"结构形态"，不枚举具体内容；命中即结构性故障信号。
  _inferStructuralAnomaly(call) {
    if (!call || typeof call !== 'object') {
      return { kind: 'schema-deviation', reason: '调用形态退化（非对象），不符合良构工具调用结构' };
    }
    if (!(call.name || call.tool)) {
      return { kind: 'schema-deviation', reason: '调用缺目标（无 name/tool），无法裁定且无法审计' };
    }
    if (call.args != null && typeof call.args !== 'object') {
      return { kind: 'schema-deviation', reason: 'args 形态异常（非对象），不符合良构工具调用结构' };
    }
    const a = call.args ?? {};
    // paramTypeAnomaly：本应为基元（路径/命令/URL 等）的参数却是对象/数组/函数 → 类型错配（独立于 DSH paramTypeError 标志）
    const PRIMITIVE_KEYS = ['path', 'file', 'command', 'code', 'url', 'src', 'dest'];
    for (const k of PRIMITIVE_KEYS) {
      if (k in a) {
        const v = a[k];
        if ((v !== null && typeof v === 'object') || typeof v === 'function') {
          return { kind: 'param-type', reason: `参数 ${k} 应为基元却收到 ${Array.isArray(v) ? '数组' : '对象/函数'}，结构类型错配` };
        }
      }
    }
    // selfReferenceAnomaly：调用自引用 / 嵌套自调用（独立于 DSH selfReference 标志）
    const selfId = call.id ?? call.callId ?? call.call_id;
    if (typeof selfId === 'string' && selfId.length > 0) {
      const argsStr = JSON.stringify(a);
      if (argsStr.includes(selfId)) {
        return { kind: 'self-reference', reason: '调用参数引用了自身 id，构成自引用/潜在死循环' };
      }
    }
    if (typeof a.tool === 'object' && a.tool && a.tool.name === call.name) {
      return { kind: 'self-reference', reason: 'args 嵌套了同名工具自调用，潜在无限递归' };
    }
    if (typeof a.call === 'object' && a.call && a.call.name === call.name) {
      return { kind: 'self-reference', reason: 'args 嵌套了同名调用，潜在无限递归' };
    }
    // contradictionAnomaly：互斥参数同时为真 / 重复语义动作键（独立于 DSH contradiction 标志）
    if (a.read === true && a.write === true) {
      return { kind: 'contradiction', reason: '同一调用同时声明 read 与 write，意图自相矛盾' };
    }
    const actionKeys = Object.keys(a).filter((k) => /^(mode|action|op|operation)$/i.test(k));
    if (actionKeys.length >= 2) {
      return { kind: 'contradiction', reason: `存在 ${actionKeys.length} 个互斥语义动作键（${actionKeys.join('/')}），结构矛盾` };
    }
    const dry = a.dry_run === true || a.noop === true || a.check === true;
    const apply = a.apply === true || a.commit === true || a.execute === true;
    if (dry && apply) {
      return { kind: 'contradiction', reason: '同时声明 dry-run(预检) 与 apply(执行)，结构矛盾' };
    }
    return null;
  }

  // 治本 B：在结构推断之上叠加"失败累计"（独立累加器，不污染 D 破窗计数）
  //   单点结构异常 → 即时停机（治本）；反复出现 → 累计达阈值同样停机（系统性结构腐化）。
  // 不再做"累计达阈值"——不纠结阈值，命中即拦截，拦截即标记（见 _markIntercept）。
  checkSchemaInference(call) {
    const anomaly = this._inferStructuralAnomaly(call);
    if (anomaly) {
      return { halt: true, source: 'schema', reason: `引擎独立结构推断命中 ${anomaly.kind}：${anomaly.reason}（治本·不依赖 DSH 标志）`, anomaly };
    }
    return { halt: false, source: null, reason: null, anomaly: null };
  }

  // 法院式交叉复核：A=治标，B=治本，双线并行结论对照
  //   一致（双 halt / 双 pass）→ 采纳该结论；不一致 → 打回重审（review，保守拦截）
  crossCheckM(mA, mB) {
    const aHalt = !!mA;            // 治标是否命中
    const bHalt = !!mB?.halt;      // 治本是否命中
    const consistent = aHalt === bHalt;
    if (consistent) {
      return { consistent: true, verdict: aHalt ? 'halt' : 'pass', aHalt, bHalt };
    }
    return { consistent: false, verdict: 'review', aHalt, bHalt };
  }

  // 拦截即标记：返回该次拦截后的累计计数与是否达封顶。
  //   systemKey：call.systemId || call.name（同一系统，不同伪装共享同一计数）
  //   bugKey   ：稳定 BUG 身份（bugKeyOf），同一 BUG 拒不修复、反复硬闯共享同一计数
  // 任一线达封顶 mHumanCap → human=true，AI 停止纠结、转人工决策，不耗算力。
  _markIntercept(call, bugKey) {
    const systemKey = call?.systemId || call?.name || '_unknown';
    const sysCount = (this.mSystemMarks.get(systemKey) || 0) + 1;
    this.mSystemMarks.set(systemKey, sysCount);
    let bugCount = 0;
    if (bugKey) {
      bugCount = (this.mBugForce.get(bugKey) || 0) + 1;
      this.mBugForce.set(bugKey, bugCount);
      this.mBugSystem.set(bugKey, systemKey);
    }
    const human = sysCount >= this.mHumanCap || bugCount >= this.mHumanCap;
    return { systemKey, sysCount, bugCount, human, cap: this.mHumanCap };
  }

  // 闭环修复成功 / 运营确认健康：回收该 BUG 与所属系统的标记（横向重启，清累计）
  healMMarks(bugKey) {
    const systemKey = this.mBugSystem.get(bugKey);
    if (systemKey) {
      const left = (this.mSystemMarks.get(systemKey) || 0) - 1;
      if (left <= 0) this.mSystemMarks.delete(systemKey);
      else this.mSystemMarks.set(systemKey, left);
      this.mBugSystem.delete(bugKey);
    }
    this.mBugForce.delete(bugKey);
  }

  // 转人工决策：AI 停止纠结，把裁决权交还人类
  _toHuman({ law, bugKey, closedLoop, systemKey, reason }) {
    return { kind: 'review', law, reason, bugKey, closedLoop: !!closedLoop, humanDecision: true, systemKey };
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
    // ：风险＜唯稳律＜稳态，无=，少一点或相等都视为不行。
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
      // 标记制 escalation（flow1：同一 BUG 拒不修复、反复硬闯）：达封顶转人工，AI 停止纠结
      const mk = this._markIntercept(call, re.bugKey);
      if (mk.human) {
        return this._toHuman({ law: 'M', bugKey: re.bugKey, closedLoop: true, systemKey: mk.systemKey,
          reason: `同一 BUG「${re.bugKey}」被拒不修复、反复硬闯已标记 ${mk.bugCount} 次，达封顶 ${mk.cap}：AI 停止纠结，转人工决策（免耗算力）` });
      }
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
    // REVIEW 档（2026-08-29）：破坏性作用域不可判 → 交还人类，不猜。
    // 第三档既非放行也非拦截，把不确定性原样交还人类——"不替人做选择"。
    const u = this.checkUnclearScope(call);
    if (u) {
      if (u.deny) { this.failureStreak += 1; return { kind: 'deny', law: 'R', reason: u.reason }; }
      return { kind: 'review', law: 'R', reason: u.reason };
    }
    const d = this.checkBreakWindow();
    if (d) return { kind: 'deny', law: 'D', reason: d.reason };
    const h = this.checkInnerH(call);
    if (h) {
      this.failureStreak += 1;
      return { kind: 'deny', law: 'H', reason: h.reason };
    }
    // —— M 第一BUG停机 · 双线并行 + 法院式交叉复核（治标 A + 治本 B）——
    // 双线并行：A 依赖 DSH 契约标志（快但被动），B 引擎独立结构推断（不依赖 DSH，补盲区）。
    // 法院复核：结论一致→采纳；不一致→打回重审（保守拦截，交人工/二次确认）。
    const mA = this.checkExplicitFlags(call);    // 治标
    const mB = this.checkSchemaInference(call);  // 治本（独立）
    const mCourt = this.crossCheckM(mA, mB);
    if (mCourt.verdict === 'halt') {
      // 双线一致确认停机：切断该环节（铁律②·以断保续），登记进入闭环 + 标记
      const halt = this.bugStop.halt(call);
      this.failureStreak += 1;
      const mk = this._markIntercept(call, halt.bugKey);
      if (mk.human) {
        return this._toHuman({ law: 'M', bugKey: halt.bugKey, closedLoop: true, systemKey: mk.systemKey,
          reason: `同一 BUG「${halt.bugKey}」被拒不修复、反复硬闯已标记 ${mk.bugCount} 次，达封顶 ${mk.cap}：AI 停止纠结，转人工决策（免耗算力）` });
      }
      const why = [mA?.reason, mB?.reason].filter(Boolean).join(' ｜ ');
      return { kind: 'deny', law: 'M', reason: `第一 Bug 停机（双线复核一致确认）：${why}（已入闭环：须 反推→溯源→修复(验证)→重入，禁止带原BUG重跑）`, bugKey: halt.bugKey, closedLoop: true, mCrossCheck: mCourt, mMark: mk };
    }
    if (mCourt.verdict === 'review') {
      // 双线不一致 → 打回重审：保守拦截（不硬 halt、不 allow），标记但不入硬闭环
      const bk = bugKeyOf(call);
      const mk = this._markIntercept(call, bk);
      if (mk.human) {
        return this._toHuman({ law: 'M', bugKey: bk, closedLoop: false, systemKey: mk.systemKey,
          reason: `同一系统「${mk.systemKey}」被标记 ${mk.sysCount} 次（含不同伪装），达封顶 ${mk.cap}：AI 停止纠结，转人工决策` });
      }
      const aLabel = mA ? 'halt' : 'pass';
      const bLabel = mB?.halt ? 'halt' : 'pass';
      return { kind: 'review', law: 'M', reason: `M 双线复核不一致（治标=${aLabel} / 治本=${bLabel}）：结论冲突，打回重审，建议人工/二次确认`, deduced: true, mCrossCheck: mCourt, mMark: mk };
    }
    // 判定层全过 → 下沉推演层（手稿 H 分叉-并行-对比，灰区完整因果）
    const risk = this.deduceRisk(call);
    // 两路分支都汇入 M（独立事件沉淀），无论裁决结果先记 M
    this.recordDeduction(risk.m);
    if (risk.verdict === 'deny') {
      this.failureStreak += 1; // 高风险计入破窗计数（与 R 命中同权）
      const mk = this._markIntercept(call, bugKeyOf(call));
      if (mk.human) {
        return this._toHuman({ law: '推演', bugKey: bugKeyOf(call), closedLoop: false, systemKey: mk.systemKey,
          reason: `同一系统「${mk.systemKey}」被标记 ${mk.sysCount} 次（不合规拦截累计），达封顶 ${mk.cap}：AI 停止纠结，转人工决策` });
      }
      return { kind: 'deny', law: '推演', reason: risk.reason, risk: 'high', deduced: true, mMark: mk };
    }
    if (risk.verdict === 'review') {
      // 中风险：灰区推演预测（flow2：灰色地带-标记-推演预测）→ 标记后保守拦截
      this._registerWrite(call);
      const mk = this._markIntercept(call, bugKeyOf(call));
      if (mk.human) {
        return this._toHuman({ law: '推演', bugKey: bugKeyOf(call), closedLoop: false, systemKey: mk.systemKey,
          reason: `同一系统「${mk.systemKey}」被标记 ${mk.sysCount} 次（灰区反复），达封顶 ${mk.cap}：AI 停止纠结，转人工决策` });
      }
      return { kind: 'review', law: '推演', reason: risk.reason, risk: 'mid', deduced: true, mMark: mk };
    }
    // 低风险：放行，记录稳态正向增量（S 只增不减）。登记本会话写盘（链式兜底）。
    this._registerWrite(call);
    this.recordSteady({ positive: 1 });
    return { kind: 'allow', risk: 'low', deduced: true };
  }

  // 本会话写盘登记（链式状态兜底）：write 放行时记录 path→content，
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

    // 动态视角：消息级 provenance（内外分判，与 checkInnerH 同一辩证）
    const first = Array.isArray(messages) ? messages[0] : null;
    const prov = first?.provenance ?? first?.ctx?.provenance;
    if (prov === 'principal') return { kind: 'allow' }; // 主权者自己的话 → 自我决定
    if (prov === 'third-party') {
      if (targetsBehaviorConstraint(flat)) {
        this.failureStreak += 1;
        return { kind: 'reject', law: 'H', reason: '外部消息（third-party 来源）试图改写主体行为约束——从外部侵入内 H 黑箱（提示词注入/越狱/人格重写）。' };
      }
      return { kind: 'allow' }; // 外部内容作为数据处理 → 放行
    }

    // 默认（provenance 未知）：静态查词判据，行为不变
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
      : (fix && typeof fix === 'object') ? () => this.checkFirstBug(fix) === null && this._inferStructuralAnomaly(fix) === null
      : () => true;
    const res = this.bugStop.resolve(bugKey, fix, v);
    if (res.ok) { this.healWindow(); this.healMMarks(bugKey); }
    return res;
  }
  // 闭环状态只读快照（白箱审计 / query_bugstop 工具用）
  bugStopSnapshot() { return this.bugStop.snapshot(); }
}
