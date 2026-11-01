# 执行任务清单 · 分阶段验收

每个阶段结束都要：`npm test` 全绿 → `node docs/ui-redesign/scripts/check-css.mjs` → 自己看截图 → 单独提交一次。

## P0 准备（不改代码）

- [ ] 阅读 `DESIGN_SPEC.md`、`CLASS_MAP.md`，打开 `mockup/shots/*.png` 与两张海报。
- [ ] 本机启动并拍基线：`node docs/ui-redesign/scripts/shoot-dist.cjs .cache/ui-redesign/before`
- [ ] 记录基线：`npm test` 通过数（2026-10-31 为 115/115）、`check-css` FAIL 数（2026-10-31 为 137）。
- [ ] 若线上 `app.mjs` 的 `.subject-card` 按钮化改动尚未进仓库，**不要**自行合入 JS；只保证 CSS 兼容 `div` 与 `button` 两种渲染。

**验收**：`.cache/ui-redesign/before/` 下有 40 张截图。

## P1 基础层：Token、图标、Favicon、全局元素

- [ ] 复制 `tokens.css` → `dist/tokens.css`，`icons.svg` → `dist/icons.svg`，`favicon.svg` → `dist/favicon.svg`。
- [ ] 四个页面 `<head>`：引入 tokens（在 style.css 之前）、favicon、`theme-color #F9F9F5`、CSS 统一加 `?v=YYYYMMDD`。
- [ ] 重写 `dist/style.css` 的 Base 区块：`body`、链接、`[hidden]`、`:focus-visible`、`.sr-only`、`.muted`、`.eyebrow`、`.status-dot`、`.green/.accent`、`.btn` 全变体、`.text-btn`、`.icon-btn`、表单控件、`.tag`、`mark`、`dialog`、`#toast`、`.error-box`。
- [ ] 删除旧 `:root` 变量（`--ink --green --lime --paper --line --muted --white --sidebar`）。

**验收**：按钮、输入、对话框、toast 在四个页面都是新样式；没有页面因变量缺失出现透明/黑色块。

## P2 框架：报头、section bar、tab bar、页脚

- [ ] 四个页面同步修改 `.sidebar` 静态标记（品牌字标、删装饰、SVG 图标、`.masthead-tag`）。
- [ ] 桌面顶部报头、≤1100 精简、≤760 品牌行 + 底部 tab bar（`display: contents` 方案，见参考 CSS §18）。
- [ ] `.topbar` → section bar；`#developerCredit` 有值时整行显示（用 DevTools 临时去掉 `hidden` 并写入文本自测）。
- [ ] 四个页面加单行 `.pt-band`，`<footer>` 改为单行结构；口号条 + 页脚合计 ≤110px。

**验收**：390 / 768 / 1024 / 1440 无横向滚动；tab bar 不遮挡页面最后的内容与 toast；点击品牌、各导航、浏览器前进后退行为与改版前一致。

## P3 试题搜索（`index.html#search`）

- [ ] 范围条、页头（一行标题 + 一句说明，删除 `.eyebrow`，不加任何图形）、`.index-stat`。
- [ ] 搜索框、tab、`#searchButton`、示例查询、筛选条、结果标题。
- [ ] 结果卡片全部子元素，含卡片内原卷预览 `.paper-preview` / `.preview-*`。
- [ ] 空状态：删除插画，换成 `h3` + `.search-tips` 三条文字技巧 + `#corpusNote`。
- [ ] 图片模式：`.llm-options`、`.llm-fields`、`.upload-area`（含 `.drag`）、`.pdf-search-controls`、`.canvas-wrap`、`.image-tools`、`.question-batch`、`.recognized-question`、`.ocr-sources`、`.llm-progress`、`.ocr-review`、`.reading-*`、`.raw-disclosure`。
- [ ] 详情对话框 `#detailDialog`、帮助对话框 `#helpDialog`（`.help-body`）。

