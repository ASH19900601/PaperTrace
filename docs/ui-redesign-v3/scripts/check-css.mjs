// PaperTrace v3 CSS / HTML 守门脚本（零依赖，Node ≥ 20）
// 用法（仓库根目录）：node docs/ui-redesign-v3/scripts/check-css.mjs
// FAIL 导致退出码 1；WARN 只提示。规则对应 DESIGN_SPEC §1.3 禁止清单与 RESEARCH.md A1–A15。
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = f => resolve(root, 'dist', f);
const inv = JSON.parse(await readFile(resolve(root, 'docs/ui-redesign-v3/selector-inventory.json'), 'utf8'));
const files = ['style.css', 'papers.css', 'tools.css', 'chapters.css'];
const pages = ['index.html', 'papers.html', 'chapters.html', 'tools.html'];
let fails = 0, warns = 0;
const fail = m => { fails++; console.log('FAIL', m); };
const warn = m => { warns++; console.log('WARN', m); };
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '');
const rules = css => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({ sel: m[1].trim().replace(/\s+/g, ' '), body: m[2] }));

// ---------- HTML ----------
try { await access(dist('tokens.css')); } catch { fail('dist/tokens.css 不存在'); }
const decorativeEnglish = ['YOUR SHORTCUT TO THE MARK SCHEME', 'YOUR NEXT PRACTICE STARTS HERE', 'ONE HOME FOR YOUR STUDY TOOLS', 'ONE TOPIC AT A TIME',
  'THE SOURCE LIBRARY', 'YOUR QUESTION SHELF', 'GROW YOUR LIBRARY', 'THE PAPER SHELF', 'CHOOSE YOUR UNIT', 'HOW IT WORKS', 'LEARNING TOOLBOX',
  'PAST PAPER DESK', 'CHAPTER PRACTICE', 'WORKSPACE', 'Private workspace', 'Made for independent learners', 'Find the question', 'Find your papers',
  'One workspace', 'One topic at a time', '>Text search<', '>Image / PDF<', 'SCOPE'];
for (const p of pages) {
  const html = await readFile(dist(p), 'utf8');
  const t = html.search(/href="tokens\.css/), s = html.search(/href="style\.css/);
  if (t < 0 || s < 0 || t > s) fail(`${p}: 需要在 style.css 之前引入 tokens.css`);
  if (!/href="favicon\.svg"/.test(html)) warn(`${p}: 未引入 favicon.svg`);
  if (/<i>[⌕▤↓▥◈☆＋]<\/i>/.test(html)) fail(`${p}: 导航仍使用 Unicode 字符图标`);
  if (/class="[^"]*\b(?:brandmark|sidebar-bottom|sidebar-note|nav-label|status-dot|paper-illustration)\b/.test(html)) fail(`${p}: 仍有应删除的装饰元素（brandmark / sidebar-note / sidebar-bottom / nav-label / status-dot / paper-illustration）`);
  if (/class="[^"]*\b(?:pt-band|masthead-tag|pt-vf|hero-arrow|empty-diagram|process-steps|foot-word|site-band)\b/.test(html)) fail(`${p}: 出现了 v1/v2 的海报元素`);
  if (/class="badge"/.test(html)) fail(`${p}: 顶栏 .badge 应删除`);
  if (/<h1>[^<]*<span class="(?:green|accent)">/.test(html)) fail(`${p}: 标题里单独给词上色`);
  if (/id="searchButton"[^>]*>[^<]*<span>↗/.test(html)) fail(`${p}: 搜索按钮不应带箭头`);
  for (const e of decorativeEnglish) if (html.includes(e)) warn(`${p}: 装饰英文 “${e.replace(/[<>]/g, '')}”`);
}

// ---------- CSS ----------
const css = {};
for (const f of files) css[f] = strip(await readFile(dist(f), 'utf8'));
const monoAllowed = /(reading-fragment|raw-disclosure|llm-progress|ocrRawText|\bpre\b|\bcode\b|tool-icon)/;

