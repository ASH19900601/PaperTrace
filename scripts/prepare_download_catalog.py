"""Prepare lightweight per-subject download catalogues from published resource lists.

Run with --discover to refresh CAIE directory listings; otherwise reuse the saved
discovery results. Search question shards are never modified.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import html
import json
from pathlib import Path
import re
import shutil
import subprocess
from urllib.parse import urlsplit, urljoin, unquote, quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist/data/downloads'
CACHE = ROOT / '.cache/download-discovery.json'
TYPES = {'qp', 'ms', 'gt', 'er', 'in', 'ci'}
BASE = 'https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/'


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def get(url):
    with urlopen(Request(url, headers={'User-Agent': 'PaperTrace/1.0 (public exam resource catalogue)'}), timeout=18) as r:
        return r.read(2000000).decode('utf-8', errors='replace')


def discover(subjects):
    from build_corpus import DIRECTORIES
    urls, errors = {}, []
    def roots(code):
        root = 'https://pastpapers.papacambridge.com/papers/caie/' + DIRECTORIES[code]
        links = re.findall(r'href=["\']([^"\']+)["\']', get(root))
        result = set()
        for link in links:
            link = urljoin('https://pastpapers.papacambridge.com/', html.unescape(link))
            if not link.startswith(root + '-'):
                continue
            if any(re.search(rf'(?<!\d){year}(?!\d)', link) for year in range(2018, 2027)):
                if any(s in link for s in ('may-june', 'oct-nov', 'october-november', 'march')):
                    result.add(link)
        return result
    with ThreadPoolExecutor(max_workers=8) as pool:
        jobs = {pool.submit(roots, s['code']): s['code'] for s in subjects if s['code'] in DIRECTORIES}
        for job in as_completed(jobs):
            code = jobs[job]
            try:
                for url in job.result(): urls[url] = code
            except Exception as exc:
                errors.append({'code': code, 'error': str(exc)[:120]})
    print(f'Discovered {len(urls)} published session directories.', flush=True)
    found = []
    def files(url, code):
        page = get(url)
        names = set(re.findall(r'\b' + re.escape(code) + r'_[msw]\d{2}_(?:qp|ms|gt|er|in|ci)(?:_[a-z0-9]+)?\.pdf\b', page, re.I))
        return [{'name': name.lower(), 'source': url} for name in sorted(names)]
    with ThreadPoolExecutor(max_workers=10) as pool:
        jobs = {pool.submit(files, url, code): url for url, code in urls.items()}
        for i, job in enumerate(as_completed(jobs), 1):
            try: found.extend(job.result())
            except Exception as exc: errors.append({'url': jobs[job], 'error': str(exc)[:120]})
            if i % 60 == 0: print(f'Listings {i}/{len(jobs)}; {len(found)} PDF entries', flush=True)
    result = {'updatedAt': datetime.now(timezone.utc).isoformat(), 'files': found, 'errors': errors}
    CACHE.write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
    return result


def component_fields(board, raw, label):
    raw = str(raw or '')
    if board == 'CAIE':
        if re.fullmatch(r'\d{1,2}', raw):
            return raw[0], raw[1:] if len(raw) == 2 else '', 'Paper ' + raw[0] + (' · Variant ' + raw[1:] if len(raw) == 2 else '')
        return '', '', '考季资料'
    if board == 'Pearson Edexcel':
        match = re.search(r'\bPaper\s*(\d+[A-Z]?|[A-Z])\b', label, re.I)
        label = 'Paper ' + match[1].upper() if match else ''
    if label == '考季资料': label = ''
    return label or '', '', label or '考季资料'


def retry_missing():
    """Retry failed TLS reads once with curl and lower concurrency."""
    from build_corpus import DIRECTORIES
    data = read_json(CACHE); pending = {}; errors = []
    def read(url):
        command = shutil.which('curl.exe') or shutil.which('curl')
        result = subprocess.run([command, '--fail', '--silent', '--show-error', '--location', '--connect-timeout', '10', '--max-time', '25', url], capture_output=True, timeout=30)
        if result.returncode: raise OSError(result.stderr.decode(errors='replace')[:150])
        return result.stdout.decode('utf-8', errors='replace')
    for failure in data['errors']:
        if failure.get('url'): pending[failure['url']] = None; continue
        code = failure['code']; root = 'https://pastpapers.papacambridge.com/papers/caie/' + DIRECTORIES[code]
        try:
            for link in re.findall(r'href=["\']([^"\']+)["\']', read(root)):
                url = urljoin('https://pastpapers.papacambridge.com/', html.unescape(link))
                if url.startswith(root + '-') and re.search(r'20(?:1[89]|2[0-6])', url) and any(s in url for s in ('may-june', 'oct-nov', 'october-november', 'march')):
                    pending[url] = code
        except Exception as exc: errors.append({'code': code, 'error': str(exc)})
    def retry(url, code):
        page = read(url); prefix = re.escape(code) if code else r'\d{4}'
        names = set(re.findall(r'\b' + prefix + r'_[msw]\d{2}_(?:qp|ms|gt|er|in|ci)(?:_[a-z0-9]+)?\.pdf\b', page, re.I))
        return [{'name': name.lower(), 'source': url} for name in names]
    with ThreadPoolExecutor(max_workers=3) as pool:
        jobs = {pool.submit(retry, url, code): url for url, code in pending.items()}
        for job in as_completed(jobs):
            try: data['files'].extend(job.result())
            except Exception as exc: errors.append({'url': jobs[job], 'error': str(exc)})
    data['errors'] = errors; data['updatedAt'] = datetime.now(timezone.utc).isoformat()
    CACHE.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
    print(f'Recovered missing directories; {len(errors)} errors remain.', flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('--discover', action='store_true'); parser.add_argument('--retry-missing', action='store_true'); args = parser.parse_args()
    if args.retry_missing: retry_missing()
    manifest = read_json(ROOT / 'dist/data/manifest.json')
    subjects = {s['code']: s for s in manifest['subjects']}
    files = {code: {} for code in subjects}
    roots = {}
    def add(code, year, session, kind, url, component='', label='', source='', filename='', verified=False):
        if code not in subjects or kind not in TYPES or not url or not 2018 <= int(year) <= 2026:
            return
        if urlsplit(url).scheme != 'https' or not urlsplit(url).path.lower().endswith('.pdf'):
            return
        board = subjects[code].get('examBoard', 'CAIE')
        paper, variant, display = component_fields(board, component, label)
        name = filename or unquote(urlsplit(url).path.rsplit('/', 1)[-1])
        if board == 'Pearson Edexcel' and not paper:
            unit = re.match(re.escape(code) + r'[-_](0?\d+[a-z]?)[-_]', name, re.I)
            if unit:
                paper = display = 'Paper ' + unit[1].lstrip('0').upper()
        if board == 'AQA' and re.fullmatch(r'[a-f0-9]{20,}\.pdf', name):
            name = re.sub(r'[^A-Za-z0-9_.-]', '-', f'{code}_{year}_{session}_{label or "series"}_{kind}.pdf')
        file_id = code + '.' + hashlib.sha256(url.encode()).hexdigest()[:16]
        if file_id in files[code]:
            if source: files[code][file_id]['source'] = source
            if not files[code][file_id]['paper'] and paper:
                files[code][file_id].update(paper=paper, variant=variant, label=display)
            return
        files[code][file_id] = dict(id=file_id, code=code, year=int(year), session=session, type=kind, paper=paper, variant=variant,
                                    component=str(component), label=display, name=name, url=url, source=source, checked=verified)
        if source: roots.setdefault(code, source)
    for paper in manifest['papers']:
        for kind in ('qp', 'ms'):
            if kind == 'ms' and not paper.get('msVerified'): continue
            add(paper['code'], paper['year'], paper['session'], kind, paper.get(kind), paper['component'], paper.get('componentLabel', ''), paper.get('sourcePage', ''), verified=True)
    discovery = discover(list(subjects.values())) if args.discover else (read_json(CACHE) if CACHE.exists() else {'files': [], 'errors': []})
    for row in discovery['files']:
        match = re.fullmatch(r'(\d{4})_([msw])(\d{2})_(qp|ms|gt|er|in|ci)(?:_([a-z0-9]+))?\.pdf', row['name'])
        if match:
            code, season, yy, kind, component = match.groups()
            add(code, 2000 + int(yy), season, kind, BASE + row['name'], component or '', source=row['source'])
    # Reuse already obtained official Pearson listings, including resource types
    # that question-text ingestion does not need (inserts, examiner reports).
    kinds = {'Question-paper': 'qp', 'Mark-scheme': 'ms', 'Examiner-report': 'er', 'Examiners-report': 'er', 'Insert': 'in', 'Grade-boundaries': 'gt'}
    for code, subject in subjects.items():
        cached = ROOT / f'.cache/pearson-{code}.json'
        if not cached.exists(): continue
        for hit in read_json(cached).get('hits', []):
            categories = hit.get('category', [])
            if hit.get('gating') or any('secure-content/gold' in c for c in categories): continue
            series = next((re.search(r'Exam-Series/(January|June|November)-(20\d{2})', c) for c in categories if 'Exam-Series/' in c), None)
            kind = next((v for k, v in kinds.items() if any(c.endswith('/' + k) for c in categories)), None)
            url = hit.get('url', '')
            if not series or not kind or not re.search('/' + code + r'[-_]', url, re.I): continue
            unit = next((c.split('/Unit/')[-1].replace('-', ' ') for c in categories if '/Unit/' in c), '')
            label = unit or hit.get('description', '') or '考季资料'
            add(code, int(series[2]), {'January': 'j', 'June': 's', 'November': 'w'}[series[1]], kind,
                quote(urljoin('https://qualifications.pearson.com', url), safe=':/%'), label=label, source=roots.get(code, ''))
    # AQA's official public page embeds the original filename and its CDN URL.
    for code in ('AQA-7582', 'AQA-8261'):
        cached = ROOT / f'.cache/source-{code}.html'
        if not cached.exists(): continue
        page = cached.read_text(encoding='utf-8').replace('\\"', '"')
        pairs = dict(re.findall(r'"originalFilename":"([^"]+)".{0,700}?"url":"([^"]+)"', page))
        for name, url in pairs.items():
            match = re.fullmatch(r'AQA-(\d{4})([W12])?(?:-W)?-(QP|MS|INS|WRE|ER)-(JUN|NOV)(\d{2})(?:-CR)?\.PDF', name, re.I)
            if not match or 'AQA-' + match[1] != code: continue
            unit = match[2]; label = 'Paper ' + ('1' if unit == 'W' else unit) if unit else ''
            add(code, 2000 + int(match[5]), 's' if match[4] == 'JUN' else 'w', {'QP': 'qp', 'MS': 'ms', 'INS': 'in', 'WRE': 'er', 'ER': 'er'}[match[3].upper()], url, label=label, source=roots.get(code, ''), filename=name)
    OUT.mkdir(parents=True, exist_ok=True)
    index = {'version': 1, 'updatedAt': datetime.now(timezone.utc).isoformat(), 'subjects': [], 'files': 0, 'types': {}}
    for code, subject in subjects.items():
        rows = sorted(files[code].values(), key=lambda f: (-f['year'], f['session'], f['paper'], f['variant'], f['type'], f['name']))
        shard = json.dumps({'code': code, 'files': rows}, ensure_ascii=False, separators=(',', ':'))
        (OUT / f'{code}.json').write_text(shard, encoding='utf-8')
        item = {k: subject[k] for k in ('code', 'name', 'nameZh', 'level', 'examBoard') if k in subject}
        item.update(files=len(rows), years=sorted({r['year'] for r in rows}, reverse=True), types=sorted({r['type'] for r in rows}), version=hashlib.sha256(shard.encode()).hexdigest()[:12])
        index['subjects'].append(item); index['files'] += len(rows)
        for row in rows: index['types'][row['type']] = index['types'].get(row['type'], 0) + 1
    (OUT / 'index.json').write_text(json.dumps(index, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(json.dumps({'subjects': len(subjects), 'files': index['files'], 'types': index['types'], 'discoveryErrors': len(discovery.get('errors', []))}), flush=True)


if __name__ == '__main__':
    main()
