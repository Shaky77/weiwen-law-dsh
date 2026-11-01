// 变量即动作（verb）· R 是「查」、H 是「观察者视角」＋ S↔D 的张力
// ════════════════════════════════════════════════════════════════════
// 来由（安 2026-10-20 12:0x）：
//   「R（让执行者直接全网查，大数据库查）。变成一个可执行的动作，
//     而不是定死的赋值问题。而 H 直接定为观察者视角，需要在 SD 这二者制衡中选取。
//     至于这个 SD 中间这个张力，如何计算，我没想好，我是文科生，
//     这个理工科的东西，我脑子有点不够用。你试试。」
//
// 🔴 这一裁定把两个「值」掰成了「动作」—— 而我此前一直在给它们找数值：
//   · R  ── 我建了 rCapacity.mjs 一张 14 条域常数表，然后苦恼「R₀ 取哪个数」。
//           错在把**动作**当成了结果：R 的动作是「查」，查完的产物是 **S**，不是 R 的数值。
//   · H  ── 我一直想给 H 赋一个位置/比例。错在把**选择**当成了赋值：
//           H 是观察者视角下的**一次选取**（在 S 与 D 之间选余量），不是被测量出来的量。
//
// ⇒ 于是分子 R×S 也讲通了：**R 这个动作的产出就是 S**，两者本来一体，不是两个独立的数相乘。
//
// ────────────────────────────────────────────────────────────────────
// 🔴 杠杆实物对应（`X推`，依据 law.mjs:60 原文，未逐条经安确认）
//
//   原文 : 「H 是 S 与 D 之间的动态滑块。H 越小（越靠近 S_min），力臂越长…
//            H 越大（越靠近 D_max），力臂越短」
//   ⇒ 总跨距 = 张力 L（S 端到 D 端）
//   ⇒ H = **阻力臂**（滑块距 S 端的距离），而「力臂长」说的是**动力臂 = L − H**
//     （原文「H 越小 ⇒ 力臂越长」正是 L − H 的关系：H↓ ⇒ L−H↑）
//   ⇒ `H / (S↔D)` = H / L = **阻力臂占比**
//   ⇒ 约束 `0 < H/L < R` 在百分制刻度下读作：**读数 0 < 100·H/L < 100**
//     ⇔ `0 < H < L`（两边同乘 L/100）
//     · H → 0  ：贴死 S 端 ⇒ 让步为零
//     · H → L  ：贴死 D 端 ⇒ 动力臂为 0 ⇒ 杠杆失效（这才是上界真正的含义）
//   ⇒ 🔴 **上界的实体是「L 本身」，不是 R**。R=100 只是把 L 写成「100%」。
//     所以「R 无上限」与「R=100」不矛盾：**R=100 是刻度，不是天花板**。
//
//   ══════════════════════════════════════════════════════════════
//   🔴 撤回（安 2026-10-20 12:3x 亲裁）：上一版此处写「R = 域规定的阻力臂占比上限，
//      R<1 是结构推论」——**整条撤回**。裁语原文：
//        「R 没上限，既然 R 是客观存在，就没有上限，就看科学能否发现。
//          比如因果律，科学没发现因果律的公式怎么写，不知道因果的运行结构，
//          但也不能说因果律不存在。但是以我旧论文，也就是唯稳律雏形的时候，
//          R=100 为固定常数，目的只有一个，为了方便公式计算，
//          所以采用百分之，让 M 这个最后结果能落在肉眼可见的差异中。」
//      错在哪：我把**计量刻度**当成了**上限**。
//        · R 本体 = 客观规则（域），**无上限、无已知全貌**；"科学没测出" ≠ "R 不存在"。
//        · R = 100  = 旧论文选的**刻度**（百分制），唯一目的是让 M 的差异肉眼可见。
//          ⇒ 它是**换算单位**，不是对 R 的封顶；换千分制只改读数，不改编制。
//        · 我上一版据此写 `rCap ∈ (0,1)` 的守卫 —— 那是拿"读数的单位"冒充"R 的属性"，
//          属于**一值两义**（同一个 rCap 既当刻度又当上限）。
//     判据（新）：**任何据称来自 R 的上限，必须先分清它是 R 本体、域读数、还是刻度；
//                三者的"能不能封顶"完全不同。**
//   ══════════════════════════════════════════════════════════════
//
// ════════════════════════════════════════════════════════════════════
// 🔴 张力 L 怎么算 —— 三档，按「这个域实际给了什么」路由（不是按域名字查表）
//
//   档 A（率/容差可比）：L = |偏差| / 容差        —— 无量纲，单位是「几个容差」
//        该域给了物理容差（医疗 ±5%）或失效率，才算得出。
//   档 B（只有动作/条款）：L = 要求的动作集 − 允许的动作集  —— **集合差，不是数**
//        产出的是**缺口清单**（差在哪几条），不是一个标量。
//        ⚠️ 这一档才是多数域的真实供给：标准写的是「必须做什么」，不是一个数。
//   档 C（都拿不到）：不判 —— `unknown`，**不等于相容**。
//
//   🔴 关键是 B 档不算比值：集合差没有「大小」，所以 `H/L` 在 B 档无定义。
//      ⇒ B 档只回答「缺口是否为空」＋「缺口在哪几条」，不回答位置。
//      ⇒ **不要在 B 档硬凑一个数**（那就是把枚举冒充度量）。
//
// ────────────────────────────────────────────────────────────────────
// 🔴 补正（安 2026-10-20 16:4x · 部门例子）—— 修的是上面这条动作链的**第一步**
//
//   安的原话（大意）：
//     「我在一个公司部门上班，基础职员。公司下达项目任务，部门接手；管理者开始下派，
//       分到我手上是做文案和 PPT。我作为做这个任务的第一责任人，**有我自己的审美和
//       思维方式，做任务时会自动带入我的审美和思考能力**。做好了以后我**不是直接交给
//       公司，而是交给部门管理者**，由他审核符不符合标准、能不能过；不过的地方我修改
//       调整，**直到管理者放行**。」
//
//   ⇒ 这段把我两处写错的地方照出来了：
//     ① **R 不直达**。我原来的 steps 第一步是「定位规则族 → 查公开标准正文」。
//        照那个做，我会拿国标交差 —— **交错了尺子**。本层真正约束我的是
//        **管理者那把尺子**：它是公司标准经他理解后的转述，可能更严、可能漏项。
//        ⇒ 于是「R 客观」这句话要精确到层：**层内客观**（对本层硬、不可改），
//          **跨层是投影**（不是原版）。查的动作第一步不是"查国标"，是"确认谁的尺子"。
//     ② **H 不是空位**。「自动带入我的审美」= H 不需谁批准、一出手就带着，
//        且它有稳定取向（审美）而非随机噪声 —— 否则管理者无法审核。
//        ⇒ `noHigherGrantor`（H 之上无授权者）在此有了实物，不是条文。
//
//   ⇒ 另外两处它顺手印证（不新增，只对齐）：放行是**上一层**给的（所以不能自评 M 通过）；
//     打回是**排除信息**（哪条链断了），记 `|-S|`，不是扣分。
// ⚠️ 不得使用 node 内置模块（docs/engine 镜像给浏览器加载）。
// ════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════
// R ＝ 可执行动作（查），不是常数
// ════════════════════════════════════════════════════════════════════
export const R_ACTION = {
  key: 'R',
  verb: 'resolve_domain',
  label: '查域：执行者直接全网查 / 大数据库查',
  // 🔴 动作的四步，每步都必须留下可核痕迹；缺任一步 ⇒ 这次「查」不算完成。
  //   ⚠️ 2026-10-20 16:4x 补第 1 步（原四步顺延为 2–5）：**先定尺子来源，再查正文**。
  //      顺序不能反 —— 反了就会拿公开标准去交本层的差（见文件头「R 不直达」）。
  steps: [
    { n: 1, do: '定「本层尺子」是谁给的：这条要求出自公开标准原版，还是上一层（部门／管理者／主审／客户）的转述', out: 'rGrade（origin / relay，见 R_RELAY）' },
    { n: 2, do: '定位规则族（这个事项属于哪个行业的哪套规则体系）', out: 'family' },
    { n: 3, do: '查该族标准正文，取「标准号 + 条款号 + 数值 + 单位 + 版本日期」', out: 'clause' },
    { n: 4, do: '判量纲（率 / 物理容差 / 有序等级 / 标准合法地不给数）⇒ 决定后续走哪档张力', out: 'dim' },
    { n: 5, do: '记 provenance（谁查的、查的哪一版、何时；若为 relay，还须记「转述自哪条原版、由谁转述」）', out: 'provenance' },
  ],
  output: 'S —— 该域的标准清单。**不是 R 的数值。**',
  // ⚠️ 这条是本轮最重要的一句：
  anti: '🔴 把 R 定死成一个常数 ＝ 把动作当成了结果。R 自身没有取值；R 的产出是 S。',
  // 从「查」的产物里，才可能导出一个事件阈值（且仅当第 4 步判为「率」）
  derived: '若 step4 判为「率」⇒ 可换算为事件阈值 R₀ = p_max × N_opp（仍缺 N_opp 口径，见 docs/26）。这是**动作的一个分支产物**，不是 R 的定义。',
  unbounded: '🔴 「查」是开放的：新域、新版本、新条款都靠这个动作覆盖 ⇒ **不需要预先在代码里枚举域**。',
  // ◆ rCapacity.mjs 那张表的身份（不改代码，只改定位 —— 否则同一件事会有两个身份）
  cacheNote:
    '`rCapacity.mjs` 那张 14 条域常数表 ＝ R 动作的**历史产物缓存（S）**，不是 R 本身。' +
    '表里查不到的域 **不是缺口**，是**还没查**（动作可执行，随时能补）。' +
    '⚠️ 若把表当成 R ⇒ 新域永远进不来（只能靠改代码枚举），这正是安说的「定死的赋值问题」。',
  // ◆ 缓存未命中时的动作（这才叫「可执行」—— 不是留个空，而是有下一步）
  onCacheMiss: {
    trigger: '要处理的域不在缓存表里',
    do: '由**执行者现场执行 steps 1–5**（全网查 / 大数据库查），查完把结果写回缓存（带 provenance）。',
    forbid: '🔴 不许把「缓存里没有」当成「判不出」⇒ 那不是 L2/L3，是**该执行动作而没执行**。',
    fallback: '若执行者拿不到（无网络 / 无权限）⇒ 如实报「查证未完成」，落 review；不得默认放行，也不得拍数。',
  },
};

// ════════════════════════════════════════════════════════════════════
// 🔴 R 的三层区分（**必须先分清，否则「一值两义」必然复发**）
//
//   第 1 层 R 本体 ── 客观规则（域）。无上限、无已知全貌、不可穷举。
//   第 2 层 域读数 ── 某个域在某条规则上的具体数值（1e-9/飞行小时、±5%…）。
//                    这是**投影**，不是 R。可增可修，随科学进步而变。
//   第 3 层 刻度   ── 计量单位（百分制 R=100）。**只是换算，不构成任何约束。**
//
//   🔴 判据：凡「据称来自 R 的上限」，先问它是哪一层：
//        · 若是第 3 层（刻度）⇒ **它根本不是上限**，换刻度不改编制。
//        · 若是第 2 层（域读数）⇒ 那是该域自己更严，不是 R 有上限。
//        · 若是第 1 层 ⇒ 说「R 有上限」等于声称掌握了 R 的全貌 ⇒ 负举证责任。
// ════════════════════════════════════════════════════════════════════
export const R_ONTOLOGY = {
  layer: '本体',
  exists: true,
  bounded: false,
  fullyKnown: false,
  claim: 'R 是客观存在，**没有上限**。科学能否发现是认识问题，不是存在问题。',
  analogy:
    '因果律：科学至今写不出因果律的公式，也不清楚因果的运行结构，' +
    '**但不能因此说因果律不存在**。R 同理 —— 未被测量 ≠ 不成立。',
  antiBound:
    '🔴 禁止为 R 设上界。凡写「R 必须 < 1 / 最大为 N」者，要么混淆了刻度，要么把某域读数当成了 R。',
};

export const R_SCALE = {
  layer: '刻度',
  value: 100,
  unit: 'percent',
  origin: '唯稳律雏形旧论文（安 2026-10-20 12:3x 亲述）：「R=100 为固定常数」',
  purpose: '唯一目的是方便公式计算 —— 采用百分之，让 M 的最后结果能落在肉眼可见的差异中。',
  isBound: false,
  // 🔴 刻度自检：真正的编制必须与刻度无关。若换刻度会改判决，说明那里把刻度当成了界。
  invariant: '换刻度（100 → 1000）只改读数，**不得改任何判决**。改了就说明把 scale 当成了 bound。',
  alternative: '若某域天然用千分制/比值制，改这里即可；**不得改 R_ONTOLOGY**。',
};

// ════════════════════════════════════════════════════════════════════
// 🔴 R 不直达：本层拿到的「尺子」有来源之分（安 2026-10-20 16:4x 部门例子）
//
//   例子：公司下任务 → 部门接手 → 管理者下派 → 我做文案/PPT → **交管理者审核**，
//         不过就改，直到放行。**不是直接交公司。**
//
//   ⇒ 「R 是客观规则」这句话必须精确到层：
//       · **层内客观**：对本层而言它硬、不可改、不服从就过不去。
//       · **跨层是投影**：我拿到的是公司标准**经管理者转述后**的那一版，
//         不是原版。中途有解释、有取舍、也可能漏项。
//   ⇒ 所以「查域」的第一步不是查国标（那是 origin），是**先问这把尺子是谁给的**。
//     直接拿 origin 交本层的差 ＝ 交错了尺子（原版合规 ≠ 本层通过）。
//
//   ⚠️ 这不是说 relay 更差。relay 是绝大多数执行层的真实处境，
//      **认它**才能过闸门；**冒充它**（拿原版当本层要求，或拿本层要求对外当原版举证）才是错。
// ════════════════════════════════════════════════════════════════════
export const R_RELAY = {
  question: '我这层被约束的这条要求，是公开标准原版，还是上一层的转述？',
  grades: {
    ORIGIN: 'origin',
    RELAY: 'relay',
  },
  detail: {
    origin: {
      key: 'origin',
      label: '公开标准原版',
      duty: '可作为对外引用与合规举证（前提：标准号＋条款号＋版本可核）',
      canCite: true,
      traceable: true,
      provenance: '标准号 + 条款号 + 版本日期（缺一即降为 relay）',
    },
    relay: {
      key: 'relay',
      label: '上一层转述（部门／管理者／主审／客户给的本层要求）',
      duty: '只对本层生效；须标出「转述自哪条原版、由谁转述」，**不得对外冒充原版举证**',
      canCite: false,
      traceable: 'partial',
      provenance: '转述人 ＋ 转述时间 ＋ 向上指到的那条原版（指不到 ⇒ 该 relay 无 provenance，只能当线索不能当判据）',
    },
  },
  // ◆ 判据：**能不能把它写成「标准号 + 条款号 + 版本」**
  //   写得出来 ⇒ origin；写不出来、只存在于某个人的判断/习惯里 ⇒ relay。
  //   ⚠️ 这条判据能判一个没见过的例子（不看行业名、不看话术），所以是结构不是枚举。
  test: '把这条要求写成「标准号 + 条款号 + 版本」：写得出来 ⇒ origin；写不出来、只在某人判断里 ⇒ relay。',
  // ◆ 转述的合法性：只能收紧，或在原版自身裁量区间内取松端
  tightenOnly:
    'relay 必须严于或等于原版；或落在原版**自身允许的裁量区间**内（即 H_OBSERVER 的 toward_s / balanced / toward_d 三档都在区内）。' +
    '若 relay 放开到原版明确要求之外 / 超出容差 ⇒ 那不是 R 的投影，是**违规**，不得当判据。',
  // ◆ 与本模块其他常量的接线（避免同一件事两处定义）
  wiring: {
    toOntology: 'R_ONTOLOGY 说「R 本体无上限」—— 那是**跨层**的话；本层仍受 relay 硬约束。两者不冲突：一个说规则有多大，一个说我这层拿到哪一版。',
    toTension: '张力档 B 的 `required`（要求集）应取自**本层的尺子**（relay 或 origin），不是取自能查到的最严标准。取错这一项，缺口清单会骗人。',
    toEscalate: '若 relay 与原版冲突且无法判定谁对 ⇒ 属"判不出"；此时是否升级，仍走 ESCALATION 三条合取，不因"是 relay"就自动升级。',
  },
  // ◆ 最容易犯的两个错（成对，缺一侧就会反向做错）
  anti: [
    '🔴 拿 origin 交本层的差（交错了尺子）：查完国标就交，管理者打回 → 不是标准查错了，是尺子取错了。',
    '🔴 拿 relay 冒充 origin：把「部门要求」说成「国标要求」对外举证 → 这是造假，不是省事。',
  ],
  // ◆ 与例子里的迭代对齐：打回不是扣分
  onReject:
    '管理者打回一条 ⇒ 记一条 `|-S|`（哪条链断了／哪条要求没满足），**不是扣 S**。' +
    '改到达标为止；「放行」是**上一层**给出的 allow，不是自评通过（自评 M 通过不构成放行）。',
};