for (const [f, s] of Object.entries(css)) {
  const noUri = s.replace(/url\((["']?)data:[^)]*\1\)/g, '');
  const hex = [...new Set(noUri.match(/#[0-9a-fA-F]{3,8}\b/g) || [])].filter(h => !/^#(fff|ffffff)$/i.test(h));
  if (hex.length) fail(`${f}: 写死的颜色 ${hex.slice(0, 10).join(' ')}${hex.length > 10 ? ' …' : ''}（共 ${hex.length} 个）`);
  for (const v of ['--green', '--lime', '--sidebar)', '--ink)']) if (s.includes(`var(${v.replace(')', '')})`)) fail(`${f}: 仍在使用旧变量 ${v.replace(')', '')}`);

  for (const { sel, body } of rules(s)) {
    const at = `${f} ${sel.slice(0, 60)}`;
    for (const m of body.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) {
      if (+m[1] < 11) fail(`${at}: font-size ${m[1]}px < 11px`);
      else if (+m[1] < 12) warn(`${at}: font-size ${m[1]}px（只允许手机底部导航）`);
    }
    for (const m of body.matchAll(/font-weight:\s*(\d{3})/g)) if (+m[1] > 600) fail(`${at}: font-weight ${m[1]} > 600`);
    if (/text-transform:\s*uppercase/.test(body)) fail(`${at}: text-transform: uppercase（A1）`);
    for (const m of body.matchAll(/letter-spacing:\s*(-?\d*\.?\d+)(em|px)/g)) {
      const em = m[2] === 'em' ? +m[1] : +m[1] / 14;
      if (em > 0.02) fail(`${at}: letter-spacing ${m[1]}${m[2]}（A1）`);
    }
    if (/var\(--pt-font-mono\)|monospace/.test(body) && !monoAllowed.test(sel)) warn(`${at}: 等宽字体只给识别原文 / 代码 / 工具图标（A2）`);
    for (const m of body.matchAll(/box-shadow:\s*([^;]+)/g)) {
      for (const part of m[1].split(/,(?![^(]*\))/)) {
        const n = part.trim().match(/^(-?\d+)px\s+(-?\d+)px\s+(0|0px)(\s|$)/);
        if (n && (n[1] !== '0' || n[2] !== '0')) fail(`${at}: 无模糊偏移投影 ${part.trim()}（A5）`);
      }
    }
    for (const m of body.matchAll(/border(?:-(?:top|right|bottom|left))?:\s*(\d+(?:\.\d+)?)px\s+solid\s+([^;]+)/g)) {
      if (+m[1] >= 2 && /ink|text\)|#1|#0|black/.test(m[2])) fail(`${at}: ${m[1]}px 深色粗边框（A5）`);
    }
    const left = body.match(/border-left:\s*(\d+)px/);
    if (left && +left[1] >= 3) fail(`${at}: ${left[1]}px 色条式左边框（A10）`);
    const radius = body.match(/border-radius:\s*([^;]+)/);
    if (radius && /^0(px)?$/.test(radius[1].trim()) && /\.(btn|panel|search-box|tool-card|dialog|input)\b|^dialog/.test(sel)) warn(`${at}: 直角（A3），规范为 6–8px`);
    if (/backdrop-filter/.test(body)) warn(`${at}: backdrop-filter（规范不用模糊）`);
    if (/\.tool-card\b/.test(sel) && /min-height/.test(body)) fail(`${at}: .tool-card 不应设最小高度`);
    if (/\.status-dot\b/.test(sel) && !/display:\s*none/.test(body)) warn(`${at}: .status-dot 应隐藏或删除（A14）`);
  }
}

// ---------- 选择器覆盖 ----------
const all = Object.values(css).join('\n') + strip(await readFile(dist('tokens.css'), 'utf8').catch(() => ''));
const styled = new Set((all.replace(/\{[^{}]*\}/g, '{}').match(/\.[a-zA-Z][\w-]*/g) || []).map(s => s.slice(1)));
const retire = new Set([...inv.retire, 'status-dot', 'upload-icon', 'badge', 'eyebrow']);
const stateOnly = new Set(['active', 'selected', 'saved', 'visible', 'drag', 'primary', 'small', 'ok', 'error', 'qp', 'ms', 'gt', 'er', 'ci', 'mobile-break', 'view', 'shell', 'reading-paragraph', 'green', 'key', 'count']);
const expected = new Set([...Object.values(inv.css_selectors).flat(), ...inv.js_generated]);
const missing = [...expected].filter(c => !retire.has(c) && !stateOnly.has(c) && !styled.has(c));
if (missing.length) warn(`旧版有样式或 JS 会生成、但新 CSS 未覆盖的类：${missing.join(' ')}`);

console.log(`\n${fails ? '✗' : '✓'} v3 check-css：${fails} FAIL，${warns} WARN`);
process.exit(fails ? 1 : 0);
