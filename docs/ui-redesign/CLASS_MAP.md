# 结构与类名映射 · 改动边界

> 机器可读版本：`selector-inventory.json`（由 `scripts/check-css.mjs` 读取）。

## 1. 绝对不能改的东西

| 类别 | 内容 | 原因 |
| --- | --- | --- |
| 所有 `id` | `#query`、`#searchButton`、`#resultsList`、`#subjectScope`、`#dlFiles`、`#toolGrid`、`#chapterUnit` … | JS 通过 `$('#…')` / `getElementById` 访问；`tests/tools.test.mjs` 断言 `id="toolGrid"`、`id="toolFilters"` |
| 所有 `data-*` | `data-view`、`data-mode`、`data-level`、`data-query`、`data-goto`、`data-quick`、`data-save`、`data-preview`、`data-detail`、`data-subject-code` … | 事件委托 |
| JS 生成的类名 | 见 `selector-inventory.json` → `js_generated` | 写在 `app.mjs` / `papers.mjs` / `tools.mjs` / `chapters.mjs` / `paper-preview.mjs` 模板里 |
| JS 读取的类名 | `.nav`、`.view`、`.brand`、`.search-tab`、`.level`、`.active`、`.visible`、`.drag`、`.selected`、`.saved`、`.primary` | `classList.toggle` 或 `querySelectorAll` |
| `hidden` 属性语义 | 全局 `[hidden]{display:none!important}` 必须保留 | 大量视图/面板用 `hidden` 切换 |
| 模块脚本与 `?v=` 参数 | `papers.mjs?v=…`、`chapters.mjs?v=…` | 缓存控制 |

## 2. 允许的 HTML 改动（仅静态标记，四个页面保持一致）

| 位置 | 原 | 新 |
| --- | --- | --- |
| `<head>` | `theme-color #f6f7f3` | `#F9F9F5`；新增 `<link rel="icon" href="favicon.svg" type="image/svg+xml">`；在 `style.css` **之前**新增 `<link rel="stylesheet" href="tokens.css?v=YYYYMMDD">`；各 CSS 链接加同一个 `?v=` |
| `.brand` 内部 | `<span class="brandmark">p<span>↗</span></span><span>PaperTrace<small>…</small></span>` | `<span class="brand-word">PaperTrace</span><small>国际课程试题溯源</small>`（`<a class="brand">` 本身与 `href` 不变） |
| 侧栏装饰 | `.nav-label`、`.sidebar-note`、`.sidebar-bottom` | 删除 |
| 导航图标 | `<i>⌕</i>` 等 | `<i><svg class="pt-icon" aria-hidden="true"><use href="icons.svg#i-search"/></svg></i>` |
| 报头蓝块 | — | `</nav>` 后加 `<span class="masthead-tag">完全非营利</span>` |
| 搜题 tab | `⌕ 文字搜题` / `▧ 图片 / PDF` | 字符换成 `i-search` / `i-camera` SVG；`<span>` 英文副标保留 |
| 搜题页头 `.intro` | 见 DESIGN_SPEC §7.2 | 删除 `.eyebrow` 行；h1 与说明按 §12 改为一行标题 + 一句说明；`#questionCount`、`#rangeLabel` 保留；**不加**取景框、箭头等图形 |
| 静态英文装饰标签 | `YOUR NEXT PRACTICE STARTS HERE`、`ONE HOME FOR YOUR STUDY TOOLS`、`ONE TOPIC AT A TIME`、`THE SOURCE LIBRARY`、`YOUR QUESTION SHELF`、`GROW YOUR LIBRARY`、`THE PAPER SHELF`、`CHOOSE YOUR UNIT`、导入页 `HOW IT WORKS` | 删除这些元素。`.eyebrow` 类本身保留样式，继续用于 `#detailCode`、`#chapterCode`、`#dlPreviewType` 等有数据的标签 |
| `.green` | 强调词 | 可改为 `.accent`（CSS 中两者等价，保留 `.green` 兼容 VPS 旧文件） |
| `.upload-area` | `<span class="upload-icon">▧</span>` | 加类 `pt-vf`；图标换 `i-camera` SVG；“选择图片 / PDF”按钮加 `primary` |
| `.file-label` | `<span class="upload-icon">＋</span>` | 加类 `pt-vf`；图标换 `i-upload` SVG |
| `#emptyState` | `.paper-illustration` + 引导文案 | 删除插画，换成 `h3` + `<ul class="search-tips">` 三条文字技巧（结构见 `mockup/photo-empty.html`），`#corpusNote` 保留 |
| `#subjectGrid` 前 | — | 新增静态表头 `<div class="subject-grid-head" aria-hidden="true"><span>课程 · 代码</span><span>科目</span><span>年份 · QP</span><span class="num">题目</span><span class="status">状态</span></div>` |
| `#searchButton` | `查找试题 <span>↗</span>` | `查找试题 <svg class="pt-icon"><use href="icons.svg#i-arrow-up-right"/></svg>` |
| 页脚 | `<footer>…</footer>` | 前置一行 `<div class="pt-band">…</div>`；`<footer>` 改为一行：`<span><b>PaperTrace</b>国际课程试题溯源</span><span>原有声明</span>`（见 `mockup/search.html`） |