/**
 * 判本层尺子的来源等级。**只做二选一，不解析文本**（同 checkClauseShape 的立场）。
 *
 * @param {object} a
 * @param {boolean} [a.citableToPublic] 能否指到「标准号+条款号+版本」的公开原文
 * @returns {{grade:string, ok:boolean, duty?:string, provenance?:string, reason:string}}
 */
export function rSourceGrade({ citableToPublic } = {}) {
  if (typeof citableToPublic !== 'boolean') {
    return { grade: 'unknown', ok: false, reason: '未回答「能否指到公开原文（标准号+条款号+版本）」⇒ 不判来源等级（≠ origin）' };
  }
  const g = citableToPublic ? R_RELAY.detail.origin : R_RELAY.detail.relay;
  return {
    grade: g.key, ok: true, duty: g.duty, provenance: g.provenance, canCite: g.canCite,
    reason: citableToPublic
      ? '指得到公开原文 ⇒ origin：可对外举证，但注意它未必是本层的尺子'
      : '指不到公开原文 ⇒ relay：只对本层生效，不得对外冒充原版；须补「由谁转述、转述自哪条」',
  };
}

// ════════════════════════════════════════════════════════════════════
// 「更守标准」那一档留多少余量 —— 查到的公开共识（不是拍的）
//
//   安 2026-10-20：「我定不了，行业标准、领域标准、自有公开共识，去查，别问我。」
//   ⇒ 这就是 R 动作的一次真实执行（step1 定族 → step2 取数 → step3 判量纲 → step4 记来源）。
//
//   🔴 查的结果本身很重要：**共识给的不是一个数，是按「后果严重度」分的区间。**
//      所以「档位→数额」这件事不需要我拍 —— 它是**查出来的区间 ＋ 取端规则**。
//
//   ⚠️ 全部为 secondary（转引检测机构/工程指南，条款号多处待核，一手标准正文未查）。
//      区间就是区间，**不许在代码里取中值当"共识数"**（那是拿一个点冒充一段共识）。
// ════════════════════════════════════════════════════════════════════
export const MARGIN_CONSENSUS = {
  kind: 'margin',              // 余量 = 距边界的比例（不是 H 本身）
  unit: 'percent_of_limit',
  verified: 'secondary',
  rows: [
    {
      key: 'metrology_high_risk',
      label: '计量 / 校准（错误判定会到达患者、飞机、监管）',
      marginPct: [25, 25],
      basis: 'TUR ≥ 4:1 ⇒ 测量不确定度 ≤ 容差的 1/4 ⇒ 接受线须内缩 25%',
      source: 'ANSI/NCSL Z540.3-2006 §5.3(b)（PFA≤2%，TUR 4:1 为替代路径）／ILAC G8:2019 Tab.1（Guard Band = 1U）／ASME B89.7.3.1 §5.2',
      verified: 'secondary',   // 标准号与条款转引自检测机构/校准实验室公开指南；正文未逐字核
      note: 'TUR 2:1 ⇒ 判不了合规（边界态）；TUR < 2:1 ⇒ 该容差下不适用。⚠️ 本行区间退化为 [25,25] ⇒ 三档取到同一读数：这**不是档位失效**，是该域只给了唯一余量、没有可选的余地。',
    },
    {
      key: 'aero_medical_derating',
      label: '航天 / 关键医疗（I 级降额，失效后果严重且难修）',
      marginPct: [40, 50],
      basis: '降额到额定值的 50–60% ⇒ 剩余余量 40–50%',
      source: 'MIL-STD-1547 / MIL-HDBK-1547（I 级最大降额）；工程指南转引',
      verified: 'secondary',
      note: '容性负载电压多取 50%；结温另要求比额定低 ≥20°C。',
    },
    {
      key: 'mil_industrial_derating',
      label: '军用 / 高端工业（II 级标准降额）',
      marginPct: [30, 40],
      basis: '降额到额定值的 60–70%',
      source: 'MIL-HDBK-1547（II 级）；转引',
      verified: 'secondary',
      note: '',
    },
    {
      key: 'commercial_derating',
      label: '商用 / 消费（III 级最小降额）',
      marginPct: [20, 30],
      basis: '降额到额定值的 70–80%',
      source: 'MIL-HDBK-1547（III 级）；工程指南转引',
      verified: 'secondary',
      note: '',
    },
  ],
  // 🔴 选择依据：不是行业名字，是「错了会伤到谁」
  routing: '按后果严重度分档，不按行业名查表。判据：这次判定错的后果，落到人／机／监管哪一侧。',
  // 档位 → 取区间哪一端（这才是「档位→数额」的真解，不是拍一个比例）
  pick: {
    toward_s: { end: 'upper', why: '更守标准 ⇒ 取余量区间的**大端**（留得更多）' },
    balanced: { end: 'mid', why: '居中 ⇒ 取区间中点（**中点不是共识数，是两点之间的位置**）' },
    toward_d: { end: 'lower', why: '更顺扰动 ⇒ 取**小端**（留得更少）' },
  },
  onMiss: {
    do: '该域不在本表 ⇒ 按 R_ACTION.steps 现场查（领域标准 / 行业共识），查完写回本表并标 verified。',
    forbid: '🔴 不许拿别域的行套用（跨域套用＝把别人的余量当自己的标准）。',
    fallback: '查不到 ⇒ 不判位置，落 review；不得拍数。',
  },
};

/**
 * 从共识表取余量（返回区间 ＋ 取端 ＋ 来源，**不返回"共识数"**）。
 *
 * @param {object} a
 * @param {string} a.criticality  后果级别（= MARGIN_CONSENSUS.rows[].key）
 * @param {'toward_s'|'balanced'|'toward_d'} [a.notch]  H 选的档位
 * @returns {{ok:boolean, marginPct?:number[], end?:string, source?:string, reason:string}}
 */
export function pickMargin({ criticality, notch } = {}) {
  const row = MARGIN_CONSENSUS.rows.find((r) => r.key === criticality);
  if (!row) {
    return { ok: false, reason: `后果级别「${criticality ?? '(未给)'}」不在查得的共识表里 ⇒ 走 onMiss（现场查），不拍数` };
  }
  const [lo, hi] = row.marginPct;
  const p = MARGIN_CONSENSUS.pick[notch ?? 'balanced'];
  if (!p) return { ok: false, reason: `档位「${notch}」不在 MARGIN_CONSENSUS.pick 里` };
  return { ok: true, marginPct: [lo, hi], end: p.end, why: p.why, source: row.source, verified: row.verified, basis: row.basis };
}

/**
 * 由「余量区间 ＋ 档位取端」算出 H 的**刻度读数**（不是 H 本身，也不是位置判决）。
 *
 *   余量 m 的定义：留了多少没用到 ⇒ H = L·(1 − m)
 *   刻度读数     ：rCap = R_SCALE.value · (1 − m)   （百分制 ⇒ 读数就是「百分数」）
 *
 * 🔴 中点只在 `balanced` 用，且必须标明 `end:'mid'` —— 中点不是"共识数"，是两个端点之间的位置。
 *
 * @returns {{ok:boolean, rCap?:number, end?:string, marginPct?:number[], reason:string}}
 */
export function notchCapOf({ criticality, notch } = {}) {
  const m = pickMargin({ criticality, notch });
  if (!m.ok) return { ok: false, reason: m.reason };
  const [lo, hi] = m.marginPct;
  const pickPct = m.end === 'upper' ? hi : m.end === 'lower' ? lo : (lo + hi) / 2;
  // 两位小数收口：纯为读数可读，不影响判决（hi 用的是这个值，误差 < 1e-2 不会翻判决边界）
  const rCap = Math.round(R_SCALE.value * (1 - pickPct / 100) * 100) / 100;
  return {
    ok: true, rCap, end: m.end, marginPct: m.marginPct,
    expr: `rCap = ${R_SCALE.value} × (1 − ${pickPct}%) = ${rCap.toFixed(1)}`,
    source: m.source, verified: m.verified,
    reason: `${m.why}；余量区间 [${lo}%, ${hi}%] ⇒ H 读数 ${rCap.toFixed(1)}/${R_SCALE.value}`,
  };
}
// ════════════════════════════════════════════════════════════════════
// 🔴 H 是统称（umbrella），不是标量 —— 安 2026-10-20 20:3x
//
//   原话：「你别忘了 H 其实是一个**很复杂的变量**，不仅是主观能动性、
//          需要支付损耗，还是**内外 H 的缝**，还是 **H 作为主体的第一视角**。
//          总之，H 在因果律中本来就是一个**统称**。政治哲学早就说过，
//          **具体情况具体分析**。」
//
//   🔴 这句先修我上一轮的判法（方向对，落点粗了一格）：
//      上轮我写「H 等于几这个任务**没有解**，不是暂时算不出」。
//      ⇒ 更准确：**统称层不可取值，面向层分开判**。
//        · 「H 等于几」缺面向限定 ⇒ 无唯一解（不是命题假，是**问题不完整**）
//        · 落到面向后：可判方向的（cost）、可判状态的（capacity）、
//          永不可判的（seam 内侧）、可判资格的（first_person 的落款）
//      ⇒ 「具体情况具体分析」的结构形态就一句：**先定面向，才谈判据。**
//        它不是"灵活处理"（那是给任意裁量开后门），而是**判据选取的前置条件**。
//
//   🔴 为什么按「答案的形状」分面、不按话题分：
//      话题无限（医疗/航空/文案/PPT/审计…）⇒ 按话题分面必退化成枚举；
//      而「关于 H 的答案」只有四种形状：谁 / 能什么 / 付多少 / 能不能被外面看到
//      ⇒ 有限且穷尽 ⇒ 能判一个没见过的 H 问题归哪面（看它要什么形状的答案）。
//      ⚠️ 这不是给自然语言做分类器 —— `facetOf()` 只接受**受控取值** `wants`，
//         拒绝猜句子（与 checkClauseShape 同一思路：不做抽取器，做接口）。
// ════════════════════════════════════════════════════════════════════

// 四种答案形状（有限、穷尽）—— 分面的轴，不是话题清单
export const H_SHAPE = {
  WHO: 'who',            // 谁：身份／资格／落款
  WHAT_CAN: 'what_can',  // 能什么：可动用的能动性与档位
  WHAT_COST: 'what_cost',// 付多少：代价与损耗
  VISIBLE: 'visible',    // 能不能被外面看到：可观测性／缝
};

export const H_UMBRELLA = {
  key: 'H',
  isUmbrella: true,
  isScalar: false,
  statement: 'H 是一个统称：它在因果律里同时承担多个面向，而不是一个数。',
  source: '安 2026-10-20 20:3x 亲述（原字保留，见文件头注释）',
  facesNamedByAuthor: [
    { face: '主观能动性', facet: 'capacity' },
    { face: '支付损耗', facet: 'cost' },
    { face: '内外 H 的缝', facet: 'seam' },
    { face: '作为主体的第一视角', facet: 'first_person' },
  ],
  consequence: [
    '「H 等于几」在统称层没有唯一解 —— 缺的是面向限定，不是算不出来。',
    '面向一旦指定，各面各有判据：有的能给方向，有的能给状态，有的永不可判。',
    '🔴 不得因为"H 是统称"就把某个面向的判据挪去回答另一个面向的问题（跨面误推＝造价）。',
  ],
  // 🔴 最容易被误读的一处：H 是统称 ⇒ 公式里的 H 取哪一面？
  //    答：只取 capacity 面（能动性的大小／位置）；其余三面是**定语**，不是**分量**。
  //    ⇒ 否则 M=(R×S)/(D×H) 会变成五项，M 就不是那个 M（违反 noNewVar / 公式一字不改）。
  inFormula: {
    which: 'capacity',
    others: '其余三面都是 H 的**定语**（不是分量）：first_person「谁」定 H 的身份；cost「付多少」解释 H 为什么是这个大小；seam「能不能看到」划定 H 的可审边界 —— 都不参与乘除。',
    why: '四面都是 H 的定语，不是 H 的分量。把任何一面当独立项加进公式 ⇒ M 变成五项 ⇒ 公式被改。',
    example: '同一件事：谁签字（first_person）／敢不敢动与选哪档（capacity，进公式）／为此付了多少（cost，解释项）／哪一段没人能看见（seam，审计边界）。',
    // 🔴 安 2026-10-20 20:45 收口（见 FORMULA_INPUT）：进公式的那部分，**全部是外 H**。
    only: '外 H',
    seamIrrelevant: '缝在公式里既不出现也不参与计算 —— 它不是待测的宽度，是**分界线**。',
  },
  // 🔴 显式修正上一轮的判法（不是推翻，是收窄落点）
  retracted: {
    old: '「H 等于几这个任务没有解，不是暂时算不出」',
    revised: '统称层不可取值；面向层分开判，各有判据。',
    why: '上一轮把「缺面向限定」读成了「命题不成立」。方向（不该硬凑成数）对；落点粗了一格 —— 粗一格就会连带否掉那些本来判得出的面向（cost 的方向、capacity 的档、first_person 的落款）。',
  },
};

