// 真实站点截图 + 横向溢出 + 控制台错误检查。
// 用法（仓库根目录）：
//   node docs/ui-redesign/scripts/shoot-dist.cjs [输出目录=.cache/ui-redesign/after] [基地址]
// 不传基地址时自动启动 `python3 serve.py --port 8765` 并在结束后关闭。
// 改版前先跑一次输出到 .cache/ui-redesign/before 作对照。
// 本机地址访问 trace.siphot.com 预览接口时的 CORS 报错属于环境限制，已忽略。
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const out = path.resolve(process.argv[2] || '.cache/ui-redesign/after');
let base = process.argv[3];
const widths = [[1440, 900], [1024, 768], [768, 1024], [390, 844]];
const shots = [
  ['search', 'index.html#search', null],
  ['search-results', 'index.html#search', async p => {
    await p.fill('#query', 'diffraction grating'); await p.click('#searchButton');
    await p.waitForSelector('.result-card', { timeout: 60000 });
  }],
  ['search-photo', 'index.html#search', async p => { await p.click('.search-tab[data-mode="photo"]'); }],
  ['detail-dialog', 'index.html#search', async p => {
    await p.fill('#query', '9702_s24_qp_22 Q2'); await p.click('#searchButton');
    await p.waitForSelector('[data-detail]', { timeout: 60000 }); await p.click('[data-detail]');
    await p.waitForSelector('#detailDialog[open]');
  }],
  ['library', 'index.html#library', null],
  ['saved', 'index.html#saved', null],
  ['import', 'index.html#import', null],
  ['papers', 'papers.html', null],
  ['chapters', 'chapters.html', null],
  ['tools', 'tools.html', null],
];

(async () => {
  let server;
  if (!base) {
    server = spawn('python3', ['serve.py', '--port', '8765'], { stdio: 'ignore' });
    base = 'http://127.0.0.1:8765/';
    for (let i = 0; i < 50; i++) { try { await fetch(base); break; } catch { await new Promise(r => setTimeout(r, 200)); } }
  }
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const problems = [];
  for (const [w, h] of widths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    for (const [name, url, act] of shots) {
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|blocked by CORS policy/.test(m.text())) errors.push(m.text()); });
      try {
        await page.goto(base + url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(1200);
        if (act) await act(page);
        await page.waitForTimeout(600);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        if (overflow > 0) problems.push(`${w}px ${name}: 横向溢出 ${overflow}px`);
        await page.screenshot({ path: path.join(out, `${name}-${w}.png`), fullPage: true });
      } catch (e) { problems.push(`${w}px ${name}: ${e.message.split('\n')[0]}`); }
      errors.forEach(e => problems.push(`${w}px ${name}: console ${e}`));
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
  if (server) server.kill();
  console.log(`截图已保存到 ${out}`);
  if (problems.length) { console.log('问题：\n- ' + problems.join('\n- ')); process.exit(1); }
  console.log('✓ 无横向溢出、无脚本错误');
})();
