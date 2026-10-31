import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(process.cwd());

test('学习工具清单包含内置入口和 GitHub 项目入口', async () => {
  const items = JSON.parse(await readFile(resolve(root, 'dist/data/tools.json'), 'utf8'));
  assert.ok(items.length >= 8);
  assert.ok(items.some(item => item.kind === 'integrated' && item.open === 'index.html#search'));
  assert.ok(items.some(item => item.id === 'pseudocode-ultra' && item.open.includes('github.io')));
  assert.ok(items.every(item => item.id && item.title && item.category && item.source));
});

test('学习工具页面具备清单加载、分类筛选和搜索控件', async () => {
  const html = await readFile(resolve(root, 'dist/tools.html'), 'utf8');
  const script = await readFile(resolve(root, 'dist/tools.mjs'), 'utf8');
  assert.match(html, /id="toolGrid"/);
  assert.match(html, /id="toolFilters"/);
  assert.match(script, /fetch\("data\/tools\.json"\)/);
  assert.match(script, /toolQuery/);
});
