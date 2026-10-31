// 渲染 mockup/*.html 为 PNG（桌面 1440 与手机 390）。
// 用法（仓库根目录）：node docs/ui-redesign/scripts/render-mockups.cjs
// 依赖：playwright（容器预装或 npm i -D playwright）。脚本自带静态服务器，避免 file:// 下 <use href> 失效。
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
server.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}/mockup/`;
  const pages = fs.readdirSync(path.join(root, 'mockup')).filter(f => f.endsWith('.html'));
  const browser = await chromium.launch();
  for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: tag === 'mobile' ? 2 : 1 });
    const page = await ctx.newPage();
    for (const f of pages) {
      await page.goto(base + f, { waitUntil: 'networkidle' });
      const out = path.join(root, 'mockup', 'shots', `${f.replace('.html', '')}-${tag}.png`);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      await page.screenshot({ path: out, fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      console.log(`${tag} ${f} -> ${path.relative(root, out)}${overflow > 0 ? `  ⚠ 横向溢出 ${overflow}px` : ''}`);
    }
    await ctx.close();
  }
  await browser.close();
  server.close();
});
