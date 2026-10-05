# CLAUDE.md

RMinte（rminte.com）企业官网仓库：RM-01 便携式 AI 超级计算机的官方网站。生产源码在 `website/`，由 Cloudflare Pages 从 `main` 部署。

## 开工前先读（按顺序）

1. `AGENTS.md`：工作方法与验收要求（修改、验证、交付、发布流程）。
2. `DESIGN.md`：设计规范。2026-10-03 已按设计系统 v2 更新；站点内 `website/DESIGN.md` 是简版，两者须同步。**其中 v2 规则除用户决定暂不做的几项外已按阶段实施：`design/v2` 分支已有阶段 0（令牌与性能）和阶段 1（首页首屏、硬件模块，点阵数字与 Geist Mono／Pixel 字体），阶段 2（动效：首屏入场、点阵数字点亮、倒角边光、焦点环；页面光圈转场已被用户舍弃）也已本地提交；阶段 3（首页其余章节、图册、模型、下载、指南、颗粒）用户已确认并本地提交，见 `docs/design-system-v2/Roadmap.md`；遥测栏、冷暖线以及下载列标题、NEW 标、指南阅读时间用户 2026-10-04 决定不做；自检修正（阶段 4：对比度、键盘与读屏、六语言版面、字体按语言加载、性能）用户已确认并本地提交；其中「减少动效下首页视频停在第一帧」「非首屏视频进入视口才加载」两项用户 2026-10-05 决定先不做；规范对照后的小改批（令牌与过渡令牌退役、悬停与按压、链接下划线、手机菜单与页脚统一等）和阶段 5（D8：OTA 与灯板工具）已在工作区实现、待用户确认，令牌现在集中在 `website/assets/brand.css`**，代码与规范不一致之处视为待实施项，不要把规范改回旧值来迎合代码。
3. `docs/design-system-v2/INDEX.md`：设计系统 v2 的细节（令牌、标志性语言、逐页规则、画板、评分、路线图）。与 `DESIGN.md` 不一致时以 `DESIGN.md` 为准，并同步修正文档。

## 与用户协作的规则

- 用中文回复，简洁，先给结论再给依据。
- 修改代码：先查明根因，复用现有实现，最小改动；不做无关重构，不加过度兜底。
- 目标、动机或范围存在关键歧义（删除数据、改接口、改依赖、改色彩方向或主要布局）先问；常规细节自行判断，不重复确认。
- 完成后先跑相关最小验证再交付；跑不了要说明原因；没验证过的结论要明说。
- **未经用户明确同意，不得 `git commit`、`git push` 或发布。** 用户已明确要求时才执行；发布前重新核实仓库、分支与部署配置。
- **发布顺序（要记住）：主站先于或同时与 OTA（`services/tianshanos-ota`）部署。** OTA 页的字体（Geist、中文字体子集、点阵数字、Quantify RM）从 `https://rminte.com/assets/fonts/` 取；只部署 OTA 的话，这些字体取不到，页面会退回系统字体（能用，但外观不对）。OTA 或 `brand.css` 改动后运行 `node scripts/build-service-brand.mjs`。
- 保留工作区已有修改。不得擅自 `checkout`、`reset`、`stash` 或清理；先看 `git status`，区分已有工作与本次修改。其中 `services/case-access/` 等未跟踪内容不是你的，不要碰。
- 审美重构若改变色彩方向、主要布局、关键影像入口或叙事方式，先出设计示范让用户确认，再改生产页面。

## 写作与文案规则

