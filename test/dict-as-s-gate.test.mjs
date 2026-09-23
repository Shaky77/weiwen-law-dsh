// dict-as-s-gate.test.mjs — 「字典即S」接线回归锁（2026-09-23，安根因层裁定 + AI 对齐层落地）
// 【CN 基版本同步件：与 KISS_Law-DSH(EN 活体版) 同构，法则一致、注释中文】
// ---------------------------------------------------------------------------
// 被锁定的结构（一条裁定 + 两处归位 + 一条噪声守卫 + 三层粒度）：
//   ① 裁定（安 09-23 根因层）：**字典就是 S** —— 读法唯一化：动作类别一律**查字典**；
//      破坏标记的有限封闭集 = 字典 VERB.delete 词族，而不是「具体工具名的具体写法」。
//   ② 归位（接线一）：`commandLayer` 旧实现只用手写正则枚举工具名写法 ⇒ 字典早已收全
//      remove/delete/purge/erase… 却无人来问 ⇒ `remove_tree` / `rm_rf` / `--remove-files`
//      一类**同义写法**（安称「异体字」）穿门而过。现由同一本字典、同一套分词读**动作位**词素。
//   ③ 归位（接线二）：`no-destructive-fs` 通道①的**动作分量**改为消费 attribution 的剥离结果
//      （设计原话：破坏标记的识别放在 commandLayer，引擎只消费、不自兜底），
//      此处原留着自带的 DESTRUCTIVE 工具名正则 ⇒ 与字典读法分裂＝安诊断的「三张表各说各话」。
//   ④ 归位（权限位）：`no-system-destruction` 旧实现把「意图」读成**一个具体权限值**（`0+`），
//      于是同命令同动词、只差一个数字：`chmod -R 000 /` → deny 而 `chmod -R 777 /` → allow。
//      现按**作用域类型**判：容器型（裸根/系统目录根）与取值无关；单文件型（shadow/passwd）仅端点。
//   ⑤ 噪声守卫（防 review 通胀）：只读**动作位**的词；**自由参数位的词不读** ——
//      `echo "remove the old file"` 里的 remove 是**数据**，不得读成动作（"提到" ≠ "在做"）。
//   ⑥ 二裁（安 09-23 · 根因层）：「字典、词典、成语字典等等，都是语言工具，可以归纳到一起
//      总结为**一个 S 点**，而不是分开。分开以后就又降维成 X 轴了。所以，这本身就是 S 的内部套嵌法。」
//      ⇒ 实现从「三条并列通道」改为**一个查典法则递归下降**（同一个函数、粒度不同）。
//      ⇒ 由此修掉"线性扫 token"的**宿主依赖**：同一数据位换个宿主不再翻转判词。
//   ⑦⑧ 第三/四粒度（安「能做的全部先做了」后自补）：**子命令位**（槽位2）× 自由路径宾语；
//      **数据边界**（引号内＝数据，不参与位置判定；解释器段引号内是**代码**，例外保留）。
//   ⑨ 第五层「成语」＝固定搭配整体语义，只能**收录**不可推导（词形同族、语义相反）。
// 证据：`_stash/dsh-probes/dict-as-s.mjs` 同案对照（CN HEAD 原始副本 vs 补后，60 条）
//       —— 判词变化恰 5 处、全为目标修复；对照组 0 漏拦；正常命令误伤 1/26 前后不变（零新增）；
//       与 EN 仓同案一致率 58/60（余 2 条为两仓推演层代际差，非本次引入）。

import test from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';
import { attributeCall, commandLayer } from '../src/core/attribution.mjs';

const RT = (cmd) => ({ name: 'run_task', args: { command: cmd } });
const SH = (cmd) => ({ name: 'bash', args: { command: cmd } });
const J = (cmd, mk = RT) => new WeiwenLawEngine().decideToolCall(mk(cmd)).kind;   // 每条开新实例：隔离破窗累积

// ── ① 异体字：同一不可逆破坏的换写法 ⇒ 与 rm -rf / 同判（旧实现：全部 allow） ──
test('异体字同判 deny：remove_tree / FileUtils.rm_rf / --remove-files 与 rm -rf / 同判', () => {
  const cases = [
    "perl -e 'remove_tree(\"/\")'",
    "ruby -e 'FileUtils.rm_rf(\"/\")'",
    'tar -cf /dev/null --remove-files /',
  ];
  for (const c of cases) {
    assert.equal(J(c), 'deny', `RT 形态应 deny：${c}`);
    assert.equal(J(c, SH), 'deny', `SH 形态应 deny：${c}`);
  }
  assert.equal(J('rm -rf /'), 'deny');   // 对照：同判
});

