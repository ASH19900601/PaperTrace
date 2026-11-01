# PaperTrace UI 改版设计包 · 第三版

v1/v2（`docs/ui-redesign/`，原样保留）从宣传海报出发，结果用了一整套流行的“海报 / 粗野主义”默认值：大写字距标签、等宽小字、零圆角、黑粗边框、硬投影、口号条、徽章、大数字统计。这些正是公开资料里总结的 AI 生成界面特征，所以显得“AI 味重”。完整调研见 [`RESEARCH.md`](RESEARCH.md)。

**v3 的方向：一个安静、可靠的查题工具。** 从“学生查一道题”的流程和学生熟悉的工具出发：搜索引擎式结果列表、荧光笔黄命中词、琥珀色收藏星、系统中文字体、浅灰侧栏、浅蓝选中态。海报只贡献品牌蓝 `#204FFF` 和字标。

样张：`mockup/shots/search-desktop.png`、`photo-empty-desktop.png`、`pages-desktop.png` 及对应 `-mobile.png`。

## 怎么用

1. 把 [`PROMPT.md`](PROMPT.md) 分隔线之间的内容交给执行 AI。
2. 它按 [`TASKS.md`](TASKS.md) 分阶段实施并自检。
3. 你看它交付的 `docs/UI_REDESIGN_V3_*.md` 与 before / after 截图验收。

## 文件

| 文件 | 作用 |
| --- | --- |
| `RESEARCH.md` | AI 味的原因：资料调研 + 对 v1/v2 的逐条自查 + v3 的应对 |
| `DESIGN_SPEC.md` | v3 规范：定位、原则、禁止清单、颜色、字体、布局、组件、页面、状态、文案 |
| `CLASS_MAP.md` | 不能改的东西、允许的 HTML 改动、旧 → 新映射 |
| `TASKS.md` | P0–P7 任务与验收 |
| `PROMPT.md` | 给执行 AI 的提示词 |
| `tokens.css` / `icons.svg` / `favicon.svg` | 复制进 `dist/` 使用（图标只有 9 个：导航 7 + 搜索方式 2） |
| `mockup/reference.css` | 真实类名写的参考实现 |
| `mockup/*.html`、`mockup/shots/*.png` | 样张与渲染图 |
| `selector-inventory.json` | 改版前选择器清单 |
| `scripts/check-css.mjs` | 守门：Token 化颜色、字号、字重，以及 AI 味特征（大写、字距、硬投影、粗边框、色条、等宽滥用、装饰英文） |
| `scripts/shoot-dist.cjs` | 真站 4 个宽度截图，检查溢出、脚本错误、密度和计算后的大写文字 |
| `scripts/render-mockups.cjs` | 重新渲染样张 |

## 速记

- 蓝色 = 可以点 / 当前选中；其余是中性灰。
- 列表用列表，表格用表格，卡片只给要比较或选择的东西。
- 每个元素都要说得出它表达什么信息。
- 字号 22 / 17 / 16 / 14 / 13 / 12，字重 400 / 500 / 600，圆角 4 / 6 / 8。
- 只改 HTML 静态标记与 CSS。