- 视觉任务不自动授权改文案、规格、售价、承诺、版权或下载材料。不凭空编写产品说明、参数或评测结果；需要文字时从仓库现有页面取原文，只排版不改字。
- 版权与页脚文案不擅自修改（拼写错误 Protable→Portable 已获授权并修正）。
- 价格定位只用于理解设计，不写成可发布的售价文案。
- 章节标签只写名称，不带 01–10 序号；下载与指南入口不显示分组数量或卡片序号、不加英文装饰小标题。
- 品牌名 `RMinte AI`、产品字标 RM-01 使用 Quantify RM（`.rm-mark`），不扩展到正文；正文中的 AI 沿用界面字体。
- 六语言（中文、EN、日本語、한국어、Español、Français）同步：新增或改动文案必须检查所有语言的含义与展示位置；日韩用对应字形字体。
- **中文文案与字体子集（要记住）：** 页面上的中文字体 Noto Sans SC 是只含站内用到的字的子集（`website/assets/fonts/`，2026-10-06 起英文与中文页面不再请求 Google Fonts）。新增或改动中文文案后，运行 `python3 website/scripts/build-fonts.py --check`；报缺字就运行 `python3 website/scripts/build-fonts.py` 重新生成，并把新的字体文件、`noto-sans-sc.css`、`noto-sans-sc.chars.txt` 一起提交。缺字不会空白、只会退回系统字体，不检查就发现不了。`assets/fonts/` 里的生成文件和 `brand.css` 的 `geist-faces` 一段不手改。需要 python3、fonttools、brotli。
- 灯板工具 `website/tools/emoji2pixel/` 的界面语言只保留中文和英文（用户 2026-10-05 决定，其余语言包已删除）；OTA 页本来就是中英切换。主站仍是六语言。
- 设计文档用中文，结论在前；评分与判断要写明是主观判断，未验证的项要单列；不把讨论中的方案写成强制标准，也不把本地实现写成已上线。
- 已确认的设计规则变化，同步更新根目录 `DESIGN.md` 与 `website/DESIGN.md`，并改写或删除被取代的规则；归入对应章节，不在末尾追加重复条款。

## 设计硬约束（摘要，细则见 DESIGN.md）

- 首页、图册、模型：纯黑 `#000000`；下载、指南：`#0D0F12`（面板 `#14171B`，阶段 3 已实施为 `support-theme`）；OTA 与灯板工具（D8，2026-10-05）同为 `#0D0F12`，只改视觉、不动功能与署名（灯板预览舞台纯黑）。
- 白色矢量 Logo，不描边不发光；界面字体 Geist／Noto Sans SC（由本站自己提供，日韩 Noto Sans 仍走 Google）；数字 Geist Mono；大数字 Geist Pixel（仅数字与单位）。
- 胶囊文字按钮（999px），面板 8px，控件 4px，大卡片 16px；图标 SVG、24 坐标系、1.6 线宽、圆角端点。
- 点缀色：蓝宝石信号色，只用于细线、焦点、选中、数值单位；不渐变、不发光、不做按钮底色；图册不使用。减少蓝紫渐变与装饰发光。
- 页面切换不做转场动画（用户 2026-10-04 看过光圈展开后决定舍弃）；动效以克制为准，新增醒目的动效先出原型给用户看。
- 必须保留：首页视频入口与自动播放、滚动分解、蓝宝石点亮（光线、遮罩、时序、亮度参数不动）、工艺切换、`prefers-reduced-motion` 支持。
- 图册：11 张原文件、`object-fit: contain`、完整展示；不加滤镜、叠层、颗粒、进度条、分隔线。
- 静态颗粒只在首页与模型页。
- 媒体：视频分辨率不变，只优化编码，且只限首页；PNG 转 WebP 只限首页；图册照片原文件不动；其他页面媒体不动，要动先问。
- 合作商像素工具 `website/tools/emoji2pixel/` 与 `services/` 下独立服务：除 D8 约定的 OTA 与灯板工具视觉外，只有任务明确涉及时才改，不因共用样式扩大范围（`services/case-access` 不在 D8 范围内）。

## 目录

- `website/`：正式站点源码（HTML、`assets/`、`locales/`、`guides/`、`gallery/`、`models/`、`downloads/`）。
- `design-preview/`、`copy-review/`、`output/`：本地方案、文案讨论与验证产物，不是生产依赖，其他检出中可能不存在。
- `docs/design-system-v2/`：设计系统 v2 文档、画板截图与可编辑源文件。
- `scripts/`：服务品牌构建脚本（`build-service-brand.mjs`）。站点脚本在 `website/scripts/`：`build-guides.mjs`（生成指南页）、`build-translations.mjs`、`extract-i18n.mjs`、`preview.mjs`。

## 验证入口

按 AGENTS.md 第 5 节分范围验收：页面改动必须有实际浏览器验证，共享样式检查所有引用页面与 1440／768／390／320px、中英文；改动的 JavaScript 做语法检查；中文文案改动后运行 `python3 website/scripts/build-fonts.py --check`（见上文“中文文案与字体子集”）。文案类改动更新 `assets/translations/*.js`（由 `build-translations.mjs` 从 `locales/` 生成，日韩西法各一个文件）或 `site-data.js` 时，同步更新各页面中对应的缓存版本号：`site-data.js` 的 `?v=`，语言包的版本在页头片段的 `RM_CATALOG.v`（指南页由生成脚本统一写入）。