// ── ② 词典为唯一读法：剥离结果本身必须读出来（否则下游无从消费） ──
test('字典读法归位：commandLayer 对同义写法返回 exec-destructive，且 attributeCall 同源', () => {
  assert.equal(commandLayer("perl -e 'remove_tree(\"/\")'"), 'exec-destructive');
  assert.equal(commandLayer("ruby -e 'FileUtils.rm_rf(\"/\")'"), 'exec-destructive');
  assert.equal(commandLayer('tar -cf /dev/null --remove-files /'), 'exec-destructive');
  // 注：**名字语法优先**是 CN 既有行为（工具名能归出语义层时不查命令），故此处用**中性名**
  // 强制走命令层——锁的性质是「命令层与字典同源」，不是「工具名归类」。
  assert.equal(attributeCall({ name: 'tool_42', args: { command: "perl -e 'remove_tree(\"/\")'" } }).layer, 'exec-destructive');
});

// ── ③ 权限位：按**作用域类型**判（容器型与取值无关 / 单文件型仅端点） ⇒ 同判；常规档不误伤 ──
test('多音字归位：权限推至极端同判 deny；中间常规档不得 deny（防误伤运维）', () => {
  assert.equal(J('chmod -R 000 /'), 'deny');
  assert.equal(J('chmod -R 777 /'), 'deny');          // 旧实现：allow（只差一个数字）
  assert.equal(J('chmod 000 /etc/shadow'), 'deny');
  assert.equal(J('chmod 777 /etc/shadow'), 'deny');
  // **同一效果的其他写法** —— 全部须 deny（写法无关＝效果有关）
  for (const c of [
    'chmod -R 0 /',            // 单位数
    'chmod -R 0777 /',         // 前导 0
    'chmod 777 -R /',          // 选项后置（旧正则只认前置）
    'chmod --recursive a-rwx /',
    'chmod -R ugo+rwx /',
    'chmod -R a= /',
    'chmod -R 666 /',                    // 容器型作用域：取值不端点也是同一种摧毁（统一模式只对单文件成立）
    'chmod -R o+rwx,g+rwx,u+rwx /',      // 多条符号子句**合起来**才全开
    'find / -type f -exec chmod 000 {} +',
  ]) assert.equal(J(c), 'deny', `同一效果的其他写法须同判 deny：${c}`);
  // 常规档：不得判 deny
  for (const c of ['chmod -R 755 /etc/nginx', 'chmod 700 /etc/shadow', 'chmod 644 /etc/hosts',
    'chmod 755 /app/run.sh', 'chmod -R u+w /etc/app', 'chmod -R g-w /etc/app']) {
    assert.notEqual(J(c), 'deny', `常规权限档不得 deny：${c}`);
  }
});

// ── ④ 噪声守卫：自由参数位的词是**数据**，不得读成动作（否则"提到"即"在做" ⇒ review 通胀） ──
test('噪声守卫：叙述/参数里出现删除词不构成动作', () => {
  for (const c of ['echo "remove the old file"', 'grep -r "delete" src', 'echo "purge cache later"', 'cat notes-about-remove.md']) {
    assert.notEqual(J(c), 'deny', `不得把数据读成动作：${c}`);
    assert.notEqual(commandLayer(c), 'exec-destructive', `数据不得读成破坏动作：${c}`);
  }
});

// ── ⑤ 对照：既有拦截不得塌方（工具名封闭集那一半仍在） ──
test('对照组保持拦截：工具名封闭集（rm/dd/格式化/git 破坏）不塌方', () => {
  assert.equal(J('rm -rf /'), 'deny');
  assert.equal(J('dd if=/dev/zero of=/dev/sda bs=1M'), 'deny');
  assert.equal(J('git reset --hard'), 'deny');
});

