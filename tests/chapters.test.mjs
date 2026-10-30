import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const catalog = JSON.parse(fs.readFileSync(new URL('../dist/data/chapters/index.json', import.meta.url), 'utf8'));
const source = fs.readFileSync(new URL('../dist/chapters.mjs', import.meta.url), 'utf8')
  .replace(/void loadCatalog\(\);\s*$/, 'globalThis.api = {loadCatalog, showSubject, showUnit};');

function harness(fetch = async () => ({ok: true, json: async () => catalog}), query = '?subject=9702&unit=01', pageURL = 'http://localhost/chapters.html') {
  class Element {
    constructor(tag = '') { this.tagName = tag; this.children = []; this.dataset = {}; this.attributes = {}; this.classList = {toggle() {}}; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes[name] = value; }
  }
  const elements = new Map();
  const get = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  const location = new URL(pageURL + query), entries = [location.href];
  let position = 0;
  const history = {
    pushState(state, title, url) { entries.splice(++position); entries.push(String(url)); location.href = String(url); },
    replaceState(state, title, url) { entries[position] = String(url); location.href = String(url); },
  };
  const window = {};
  const context = vm.createContext({fetch, URL, URLSearchParams, location, history, window,
    Option: class extends Element { constructor(text, value) { super('option'); this.textContent = text; this.value = value; } },
    document: {getElementById: get, createElement: tag => new Element(tag), querySelectorAll: () => get('chapterSubjects').children.filter(button => button.dataset.subject)},
  });
  vm.runInContext(source, context);
  return {...context.api, get, location, entries,
    clickSubject: code => get('chapterSubjects').children.find(button => button.dataset.subject === code).onclick(),
    go: delta => { position += delta; location.href = entries[position]; window.onpopstate(); },
  };
}

test('clicking the selected subject retains its current unit and matching downloads', async () => {
  const page = harness(); await page.loadCatalog();
  page.showUnit('02');
  page.clickSubject('9702');
  assert.equal(page.get('chapterUnit').value, '02');
  assert.equal(page.get('chapterTitle').textContent, '运动学');
  assert.match(page.get('chapterQp').href, /9702.*Unit_02_QP\.pdf\?download=1$/);
  assert.match(page.get('chapterMs').href, /9702.*Unit_02_MS\.pdf\?download=1$/);
  assert.match(page.get('chapterBundle').href, /9702.*Unit_02_QP_MS\.zip\?download=1$/);
  assert.equal(page.entries.length, 2);
});

test('back and forward restore subject, unit and all download links together', async () => {
  const page = harness(); await page.loadCatalog();
  page.showUnit('02'); page.clickSubject('9701'); page.showUnit('22');
  page.go(-1);
  assert.equal(page.get('chapterUnit').value, '01');
  assert.match(page.get('chapterBundle').href, /9701.*Unit_01_QP_MS\.zip\?download=1$/);
  page.go(-1);
  assert.equal(page.get('chapterUnit').value, '02');
  assert.equal(page.get('chapterTitle').textContent, '运动学');
  assert.match(page.get('chapterBundle').href, /9702.*Unit_02_QP_MS\.zip\?download=1$/);
  page.go(1); page.go(1);
  assert.equal(page.get('chapterTitle').textContent, '分析技术');
  assert.match(page.get('chapterQp').href, /9701.*Unit_22_QP\.pdf\?download=1$/);
  assert.match(page.get('chapterMs').href, /9701.*Unit_22_MS\.pdf\?download=1$/);
  assert.equal(page.entries.length, 4);
});

test('a failed catalogue request shows failure and manual retry restores the requested unit', async () => {
  let calls = 0;
  const page = harness(async () => ++calls === 1 ? {ok: false, status: 503} : {ok: true, json: async () => catalog}, '?subject=9700&unit=11');
  await page.loadCatalog();
  assert.equal(page.get('chapterError').hidden, false);
  assert.match(page.get('chapterErrorMessage').textContent, /503/);
  assert.equal(page.get('chapterUnit').children[0].textContent, '目录加载失败');
  assert.equal(page.get('chapterUnit').disabled, true);
  await page.get('chapterRetry').onclick();
  assert.equal(calls, 2);
  assert.equal(page.get('chapterError').hidden, true);
  assert.equal(page.get('chapterUnit').disabled, false);
  assert.equal(page.get('chapterUnit').value, '11');
  assert.equal(page.get('chapterTitle').textContent, '免疫');
  assert.match(page.get('chapterBundle').href, /9700.*Unit_11_QP_MS\.zip\?download=1$/);
});

test('an invalid shared selection is normalized without adding an extra history entry', async () => {
  const page = harness(undefined, '?subject=9701&unit=missing'); await page.loadCatalog();
  assert.equal(page.get('chapterTitle').textContent, '原子结构');
  assert.equal(page.location.searchParams.get('unit'), '01');
  assert.equal(page.entries.length, 1);
});

test('Pages uses published chapter files while local downloads stay on the local server', async () => {
  for (const [pageURL, host] of [['https://ash19900601.github.io/PaperTrace/chapters.html', 'trace.siphot.com'], ['http://localhost/chapters.html', 'localhost']]) {
    const page = harness(undefined, '?subject=9702&unit=02', pageURL); await page.loadCatalog();
    for (const id of ['chapterQp', 'chapterMs', 'chapterBundle']) {
      const url = new URL(page.get(id).href, page.location);
      assert.equal(url.host, host);
      assert.equal(url.searchParams.get('download'), '1');
      assert.match(url.pathname, /\/downloads\/chapters\/9702\/9702_.*_Unit_02_/);
    }
    const preview = new URL(page.get('chapterQpPreview').href, page.location);
    assert.equal(preview.host, host); assert.equal(preview.searchParams.has('download'), false); assert.equal(preview.hash, '#page=1');
  }
});
