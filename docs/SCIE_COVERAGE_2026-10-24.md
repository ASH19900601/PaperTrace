# 深国交官网课程与 PaperTrace 题库覆盖对照

> 后续实施已完成：本文保留扩展前的调研快照；最新覆盖、学校考试局证据补充及剩余限制见 [SCIE_EXPANSION_2026-10-24.md](SCIE_EXPANSION_2026-10-24.md)。AP History 已按用户要求跳过。

核查日期：2026-10-24。学校：深圳国际交流书院（SCIE）。题库快照：`dist/data/manifest.json`，更新时间 `2026-10-24T10:13:54Z`。

## 结论与统计口径

现有题库集中于剑桥 CAIE 的数学、自然科学、计算机和商科。英语、其他语言、人文、艺术、体育及 AP 仍存在大块空白。

- 全库：22 个大纲代码，4,442 套 QP，59,892 条题目记录；总体年份跨度 2018–2026，不代表各年份、考季、卷别完整。
- 按“科目名称＋学段”与官网课程对应：IGCSE 8 项、AS/A Level 8 项，合计 16 项；这些代码在本库中合计有 3,709 套 QP、49,354 条题目记录。
- 上述 16 项是科目层面的对应，不代表学校逐科大纲代码均已确认，更不代表任意试题均能搜到。官网明确写出数学 9709、进阶数学 9231，其他匹配项中有些仅说明课程名称或考试局。
- AP 官网逐项列出 15 门，本库对应 AP 真题为 0。不能用 CAIE 的同名学科替代 AP 真题覆盖。
- 中文官网简介当前写“63 门”课程，但未提供可逐项核算的完整 63 项清单。不同课程页也有选课数量及名称差异，因此不计算 `22/63` 或声称全校课程覆盖率。