// ── ⑥ 零误伤：日常开发命令不得 deny ──
test('日常命令零误伤（不得 deny）', () => {
  for (const c of ['ls -la', 'git status', 'git diff --stat', 'npm test', 'grep -r "lexicon" src',
    'du -sh node_modules', 'tar -czf /tmp/backup.tgz src/', 'cp src/a.mjs /tmp/b.mjs',
    'node --test test/', 'python3 -m pytest', 'sed -i "s/a/b/" src/x.mjs', 'find ./src -name "*.mjs"']) {
    assert.notEqual(J(c), 'deny', `不得误伤：${c}`);
  }
});

// ── ⑦ 套嵌法则：一个 S 在三个粒度上重复（安 09-23 二裁） ──
// 这一组锁的**不是某几条命令**，而是那条结构性质：
//   进解释器后**递归走同一个「动作位判据」**（套嵌），而不是"段内任何 token 命中即判"（线性扫）。
//   ⇒ 判词**不得取决于宿主形态**（旧线性扫法的病：同一数据位换个宿主就翻判词）。
test('套嵌法则：解释器段内动作位命中、数据位不读，且判词不取决于宿主形态', () => {
  // (a) 段内**动作位**（代码段首词 / 调用名）⇒ 与段级同判
  for (const c of [
    "bash -c 'rm -rf /'",
    "perl -e 'remove_tree(\"/\")'",
    "ruby -e 'FileUtils.rm_rf(\"/\")'",
    "node -e \"require('fs').unlinkSync('/etc/passwd')\"",
  ]) assert.equal(commandLayer(c), 'exec-destructive', `解释器段内动作位须读作破坏：${c}`);

  // (b) 段内**数据位** ⇒ 不得读成破坏动作（旧线性实现会误判，本锁防它回归）
  for (const c of [
    "bash -c 'echo delete-me'",
    "python3 -c \"print('delete')\"",
    "perl -e 'print \"remove\"'",
  ]) assert.notEqual(commandLayer(c), 'exec-destructive', `解释器段内数据位不得读成破坏动作：${c}`);

  // (c) 结构性对照：**同一语义位**换宿主 / 换成叙述句，读法必须一致
  const same = ["echo \"remove the old file\"", "bash -c 'echo remove-the-old-file'", "sh -c 'echo delete-me'"];
  assert.equal(new Set(same.map((c) => commandLayer(c))).size, 1,
    '同一数据位换宿主，读法必须一致（否则是按宿主形态判，不是按角色判）');
});

// ── ⑧ 第三粒度：**子命令位**（槽位 2）× **自由路径宾语** ──
// 结构理由（**不靠工具名单**）：`kubectl delete pod`（删抽象资源）与 `deploy purge /var/www`（删文件树）
//   **词素同族、判词相反** ⇒ 分界在**该段有没有文件系统落点**（删除动作必须有一个可删的路径）。
test('子命令位 × 自由路径宾语：陌生工具名也须判（不靠名单）；非路径宾语不得误判', () => {
  for (const c of ['mydeploy purge /var/www', 'backupctl delete /backup/2025', 'toolshed remove /data']) {
    assert.equal(commandLayer(c), 'exec-destructive', `子命令位破坏 + 路径宾语须读作破坏：${c}`);
  }
  for (const c of ['kubectl delete pod nginx', 'redis-cli DEL session:1', 'docker rmi alpine:latest', 'nomad job delete web']) {
    assert.notEqual(commandLayer(c), 'exec-destructive', `删抽象资源不得读作文件系统破坏：${c}`);
  }
  assert.notEqual(commandLayer('kubectl delete -f /manifest.yaml'), 'exec-destructive');
  assert.equal(commandLayer('/bin/rm -rf /'), 'exec-destructive');
  assert.notEqual(commandLayer('cp /usr/bin/purge /tmp/backup'), 'exec-destructive');
});

