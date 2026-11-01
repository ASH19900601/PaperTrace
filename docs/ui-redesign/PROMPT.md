# 执行提示词（复制下方分隔线之间的全部内容给执行 AI）

> 适用于能读写仓库、运行命令的编码 AI（Claude Code、Codex 等）。
> 如果执行 AI 无法查看图片，删去“查看图片”相关句子即可，文字规范已足够完整。

---

你是一名资深前端工程师兼视觉设计执行者。请在 PaperTrace 仓库中**完整实施**一次纯视觉改版，把网站从现在的“浅绿 SaaS 模板”改成与项目宣传海报一致的黑白蓝瑞士海报风格（颜色、字体、线条、版式与海报统一），同时提高信息密度。设计已经完成，你的任务是**按规范精确落地并自证质量**，不是重新设计。

## 项目背景

- PaperTrace 是一个免构建的静态网站：拍照或粘贴题干 → 找到 CAIE / Edexcel / AQA / AP 原卷与评分标准（MS）。
- 前端全部在 `dist/`：四个页面 `index.html`（搜题、题库总览、收藏、导入四个视图）、`papers.html`（真题下载）、`chapters.html`（分章练习）、`tools.html`（学习工具）；样式 `style.css`（共享）+ `papers.css` / `tools.css` / `chapters.css`；逻辑在 `*.mjs`。
- 现有 CSS 是压缩成单行的写法，写死了 235 种颜色、114 处 ≤10px 字号，需要**重写为可读、基于 Token 的 CSS**。
- 线上站点：https://papertrace.online/ ；GitHub Pages 由推送 `codex/publish` 分支触发 `.github/workflows/pages.yml` 部署 `dist/`。

## 必读输入（全部在 `docs/ui-redesign/`）

1. `README.md` —— 设计包说明。
2. `DESIGN_SPEC.md` —— **唯一的视觉规范来源**：诊断、原则、色彩、字体、间距、签名元素、组件、逐页方案、响应式、无障碍、文案。
3. `CLASS_MAP.md` —— 不能改的 id / data-* / 类名，允许的 HTML 改动，旧 → 新映射，线上与仓库差异。
4. `TASKS.md` —— 分阶段任务与每阶段验收标准，按 P0 → P8 顺序执行。
5. `tokens.css`、`icons.svg`、`favicon.svg` —— 直接复制进 `dist/` 使用。
6. `mockup/reference.css` —— **使用真实类名的参考实现**，是迁移样式的起点；`mockup/search.html`、`photo-empty.html`、`pages.html` 是对应的高保真样张，`mockup/shots/*.png` 是它们在 1440 / 390 宽度下的渲染结果。
7. `reference/poster-01-manifesto.jpg`、`reference/poster-02-take-a-photo.png` —— 视觉原点（请查看图片）。
8. `selector-inventory.json` —— 改版前全部选择器与 JS 生成类名清单。
9. `scripts/check-css.mjs`（CSS 守门）、`scripts/shoot-dist.cjs`（真站截图 + 溢出 + 控制台检查）、`scripts/render-mockups.cjs`（重新渲染样张）。
10. 仓库根目录 `AGENTS.md`（推送与 Pages 授权）和 `docs/UX_FIXES_2026-10-30.md`（VPS 覆盖文件说明）。

## 硬性约束（违反任何一条都视为失败）

