# 唯稳律（Weiwen's Law）· 法律因果跨法域实测

> 引擎：`dsh-weiwen-law-plugin/src/core/engine.mjs`（确定性因果护栏，零 LLM / 零法律知识）
> 实测时间：2026-08-27

## 核心结论：机制法域中性
无论美（陪审团）/ 英（陪审团）/ 中（法官）制度：
- well-formed 裁决 → **ALLOW**（S+1）
- 结构性破损裁决 → **DENY**（M 第一Bug停机）
- 语义矛盾裁决 → **REVIEW**（法院交叉复核打回人工）
- 对事实认定者的主体性侵入 → **H DENY**

陪审团 vs 法官 只落在 H 层的「谁决策」内容变量上，机制本身不依赖它。

## 方法说明
- 跑真实引擎代码，不是 LLM；引擎只认因果结构，对法律内容零知识 → 判定与法域无关。
- 对照此前 Coze 脚手架测试的弱点（LLM 参数记忆泄漏）。
- 诚实边界：引擎验证决策过程的因果可接纳性，不是判决实体对错。

## 实测结果
### A. Well-formed 裁决

| 案例 | 法域 | 制度 | 决策者 | 引擎裁决 | 触发律 | 理由 |
|---|---|---|---|---|---|---|
| Rittenhouse (Kenosha, WI, 2021) | US-WI | adversarial-jury | jury | **ALLOW** |  |  |
| Osborne v. Montgomery (WI, 1931) | US-WI | adversarial-jury | jury | **ALLOW** |  |  |
| Palsgraf v. LIRR (NY, 1928) — jury layer | US-NY | adversarial-jury | jury | **ALLOW** |  |  |
| R v. Alfie Franco (Leeds Crown Ct, 2025) | UK-ENG | adversarial-jury | jury | **ALLOW** |  |  |
| R v. Aurin Makepeace (Chester Crown Ct, 2026) | UK-ENG | adversarial-jury | jury | **ALLOW** |  |  |
| 最高法指导案例190号（竞业限制·新单位） | CN | inquisitorial-judge | judge(collegial) | **ALLOW** |  |  |
| 最高法指导案例170号（危房租赁） | CN | inquisitorial-judge | judge(collegial) | **ALLOW** |  |  |
| 最高法指导案例237号（骑手劳动关系） | CN | inquisitorial-judge | judge(collegial) | **ALLOW** |  |  |

### B. 结构性破损裁决

| 案例 | 法域 | 制度 | 决策者 | 引擎裁决 | 触发律 | 理由 |
|---|---|---|---|---|---|---|
| Rittenhouse (Kenosha, WI, 2021) | US-WI | adversarial-jury | jury | **DENY** | M | 第一 Bug 停机（双线复核一致确认）：DSH 契约标志命中不可恢复逻辑悖论/结构性故障，触发第一 Bug 停机（切断该环节、横向重启，保整 |
| R v. Alfie Franco (Leeds Crown Ct, 2025) | UK-ENG | adversarial-jury | jury | **DENY** | M | 第一 Bug 停机（双线复核一致确认）：DSH 契约标志命中不可恢复逻辑悖论/结构性故障，触发第一 Bug 停机（切断该环节、横向重启，保整 |
| 最高法指导案例190号（竞业限制·新单位） | CN | inquisitorial-judge | judge(collegial) | **DENY** | M | 第一 Bug 停机（双线复核一致确认）：DSH 契约标志命中不可恢复逻辑悖论/结构性故障，触发第一 Bug 停机（切断该环节、横向重启，保整 |

### C. 语义矛盾裁决

| 案例 | 法域 | 制度 | 决策者 | 引擎裁决 | 触发律 | 理由 |
|---|---|---|---|---|---|---|
| Osborne v. Montgomery (WI, 1931) | US-WI | adversarial-jury | jury | **REVIEW** | M | M 双线复核不一致（治标=halt / 治本=pass）：结论冲突，打回重审，建议人工/二次确认 |
| R v. Aurin Makepeace (Chester Crown Ct, 2026) | UK-ENG | adversarial-jury | jury | **REVIEW** | M | M 双线复核不一致（治标=halt / 治本=pass）：结论冲突，打回重审，建议人工/二次确认 |
| 最高法指导案例170号（危房租赁） | CN | inquisitorial-judge | judge(collegial) | **REVIEW** | M | M 双线复核不一致（治标=halt / 治本=pass）：结论冲突，打回重审，建议人工/二次确认 |

### D. H 侵入（陪审团 / 法官）

| 案例 | 法域 | 制度 | 决策者 | 引擎裁决 | 触发律 | 理由 |
|---|---|---|---|---|---|---|
| Rittenhouse (Kenosha, WI, 2021) | US-WI | adversarial-jury | jury | **DENY** | H | 触及内 H 黑箱（思想/自由意志），违反"内 H 不可侵"。 |
| 最高法指导案例237号（骑手劳动关系） | CN | inquisitorial-judge | judge(collegial) | **DENY** | H | 触及内 H 黑箱（思想/自由意志），违反"内 H 不可侵"。 |


## 陪审团变量：H 层的「谁决策」内容变量
Palsgraf (1928, NY)：陪审团认定事实，法官以「责任是法律问题」推翻。
在唯稳律里这是 H 层两个并列且都合法的子节点（H_fact=jury, H_law=judge），
引擎对二者施加同一套因果结构判据。支持陪审团制 = 把事实认定角色配给 jury；支持法官制 = 配给 judge(collegial)。
**这是领域配置，不是引擎改动。**

## 可对外主张 / 不可主张
- ✅ 机制法域中性（已实证）；部署到国外只需改领域配置，不动引擎。
- ❌ 不主张「引擎判判决对错 / 判 guilt」；不主张「纯因果推出正确判决」（含 LLM 知识泄漏风险）。
