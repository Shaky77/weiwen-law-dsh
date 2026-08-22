# 中英文 DSH 对齐与偏差比对报告（Alignment & Deviation Report）

> 生成日期：2026-08-22
> 对象：中文版 `weiwen-law-dsh`（`dsh-weiwen-law-plugin`）/ 英文版 `KISS_Law-DSH`（`dsh-kiss-law-plugin`）
> 方法：静态逐文件 diff + 复杂环境加载测试（模拟 Cordis ctx，无真实 API 调用）

## 结论

**两版功能完全同构，无实质性偏差。** 英文版经补全后，与中文版在以下维度一致：

| 维度 | 中文版 | 英文版 | 一致 |
|---|---|---|---|
| 核心引擎 `engine.mjs` 裁决逻辑（R/D/S/H/M） | ✅ | ✅ | 是（仅字符串/注释翻译） |
| 第一 Bug 停机闭环 `bugstop.mjs` | ✅ | ✅（补全） | 是 |
| 插件入口 `index.js` 三 hook 挂载 | ✅ | ✅ | 是 |
| 白箱自検工具（6 个） | ✅ | ✅ | 是（命名语言化，语义同构） |
| 复杂环境加载测试 | 49/49 | 58/58 | 是（英文版含额外 5 个 hook 集成测试） |

## 本轮补全内容（英文版缺失项）

英文版在补全前**存在功能性缺口**（非语言差异），已修复：

1. **缺 `bugstop.mjs` 模块** —— 中文版 2026-08-21 补全的"第一 Bug 停机"状态机（halt→reverse→trace→resolve→canReenter），英文版完全缺失。已创建英文翻译版。
2. **引擎未实例化 `BugStopGuard`** —— `engine.mjs` 缺 `import` + `this.bugStop = opts.bugStop ?? new BugStopGuard()`。已补。
3. **`decideToolCall` M 分支缺 `canReenter` 前置闸门** —— 导致"带原 BUG 重跑"无法被拦截（无限递归风险）。已对齐中文版加 `canReenter` 前置。
4. **`index.js` 缺 `query_bugstop` 工具注册** —— 白箱可观测性缺口。已补。
5. **缺 `bugstop.test.mjs`** —— 已补（翻译版）。

## 本轮两版共同修复（真实 dsh 运行环境对接）

发现并修复一个**两版共有、此前未被测试覆盖**的真实 bug：

- **第一 Bug 结构性标志未透传到引擎**：DSH 运行时将 `selfReference/paradox/deadlock/contradiction/paramTypeError` 放在 `exec.arguments` 上，而引擎 `checkFirstBug` 从 `call` 顶层读取。原 `index.js` 构造 `call` 时未提取这些标志 → 真实 dsh 环境下 paradox/自引用**无法被识别为第一 Bug**。
- **deny 返回丢失闭环字段**：`index.js` 的 deny 分支重写返回 `{kind,reason}`，丢弃了引擎返回的 `bugKey/closedLoop/missing/stage` → 调用方（dsh）拿不到闭环信息。已改为透传。

两版 `index.js` 均同步修复，保持同构。

## 语言差异（非偏差，符合中英对齐原则）

- 标识符：`weiwen-law` vs `kiss-law`；工具名中文（`query_iron_laws`）vs 英文（`list_rigid_anchors` 等），语义一一对应。
- 引擎内 H 拦截词：英文版额外含英文入侵词（`read|access|mind|memory` 等）+ `/i` 大小写不敏感，因面向英文 Agent；中文版仅中文词。属合理语言适配。
- 日志/拒因前缀：`[唯稳律·X]` vs `[KISS's Law·X]`。

## 测试命令

```bash
# 英文版
node --test test/*.test.mjs        # 58 pass
# 中文版
node --test test/*.test.mjs        # 49 pass
```
