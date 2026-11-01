# 执行提示词（v3）

> 把下面分隔线之间的全部内容交给执行 AI。它需要能读写本仓库并运行命令。

---

你是一名前端工程师。请在 PaperTrace 仓库里实施一次**纯视觉改版**，规范已经写好，放在 `docs/ui-redesign-v3/`。你的任务是照规范落地并证明结果正确，不是重新设计。

## 背景

- PaperTrace 是免构建的静态查题网站：粘贴题干、输入卷号或上传截图 → 找到 CAIE / Edexcel / AQA / AP 原卷与评分标准（MS）。用户是国际课程学生，会连续使用很久。
- 前端在 `dist/`：`index.html`（搜题、题库总览、收藏、导入四个视图）、`papers.html`、`chapters.html`、`tools.html`；样式 `style.css` + `papers.css` / `tools.css` / `chapters.css`；逻辑在 `*.mjs`。
- 线上：https://papertrace.online/ ；GitHub Pages 由推送 `codex/publish` 部署 `dist/`。
- `docs/ui-redesign/` 是被否决的 v1/v2（海报风格，被认为“AI 味太重”）。**不要参考或复用其中任何规则、Token 或样式。** 原因写在 `docs/ui-redesign-v3/RESEARCH.md`，请先读。

## 必读（都在 `docs/ui-redesign-v3/`）

1. `RESEARCH.md`：AI 味的来源与 v3 的应对。
2. `DESIGN_SPEC.md`：唯一的视觉规范，含禁止清单（§1.3）、状态清单（§7）、文案（§9）。
3. `CLASS_MAP.md`：不能改什么、允许的 HTML 改动、旧 → 新映射。
4. `TASKS.md`：P0–P7 分阶段任务与验收。
5. `tokens.css`、`icons.svg`、`favicon.svg`：复制进 `dist/`。
6. `mockup/reference.css`：用真实类名写的参考实现，迁移的起点；`mockup/*.html` 与 `mockup/shots/*.png` 是样张。
7. `selector-inventory.json`：改版前全部选择器与 JS 类名。
8. `scripts/check-css.mjs`、`scripts/shoot-dist.cjs`、`scripts/render-mockups.cjs`。
9. 仓库根目录 `AGENTS.md`（推送与 Pages 授权）、`docs/UX_FIXES_2026-10-30.md`（VPS 覆盖文件）。

## 硬性约束

1. 只改视觉。不改搜索、识别、下载、导入、收藏、路由行为，不改 `dist/data/`、`vendor/`。
2. 不改 id、data-*、JS 生成或读取的类名、`hidden` 语义。默认不改 `.mjs`；`DESIGN_SPEC.md §10` 列出的 JS 微调需要先问用户。
3. 不引入构建工具、框架、外部 CDN 或网络字体。只用系统字体。
4. 遵守禁止清单：不用 `uppercase`、不拉字距、不用等宽字体做标签和元信息、不用直角整站风格、不用 2px 以上黑边框、不用无模糊偏移投影、不给标题单个词上色、不做“大数字 + 小标签”、不加口号 / 口号条 / 徽章、不用 3px 以上彩色左边框、导航以外不加装饰图标、中文界面不加装饰英文、不留无意义的状态点。
5. 颜色只来自 `tokens.css`；字重 ≤ 600；可读文字 ≥ 12px（手机底部导航 11px 例外）；对比度 ≥ 4.5 : 1。
6. 蓝色只表示“可以点”或“当前选中”。
7. 分章说明里的“绿色标记 / 橙色 EXTRA”保持绿 / 橙。
8. `npm test` 保持全绿（基线 115/115）。
9. 390 / 768 / 1024 / 1440 无横向滚动；键盘焦点可见。
10. 实现 `DESIGN_SPEC.md §7` 的每一种状态，不能只做有结果的画面。

## 做法

1. 按 `TASKS.md` 从 P0 做到 P7，每阶段一个提交。
2. 以 `mockup/reference.css` 为起点；样张没覆盖的选择器按同一套规则补齐，不发明新颜色或新风格。
3. 重写后的 CSS 用多行可读格式，按“基础 / 框架 / 组件 / 页面 / 响应式”分区。
4. 每阶段跑 `npm test`、`check-css.mjs`、`shoot-dist.cjs`，并**亲自看截图**与样张对照。
5. 自检问题：这个元素表达了什么信息？去掉它用户会少知道什么？如果答不上来，删掉。
6. 推送并按 `AGENTS.md` 更新 GitHub Pages；不要部署 VPS。

## 交付

1. 修改后的 `dist/*.html`、`dist/*.css`，新增 `dist/tokens.css`、`dist/icons.svg`、`dist/favicon.svg`。
2. `docs/UI_REDESIGN_V3_YYYY-MM-DD.md`：改动、文件清单、截图路径、测试与检查结果、剩余 WARN 理由、需同步 VPS 的文件、需要用户决定的事。
3. `docs/screenshots/ui-redesign-v3-YYYY-MM-DD/` 下 6–8 组 before / after。
4. 最终回复：做了什么、怎么验证的、什么没做或要用户决定。

开始前，用一句话分别说明：蓝色表示什么；选中态长什么样；哪些东西不能改；你会如何判断一个元素是不是装饰。然后从 P0 开始。

---
