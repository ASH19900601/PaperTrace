# v3 结构与类名映射

> 机器可读清单：`selector-inventory.json`（改版前全部选择器、JS 生成与读取的类名）。

## 1. 不能改

| 类别 | 内容 |
| --- | --- |
| 所有 `id` | `#query`、`#searchButton`、`#resultsList`、`#subjectScope`、`#questionCount`、`#rangeLabel`、`#helpButton`、`#dlFiles`、`#toolGrid`、`#toolFilters`、`#chapterUnit` …（`tests/tools.test.mjs` 断言 `toolGrid`、`toolFilters`） |
| 所有 `data-*` | `data-view`、`data-mode`、`data-level`、`data-query`、`data-goto`、`data-quick`、`data-save`、`data-preview`、`data-detail`、`data-subject-code` … |
| JS 生成 / 读取的类名 | 见 `selector-inventory.json` 的 `js_generated`；以及 `.nav`、`.view`、`.brand`、`.search-tab`、`.level`、`.active`、`.visible`、`.drag`、`.selected`、`.saved`、`.primary` |
| `hidden` 语义 | 保留 `[hidden]{display:none!important}` |
| `.mjs` 文件 | 默认不改（见 DESIGN_SPEC §10 的可选项） |

## 2. 允许的静态 HTML 改动（四个页面一致）

| 位置 | 原 | v3 |
| --- | --- | --- |
| `<head>` | `theme-color #f6f7f3` | `#FFFFFF`；新增 `favicon.svg`；`tokens.css` 在 `style.css` 之前；CSS 统一加 `?v=YYYYMMDD` |
| `.brand` 内部 | `brandmark` + 文字 | `<span class="brand-word">Paper<span>Trace</span></span><small>国际课程试题溯源</small>` |
| 侧栏装饰 | `.nav-label`、`.sidebar-note`、`.sidebar-bottom` | 删除；`</nav>` 后加 `<div class="sidebar-links"><a href="https://github.com/ASH19900601/PaperTrace" target="_blank" rel="noopener">GitHub 源码</a></div>` |
| 导航图标 | `<i>⌕</i>` 等 Unicode | `<i><svg class="pt-icon" aria-hidden="true"><use href="icons.svg#i-search"/></svg></i>`（library / download / chapters / tools / star / plus 同理） |
| 顶栏 | `.badge`（CAIE · EDEXCEL · AQA · AP / PAST PAPER DESK 等）与 `.text-btn`“搜一道题 ↗” | 删除 `.badge`；`#helpButton` 文字改为“使用说明”；其他页面右侧链接可保留为普通文字链接（去掉 ↗） |
| 搜题 tab | `⌕ 文字搜题 <span>Text search</span>` | `<svg …#i-text/>文字搜题`、`<svg …#i-camera/>图片 / PDF`；删除英文 `<span>`（若删除影响 JS 则用 CSS 隐藏） |
| `.intro`（搜题） | eyebrow + h1 + p + `.index-stat` | 删除 eyebrow 与 p；h1“查找试题出处”；`.index-stat` 内 `<span>` 改为“条题目 / 页面可搜索” |
| `.page-intro` / `.intro`（其他页） | eyebrow + h1（含 `.green`）+ p | 删除 eyebrow；h1 去掉强调 `<span class="green">`，只留文字；p 改为一句功能说明 |
| `#searchButton` | `查找试题 <span>↗</span>` | `查找试题` |
| `#query` 占位、`#queryHint` | 见 DESIGN_SPEC §9 | 按 §9 |
| `.examples > span` | 试试搜索 | 试试：；按钮文字去掉 ` ↗` |
| `#emptyState` | `.paper-illustration` + h3 + p | `<h3>几种搜法</h3><ul class="search-tips">…三条…</ul>` + `#corpusNote` |
| `.upload-area` | `▧` 图标 + 文案 | 删除 `.upload-icon` 元素（或 CSS 隐藏）；文案与按钮按 §9；“选择文件”加 `primary` |
| `.file-label` | `＋` 图标 | 删除 `.upload-icon` |
| `#subjectGrid` 前 | — | `<div class="subject-grid-head" aria-hidden="true"><span>课程 · 代码</span><span>科目</span><span>年份 · QP</span><span class="num">题目</span><span class="status">状态</span></div>` |
| `.import-guide` | `HOW IT WORKS` 标签 + 大标题 | 删除标签；`h3` 改为“导入后会发生什么” |
| 页脚 | `PaperTrace ↗` + 英文声明 | `<footer><span>PaperTrace 免费、开源、无广告 · <a href="https://github.com/ASH19900601/PaperTrace">GitHub</a></span><span>收录 CAIE、Edexcel、AQA、AP 公开试题 · 非 Cambridge 官方产品，请以原卷为准</span></footer>` |
| 各页英文标语 | `YOUR NEXT PRACTICE STARTS HERE`、`ONE HOME FOR YOUR STUDY TOOLS`、`ONE TOPIC AT A TIME`、`THE SOURCE LIBRARY`、`YOUR QUESTION SHELF`、`GROW YOUR LIBRARY`、`THE PAPER SHELF`、`CHOOSE YOUR UNIT`、`LEARNING TOOLBOX`、`AS · CHAPTER PRACTICE` | 删除。`.eyebrow` 类保留，只用于 `#detailCode`、`#chapterCode`、`#dlPreviewType` 等编号 |
| `.status-dot` | 说明文字前的圆点 | 删除元素（CSS 也设为 `display:none`） |

