# PaperTrace 视觉改版规范 · Viewfinder

> 版本：2026-10-31 · 适用范围：`dist/` 下四个页面（`index.html`、`papers.html`、`chapters.html`、`tools.html`）及其 CSS
> 视觉来源：`reference/poster-01-manifesto.jpg`、`reference/poster-02-take-a-photo.png`
> 落地参考：`tokens.css`、`icons.svg`、`mockup/reference.css`、`mockup/*.html`、`mockup/shots/*.png`

## 修订记录

| 版本 | 日期 | 变更 |
| --- | --- | --- |
| v2 | 2026-11-01 | 按用户反馈：① 搜题页删除所有无信息量的图形（hero 取景框、蓝色大箭头、空状态“拍题→QP/MS”流程图、三步流程条），空状态改为真实搜索技巧；② 题库总览等页面改为信息密度优先：科目由大卡片改为“一科一行”列表，统计改为一行统计条，导入说明、分章科目、工具卡、文件行全部压缩；字号阶梯下调；页脚压缩为两行。新增原则 P6 与密度验收指标。 |
| v1 | 2026-10-31 | 初版 |

---

## 0. 现状诊断（依据 2026-10-31 线上 papertrace.online 截图与 `dist/*.css`）

| # | 问题 | 证据 | 影响 |
| --- | --- | --- | --- |
| D1 | 字号过小 | 四个 CSS 共 294 处 `font-size`，其中 **114 处 ≤ 10px**，移动端出现 7px、8px | 小屏几乎无法阅读，说明文字被忽略 |
| D2 | 对比度不足 | 常用灰绿 `#a0a898`、`#9ca493`、`#98a18f` 在 `#f7f8f5` 上对比度仅 **2.3–2.5 : 1**（WCAG AA 要求 4.5 : 1） | 提示、元信息、空状态文字发虚 |
| D3 | 颜色无体系 | 四个 CSS 写死了 **235 个不同的十六进制颜色**，大多是近似的灰绿 | 视觉发闷、无重点；后续维护困难 |
| D4 | 层级扁平 | H1 只有 650 字重；结果卡片标题 15px；按钮、标签、正文同一灰绿调 | 用户找不到“下一步点哪里” |
| D5 | 图标不一致 | 导航使用 Unicode 字符 `⌕ ▤ ▥ ◈`，线上实际渲染成 `||||` 等不同形态 | 显得粗糙，跨平台不一致 |
| D6 | 次要信息抢主角 | “深国交科目”绿色大框是首屏最醒目的块，压在主标题和搜索框上方 | 主任务（搜题）被稀释 |
| D7 | 无意义装饰 | 侧栏底部“PT 个人学习空间 / Private workspace”假头像，无任何功能 | 占位、误导 |
| D9 | 信息密度低 | 1440×900 实测：题库总览每个科目卡片高 **191px**（一屏约 4 个），统计卡 103px，真题文件行 105px，工具卡最小高 225px 且只有 3 列 | 67 个科目要滚动十几屏才能看完 |
| D8 | 品牌割裂 | 现网是通用“浅绿 SaaS 模板”（圆角、柔阴影、浅绿底），与海报的黑白蓝瑞士风完全不同 | 宣传物料与产品对不上，缺少识别度 |

改版目标：用海报的**颜色、字体与线条**统一品牌，同时修复 D1–D7、D9 的可用性问题；不改变任何功能与数据逻辑。注意 v1 方案曾为贴合海报引入装饰并放大卡片，加剧了 D9，v2 已纠正（见修订记录）。

---

## 1. 设计概念：Viewfinder（取景框）

海报的核心动作是“拍一下，找出处”。整套视觉围绕三件事：

1. **纸面 + 墨 + 一支蓝笔**：纸白底、墨黑字、唯一的电光蓝做批注。蓝色只出现在“答案”和“行动”上。
2. **瑞士海报排版**：粗黑中文标题、粗细两级分割线、直角、无柔阴影、等宽数据字。
3. **取景框只做功能**：四个 L 形角标只用作“可拖入文件的区域”的边界（替代虚线框），不作为装饰。