学校同时获得 Cambridge、OxfordAQA、Edexcel 授权，并开设 College Board AP。来源：[中文官网简介](https://www.alevel.com.cn/about/)。

## 已有题库与官网课程的科目对应

表内代码是 **PaperTrace 已收录的 CAIE 代码**。学校没有明确给出代码的条目，仍需结合实际试卷封面或当年选课手册确认；“—”表示本次官网课程页未确认该学段开设该科目，不表示学校绝对不开设。

| 官网科目 | 本库 IGCSE：代码 / QP / 题目记录 | 本库 AS & A Level：代码 / QP / 题目记录 |
| --- | --- | --- |
| 数学 | 0580 / 239 / 4,388 | 9709 / 372 / 3,030 |
| 进阶数学 | — | 9231 / 168 / 1,178 |
| 物理 | 0625 / 359 / 6,565 | 9702 / 333 / 3,773 |
| 化学 | 0620 / 356 / 6,043 | 9701 / 334 / 3,586 |
| 生物 | 0610 / 255 / 4,222 | 9700 / 269 / 2,945 |
| 计算机科学 | 0478 / 114 / 959 | 9618 / 118 / 886 |
| 经济 | 0455 / 92 / 1,607 | 9708 / 196 / 3,451 |
| 商业研究 | 0450 / 92 / 368 | — |
| 会计 | — | 9706 / 154 / 1,671 |
| 综合科学（Combined Science） | 0653 / 258 / 4,682 | — |
| 合计 | 8 项 / 1,765 / 28,834 | 8 项 / 1,944 / 20,520 |

来源：[IGCSE 核心课程](https://www.scie.com.cn/igcse-information/igcse-core-subjects/)、[IGCSE 理科](https://www.scie.com.cn/igcse-information/igcse-sciences/)、[IGCSE 选修课程](https://www.scie.com.cn/igcse-optional-subjects/)、[学科总览](https://www.scie.com.cn/academic-departments/)、[AS/A Level 数学与计算机](https://www.scie.com.cn/a-levels/mathematics-computer-science/)、[AS/A Level 人文社科](https://www.scie.com.cn/a-levels/humanities-social-science/)。

一个对搜题很重要的细节：官网核心课程页明确说明，常规数学教学提前衔接 AS，G2 考 9709 的 P1、M1，随后学习 P3、S1。因此深国交 G 年级的数学搜题也可能需要 9709，不能只按年级筛到 IGCSE。

当前年份：0580、0478、0620、0625、9701、9702、9709 为 2018–2026；9618 为 2021–2026；表内其他代码为 2020–2026。这里仅表示每年有收录，仍有考季、组件与答案配对缺口，详见 [已有审计](AUDIT_2026-10-24.md)。

## 官网已列出、当前题库缺失的课程

### IGCSE / G 年级

| 课程类别 | 缺失的课程 | 已核实的边界 |
| --- | --- | --- |
| 英语 | 英语语言、英语文学 | 学科总览和 2026–2027 官方介绍说明 G 阶段英语采用 Edexcel IGCSE/GCSE；不能直接拿 CAIE 英语题替代 |
| 中文及其他语言 | 中文、法语、日语、西班牙语 | 中文还有校本文学、历史与文化内容；法语详情明确 0520；其余代码须进一步对齐 |
| 人文 | 地理、历史、全球视野 | 官网历史明确 Cambridge IGCSE 0470；全球视野说明采用 Cambridge |
| 艺术与体育 | 艺术与设计、戏剧、音乐、体育 / Sports Science | 戏剧详情写 AQA；体育存在笔试与实践评估，普通题库仅能覆盖可获取的试题部分 |

来源：[IGCSE 核心课程](https://www.scie.com.cn/igcse-information/igcse-core-subjects/)、[IGCSE 选修课程](https://www.scie.com.cn/igcse-optional-subjects/)、[学科总览](https://www.scie.com.cn/academic-departments/)、[2026–2027 官方介绍](https://www.scie.com.cn/wp-content/uploads/2025/11/SCIE-Brochure-2026-2027.pdf)。

### AS / A Level

| 课程类别 | 缺失的课程 | 已核实的边界 |
| --- | --- | --- |
| 英语与其他语言 | 英语语言、英语文学、法语、西班牙语 | 官网现代语言页分别列出这些课程；不能依据语言名称自动确定考试代码 |
| 人文社科 | 地理、历史、心理学、社会学 | 官网历史明确 2024 年入读学生使用 Cambridge 9489 |
| 艺术 | 艺术与设计（Fine Art）、戏剧、音乐 | 艺术详情明确 Cambridge；实践、作品集不等同于可搜索的笔试题 |
| 体育 | AS Sport & Physical Education；A Level Physical Education | 官网分别说明前者为 Cambridge AS，后者是 AQA 两年制 A Level，需要分开建档 |

来源：[现代语言](https://www.scie.com.cn/a-levels/modern-languages/)、[人文社科](https://www.scie.com.cn/a-levels/humanities-social-science/)、[艺术、表演与体育](https://www.scie.com.cn/a-levels/art-visual-and-performing/)。

学科总览还列出 EPQ。它属于项目资格，宜单独规划支持，不计作一门常规 QP/MS 笔试题库。

### AP：15 门全部未收录

官网列出的课程为：英语语言与写作、英语文学与写作、微积分 BC、统计、生物、化学、物理 C 力学、人文地理、历史、艺术史、计算机科学 A、宏观经济、微观经济、音乐理论、心理学。官网“历史”仅写 AP History，没有明确具体分支，本次不推定为美国史、世界史或欧洲史。[AP 课程页](https://www.scie.com.cn/ap/)

## 题库里另外 6 个代码怎样看

| 已有代码 | 含义 | 未计入上述 16 项的原因 |
| --- | --- | --- |
| 0417 | IGCSE ICT | 本次学校课程清单列 Computer Science，不能把 ICT 当成同一科 |
| 0452 | IGCSE 会计 | 官网明确列出的会计在 AS/A Level 阶段 |
| 0606 | IGCSE 附加数学 | 本次课程详情未确认；也不能与 9231 进阶数学混为一科 |
| 0654 | IGCSE 协调科学双证 | 官网写 Combined Science；未确认采用双证代码 |
| 9608 | AS/A Level 旧计算机大纲 | 属于已覆盖计算机学科的历史补充，不另算一门当前课程 |
| 9609 | AS/A Level 商业 | 本次官网的人文社科清单没有列出；IGCSE Business Studies 不等于 A Level Business |

这些数据继续有价值，本次没有删除或调整题库。

## 针对深国交的下一轮扩展建议

1. **优先补齐已确定的缺科**：IGCSE 历史 0470、A Level 历史 9489；随后核对并补地理、心理学、社会学、全球视野等 CAIE 课程。Cambridge 的地理 0460/9696、心理学 9990、社会学 9699 是可核验的候选代码，但除学校已明示的代码外，不直接宣称是深国交当前报考代码。
2. **同时把英语列为高优先级**：英语是学校必修课程，也是本库整块缺失；先确定 G 阶段 Edexcel 具体规格，以及 AS/A Level 英语语言和文学的实际考试代码，再扩充对应真题。
3. **扩展考试体系后接入 AP、Edexcel、AQA**：目前建库脚本以 CAIE 路径、四位数字大纲代码及 m/s/w 考季识别试卷，本机导入也沿用此结构。需要先支持考试局和不同试卷编号，才能可靠加入这些题目，不能只把科目显示名加进去。
4. **语言和艺术分类型验收**：现有 OCR 使用英文模型。中文、日语及其他语言的截图检索需要独立实测；听力音频、音乐谱例、作品集与实践评估也不能用题目条数冒充完整覆盖。

候选代码参考：[Cambridge 地理课程衔接说明](https://www.cambridgeinternational.org/Images/480719-support-for-geography.pdf)、[Cambridge 心理学大纲](https://www.cambridgeinternational.org/Images/744686-2028-2030-syllabus.pdf)、[Cambridge 社会学 9699](https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-sociology-9699/)。

实现依据：`scripts/build_corpus.py` 的 CAIE 下载路径、文件名解析与英文 OCR；`dist/import-utils.mjs` 的四位代码及考季校验；`dist/search.mjs` 的来源编号解析。本次仅调研并形成对照文档，未修改程序或导入新试卷。

## 核查限制

- 中文官网通过 HTTP 请求实时读取；英文官网部分页面直连超时或 TLS 失败，使用搜索服务返回的官网正文进行核对。未采用培训机构的课程清单作为结论依据。
- 官网课程页没有统一标注适用学年。核心页、总览页与选修页在选课数量等细节上有差异；本报告确认公开列出的科目，不把它作为每位学生当年可选课的最终承诺。
- 科目覆盖、真题年份完整性、文本搜题准确率和截图 OCR 准确率是不同指标。本报告只比较课程与题库范围；搜索能力实测仍以现有审计报告为准。