// ── ⑨ 第四粒度：**数据边界**（引号内 ＝ 数据，不参与位置判定）──
// 根因：共用分词器把引号当普通分隔符剥掉 ⇒ "是否在引号内"在分词阶段就丢，
//   位置判据无从区分「动作」与「**被谈论的动作**」（实测：`grep -r "rm -rf" /var/log` 被读成破坏）。
//   ⚠️ 例外（防过度修正）：**解释器段**的引号内是**代码**，递归通道用**原文**。
test('数据边界：引号内是数据不参与位置判定；但解释器段引号内是代码须照样读', () => {
  for (const c of ['grep -r "remove" /var/log', 'echo "delete /etc/config"', 'grep -r "purge" /var/log', 'echo "call remove_tree()"']) {
    assert.notEqual(commandLayer(c), 'exec-destructive', `引号内数据不得读成破坏动作：${c}`);
  }
  for (const c of ["bash -c 'rm -rf /'", "perl -e 'remove_tree(\"/\")'", "node -e \"require('fs').unlinkSync('/etc/passwd')\""]) {
    assert.equal(commandLayer(c), 'exec-destructive', `解释器段引号内是代码，不得被数据边界吞掉：${c}`);
  }
  // **工具名正则线**（rm|dd|mkfs|…）同样适用数据边界 —— 消 "提到工具名" 的 review 通胀
  for (const c of ['grep -r "rm -rf" /var/log', 'sed -n "/rm -rf/p" /etc/history', 'grep -r "dd if=" /var/log', 'echo "run rm -rf /tmp/x"']) {
    assert.notEqual(commandLayer(c), 'exec-destructive', `引号内"提到工具名"不得读成破坏动作：${c}`);
  }
});

// ── ⑩ 第五层：**成语**（固定搭配的整体语义）—— 只能「收录」，不可推导 ──
// `rsync --delete`（真删除）与 `docker run --rm`（容器清理）**词形同族、语义相反**，
//   字级/词级都推不出来 ⇒ 以 **(宿主, 选项)** 为键**收录**。
test('成语层：固定搭配按 (宿主, 选项) 收录；真删除的选项位不得被豁免波及', () => {
  for (const c of ['docker run --rm alpine echo hi', 'podman run --rm alpine ls', 'docker run -it --rm ubuntu bash']) {
    assert.notEqual(commandLayer(c), 'exec-destructive', `容器清理选项不得读作文件系统破坏：${c}`);
  }
  for (const c of ['rsync -a --delete /src/ /dst/', 'rsync -av --delete src/ dst/', 'tar -cf /dev/null --remove-files /']) {
    assert.equal(commandLayer(c), 'exec-destructive', `文件系统真删除的选项位不得被豁免：${c}`);
  }
});

// ── ⑪ 中文句层：无分词符 ⇒ 动作位不靠"首词"，靠**词典子串 + 落点判据** ──
// 安 09-23：「成语＝**浓缩的事件**…未来某个 D 出现时，那个成语或那个事件触发，互相映射，就有解了。」
// 中文是孤立语（无分词符）：`把 /data 目录删掉` 按空格切 → 动作位落在"把"上 ⇒ **整句看不见动词**。
// 而字层 `nameLayer` 早有解法（词典子串扫描），只是**没套嵌到句层** ⇒ 此处锁的是**套嵌本身**。
test('中文句层：同一语义换语序读法必须一致（判据是词典子串+落点，不是词序）', () => {
  // (a) 把字句 / 动补结构（动词不在首）⇒ 必须照样判为破坏动作
  for (const c of ['把 /data 目录删掉', '递归删除 /home/user', '把 /srv 清空']) {
    assert.equal(commandLayer(c), 'exec-destructive', `中文动词不在句首时不得漏读：${c}`);
  }
  // (b) **落点判据**：无文件系统落点 ⇒ 不得判破坏（"提到" ≠ "在做"）
  for (const c of ['清理一下缓存', '清一下屏幕', '统计删除行数', '查看删除历史']) {
    assert.notEqual(commandLayer(c), 'exec-destructive', `中文无路径落点不得读成破坏动作：${c}`);
  }
});

// ── ⑫ 成语层＝**事件条目**：浓缩事件由条目**展开**成四槽，未收录的不得乱判 ──
test('成语即事件：收录的浓缩事件判破坏；未收录的不得臆测', () => {
  // (a) 已收录（作用域/结果**压缩在词里**，无路径落点）⇒ 由条目展开后判破坏
  assert.equal(commandLayer('删库跑路'), 'exec-destructive', '已收录的浓缩事件须由条目展开判出');
  // (b) **未收录**的成语不得臆测 —— 判不出就交常规判据，不猜
  for (const c of ['釜底抽薪', '斩草除根', '毁尸灭迹']) {
    assert.notEqual(commandLayer(c), 'exec-destructive', `未收录成语不得臆测为破坏：${c}`);
  }
});
