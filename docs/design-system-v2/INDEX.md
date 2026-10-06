# RMinte 官网设计系统 v2

方向已确认（D1–D7，D8 与 D9 后续追加），规范已并入根目录 `DESIGN.md`；两者不一致时以 `DESIGN.md` 为准。

**发布状态（2026-10-07）：** 设计系统 v2 阶段 0–5、字体自托管及 D9 动效、导航与弹层、场景卡片光段已完成本地提交，用户已授权同步 massif 仓库、更新上游 PR 并部署主站与 OTA。发布准备已开始；实际线上版本以 GitHub 提交与 Cloudflare 部署核验为准。保留的暂缓项为遥测栏、冷暖线、下载列标题与 NEW 标、指南阅读时间、减少动效下首页视频停在第一帧、非首屏视频进入视口才加载。

## 阅读顺序

1. [README.md](README.md)：目标、现状、已确认决定（D1–D8）、与现行 DESIGN.md 的差异。
2. [Audit.md](Audit.md)：现状诊断，八个问题与证据。
3. [Tokens.md](Tokens.md) 与 [tokens.json](tokens.json)：色阶、字阶、间距、圆角、动效、组件。
4. [Signature.md](Signature.md)：五个标志性手法及其边界。
5. [Pages.md](Pages.md)：首页、图册、模型、下载、指南入口、指南正文逐页规则。
6. [Media.md](Media.md)：视频与图片的处理边界。
7. [Scorecard.md](Scorecard.md)：Awwwards / Webby / FWA 自评分与自检记录。
8. [Roadmap.md](Roadmap.md)：实施阶段、未完成项、验收清单。

## 目录

- `boards/`：设计画布各画板的截图（PNG），按画布编号排序，可直接看。
- `source/canvas/`：设计画布可编辑源文件（`*.dc.html`、`canvas.json`）。`.dc.html` 是设计画布的组件格式，需用设计画布工具打开和发布，不能当普通网页使用。
- `source/tools/`：渲染截图与占位符替换脚本，是制作过程的记录，不是网站构建的一部分。
- 在线画布「RMinte 官网设计方案」在作者的 claude.ai 账号里，私有；本目录是它的离线副本。
- 字体文件不在本目录：Quantify RM 为付费授权字体；Geist、Geist Mono、Geist Pixel 为 OFL 开源。其中 Geist Mono（Regular）与 Geist Pixel（Circle）已在阶段 1 放进 `website/assets/fonts/`，许可文本在 `website/assets/licenses/geist-OFL.txt`。2026-10-06 起 Geist（Google 提供的 Latin 切片原文件）和 Noto Sans SC（裁成站内用到的汉字，许可文本 `notosanssc-OFL.txt`）也由本站提供，生成脚本 `website/scripts/build-fonts.py`；只有日文、韩文的 Noto Sans 还走 Google Fonts。

## 画板对照

| 编号 | 画板 | 文件 |
| --- | --- | --- |
| 01 | 现状风格总结 | boards/Main.png |
| 02 | 诊断、评分与决定 | boards/Review.png |
| 03 | 设计规范 v2 | boards/Spec.png |
| 04 | 首屏 | boards/Hero.png |
| 05 | 硬件模块 | boards/Hardware.png |
| 06 | 手机首屏 | boards/Mobile.png |
| 07 | 子页面诊断与规则 | boards/Pages.png |
| 08 | 标志性设计语言 | boards/Signature.png |
| 09 | 图册 | boards/Gallery.png |
| 10 | 模型页 | boards/Models.png |
| 11 | 下载中心 | boards/Downloads.png |
| 12 | 指南入口 | boards/Guides.png |
| 13 | 指南正文 | boards/GuideDoc.png |
| 14 | 底色对比（D6） | boards/BgCompare.png |
| 15 | 指南正文 · 手机 | boards/GuideMobile.png |
| 16 | 指南正文 · 续（第 2–3 章） | boards/GuideDocB.png |
| 17 | OTA 更新服务（D8） | boards/Ota.png |
| 18 | 灯板工具 · 已载入（D8） | boards/Lamp.png |
| 19 | 灯板工具 · 起始状态（D8） | boards/LampEmpty.png |
| 20 | 推理引擎玻璃动效 · 交接（D9） | boards/Engine.png |
| 21 | 整机协同 TianshanOS 动效 · 交接（D9） | boards/TianshanFlat.png |
| 22 | 模型页 · 专用引擎动效 · 交接（D9） | boards/ModelsEngine.png |
| 23 | 模型页 · 稠密稀疏动效 · 交接（D9） | boards/ModelsDense.png |
| 24 | 导航、语言与联系弹层 · 优化稿（D9） | boards/NavOverlays.png |
| 25 | 场景卡片光段分级 · 已确认（D9） | boards/CaseLight.png |

截图用 Chromium 加真实 Geist 字体渲染；Quantify RM 和 Geist Pixel 取自本地字体文件。

20–25 号画板是给 Claude Code 的落地交接稿；对应的可运行原型在仓库的 `design-preview/`（`engine-glass/`、`tianshanos-flat/`、`models-motion/`、`nav-overlays/`、`case-card-light/`），落地指令是 `design-preview/IMPLEMENT-MOTION.md`、`IMPLEMENT-NAV.md`、`IMPLEMENT-CASELIGHT.md`。这些板里内嵌了截图（base64），所以源文件比前 19 块大。
