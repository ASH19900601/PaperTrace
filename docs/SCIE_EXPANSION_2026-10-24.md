# 深国交课程扩展与可读性验收（2026-10-24）

本报告接续 `SCIE_COVERAGE_2026-10-24.md` 的调研快照。按用户要求先改善 OCR 与匹配结果的阅读体验，再补充学校已有科目的公开试卷；AP History 明确跳过。已有非深国交科目和历史试卷全部保留。

## 已交付

- OCR 改为整理后的阅读卡片，支持修改、重新匹配和展开原始识别文字。仅过滤已观察到的重复 E/F 背景噪声及答题横线，保留原始 OCR；DNA 字母序列、数值、选项和公式不按噪声删除。
- 结果卡片选择与查询相关的完整段落，限制摘要长度和高亮数量。详情合并排版断行、分隔小问、单独显示公式/图表文字，并可展开原始 PDF 提取内容。
- 新增考试局、AP/GCSE/AS/A Level 类别与一月考季；支持字母数字科目代码及 `AP-PSY_s24_qp_1-p3` 这样的精确页面编号检索。复制来源编号包含稳定索引 ID。
- 中文、日语连续文本增加相邻字符检索，短片段也可命中句中内容。照片 OCR 仍使用英文模型，未宣称支持其他语言截图识别。

## 实际题库

原有 **4,442 份试卷、59,892 条题目记录**全部保留，原题记录逐条一致。新增 **2,277 份试卷**，科目/考试版本代码从 22 增至 **72**。

现有 **6,719 份 QP**，**59,892 条按题号索引**和 **22,418 条按原卷页码索引**，合计 **82,310 条可搜索记录**。已检查 **6,667 份 MS**。代码数不等于学校开设课程数，页面数也不等于独立题目数。

新增科目含选答题、阅读材料、音乐与艺术任务。为避免给这些内容标错题号，本轮统一按页建立索引；页面中可能包含多道题、公式表或阅读说明。原始 PDF 是排版和题号的核对依据。

| 考试局 / 类别 | 代码 | 科目 | 实际年份 | QP | 页面索引 |
| --- | --- | --- | --- | ---: | ---: |
| CAIE / IGCSE | 0400 | 艺术与设计 | 2020–2026 | 12 | 44 |
| CAIE / IGCSE | 0410 | 音乐 | 2020–2026 | 38 | 562 |
| CAIE / IGCSE | 0413 | 体育 | 2020–2026 | 39 | 599 |
| CAIE / IGCSE | 0457 | 全球视野 | 2020–2026 | 46 | 400 |
| CAIE / IGCSE | 0460 | 地理 | 2020–2026 | 126 | 2540 |
| CAIE / IGCSE | 0470 | 历史 | 2020–2026 | 137 | 1045 |
| CAIE / IGCSE | 0509 | 中文（第一语言） | 2020–2026 | 38 | 549 |
| CAIE / IGCSE | 0519 | 日语（旧大纲） | 2020–2021 | 4 | 40 |
| CAIE / IGCSE | 0520 | 法语 | 2020–2026 | 138 | 1414 |
| CAIE / IGCSE | 0530 | 西班牙语 | 2020–2026 | 135 | 1384 |
| CAIE / IGCSE | 0547 | 中文（外语） | 2023–2026 | 35 | 331 |
| Pearson Edexcel / GCSE | 1DR0 | 戏剧 | 2021–2024 | 7 | 372 |
| Pearson Edexcel / GCSE | 1EN0 | 英语语言 | 2020–2024 | 16 | 408 |
| Pearson Edexcel / GCSE | 1JA0 | 日语 | 2020–2024 | 24 | 330 |
| Pearson Edexcel / GCSE | 1PE0 | 体育 | 2020–2024 | 10 | 241 |
| Pearson Edexcel / IGCSE | 4EA1 | 英语语言 A | 2020–2024 | 34 | 757 |
| Pearson Edexcel / IGCSE | 4ET1 | 英语文学 | 2020–2024 | 36 | 1054 |
| CAIE / AS Level | 8022 | 西班牙语语言 | 2024–2026 | 45 | 497 |
| CAIE / AS Level | 8028 | 法语语言 | 2025–2026 | 18 | 210 |
| CAIE / AS Level | 8386 | 运动与体育 | 2024–2026 | 15 | 194 |
| CAIE / AS Level | 8695 | 英语语言与文学 | 2023–2026 | 42 | 464 |
| CAIE / AS & A Level | 9093 | 英语语言 | 2020–2026 | 184 | 845 |
| CAIE / AS & A Level | 9479 | 艺术与设计 | 2020–2026 | 15 | 45 |
| CAIE / AS & A Level | 9482 | 戏剧 | 2021–2026 | 33 | 201 |
| CAIE / AS & A Level | 9483 | 音乐 | 2020–2025 | 36 | 348 |
| CAIE / AS & A Level | 9489 | 历史 | 2021–2026 | 140 | 584 |
| CAIE / AS & A Level | 9695 | 英语文学 | 2020–2026 | 190 | 2591 |
| CAIE / AS & A Level | 9696 | 地理 | 2020–2026 | 154 | 462 |
| CAIE / AS & A Level | 9699 | 社会学 | 2020–2026 | 177 | 378 |
| CAIE / A Level | 9844 | 西班牙语语言与文学 | 2024–2026 | 43 | 285 |
| CAIE / A Level | 9898 | 法语语言与文学 | 2025–2026 | 18 | 159 |
| CAIE / AS & A Level | 9990 | 心理学 | 2020–2026 | 182 | 1357 |
| Pearson Edexcel / A Level | 9DR0 | 戏剧与剧场 | 2021–2024 | 4 | 225 |
| Pearson Edexcel / A Level | 9PE0 | 体育 | 2021–2024 | 8 | 200 |
| College Board / AP | AP-ARTH | 艺术史 | 2023–2026 | 4 | 40 |
| College Board / AP | AP-BIO | 生物 | 2023–2026 | 4 | 52 |
| College Board / AP | AP-CALCBC | 微积分 BC | 2023–2026 | 4 | 36 |
| College Board / AP | AP-CHEM | 化学 | 2023–2026 | 4 | 71 |
| College Board / AP | AP-CSA | 计算机科学 A | 2023–2026 | 4 | 66 |
| College Board / AP | AP-HUG | 人文地理 | 2023–2026 | 7 | 39 |
| College Board / AP | AP-LANG | 英语语言与写作 | 2023–2026 | 7 | 88 |
| College Board / AP | AP-LIT | 英语文学与写作 | 2023–2026 | 7 | 41 |
| College Board / AP | AP-MACRO | 宏观经济 | 2023–2026 | 7 | 32 |
| College Board / AP | AP-MICRO | 微观经济 | 2023–2026 | 7 | 32 |
| College Board / AP | AP-MUSIC | 音乐理论 | 2023–2026 | 8 | 44 |
| College Board / AP | AP-PHYSM | 物理 C 力学 | 2023–2026 | 6 | 84 |
| College Board / AP | AP-PSY | 心理学 | 2023–2026 | 7 | 42 |
| College Board / AP | AP-STAT | 统计 | 2023–2026 | 4 | 66 |
| AQA / A Level | AQA-7582 | 体育 | 2020–2025 | 12 | 432 |
| AQA / GCSE | AQA-8261 | 戏剧 | 2020–2025 | 6 | 138 |

