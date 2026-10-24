"""Regression tests for incremental ingestion; never touch the shipped corpus."""
import contextlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import build_corpus as corpus


def sample(code='9701', year=2020, question_count=2):
    pid = f'{code}_s{str(year)[2:]}_qp_22'
    paper = {'id': pid, 'code': code, 'year': year, 'session': 's',
             'component': '22', 'pages': 4, 'qp': corpus.BASE + pid + '.pdf',
             'ms': corpus.BASE + pid.replace('_qp_', '_ms_') + '.pdf',
             'msVerified': True, 'questions': question_count}
    records = [{'id': pid + f'-q{q}', 'paperId': pid, 'question': q, 'code': code,
                'year': year, 'session': 's', 'component': '22', 'page': 2,
                'endPage': 2, 'msPage': q + 1, 'text': f'Existing question {q}'}
               for q in range(1, question_count + 1)]
    return {'paper': paper, 'records': records}


def write_existing(directory, result):
    paper, records = result['paper'], result['records']
    manifest = {'papers': [paper], 'subjects': [{'code': paper['code'],
                'name': 'Chemistry', 'nameZh': '化学', 'level': 'AS & A Level',
                'questions': len(records), 'papers': 1}]}
    corpus.write_json(directory / 'manifest.json', manifest)
    corpus.write_json(directory / f"{paper['code']}.json", records)
    return manifest


