# 活系统版（Live Version）演进区

> 本目录承载唯稳律的**活系统版（DSH）演进与实测证据**，与仓库根目录的**基础版门面**（README / DESIGN / src / test）物理隔离。
> 基础版（导图 / 心法层）定义不可变；本目录只记录活系统版在 DSH 形态下的演进与实证，不修改根目录任何定义层文件。

## 结构

- `evidence/` —— 多 Agent 交互压测台在 DSH `engine.mjs` 上的实测证据，可复验：
  - `INDEX.md` 实测总表（场景 / 模式 / 模型 / 存活 / BugStop / 费用）
  - `findings.md` 硬性发现（凭据缺口 / M 闭环 / 真实模型顺从性 / 成本结构 / 决策解释域）
  - `results/` 24 个 report JSON（原始裁决数据）
  - `transcripts/` 24 个 chat HTML（交互实录）

## 分层关系

基础版（心法）→ 完整版 → 活系统版（DSH）。本目录属于活系统版，DSH 依据活系统版构建，不等于基础版，请勿混淆。