## 官网依据与课程版本差异

- [学校课程总览](https://www.scie.com.cn/academic-departments/)、[IGCSE 选修科目](https://www.scie.com.cn/igcse-optional-subjects/)、[AS/A Level 艺术及体育](https://www.scie.com.cn/a-levels/art-visual-and-performing/)、[AP 清单](https://www.scie.com.cn/ap/)是课程范围依据。AP 按用户要求排除 History，另 14 门均已收录 College Board 2023–2026 的公开 FRQ；音乐视唱与笔试分别建档。
- [学校 Pearson 获奖记录](https://www.scie.com.cn/4-scie-students-won-the-outstanding-pearson-learner-awards/)明确出现 GCSE 日语、GCSE 英语语言、IGCSE English Language A 和 IGCSE 英语文学，并提到 Pearson 戏剧、体育。由此补充 1JA0、1EN0、4EA1、4ET1、1DR0/9DR0、1PE0/9PE0。GCSE 日语采用 Edexcel 资料；CAIE 0519 仅标为旧大纲参考。[Cambridge 新日语 0716](https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse-japanese-0716/)首考在 2027 年，未拿样卷冒充真题。
- 学校课程页写 AQA 戏剧和两年制 AQA A Level 体育，历史学校材料又出现 Edexcel；因此不同考试局分别列出，不能保证每届学生同时使用全部版本。Cambridge 9482 是同科目补充，学校课程页未明确其当前报考代码。
- [学校语言学部资料](https://www.scie.com.cn/hof-languages/)曾列出中文第一语言和中文外语的学习成果，因此同时保留 0509 和 0547。
- [学校 2025–2026 英语教师招聘文件](https://www.scie.com.cn/wp-content/uploads/2024/12/English-teacher-Ad-2025-2026.pdf)明确高年级英语涉及 Cambridge、OxfordAQA，及两年修读的 AS 英语语言与文学。已补 Cambridge 9093、9695、8695；**OxfordAQA 9670/9675 尚未收录**，其[官方资源页](https://www.oxfordaqa.com/resources/?dfg_filter=426&dfg_page=1)说明真题和评分标准需获批学校的教师账号，匿名访问未取得可下载原卷。没有绕过登录或用英国 AQA/样卷替代。
- 官网并非统一的当年选课和报名清单。上述代码用于覆盖学校已有学科与有依据的考试版本，不代表学校确认的全部当前报名代码。EPQ、校本课程、作品集、实践考核及听力音频不计作已完整覆盖。

## 验收与已知边界

- `npm test`：45/45 通过；`manage.py test-extraction`：15/15；`manage.py test-corpus`：13/13。后者包含后续 CAIE 更新保留 AP 元数据和页面索引的回归。JS 语法检查通过。
- 从各新增代码的原始 PDF 独立读取一段文字，再限定科目、年份、考季、卷别验证原卷页码：50/50 通过。这是集成抽测，不是全库随机准确率。
- 另外人工读取 AP 心理学、AQA 体育、中文、旧日语、戏剧的 5 条原句，不加过滤进行搜索，均命中首位及正确页码；详见机器可读报告。
- 浏览器实际跑过“示例截图 → OCR → 自动搜索 → 详情 → 原始文字展开/收起 → 修改”。示例正确命中 9702_s24_qp_22 第 2 题，原卷 p.6–8、MS p.7。新增 AP 心理学原句在本次浏览器观察中为 903 ms，命中 AP-PSY_s24_qp_1 p.3；这是单次耗时，非性能保证。
- 索引元数据记录每份外部试卷的实际 QP/MS URL、官方资源页、考试局和原始标题/文件名。所有计入 QP/MS 的文件都经过匿名下载、PDF 文件头和 PyMuPDF 可解析检查。未配对 MS 的条目在 UI 中明确说明，并链接到相应考试局资源页。
- 已发现但未成功收录的 4 份：`0547_s26_qp_42`、`9990_m20_qp_42`（下载/缓存未成功）；`1DR0_w20_qp_3`、`4EA1_s21_qp_2`（匿名链接未返回 PDF）。全库 52 份 QP 尚未配对 MS，其中包含原有缺项及艺术任务等。所有年份均为部分覆盖。

## 接手与复现

- 权威目录：`dist/data/manifest.json`；本轮备份路径在 `reports/scie-baseline.json`。
- CAIE 新科目注册：`scripts/scie-subjects.json`。日常维护继续使用 `manage.py rebuild --discover`；四位数字以外的已有科目不会被删除。
- AP 发现：`scripts/discover_ap.py`。其他考试局的已发现公开链接保存在 `reports/scie-external-sources.json`；`scripts/prepare_scie_sources.py` 可从本轮缓存的官方资源清单重建它。
- `scripts/ingest_external.py` 只写 `.cache/scie-external-stage.json`，不直接改在线索引。`scripts/merge_scie_stages.py` 是本轮交付合并工具，依赖本轮原始备份和暂存文件；不要在另一个机器上把此审计路径误当作通用迁移配置。
- 原始 PDF 缓存在 `.cache/pdfs/` 与 `.cache/external-pdfs/`，未复制进发布目录。没有构建发布包、修改历史包校验值或推送 GitHub。
- 回归：`npm test`；`python manage.py test-extraction`；`python manage.py test-corpus`。新增科目抽测：`python scripts/scie_search_probes.py` 后执行 `node scripts/audit_scie_search.mjs`，需要本轮原始 PDF 缓存。

## 证据文件

- [覆盖与保留检查](reports/scie-expansion-final.json)
- [新增科目检索验收](reports/scie-search-validation.json)
- [外部考试局链接清单](reports/scie-external-sources.json)
- [OCR 阅读卡片](screenshots/ocr-readable-2026-10-24.png)
- [匹配详情排版](screenshots/match-readable-2026-10-24.png)
- [AP 真实检索](screenshots/scie-ap-search-2026-10-24.png)

- [最终题库总览](screenshots/scie-library-2026-10-24.png)

## 默认科目范围（2026-10-24 后续调整）

- 默认展示与检索：上述 50 个新增版本，加原有课程对照中的 16 个代码，以及用户确认属于深国交的 9608 旧计算机大纲，共 **67 个科目/考试版本、6,033 份 QP、72,055 条索引**。它是按科目和学段对应的使用范围，包含同科目参考版本，不是学校当年报考版本的认证清单。
- 额外范围：0417 ICT、0452 IGCSE 会计、0606 附加数学、0654 协调科学双证、9609 A Level 商业。这些科目未在对应学段确认；9608 已按用户确认移入深国交默认范围。所有题库保留，用户可逐项加入或一键扩展到全部；扩展后总览仍把深国交科目排在前面。
- `dist/subject-scope.mjs` 是显式默认清单。维护者在核对新增课程后更新该清单；未知导入科目默认列为可选扩展，不按名称/代码前缀猜测学校开设情况。AP History 继续跳过。
- 搜索引擎按科目分桶，传入范围后只遍历所选桶；范围外的明确试卷编号也不会自动越过设置。无结果时提供一键扩展重搜入口。科目、年份、卷别、学段筛选与范围取交集。
- 当前范围同步作用于卡片、总览统计、试卷表、科目下拉框、文字与 OCR 搜题。本机偏好保存到 `pt-subject-scope`；恢复深国交范围会清除不再适用的筛选，防止留下不可见的科目限制。收藏及导入记录继续可访问。

验证：`npm test` 50/50 通过（`.cache/scie-scope-tests.log`）。新增测试覆盖实际遍历边界、默认清单、总览/搜索同步、本机保存及切换范围时的异步结果作废。浏览器实测：0417_m20_qp_12-q1 默认无结果，扩展后唯一命中；恢复默认后 9702_s24_qp_22 Q2 命中且页码正确；单独勾选 ICT 后刷新仍保留。窄屏页面截图：`docs/screenshots/scie-default-scope-2026-10-24.png`。
