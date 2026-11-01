# 为什么 v1 / v2 有“AI 味”——调研与自查

> 调研日期：2026-11-01
> 对象：`docs/ui-redesign/`（v1 2026-10-31、v2 2026-11-01，原样保留，未修改）
> 方法：先查公开资料里总结的“AI 生成界面特征”，再逐条对照 v1/v2 的规范、参考 CSS 和样张截图，找出命中的地方和根本原因。

## 1. 资料怎么说

一共读了 7 篇资料（链接见文末），结论比较一致：**单独一个特征不能证明是 AI 做的，但一组“没经过选择的默认值”同时出现，就会被认出来。**

### 1.1 资料里列出的特征（与本项目相关的部分）

| 特征 | 资料原话（节选） | 出处 |
| --- | --- | --- |
| 每个标题上方加大写、拉开字距的小标签 | “a tracked-out ALL-CAPS eyebrow label above every heading”；“Adding unnecessary typographic labels above content.” | Anthropic frontend-design skill |
| 小号数据标签用等宽字体 | “a monospace face for small data labels” | 同上 |
| 链接和按钮文字后面加箭头 | “'→' appended to link and button text” | 同上 |
| 标题里只给一个词上强调色 | “Accenting just a single word or phrase in a headline” | 同上 |
| “大数字 + 小标签”的统计块 | “a big number with a small label, supporting stats … is the default treatment, so only use it if that's truly the best option.” | 同上 |
| 报纸版式：发丝线、零圆角、密排分栏 | “a broadsheet-style layout with hairline rules, zero border-radius, and dense newspaper-like columns” 是默认方案之一，“defaults rather than choices” | 同上 |
| 近黑色代替黑色 + 唯一一个刺眼的强调色 | “tinted near-black (#0B0B0B, #111) standing in for black”；“a single bright … accent” | 同上 |
| 硬投影（无模糊偏移阴影） | 被列为过时写法：“overused, generic, and look like a theme demo, not a real brand” | shopthemedetector 2025、theplusaddons 2026 |
| 新粗野主义整页风格 | “cooling as a full-page style”，粗边框、硬阴影、按下效果只适合当局部强调 | theplusaddons 2026 |
| 首屏留给口号 | “the first screen spends most of its height on a slogan … while the useful information is pushed below the fold” | TechYorker |
| 号召条（CTA band） | “a hero, three feature cards, a testimonial row, a call-to-action band …” 是模板标配 | TechYorker |
| 标题上方的小徽章 | “A little badge above the headline”——在最值钱的位置放了“最没价值的一句话” | SCALR |
| 带彩色左边框的卡片 | “a Bootstrap alert component wearing a suit” | SCALR |
| 处处同一套细线图标 | “The same thin icons everywhere.”；“Every feature gets an icon.” | SCALR、InterfaceKit |
| 每个东西都装进同样的卡片 | “every section becomes a row of identical rounded rectangles, even when a list, table … would communicate better” | TechYorker |
| 口号式、可互换的文案 | 检验法：“could a competitor put this exact sentence on their site without changing a word?” | SCALR |
| 工具被做成落地页 | “This is a dashboard, not a landing page.” 模型偏爱落地页 | AskCodi |
| 只换颜色没用 | “a new color only gives the same template a different coat of paint.” | InterfaceKit |
| 根本原因 | 模型输出训练数据里最常见的模式；“高级”“简约”这类描述会被翻译成默认套路 | GeekyAnts |

### 1.2 资料推荐的方向

- 结构元素（编号、分割线、标签）**必须承载信息**，不能只是装饰（Anthropic skill）。
- 从这个领域自己的“行话”和最有代表性的东西出发，而不是从流行风格出发（Anthropic skill）。
- 列表用列表，可比较的值用表格；只有边界能帮用户比较或选择时才用卡片（TechYorker）。
- 保留品牌真实的颜色，但不要把它刷满整个界面（TechYorker、SCALR）。
- 工具要设计状态：加载、空、错误、禁用、成功，而不是只做一张好看的静态图（InterfaceKit）。
- 文案要具体，换个产品就说不通才对（SCALR）。

## 2. 对照 v1 / v2：命中了哪些

| # | AI 特征 | v1 / v2 中的具体位置 | 严重度 |
| --- | --- | --- | --- |
| A1 | 大写拉字距标签 | 面包屑 `工作空间 / 试题搜索` 做成蓝色 uppercase .14em；`SCOPE` 伪元素；`.tag`、表头、`.subject-grid-head`、`.tool-kind` 全是 uppercase；v1 每个页面标题上方都有英文 eyebrow | 高 |
| A2 | 等宽字体做小标签 | `.code`、`.card-meta`、`.examples` 按钮、`td`、`.dl-file-name`、`.subject-card p`、`#searchTiming`、`.llm-toggle span` 都用等宽 | 高 |
| A3 | 报纸版式 + 零圆角 | 规范原则 P2“线代替盒子”、`--pt-radius: 0`、2px 墨线 + 1px 发丝线，正是资料点名的默认方案 #3 | 高 |
| A4 | 近黑 + 唯一刺眼强调色 | `#101113` 墨黑 + `#204FFF` 电光蓝 + 纸白，三色全站铺开 | 中 |
| A5 | 硬投影 / 粗黑边框 | `--pt-shadow-lift: 4px 4px 0 蓝`、`--pt-shadow-pop: 8px 8px 0 墨`；搜索框、对话框 2px 墨框；按钮 1.5px 墨框 + 按下位移 | 高 |
| A6 | 标题单词强调 | `拍一下，<span class="accent">找出处。</span>`、`题库总览<span class="accent">。</span>` | 中 |
| A7 | 大数字 + 小标签 | `.index-stat` 64px → 32px 大数字；`.stat-grid` 四格大数字 | 中 |
| A8 | 首屏口号 | v1 首页 76px “拍一下，找出处。”；v2 缩到 40px 但仍是口号 | 中 |
| A9 | 号召条 + 徽章 | 页脚黑色口号条“永久免费 · 永久开源 · 永久无广告”；报头右侧蓝色“完全非营利”方块 | 高 |
| A10 | 彩色左边框卡片 | `.llm-options`、`.tools-summary` 4px 墨色左条；`#toast` 6px 蓝色左条；`.error-box` 4px 红色左条 | 中 |
| A11 | 按钮文字后加箭头 | `查找试题 ↗`（静态 HTML，可删）；JS 里的 `原卷 ↗`、`查看 MS ↗`、`下载 ↓` | 中 |
| A12 | 处处图标 | 导航、搜索 tab、上传区、按钮都配同一套细线图标 | 低 |
| A13 | 中文站点里的装饰英文 | `SCOPE`、`Text search`、`Image / PDF`、`PAPERTRACE / 01`、`Made for independent learners.`、`Private workspace`、`Find the question.` 等（资料未直接提到，属于同一类“装饰标签”的推论） | 中 |
| A14 | 方块状态点 | `.status-dot` 8px 蓝方块放在说明文字前，没有表示任何状态（资料未提到，推论） | 低 |
| A15 | 工具被当成海报 / 落地页 | 整套视觉从两张宣传海报出发：取景框、黑色条带、超粗标题、蓝块徽章 | **根因** |

v2 已经删掉了插画、箭头、流程图并提高了密度，但 A1–A7、A9–A11、A13 仍在，所以“AI 味”没有消失：**v2 删的是图，留下的是一整套流行风格的默认值。**

## 3. 根本原因

1. **出发点错了：从海报出发，而不是从任务出发。** 海报是广告，要在一秒内抓住眼球；PaperTrace 是学生要连续用一两个小时的查题工具。把广告的语言（口号、大字、色块、徽章、条带）搬进工具，正好落在资料说的“工具被做成落地页”上。
2. **“瑞士 / 粗野主义”本身就是现在最常见的默认风格之一。** 我把“像海报”翻译成了大写字距标签、等宽小字、零圆角、发丝线、硬投影、近黑加亮蓝——每一项单独看都合理，合在一起就是资料点名的默认组合。
3. **装饰性结构太多。** 很多标签、线、色条、编号只是在“看起来有设计感”，没有承载信息。
4. **没有从这个领域自己的东西取材。** 学生熟悉的是：试卷与评分标准本身、搜索引擎的结果列表、荧光笔、收藏星标、中文系统字体。v1/v2 一样都没用上。
5. **文案是口号而不是说明。** “拍一下，找出处。”“永久免费 · 永久开源 · 永久无广告”换到任何一个搜题产品上都成立，按资料的检验法就是可互换的文案。

## 4. 第三版的应对（详见 `DESIGN_SPEC.md`）

| 原因 | v3 的做法 |
| --- | --- |
| 从海报出发 | 从“学生查一道题”的流程出发：搜索框 → 结果列表 → 原卷 / MS。海报只贡献品牌蓝和字标 |
| 流行风格默认值 | 去掉 uppercase、字距、等宽小字、零圆角、硬投影、粗黑边框、彩色左边框、黑色条带、徽章 |
| 装饰性结构 | 每条线、每个标签、每种颜色都要说明它表达什么信息，说不出就删 |
| 不取材于领域 | 结果用搜索引擎式列表；命中词用荧光笔黄；收藏用琥珀色星标；上传区用通用虚线框；中文系统字体 |
| 口号文案 | 标题写功能（“查找试题出处”），统计写成句子，页脚写事实（免费、开源并附 GitHub 链接、非官方声明） |

## 5. 局限

- 资料多为设计机构和工具厂商的博客，有推销成分；Anthropic 的 skill 是写给模型的指导，不是实证研究。
- 7 篇资料都没有直接提到“中文站点里的装饰英文”和“状态点”，表中 A13、A14 是我按同类原则做的推论。
- 资料也提醒：人类设计师完全可能选择同样的风格。问题不在某种风格本身，而在**没有经过选择、对任务没有帮助的默认值**。

## 来源

- [What makes a website look AI-generated? · InterfaceKit](https://blog.interfacekit.io/what-makes-a-website-look-ai-generated)
- [How to Spot an AI-Built Website and Fix the Generic CSS Look · TechYorker](https://techyorker.com/ai-built-website-tell-spot-the-generic-look-and-fix-it-with-css/)
- [AI Slop Web Design: Complete Guide (2026) · 925Studios](https://www.925studios.co/blog/ai-slop-web-design-guide)
- [The AI UI Problem Nobody Talks About · AskCodi](https://askcodi.substack.com/p/the-ai-ui-problem-nobody-talks-about)
- [20 Signs a Website Was Made by AI · SCALR](https://scalr.sg/blog/20-signs-a-website-was-made-by-ai/)
- [frontend-design SKILL.md · anthropics/skills](https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md)
- [Why Everything Your AI Builds Looks the Same · GeekyAnts](https://geekyants.com/blog/why-everything-your-ai-builds-looks-the-same)
- [Website Design in 2025: 10 Things That Are Totally Out of Style · Shop Theme Detector](https://shopthemedetector.com/blog/website-design-in-2025-10-things-that-are-totally-out-of-style/)
- [Web design trends 2026 · The Plus Addons](https://theplusaddons.com/blog/web-design-trends-2026/)