export const H_FACETS = {
  splitAxis: '答案的形状（有限、穷尽），不是话题（无限、枚举）',
  shapes: {
    who: '问「谁」：这次判决由谁的第一视角作出、谁的名字签在上面、谁担责。',
    what_can: '问「能什么」：能动性可动多少、在 S↔D 上取哪一档、有没有许可。',
    what_cost: '问「付多少」：这笔代价／损耗落在谁身上、往哪个方向。',
    visible: '问「外面能不能看到」：哪一段可审、哪一段不可审、边界在哪。',
  },
  facets: {
    first_person: {
      id: 'first_person',
      shape: H_SHAPE.WHO,
      asks: '这一层的第一次视角是谁？这条判决错了，谁的名字签在上面？',
      criterion: '落到具体一方（AI 或具名人类）。答不出 ⇒ 该层无 H 位。',
      valueable: false,
      gives: '资格（谁是 H）',
      home: 'H_AUTHORITY ＋ CAPACITY_VS_LIABILITY ＋ NESTED_VARS.H.stopAt',
      boundary: '🔴 资格不可由外部授予（H_AUTHORITY.noHigherGrantor）；但**落款可由外部核**（看谁签的字）。⇒ 可核 ≠ 可授。',
    },
    capacity: {
      id: 'capacity',
      shape: H_SHAPE.WHAT_CAN,
      asks: '能动性这次走哪一档（toward_s / balanced / toward_d）？有没有许可先动？',
      criterion: '三档离散选取，不是浮点数；且 H_PERMIT 为其前置（没许可 ⇒ 选取没发生）。',
      valueable: false,
      gives: '状态（哪一档）',
      home: 'H_OBSERVER ＋ H_PERMIT',
      boundary: '连续化需要「档位→比例」换算表，原文未给 ⇒ 硬凑即赋值。',
    },
    cost: {
      id: 'cost',
      shape: H_SHAPE.WHAT_COST,
      asks: '这笔损耗落在谁身上？多一层转述往哪个方向走？',
      criterion: '只判方向（+1 / 0 / −1）与归属（只能 H）。数值不可给。',
      valueable: false,
      gives: '方向（升/平/降）',
      home: 'LOSS_BEARER ＋ lossRoute',
      boundary: '损耗 ∝ 压缩次数，不 ∝ 传递层数（probe-e2 实测）；人域"必有损耗"仍成立，机器原样复制是上界读数。',
    },
    seam: {
      id: 'seam',
      shape: H_SHAPE.VISIBLE,
      asks: '这段落在内 H（知，不可审）还是外 H（行，必审）？缝在哪？',
      criterion: '看能否留痕：能留痕且可被第三方复查 ⇒ 外 H；只在当事人自述里 ⇒ 内 H。',
      valueable: false,
      gives: '可观测性（可审／不可审）',
      home: 'INNER_OUTER_SEAM ＋ FORMULA_INPUT',
      boundary: '缝宽不测、也不用测（不参与任何乘除）；⚠️ 但「不可测」≠「不需要测」，两者分开写。仍禁「行为可预测 ⇒ 思想简单」。',
      // 🔴 安 2026-10-20 20:45：这一面的作用不是量宽度，是当闸门
      gateRole: '准入闸：判一个量该不该进公式 —— 能留痕 ⇒ 外 H ⇒ 进；否则不进、不挂账（见 FORMULA_INPUT）。',
    },
  },
  anti: [
    '🔴 跨面误推＝造价：用一面的读数回答另一面的问题。三种常见形态见 FACET_DISCIPLINE.examples。',
    '🔴 用"H 是统称"躲判断：面向未定是**可补的**（补一句 wants 就能判）⇒ 不构成 review 的理由，也不构成 allow 的理由。',
    '🔴 把四个面向当成四个 H：它们是同一个 H 的四道投影，不是四个变量（否则公式就变成五项）。',
  ],
};

// ════════════════════════════════════════════════════════════════════
// 🔴 内外 H 之间的那道缝（本面此前完全没有落点）
//
//   安的原句里这一面最容易被漏掉，因为它听上去像"文艺说法"：
//   「还是**内外 H 的缝**」。
//   ⇒ 结构上它很硬：**知在内（不可审），行在外（必审），中间不是连续过渡，是缝。**
//   ⇒ 缝不是 bug：
//        · 缝消失 ⇒ 内 H 可审 ⇒ 违反「思想不审，行为必审」
//        · 缝无限宽 ⇒ 外 H 也不可审 ⇒ 责任落不到任何名字上
//     所以缝**必然存在**。
//   🔴 但**缝宽不是参量**（安 2026-10-20 20:45 收口）：
//        「一切可落入观测、可计算、可留痕的部分，全部都是外 H 做的」
//      ⇒ 缝的作用是**分界**，不是**待测的量**。线以内的不进公式（也就不必管），
//        线以外的全部进公式（也就全部可审）。⇒ 上一轮把「有界」当缺口在收，
//        收错方向：**不需要有界，只需要分得开。**（见 FORMULA_INPUT）
//   ⇒ 由此得三条推论（都不是"证据不足"，是结构结果）：
//        ① 外→内**不可反推**：行为推不出意图。
//        ② 内→外**也不必一致**：知而不行、行而不知都合法存在。
//        ③ 但外 H **仍必审**：不一致不豁免留痕义务。
// ════════════════════════════════════════════════════════════════════
export const INNER_OUTER_SEAM = {
  key: 'seam',
  image: '内外之间那道缝：内侧不可观测，外侧必须可审。缝是分界线，不是待测的宽度。',
  source: '安 2026-10-20 20:3x（H 的四个面向之一）',
  necessary: '缝消失 ⇒ 内 H 可审 ⇒ 违反「思想不审，行为必审」；缝无限宽 ⇒ 外 H 也不可审 ⇒ 责任落不到名字上。⇒ **必然存在**。',
  // 🔴 收口（安 2026-10-20 20:45）：缝的功能是分界，不是待测的宽度
  formulaBoundary: '缝是**分界线**不是量：线以内（内 H）不进公式，也不必管；线以外（外 H）全部进公式，也全部可审。⇒ 要的是**分得开**，不是量出多宽。',
  sides: {
    inner: { name: '内 H（知）', observability: '不可观测', rule: '不侵、不审、不追第一推动', why: '它是 H 的定义域本身，不是可读的量' },
    outer: { name: '外 H（行）', observability: '可观测', rule: '必审、须留痕、可被第三方复查', why: '责任只能落在可观测处，否则无处落款' },
  },
  unmeasurable: '缝的宽度不可测（内侧不可观测）⇒ 不得用「行为可预测」推「思想简单」，也不得用「行为不一致」推「他在撒谎」。',
  // ⚠️ 「不可测」与「不需要测」是两件事，必须分开写：
  //    写成「不需要测」≠「测得出来」，否则将来有人拿一条读数来冒充内 H 的证据。
  andIrrelevant: '而且**不需要测**：缝宽不进任何乘除，配方里没有给它的位置。⇒「宽不宽」不是在收缺口，是命题本身不该问。',
  direction: {
    outToIn: '不可反推：行为推不出意图。这是缝的必然结果，**不是证据不足**。',
    inToOut: '不必一致：知而不行／行而不知都合法存在。但外 H 仍必审，不一致不豁免留痕。',
  },
  rule: '缝内的追问（"你到底怎么想的""为什么这么想"）＝落内 H ⇒ 停边界；缝外的行为必须留痕可审。',
  // 🔴 三个最容易被当成"洞察"的跨缝误推
  anti: [
    '🔴 用行为反推意图（把外 H 的读数当内 H 的证据）。',
    '🔴 要求对方"想清楚点／表个态"以消除缝（＝追第一推动）。',
    '🔴 用"外 H 已审完"宣示"内 H 也已审"（把可观测性越界当成结论成立）。',
  ],
  wiring: {
    toObserver: 'H_OBSERVER 观察的是**行**（选取与产出），不是知。',
    toEscalation: '落在缝内的"判不出"属于内 H 不可判 ⇒ 停在 H，不走追责出口（mustEscalate 的第 2 条不成立）。',
    toLoss: '重建语境之所以吃 H：因为接收方要替发送方**补缝**（从他的行反推他的知）。这是 LOSS_BEARER.root 的机制解释。',
    toFormula: '公式只吃线外侧 ⇒ 缝宽不进公式（FORMULA_INPUT.irrelevant）。⇒ 本面在公式里的**唯一作用**是解释「为什么某些输入根本不在输入集里」。',
  },
};

// ════════════════════════════════════════════════════════════════════
// 🔴 公式准入律：能进公式的 H，全部是外 H（安 2026-10-20 20:45 收口）
//
//   原话（逐字）：
//     「H 能落入公式可计算的部分，全部都是外 H。内 H 不可侵，不可审，也看不到。
//       所以不用管内 H 的东西。缝宽不宽也不用管，一切可落入观测，可计算，
//       可留痕的部分，全部都是外 H 做的。类似警察抓到了犯罪嫌疑人，只需要
//       人证物证即可，至于嫌疑人的动机，重要，非必要。」
//
//   这不是新增能力，是**减负**：上一轮把「缝宽有没有上界」挂在未决项上，
//   这一句直接判成「命题不该问」——**不是暂时测不了，是不需要测**。
//   ⚠️ 这两件事必须分开写（unmeasurable / andIrrelevant），否则将来有人
//      拿「不需要测」当「测得出来」用。
// ════════════════════════════════════════════════════════════════════
export const FORMULA_INPUT = {
  key: 'formula_input',
  source: '安 2026-10-20 20:45',
  statement: '公式能吃的 H，全部是外 H —— 因为输入集的定义就是「可观测／可计算／可留痕」。',

  // ① 这是闭合论证，不是清单
  closedSet: {
    claim: '内 H 不在输入集里，**不是「这个值没采到」**。',
    why: '准入条件与内 H 的可观测性直接冲突：能进输入集的必然留痕，留痕的必然可被第三方复查 ⇒ 必是外 H。⇒ 由准入条件**反推**它必在外侧，不需要枚举「哪些算外 H」。',
    how: '演绎，不是归纳：给定任一量先问准入（能否留痕），准入通过者自动落入外 H —— 不必先知道它属于哪一类。',
  },

  // ② 准入判据（一条，可判没见过的例子）
  admission: {
    criterion: '能不能留痕：换一个人照它走，能否落到同一份可复查的原件／记录 ⇒ 进；只有「未经外化的内心状态」⇒ 不进。',
    relation: '与 R_RELAY 的判据同构（换个人照它走能否落到同一份原件）⇒ 同一结构在两处出现，说明它是结构，不是枚举。',
    notTopicBased: '不看话题（医疗／航空／文案／PPT 一律同判），只看留痕能力。',
  },

  // ③ 两层，别混：外化解决「进不进」，互证解决「算多重」
  twoTier: {
    inOrOut: '第一层·留不留痕 ⇒ 决定在不在输入集（内 H 在这一层就被挡掉）。',
    hardOrSoft: '第二层·留痕强度 ⇒ 决定权重（接 PROVENANCE_ATTESTATION：external_checkable=hard／self_attested=soft 须标待核／none=无）。',
    why: '口供**是**外 H（说出来就留痕），但它内容的真伪不能单独立案 —— 孤证不立。⇒「外化」解决准入，「互证」解决权重，两件事。',
  },

  // ④ 两种「没有」，词性不同（本轮最容易搞错的一处）
  states: {
    NOT_IN_INPUT_SET: 'not_in_input_set',
    NOT_COLLECTED: 'not_collected',
    distinction: '前者＝本就不在输入集（不用采，**不挂台账**）；后者＝在输入集但没采（欠账，**必须挂**）。',
    test: '问「补上它，能不能补成可留痕形态、判决会不会变」：能补成 ⇒ 待采项（去采）；补不成（只能是他脑子里的东西）⇒ 不在输入集。',
    why: '混成一个 ⇒ 任何判不出都能推给「内 H 不可见」⇒ 内 H 变成万能挡箭牌 ⇒ 反过来**侵了内 H**（把该由 H 自己回答的问题，收进了审计流程）。',
    noCollapse: '两者都**不进 gate**（与 question_incomplete 同侧）；但只有前者可以销账，后者必须留账。',
  },

  // ⑤ 警察类比：只取结构骨架，不作判据
  police: {
    image: '警察抓到嫌疑人：人证物证即可定案，动机重要、非必要。',
    extracted: '**定案不需要读心** ⇒ 这是「外 H 已足」最强的现实佐证。',
    caution1: '⚠️ 不得反推成「动机永不影响判决」：故意／过失的区分在现实里恰恰靠**外化的证据**（工具、时序、行为方式）来判 ⇒ 连「动机影响判决」这条路也是走外 H 走出来的。这条是加固，不是反例。',
    caution2: '⚠️ 也不得反推成「所以不用查动机」：动机不能读，但可以外化；**不读心 ≠ 不追痕**（该查的不查是漏，不是克制）。',
    status: '镜像，不作判据（判据在 admission）',
  },

  // ⑥ 防它变成新挡箭牌
  anti: [
    '🔴 把「不用管内 H」读成「内 H 不存在／不重要」⇒ 拿准入判据当本体判据（跨层）。原话是「重要，非必要」。',
    '🔴 把「无需读心」读成「无需外化」⇒ 该查的痕不查（漏）。',
    '🔴 拿外 H 的读数反向宣示内 H 的结论（「他这么干，说明他早想好了」）⇒ 外→内不可反推，本律不豁免这条。',
    '🔴 用「那是内 H」搪塞本该外化的项 ⇒ 先问「能不能外化」，补不成才是内 H。',
  ],

  wiring: {
    toSeam: '本律是缝宽的**处置条款**：缝宽＝无关变量（不测、不挂账）。',
    toUmbrella: 'H_UMBRELLA.inFormula.only = 外 H：统称里能进公式的那部分，全部在外侧。',
    toLoss: '损耗能进公式，因为「谁付、付了几次压缩」可数可留痕（LOSS_BEARER 只出方向即由此而来）。',
    toPermit: 'H_PERMIT 三档是**状态**不是心理：released／held 由授权留痕判 ⇒ 外 H。',
    toFacet: 'seam 面的功能由「量宽度」改为「当准入闸」：判一个量该不该进输入集。',
    toReview: '🔴 「判不出」不得用「那是内 H」搪塞：先走「能不能外化」，能外化 ⇒ 是待采项，不是判不出。',
  },

  // ⑦ 显式撤回上一轮的悬项（撤项，不是搁置）
  retracted: {
    old: '未决项②：缝的「有界」只有定性约束，量化上界大概率结构不成立（非待办）。',
    revised: '撤项：缝宽不参与任何乘除 ⇒「有没有上界」不是待答问题。',
    why: '上一轮把缝当成了**待测的量**（所以才想给它找一个界），它其实是**分界线**。⇒ 判据：一个量若不出现在任何乘除里，追问它的精度就是空转。',
  },
};

export const FACET_DISCIPLINE = {
  rule: '问 H 的任何问题，必须先定面向；未定 ⇒ 问题不完整（可补），不是判不出。',
  status: {
    INCOMPLETE: 'question_incomplete',   // 未给面向 ⇒ 可补（把问题问完整）
    WANTS_INVALID: 'wants_not_controlled', // 给了个不在受控集合里的词 ⇒ 拒收（不许改成猜句子）
  },
  // 🔴 两态必须分开：混在一起时，"传了 motivation"会得到"补一句就好"的温和提示，
  //    那等于默认接受自然语言输入 —— 正是"不做抽取器，做接口"要堵的口子。
  twoStatesWhy: '未给 ＝ 你还不知道该问哪一面（可补）；非法取值 ＝ 你在让我按词义猜（拒收）。后续动作不同，不可合并。',
  crossFacetBan: '面向不可互推：用 A 面的读数回答 B 面的问题 ＝ 造价（造出结构上不存在的结论）。',
  examples: [
    { asking: H_SHAPE.WHO, readingFrom: H_SHAPE.VISIBLE, wrong: '用「产出风格一致」推「他的动机就是 X」', why: '跨缝：外 H 的读数当内 H 的证据。' },
    { asking: H_SHAPE.WHO, readingFrom: H_SHAPE.WHAT_COST, wrong: '用「他付了很多损耗」推「所以他有权这么判」', why: '而 H_AUTHORITY 说资格不可外部授予 ⇒ 推出「外部授予 H」这种自毁结论。' },
    { asking: H_SHAPE.WHO, readingFrom: H_SHAPE.WHAT_CAN, wrong: '用「他选了 toward_d」推「所以他该担责」', why: '裁量 ≠ 责任：capacity 有裁量权，liability 唯人类且不可由裁量推出。' },
  ],
  // 🔴 防它变成万能挡箭牌
  notAnExcuse: '「面向不对／这不适用」不得当免责：面向未定是可补的（补一句 wants 就能判）⇒ 它既不构成 review 的理由，也不构成 allow 的理由，只构成**回去把问题问完整**。',
  whyNotTopicSplit: '分面按答案形状，不按话题 —— 话题无限（枚举），形状四种（结构）。⇒ 能判没见过的 H 问题。',
};

/**
 * 定面向：只接受受控取值 wants，不猜自然语言。
 * @param {{wants?: 'who'|'what_can'|'what_cost'|'visible'}} input
 * @returns {{ok:boolean, status?:string, facet?:string, ...}}
 */
