# RMinte 官网设计系统 v2

状态：**方向已确认（D1–D7），规范已并入根目录 `DESIGN.md`（2026-10-03），生产代码尚未实施。** 本目录是细节与实施依据；两者不一致时以 `DESIGN.md` 为准。

## 阅读顺序

1. [README.md](README.md)：目标、现状、已确认决定（D1–D7）、与现行 DESIGN.md 的差异。
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
- 字体文件不在本目录：Quantify RM 为付费授权字体；Geist、Geist Mono、Geist Pixel 为 OFL 开源，实施时再加入网站资源。

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

截图用 Chromium 加真实 Geist 字体渲染；Quantify RM 和 Geist Pixel 取自本地字体文件。
