# 动效落地指令（给 Claude Code）

目标：把已确认的 4 个动效 **1:1 复刻** 到 `website/`。不新增设计、不改效果、不顺手优化。

## 0. 总原则（最高优先级）

1. **原型就是验收标准。** 下列原型文件里看到的画面与动效，就是要做出来的东西。不要"理解后重写"，不要换实现思路，不要引入原型里没有的元素或动效。能直接搬的代码（shader、关键帧、参数、坐标）直接搬，只做嵌入现有页面所必需的改动。
2. **不引入依赖。** 不用 three.js 或任何新库（`BRIEF.md` 里的 three.js 方案已作废，以 `DIRECTION-UPDATE.md` 为准）。
3. **保留现有 DOM、class、aria、i18n 键与交互。** 只在其上增加节点、样式、脚本。不动无关代码，不重构。
4. **只做必要的健壮性**：`prefers-reduced-motion`、WebGL2 不可用时的静态回退、离屏暂停。不加其他兜底。
5. **不要 git commit / push，不要发布。** 改完留在工作区，由我检查后提交。
6. 有歧义（要改接口、依赖、删数据）先问我；常规细节自行判断。
7. 回复用中文，简洁，先结论后依据。

## 1. 参考资料（先读完再动手）

| 内容 | 位置 |
|---|---|
| 方向说明 | `design-preview/engine-glass/DIRECTION-UPDATE.md` |
| ① 首页引擎玻璃原型 | `design-preview/engine-glass/engine-webgl2.html` |
| ② 首页 TianshanOS 原型 | `design-preview/tianshanos-flat/index.html` |
| ③ 模型页稠密/稀疏原型 | `design-preview/models-motion/dense-sparse-motion.html`（底图引用 `website/models/model-glass-a.png`） |
| ④ 模型页专用引擎原型 | `design-preview/models-motion/engine-stack-motion.html` |
| 参数与交接说明 | Claude Design 画布 20、21、22、23 号板：https://claude.ai/artifact/GCX35x6TBTTRHvUhw7rSfX |
| 设计规范 | `DESIGN.md`（含 D8；不模拟封装引脚、字号、模糊 2.5px→0 450ms 等） |

画布板里的"落地建议"和"关键参数"必须逐条遵守。

## 2. 四个任务

### ① 首页「让算力，承载更多任务」
- 在现有位置（约 `index.html` 128–146、`styles.css` 2826–2880、`main.js` 290–330，以实际为准）替换为原型的手写 WebGL2 玻璃分层效果。
- 搬：渲染管线、palette、三个主题场景、交互、动画参数；原型里的 `?lite/?still` 调试开关不要带入。
- 回退：WebGL2 不可用或 reduced-motion 时显示静态首帧（用原型渲染出的一帧或现有静图）。

### ② 首页「让整机协同有序」（TianshanOS）
- 保留 `assets/home-architecture.js` 的现有 DOM（HTML 按钮 + SVG 连线，`data-part`、`data-lit`、`aria-pressed`）与点击聚焦逻辑。
- 叠加原型里的：线上常驻流光（点亮后蓝宝石色并加快）、焊盘、南北向数据包、OTA 序列（ESP32→W5500→RTL8367RB，1/2/3 序号，循环 5.4s）、三层鼠标视差（线 ±1.5px、模块 ±5.5px、文字 ±7.5px）。
- 字体：「TianshanOS」用站内 Quantify RM；字号、模糊与过渡严格按 DESIGN.md 与画布 21 号板。图在右、文字在左的现有布局不变。
- 数据包沿现有 routes 取点（`getPointAtLength`）；视差要同步位移与 SVG 共用容器的 HTML 模块。

### ③ 模型页「专业分析，更深入」（稠密/稀疏）
- 底图仍是 `models/model-glass-a.png` + 现有 clipPath，**不重画、不换成实时渲染**。
- 在 `models/index.html` 53–83 行的两个 `svg.mp-glass-stack` 内加：亮度遮罩（mask）、各层叠加组（流光、扫光、MoE 14 个方块明灭）、待机漂浮，展开过渡改为 1.1s（上叠延迟 0.07s、下叠 0.12s）。名字只留 RMQ3x、RMQ4，不加文字。
- 坐标、渐变、随机规则逐项按画布 23 号板和原型。图片只引用一次，不内嵌 base64。

### ④ 模型页「专用引擎，释放模型性能」
- 保留现有三层 CSS 3D 玻璃叠层、tab、右侧文字与 `models.js` 的 `selectEngine` 逻辑。
- 按原型改：画面加宽（宽高比 1.5、栏比 1.32fr/1fr、叠层 80%×52%）；加光块穿层、线与格子脉冲；C++ 态格子合拢 + 亮核 + 「2 MB」计数；vLLM 态格子展开 + 两格抬起替换 + 「FlashInfer · 融合 MoE」标签。
- 「2 MB」用站内 **Geist Pixel**（原型用等宽字体兜底，这是唯一允许与原型不同的地方）；补 zh/en 文案键：en 为 "Runner resident memory / Excludes weights, KV cache and context"。
- 计数在进入视口和切回 C++ 时触发；多语言（ja/ko/es/fr）标签位置要检查。

## 3. 工作方式

1. 逐个任务做，顺序 ④ → ③ → ② → ①（由易到难）。每完成一个先自检再做下一个。
2. **逐帧对照验收**：用 Playwright 在与原型相同的视口（桌面 1440×760）分别打开原型与落地页，同状态截图并对比（默认、交互后、tab 切换后）。不一致就改到一致，再继续。
3. 另外检查：手机宽度、reduced-motion、控制台无报错、无布局溢出、无障碍属性未丢失、`npm`/构建/现有测试照常通过。
4. 真机 GPU 的帧率你测不了，请明确写"未验证"，并指出 ① 与 ③ 的性能风险点；不要自行删减效果来"优化"，需要降级时来问我。

## 4. 交付格式

每个任务一段：改了哪些文件（行级摘要）、与原型的差异（应只有 Geist Pixel 与图片引用方式）、已验证 / 未验证项、截图对比结论。全部完成后给出我需要手动检查的清单。

**再次强调：没有创意发挥空间，目标是与原型一致。**