海报的气质通过**颜色、字体、线条和版式**进入产品，而不是把海报上的插画、箭头、流程图搬进界面。海报是广告，产品是工具：工具界面里的每一个元素都必须传递信息或承担操作。

### 1.1 五条设计原则（执行时用于裁决）

| 原则 | 含义 | 反例 |
| --- | --- | --- |
| P1 蓝色有意义 | 蓝 = 主行动（查找、下载、MS）+ 答案（MS、命中高亮、链接）+ 品牌强调词。**选中状态用墨黑，不用蓝** | 把筛选 chip 选中态做成蓝色 |
| P2 线代替盒子 | 用 2px 墨线 / 1px 发丝线分区；需要容器时用直角白底 + 1px 描边 | 浅色底大圆角卡片层层嵌套 |
| P3 先读后看 | 可阅读文字 ≥ 12px，正文 15–16px，对比度 ≥ 4.5 : 1 | 9px 浅灰说明 |
| P4 少而大 | 每屏只有一个最大的东西（标题或大数字）；其余信息降级为小标签 | 标题、统计、范围框同样醒目 |
| P5 只改皮，不动骨 | 不改 id、data-*、JS 依赖的类名与 DOM 关系 | 为了样式重写 `app.mjs` 模板 |
| P6 信息密度优先，零纯装饰 | 不允许只为“像海报”而存在的图形、插画、大箭头、示意流程图；列表型数据（科目、试卷、文件、工具）用紧凑行或紧凑卡片，单行 ≤ 48px；标题字号够区分层级即可 | 4 个科目占满一屏；空状态放一张示意图 |

### 1.2 密度验收指标（1440×900 视口）

| 页面 | 指标 |
| --- | --- |
| 搜题 | 不滚动即可看到：范围条、标题、完整搜索框与“查找试题”按钮、示例查询、筛选条；有结果时首屏至少露出第 1 张结果卡片的顶部 |
| 题库总览 | 统计条高度 ≤ 72px；滚动到“科目覆盖”后，一屏内 ≥ 14 个科目行；科目行高 ≤ 48px |
| 真题下载 | 文件行高 ≤ 64px，一屏 ≥ 8 行 |
| 学习工具 | 1440 宽 ≥ 4 列，卡片不设最小高度 |
| 分章练习 | 科目选择区高度 ≤ 80px |
| 全站 | 页脚（口号条 + 页脚行）合计高度 ≤ 110px |

---

## 2. 色彩

全部定义在 `tokens.css`，执行后 CSS 中**不得出现 Token 以外的十六进制颜色**（例外：SVG data URI 中的 `%23101113`）。

### 2.1 基础色

| Token | 值 | 用途 |
| --- | --- | --- |
| `--pt-paper` | `#F9F9F5` | 页面底色（海报取样） |
| `--pt-paper-2` | `#F1F1EA` | 悬停底、信息条、选择栏 |
| `--pt-paper-3` | `#E7E7DE` | 预览区底、禁用主按钮 |
| `--pt-surface` | `#FFFFFF` | 输入框、卡片、对话框正文 |
| `--pt-ink` | `#101113` | 正文、标题、粗线、黑色条带、选中态（海报取样） |
| `--pt-ink-2` | `#3A3B40` | 次级正文（10.6 : 1） |
| `--pt-muted` | `#66686E` | 说明文字（5.3 : 1） |
| `--pt-faint` | `#8E9096` | **只用于**占位符、禁用、装饰性斜杠（3.0 : 1，不可承载信息） |
| `--pt-line` / `--pt-line-strong` | `#DADAD2` / `#B9BAB2` | 发丝线 / 输入框描边 |

### 2.2 品牌蓝

| Token | 值 | 用途 |
| --- | --- | --- |
| `--pt-blue` | `#204FFF` | 主按钮、MS、链接、kicker、强调词、命中下划线（纸白上 5.5 : 1；白字在蓝上 5.8 : 1） |
| `--pt-blue-press` | `#163CD9` | 按下态（悬停统一变墨黑，见 §6.1） |
| `--pt-blue-soft` | `#E3E9FF` | `<mark>` 底色 |
| `--pt-blue-tint` | `#F2F5FF` | 拖拽上传悬停底 |

