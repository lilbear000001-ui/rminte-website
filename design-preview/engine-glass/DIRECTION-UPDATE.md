# 方向更新（2026-10-05 晚）

用户确认：推理引擎玻璃动效采用**手写 WebGL2**（`engine-webgl2.html`），**不引入 three.js**；`BRIEF.md` 的 three.js 方案暂缓，现有 three.js 试点不再作为落地依据。

- 交接说明见设计画布第 20 板（推理引擎）与第 21 板（整机协同 TianshanOS）。
- `engine-webgl2.html`：引擎玻璃分层动效参考实现（单文件）。
- `../tianshanos-flat/index.html`：整机协同平面精修参考实现（纯 SVG，仅作视觉与动效参考，落地时保留现有 DOM 结构）。
- 尚未写入 `website/`；落地时再同步 DESIGN.md 与 docs/design-system-v2（D9）。
