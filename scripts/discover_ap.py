"""Discover SCIE's 14 requested AP courses from official College Board links.

AP History is excluded at the user's request. Only released FRQs are indexed;
restricted multiple-choice questions and sample exams are not included.
"""
import concurrent.futures, json, re
from html import unescape
from pathlib import Path
from urllib.parse import urljoin
from build_corpus import ROOT, get_html, write_json

COURSES=[
 ('AP-LANG','english-language-and-composition','英语语言与写作'),
 ('AP-LIT','english-literature-and-composition','英语文学与写作'),
 ('AP-CALCBC','calculus-bc','微积分 BC'),('AP-STAT','statistics','统计'),
 ('AP-BIO','biology','生物'),('AP-CHEM','chemistry','化学'),
 ('AP-PHYSM','physics-c-mechanics','物理 C 力学'),
 ('AP-HUG','human-geography','人文地理'),('AP-ARTH','art-history','艺术史'),
 ('AP-CSA','computer-science-a','计算机科学 A'),
 ('AP-MACRO','macroeconomics','宏观经济'),('AP-MICRO','microeconomics','微观经济'),
 ('AP-MUSIC','music-theory','音乐理论'),('AP-PSY','psychology','心理学'),
]

def discover(course):
 code,slug,name=course
 url=f'https://apcentral.collegeboard.org/courses/ap-{slug}/exam/past-exam-questions'
 try:
  page=get_html(url)
  links=sorted({urljoin(url,unescape(x)) for x in re.findall(r'href=[\"\']([^\"\']+)[\"\']',page)})
  pdfs=[x for x in links if re.search(r'\.pdf(?:\?|$)',x,re.I)]
  qps=[x for x in pdfs if re.search(r'ap\d{2}-frq-',x) and 'sample' not in x]
  ms=[x for x in pdfs if re.search(r'ap\d{2}-sg-',x)]
  jobs=[]
  for qp in qps:
   year=2000+int(re.search(r'ap(\d{2})-frq-',qp)[1])
   set_match=re.search(r'set[-_]?([12])',qp);component=set_match[1] if set_match else ('2' if 'sight-singing' in qp else '1')
   # Match only the actual scoring link with the same subject/year/set stem.
   expected=qp.split('/')[-1].replace('-frq-','-sg-').lower()
   candidates=[x for x in ms if x.split('/')[-1].lower()==expected]
   if not candidates:
    candidates=[x for x in ms if f'ap{year%100:02d}-sg-' in x and (re.search(r'set[-_]?([12])',x)[1] if re.search(r'set[-_]?([12])',x) else '1')==component]
   jobs.append(dict(code=code,year=year,session='s',component=component,qp=qp,ms=candidates[0] if len(candidates)==1 else None,sourcePage=url,componentLabel=('FRQ 视唱题' if 'sight-singing' in qp else 'FRQ'+(' Set '+component if set_match else '')),examBoard='College Board',coverage='公开 FRQ'))
  return dict(subject=dict(code=code,name=slug.replace('-',' ').title(),nameZh=name,level='AP',examBoard='College Board',coverage='公开 FRQ'),jobs=jobs,sourcePage=url)
 except Exception as error:return dict(code=code,error=str(error))

if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
  results=list(pool.map(discover,COURSES))
 write_json(ROOT/'docs/reports/scie-ap-sources.json',{'subjects':[r['subject'] for r in results if 'subject' in r], 'jobs':[j for r in results for j in r.get('jobs',[])], 'failures':[r for r in results if 'error' in r]})
 for r in results:print(r.get('subject',{}).get('code',r.get('code')),len(r.get('jobs',[])),r.get('error',''),flush=True)