### 2.3 语义色（克制）

`--pt-ok` `#157A45`、`--pt-warn` `#B45A12`、`--pt-danger` `#C42F17`（+ `--pt-danger-soft`）。

**例外**：分章练习说明中的“绿色标记 / 橙色 EXTRA”描述的是 PDF 内部真实颜色，必须保留绿色 `--pt-pdf-focus` 与橙色 `--pt-pdf-extra`，不能改成蓝色。

### 2.4 配色比例

纸白约 80%、墨黑约 15%（文字 + 线 + 条带）、蓝 ≤ 5%。一个视口内同时出现的蓝色实心块不超过 2 个（例如“查找试题”按钮 + 报头“完全非营利”）。

---

## 3. 字体

### 3.1 字体栈（不引入任何外部 CDN；国内访问与离线运行都必须正常）

```
--pt-font-sans:    "Inter", "Helvetica Neue", Helvetica, Arial, "PingFang SC", "HarmonyOS Sans SC",
                   "Noto Sans SC", "Source Han Sans SC", "Microsoft YaHei", sans-serif;
--pt-font-display: <同上，配合 900 字重>;          /* 标题与动态大字 */
--pt-font-hero:    "PT Display", var(--pt-font-display);  /* 仅静态海报文字，见 3.3 */
--pt-font-mono:    "JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace;
```

等宽字体用于**试卷编号、文件名、页码、计时**（`9702_s24_qp_22`），这是 PaperTrace 的“数据味”。

### 3.2 字号阶梯

| Token | 桌面 | ≤1100 | ≤760 | 用途 |
| --- | --- | --- | --- | --- |
| `--pt-fs-display` | 40 | 36 | 30 | 搜题首页标语（一行），字重 900，字距 -0.02em |
| `--pt-fs-h1` | 32 | 30 | 26 | 其他页面主标题 |
| `--pt-fs-stat` | 32 | 28 | 22 | 页头统计数字（`13,334`），`tabular-nums` |
| `--pt-fs-h2` | 22 | 22 | 20 | 结果数等区块标题 |
| `--pt-fs-h3` | 19 | 19 | 17 | 卡片标题 |
| `--pt-fs-lead` | 18 | 18 | 16 | 引导句、搜索输入（移动端 16 防 iOS 缩放） |
| `--pt-fs-body` | 15 | 15 | 15 | 正文 |
| `--pt-fs-small` | 13 | 13 | 13 | 次要说明 |
| `--pt-fs-label` | 12 | 12 | 12 | 大写标签，全站**最小字号**（tab bar 文字 11px 是唯一例外） |

大写标签（kicker）：12px / 700 / `letter-spacing: .14em` / `uppercase`，对应海报的 `PHOTO / SCREENSHOT`。只用于**有信息的标签**（面包屑、`SCOPE`、`#detailCode`、`#chapterCode` 这类试卷/单元编号），不用于英文装饰口号。

### 3.3 （可选，推荐）展示字体自托管子集

系统中文字体在 Windows 只有 YaHei Bold、macOS PingFang 最高 Semibold，达不到海报的 Heavy 效果。可选做法：

1. 取 **Noto Sans SC Black（SIL OFL 1.1）**。
2. 只对**静态标题文字**做子集（各页面 `h1`、口号条带、页脚标语、`QP/MS`、数字 `0-9 , + – /` 与 `PaperTrace` 字母），约 150 字，woff2 约 30–60 KB：
   ```sh
   pip install fonttools brotli
   pyftsubset NotoSansSC-Black.otf --text-file=docs/ui-redesign/display-glyphs.txt \
     --flavor=woff2 --output-file=dist/vendor/fonts/pt-display.woff2 --layout-features='*'
   ```
3. 在 `tokens.css` 顶部加：
   ```css
   @font-face { font-family: "PT Display"; src: url("vendor/fonts/pt-display.woff2") format("woff2");
                font-weight: 900; font-display: swap; }
   ```