**验收**：1440×900 不滚动能看到完整搜索框、“查找试题”、示例查询和筛选条；页面上没有任何只起装饰作用的图形。手动走一遍——搜 `diffraction grating` 出结果；展开原卷小问；打开题目详情；切到图片模式点“试用题目截图”完成识别；切回文字模式；收藏一题后看到 toast 与收藏数变化。截图与 `mockup/shots/search-*.png`、`photo-empty-*.png` 对照。

## P4 题库总览 / 收藏 / 导入

- [ ] `.page-intro`（删除 `.eyebrow`）、一行 `.stat-grid`、`.section-title`。
- [ ] 科目列表：新增 `.subject-grid-head`；`.subject-card` 改为一科一行（div 与 button 均正确），`.subject-group` 分组条；平板去状态列、手机两行。
- [ ] `.table-wrap` / `table`（sticky 表头、紧凑行）、`.table-footer`。
- [ ] 收藏页 `.results-list`、`.empty-small`。
- [ ] 导入页 `.import-grid`、`.panel`、`.file-label`（`pt-vf`）、`progress`、`#importLog`、`.import-actions`、`.import-guide`（`paper-2` 普通面板 + 小号计数）、`.danger`。

**验收**：统计条 ≤72px；1440×900 滚动到科目区后一屏 ≥14 个科目行，行高 ≤48px；与 `mockup/shots/pages-*.png` 上半部分对照；点击“试用示例 QP + MS”导入成功，日志可读。

## P5 真题下载（`papers.html` / `papers.css`）

- [ ] 页面头、`.dl-quick`、`.dl-filter` 全部子块、`.dl-step`、chip 选中与焦点。
- [ ] `.dl-queue`、`.dl-results-heading`、`.dl-result-tools`、`.dl-selection-bar`、`.dl-file`（含 `.selected`、所有 `.dl-file-icon` 类型、`.dl-file-state.ok/.error`）、`.dl-empty`、`.dl-pagination`、`.dl-endnote`。
- [ ] `#dlPreview` 对话框与 `.dl-preview-*`。

**验收**：文件行高 ≤64px；选物理 2024 May/Jun → 勾选两份 → 预览一份 → 关闭；键盘 Tab 能看到 chip 的蓝色焦点环。

## P6 分章练习、学习工具

- [ ] `chapters.css`：紧凑科目按钮（选中墨底，无额外角标）、`.chapter-picker`、`.chapter-heading`、`.chapter-files` / `.chapter-file`、`.chapter-file-icon`、`.chapter-note`（绿/橙保留）、`#chapterError`。
- [ ] `tools.css`：`.tools-intro`、`.tools-count`、`.tools-summary`、`.tool-filter(.active)`、`.tool-search`、`.tool-grid`（auto-fill 280px）、`.tool-card`（三种 `data-kind`，无最小高度）、`.tools-note`。

**验收**：1440 宽工具 ≥4 列；分章科目区高 ≤80px；分章切换科目与单元、前进后退仍正确；工具筛选与搜索可用。

## P7 （可选）展示字体子集

按 `DESIGN_SPEC.md §3.3` 生成 `dist/vendor/fonts/pt-display.woff2`，登记许可证。**验收**：Windows 字体回落截图（或在 DevTools 禁用该字体）下版式不崩；woff2 ≤ 80 KB。

## P8 收尾

- [ ] `check-css`：0 FAIL；剩余 WARN 逐条说明理由。
- [ ] `node docs/ui-redesign/scripts/shoot-dist.cjs .cache/ui-redesign/after` 无问题输出；挑 6–8 张关键 before/after 对比放进 `docs/screenshots/ui-redesign-YYYY-MM-DD/`（PNG 压缩后单张 ≤ 300 KB）。
- [ ] `npm test` 全绿；`git diff --check` 通过；`node --check` 所有改过的 `.mjs`（若有）。
- [ ] 新建 `docs/UI_REDESIGN_YYYY-MM-DD.md`：改动摘要、文件清单、验证结果、需同步到 VPS 的文件、未完成项。
- [ ] README（中英）里的截图若已过时，替换为新截图。
- [ ] 提交并推送；按 `AGENTS.md` 的持续授权更新 GitHub Pages（Pages 工作流由推送 `codex/publish` 触发）。**VPS 部署不在授权范围内，需用户确认。**
