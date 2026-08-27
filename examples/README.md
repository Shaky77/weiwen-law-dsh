# 示例：对齐后的 API 实测

本目录提供两个可直接运行的 DeepSeek API 实测脚本，用于验证 `law.mjs` 对齐后的定义（逻辑反推与第一 Bug 停机分开并行、反推沿 R 尺度包含轴反溯）。

## 前置
- 在本地安全路径放置 DeepSeek API Key（一行，无换行），并在脚本顶部 `KEY_PATH` 常量指向该路径。
- Node ≥ 22，联网调用 `https://api.deepseek.com/chat/completions`。

## 脚本
- `demo-tool-loop.mjs`：原始复跑。模型调 `query_iron_laws`，基于工具原文返回三大铁律（验证引擎无回退、铁律一字不差）。
- `demo-backtrack-run.mjs`：对齐后复跑。模型调 `query_logic_backtracking`，基于对齐定义独立反推出层级路径与卡点层（细分规则层→微观→宏观→地球→宇宙，卡点落最内细分规则层，复验判前提失真）。

## 运行
```bash
node examples/demo-tool-loop.mjs
node examples/demo-backtrack-run.mjs
```

实证结论：框架本身未曾失灵；此前"判不出卡点"是 DSH 实现只挂停机、未挂反推（实现缺口）。对齐后把反推接进工具，模型经 API 即能沿 R 包含轴定位卡点。
