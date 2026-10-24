import os, sys, unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from build_corpus import extract_questions, ms_pages
CACHE=Path(os.environ.get('PAPERTRACE_PDF_CACHE',str(Path(__file__).resolve().parents[1]/'.cache/pdfs')))
class ExtractionTests(unittest.TestCase):
 def test_structured_physics(self):
  records,_=extract_questions((CACHE/'9702_s24_qp_22.pdf').read_bytes())
  self.assertEqual([r['question'] for r in records],list(range(1,8)))
  self.assertEqual(records[1]['page'],6)
  self.assertIn('skydiver',records[1]['text'])
 def test_mcq_all_40_and_title_stays_with_question(self):
  records,_=extract_questions((CACHE/'0620_s24_qp_21.pdf').read_bytes())
  self.assertEqual([r['question'] for r in records],list(range(1,41)))
  self.assertIn('ammonia',records[8]['text'])
 def test_short_math_question_is_retained(self):
  records,_=extract_questions((CACHE/'9709_m24_qp_12.pdf').read_bytes())
  self.assertEqual(records[0]['question'],1)
  self.assertIn('exact value',records[0]['text'])
 def test_older_print_layout(self):
  records,_=extract_questions((CACHE/'9701_m20_qp_52.pdf').read_bytes())
  self.assertEqual([r['question'] for r in records],[1,2])
  self.assertIn('Brass',records[0]['text'])
 def test_rotated_ms_does_not_match_guidance_numbers(self):
  mapping=ms_pages((CACHE/'9702_s24_ms_22.pdf').read_bytes(),set(range(1,8)))
  self.assertEqual(mapping,{1:6,2:7,3:8,4:10,5:11,6:12,7:12})
 def test_mcq_ms_final_questions_on_next_page(self):
  mapping=ms_pages((CACHE/'9701_m24_ms_12.pdf').read_bytes(),set(range(1,41)))
  self.assertEqual(mapping[1],2)
  self.assertEqual(mapping[40],3)
 def test_biology_table_rows_do_not_consume_later_real_question(self):
  records,_=extract_questions((CACHE/'9700_s24_qp_51.pdf').read_bytes())
  self.assertEqual([r['question'] for r in records],[1,2,3])
  self.assertEqual(records[2]['page'],14)
  self.assertIn('Female mosquitoes',records[2]['text'])
  self.assertIn('young trees',records[1]['text'])
 def test_biology_numeric_table_stays_in_question_two(self):
  records,_=extract_questions((CACHE/'9700_s24_qp_53.pdf').read_bytes())
  self.assertEqual([r['question'] for r in records],[1,2])
  self.assertEqual(records[1]['page'],7)
  self.assertIn('Complete Table 2.3',records[1]['text'])
 def test_withdrawn_question_does_not_hide_the_remaining_questions(self):
  records,_=extract_questions((CACHE/'0455_w21_qp_12.pdf').read_bytes())
  self.assertEqual([r['question'] for r in records],[q for q in range(1,31) if q!=22])
  self.assertEqual(next(r for r in records if r['question']==23)['page'],9)
 def test_scanned_pages_allow_small_ocr_column_drift(self):
  records,_=extract_questions((CACHE/'0478_s20_qp_23.pdf').read_bytes())
  self.assertEqual([r['question'] for r in records],list(range(1,8)))
  self.assertEqual([r['page'] for r in records],[3,8,9,10,11,12,12])
 def test_source_material_introduces_an_unnumbered_first_question(self):
  records,_=extract_questions((CACHE/'0455_w21_qp_22.pdf').read_bytes())
  self.assertEqual([r['question'] for r in records],[1,2,3,4,5])
  self.assertEqual([r['page'] for r in records],[2,4,4,4,5])
  self.assertIn('India’s airline industry',records[0]['text'])
 def test_standalone_formula_coefficients_are_not_discarded(self):
  records,_=extract_questions((CACHE/'0606_m20_qp_12.pdf').read_bytes())
  text=records[1]['text']
  self.assertIn('\n3\n',text)
  self.assertIn('\n4\n',text)
  self.assertIn('\n1',text)
 def test_accounting_small_typesetting_shift_preserves_all_35(self):
  records,_=extract_questions((CACHE/'0452_w25_qp_12.pdf').read_bytes())
  self.assertEqual([r['question'] for r in records],list(range(1,36)))
  self.assertEqual(records[28]['page'],10)
 def test_code_and_spreadsheet_row_numbers_are_not_main_questions(self):
  cases={'0417_w21_qp_11.pdf':13,'9608_w19_qp_12.pdf':6,'0478_m22_qp_22.pdf':5,'0620_s21_qp_61.pdf':4,'0620_s26_qp_63.pdf':4}
  for name,count in cases.items():
   with self.subTest(name=name):
    records,_=extract_questions((CACHE/name).read_bytes())
    self.assertEqual([r['question'] for r in records],list(range(1,count+1)))
 def test_legitimate_question_font_changes_do_not_truncate_papers(self):
  for name,count in [('0452_s24_qp_12.pdf',35),('0455_m23_qp_12.pdf',30)]:
   with self.subTest(name=name):
    records,_=extract_questions((CACHE/name).read_bytes())
    self.assertEqual([r['question'] for r in records],list(range(1,count+1)))
if __name__=='__main__':unittest.main()
