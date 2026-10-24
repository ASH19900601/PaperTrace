import json
from pathlib import Path
import sys
import unittest
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from question_crop import locate_part

ROOT = Path(__file__).resolve().parents[1]


class QuestionCropTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import fitz
        cls.doc = fitz.open(ROOT / 'dist/examples/9702_s24_qp_22.pdf')
        records = json.loads((ROOT / 'dist/data/9702.json').read_text(encoding='utf-8'))
        cls.record = next(r for r in records if r['id'] == '9702_s24_qp_22-q2')

    @classmethod
    def tearDownClass(cls):
        cls.doc.close()

    def test_matches_deep_part_on_original_page(self):
        result = locate_part(self.doc, self.record, 'Calculate the acceleration of the skydiver at time t = 9.0 s.')
        self.assertEqual((result['mode'], result['label'], result['page']), ('part', '2(a)(ii)', 6))
        import fitz
        text = self.doc[5].get_text(clip=fitz.Rect(result['clip']))
        self.assertIn('9.0', text)
        self.assertNotIn('terminal velocity', text)
        self.assertLess(result['clip'][3] - result['clip'][1], 250)

    def test_short_exact_sentence_selects_the_later_page(self):
        result = locate_part(self.doc, self.record, 'The upthrust on the skydiver is negligible.')
        self.assertEqual((result['label'], result['page']), ('2(b)', 7))

    def test_explicit_part_reference_and_full_page_toggle(self):
        result = locate_part(self.doc, self.record, '9702_s24_qp_22 Q2(c)(ii)')
        self.assertEqual((result['mode'], result['label'], result['page']), ('part', '2(c)(ii)', 7))
        full = locate_part(self.doc, self.record, '9702_s24_qp_22 Q2(c)(ii)', requested_page=7, full=True)
        self.assertEqual(full['mode'], 'page')
        self.assertIsNone(full['clip'])
        self.assertEqual(full['page'], 7)
        self.assertEqual(full['pages'], [6, 7])

    def test_weak_or_missing_part_matches_fall_back_to_page(self):
        for query in ('velocity', 'unrelated arbitrary keywords', '9702_s24_qp_22 Q2(z)'):
            with self.subTest(query=query):
                result = locate_part(self.doc, self.record, query)
                self.assertEqual(result['mode'], 'page')
                self.assertIsNone(result['clip'])

    def test_other_questions_and_their_graphics_stay_outside_crop(self):
        class Page:
            rect = SimpleNamespace(width=600, height=840)
            def get_text(self, kind):
                return {'blocks': [{'lines': [{'bbox': [50, y, 540, y+12], 'spans': [{'text': text, 'size': 11}]} for y, text in (
                    (60, '1 Calculate the speed of the aircraft.'), (110, 'speed = ..........'),
                    (200, '2 Calculate the mass of the parcel.'), (250, 'mass = ..........'))]}]}
            def get_drawings(self):
                return [{'rect': (100, 150, 400, 180)}, {'rect': (100, 270, 400, 600)}]
            def get_image_info(self):
                return []
        result = locate_part([Page()], {'question': 1, 'page': 1, 'endPage': 1}, 'Q1')
        self.assertEqual(result['mode'], 'question')
        self.assertGreaterEqual(result['clip'][3], 180)
        self.assertLess(result['clip'][3], 200)


if __name__ == '__main__':
    unittest.main()
