// PaperTrace 改版 CSS 守门脚本（零依赖，Node ≥ 20）
// 用法（仓库根目录）：node docs/ui-redesign/scripts/check-css.mjs
// 退出码非 0 表示有 FAIL；WARN 只提示。
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = f => resolve(root, 'dist', f);
const inv = JSON.parse(await readFile(resolve(root, 'docs/ui-redesign/selector-inventory.json'), 'utf8'));
const files = ['style.css', 'papers.css', 'tools.css', 'chapters.css'];
const pages = ['index.html', 'papers.html', 'chapters.html', 'tools.html'];
let fails = 0, warns = 0;
const fail = m => { fails++; console.log('FAIL', m); };
const warn = m => { warns++; console.log('WARN', m); };
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '');

// 1. tokens.css 存在且被四个页面在 style.css 之前引入
try { await access(dist('tokens.css')); } catch { fail('dist/tokens.css 不存在'); }
for (const p of pages) {
  const html = await readFile(dist(p), 'utf8');
  const t = html.search(/href="tokens\.css/), s = html.search(/href="style\.css/);
  if (t < 0 || s < 0 || t > s) fail(`${p}: 需要在 style.css 之前引入 tokens.css`);
  if (!/href="favicon\.svg"/.test(html)) warn(`${p}: 未引入 favicon.svg`);
  if (/class="(?:[^"]*\s)?(?:brandmark|sidebar-bottom|sidebar-note|nav-label)(?:\s[^"]*)?"/.test(html)) warn(`${p}: 仍包含应退役的侧栏装饰元素`);
  if (/<i>[⌕▤↓▥◈☆＋]<\/i>/.test(html)) fail(`${p}: 导航仍使用 Unicode 字符图标，应换成 icons.svg`);
  if (/class="[^"]*\b(?:hero-arrow|empty-diagram|process-steps|paper-illustration)\b/.test(html)) fail(`${p}: 存在纯装饰图形元素（规范 P6 禁止）`);
  if (/class="[^"]*\bintro\b[^"]*\bpt-vf\b|class="[^"]*\bpt-vf\b[^"]*\bintro\b/.test(html)) fail(`${p}: 页头不能使用取景框角标`);
  for (const slogan of ['YOUR SHORTCUT TO THE MARK SCHEME', 'YOUR NEXT PRACTICE STARTS HERE', 'ONE HOME FOR YOUR STUDY TOOLS', 'ONE TOPIC AT A TIME', 'THE SOURCE LIBRARY', 'YOUR QUESTION SHELF', 'GROW YOUR LIBRARY', 'THE PAPER SHELF', 'CHOOSE YOUR UNIT', 'HOW IT WORKS'])
    if (html.includes(slogan)) warn(`${p}: 仍有英文装饰标签 “${slogan}”`);
}

const css = {};
for (const f of files) css[f] = strip(await readFile(dist(f), 'utf8'));
const all = Object.values(css).join('\n');

for (const [f, s] of Object.entries(css)) {
  // 2. 不允许 Token 以外的颜色（SVG data URI 中的 %23 编码除外）
  const noUri = s.replace(/url\((["']?)data:[^)]*\1\)/g, '');
  const hex = [...new Set(noUri.match(/#[0-9a-fA-F]{3,8}\b/g) || [])];
  if (hex.length) fail(`${f}: 写死的颜色 ${hex.slice(0, 12).join(' ')}${hex.length > 12 ? ' …' : ''}（共 ${hex.length} 个）`);
  const rgb = noUri.match(/rgba?\([^)]*\)/g) || [];
  if (rgb.length) warn(`${f}: ${rgb.length} 处 rgb()/rgba()，请确认是否应换成 Token`);
  // 3. 旧绿色变量必须清除
  for (const v of ['--green', '--lime', '--sidebar']) if (s.includes(`var(${v})`)) fail(`${f}: 仍在使用旧变量 ${v}`);
  // 4. 字号下限
  for (const m of s.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) {
    const n = +m[1];
    if (n < 11) fail(`${f}: font-size ${n}px < 11px`);
    else if (n < 12) warn(`${f}: font-size ${n}px（仅允许移动端 tab bar 使用 11px）`);
  }
  for (const m of s.matchAll(/font:\s*[^;{}]*?\b(\d+(?:\.\d+)?)px/g)) if (+m[1] < 11) fail(`${f}: font 简写中的 ${m[1]}px < 11px`);
  // 5. 圆角
  for (const m of s.matchAll(/border-radius:\s*([^;}]+)/g)) if (!/^(0|0px|var\(--pt-radius[^)]*\)|50%)\s*$/.test(m[1].trim())) warn(`${f}: border-radius ${m[1].trim()}（规范为直角）`);
  // 6. 模糊背景
  if (/backdrop-filter/.test(s)) warn(`${f}: 仍有 backdrop-filter（规范要求去掉 blur）`);
  if (/\.tool-card\s*\{[^}]*min-height/.test(s)) fail(`${f}: .tool-card 不应设置最小高度`);
}

// 7. 选择器覆盖：旧 CSS 中的类、JS/HTML 使用的类，仍应被某个 CSS 规则覆盖
const styled = new Set(all.replace(/\{[^{}]*\}/g, '{}').match(/\.[a-zA-Z][\w-]*/g)?.map(s => s.slice(1)) || []);
const tokensCss = strip(await readFile(dist('tokens.css'), 'utf8').catch(() => ''));
for (const c of tokensCss.match(/\.[a-zA-Z][\w-]*/g) || []) styled.add(c.slice(1));
const retire = new Set(inv.retire);
const stateOnly = new Set(['active', 'selected', 'saved', 'visible', 'drag', 'primary', 'small', 'ok', 'error', 'qp', 'ms', 'gt', 'er', 'ci', 'mobile-break', 'view', 'shell', 'reading-paragraph', 'green']);
const expected = new Set([...Object.values(inv.css_selectors).flat(), ...inv.js_generated]);
const missing = [...expected].filter(c => !retire.has(c) && !stateOnly.has(c) && !styled.has(c));
if (missing.length) warn(`以下类在旧版有样式或由 JS 生成，但新 CSS 中找不到：${missing.join(' ')}`);

console.log(`\n${fails ? '✗' : '✓'} check-css：${fails} FAIL，${warns} WARN`);
process.exit(fails ? 1 : 0);