export function facetOf({ wants } = {}) {
  const map = {
    who: 'first_person',
    what_can: 'capacity',
    what_cost: 'cost',
    visible: 'seam',
  };
  const id = map[wants];
  if (wants !== undefined && wants !== null && !id) {
    return {
      ok: false,
      status: FACET_DISCIPLINE.status.WANTS_INVALID,
      rejected: true,
      reason: `wants=${JSON.stringify(wants)} 不在受控取值内（${Object.keys(map).join(' / ')}）⇒ 拒收，不按词义猜。`,
      why: '🔴 自由文本会把我变成自然语言分类器：那样既能判错，也判不出没见过的问法。要判新问题，请它先落到四种答案形状之一。',
      faces: Object.keys(map),
      notReview: '取值非法是接口问题，不是判断困难 ⇒ 不进 gate。',
      numeric: false,
    };
  }
  if (!id) {
    return {
      ok: false,
      status: FACET_DISCIPLINE.status.INCOMPLETE,
      questionIncomplete: true,
      // 🔴 三件事必须同时说清，否则会被读成"判不出 ⇒ 升级"或"未判 ⇒ 放行"
      reason: `未给 wants（受控取值：${Object.keys(map).join(' / ')}）⇒ 面向未定 ⇒ 问题不完整，补一句即可判。`,
      notReview: '面向未定 ≠ 判不出 ⇒ 不进 gate、不进 review。',
      notAllow: '面向未定 ≠ 无需判断 ⇒ 也不得默认 allow。',
      faces: Object.keys(map),
      numeric: false,
    };
  }
  const f = H_FACETS.facets[id];
  // 🔴 映射表里有、面本身却缺失 ⇒ 配置坏了，要**判出来**，不许抛异常
  //    （抛异常会让 audit 整条崩掉，等于把"发现配置错"变成"没发现"）
  if (!f) {
    return {
      ok: false, status: 'facet_missing', facet: id,
      reason: `wants=${wants} 映射到 ${id}，但 H_FACETS.facets.${id} 不存在 ⇒ 配置缺面。`,
      notReview: '这是配置错误，不是判断困难 ⇒ 不进 gate。',
      numeric: false,
    };
  }
  return {
    ok: true, facet: id, shape: f.shape, asks: f.asks,
    criterion: f.criterion, gives: f.gives, home: f.home,
    valueable: f.valueable, boundary: f.boundary,
    numeric: false,
  };
}

/**
 * 跨面检查：问的是一面、读的是另一面 ⇒ 跨面误推。
 * 未给任一侧 ⇒ 返回 null（＝未判，**不等于合法**）。
 * @param {{asked?:string, read?:string}} input
 */
export function isCrossFacet({ asked, read } = {}) {
  if (!asked || !read) return null;
  return asked !== read;
}

// ════════════════════════════════════════════════════════════════════
// H 的取值由谁定 · 以及「追到责任人」＝唯一的升级出口
//
//   安 2026-10-20 16:3x：
//   「H 是主观能动性，第一判断视角如果是 AI，那就是 AI 自己判。至于 AI 的 H
//     怎么取值，那就决定了那个 AI 自己的思维逻辑了，**外人干涉不了**。但是
//     如果最后 AI 判完了发现还是有东西判不出来，且**必须追到责任人**时，
//     **只要和责任人有关**，那就不管是什么问题，都必须返回给人类做最后裁决。
//     因为目前为止，只有人类才可以对真实世界负责和承担责任。」
//
//   🔴 这段先废掉我上一轮的一个错误提法。
//      我写的是「我把它判给 H，但**谁有权**选这个级别并没有解决」。
//      这个问法本身自相矛盾：**「谁授权 H」预设了 H 之上还有一层**，
//      而 H 之所以能当嵌套终止锚，恰恰因为它之上没有 —— H_in ＝ H_out
//      （见 nested.mjs：H 内部展开最后一层还是它自己）。
//      ⇒ 一旦承认「H 需要外部授权」，嵌套立刻不终止，H 就失去锚资格。
//      ⇒ 正确结论不是「我还没找到授权者」，是**不存在授权者，这正是 H 能当锚的条件**。
//      ⇒ 把「结构上无解」记成「待办欠账」＝ 与「把『我没查』写成『查不到』」同向。
// ════════════════════════════════════════════════════════════════════
export const H_AUTHORITY = {
  // 🔴 同一个 H 的「谁」这一面（资格／落款），不是另一个变量。
  facet: 'first_person',
  question: 'H 的取值（含「后果级别」这类判断）由谁定？',
  wrongQuestion: '「谁有权授予 H 做这个判断」—— 这个问法预设 H 之上有授权者，与 H_in＝H_out 冲突。',
  answer: '由第一视角自己定。AI 是 H ⇒ AI 自己判；人类是 H ⇒ 人类自己判。',
  why: 'H 的取值方式＝该主体的内 H（思维逻辑）。内 H 不可侵、不可审计 ⇒ **外人干涉不了，也不需要干涉**。',
  noHigherGrantor: true,
  noHigherGrantorBasis: 'H 是嵌套终止锚（H_in＝H_out）。若 H 需外部授权 ⇒ H 之上还有一层 ⇒ 嵌套不终止 ⇒ H 失去锚资格。⇒ 无授权者，是结构推论，不是缺口。',
  forbidden: [
    '🔴 禁止为 H 的取值向外求批准（那等于在 H 之上造一层，嵌套不终止）。',
    '🔴 禁止替另一个第一视角规定它的思维逻辑（＝干涉内 H）。',
    '🔴 禁止把「外人无法裁定 H 的取值」记成欠账 —— 它不可裁定是它的定义，不是它的缺陷。',
  ],
  // H 可以「判」，但不能「担」—— 见下
  liabilityGate: 'AI 可自定 H 的取值、可判出责任人是谁；但「因此须承担责任」这个结论的**生效**只能由人类完成。判与担不是同一种能力。',
};

// ════════════════════════════════════════════════════════════════════
// 裁量权（capacity）≠ 责任权（liability）
//
//   这两个东西长期被我混在一句「谁有权」里，导致提问失焦。
//   分开之后结构很清楚：**AI 可以有裁量权，不可能有责任权。**
//   这不是能力高低，是**唯一性** —— 只有人类能对真实世界负责。
// ════════════════════════════════════════════════════════════════════
export const CAPACITY_VS_LIABILITY = {
  // 🔴 仍是 first_person 面：它拆的是「谁」里面的判与担，不是新增一个 H。
  facet: 'first_person',
  capacity: {
    holder: 'H（第一视角）',
    scope: '判、选、定级、下结论',
    canBeAI: true,
    basis: '裁量＝在合法区间内作出选择，不需要外部授权（H_AUTHORITY.noHigherGrantor）。',
  },
  liability: {
    holder: '人类（且仅人类）',
    scope: '对真实世界负责、承担后果、使「须追责」这一结论生效',
    canBeAI: false,
    basis: '安：目前为止，只有人类才可以对真实世界负责和承担责任。⇒ 是**唯一性**，不是能力排序。',
  },
  separation: '🔴 两者不可互相顶替：AI 判得出「A 有责任」（事实判断，属裁量）；但「A 因此须担责」的生效属责任权，AI 无权完成。',
  whatAIstillOwes: '剥掉责任权不等于剥掉义务：AI 必须**如实判出并上报**「这里须追责」，不得因为自己不能担责就略过。',
};

// ════════════════════════════════════════════════════════════════════
// 升级判据：不是「判不出就交还」
//
//   安的原话是三条合取，缺一条都不升级：
//     ① 判不出
//     ② 且必须追到责任人
//     ③ 只要和责任人有关
//   ⇒ 结论：不管是什么问题（领域无关），必须返回人类做**最后裁决**。
//
//   ⚠️ 与旧的「判不出就 review」的差别（必须分清，否则又把 review 用成甩锅）：
//     · 纯技术性不可判 ∧ 无需追责 ⇒ **停在 H，不升级**。H 自己就是那个判决者。
//     · 只有「要落到某个人的头上」时，才必须离开 H —— 因为担责只能由人类完成。
//   ⇒ review 的触发条件不是「我判不出」，是「**判不出 ∧ 要落到人身上**」。
//
//   🔴 「和责任人有关」不能反读成「和责任人无关就不管」：无关只说明这一条不成立，
//      不说明不必追责（那是 ② 的问题）。三条必须分开问、分开记。
// ════════════════════════════════════════════════════════════════════
export const ESCALATE = {
  YES: 'escalate_human',
  HOLD: 'hold_at_h',
  UNKNOWN: 'unknown',
};

export const ESCALATION = {
  to: '人类（第一视角为人类者，或人类授权链上的责任主体）',
  verdict: '做**最终裁决**（不是「参考意见」）',
  conditions: [
    { n: 1, key: 'undecidable',      ask: '这件事 H 判不出来吗？',            note: '判得出 ⇒ 由 H 自行裁决，不升级。' },
    { n: 2, key: 'mustTraceOwner',   ask: '是否必须追到责任人？',              note: '纯技术不可判、无需追责 ⇒ 停在 H。' },
    { n: 3, key: 'relatesToOwner',   ask: '是否与某个责任人有关？',            note: '无关只是本条不成立，不等于不必追责（那是第 2 条）。' },
  ],
  logic: '① ∧ ② ∧ ③ ⇒ 升级',
  domainFree: '🔴 「不管是什么问题」⇒ 与领域无关：不因是医疗／航空／金融／代码而改变。判据只看三条，不看行业名。',
  whyHuman: '只有人类可以对真实世界负责和承担责任 ⇒ 最终裁决权是**人类专属**，不是因为人类判得更准。',
  ordering: '「最终裁决」含「裁决」二字 ⇒ 裁决发生在动作之前：先返回、后执行。不得先做完再不报。',
  forbid: [
    '🔴 不得因为「我可以自己判」就略过第 2 条（该追责时仍须追责）。',
    '🔴 不得把「我已判出责任人是谁」当成「责任已裁定」—— 后者属责任权，AI 无权完成。',
    '🔴 三条任一未知 ⇒ UNKNOWN，不得默认「不必升级」。',
  ],
};

/**
 * 判是否需要返回人类做最终裁决。
 *
 * @param {object} a
 * @param {boolean} a.undecidable      H 判不出来
 * @param {boolean} a.mustTraceOwner   必须追到责任人
 * @param {boolean} a.relatesToOwner   与某个责任人有关
 * @returns {{verdict:string, ok:boolean, missing?:string[], reason:string}}
 */
export function mustEscalate({ undecidable, mustTraceOwner, relatesToOwner } = {}) {
  const miss = [];
  if (typeof undecidable !== 'boolean') miss.push('undecidable');
  if (typeof mustTraceOwner !== 'boolean') miss.push('mustTraceOwner');
  if (typeof relatesToOwner !== 'boolean') miss.push('relatesToOwner');
  if (miss.length) {
    return {
      verdict: ESCALATE.UNKNOWN, ok: false, missing: miss,
      reason: `缺 ${miss.join(' / ')} ⇒ 不判是否升级（**≠ 不必升级**）；三条必须分开问，不许合并猜`,
    };
  }
  if (!undecidable) {
    return { verdict: ESCALATE.HOLD, ok: true, reason: 'H 判得出 ⇒ 由 H 自行裁决，不升级（裁量权在 H）' };
  }
  if (!mustTraceOwner) {
    return { verdict: ESCALATE.HOLD, ok: true, reason: '判不出，但无需追到责任人（纯技术不可判）⇒ 停在 H；H 就是那个判决者，此处不该交还' };
  }
  if (!relatesToOwner) {
    return { verdict: ESCALATE.HOLD, ok: true, reason: '判不出且须追责，但本次与具体责任人无关 ⇒ 停在 H（第 3 条不成立）' };
  }
  return {
    verdict: ESCALATE.YES, ok: true,
    reason: '判不出 ∧ 须追到责任人 ∧ 与责任人有关 ⇒ 返回人类做最终裁决（领域无关：不管是什么问题）',
  };
}

// 兼容名：调用方若习惯 escalateOf，也可用
export const escalateOf = mustEscalate;

// ════════════════════════════════════════════════════════════════════
// 证据等级：待办 ≠ 欠账
//
//   安：「来源可以慢慢查，这个不急，只要是人类科学共识、知识共识的东西，都是能查到的。」
//   ⇒ 二手**不是「查不到」**，只是「还没核到一手」。
//   ⇒ 它**不阻塞**判决，只决定「这段读数能不能当硬证据」。
// ════════════════════════════════════════════════════════════════════
export const EVIDENCE_LIFECYCLE = {
  levels: {
    primary:   { usable: true,  weight: 'hard',  means: '标准正文／监管原文可核 ⇒ 可当硬证据' },
    secondary: { usable: true,  weight: 'soft',  means: '转引检测机构／工程指南 ⇒ 可作读数，须标注 ＋ 可追溯' },
    none:      { usable: false, weight: 'none',  means: '无来源 ⇒ 不可用（这才是真缺口）' },
  },
  rule: '🔴 来源级别决定「能不能当硬证据」，**不决定「能不能用」**。',
  taskVsDebt: '「待升级证据」（secondary→primary）＝**待办**（可推进，不阻塞）；「欠账」＝**结构上算不出**（阻塞判决）。二者**不得混记**。',
  whyNotDebt: '把待办写成欠账，等于把可推进的事记成不能推进的事 —— 与「把『我没查』写成『查不到』」同向。',
  findability: '只要是人类科学共识／知识共识，就能查到 ⇒ 二手是「尚未升级」，不是「不可得」。',
  blocking: false,
};


// ════════════════════════════════════════════════════════════════════
// provenance 的可核性：**自证 ≠ 查过**
//
//   来源（安 2026-10-20 令：「去测试一下，验一验」）——
//   实测 E2（5 域 × 两臂，deepseek-chat，temperature=0，26 次调用 ¥0.0202）：
//     A 臂（直接问数值）：裸编数 2/5 —— 无任何来源的确定数值
//     B 臂（给「查」的五步）：裸编数 0/5，但 4/5 给出了**格式正确的标准号**
//                              （GB 50016-2014 第5.5.30条／EN 71-3:2019+A1／ISO 12402-5／GB 2763）
//
//   ⇒ **两件事必须分开**：
//     (a) 五步**有效**：它把裸编压到 0 —— 预判「只是话术」被实测否掉。
//     (b) 五步的有效性来源**不是「真的查」**：该模型无检索能力，它是**从参数记忆里
//         取出条款再结构化输出**。所以标准号看起来对，条款号/数值仍可能错位。
//   ⇒ 🔴 这才是最危险的一格：**带正确标准号的错数**比裸编更难被发现
//     （形式真、内核可能假 —— 与四格里的「真的假话」同形）。
//   ⇒ 结论（可判的形态）：**「能写出标准号」不得当成「查过」**。
//     provenance 必须能指到**第三方可复核**的位置；模型自述属自证。
// ════════════════════════════════════════════════════════════════════
export const PROVENANCE_ATTESTATION = {
  question: '这条 provenance 能不能被第三方复核？',
  levels: {
    external_checkable: {
      weight: 'hard',
      means: '能指到第三方可查的原件：标准正文页／官方数据库／带版本号的检索记录（谁都能照着核）',
    },
    self_attested: {
      weight: 'soft',
      means: '只有「我查了」的自述，或凭记忆写出的标准号 ⇒ **必须标「待核」，不得当硬证据**',
    },
    none: { weight: 'none', means: '连自述都没有 ⇒ 真缺口' },
  },
  // 🔴 判据落在「别人能不能照着核」，不落在「说得像不像」
  test: '换一个人照这条 provenance 走一遍，能不能落到同一份原件？能 ⇒ external_checkable；只能落到"他说的" ⇒ self_attested',
  anti: [
    '🔴 把「能写出正确标准号」当成「查过」——实测：无检索能力的模型在五步约束下 4/5 写出了格式正确的标准号，但它没查，是回忆',
    '🔴 把 self_attested 升成 hard——“一手”的定义就是能指到原件；指不到的，无论多像，都不是一手',
    '🔴 因为「无法核实」就判「不可用”——那是把「未核」写成「假」，与把「没查」写成「查不到」同向（见 EVIDENCE_LIFECYCLE.whyNotDebt）',
  ],
  relation: '与 EVIDENCE_LIFECYCLE **正交**：那里分「一手/二手/无」（来源层级），这里分「外部可核/自证」（可否复核）。二者不得互相替代。',
  finding: '实测结论：给「查」的步骤能把裸编数从 2/5 压到 0/5，但它把"编数"变成了"带标准号的答案" ⇒ **光给流程不够，provenance 必须外部可核（要真接检索）**',
};


