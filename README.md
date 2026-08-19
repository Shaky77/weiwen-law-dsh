# dsh-weiwen-law-plugin

唯稳律（Weiwen's Law）白箱风控插件 —— 以 **DeepSeek Harness（DSH）** 的 Cordis 插件形态实现。

> 来源：作者揭示（夏祺 / Shaky77）。框架本体（RDSHM 原生定义 / 三大铁律 / 传导链）严格框架本位，不软化、不篡改。

## 它做什么

唯稳律是"因果律运行结构的白箱呈现工具"。本插件把它的运行结构挂到 DSH 的 Agent 运行层，提供：

- **硬性护栏**：每次动作前做 R 刚性锚点校验，触及即 D 破窗止损阻断；故障环节触发 M 第一 Bug 停机（以断保续），保整体因果链不断。
- **白箱自查**：S 稳态储备（只增不减）记账、H 内 H 边界（不可侵）声明，均暴露为可查询工具，供模型校准方向、供用户审计。
- **分形**：同一插件可在子代理 / 子任务层级递归挂载。

## 为什么是 DSH

DSH 的"一切皆插件"+ 可逆注册 + append-only 轨迹日志，与唯稳律的白箱定位同构：可逆注册天然实现"以断保续"，轨迹日志天然即可审计载体，模型无关则契合"对 AI/AGI/ASI 一视同仁"。

## 快速结构

```
package.json          # dsh 字段声明 bundle
weiwen-law.patch.yml  # 挂载补丁（headless profile overlay）
src/index.js          # 插件入口：钩子 + 5 个白箱自查工具
src/core/law.mjs      # 框架定义（RDSHM / 三大铁律 / R 层级 / 传导链）
src/core/engine.mjs   # 纯逻辑裁决引擎（零 DSH 依赖，可单测）
test/                 # 单元测试 + 真实案例测试（本地 37/37 通过）
DESIGN.md             # 架构设计（映射表 / 风险 / 使用流程）
```

## License

[AGPL-3.0](./LICENSE)
