# 贡献指南

感谢关注唯稳律 DSH 插件（`dsh-weiwen-law`）。

## 许可说明

本项目采用**双许可**：

- **开源使用**：AGPL-3.0
- **商业集成 / 闭源分发 / 预装合作**：独立授权协议，联系 563003@qq.com

完整声明见 [README 的 License & security](./README.md#license--security)。

## 关于 CLA

为支持上述双许可分发，外部贡献需签署 **CLA（贡献者许可协议）**，
将所贡献代码的著作权授权给项目方，用于双许可分发。

- 首次提交 PR 时会由 CLA 签署流程自动提示
- 未签署前，PR 的 CLA 状态检查不通过

> 注：CLA 自动签署流程正在接入中。接入完成前该检查不会自动触发，
> 但**提交 PR 即表示你接受本指南中的许可授权条款**，授权项目方按上述双许可分发你的贡献。

## 提交前请确认

- [ ] 改动不触及判据层（`src/core/engine.mjs` / `src/core/law.mjs` / `src/core/bugstop.mjs`）；若确需变更判据，请先开 issue 讨论
- [ ] 测试全绿：跑 `npm test`（即 `node --test "test/*.test.mjs"`），当前基线 **195/195 全绿**
- [ ] 新增场景已补充用例，且不改动、不删除既有测试
- [ ] 不引入新的运行时依赖（当前运行时依赖仅 `@deepseek-ai/dsh-tools`，peerDependency 且可选）

## 其他约定

- 因果链标准写法为 **R→S→D→H→M**（代号 `RSDHM`，字母序＝传导序）；**请勿使用旧写法 `RDSHM`**。
- 框架本体（心法层）冻结于基础版仓库（`Shaky77/Weiwen-s_Law`、`Shaky77/KISS-s_Law`），本活系统版只承载工程迭代。
- 提交 PR 时请附 `npm test` 的实测输出（tests / pass / fail 三行）。