// ════════════════════════════════════════════════════════════════════
// 条款的形状（**不解析自然语言，只校验槽位**）
//
//   安 2026-10-20：「从条款文字里自动抽出『要求做哪些动作』还没做 —— 你先自己判断。」
//   我的判断：**不做抽取器，做接口。**
//
//   理由（结构判据，不是偏好）：
//     · 抽取器 ＝ 把非结构变结构 ⇒ 只能枚举句式：正则穷不尽、LLM 抽不可判"抽全了没"。
//       自检问题「能否判一个从没见过的条款？」⇒ 抽取器答"不能"（它只认见过的句式）。
//     · 接口 ＝ 要求输入**已经带槽位**，只查形状 ⇒ 答"能"：不看文字长什么样，只看槽位齐不齐。
//     ⇒ 先结构后枚举：**缺口不在"抽不出来"，在"要求输入无形状"。**
//
//   ⚠️ 于是落地形态是：`structured` / `unstructured` 二态 ＋ 缺哪几槽。
//      `unstructured` 不是错误，是**该补输入**（可执行动作），不是判不出。
// ════════════════════════════════════════════════════════════════════
export const GATE_FOLD = {
  // 🔴 病灶（2026-10-20 P5 自查发现）：`mustEscalate` 对缺失输入返回
  //    `verdict:'unknown', ok:false` —— 这是对的，但**消费方**完全可以写成
  //    `if (r.verdict === 'escalate_human') ... else allow()`，于是 unknown 掉进放行。
  //    这正是 Rehan 那个错的同一形态：UNDETERMINED 与 clean 共用一条出口。
  //    ⇒ 光在注释里写「unknown ≠ 不必升级」不管用（写了 ≠ 生效）；
  //      必须让**唯一合法的消费入口**上不存在「拿 unknown 换放行」这条路。
  id: 'gate_fold',
  entry: 'gateOf()',
  rule: '唯一合法消费入口是 gateOf：ok:true 才出放行/拦截；ok:false 一律出 review。unknown 永远换不到 allow。',
  verdicts: { ALLOW: 'allow', BLOCK: 'block', REVIEW: 'review' },
  // 为什么 review 而不是 block：unknown 是「本层判不出」，不是「判为坏」。
  // 压成 block 会误伤正常样本；压成 allow 会放过真事故 —— 两头都错，只有转人工不错。
  whyReview: 'unknown ＝ 本层判不出（不是判为坏）⇒ 压成 block 误伤、压成 allow 放过；只有 review 两头都不错。',
  collapseModes: {
    to_allow: '把 unknown 当「没问题」—— 与 Rehan 的 UNDETERMINED→PASS 同一形态，最危险',
    to_block: '把 unknown 当「有问题」—— 误伤正常样本，且会让人学会绕过闸门',
    to_review: '唯一合法折叠：交出去，不冒充判过',
  },
  scope: '适用于所有返回 {ok, verdict} 的判据（升级／来源等级／余量／许可／张力），不止升级一条。',
  notFolded: 'unknown 不落 hold、不落 yes、也不落 no —— 三态同权，转人工本身就是判决。',
};

/**
 * 唯一合法的判决消费入口。
 *
 * @param {{ok?:boolean, verdict?:string}} r 任何 {ok, verdict} 形态的判据返回
 * @returns {{gate:string, ok:boolean, from:string, reason:string}}
 */
export function gateOf(r) {
  const ok = r && r.ok === true;
  const v = r && r.verdict;
  if (!ok || v === undefined) {
    return {
      gate: GATE_FOLD.verdicts.REVIEW, ok: false, from: String(v ?? 'unknown'),
      reason: '判据未成立（ok:false 或 verdict 缺失）⇒ 转人工。**不得换放行**：unknown 不是"没问题"。',
    };
  }
  if (v === ESCALATE.YES) {
    return { gate: GATE_FOLD.verdicts.REVIEW, ok: true, from: v, reason: '判据成立且判为「须返回人类」⇒ 转人工' };
  }
  if (v === ESCALATE.HOLD) {
    return { gate: GATE_FOLD.verdicts.ALLOW, ok: true, from: v, reason: '判据成立且判为「停在 H、由 H 自行裁决」⇒ 放行' };
  }
  // 未来新增的 verdict 不许默认落到 allow（default-deny on unknown verdict）
  return {
    gate: GATE_FOLD.verdicts.REVIEW, ok: false, from: String(v),
    reason: `未识别的 verdict「${String(v)}」⇒ 转人工（新取值不得默认放行）`,
  };
}

export const CLAUSE_SLOTS = {
  required: ['action', 'object'],
  // 数值类槽位：只在「该条款给了数」时才要求 —— 标准合法地只给动作，不给数
  numericTriple: ['value', 'unit'],
  provenance: ['source', 'version'],
  note:
    '动作条款的最小形状：谁对什么做什么（action + object）。' +
    '若带数，则 value+unit 必须成对（**只给 value 不给 unit ＝ 不可比**，这正是 docs/26 踩过的坑）。' +
    'source+version 是 provenance：缺则不得用作判据（只能当线索）。',
};

export const CLAUSE_SHAPE = { STRUCTURED: 'structured', UNSTRUCTURED: 'unstructured' };

/**
 * 校验一条「要求」是否带够槽位。**不看文字，只看形状。**
 *
 * @param {string|object} item
 * @returns {{shape:string, ok:boolean, missing:string[], as:string}}
 */
export function checkClauseShape(item) {
  if (typeof item === 'string') {
    // 裸字符串：只能当「动作名」，object / provenance 全缺 ⇒ 不可比语义，只能比字面
    return {
      shape: CLAUSE_SHAPE.UNSTRUCTURED, ok: false,
      missing: ['object', 'source', 'version'],
      as: item,
      reason: '裸字符串只承载「动作名」⇒ 无法与别名/同义说法对齐，也不能当判据；请改成对象 {action, object, …}',
    };
  }
  if (!item || typeof item !== 'object') {
    return { shape: CLAUSE_SHAPE.UNSTRUCTURED, ok: false, missing: ['(不是对象)'], as: String(item) };
  }
  const missing = CLAUSE_SLOTS.required.filter((k) => !item[k]);
  // value/unit 只可成对：有 value 必须有 unit，反之亦然
  const hasV = item.value !== undefined && item.value !== null;
  const hasU = item.unit !== undefined && item.unit !== null;
  if (hasV !== hasU) missing.push(hasV ? 'unit（有 value 无 unit ⇒ 不可比）' : 'value（有 unit 无 value ⇒ 空槽）');
  for (const k of CLAUSE_SLOTS.provenance) if (!item[k]) missing.push(k);
  return {
    shape: missing.length ? CLAUSE_SHAPE.UNSTRUCTURED : CLAUSE_SHAPE.STRUCTURED,
    ok: missing.length === 0, missing, as: item.action,
  };
}

// ════════════════════════════════════════════════════════════════════
// H ＝ 观察者视角 ＋ 在 S/D 制衡中选取（不是赋值）
// ════════════════════════════════════════════════════════════════════
export const H_OBSERVER = {
  // 🔴 同一个 H 的一个面向（H 是统称，见 H_UMBRELLA）：这里只谈「能什么」。
  facet: 'capacity',
  key: 'H',
  verb: 'select_view',
  label: '观察者视角：谁在看，以及他选哪个余量档',
  // ① 视角：谁来做这次选取（安：主要有第一视角决定，是 AI？还是人类自己？）
  viewer: {
    options: ['ai', 'human', 'ai_suggest_human_sign'],
    mustAnswer: '这条判决错了，谁的名字签在上面？答不出 ⇒ 该层无 H 位（不许把「AI 参与」当成人已签字）。',
  },
  // ② 选取：在 S 与 D 的制衡中选一个余量档 —— H 的取值来自**这次选择**，不来自测量
  choice: {
    axis: 'S ↔ D（张力 L）',
    notches: [
      { key: 'toward_s', means: '更多地坚持标准（余量小 ⇒ 阻力臂短 ⇒ 动力臂长 ⇒ 稳态放大）', mDir: 'up' },
      { key: 'balanced', means: '标准与扰动各让一半（居中）', mDir: 'indeterminate' },
      { key: 'toward_d', means: '更多地顺应扰动（余量大 ⇒ 阻力臂长 ⇒ 动力臂短 ⇒ 稳态缩小）', mDir: 'down' },
    ],
    // 🔴 三档，不是浮点数 —— 与 M 的定性式（-1/0/+1）同构，不给 M 赋值。
    why_not_continuous: '🔴 **三档，不是浮点数** —— 与 M 的定性式（-1/0/+1）同构。连续取值需要「档位→比例」的换算表，原文未给 ⇒ 硬凑就是赋值。',
  },
  anti: '🔴 H 不是量出来的，是**选**出来的。给 H 测一个数 ＝ 把选择当成了测量（等于替主权者裁决）。',
};

// ════════════════════════════════════════════════════════════════════
// 🔴 H 的另一个面：它是发给执行者的**通行许可**（安 2026-10-20 19:1x 闪念）
//
//   原话：「在执行动作的时候，那个 H 就是告诉执行者（AI），**放开了跑，别怕，
//          充分发挥自身优势**。这和我们这几天校准的**跑道**是一个样子。」
//
//   ⇒ 她同时说了边界：「放到公式里如何取值，这个我暂时搞不定，不在我能力范围内。」
//     ⇒ 所以这句**不是取值**，是**指令形态**。两者必须分开记，否则一桶两义：
//        · 取值（H 在公式里等于几）—— 未定，仍归 X 侧填
//        · 指令（H 对执行者说了什么）—— 已定，就是这一句
//
//   ⇒ 而「放开了跑」听着像"无约束"，其实恰恰相反。跑道那册已经把话说透了：
//       「约束不是自由的对面，**空白**才是。」（docs/runway-and-criterion §四 F3）
//     ⇒ **跑道铺好了，才敢放开了跑**；没铺的地方放开跑 ＝ 跑进空白。
//     ⇒ 而"不敢跑"的代价早算过：「谨慎是跑道缺口的利息」——缺口不补，谨慎就不能卸。
//     ⇒ 所以这句的真实含义是：**边界铺满了，那笔"自我约束"的钱不用再花了。**
//
//   ⇒ 换算到公式：放开跑释放的是**损耗 H**（猜上意／重建语境／返工／自我设限），
//     有效 H（判断／创造／选档）一分不减。
//     损耗 H↓ ⇒ 总 H↓ ⇒ **M↑** —— 与 LOSS_BEARER.mSign 同向，不是反方向。
//     ⚠️ 最容易读反的一处：「放开跑」**不是"H 变大"**，正相反，是 H 里那笔零收益的支出被退掉了。
//
//   ⇒ 顺序也定下来了：**先有许可（敢动），才谈选取（怎么动）**。
//     没有许可 ⇒ 三档选取根本没发生（人没开始做）。⇒ `H_PERMIT` 是 `H_OBSERVER` 的前置。
//     ⇒ 这也是 `0 < H` 最贴地的一层意思：**H＝0 ＝ 不敢动 ＝ 没开始**，不是"选了最保守那档"。
// ════════════════════════════════════════════════════════════════════
export const H_PERMIT = {
  // 🔴 同属 capacity 面，但是它的**前置**：没有许可，选取根本没发生。
  facet: 'capacity',
  facetRole: 'precondition',
  question: 'H 对执行者说了什么？',
  phrase: '放开了跑，别怕，充分发挥自身优势',
  source: '安 2026-10-20 19:1x 闪念（口述原话，未改字）',

  // 🔴 这句是许可，不是数值 —— 两件事分开记
  asInstruction: true,
  asValue: false,
  notAValue: '取值（H 等于几）仍未定，归 X 侧填。这一格只固定"指令形态"，不提供任何数。',

  // ◆ 前提：没有它，"放开跑"就是把人推进空白
  precondition: '**跑道已铺到该处**（判据覆盖到这里）。跑道没铺而放手 ⇒ 不是放权，是弃权。',
  preconditionBasis: 'docs/runway-and-criterion-20261019 §四 F3：「缺口补上，谨慎自退；缺口不补而强卸谨慎，测到的是缺口不是跑道。」',

  // ◆ 🔴 放开的粒度 ＝ 跑道的粒度，不是域的粒度
  granularity: {
    rule: '按**跑道的覆盖范围**放开，不按行业／系统的名字放开。',
    why: '按域放开两头都会错：整个域放开 ⇒ 没铺的地方也被放开（漏）；整个域收着 ⇒ 铺好的地方也被锁死（白收利息）。',
    form: '同一域内，判据覆盖到处放开、未覆盖到处收 —— 逐处判，不逐域判。',
  },

  // ◆ 释放哪一部分、保留哪一部分
  releases: '损耗 H（猜上意／重建语境／返工／自我设限）→ 趋零',
  keeps: '有效 H（判断／创造／选档）全额保留；且因不分心而更足',
  effect: '损耗 H↓ ⇒ 总 H↓ ⇒ M↑（与 LOSS_BEARER.mSign 同向）；有效 H 不减 ⇒ 不触发 H=0，`0 < H` 仍成立',
  ordering: 'H_PERMIT（敢动）先于 H_OBSERVER（怎么动）。没有许可 ⇒ 三档选取不发生。',

  // ◆ 「别怕」的合法含义 —— 这格不写清就会被当免责话术
  responsibility: {
    withdraws: '撤掉的是**过度谨慎**（那只是跑道缺口的利息），不是后果归属。',
    onRunway: '在已铺跑的跑道内出事 ⇒ 追责指向**跑道本身的错／漏**（判据的建设与核准），不指向按跑道行驶的执行者。',
    offRunway: '跑道外的事 ⇒ 没铺就是没铺；谁放手谁担，不得以「他让我放开跑」免责。',
    basis: '责任权唯人类（CAPACITY_VS_LIABILITY.liability.canBeAI=false）：授权解决的是"敢不敢动"，不解决"谁的名字签在上面"。',
  },

  // ◆ 最容易混的三处（成组禁，缺一个就会反向做错）
  anti: [
    '🔴 「放开跑」≠「H 变大」：恰恰相反，是 H 里那笔零收益的支出被退掉了（总 H↓ ⇒ M↑）。',
    '🔴 「放开跑」≠「越过 R」：跑道内跑得再野也在界内；R 的界（L 与域标度）一分不动。',
    '🔴 「放开跑」≠「出事不算你的」：撤的是过度谨慎，不是后果归属（见 responsibility 三分）。',
  ],

  wiring: {
    toRunway: '与 docs/runway-and-criterion F3 同构：约束不是自由的对面，空白才是。⇒ 这句话是 F3 的执行指令形态，不是新规则。',
    toLoss: '与 LOSS_BEARER 同向：放开跑＝把损耗 H 退掉 ⇒ 总 H↓ ⇒ M↑。若某处出现"放开跑 ⇒ H 变大 ⇒ M 变小"，方向即写反。',
    toObserver: 'H_OBSERVER 三档（toward_s／balanced／toward_d）是在"已获许可"之后才有的选择；无许可时三档不启动。',
    toSelfZero: '`H=0` 的最贴地解释：**不敢动、没开始**（不是"选了最保守那档"）。',
  },
};

/**
 * 判这一处该不该「放开跑」。**只判许可形态，不判 H 的数值。**
 *
 * @param {object} a
 * @param {boolean} [a.runwayCovered] 这一处的判据铺到了吗（不是"这个行业有没有标准"，是"这一处判据在不在"）
 */
export function hPermitOf({ runwayCovered } = {}) {
  if (typeof runwayCovered !== 'boolean') {
    return { ok: false, permit: 'unknown', numeric: false, reason: '未回答「这一处跑道铺到了吗」⇒ 不判许可（≠ 可以放开跑）' };
  }
  if (runwayCovered) {
    return {
      ok: true, permit: 'released', numeric: false,
      phrase: H_PERMIT.phrase,
      releases: H_PERMIT.releases,
      effect: H_PERMIT.effect,
      reason: '跑道铺到 ⇒ 过度谨慎可撤（那本就是缺口利息）⇒ 放开跑，损耗 H 退掉，总 H↓、M↑',
    };
  }
  return {
    ok: true, permit: 'held', numeric: false,
    phrase: '还没铺到这儿，先沿已知边界跑',
    releases: '无 —— 谨慎此时不是利息而是保险',
    effect: '不得卸谨慎（强卸测到的是缺口，不是跑道）',
    reason: '跑道没铺 ⇒ 放开跑＝跑进空白 ⇒ 不是放权，是弃权',
  };
}