4. 许可证文本放入 `dist/vendor/fonts/OFL.txt`，并在 `docs/THIRD_PARTY_NOTICES.md` 登记。

若网络或许可不便，跳过此步，系统字体回落是可接受的。

**`--pt-font-hero` 选择器白名单**（只有这些元素的文字是静态的或只含数字，可以使用子集字体）：
`.brand-word`、`.intro h1`、`.page-intro h1`、`.index-stat b`、`.stat-cell b`、`.dl-file-icon`、`.chapter-file-icon`。
其他标题（`#resultsTitle`、`#chapterTitle`、科目名、工具名等由 JS 写入的文字）一律用 `--pt-font-display`，
否则子集缺字会造成同一行混排两种字体。新增静态标题时，同步把字加进 `display-glyphs.txt` 并重新生成子集。

---

## 4. 网格与间距

- 内容最大宽度 `--pt-page-max: 1280px`，左右留白 `--pt-gutter`：48 / 28 / 16（≥1100 / ≤1100 / ≤760）。
- 报头、section bar、页脚与 `main` **共用同一条左边线**：`padding-inline: max(var(--pt-gutter), calc((100% - var(--pt-page-max)) / 2))`。
- 间距只用 8 的倍数 Token：`--pt-s1…s9` = 4, 8, 12, 16, 24, 32, 48, 64, 96。
- 圆角全部为 0（`--pt-radius: 0`）。

---

## 5. 签名元素（全部有功能，没有纯装饰）

| 元素 | 实现 | 使用位置（**仅限这些**） | 承担的功能 |
| --- | --- | --- | --- |
| 取景框角标 `.pt-vf` | `::before` + 8 段 `linear-gradient`，见 `tokens.css` | `.upload-area`、`.file-label` | 文件投放区边界；拖拽时变蓝表示可放下 |
| 粗分割线 | `2px solid var(--pt-ink)` | 报头底边、`.filter-bar` 顶边、`.stat-grid` 顶边、对话框标题下、移动端 tab bar 顶边 | 分隔导航 / 输入 / 结果三大区 |
| 大写标签 | 12px 700 .14em uppercase 蓝 | section bar 面包屑、范围条 `SCOPE`、对话框里的试卷编号 | 说明当前位置或数据类型 |
| QP / MS 字块 | 墨黑方块白字 = QP；蓝方块白字 = MS；GT/ER/CI = 纸底墨框 | `.dl-file-icon`、`.chapter-file-icon` | 一眼区分资料类型 |
| 黑色口号条 `.pt-band` | 墨黑底、纸白 13px 粗体、单行 | 所有页面页脚上方，一次 | 说明免费 / 开源 / 无广告 |
| 硬阴影 | `--pt-shadow-lift: 4px 4px 0 蓝`；`--pt-shadow-pop: 8px 8px 0 墨` | 搜索框聚焦、展开预览的结果卡片、选中的文件行、悬停工具卡；对话框 | 表示焦点 / 选中 / 浮层 |

**明确禁止**：hero 取景框、装饰箭头、空状态插画或流程示意图、页面主标题上方的英文装饰标签（`YOUR SHORTCUT TO…` 之类）、页脚大字字标。

## 6. 组件规格

> 下列每个组件在 `mockup/reference.css` 都有可直接迁移的实现；这里写的是**规则**，参考 CSS 是**答案**。

### 6.1 按钮

| 变体 | 默认 | 悬停 | 按下 | 禁用 |
| --- | --- | --- | --- | --- |
| `.btn`（次要） | 透明底、1.5px 墨框、墨字 | 墨底纸字 | `translate(1px,1px)` | 1px `line-strong` 框、`faint` 字、`not-allowed` |
| `.btn.primary` | 蓝底白字 | **墨底**纸字（海报感：蓝 → 黑） | 同上 | `paper-3` 底、`faint` 字 |
| `.btn.small` | 高 36px、13px | | | |
| `.text-btn` | 墨字 + 1px `line-strong` 下划线 | 蓝字、下划线同色 | | |
| `.icon-btn` | 36×36 方形 1.5px 墨框 | 墨底 | | |

