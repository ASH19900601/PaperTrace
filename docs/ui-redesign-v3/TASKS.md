# v3 执行任务清单

每个阶段结束：`npm test` 全绿 → `node docs/ui-redesign-v3/scripts/check-css.mjs` → 自己看截图 → 单独提交。

## P0 准备

- [ ] 读 `RESEARCH.md`（为什么不要海报风）、`DESIGN_SPEC.md`、`CLASS_MAP.md`；看 `mockup/shots/*.png`。
- [ ] 基线截图：`node docs/ui-redesign-v3/scripts/shoot-dist.cjs .cache/ui-redesign-v3/before`。
- [ ] 记录基线：`npm test`（2026-11-01 为 115/115）、`check-css` FAIL 数（2026-11-01 线上代码为 163）。
- [ ] 不要使用 `docs/ui-redesign/`（v1/v2）里的 `tokens.css`、`reference.css` 或任何规则。

## P1 基础层

- [ ] 复制 `tokens.css`、`icons.svg`、`favicon.svg` 到 `dist/`；四个页面 `<head>` 按 CLASS_MAP §2 修改。
- [ ] 重写 `dist/style.css` 基础部分：body、链接、焦点、按钮、表单、`mark`、`code`、对话框、toast、错误框；删除旧 `:root` 变量。

**验收**：四个页面的按钮、输入框、对话框是新样式；没有变量缺失导致的透明或黑块。

## P2 框架

- [ ] 四个页面：侧栏（字标、删装饰、SVG 图标、GitHub 链接）、顶栏（页名 + 使用说明、删 `.badge`）、页脚（一行）。
- [ ] 手机：底部 7 格导航，顶栏显示“PaperTrace 页名”。

**验收**：390 / 768 / 1024 / 1440 无横向滚动；导航、品牌点击、前进后退与改版前一致；`#developerCredit` 有值时正常显示（DevTools 临时去掉 `hidden` 自测）。

## P3 试题搜索

- [ ] 范围说明、标题行与一句话统计、搜索框、示例链接、筛选条、结果数与排序。
- [ ] 结果列表（无框行）、原卷预览、空状态（文字技巧）、无结果、加载更多、底部说明。
- [ ] 图片模式：LLM 选项、上传区虚线框（含 `.drag`）、PDF 控件、画布、识别工具条、`.question-batch` / `.recognized-question`（选中浅蓝）、`.ocr-sources`、`.llm-progress`、`.ocr-review`、`.reading-*`、`.raw-disclosure`。
- [ ] `#detailDialog`、`#helpDialog`。

**验收**：1440×900 首屏能看到完整搜索框、按钮、示例、筛选条；实测搜 `diffraction grating`、展开原卷小问、打开题目详情、用示例截图识别、收藏一题看到 toast。

## P4 题库总览 / 收藏 / 导入

- [ ] 标题与说明、一句话统计、`.subject-grid-head` + 表格式科目行（div / button 都正确）、已索引试卷表格。
- [ ] 收藏页、导入页（虚线上传框、说明面板、进度、日志、清除按钮）。

**验收**：科目行高 ≤ 44px；滚动到科目区后 1440×900 一屏 ≥ 14 行；导入示例 QP + MS 成功。

## P5 真题下载

- [ ] 页头、常用科目、筛选面板、chip、选择栏、文件列表（含所有 `.dl-file-icon` 类型与状态）、空状态、分页、下载队列、预览对话框。

**验收**：文件行高 ≤ 64px；完成一次“选年份 → 勾选 → 预览 → 关闭”。

## P6 分章练习、学习工具

- [ ] `chapters.css`：科目按钮、单元选择、单元标题、QP / MS 面板、错误重试、绿 / 橙说明。
- [ ] `tools.css`：页头、说明、分类筛选、搜索、卡片网格、底部说明。

**验收**：1440 宽工具 ≥ 4 列；分章切换科目与单元、前进后退正确。

## P7 收尾

- [ ] `check-css` 0 FAIL，剩余 WARN 写明理由。
- [ ] `shoot-dist.cjs .cache/ui-redesign-v3/after` 无问题；挑 6–8 组 before / after 放入 `docs/screenshots/ui-redesign-v3-YYYY-MM-DD/`（单张 ≤ 300 KB）。
- [ ] `npm test` 全绿、`git diff --check` 通过。
- [ ] 写 `docs/UI_REDESIGN_V3_YYYY-MM-DD.md`：改动、文件清单、验证结果、需同步 VPS 的文件、待用户决定的事项。
- [ ] 推送；按 `AGENTS.md` 授权更新 GitHub Pages（推送 `codex/publish` 触发）。VPS 部署需用户确认。
