# PaperTrace UI 改版设计包 · Viewfinder

把 PaperTrace 从“浅绿 SaaS 模板”改成与宣传海报一致的**黑白蓝瑞士海报风格**：纸白底、墨黑字、唯一的电光蓝，粗黑中文标题、粗细两级分割线、直角、等宽数据字。海报风格只通过颜色、字体、线条进入产品，**不搬海报插画，信息密度优先**（v2，2026-11-01）。

| 当前线上（2026-10-31） | 改版样张 |
| --- | --- |
| 浅绿底、圆角卡片、114 处 ≤10px 字号、235 种写死颜色、Unicode 字符图标 | 见 `mockup/shots/search-desktop.png`、`photo-empty-desktop.png`、`pages-desktop.png` 及对应 `-mobile.png` |

## 怎么用

1. 把 [`PROMPT.md`](PROMPT.md) 中分隔线之间的内容完整交给执行 AI（它需要能读写本仓库并运行命令）。
2. 执行 AI 会按 [`TASKS.md`](TASKS.md) 的 P0–P8 分阶段实施、逐阶段提交，并用 `scripts/` 下的脚本自检。
3. 你只需要验收：看它交付的 `docs/UI_REDESIGN_*.md` 与 before/after 截图，确认 ⚠ 宣传文案，再决定是否同步到 VPS。

## 文件

| 文件 | 作用 |
| --- | --- |
| `PROMPT.md` | 给执行 AI 的完整提示词（角色、约束、步骤、交付物） |
| `DESIGN_SPEC.md` | 视觉规范：诊断、原则、色彩、字体、间距、签名元素、组件、逐页方案、响应式、无障碍、文案 |
| `CLASS_MAP.md` | 不能改的东西、允许的 HTML 改动、旧 → 新映射、线上与仓库差异 |
| `TASKS.md` | 分阶段任务清单与验收标准 |
| `tokens.css` | 设计 Token + 工具类（`.pt-vf` 投放区角标、`.pt-kicker`、`.pt-band`、`.pt-icon`），复制为 `dist/tokens.css` |
| `icons.svg` | 24 个线性图标的 SVG sprite，复制为 `dist/icons.svg` |
| `favicon.svg` | 站点图标 |
| `display-glyphs.txt` | 可选展示字体子集的字符清单 |
| `selector-inventory.json` | 改版前全部选择器、JS 生成类名、HTML 类名（守门脚本使用） |
| `mockup/reference.css` | 用**真实类名**写的参考实现，可直接迁移 |
| `mockup/*.html` / `mockup/shots/*.png` | 高保真样张及其渲染图 |
| `reference/*.jpg|png` | 两张海报原图（视觉原点） |
| `scripts/check-css.mjs` | CSS 守门：颜色 Token 化、字号下限、直角、旧变量、选择器覆盖 |
| `scripts/shoot-dist.cjs` | 启动本地站点，在 4 个宽度下截 10 个场景，检查横向溢出与脚本错误 |
| `scripts/render-mockups.cjs` | 重新渲染样张 PNG |

## 常用命令（仓库根目录）

```sh
node docs/ui-redesign/scripts/render-mockups.cjs          # 重新渲染样张
node docs/ui-redesign/scripts/check-css.mjs               # 改版前：137 FAIL；目标：0 FAIL
node docs/ui-redesign/scripts/shoot-dist.cjs .cache/ui-redesign/before   # 基线截图
npm test                                                   # 基线 115/115
```

## 核心规则速记

- **蓝 = 行动与答案**（查找、下载、MS、链接、命中）；**选中 = 墨黑**。
- 零纯装饰：不放插画、装饰箭头、流程示意图、英文口号；取景框只用于文件投放区。
- 信息密度优先：科目等列表一科一行（≈44px），1440×900 一屏 ≥14 行。
- 线代替盒子；全部直角；只用硬阴影（蓝 4px / 墨 8px）。
- 可读文字 ≥ 12px，对比度 ≥ 4.5 : 1。
- 只改 HTML 静态标记与 CSS，不改 id、data-*、JS 类名和 `.mjs`。