尺寸：常规高 44px（移动端所有可点击元素 ≥ 44px），`#searchButton` 高 52px、16px 字。图标与文字间距 10px（small 为 6px）。

### 6.2 输入与筛选

- `select` / `.input` / 文本输入：白底、1px `line-strong`、直角、高 40px；悬停墨框；聚焦蓝框 + 1px 蓝外环；`select` 用 SVG 下拉箭头（见参考 CSS）。
- `textarea`（搜题）：无边框，18px，行高 1.7；外层 `.search-box` 2px 墨框，`:focus-within` 时加蓝色硬阴影。
- 复选/单选：`accent-color: var(--pt-ink)`；在 chip 内时隐藏原生控件（保留可聚焦），由 chip 填充表达状态，`:has(input:focus-visible)` 显示蓝色焦点环。

### 6.3 Chip / Tab / 标签

- **选中态一律墨底纸字**：`.level.active`、`.dl-chips … :checked`、`.dl-quick .active`、`.tool-filter.active`、`.chapter-subject.active`。
- `.search-tab.active` / `.nav.active`：墨字 + 4px 墨色下划条（贴在分割线上）。
- `.tag`：1px 墨框、11px 700 大写、字距 .08em，无底色。
- 示例查询 `.examples button`：等宽 13px，白底 1px 框。

### 6.4 结果卡片 `.result-card`

```
┌──────────────────────────────────────────────────────── ☆ ┐
│ [CAIE · AS & A LEVEL]  9702 · 物理  ■ 原句 / 编号命中         │  ← tag / code(mono) / match-label(蓝)
│ 2024 May / Jun / Paper 22 / Question 5                      │  ← h3 19px 700，斜杠 faint
│ (a) A ▁diffraction▁ ▁grating▁ is illuminated …               │  ← snippet 15px ink-2，mark=浅蓝底+蓝下划线
│─────────────────────────────────────────────────────────────│
│ 9702_s24_qp_22.pdf · 原卷 p.8      展开原卷小问 题目详情 [原卷↗] [查看 MS↗] │
│ MS 已检查 · 答案 p.6  (mono 12px)                 (text)  (text) (次要)  (蓝)   │
└─────────────────────────────────────────────────────────────┘
```

- 默认 1px `line-strong` 框，白底，内距 16px（上下）/ 24px（左右），卡片间距 12px；悬停墨框；**展开原卷预览时**（`:has(.result-preview:not([hidden]))`）2px 墨框 + 蓝色硬阴影。
- 收藏星：JS 写入 `★/☆` 文本，保持字符；未收藏墨色、已收藏蓝色，40×40 点击区。
- 卡片内原卷预览 `.paper-preview`：1px 墨框；`.preview-heading` 墨底纸字（其中按钮反色）；`.preview-page` `paper-3` 底。

### 6.5 统计与数字

- 页头 `.index-stat b`：32px / 900 / `tabular-nums`，右对齐，下面两行 12px 说明。
- `.stat-grid`：**一行统计条**——数字 26px / 900 与说明 12px 横排在同一基线，四格用 1px 发丝竖线分隔，整条高度 ≤ 72px。数字统一墨色。
- 列表中的数字（科目题数、页码）用等宽 13px 粗体，右对齐。

### 6.6 对话框、提示、错误

- `dialog`：纸白底、2px 墨框、`8px 8px 0` 墨色硬阴影、直角；backdrop `rgba(16,17,19,.55)`，**去掉 blur**。标题下 2px 墨线。
- `#toast`：墨底纸字、左侧 6px 蓝条、直角；保留现有 `.visible` 切换与位移动画；移动端位于 tab bar 之上。
- `.error-box`：`danger-soft` 底 + 4px `danger` 左条，正文墨色。

### 6.7 图标