class CorpusTests(unittest.TestCase):
    def test_caie_update_preserves_external_board_and_page_index_metadata(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory=Path(temporary)
            old=sample('AP-BIO',2024,1)
            old['records'][0].update(question=None,id=old['paper']['id']+'-p2')
            manifest=write_existing(directory/'data',old)
            manifest['subjects'][0].update(level='AP',examBoard='College Board',coverage='公开 FRQ')
            corpus.write_json(directory/'data/manifest.json',manifest)
            with contextlib.redirect_stdout(io.StringIO()):
                status=corpus.main(['--subjects','9702','--years','2024','--sessions','s','--offline','--workers','1','--cache',str(ROOT/'tests/fixtures'),'--output',str(directory/'data'),'--report',str(directory/'report.json')])
            self.assertEqual(status,0)
            result,records=corpus.read_existing(directory/'data')
            ap=next(s for s in result['subjects'] if s['code']=='AP-BIO')
            self.assertEqual((ap['examBoard'],ap['level'],ap['pageRecords']),('College Board','AP',1))
            self.assertEqual(result['stats']['pageRecords'],1)
            self.assertIn(old['records'][0],records)

    def test_merge_preserves_unselected_subject_and_failed_paper(self):
        old, new = sample(), sample('0610', 2024)
        papers, records, rejected, accepted = corpus.merge_results(
            {'papers': [old['paper']]}, old['records'],
            [{'file': old['paper']['id'] + '.pdf', 'error': 'timeout'}, new])
        self.assertEqual({p['code'] for p in papers}, {'9701', '0610'})
        self.assertEqual(len(records), 4)
        self.assertEqual((rejected, accepted), ([], 1))

    def test_partial_extraction_does_not_shrink_old_paper(self):
        old, partial = sample(question_count=4), sample(question_count=1)
        papers, records, rejected, accepted = corpus.merge_results(
            {'papers': [old['paper']]}, old['records'], [partial])
        self.assertEqual(len(records), 4)
        self.assertEqual(papers[0]['questions'], 4)
        self.assertEqual(rejected[0]['error'], 'question_count_regression')
        self.assertEqual(accepted, 0)

    def test_ms_outage_keeps_previously_verified_pair_and_pages(self):
        old, new = sample(), sample()
        new['paper'].update(ms=None, msVerified=False)
        for record in new['records']:
            record['msPage'] = None
        papers, records, _, _ = corpus.merge_results(
            {'papers': [old['paper']]}, old['records'], [new])
        self.assertTrue(papers[0]['msVerified'])
        self.assertEqual([r['msPage'] for r in records], [2, 3])

    def test_explicit_replace_changes_scope(self):
        old, new = sample(), sample('0610', 2024)
        papers, records, _, _ = corpus.merge_results(
            {'papers': [old['paper']]}, old['records'], [new], replace=True)
        self.assertEqual([p['code'] for p in papers], ['0610'])
        self.assertEqual(len(records), 2)

    def test_explicit_correction_can_remove_false_question_labels(self):
        old, corrected = sample(question_count=4), sample(question_count=2)
        papers, records, rejected, accepted = corpus.merge_results(
            {'papers': [old['paper']]}, old['records'], [corrected], accept_corrections=True)
        self.assertEqual(len(records), 2)
        self.assertEqual(papers[0]['questions'], 2)
        self.assertEqual((rejected, accepted), ([], 1))

    def test_corrupt_existing_shard_is_not_silently_ignored(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            write_existing(directory, sample())
            corpus.write_json(directory / '9701.json', [])
            with self.assertRaisesRegex(ValueError, 'count mismatch'):
                corpus.read_existing(directory)

    def test_offline_empty_cache_never_replaces_existing_files(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            write_existing(directory / 'data', sample())
            before = (directory / 'data/manifest.json').read_bytes()
            with contextlib.redirect_stdout(io.StringIO()):
                status = corpus.main(['--subjects', '0610', '--years', '2024',
                    '--offline', '--cache', str(directory / 'empty'),
                    '--output', str(directory / 'data'), '--report', str(directory / 'report.json')])
            self.assertEqual(status, 1)
            self.assertEqual((directory / 'data/manifest.json').read_bytes(), before)
            self.assertTrue(json.loads((directory / 'report.json').read_text())['corpusUnchanged'])

    def test_real_fixture_adds_subject_without_removing_older_year(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            write_existing(directory / 'data', sample())
            with contextlib.redirect_stdout(io.StringIO()):
                status = corpus.main(['--subjects', '9702', '--years', '2024',
                    '--offline', '--sessions', 's', '--cache', str(ROOT / 'tests/fixtures'),
                    '--output', str(directory / 'data'), '--report', str(directory / 'report.json')])
            self.assertEqual(status, 0)
            manifest, records = corpus.read_existing(directory / 'data')
            self.assertEqual(manifest['years'], [2020, 2024])
            self.assertEqual(manifest['stats']['papers'], 2)
            self.assertEqual(manifest['stats']['questions'], 9)
            self.assertEqual(len(records), 9)
            self.assertEqual(manifest['subjects'][0]['nameZh'], '化学')
            physics = [p for p in manifest['papers'] if p['code'] == '9702'][0]
            self.assertTrue(physics['msVerified'])

    def test_zero_question_pdf_is_not_an_indexed_paper(self):
        with patch.object(corpus, 'fetch', return_value=(b'%PDF fixture', None)), \
             patch.object(corpus, 'extract_questions', return_value=([], 3)):
            result = corpus.process(('9702', 2024, 's', 22), Path('.'))
        self.assertEqual(result['error'], 'no_searchable_questions')

    def test_invalid_ms_is_not_verified_just_because_it_has_pdf_prefix(self):
        data = (ROOT / 'tests/fixtures/9702_s24_qp_22.pdf').read_bytes()
        with patch.object(corpus, 'fetch', side_effect=[(data, None), (b'%PDF broken', None)]):
            result = corpus.process(('9702', 2024, 's', 22), Path('.'))
        self.assertFalse(result['paper']['msVerified'])
        self.assertIsNone(result['paper']['ms'])
        self.assertTrue(result['msError'].startswith('parse:'))

    def test_discovery_uses_real_session_links_with_legacy_order(self):
        page = '''<a href="papers/caie/as-and-a-level-biology-9700-may-june-2020">one</a>
          <a href="papers/caie/as-and-a-level-biology-9700-2022-feb-march">two</a>
          <a href="papers/caie/as-and-a-level-biology-9700-2022-oct-nov">three</a>
          <a href="papers/caie/as-and-a-level-biology-9700-2025-march">out of scope</a>'''
        with patch.object(corpus, 'get_html', return_value=page):
            directories, error = corpus.discover_directories('9700', [2020, 2022], ['m', 's', 'w'])
        self.assertIsNone(error)
        self.assertEqual(len(directories), 3)
        with patch.object(corpus, 'get_html', return_value='9700_s20_qp_22.pdf 9700_s25_qp_22.pdf 0610_s20_qp_22.pdf'):
            jobs, error = corpus.discover_jobs(directories[0], ['9700'], [2020], ['s'])
        self.assertEqual(jobs, [('9700', 2020, 's', '22')])

    def test_ict_zero_padded_qp_uses_the_real_unpadded_ms_name(self):
        seen = []
        qp = (ROOT / 'tests/fixtures/9702_s24_qp_22.pdf').read_bytes()
        ms = (ROOT / 'tests/fixtures/9702_s24_ms_22.pdf').read_bytes()
        def download(name, cache):
            seen.append(name)
            return (qp if '_qp_' in name else ms), None
        with patch.object(corpus, 'fetch', side_effect=download):
            result = corpus.process(('0417', 2020, 'w', 2), Path('.'))
        self.assertEqual(seen, ['0417_w20_qp_02.pdf', '0417_w20_ms_2.pdf'])
        self.assertEqual(result['paper']['component'], '02')
        self.assertEqual(result['paper']['id'], '0417_w20_qp_02')
        with patch.object(corpus, 'get_html', return_value='0417_w20_qp_02.pdf'):
            jobs, _ = corpus.discover_jobs('unused', ['0417'], [2020], ['w'])
        self.assertEqual(jobs, [('0417', 2020, 'w', '02')])


if __name__ == '__main__':
    unittest.main()
