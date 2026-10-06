# 追加任务 ⑥：模型页场景卡片光段分级（给 Claude Code）

这是 `IMPLEMENT-MOTION.md`（①–④）和 `IMPLEMENT-NAV.md`（⑤）之后的小任务。原则相同：原型即验收标准，1:1 复刻，不加设计，不重构，不引入依赖，不 commit / push。

## 0. 不影响正在进行的工作

1. 你现在在调试 ①–⑤。**先把手上的调试做完**，再做本任务；本任务很小，单独做、单独汇报。
2. 开始前看 `git status` / `git diff`，在现有改动之上增量修改，不回退任何已有改动。涉及文件：`website/models/models.js`、`website/models/models.css`。其中 ③④ 已改过 `models.css`，保持它们不变，只追加本任务的规则。
3. 遇到冲突或拿不准，先问我。

## 1. 参考资料

| 内容 | 位置 |
|---|---|
| 对比原型 | `design-preview/case-card-light/case-card-light.html`（三段：A 常亮 / B 分级（采用）/ C 无光；用 B 段验收，页面顶部滑块仅用于调试，不带入） |
| 参数与决定 | Claude Design 画布 25 号板：https://claude.ai/artifact/GCX35x6TBTTRHvUhw7rSfX |
| 规范 | `DESIGN.md` 第 212、280 行已更新为分级规则，不需要你再改 |

## 2. 要做的事（只有这些）

**范围**：只改模型页「驱动专业 Agent」下的九张场景卡片（`.mp-case-card`）。首页模块卡片、指南入口卡片、两张模型卡片保持常亮 0.5，**不要动**。

**规则**：所有可点击卡片都带顶边光段，用亮度区分层级。场景卡片属于「成排并列入口」：

- 平时 `--ba: .18`；
- 悬停、`:focus-visible`、`aria-expanded="true"`（展开项）时 `--ba: .5`，过渡 240ms（`--dur-hover` / `--ease-settle` 对应的现有令牌）；
- 光段随指针横向移动，`--bw: 30%`、`--bi: 16px`、跟随惯性 0.14（全部沿用现有 `[data-bevel]` 默认值）；
- 触屏与减少动效：光段固定在中间，平时亮度 0.18，展开项仍为 0.5。

**实现要点**

1. `models.js` 生成卡片处（约 452 行，`button.className = 'mp-case-card'`）给 button 加 `data-bevel` 属性。`motion.js` 用事件委托（`closest('[data-bevel]')`），动态生成的卡片自动生效，无需改。
2. `models.css` 追加：`.mp-case-card { --ba: .18; }`，以及 `.mp-case-card:hover, .mp-case-card:focus-visible, .mp-case-card[aria-expanded="true"] { --ba: .5; }`；`--ba` 要过渡，需要 `@property --ba { syntax: "<number>"; inherits: true; initial-value: .5; }`（检查全站是否已注册，已注册则不要重复），并把 `--ba` 加进卡片现有的 `transition` 列表（保留原有的 `border-color`、`transform`）。
3. 卡片原有的悬停描边、上移 1px、展开背景 n-3、文案、图标、点击展开交互**全部不变**。

## 3. 验收与交付

- 同一视口（桌面 1440×900、手机 390×844）对照原型 B 段：平时的淡光段、悬停升亮并跟随指针、展开项保持亮、键盘 Tab 聚焦时升亮、减少动效下固定在中间。
- 确认首页、指南入口、两张模型卡片的亮度没有被改变；控制台无报错；现有测试和构建照常通过。
- 汇报：改动文件（行级摘要）、与原型的差异（应无）、已验证 / 未验证项。**不要提交。**
- 完成后在 `docs/design-system-v2/Roadmap.md` 把「D9 场景卡片光段」一行的状态改为「已在工作区实现，等待用户确认，未提交」。

**没有创意发挥空间，目标是与原型一致。**
