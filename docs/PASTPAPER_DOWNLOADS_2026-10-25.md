# 真题下载页交接 · 2026-10-25

入口为 `dist/papers.html`，主页面侧栏新增「真题下载」。VPS 地址：<https://trace.siphot.com/papers.html>。

## 使用流程

1. 选择考试局、学习阶段、科目；默认采用 `subject-scope.mjs` 中的深国交范围，含 9608。勾选「包含额外科目」可扩展。
2. 单选年份、考季、分卷与版本，默认显示一份 QP 和一份配套 MS。CAIE 分开选择 Paper 与 Variant；Pearson 保留原卷标记。下载页当前仅提供 IGCSE 与 AS & A Level，其余阶段的来源目录保留。
3. 单项可以预览、翻页、下载，并查看 PDF 来源及资料目录。勾选多份资料可检查可用性、导出 CSV 或打包 ZIP。
4. ZIP 每批支持 100 份、150 MB，两个下载任务并行。停止后保存已获取的 PDF，未完成项可以单独重试。部分成功的 ZIP 包含未完成文件的名称及来源链接。

筛选保存在当前浏览器，也可复制地址分享。切换筛选会清空旧的文件勾选。可直接点击「下载这一套 QP + MS」获取当前组合。默认资料类型为 QP 与 MS，其他资料需主动勾选。

## 资源目录

当前收录 19,724 份资源、72 个科目或考试版本，目录年份范围为 2018–2026：

| 类型 | 文件数 |
| --- | ---: |
| QP 试卷 | 8,132 |
| MS 评分标准 | 8,225 |
| GT 等级分数线 | 896 |
| ER 考官报告 | 1,035 |
| IN 附页 | 787 |
| CI 实验说明 | 649 |

各科目的实际年份、类型和分卷从目录生成。AP 使用公开 FRQ。主目录约 15 KB，按需读取当前科目的独立 JSON，不加载搜题语料或 OCR 引擎。

目录来源为现有试卷 manifest、PapaCambridge 实际目录、Pearson 官方公开资源记录、College Board 和 AQA 官方资源。参考 pastpaper-finder 的逐级筛选及批量操作流程；科目、分卷映射和实现均基于本项目重新整理。

`scripts/prepare_download_catalog.py --discover` 重新读取 CAIE 实际目录；`--retry-missing` 使用 curl 及较低并发恢复失败目录。普通运行复用 `.cache/download-discovery.json`、`.cache/pearson-*.json` 和 `.cache/source-AQA-*.html`。重建完整目录应保留这些来源缓存，或者重新获取相应公开目录。发布的 `dist/data/downloads/` 已包含完整生成结果，运行网站无需来源缓存。

本轮六个目录请求仍遇到连接超时，记录在 `.cache/download-discovery.json` 的 `errors` 中；已有 manifest 中的 QP/MS 继续保留。文件可用性在请求时检查，来源故障会显示重试和来源入口。

## 实现文件与接口

- `dist/papers.html`、`papers.css`、`papers.mjs`：独立页面及交互。
- `dist/papers-core.mjs`：科目范围、筛选、排序、CSV 和标准 ZIP。
- `dist/data/downloads/index.json` 及科目分片：实际文件目录。
- `download_backend.py`：按目录 ID 获取 PDF，验证文件头，缓存 30 分钟；只接受已登记来源。
- `GET /api/paper-file?id=...&download=1`：原始 PDF 下载；省略 download 时可用于预览。
- `GET /api/paper-check?id=...`：返回 PDF 检查结果和大小。
- `/api/config` 新增 `downloads` 标志。纯静态环境使用来源直链与 CSV 导出。

## 验证

- 18 项 Node 测试通过：下载筛选与 ZIP、现有搜题状态、VPS 统计钩子。
- 25 项 Python 测试通过：下载接口 3 项、现有后台 16 项、统计后台 6 项。
- 浏览器验证 CAIE 22 对应 Paper 2 / Variant 2，日语 1H 只返回 1H 文件，AP Set 1/2 独立，9608 属于默认科目。
- 修复现有 Pearson 数据中缺失的分卷标记，避免部分 3F/3H/4F/4H 答案混入 1H 筛选。
- 公网实际下载并用 PyMuPDF 解析 9 份文件，四考试局及六种资料类型全部通过。记录在 `.cache/download-validation/report.json`。
- VPS 浏览器下载的 ZIP 含 `9702_s24_qp_22.pdf` 与 `9702_s24_ms_22.pdf`，Python zipfile 校验 CRC 通过；CSV 含相同两份资料的来源链接。
- 本机验证 PDF 预览与翻页、部分成功后重试；VPS PDF 预览显示 16 页并成功加载。手机 390 px 视口没有水平溢出，底部五个导航项完整显示。
- VPS 首页入口和返回搜题已验证，`9702_s24_qp_22 Q2` 返回正确的唯一候选及对应题目预览。最终截图：`.cache/pastpaper-downloader.png`，移动端：`.cache/pastpaper-mobile.png`。

## VPS 部署

当前源码目录 `/opt/papertrace/releases/20261025-pastpaper-downloads`，回滚目录 `/opt/papertrace/releases/20261025-admin-statistics`。90 个上传源文件哈希与部署结果一致。

继续使用 `python docs/deployment/apply_vps_stats.py` 生成 VPS 专属覆盖文件；该脚本先生成首页覆盖，再注入独立后台统计。新下载页的访问通过 VPS 专属 `papers.mjs` 加载 `usage.mjs` 记录。

部署时保留 `/etc/papertrace/papertrace.env` 和 `/var/lib/papertrace-statistics/`。本次统计数据保留，管理接口匿名请求仍返回 401。共享 LLM、RapidOCR、原卷预览及开发者信息均继续可用。papertrace、HTTPS 和原有端口 80 服务保持 active，papertrace 保持开机启动。

本次修改保存在本机并部署 VPS，未推送 GitHub、更新 GitHub Pages 或构建发布包。

## 单套下载调整

- 年份、考季使用单选，分卷与版本必须选择具体值。旧分享地址的多选条件会收敛到一个有效组合，旧浏览器多选配置通过新的存储键迁移。
- 默认优先选择存在 QP/MS 配对的组合，CAIE 有 Variant 2 时优先使用。正式 Pearson 评分标准优先于 provisional 版本，同一卷同一资料类型去重。
- 学习阶段只保留 IGCSE 与 AS & A Level；额外科目开关也遵守此范围。主搜题语料和学科范围保持原状。
- 新增一键下载当前组合按钮，无需先勾选文件。当前类型仅选 QP 或 MS 时，按钮相应显示单一类型。
- 8 项下载测试通过，包括对全部 44 个可下载科目/考试版本的默认及旧多选条件验证。浏览器验证单选联动、清除旧勾选以及 Pearson IGCSE 范围。
- VPS 仅替换四个前端源文件，无服务重启。原文件备份于当前 release 下的 `.backups/single-paper-20261025/`。
- 线上新按钮实测成功下载两份配套 PDF，ZIP 文件名和 CRC 校验通过。截图：`.cache/pastpaper-single-pair.png`。
