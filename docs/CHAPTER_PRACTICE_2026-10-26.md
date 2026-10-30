# AS 分章练习下载

页面入口为 `chapters.html`，首页和真题下载页的导航均提供「分章练习」。选择一个科目、一个单元后，可下载题目 PDF、答案 PDF 或配套 ZIP；当前选择保存在网址参数中。

| 科目 | 代码 | AS 单元 | 补充 |
| --- | --- | --- | --- |
| 物理 | 9702 | 11 | 旧 AS 考纲附录 |
| 化学 | 9701 | 22 | 旧考纲补充 |
| 生物 | 9700 | 11 | |

资料来自工作区根目录的三个 `CAIE_970*_2020-2026_*Pack.zip`，范围为 2020–2026 AS Paper 2。共生成 92 份单元 PDF、46 份配套 ZIP。按成品 PDF 的章节书签切分，保留章节封面、原题、答题空间、标色、评分标准和资料中的原有说明。书签页码已换算为单元文件内的页码，页面上印刷的原题册页码保持原样。

## 文件与更新

- `dist/chapters.html`、`chapters.css`、`chapters.mjs`：页面和单元选择。
- `dist/data/chapters/index.json`：科目、单元、题组数、重点小问数、文件大小和页数。
- `dist/downloads/chapters/{code}/`：单元 PDF 和 ZIP，作为本机与 VPS 的静态下载资源。
- `scripts/prepare_chapter_downloads.py`：从资料包生成下载资源，依赖现有 `requirements-server.txt` 中的 PyMuPDF。

在项目目录运行：

```sh
python scripts/prepare_chapter_downloads.py --source .. --public dist
python serve.py --port 8001
```

资料文件已在 `.gitignore` 中排除。本机和自有服务器使用原始资料包生成资源；GitHub Pages 直接使用 VPS 已发布的公开文件。页面只读取小型目录 JSON，PDF 和 ZIP 在用户打开或下载时传输。

## 验证与部署

92 份 PDF 的页数、章节边界、单元内书签通过检查；46 份 ZIP 均包含对应单元的一份 QP 与一份 MS。三科题目及答案抽样渲染检查通过。本机浏览器实际下载物理 Unit 02 ZIP，确认其中 QP 113 页、MS 74 页。现有搜题状态与真题下载的 17 项 Node 测试通过。

VPS 源资料保存在 `/opt/papertrace/chapter-source-20261026/`，在该目录生成后将静态资源放入 `/opt/papertrace/current/dist/`。`docs/deployment/apply_vps_stats.py` 为新页面生成开发者署名和现有访问统计脚本；首页沿用该部署脚本生成的 VPS 版本。

线上地址为 `https://trace.siphot.com/chapters.html`，本机地址为 `http://127.0.0.1:8001/chapters.html`。VPS 三科的 PDF、ZIP 公网请求均成功；浏览器实际下载的运动学 ZIP 已解压读取，题目 113 页、答案 74 页且章节书签匹配。桌面与 390 px 手机布局已验证，截图保存在 `.cache/chapter-practice-downloads.png` 和 `.cache/chapter-mobile.png`。上线时替换的首页、样式和真题下载页备份位于当前 release 的 `.backups/chapters-20261026/`。