- 使用 `icons.svg`（24×24、描边 2、直角端点、无填充，风格对齐海报 02 的相机线稿）。复制为 `dist/icons.svg`，以 `<svg class="pt-icon" aria-hidden="true"><use href="icons.svg#i-xxx"/></svg>` 引用。
- 导航映射：试题搜索 `i-search`、题库总览 `i-library`、真题下载 `i-download`、分章练习 `i-chapters`、学习工具 `i-tools`、我的收藏 `i-star`、导入试卷 `i-plus`；搜题 tab：`i-search` / `i-camera`；上传区 `i-camera`；导入区 `i-upload`。
- 文本中现有的 `↗ ↓ → ←` 字符保留（JS 模板大量使用），不强制替换。

---

## 7. 页面方案

### 7.1 全局框架（四个页面一致）

```
┌ PaperTrace           ⌕试题搜索  ▥题库总览  ↓真题下载  …  ＋导入试卷   [完全非营利] ┐ ← 报头 72px（原 .sidebar）
├━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┤ ← 2px 墨线
│ 工作空间 / 试题搜索 (蓝 kicker)                        CAIE · EDEXCEL · AQA · AP  [?] │ ← section bar（原 .topbar）
│ 开发者 · …（#developerCredit，仅 VPS 有值时显示）                                    │
│ main …                                                                              │
├██ 永久免费 · 永久开源 · 永久无广告 · 全部功能免费不限次，含 LLM 图片识别 · 免注册 ██┤ ← .pt-band 单行 ≈44px
│ PaperTrace 国际课程试题溯源                  Made for independent learners. · 非 Cambridge 官方产品 │ ← footer 单行 ≈52px
```

- **桌面：左侧栏改为顶部报头**。`<aside class="sidebar">` 元素与类名保留（JS 依赖 `.brand`、`.nav`），只改 CSS 与少量静态标记：
  - `.brandmark` 删除，`.brand` 内改为 `<span class="brand-word">PaperTrace</span><small>国际课程试题溯源</small>`。
  - 删除 `.nav-label`、`.sidebar-note`、`.sidebar-bottom`（D7）。
  - 每个 `.nav` 的 `<i>⌕</i>` 改为 `<i><svg class="pt-icon" …><use href="icons.svg#i-search"/></svg></i>`，其余属性一字不改。
  - 在 `</nav>` 之后新增 `<span class="masthead-tag">完全非营利</span>`（≤1100px 隐藏）。
- **≤760px**：`.sidebar { display: contents }` 把报头拆开——`.brand` 绝对定位成顶部 56px 品牌行，`nav` 固定为底部 7 格 tab bar（图标 22px + 11px 文字，选中墨色 + 顶部 4px 墨条）。`.topbar` 用渐变背景在 56px 处画 2px 墨线。
- 页脚：在四个页面 `<footer>` 之前加入一行 `<div class="pt-band">…</div>`；`<footer>` 保持一行：左侧 `<b>PaperTrace</b>国际课程试题溯源`，右侧原有声明（见样张）。
- `<head>` 增加 `<link rel="icon" href="favicon.svg" type="image/svg+xml">`，`theme-color` 改为 `#F9F9F5`。

### 7.2 试题搜索（`index.html#search`）——参见 `mockup/search.html`、`mockup/photo-empty.html`

目标：首屏只服务一件事——输入并搜索。

1. **范围条**（`#subjectScope`）：去掉绿色大框，改为上下 1px 发丝线的细条：`SCOPE` 蓝色标签 + 范围名 + 摘要（左），“扩展到全部科目”次要小按钮（右），`<details>` 在下方。DOM 位置不变。
2. **页头**（`.intro`）：**一行标题 + 一行说明 + 右侧统计**，总高约 90px。
   - 删除 `.eyebrow`（“YOUR SHORTCUT TO THE MARK SCHEME”），面包屑已说明位置。
   - h1：`拍一下，<span class="accent">找出处。</span>`，40px，一行。
   - 说明：`粘贴题干、输入试卷编号，或上传截图，查找原卷与 MS 评分标准。`（一句话，15px）。
   - 右侧 `.index-stat`：`#questionCount` 32px 数字 + 两行 12px 说明，左侧 1px 发丝竖线。
   - **不加**取景框、箭头或任何插图。