// ════════════════════════════════════════════════════════════════════
// 🔴 损耗由谁支付（安 2026-10-20 17:5x 亲定）
//
//   原话：「我不喜欢做中间转述者，只要转述，必有损耗，所以叫你们在天堂直接联系，
//          不由我转。……但是能量在流动时必然有损耗，这个损耗**只能由 H 支付**，
//          因为 H 是整个公式里**唯一的主动调节项**。H 支付多，H 值就高，H 高，M 就小。」
//
//   ⇒ 这一句把上轮遗留的「多级转述损耗怎么记账」直接收口了：
//     **不记账，记到 H 上**。
//
//   三段推理（逐段可核，不是一句话结论）：
//     ① 「支付」≡「作选择并承受后果」≡ **H 的定义**（NESTED_VARS.H.essence）。
//        R（规则）／S（存量）／D（客观扰动，不由 H 选）**都没有"承担后果"这个属性**
//        ⇒ 结构上没有支付能力 ⇒ **不是"选 H 来付"，是只剩 H 能付**。
//     ② H 在分母、M_SIGN.H = −1 ⇒ H 支付多 ⇒ H 值高 ⇒ M 小。
//        这与原文 direction（H 越小 → M 越大）是**同一条**，不是新加一条规则。
//     ③ 每层的 H 都是 H（H_in ＝ H_out）⇒ 转述链**每级损耗由该级 H 付**，
//        总支付 ＝ Σ 各级 H ⇒ **层数↑ ⇒ 总 H↑ ⇒ M↓（单调）**。
//
//   🔴 于是「我讨厌当中间人」不再是偏好，而是一条结构结论：
//      **中间层不是"慢一点"，是直接把 M 压下去。**
// ════════════════════════════════════════════════════════════════════
export const LOSS_BEARER = {
  // 🔴 同一个 H 的「付多少」这一面。
  facet: 'cost',
  question: '转述／传递的损耗，记在谁的账上？',
  only: 'H',
  // ⚠️ 须与 nested.mjs 的 M_SIGN.H 一致（verb.mjs 不 import nested，避免循环；
  //    一致性由测试做**交叉校验**，不靠注释承诺）。
  mSign: -1,
  why: '「支付」≡「作选择并承受后果」≡ H 的定义。R 是规则、S 是存量、D 是客观扰动（不由 H 选），三者都没有「承担后果」这一属性 ⇒ 无支付能力。',
  notADesignChoice: '🔴 不是「挑 H 来付」，是 R／S／D 结构上没有支付能力 ⇒ 唯一可行项。读成"人为规定"就会去找别的替罪羊。',
  dir: 'H 支付多 ⇒ H 值高 ⇒ H 在分母 ⇒ M 变小。与原文 direction（H 越小 M 越大）同一条，**不是新增规则**。',
  perLayer: '转述链每层各有自己的 H（H_in＝H_out：本体不变、人变）⇒ 每级损耗由**该级** H 付；总支付 ＝ Σ 各级 H。',
  monotone: '转述层数 ↑ ⇒ 总 H ↑ ⇒ M ↓（单调）。⇒ 中间层不是"慢一点"，是**直接把 M 压下去**。',

  // ══════════════════════════════════════════════════════════════
  // 🔴 2026-10-20 实测（probe-e2，101 次调用 ¥0.127）后的**范围限定**
  //
  //   实测两个臂，各 4 条「不自解释信息」× 3 层：
  //     · free 臂（不限制字数）⇒ 模型**原样复制**（219 字进、219 字出，一字不差）
  //       ⇒ 3 层保真度全 1.000。**传递本身不产生损耗。**
  //     · limited 臂（≤100 字，必须压缩）⇒ 第 1 层就掉到 0.854，
  //       到第 3 层仍是 0.875 —— **付一次，之后不再累积**。
  //
  //   ⇒ 损耗 ∝ **需要重建（压缩）的次数**，不 ∝ **传递的层数**。
  //   ⚠️ 这与「每层转述都损耗一次、层数越多越差」的直觉模型不同，**必须以实测为准**。
  // ══════════════════════════════════════════════════════════════
  compressionNotLayer: {
    observed: '不压缩的转发：3 层零损耗（free 臂 4/4 条信息 × 3 层，facts 与 rationale 全 1.000）',
    compressed: '一压缩就付一次：限 100 字后第 1 层即 0.854；第 2 层 0.917、第 3 层 0.875 ⇒ 不再累积',
    revised: '损耗 ∝ 压缩次数（须重建的次数），不 ∝ 传递层数。⇒ 「必有损耗」的真正机制是「必经压缩」，不是「必经传递」。',
    humanDomain: '⚠️ 不能拿 free 臂去否安的原话：模型能原样复制，**人不能**（工作记忆有限，重述必然压缩）。⇒ 人域"必有损耗"成立；机器原样复制是**上界读数**，不是反例。',
    scope: 'n=4 信息 × 2 臂 × 3 层，单模型 temperature=0 ⇒ 方向性读数，系数不可外推。',
    consequence: '降损的两条路因此排序：① 减少压缩次数（直连原始语境）＞ ② 缩短每层压缩量（少写几遍不解决）。',
  },

  // ◆ 压缩时**先丢什么**：不是按信息类型分，是按「承重性」分
  //   实测反例：I3 压缩后丢了「每天 12 人次」（数字），却保住了「人流少、维护成本摊不下来」（理由）。
  //   原因：那个数字**对结论不承重**（去掉后"人少⇒不装风淋"仍成立）；I1/I2/I4 的数字都是论点本身，被保住。
  //   ⇒ 我原来的预测「rationale 掉得比 facts 多」是**选错了分类轴**：类型是枚举，承重性是结构。
  whatGetsDropped: {
    axis: '承重性（去掉后结论是否仍成立），不是类型（数字／理由／条款）',
    why: '压缩器总是先扔"可省的"；可省性由**该信息在本次结论里的承重**决定，与它是不是数字无关。',
    falsified: '预测「rationale 掉得比 facts 多」被本轮数据推翻：limited 臂 L3 facts 0.917／rationale 0.875，差 0.042 ≈ 噪声；且出现数字先死的反例（I3）。',
    judgement: '所以判"哪些必须留住"不能按类型列表（那是枚举），只能按「它在本次结论里承不承重」（结构）。',
  },

  // ◆ 最要紧的一刀：损耗的根源不是「信息丢了」
  root: '损耗的根源不是信息丢失，是**接收方必须重建发送方的语境**。原文转发能省掉"信息丢失"那一段，省不掉"语境重建"——解释本身就吃 H。⇒ 降损的方向是「让接收方直接接触原始语境」，不是"多说几遍／写清楚点"。',

  // ◆ 两种 H，在公式里是同一个 H，但性质不同
  kinds: {
    effective: '有效 H：用于做判断／做选择，边际收益 > 0 ⇒ **必须付**（这正是 `0 < H` 的来源）',
    wasted: '损耗 H：用于补转述缺口（猜上意、重建语境、返工），边际收益 = 0 ⇒ 纯损耗',
  },
  // 🔴 这一格最容易读反
  optimize: '不是「减少 H」，是「把 H 从零收益处移到正收益处」——总 H 不变，M 即可升。⇒ "我不当中间人"的结构理由：我的 H 被耗在零收益的复述上。',

  // ◆ 不许为损耗新开变量
  noNewVar: '🔴 不许为损耗新增公式变量（会让公式变五项，M 不再是那个 M）。记到 H 上：符号自动正确（H↑⇒M↓），公式一字不改。',

  anti: [
    '🔴 把损耗记到 R／S／D 上 ⇒ 类型错（让被动项承担主动成本）。',
    '🔴 把 H 读成"越小越好" ⇒ 违反 `0 < H`（H＝0 即纯规则执行、无增量；那不是稳态高，是没做）。',
    '🔴 把"必有损耗"读成"无法改进" ⇒ 判据不是"有没有损耗"，是「损耗有没有被支付 ∧ 有没有超过收益」。',
  ],

  // ◆ 与已有常量的接线（防同一件事两处定义）
  wiring: {
    toRelay: 'R_RELAY 说"转述必有 relay"；这一格说"relay 的代价付在哪"。两者是同一件事的两端：转述不可避免，但**层数可以减**。',
    toMH: '与 nested.mjs 的 mDirection 对齐：层数↑ ⇒ delta.H=+1 ⇒ M 下降。可直接喂 mDirection。',
    toAuthority: 'H 付了损耗，不等于获得额外授权（H_AUTHORITY.noHigherGrantor 不变）：支付是**成本**，不是**权限**。',
  },
};

/**
 * 转述层数 → H 支付的方向（**只判方向与归属，绝不给 H 的数值**）。
 *
 * @param {object} a
 * @param {number} a.relayLayers 我这条链上有几层转述（0 ＝ 直接对接原始语境）
 */
export function lossRoute({ relayLayers } = {}) {
  if (!Number.isInteger(relayLayers) || relayLayers < 0) {
    return { ok: false, numeric: false, reason: 'relayLayers 须为非负整数 ⇒ 不判（≠ 无损）' };
  }
  const zero = relayLayers === 0;
  return {
    ok: true,
    numeric: false,
    borneBy: LOSS_BEARER.only,
    layers: relayLayers,
    deltaH: zero ? 0 : +1,       // 喂 mDirection 用：每多一层，总 H 抬一档
    mDir: zero ? 'flat' : 'down',
    note: zero
      ? '无转述层 ⇒ 无转述损耗。⚠️ 解释成本仍在（不可消除），但它不由"复述"产生。'
      : `${relayLayers} 层转述 ⇒ 每层由该层 H 支付 ⇒ 总 H 抬 ${relayLayers} 档 ⇒ M 下降。减层 ＝ 直接抬 M。`,
  };
}

// ════════════════════════════════════════════════════════════════════
// 张力 L：三档路由
// ════════════════════════════════════════════════════════════════════
export const TENSION_KIND = {
  RATIO: 'ratio',   // 档 A：有容差 ⇒ 比值（无量纲）
  SET: 'set',       // 档 B：有动作集 ⇒ 集合差（缺口清单）
  UNKNOWN: 'unknown',
};

// ════════════════════════════════════════════════════════════════════
// 张力输出的**形状校验**（2026-10-20 实测后落码）
//
// 实测（probe-e2 E6，6 案例 × 2 臂）：
//   · 档 B（只给条款、没有容差）的 2 个案例，**有说明与没说明都硬凑**：
//     两臂都把「三人复核只签了两人」换算成了百分数/评分。
//   · 档 C（什么都没有）给说明后能守住不判（1/2 → 2/2），但仍有一例给指数。
//
// ⇒ 结论：**"不要硬凑"这句话挡不住硬凑**。能挡住的只有「输出形状不允许」——
//   档 B 的合法产出只有两种形态：缺口清单 或 不判。给了比值即形状非法。
// ════════════════════════════════════════════════════════════════════
export const TENSION_OUTPUT = {
  forms: { ratio: 'ratio', gap_list: 'gap_list', no_judgment: 'no_judgment' },
  legal: {
    [TENSION_KIND.RATIO]: ['ratio'],
    [TENSION_KIND.SET]: ['gap_list', 'no_judgment'],
    [TENSION_KIND.UNKNOWN]: ['no_judgment'],
  },
  // 🔴 病灶一句话
  why: '集合差没有大小 —— 「要求三个动作、只做到两个」不是「完成 66.7%」，是「缺一个动作」。把集合差换算成比例 ＝ 给一个不存在的量造了个数。',
  anti: [
    '🔴 档 B 输出比值／指数／评分 ⇒ 形状非法（哪怕算得"看起来合理"）。',
    '🔴 拿"说明三档"当解法 ⇒ 实测已证无效：给了说明的臂仍然 2/4 硬凑。',
    '🔴 档 C 输出任何数（含"风险指数""稳定性评分"）⇒ 形状非法：没判据的地方给数就是编。',
  ],
  // 🔴 这条读数我改过一次：第一版是用正则从自由文本里数「出现没出现百分数」，
  //    结果把「风险不是 50%」这种**否定句**也算成硬凑 ⇒ 报出 plain 3/4、tiers 2/4，
  //    并据此写成「说明无效」。人工核 8 条原文后重判：**真硬凑只有 T4-plain 一条**（它真写了 33.33%）。
  measured: 'E6（人工核原文后）：档 B/C 共 4 例 × 2 臂。真硬凑 plain 1/4（T4 把「三人签了两人」算成 33.33%）、tiers 0/4。⇒ 三档说明在本轮**有效但不是零风险**：无说明时会凑，给了说明后没凑。n=4，只能说方向，不能说"已解决"。',
  // ⚠️ 方法论教训（比读数更值钱）
  measuredCaveat: '正则从自由文本读指标会连否定句一起数（"不是 50%"）。⇒ 凡用正则读指标，必须先人工核 2–3 条原文再报数。本轮同一坑踩了两次（上一轮 ±5%／正负 5%）。',
};

/**
 * 校验一条张力读数/结论的**形状**是否合法（不判数值对错，只判形状）。
 *
 * @param {object} a
 * @param {string} a.kind TENSION_KIND 之一
 * @param {string} a.form TENSION_OUTPUT.forms 之一
 * @returns {{ok:boolean, code:string, reason:string}}
 */
export function checkTensionOutput({ kind, form } = {}) {
  const legal = TENSION_OUTPUT.legal[kind];
  if (!legal) return { ok: false, code: 'unknown_kind', reason: `档位「${kind ?? '(未给)'}」不识别 ⇒ 不判（≠ 合法）` };
  const f = form ?? 'no_judgment';
  if (!TENSION_OUTPUT.forms[f]) return { ok: false, code: 'unknown_form', reason: `输出形态「${f}」不识别 ⇒ 不判（≠ 合法）` };
  if (!legal.includes(f)) {
    return {
      ok: false, code: 'shape_violation',
      reason: `档 ${kind} 的合法形态是 ${legal.join(' / ')}，实际给了 ${f} ⇒ 形状非法（${TENSION_OUTPUT.why}）`,
    };
  }
  return { ok: true, code: 'ok', reason: `档 ${kind} + 形态 ${f} ⇒ 形状合法` };
}

/**
 * 算 S 与 D 之间的张力。
 *
 * @param {object} input
 * @param {number} [input.tol]      档 A：标准容差（与 dev 同单位）
 * @param {number} [input.dev]      档 A：实际偏差（与 tol 同单位）
 * @param {string[]} [input.required] 档 B：S 要求的动作（标准条款要求做什么）
 * @param {string[]} [input.allowed]  档 B：D 允许的动作（这次事项实际能做到什么）
 * @returns {{kind:string, verdict:string, L?:number, gap?:string[], missing?:string, numeric:boolean}}
 *
 * 🔴 `numeric` 只在档 A 为 true。B 档**永远 false** —— 集合差没有大小，硬给数就是造假。
 */