## 3. 旧 → 新 视觉映射（重点项）

| 选择器 | 旧样式 | 新样式（Token） |
| --- | --- | --- |
| `:root` | `--ink #202a27; --green #32694e; --lime …; --paper #f7f8f5; --sidebar 232px` | 删除旧变量，全部改用 `tokens.css` 的 `--pt-*` |
| `body` | 14px Inter/Segoe/PingFang | `--pt-fs-body` 15px，`--pt-font-sans`，`--pt-paper` 底 |
| `.sidebar` | 232px 左侧固定栏，浅绿底 | 桌面 72px 顶部报头 + 2px 墨线；≤760 `display:contents` 拆成品牌行 + 底部 tab bar |
| `.shell` | `margin-left: var(--sidebar)` | `margin-left: 0` |
| `.topbar` | 78px，crumb 灰字 | section bar：蓝色大写 crumb + 墨色 badge + 方形 `?` |
| `.subject-scope` | 绿色圆角大框 | 上下发丝线细条，`SCOPE` 标签 |
| `.intro h1` | 43px / 650 | `--pt-fs-display`（40px）/ 900 / `--pt-font-hero`，一行 |
| `.eyebrow` | 10px 灰绿 | 12px 蓝色大写 `.14em`（仅数据标签） |
| `.status-dot` | 6px 圆点绿 | 8px 方块蓝 |
| `.search-box` | 白底 12px 圆角柔阴影 | 白底 2px 墨框直角；聚焦蓝色硬阴影 |
| `.btn` | 白底浅框 6px 圆角 | 1.5px 墨框直角，悬停墨底 |
| `.btn.primary` | 深绿底 | 蓝底，悬停墨底 |
| `.level.active`、各类 chip 选中 | 浅绿底 | 墨底纸字 |
| `.result-card` | 8px 圆角，悬停上浮 1px | 直角 1px 框，悬停墨框，展开预览 2px 墨框 + 蓝色硬阴影 |
| `mark` | 浅绿底 | `--pt-blue-soft` 底 + 2px 蓝色下划线 |
| `.tag` | 浅绿底 9px | 1px 墨框 11px 大写 |
| `.code`、`.card-meta`、`.dl-file-name`、`td` | monospace 9–11px | `--pt-font-mono` 12–13px |
| `.paper-illustration` | 倾斜纸张插画 | 退役，换 `.search-tips` 文字技巧 |
| `.stat-grid` / `.stat-cell` | 4 张白底圆角卡（约 110px 高） | 一行统计条（≤72px）：数字 26px 与说明横排，发丝竖线分隔 |
| `.subject-grid` / `.subject-card` | 4 列大卡片（约 170px 高） | 一科一行的表格式列表（≈44px），CSS Grid 横排 6 个子元素；`.subject-group` 为分组条；兼容 `<button>` |
| `.import-guide` | 浅绿底 | `paper-2` 普通面板，`01 02 03` 13px 等宽蓝字 |
| `.dl-step` | 浅绿小方块 | 13px 等宽蓝字 |
| `.dl-file` | 18–20px 内距 | 10/16px 内距，行间距 6px |
| `.dl-file-icon` / `.chapter-file-icon` | 浅色纸张形 | 36×40：QP 墨块 / MS 蓝块 / GT·ER·CI 纸底墨框 |
| `.tool-card` / `.tool-icon` | 最小高 225px，3 列 | 无最小高度，auto-fill 280px（1440 宽 4 列）；图标 36px：在线=蓝、源码=纸底墨框、整合=墨 |
| `.chapter-subject` | 大卡片 | 紧凑按钮（12/16px 内距），选中墨底反白 |
| `.chapter-focus` / `.chapter-extra` | 绿 / 橙 | **保持**绿 / 橙（`--pt-pdf-focus` / `--pt-pdf-extra`） |
| `dialog` | 12px 圆角，blur 背景 | 直角 2px 墨框 + 8px 墨色硬阴影，无 blur |
| `#toast` | 深绿圆角 | 墨底直角 + 6px 蓝色左条 |
| `.error-box` | 浅橙底 | `--pt-danger-soft` + 4px 红色左条 |
| 焦点 | `outline: 2px solid #8ba373` | `outline: 2px solid var(--pt-blue)` |

## 4. 线上与仓库差异（执行前必读）

2026-10-31 对比 `https://papertrace.online/` 与仓库 `dist/`：

- `style.css`、`app.mjs` 不一致：线上 `app.mjs` 把题库总览的 `.subject-card` 渲染成 `<button type="button" data-subject-code>`，点击后跳到搜题并预选科目；线上 `style.css` 多了 `.subject-card` 的按钮重置与 hover 样式。
- 其余 HTML/CSS 一致。
- VPS 另有专用覆盖文件（`app.mjs`、`papers.mjs`、`chapters.mjs`、`chapters.html`，见 `docs/UX_FIXES_2026-10-30.md`）。**本次改版只改 HTML 静态标记与 CSS，尽量不动 `.mjs`**；若 `chapters.html` 有改动，交付说明中要列出“需要同步到 VPS 的文件”，由用户确认后再部署 VPS。