3. **搜索框**：2px 墨框白底；tab 行 56px（功能图标 `i-search` / `i-camera`）；`#searchButton` 蓝色 52px。
4. **示例查询**：`试试搜索` 标签 + 等宽 chip。
5. **筛选条**：顶部 2px 墨线、底部发丝线；级别 tab 选中墨底；select 40px。
6. **结果**：`h2` 22px；卡片见 §6.4（内距 16/24px，卡片间距 12px）。
7. **空状态**：删除 `.paper-illustration`，换成 `.search-tips`——一个 `h3`（“输入题干或上传截图开始查找”）+ 三列文字技巧（粘贴英文原句 / 输入试卷编号 / 上传截图或 PDF，内容取自现有 `#helpDialog`）+ `#corpusNote`。总高 ≤ 200px，没有图形。
8. **图片模式**：`.llm-options` 改为 `paper-2` 底 + 4px 墨色左条；`.upload-area` 去掉虚线框，改为 `pt-vf` 角标（投放边界），28px 相机图标，内距 24px；拖拽/悬停时角标变蓝、底色 `blue-tint`；“选择图片 / PDF”为主按钮（蓝）。`.canvas-wrap`、`.image-tools`、`.ocr-review`、`.question-batch`、`.recognized-question`（选中 2px 墨框）、`.ocr-sources`、`.llm-progress`、`.pdf-search-controls` 同步换 Token，保持紧凑。

### 7.3 题库总览 / 收藏 / 导入（`index.html` 其余视图）——参见 `mockup/pages.html`

- `.page-intro`：32px 标题 + 一行说明；删除 `.eyebrow` 装饰标签。
- `.stat-grid`：一行统计条（§6.5）。
- **科目覆盖 = 一科一行的表格式列表**（替代大卡片）：
  - `app.mjs` 输出的 `.subject-card` 结构不变（`.tag` / `h3` / `p` / `strong` / `small` / `p.muted`），用 `display:grid` 把这 6 个子元素横排成列：`课程·代码 | 科目（中文 + 英文） | 年份·QP | 题数 | 单位 | 状态`，行高 ≈ 44px，行间 1px 发丝线，悬停浅蓝底。
  - 行内 `.tag` 不画框，改为等宽灰字（分组标题已说明课程）。
  - `.subject-group`（JS 生成的分组标题）作为整行分组条：`paper-2` 底、上方 1px 墨线。
  - 在 `#subjectGrid` 之前新增静态表头 `<div class="subject-grid-head" aria-hidden="true">`（墨底、11px 大写列名）。
  - ≤1100 隐藏“状态”列；≤760 每科两行（名称 + 题数 / 代码 + 年份），行高 ≈ 56px，隐藏表头。
  - 线上 `.subject-card` 是 `<button>`，CSS 同时适配 `div` 与 `button`（`width:100%; text-align:left; font:inherit; background:none; border:0`）。
- 已索引试卷表格：墨底表头（`position: sticky`）、单元格 7px/14px 内距、等宽 12px、悬停浅蓝行、蓝色下划线链接。
- 导入页：`.file-label` 用取景框（投放边界）、28px 图标；`.import-guide` 改为 `paper-2` 底普通面板，步骤编号 `01 02 03` 用 13px 等宽蓝字，不再做黑底大块。
- 收藏页复用结果卡片。

### 7.4 真题下载（`papers.html`）

- `.dl-step`：13px 等宽蓝字（`01`、`02`），与 17px 区块标题同行。
- 课程三联 select、`.dl-chips`、`.dl-quick`：chip 高 34px，选中墨底。
- `.dl-selection-bar`：`paper-2` 底 + 2px 墨色顶线；“打包下载 ZIP”主按钮蓝色。
- `.dl-file`：行内距 10/16px，行间距 6px；QP/MS 字块 36×40；标题 15px；文件名等宽 12px；选中项 2px 墨框 + 蓝色硬阴影。
- `.dl-queue`：白底 1px 墨框，进度条 `accent-color: var(--pt-blue)`。
- `#dlPreview` 对话框同 §6.6；`.dl-preview-canvas` 底色 `paper-3`。

