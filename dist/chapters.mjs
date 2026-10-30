const $ = id => document.getElementById(id);
const size = bytes => `${(bytes / 1048576).toFixed(1)} MB`;
const assetBase = new URL(location.href);
if (assetBase.hostname.endsWith('.github.io')) assetBase.href = 'https://trace.siphot.com/';
let catalog, subject;

function fileURL(file, download = false) {
  const url = new URL(file.url, assetBase);
  if (download) url.searchParams.set('download', '1');
  return url.href;
}

function showUnit(id, push = true) {
  const unit = subject.units.find(unit => unit.id === id);
  $('chapterUnit').value = unit.id;
  $('chapterCode').textContent = `CAIE ${subject.code} · AS PAPER 2 · ${unit.supplement ? 'SUPPLEMENT' : `UNIT ${unit.id}`}`;
  $('chapterTitle').textContent = unit.title;
  $('chapterEnglish').textContent = unit.english;
  $('chapterStats').textContent = `${unit.groups} 个题组 · ${unit.focusParts} 个重点小问 · 配套 ZIP ${size(unit.files.zip.bytes)}`;
  for (const [kind, label] of [['qp', 'Qp'], ['ms', 'Ms']]) {
    const file = unit.files[kind];
    $(`chapter${label}`).href = fileURL(file, true);
    $(`chapter${label}`).download = file.url.split('/').at(-1);
    $(`chapter${label}Preview`).href = `${fileURL(file)}#page=1`;
    $(`chapter${label}Meta`).textContent = `${file.pages} 页 · PDF · ${size(file.bytes)}`;
  }
  $('chapterBundle').href = fileURL(unit.files.zip, true);
  $('chapterBundle').download = unit.files.zip.url.split('/').at(-1);
  $('chapterDetail').hidden = false;
  const url = new URL(location.href);
  url.searchParams.set('subject', subject.code);
  url.searchParams.set('unit', unit.id);
  if (url.href !== location.href) history[push ? 'pushState' : 'replaceState'](null, '', url);
}

function showSubject(code, unitId, push = true) {
  if (push && subject?.code === code && unitId === undefined) return;
  subject = catalog.subjects.find(subject => subject.code === code);
  document.querySelectorAll('[data-subject]').forEach(button => {
    const selected = button.dataset.subject === code;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  const select = $('chapterUnit');
  select.replaceChildren();
  for (const supplement of [false, true]) {
    const units = subject.units.filter(unit => unit.supplement === supplement);
    if (!units.length) continue;
    const group = document.createElement('optgroup');
    group.label = supplement ? '旧考纲补充' : 'AS 单元';
    for (const unit of units) group.append(new Option(`${supplement ? '附录' : `Unit ${unit.id}`} · ${unit.title} / ${unit.english}`, unit.id));
    select.append(group);
  }
  select.disabled = false;
  showUnit(subject.units.some(unit => unit.id === unitId) ? unitId : subject.units[0].id, push);
}

function restoreSelection() {
  const params = new URLSearchParams(location.search);
  const code = catalog.subjects.some(subject => subject.code === params.get('subject')) ? params.get('subject') : catalog.subjects[0].code;
  showSubject(code, params.get('unit'), false);
}

async function init() {
  const response = await fetch('data/chapters/index.json');
  if (!response.ok) throw new Error(`分章目录加载失败（${response.status}）`);
  catalog = await response.json();
  $('chapterSubjects').replaceChildren();
  for (const subject of catalog.subjects) {
    const button = document.createElement('button');
    button.className = 'chapter-subject';
    button.dataset.subject = subject.code;
    const name = document.createElement('strong'); name.textContent = subject.name;
    const code = document.createElement('span'); code.textContent = `${subject.english} · ${subject.code}`;
    const count = document.createElement('small');
    count.textContent = `${subject.units.filter(unit => !unit.supplement).length} 个单元${subject.units.some(unit => unit.supplement) ? ' + 旧纲补充' : ''}`;
    button.append(name, code, count);
    button.onclick = () => showSubject(subject.code);
    $('chapterSubjects').append(button);
  }
  restoreSelection();
  $('chapterUnit').onchange = event => showUnit(event.target.value);
  window.onpopstate = restoreSelection;
}

async function loadCatalog() {
  $('chapterError').hidden = true;
  $('chapterDetail').hidden = true;
  $('chapterUnit').disabled = true;
  $('chapterUnit').replaceChildren(new Option('正在加载…', ''));
  const loading = document.createElement('p');
  loading.className = 'muted';
  loading.textContent = '正在读取分章目录…';
  $('chapterSubjects').replaceChildren(loading);
  try {
    await init();
  } catch (error) {
    $('chapterSubjects').replaceChildren();
    $('chapterUnit').replaceChildren(new Option('目录加载失败', ''));
    $('chapterErrorMessage').textContent = error.message;
    $('chapterError').hidden = false;
  }
}

$('chapterRetry').onclick = loadCatalog;
void loadCatalog();
