"""Split the supplied AS booklets at their chapter bookmarks for web downloads."""
import argparse
from collections import defaultdict
import json
from pathlib import Path
import re
import zipfile

import fitz

ROOT = Path(__file__).resolve().parents[1]
SUBJECTS = [('9702', '物理', 'Physics'), ('9701', '化学', 'Chemistry'), ('9700', '生物', 'Biology')]


def prepare(source, public):
    catalog = {'edition': '2020–2026', 'level': 'AS', 'paper': '2', 'subjects': []}
    for code, chinese, english in SUBJECTS:
        archive, = source.glob(f'CAIE_{code}*.zip')
        with zipfile.ZipFile(archive) as pack:
            def read(suffix):
                name, = [n for n in pack.namelist() if n.endswith('/' + suffix)]
                return pack.read(name)

            records = json.loads(read('question_index.json'))
            groups = defaultdict(list)
            for record in records:
                groups[record['chapter']].append(record)
            chapters = sorted(groups, key=lambda number: number or 100)
            if code == '9702':
                labels = {c['id']: c['chinese'] for c in json.loads(read('HANDOFF.json'))['chapters']}
            elif code == '9701':
                labels = {int(k): v for k, v in json.loads(read('ai_context.json'))['chapters'].items()}
            else:
                labels = {number: rows[0]['topic_zh'] for number, rows in groups.items()}
            subject = {'code': code, 'name': chinese, 'english': english, 'units': []}
            directory = public / 'downloads' / 'chapters' / code
            directory.mkdir(parents=True, exist_ok=True)
            for number in chapters:
                supplement = number == 0 or (code == '9702' and number == 12)
                subject['units'].append({
                    'id': 'appendix' if supplement else f'{number:02d}',
                    'number': number, 'supplement': supplement, 'title': labels[number],
                    'groups': len(groups[number]),
                    'focusParts': sum(p['scope'] == 'target' for r in groups[number] for p in r['scope_parts']),
                    'files': {},
                })
            for kind in ('QP', 'MS'):
                name, = [n for n in pack.namelist() if n.endswith(f'_{kind}.pdf') and '/Original' not in n]
                with fitz.open(stream=pack.read(name), filetype='pdf') as book:
                    toc = book.get_toc()
                    starts = [entry for entry in toc if entry[0] == 1 and entry[2] >= 3]
                    if len(starts) != len(chapters):
                        raise ValueError(f'{code} {kind}: chapter bookmarks do not match the question index')
                    for i, unit in enumerate(subject['units']):
                        start = starts[i][2]
                        end = starts[i + 1][2] - 1 if i + 1 < len(starts) else len(book)
                        for record in groups[unit['number']]:
                            pages = record[f'book_{kind.lower()}_pages']
                            if any(page < start or page > end for page in pages):
                                raise ValueError(f'{code} {kind} {record["id"]}: question crosses a chapter boundary')
                        if kind == 'QP':
                            unit['english'] = re.sub(r'^(?:Chapter\s+\d+\s*[-|]|\d+\.)\s*', '', starts[i][1])
                        filename = f'{code}_AS_P2_2020-2026_Unit_{unit["id"]}_{kind}.pdf'
                        output = directory / filename
                        with fitz.open() as document:
                            document.insert_pdf(book, from_page=start - 1, to_page=end - 1)
                            for page in document:
                                page.clean_contents()
                            document.set_toc([[level, title, page - start + 1] for level, title, page in toc if start <= page <= end])
                            document.set_metadata({'title': f'{english} AS · {unit["title"]} · {kind}', 'subject': 'PaperTrace chapter practice'})
                            document.save(output, garbage=4, deflate=True)
                        unit['files'][kind.lower()] = {
                            'url': output.relative_to(public).as_posix(), 'bytes': output.stat().st_size,
                            'pages': end - start + 1, 'sourceStart': start, 'sourceEnd': end,
                        }
            for unit in subject['units']:
                output = directory / f'{code}_AS_P2_2020-2026_Unit_{unit["id"]}_QP_MS.zip'
                with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as bundle:
                    for file in unit['files'].values():
                        path = public / file['url']
                        bundle.write(path, path.name)
                unit['files']['zip'] = {'url': output.relative_to(public).as_posix(), 'bytes': output.stat().st_size}
            catalog['subjects'].append(subject)
            print(f'{code} {chinese}: {len(chapters)} units prepared', flush=True)
    target = public / 'data' / 'chapters' / 'index.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return catalog


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT.parent)
    parser.add_argument('--public', type=Path, default=ROOT / 'dist')
    args = parser.parse_args()
    prepare(args.source, args.public)