### 7.5 分章练习（`chapters.html`）

- `.chapter-subject`：紧凑按钮（内距 12/16px，科目名 18px），三个横排；选中项墨底反白，**不加**额外角标。
- `.chapter-picker`：白底面板，左标题，右 select。
- `.chapter-heading h2` 22px；`#chapterBundle` 主按钮蓝色。
- `.chapter-file-icon`：QP 墨块 / MS 蓝块（36×40）。
- `.chapter-focus` / `.chapter-extra` 保留绿/橙（§2.3）。

### 7.6 学习工具（`tools.html`）

- `.tool-grid`：`repeat(auto-fill, minmax(280px, 1fr))`，1440 宽 4 列，间距 12px。
- `.tool-card`：内距 16px，**无最小高度**；`.tool-icon` 36px 方块（在线工具蓝底、源码项目纸底墨框、已整合墨底）；标题 16px；`.tool-tag` 等宽小框；悬停墨框 + 蓝色硬阴影。
- `.tools-summary`：`paper-2` 底 + 4px 墨色左条，一行。

## 8. 响应式

| 断点 | 变化 |
| --- | --- |
| ≥ 1100 | 报头完整（图标 + 文字 + 蓝块），页头标题与统计同行，科目列表 6 列，工具 4 列 |
| ≤ 1100 | 隐藏报头蓝块与导航图标；科目列表去掉“状态”列；工具 3 列 |
| ≤ 760 | 顶部品牌行 + 底部 tab bar；统计改为标题下方一行；搜索按钮通栏；搜索技巧单列；筛选 select 两列网格；科目每科两行；工具单列；分章科目仍三列紧凑；toast 位于 tab bar 上方 |
| ≤ 380 | 允许隐藏 `#rangeLabel` 以外的统计说明；tab bar 文字仍为 11px |

验收：390px、768px、1024px、1440px 下**不得出现横向滚动**（`document.documentElement.scrollWidth === innerWidth`）。

---

## 9. 无障碍

- 正文与说明文字对比度 ≥ 4.5 : 1；`--pt-faint` 不用于需要阅读的信息。
- 全局 `:focus-visible { outline: 2px solid var(--pt-blue); outline-offset: 2px }`；不要移除任何元素的焦点样式。
- 装饰图标 `aria-hidden="true"`；按钮可访问名称（现有 `aria-label`）不变。
- 移动端点击区 ≥ 44×44。
- `prefers-reduced-motion: reduce` 时过渡时长为 0（tokens.css 已处理）。

## 10. 动效

只做颜色、边框、阴影过渡：120ms `cubic-bezier(.2,.7,.2,1)`；按钮按下位移 1px；toast 180ms 上移淡入。**删除**卡片悬停 `translateY(-1px)` 浮起效果。

## 11. 非目标

- 不做深色模式（Token 已集中，可在后续迭代加）。
- 不改搜索、识别、下载、导入等任何业务逻辑，不改数据文件。
- 不引入构建工具、框架或外部 CDN 字体。

## 12. 文案变更清单（需与用户确认的标注 ⚠）

| 位置 | 原文 | 新文 |
| --- | --- | --- |
| 搜题 h1 | 每一道题，都有出处。 | 拍一下，找出处。 |
| 各页主标题上方英文标签 | YOUR SHORTCUT TO THE MARK SCHEME 等 | 删除 |
| 搜题说明 | 一段题干，一张截图。找到原卷，直接查看答案。 | 粘贴题干、输入试卷编号，或上传截图，查找原卷与 MS 评分标准。 |
| 搜题空状态 | 把“这道题是哪年的？”交给这里。… | 输入题干或上传截图开始查找 + 三条搜索技巧（取自帮助） |
| 报头右侧 | （无） | 完全非营利 ⚠ |
| 页脚条带 | （无） | 永久免费 · 永久开源 · 永久无广告 · 全部功能免费不限次，含 LLM 图片识别 · 免注册 ⚠ |

⚠ 文案取自用户提供的海报；执行前若无法确认，保留结构、把 ⚠ 文案集中在一个 HTML 片段里，便于用户一处修改。