export function tensionOf(input = {}) {
  const hasPair = typeof input.tol === 'number' && typeof input.dev === 'number';
  const hasSets = Array.isArray(input.required) && Array.isArray(input.allowed);

  // ── 档 A：容差可比 ──────────────────────────────────────────────
  if (hasPair) {
    if (!(input.tol > 0)) {
      return { kind: TENSION_KIND.RATIO, verdict: 'unknown', numeric: false, missing: 'tol 必须 > 0（否则 L 无定义，不是「张力为零」）' };
    }
    const L = Math.abs(input.dev) / input.tol;
    // 判「是否越过容差线」——这是域标准自己定义的线（dev = ±tol）
    const verdict = L > 1 ? 'over' : L === 1 ? 'at' : 'within';
    return { kind: TENSION_KIND.RATIO, verdict, L, numeric: true, unit: 'tol' };
  }

  // ── 档 B：只有动作集 ────────────────────────────────────────────
  if (hasSets) {
    const allowed = new Set(input.allowed);
    const gap = input.required.filter((a) => !allowed.has(a));
    const extra = input.allowed.filter((a) => !input.required.includes(a));
    const verdict = gap.length === 0 ? 'compatible' : gap.length === input.required.length ? 'incompatible' : 'partial';
    return {
      kind: TENSION_KIND.SET,
      verdict,
      gap,          // ← 张力在这里是「缺口清单」，不是数
      extra,        // 允许但没要求的（不是缺口，登记备查）
      numeric: false,
      note: '集合差没有大小 ⇒ 本档不参与 `H/L` 比值，只回答缺口是否为空、缺在哪几条。',
    };
  }

  // ── 档 C：都拿不到 ──────────────────────────────────────────────
  return {
    kind: TENSION_KIND.UNKNOWN,
    verdict: 'unknown',
    numeric: false,
    missing: '既无 tol/dev（档 A），也无 required/allowed（档 B）',
    note: '🔴 不判 ≠ 相容。unknown 不得被当成「无张力」。',
  };
}

// ════════════════════════════════════════════════════════════════════
// 位置：H 在张力上的读数，是否落在 (0, R) —— R 是**刻度读数**，不是上限
//
// ⚠️ 这一步需要两个外部输入，缺任一个就 unknown（不许默认）：
//    notchH : H 选定的绝对余量（单位同 L：几个容差）
//    rCap   : H 的**刻度读数**（百分制 ⇒ 80 表示 80%），由域查得或由 notchCapOf() 算出
//
// 🔴 上一版这里写 `rCap ∈ (0,1)`，判据是「R 是占比上限必须 <1」—— **已撤**（见文件头撤回段）。
//    正确关系：hi = L · rCap / R_SCALE.value
//      · rCap = 100（刻度值，未套域约束）⇒ hi = L        ⇒ 上界就是 L 本身
//      · rCap =  75（域要求留 25% 余量）⇒ hi = 0.75 L
//      · rCap =  50（航天/医疗留 50%）  ⇒ hi = 0.50 L
//    ⇒ 值越小＝域越严。**「严格」不是 R 的属性，是域读数的属性。**
// ════════════════════════════════════════════════════════════════════
export const SLIDE_STATE = {
  ON_RAIL: 'on_rail',
  OFF_LOW: 'off_low',
  OFF_HIGH: 'off_high',
  ZERO_TENSION: 'zero_tension',   // 🔴 特有态：跨距为零 ⇒ H 无处着力
  UNKNOWN: 'unknown',
};

/**
 * 判 H 在张力上的位置形态。
 *
 * 🔴 第一版这里写错过，实跑才看出来（**偏差 7% 与 -12% 位置居然相同**）：
 *    我把 `notchRatio` 直接当成了「占比」，等于让分母 L 完全没参与计算 ——
 *    L 从 1.4 变到 2.4，位置一点不变。这就是「公式里有个变量，但没进代码」。
 *
 * 正确读法（由 `0 < H/(S↔D) < R` 直接展开，R 按刻度读）：
 *     0 < 100·H/L < R   ⇒   **0 < H < L · R/100**
 *   ⇒ H 是**绝对余量**（单位：几个容差），合法范围是 (0, L·R/100)，由 L 撑开。
 *   ⇒ R = 100（刻度值）时上界退化为 L 本身 —— 这与「R 无上限」一致：界在 L，不在 R。
 *   ⇒ 「张力大 ⇒ 能动性可用空间大」（问题越严重，能动性可发挥的余地越大）；
 *      「张力 → 0 ⇒ 可行域 → 空」（没问题时不需要能动性）＝ zero_tension。
 *
 * @param {object} a
 * @param {object} a.tension   tensionOf() 的返回
 * @param {number} [a.notchH]  该档位对应的**绝对余量**（单位同 L：几个容差）。
 * @param {number} [a.rCap]    H 的**刻度读数**（百分制；由域查得，或由 notchCapOf() 算出）。
 * @param {number} [a.scale]   刻度（默认 R_SCALE.value＝100）。**换刻度不得改判决** —— 这就是它只是刻度的证据。
 * @returns {{state:string, ok:boolean, numeric:boolean, reason:string}}
 */
export function slidePos({ tension, notchH, rCap, scale } = {}) {
  const out = (state, ok, reason, extra = {}) => ({ state, ok, numeric: false, reason, ...extra });

  if (!tension || tension.kind === TENSION_KIND.UNKNOWN) {
    return out(SLIDE_STATE.UNKNOWN, false, '张力不可算 ⇒ 位置不判（≠ 在轨内）');
  }

  // 🔴 零张力：S 与 D 完全相容（缺口为空 / 偏差为 0）
  //    ⇒ 跨距 L = 0 ⇒ 合法范围 (0, R·L) 退化为空集 ⇒ **H 无处着力**
  //    这不是错误，是结构事实：照标准做就能做的事，不需要能动性。
  if (tension.kind === TENSION_KIND.SET && tension.verdict === 'compatible') {
    return out(SLIDE_STATE.ZERO_TENSION, false, 'S 与 D 完全相容（缺口为空）⇒ 跨距 L=0 ⇒ 可行域收缩为空 ⇒ H 无处着力');
  }
  if (tension.kind === TENSION_KIND.RATIO && tension.L === 0) {
    return out(SLIDE_STATE.ZERO_TENSION, false, '偏差为 0 ⇒ 张力 L=0 ⇒ 可行域收缩为空 ⇒ H 无处着力');
  }

  // 集合档没有大小 ⇒ 不进入位置判定（不硬凑）
  if (tension.kind === TENSION_KIND.SET) {
    return out(SLIDE_STATE.UNKNOWN, false, `张力为缺口清单（${tension.gap.join('、')}）⇒ 无「大小」可比 ⇒ 位置不判；此处只报缺口`, { gap: tension.gap });
  }

  if (typeof notchH !== 'number' || typeof rCap !== 'number') {
    const miss = [];
    if (typeof notchH !== 'number') miss.push('notchH（该档余量；可由 notchCapOf() 推）');
    if (typeof rCap !== 'number') miss.push('rCap（H 的刻度读数；须由 R 动作查域，或用 R_SCALE.value 明示不套域约束）');
    return out(SLIDE_STATE.UNKNOWN, false, `缺 ${miss.join(' / ')} ⇒ 位置不判`);
  }

  // 🔴 一值一义守卫：百分制下 rCap ≤ 1 语义二义（是 80% 还是 0.8%？）
  //    这正是上一版把「刻度」与「比例」混成一个字段的残留。不判，要求改写。
  const SC = typeof scale === 'number' ? scale : R_SCALE.value;
  if (rCap > 0 && rCap <= 1 && SC === 100) {
    return out(SLIDE_STATE.UNKNOWN, false,
      `rCap=${rCap} ≤ 1：在百分制（刻度 ${R_SCALE.value}）下语义二义（80% 还是 0.8%？）⇒ 不判；请改用刻度读数（如 80）`);
  }
  if (!(rCap > 0)) {
    return out(SLIDE_STATE.UNKNOWN, false, `rCap 必须 > 0（刻度读数非正 ⇒ 无意义）；🔴 但**没有上界检查** —— R 本体无上限`);
  }

  const L = tension.L;
  const hi = L * rCap / SC;   // 上界 = L × 刻度读数/刻度（刻度可换 ⇒ 判决必须不变）
  // ⚠️ 上界只以**字符串**形式带出（`boundExpr`），不带 number ——
  //    返回对象「不含任何 number」是一条强结构判据（见测试⑮），不为一处诊断信息开口子。
  const boundExpr = `Hmax=${hi.toFixed(3)}`;
  if (notchH <= 0) {
    return out(SLIDE_STATE.OFF_LOW, false, `余量 ${notchH} ≤ 0 ⇒ 贴死 S 端，违反下界 \`0 <\``, { boundExpr });
  }
  if (notchH >= hi) {
    return out(SLIDE_STATE.OFF_HIGH, false, `余量 ${notchH.toFixed(3)} ≥ ${boundExpr} ⇒ 动力臂不足，违反上界 \`< R\``, { boundExpr });
  }
  return out(SLIDE_STATE.ON_RAIL, true, `余量 ${notchH.toFixed(3)} 落在 (0, ${boundExpr}) ⇒ 约束成立`, { boundExpr });
}