## 3. 旧 → v3 视觉映射

| 选择器 | 线上现状 | v3 |
| --- | --- | --- |
| `:root` 旧变量 | `--ink --green --lime --paper --line --muted --white --sidebar` | 删除，改用 `--pt-*` |
| `.sidebar` | 232px 浅绿 | 208px `--pt-bg-subtle`，导航 36px 行高，选中浅蓝底蓝字；手机底部 7 格 |
| `.topbar` | 78px，灰色面包屑 + 英文徽标 | 52px，只显示页名 + “使用说明” |
| `.subject-scope` | 绿色圆角大框 | 一行灰字“搜索范围：…”+ 小按钮 |
| `.intro h1` | 43px，强调词绿色 | 22px / 600，无强调色 |
| `.index-stat` | 33px 大数字 | 一句话统计 |
| `.search-box` | 12px 圆角 + 柔阴影 | 8px 圆角、1px 边框、聚焦焦点环 |
| `.btn.primary` | 深绿 | 品牌蓝 |
| `.examples button` | 浅绿小 chip | 蓝色文字链接 |
| `.level.active` 等选中态 | 浅绿底 | 浅蓝底蓝字 |
| `.result-card` | 白底卡片、悬停上浮 | 无框列表行、1px 行分隔 |
| `mark` | 浅绿 | 荧光笔黄 `--pt-highlight` |
| `.save-btn.saved` | 绿色星 | 琥珀色星 `--pt-star` |
| `.match-label` | 灰绿小字 | `--pt-ok` 绿色 |
| `.tag`、`.code`、`.card-meta` | 9–11px，monospace | 12–13px 系统字体灰字 |
| `.paper-illustration` | 倾斜纸张插画 | 删除，换文字技巧 |
| `.stat-grid` | 4 张统计卡 | 一句话，`·` 分隔 |
| `.subject-grid` / `.subject-card` | 4 列大卡片（实测 191px 高） | 表格行（约 40px），兼容 `<button>` |
| `th` / `td` | 浅绿表头 | 浅灰表头、12px 中文、行悬停 |
| `.upload-area` / `.file-label` | 绿色虚线 + 字符图标 | 灰色虚线框、无图标，悬停变蓝 |
| `.import-guide` | 浅绿底 | 浅灰面板 + 普通有序列表 |
| `.dl-step` | 浅绿小方块 | “1.”“2.”灰字 |
| `.dl-file` | 独立卡片 | 带框列表中的行，选中浅蓝底 |
| `.dl-file-icon` / `.chapter-file-icon` | 纸张形图标 | 22px 小文字标记，MS 浅蓝 |
| `.tool-card` | 最小高 225px，3 列 | 无最小高度，auto-fill 240px |
| `.chapter-subject` | 大卡片 | 紧凑按钮，选中浅蓝 |
| `.chapter-focus` / `.chapter-extra` | 绿 / 橙 | **保持** |
| `dialog` | 12px 圆角 + 模糊背景 | 8px 圆角 + 浮层阴影，无模糊 |
| `#toast` | 深绿 | 深灰 `--pt-toast-bg` |
| `.error-box` | 浅橙框 | 浅红底红字 |

## 4. 线上与仓库差异

2026-10-31 对比：线上 `app.mjs` 把 `.subject-card` 渲染成 `<button data-subject-code>`（点击跳到搜题并预选科目），仓库里还是 `<div>`；线上 `style.css` 多了对应样式。v3 的 CSS 同时兼容两者。VPS 另有 `app.mjs`、`papers.mjs`、`chapters.mjs`、`chapters.html` 的独立副本，`chapters.html` 若有改动需在交付说明中列出，由用户确认后再同步 VPS。