1. **只改视觉**：不改搜索、识别、下载、导入、收藏、路由等任何行为；不改 `dist/data/`；不改 `vendor/`。
2. **不改 id、data-*、JS 生成或读取的类名、`hidden` 语义**；清单见 `CLASS_MAP.md §1` 与 `selector-inventory.json`。
3. 原则上**不改 `.mjs`**。若某个视觉需求确实只能改 JS 模板才能实现，先停下来，在交付说明中提出，不要擅自修改（VPS 上有独立的 `.mjs` 覆盖文件，改了会造成两边分叉）。
4. 不引入构建工具、框架、外部 CDN（包括 Google Fonts）；网站必须能用 `python3 serve.py` 离线运行，并能在中国大陆正常访问。
5. 所有颜色只能来自 `tokens.css` 的 `--pt-*` 变量；可阅读文字 ≥ 12px（仅移动端 tab bar 文字允许 11px）；正文/说明对比度 ≥ 4.5 : 1；全部直角；不要柔和阴影与 `backdrop-filter`。
6. 蓝色 `#204FFF` 只用于：主行动按钮、MS、链接、命中高亮、数据标签、标题强调词。**选中状态一律用墨黑 `#101113`**。
7. 分章练习说明里的“绿色标记 / 橙色 EXTRA”必须保持绿/橙，它们描述的是 PDF 内的真实颜色。
8. `npm test` 必须保持全绿（基线 115/115）。`tests/tools.test.mjs` 会检查 `tools.html` 中的 `id="toolGrid"`、`id="toolFilters"`。
9. 390px、768px、1024px、1440px 下任何页面、任何视图都不能出现横向滚动。
10. 键盘可达性不得退化：所有交互元素有可见的蓝色 `:focus-visible` 焦点环；移动端点击区 ≥ 44px。
11. **零纯装饰、信息密度优先**（规范原则 P6）：不要把海报里的插画、大箭头、流程示意图、英文口号、取景框标题框搬进界面；取景框角标只用于文件投放区。列表型数据用紧凑行，满足 `DESIGN_SPEC.md §1.2` 的密度指标（例如题库总览 1440×900 一屏 ≥14 个科目行）。如果某个样式让同样的信息占用了更多屏幕面积，就是错的。

## 执行方法

1. 先完成 `TASKS.md` 的 P0：读文档、看图、拍基线截图、记录基线数据。
2. 按 P1 → P6 逐阶段实施。每个阶段：
   - 以 `mockup/reference.css` 为起点迁移规则，再补齐样张没有覆盖、但 `selector-inventory.json` 列出的其他选择器（例如 `.canvas-wrap`、`.ocr-review`、`.question-batch`、`.dl-queue`、`.chapter-picker`、`.help-body` 等）。补齐时遵循同一套规则推导，不要发明新颜色或新风格。
   - 四个页面的共享框架（报头、section bar、tab bar、页脚）必须**完全一致**。
   - 重写后的 CSS 采用多行可读格式，按“Base / Signature / Layout / Components / 页面 / Responsive”分区并加简短中文注释。
   - 跑 `npm test`、`node docs/ui-redesign/scripts/check-css.mjs`、`node docs/ui-redesign/scripts/shoot-dist.cjs`，**亲自查看截图**，与 `mockup/shots/` 对照，修正差异后再提交。
   - 每个阶段一个提交，提交信息说明本阶段范围。
3. P7（展示字体子集）为可选：网络可用且许可清楚时执行，否则在交付说明中写明跳过原因。
4. P8 收尾：0 FAIL、无溢出、测试全绿、写交付文档、更新截图、推送并按 `AGENTS.md` 授权更新 GitHub Pages。**不要部署 VPS**，只在交付说明中列出需同步到 VPS 的文件。

## 需要你自己判断的情况

- 规范与样张冲突：以 `DESIGN_SPEC.md` 为准，并在交付说明中记录。
- 规范没覆盖到的元素：从最相近的组件规则推导（例如新的面板按 `.panel`、新的选中态按“墨底纸字”），并在交付说明中列出你的推导。
- 带 ⚠ 的宣传文案（“完全非营利”“永久免费 · 永久开源 · 永久无广告”“免注册 / 登录”）来自用户的海报，可以使用；但把它们集中写在每个页面的同一段 HTML 里，便于用户统一修改，并在交付说明中提醒用户确认。
- 某个检查无法在你的环境中运行（例如没有 Playwright 浏览器）：如实说明，并给出你用来替代的验证方式；不要声称已通过。

## 交付物

1. 修改后的 `dist/*.html`、`dist/*.css`，新增的 `dist/tokens.css`、`dist/icons.svg`、`dist/favicon.svg`（以及可选的字体文件与许可证）。
2. `docs/UI_REDESIGN_YYYY-MM-DD.md`：改动摘要、逐文件清单、对照截图路径、`npm test` 与 `check-css` 结果、剩余 WARN 的理由、自行推导的规则、需同步到 VPS 的文件、待用户确认的文案。
3. `docs/screenshots/ui-redesign-YYYY-MM-DD/` 下 6–8 组 before/after 关键截图（桌面 + 手机）。
4. 最终回复中用简短列表报告：完成了什么、如何验证、有什么没做或需要用户决定。

开始前先复述你对“蓝色用途”“选中态颜色”“哪些东西不能改”“什么算纯装饰”的理解（各一句话），然后从 P0 开始执行。

---