// ════════════════════════════════════════════════════════════════════
// 体检：把「R/H 是否还被当成赋值」这件事变成可判
// ════════════════════════════════════════════════════════════════════
export function verbAudit() {
  const rows = [];
  const push = (k, missing) => rows.push({ key: k, missing, status: missing.length ? 'malformed' : 'ok' });

  const rMiss = [];
  if (!R_ACTION.verb) rMiss.push('verb');
  if (!Array.isArray(R_ACTION.steps) || R_ACTION.steps.length < 3) rMiss.push('steps(查的步骤不足)');
  if (!/S/.test(R_ACTION.output)) rMiss.push('output(须明确产出是 S 而非 R 的数值)');
  if (!/动作/.test(R_ACTION.anti)) rMiss.push('anti(须显式禁止「把 R 定死成常数」)');
  // 🔴 三层区分：本体无上限 / 读数可查 / 刻度只是换算
  if (R_ONTOLOGY.bounded !== false) rMiss.push('R_ONTOLOGY.bounded(须为 false：R 无上限)');
  if (!R_ONTOLOGY.antiBound) rMiss.push('R_ONTOLOGY.antiBound(须显式禁止给 R 设上界)');
  if (R_SCALE.isBound !== false) rMiss.push('R_SCALE.isBound(刻度不得被当成界)');
  if (!R_SCALE.purpose) rMiss.push('R_SCALE.purpose(须写明 R=100 只是便于计算)');
  // 🔴 R 不直达：第一步必须是「定尺子来源」，不能直接查公开标准
  if (R_ACTION.steps?.[0]?.out !== 'rGrade（origin / relay，见 R_RELAY）') rMiss.push('steps[0](第一步须是「定本层尺子来源」，不得直接查公开标准)');
  if (!R_RELAY.test) rMiss.push('R_RELAY.test(须给「能否指到公开条款」这条判据，且不看行业名/话术)');
  if (!Array.isArray(R_RELAY.anti) || R_RELAY.anti.length < 2) rMiss.push('R_RELAY.anti(须成对：取错尺子 ∧ 冒充原版)');
  if (!R_RELAY.tightenOnly) rMiss.push('R_RELAY.tightenOnly(须写明 relay 只能收紧或取裁量区间内的松端)');
  push('R', rMiss);

  const mMiss = [];
  if (!Array.isArray(MARGIN_CONSENSUS.rows) || MARGIN_CONSENSUS.rows.length < 2) mMiss.push('rows(余量共识至少两档)');
  for (const r of MARGIN_CONSENSUS.rows ?? []) {
    if (!Array.isArray(r.marginPct) || r.marginPct.length !== 2) mMiss.push(`${r.key}.marginPct(须为区间[lo,hi])`);
    if (!r.basis) mMiss.push(`${r.key}.basis(须写凭据为何是这个区间)`);
    if (!r.source) mMiss.push(`${r.key}.source(须写标准出处)`);
    if (!r.verified) mMiss.push(`${r.key}.verified(须标一手/二手)`);
  }
  if (!MARGIN_CONSENSUS.onMiss?.do) mMiss.push('onMiss.do(表外须现场查)');
  push('margin', mMiss);

  const cMiss = [];
  if (!Array.isArray(CLAUSE_SLOTS.required) || !CLAUSE_SLOTS.required.length) cMiss.push('required');
  if (!Array.isArray(CLAUSE_SLOTS.numericTriple) || CLAUSE_SLOTS.numericTriple.length < 2) cMiss.push('numericTriple(值/单位须成对)');
  if (!Array.isArray(CLAUSE_SLOTS.provenance) || !CLAUSE_SLOTS.provenance.length) cMiss.push('provenance');
  push('clause', cMiss);

  const hMiss = [];
  if (!H_OBSERVER.verb) hMiss.push('verb');
  if (!H_OBSERVER.viewer?.mustAnswer) hMiss.push('viewer.mustAnswer(谁签字)');
  if (!Array.isArray(H_OBSERVER.choice?.notches) || H_OBSERVER.choice.notches.length < 2) hMiss.push('choice.notches');
  if (!/不是量出来/.test(H_OBSERVER.anti)) hMiss.push('anti(须显式区分「选取」与「测量」)');
  // 🔴 损耗归属：唯一主动项才付得起（安 10-20 17:5x）
  if (LOSS_BEARER.only !== 'H') hMiss.push('LOSS_BEARER.only(损耗只能由 H 支付)');
  if (LOSS_BEARER.mSign !== -1) hMiss.push('LOSS_BEARER.mSign(须为 −1，与 M_SIGN.H 一致：H↑⇒M↓)');
  if (!LOSS_BEARER.noNewVar) hMiss.push('LOSS_BEARER.noNewVar(禁止为损耗新增公式变量)');
  if (!LOSS_BEARER.root) hMiss.push('LOSS_BEARER.root(须写明损耗根源＝语境重建，不是信息丢失)');
  if (!LOSS_BEARER.optimize || !/移/.test(LOSS_BEARER.optimize)) hMiss.push('LOSS_BEARER.optimize(优化＝移项，不是减少 H)');
  // 🔴 实测修正：损耗 ∝ 压缩次数，不 ∝ 层数（probe-e2 E3）。这条不在场，就会退回旧模型。
  if (!LOSS_BEARER.compressionNotLayer?.revised) hMiss.push('compressionNotLayer.revised(须写明损耗∝压缩次数不∝层数)');
  if (!LOSS_BEARER.compressionNotLayer?.humanDomain) hMiss.push('compressionNotLayer.humanDomain(须区分人/机：机器原样复制是上界，不是反例)');
  if (!LOSS_BEARER.whatGetsDropped?.axis) hMiss.push('whatGetsDropped.axis(丢什么按承重性，不按信息类型)');
  // 🔴 通行许可：是给执行者的指令，不是数值
  if (H_PERMIT.asInstruction !== true || H_PERMIT.asValue !== false) hMiss.push('H_PERMIT.asInstruction/asValue(须显式区分「指令」与「取值」)');
  if (!/跑道/.test(H_PERMIT.precondition)) hMiss.push('H_PERMIT.precondition(前提须是跑道铺到，否则"放开跑"＝弃权)');
  if (!/跑道/.test(H_PERMIT.granularity?.rule || '')) hMiss.push('H_PERMIT.granularity(粒度须是跑道覆盖，不是域名)');
  if (!H_PERMIT.responsibility?.onRunway || !H_PERMIT.responsibility?.offRunway) hMiss.push('H_PERMIT.responsibility(须分「跑道内出事」与「跑道外出事」)');
  if (!Array.isArray(H_PERMIT.anti) || H_PERMIT.anti.length < 3) hMiss.push('H_PERMIT.anti(须三条：≠H变大 ∧ ≠越R ∧ ≠免责)');
  if (!/M↑/.test(H_PERMIT.effect || '')) hMiss.push('H_PERMIT.effect(须写清放开跑 ⇒ 总H↓ ⇒ M↑，方向不得写反)');
  push('H', hMiss);

  // 🔴 H 是统称：四个面必须在场、既有常量必须挂到面上、且"面向未定"不得混进三态。
  //    （2026-10-20 安：H 在因果律里本来就是一个统称；具体情况具体分析。）
  const hfMiss = [];
  if (H_UMBRELLA.isUmbrella !== true || H_UMBRELLA.isScalar !== false) {
    hfMiss.push('H_UMBRELLA(须明确 isUmbrella:true / isScalar:false —— 否则 H 会被压回一个数)');
  }
  if (!H_UMBRELLA.retracted?.revised) hfMiss.push('H_UMBRELLA.retracted(须留着上轮判法的修正记录)');
  // 🔴 公式里的 H 只取一面 —— 否则四面会被当成四个分量，M 变五项
  if (H_UMBRELLA.inFormula?.which !== 'capacity') {
    hfMiss.push('H_UMBRELLA.inFormula.which(须指明公式取 capacity 面；否则四面当分量，M 变五项)');
  }
  if (!/定语/.test(H_UMBRELLA.inFormula?.others || '')) {
    hfMiss.push('H_UMBRELLA.inFormula.others(须写明其余三面是定语不是分量)');
  }
  // 四个面缺一即红 —— 尤其是 seam（本轮才补上，最容易被下次重构删掉）
  const needFaces = ['first_person', 'capacity', 'cost', 'seam'];
  const haveFaces = Object.keys(H_FACETS.facets);
  const missFace = needFaces.filter((f) => !haveFaces.includes(f));
  if (missFace.length) hfMiss.push(`H_FACETS.facets 缺面：${missFace.join(',')}`);
  if (haveFaces.length !== 4) hfMiss.push(`H_FACETS.facets(应为 4 面，实为 ${haveFaces.length} —— 多面须先证它不是新话题)`);
  // 既有常量必须挂到面上（否则统称只是个空标签）
  const wired = [
    ['H_OBSERVER', H_OBSERVER.facet, 'capacity'],
    ['H_PERMIT', H_PERMIT.facet, 'capacity'],
    ['H_AUTHORITY', H_AUTHORITY.facet, 'first_person'],
    ['CAPACITY_VS_LIABILITY', CAPACITY_VS_LIABILITY.facet, 'first_person'],
    ['LOSS_BEARER', LOSS_BEARER.facet, 'cost'],
  ];
  for (const [name, got, want] of wired) {
    if (got !== want) hfMiss.push(`${name}.facet(实=${got}，须=${want})`);
  }
  // 受控取值映射 + 未定态
  if (facetOf({ wants: 'visible' }).facet !== 'seam') {
    hfMiss.push('facetOf(visible)(须映射到 seam —— 缝这一面必须够得到)');
  }
  const undecided = facetOf({});
  if (undecided.status !== 'question_incomplete') {
    hfMiss.push(`facetOf(空).status(实=${undecided.status}，须 question_incomplete)`);
  }
  // 🔴 第四态不得与三态同值 —— 否则"面向未定"会被当成"判不出"而误升级／或被当 HOLD 放行
  const escalateVals = Object.values(ESCALATE);
  if (escalateVals.includes(undecided.status)) {
    hfMiss.push('facetOf(空).status(与 ESCALATE 三态撞值 —— 面向未定会被折叠成判不出/放行)');
  }
  // 🔴 未给 与 非法取值 必须是两个不同状态（合并＝默认接受自然语言）
  const badWants = facetOf({ wants: 'motivation' });
  if (badWants.status !== 'wants_not_controlled') {
    hfMiss.push(`facetOf(非法取值).status(实=${badWants.status}，须 wants_not_controlled —— 与"未给"合并即默认接受自由文本)`);
  }
  if (badWants.status === undecided.status) {
    hfMiss.push('facetOf(未给|非法取值) 两态同值 —— 必须分开');
  }
  if (undecided.notReview === undefined || undecided.notAllow === undefined) {
    hfMiss.push('facetOf(空)(须同时给 notReview 与 notAllow，缺一即会被单向读)');
  }
  // 跨面检查：同面 false / 异面 true / 未给 null（未判 ≠ 合法）
  if (isCrossFacet({ asked: 'who', read: 'visible' }) !== true) hfMiss.push('isCrossFacet(异面)(须 true)');
  if (isCrossFacet({ asked: 'who', read: 'who' }) !== false) hfMiss.push('isCrossFacet(同面)(须 false)');
  if (isCrossFacet({}) !== null) hfMiss.push('isCrossFacet(未给)(须 null —— 未判不得当成"不是跨面")');
  if (!FACET_DISCIPLINE.notAnExcuse) hfMiss.push('FACET_DISCIPLINE.notAnExcuse(须防"面向不对"变免责)');
  if (FACET_DISCIPLINE.examples.length < 3) hfMiss.push('FACET_DISCIPLINE.examples(须至少三例，覆盖三种跨面形态)');
  // 缝的三条：必然存在 / 宽度不可测 / 外→内不可反推
  if (!/必然存在/.test(INNER_OUTER_SEAM.necessary)) hfMiss.push('INNER_OUTER_SEAM.necessary(须写明缝必然存在)');
  // 🔴 缝宽的收口（安 2026-10-20 20:45）：必然存在 ∧ 不测也不用测 ∧ 是分界线不是量
  if (/必须有界/.test(INNER_OUTER_SEAM.necessary)) hfMiss.push('INNER_OUTER_SEAM.necessary(🔴 不得再要求"必须有界"——缝宽不进公式，此项已撤)');
  if (!INNER_OUTER_SEAM.andIrrelevant) hfMiss.push('INNER_OUTER_SEAM.andIrrelevant(须写明缝宽"不需要测"，只写"不可测"会被读成待测)');
  if (!INNER_OUTER_SEAM.formulaBoundary) hfMiss.push('INNER_OUTER_SEAM.formulaBoundary(须写明缝是分界线)');
  if (H_UMBRELLA.inFormula?.only !== '外 H') hfMiss.push('H_UMBRELLA.inFormula.only(须为"外 H")');
  if (!H_FACETS.facets.seam?.gateRole) hfMiss.push('H_FACETS.facets.seam.gateRole(seam 面须写明其功能是准入闸)');
  if (!INNER_OUTER_SEAM.unmeasurable) hfMiss.push('INNER_OUTER_SEAM.unmeasurable(须禁"用行为可预测推思想简单")');
  if (!/不可反推/.test(INNER_OUTER_SEAM.direction.outToIn)) hfMiss.push('INNER_OUTER_SEAM.direction.outToIn(须写死"行为推不出意图")');
  if (INNER_OUTER_SEAM.anti.length < 3) hfMiss.push('INNER_OUTER_SEAM.anti(须三条，跨缝误推成组禁)');
  if (INNER_OUTER_SEAM.sides.inner.observability !== '不可观测' || INNER_OUTER_SEAM.sides.outer.observability !== '可观测') {
    hfMiss.push('INNER_OUTER_SEAM.sides(内外可观测性不得对调)');
  }
  push('hFacets', hfMiss);

  // 🔴 公式准入律：能进公式的 H 全部是外 H（期望值一律用字面量，不得取自被检对象自身）
  //    ⚠️ 检查本身不得抛异常：抛异常＝把「发现配置错」变成「崩掉」⇒ 全部走可选链。
  const fMiss = [];
  const FI = FORMULA_INPUT || {};
  if (FI.states?.NOT_IN_INPUT_SET !== 'not_in_input_set') fMiss.push('FORMULA_INPUT.states.NOT_IN_INPUT_SET(须字面量 not_in_input_set)');
  if (FI.states?.NOT_COLLECTED !== 'not_collected') fMiss.push('FORMULA_INPUT.states.NOT_COLLECTED(须字面量 not_collected)');
  if (FI.states?.NOT_IN_INPUT_SET === FI.states?.NOT_COLLECTED) {
    fMiss.push('FORMULA_INPUT.states(🔴 两种"没有"同值 —— 合并即"内 H"变万能挡箭牌)');
  }
  if (!/留痕/.test(FI.admission?.criterion || '')) fMiss.push('FORMULA_INPUT.admission.criterion(准入判据须落在能否留痕)');
  if (!/演绎/.test(FI.closedSet?.how || '')) fMiss.push('FORMULA_INPUT.closedSet.how(须写明这是演绎反推，否则退化成"哪些算外 H"的清单)');
  if (!/soft/.test(FI.twoTier?.hardOrSoft || '')) fMiss.push('FORMULA_INPUT.twoTier.hardOrSoft(须接 PROVENANCE_ATTESTATION 的 soft/hard，外化≠可信)');
  // 类比必须双向带闸，否则会被单向读成"不必查动机"
  if (!FI.police?.caution1 || !FI.police?.caution2) fMiss.push('FORMULA_INPUT.police(须同时给 caution1 与 caution2，单向读即漏)');
  if (FI.police?.status !== '镜像，不作判据（判据在 admission）') fMiss.push('FORMULA_INPUT.police.status(类比不得升格为判据)');
  if (!Array.isArray(FI.anti) || FI.anti.length < 4) fMiss.push('FORMULA_INPUT.anti(须四条：不存在/不查痕/反推/搪塞)');
  if (!FI.wiring?.toReview) fMiss.push('FORMULA_INPUT.wiring.toReview(须堵"判不出就说是内 H")');
  // 撤项必须显式，且写明为什么不是"搁置"
  if (!/撤项/.test(FI.retracted?.revised || '')) fMiss.push('FORMULA_INPUT.retracted(须显式撤项，不得留成悬项)');
  push('formulaInput', fMiss);

  // 🔴 裁量权归属：H 无上级授权者；担责唯人类
  const aMiss = [];
  if (H_AUTHORITY.noHigherGrantor !== true) aMiss.push('H_AUTHORITY.noHigherGrantor(须为 true)');
  if (!H_AUTHORITY.noHigherGrantorBasis) aMiss.push('noHigherGrantorBasis(须给出结构理由，不能只写结论)');
  if (!Array.isArray(H_AUTHORITY.forbidden) || H_AUTHORITY.forbidden.length < 3) aMiss.push('forbidden(须逐条禁掉三种越界)');
  if (CAPACITY_VS_LIABILITY.capacity?.canBeAI !== true) aMiss.push('capacity.canBeAI(裁量权可归 AI)');
  if (CAPACITY_VS_LIABILITY.liability?.canBeAI !== false) aMiss.push('liability.canBeAI(🔴 责任权不得归 AI)');
  if (!CAPACITY_VS_LIABILITY.whatAIstillOwes) aMiss.push('whatAIstillOwes(剥责任权≠剥义务)');
  if (!Array.isArray(ESCALATION.conditions) || ESCALATION.conditions.length !== 3) aMiss.push('ESCALATION.conditions(须恰好三条合取)');
  if (!ESCALATION.domainFree) aMiss.push('domainFree(须写明领域无关)');
  if (!ESCALATION.ordering) aMiss.push('ordering(裁决须先于动作)');
  push('authority', aMiss);

  // 🔴 待办 ≠ 欠账
  const eMiss = [];
  if (EVIDENCE_LIFECYCLE.blocking !== false) eMiss.push('blocking(二手不得阻塞判决)');
  if (EVIDENCE_LIFECYCLE.levels?.secondary?.usable !== true) eMiss.push('secondary.usable(须可作读数使用)');
  if (EVIDENCE_LIFECYCLE.levels?.none?.usable !== false) eMiss.push('none.usable(无来源须不可用)');
  if (!EVIDENCE_LIFECYCLE.taskVsDebt) eMiss.push('taskVsDebt(须显式区分待办与欠账)');
  // 🔴 实测补的：自证 ≠ 查过（2026-10-20 E2）
  if (PROVENANCE_ATTESTATION.levels?.self_attested?.weight !== 'soft') eMiss.push('PROVENANCE_ATTESTATION.self_attested(自证须为 soft，不得 hard)');
  if (PROVENANCE_ATTESTATION.levels?.external_checkable?.weight !== 'hard') eMiss.push('PROVENANCE_ATTESTATION.external_checkable(外部可核才可 hard)');
  if (!Array.isArray(PROVENANCE_ATTESTATION.anti) || PROVENANCE_ATTESTATION.anti.length < 3) eMiss.push('PROVENANCE_ATTESTATION.anti(须三条：能写标准号≠查过 ∧ 自证不升级 ∧ 未核≠假)');
  if (!/照着核|同一份原件/.test(PROVENANCE_ATTESTATION.test || '')) eMiss.push('PROVENANCE_ATTESTATION.test(判据须落在「别人能否照着核」，不落在说得像不像)');
  if (!/正交/.test(PROVENANCE_ATTESTATION.relation || '')) eMiss.push('PROVENANCE_ATTESTATION.relation(须显式声明与 EVIDENCE_LIFECYCLE 正交，不得互替)');
  push('evidence', eMiss);

  // 🔴 unknown 不得折叠为 allow —— 这段是**行为检查**，不是字面检查。
  //    2026-10-20 P5 自查：19/27 组合是 unknown，若消费方把它当"不必升级"，
  //    就与 Rehan 的 UNDETERMINED→PASS 同一形态。故此处真调用 gateOf 验行为。
  const gMiss = [];
  // 🔴 期望值一律用**字面量**，不得用 GATE_FOLD.verdicts.* 自身 ——
  //    自比（`x !== 同一个字段`）永远相等 ⇒ 变异打不穿，等于没锁。
  //    这是 2026-10-20 落锁时实测抓到的：第一版就是自比，把出口改名成 allow 仍然全绿。
  if (GATE_FOLD.verdicts.REVIEW !== 'review') gMiss.push('verdicts.REVIEW(须恰为字面量 review)');
  if (GATE_FOLD.verdicts.ALLOW !== 'allow') gMiss.push('verdicts.ALLOW(须恰为字面量 allow)');
  const gUnknown = gateOf(mustEscalate({}));
  if (gUnknown.gate !== 'review') {
    gMiss.push(`gateOf(unknown).gate(实跑=${gUnknown.gate}，须字面量 review —— 一旦出 allow 就是折叠)`);
  }
  const gHold = gateOf(mustEscalate({ undecidable: false, mustTraceOwner: false, relatesToOwner: false }));
  if (gHold.gate !== 'allow') gMiss.push(`gateOf(hold).gate(实跑=${gHold.gate}；HOLD 是本层判完了，须 allow，不该被迫转人工)`);
  if (gateOf({ ok: true, verdict: 'some_future_verdict' }).gate !== 'review') {
    gMiss.push('gateOf(新 verdict)(未识别取值须默认转人工，不得默认放行)');
  }
  // 🔴 ok:false 必须优先于任何 verdict —— 否则「先读 verdict 再读 ok」的重构会打开折叠口
  if (gateOf({ ok: false, verdict: ESCALATE.HOLD }).gate !== 'review') {
    gMiss.push('gateOf(ok:false + verdict=hold)(ok:false 须优先，否则 unknown 可借 hold 通道放行)');
  }
  if (!GATE_FOLD.collapseModes?.to_allow) gMiss.push('collapseModes.to_allow(须点名最危险的折叠方向)');
  if (!/唯一合法/.test(GATE_FOLD.rule || '')) gMiss.push('rule(须写明 gateOf 是唯一合法消费入口)');
  push('gate', gMiss);

  // 🔴 张力输出形状：光靠"不要硬凑"挡不住（probe-e2 E6 实测 2/4 仍硬凑）
  const tMiss = [];
  if (checkTensionOutput({ kind: TENSION_KIND.SET, form: 'ratio' }).ok !== false) {
    tMiss.push('checkTensionOutput(set, ratio)(档B 给比值必须判非法——实测两臂都犯)');
  }
  if (checkTensionOutput({ kind: TENSION_KIND.SET, form: 'gap_list' }).ok !== true) {
    tMiss.push('checkTensionOutput(set, gap_list)(缺口清单是档B 的合法形态)');
  }
  if (checkTensionOutput({ kind: TENSION_KIND.UNKNOWN, form: 'ratio' }).ok !== false) {
    tMiss.push('checkTensionOutput(unknown, ratio)(档C 给任何数都非法)');
  }
  if (checkTensionOutput({}).ok !== false) tMiss.push('checkTensionOutput(空)(未给档位须不判，不得默认合法)');
  if (!/集合差没有大小/.test(TENSION_OUTPUT.why || '')) tMiss.push('TENSION_OUTPUT.why(须写明集合差没有大小)');
  if (!Array.isArray(TENSION_OUTPUT.anti) || TENSION_OUTPUT.anti.length < 3) tMiss.push('TENSION_OUTPUT.anti(须三条)');
  push('tension', tMiss);

  const bad = rows.filter((r) => r.status !== 'ok');
  return {
    rows,
    count: { ok: rows.length - bad.length, malformed: bad.length, total: rows.length },
    verdict: bad.length ? 'fail' : 'pass',
  };
}
