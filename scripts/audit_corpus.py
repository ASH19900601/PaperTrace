"""Audit published corpus consistency and cached original-PDF page/count evidence."""
import argparse
from collections import Counter, defaultdict
import json
from pathlib import Path
import re
from urllib.parse import urlparse
import fitz

ROOT = Path(__file__).resolve().parents[1]


def audit(data, cache, baseline=None, targets=None, corrections=None):
    manifest = json.loads((data / 'manifest.json').read_text(encoding='utf-8'))
    records = []
    errors = []
    for subject in manifest['subjects']:
        shard = json.loads((data / (subject['code'] + '.json')).read_text(encoding='utf-8'))
        if len(shard) != subject['questions']:
            errors.append({'subject': subject['code'], 'error': 'subject_count_mismatch'})
        records.extend(shard)
    papers = {p['id']: p for p in manifest['papers']}
    if len(papers) != len(manifest['papers']) or len({r['id'] for r in records}) != len(records):
        errors.append({'error': 'duplicate_identity'})
    if len(records) != manifest['stats']['questions'] or len(papers) != manifest['stats']['papers']:
        errors.append({'error': 'manifest_totals'})
    counts = Counter(r['paperId'] for r in records)
    for r in records:
        p = papers.get(r['paperId'])
        if not p or not (2 <= r['page'] <= r['endPage'] <= p['pages']):
            errors.append({'id': r['id'], 'error': 'QP_page_bounds'})
            continue
        if any(r[key] != p[key] for key in ['code', 'year', 'session', 'component']):
            errors.append({'id': r['id'], 'error': 'source_identity'})
        expected_id = p['id'] + ('-q' + str(r['question']) if r['question'] is not None else '-p' + str(r['page']))
        if r['id'] != expected_id:
            errors.append({'id': r['id'], 'error': 'question_identity'})
    question_numbers = defaultdict(set)
    for record in records:
        question_numbers[record['paperId']].add(record['question'])
    checked_qp = checked_ms = checked_mcq = 0
    withdrawn_questions = []
    ms_page_counts = {}
    number_words = {'thirty': 30, 'thirty-five': 35, 'forty': 40, 'fifty': 50}
    for pid, p in papers.items():
        if p['questions'] != counts[pid]:
            errors.append({'paper': pid, 'error': 'paper_question_count'})
        qp = cache / (pid + '.pdf')
        if qp.exists():
            with fitz.open(qp) as doc:
                checked_qp += 1
                if len(doc) != p['pages']:
                    errors.append({'paper': pid, 'error': 'original_QP_page_count'})
                cover = re.sub(r'\s+', ' ', doc[0].get_text()).lower()
                match = re.search(r'there are (thirty-five|thirty|forty|fifty|\d+) questions', cover)
                if match:
                    expected = number_words.get(match[1]) or int(match[1])
                    withdrawn = sorted({int(q) for page in doc for q in re.findall(r'Question\s+(\d+),\s*the question has been removed', page.get_text(), re.I)})
                    if withdrawn:
                        withdrawn_questions.append({'paper': pid, 'questions': withdrawn})
                        expected -= len(withdrawn)
                    checked_mcq += 1
                    if p['questions'] != expected:
                        errors.append({'paper': pid, 'error': 'MCQ_cover_count', 'expected': expected, 'actual': p['questions']})
        ms = cache / (Path(urlparse(p['ms']).path).name if p.get('ms') else pid.replace('_qp_', '_ms_') + '.pdf')
        if ms.exists() and p.get('msVerified'):
            with fitz.open(ms) as doc:
                checked_ms += 1
                ms_page_counts[pid] = len(doc)
    for r in records:
        if r.get('msPage') and r['paperId'] in ms_page_counts and not (2 <= r['msPage'] <= ms_page_counts[r['paperId']]):
            errors.append({'id': r['id'], 'error': 'original_MS_page_bounds'})
    withdrawn_by_paper = {item['paper']: set(item['questions']) for item in withdrawn_questions}
    for pid, numbers in question_numbers.items():
        if None not in numbers and numbers != set(range(1, max(numbers) + 1)) - withdrawn_by_paper.get(pid, set()):
            errors.append({'paper': pid, 'error': 'noncontiguous_question_numbers', 'actual': sorted(numbers)})
    retained = None
    if baseline:
        previous = json.loads((baseline / 'manifest.json').read_text(encoding='utf-8'))
        current_ids = {r['id'] for r in records}
        previous_ids = {r['id'] for s in previous['subjects'] for r in json.loads((baseline / (s['code'] + '.json')).read_text(encoding='utf-8'))}
        lost = sorted(previous_ids - current_ids)
        allowed = {rid for entry in json.loads(corrections.read_text(encoding='utf-8'))['papers'] for rid in entry['removedInvalidRecordIds']} if corrections else set()
        unexpected = sorted(set(lost) - allowed)
        retained = {'previousRecords': len(previous_ids), 'retainedRecords': len(previous_ids & current_ids), 'lostRecords': lost, 'correctedInvalidRecords': sorted(set(lost) & allowed), 'unexpectedLostRecords': unexpected}
        if unexpected:
            errors.append({'error': 'baseline_records_lost', 'count': len(unexpected)})
    requested = set()
    if targets:
        requested = {f'{code}_{session}{str(year)[-2:]}_qp_{component}' for code, year, session, component in json.loads(targets.read_text(encoding='utf-8'))['jobs']}
    return {'papers': len(papers), 'records': len(records), 'subjects': len(manifest['subjects']),
            'years': manifest['years'], 'msVerified': sum(bool(p.get('msVerified')) for p in papers.values()),
            'msPageLocated': sum(r.get('msPage') is not None for r in records),
            'pageLevelRecords': sum(r['question'] is None for r in records),
            'unpairedPapers': sorted(p['id'] for p in papers.values() if not p.get('msVerified')),
            'requestedExpansionPapers': len(requested), 'unindexedRequestedPapers': sorted(requested - set(papers)),
            'originalQPsChecked': checked_qp, 'originalMSsChecked': checked_ms,
            'MCQCoverCountsChecked': checked_mcq, 'withdrawnQuestions': withdrawn_questions, 'baselineRetention': retained, 'errors': errors,
            'coverage': [{**s, 'years': sorted({p['year'] for p in papers.values() if p['code'] == s['code']})} for s in manifest['subjects']]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=Path, default=ROOT / 'dist/data')
    parser.add_argument('--cache', type=Path, default=ROOT / '.cache/pdfs')
    parser.add_argument('--output', type=Path)
    parser.add_argument('--baseline', type=Path, help='Verify the original record IDs remain after expansion')
    parser.add_argument('--targets', type=Path, help='Report missing papers from a saved discovery job list')
    parser.add_argument('--corrections', type=Path, help='Explicit, source-verified list of invalid original record IDs removed by a correction')
    args = parser.parse_args()
    result = audit(args.data, args.cache, args.baseline, args.targets, args.corrections)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in result.items() if k != 'coverage'}, ensure_ascii=False))
    return 1 if result['errors'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
