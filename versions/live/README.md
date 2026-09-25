# 活系统版（Live Version）演进区

> 本目录承载唯稳律的**活系统版（DSH）演进与实测证据**，与仓库根目录的**基础版门面**（README / DESIGN / src / test）物理隔离。
> 基础版（导图 / 心法层）定义不可变；本目录只记录活系统版在 DSH 形态下的演进与实证，不修改根目录任何定义层文件。

## 结构

- `evidence/` —— 在本仓 DSH `engine.mjs` 上的实测证据，可复验：
  - `INDEX.md` 实测总表（场景 / 模式 / 模型 / 存活 / BugStop / 费用）—— **条目数以本表为准**（此处不写死数字：写死的必过期）
  - `findings.md` 硬性发现（凭据缺口 / M 闭环 / 真实模型顺从性 / 成本结构 / 决策解释域）
  - `results/` 原始裁决数据（report JSON）
  - `transcripts/` 交互实录（chat HTML）
  - `legal-causal-test/` 法域外推对照：探针脚本 + 报告
  - `sd-fusion-mirror/` S/D 融合对照：探针脚本 + 真模型实测报告（2026-09-25 由仓库根目录归位）

> 路径迁移注：`sd-fusion-mirror/fusion-api-probe-report.json` 原文内 `howToVerify` 提到的 `evidence/…` 是**归位前**的位置。**证据层原文不改写**（记的是"当时记录了什么"），故迁移只记在这里。

## 分层关系

基础版（心法）→ 完整版 → 活系统版（DSH）。本目录属于活系统版，DSH 依据活系统版构建，不等于基础版，请勿混淆。
