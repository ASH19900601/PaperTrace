"""Read one probe per added code directly from a verified original PDF.

These are source/page integration smoke checks with metadata filters, not a
random sample or an estimate of the accuracy of all searches.
"""
import hashlib,json,re
from pathlib import Path
import fitz
from build_corpus import ROOT,write_json

def main():
 manifest=json.loads((ROOT/'dist/data/manifest.json').read_text(encoding='utf8'))
 report=json.loads((ROOT/'docs/reports/scie-expansion-final.json').read_text(encoding='utf8'))
 probes=[]
 for subject in report['newSubjects']:
  papers=sorted([p for p in manifest['papers'] if p['code']==subject['code']],key=lambda p:(p['year']!=2024,-p['year'],p['component']))
  chosen=None
  for p in papers:
   path=ROOT/'.cache/pdfs'/(p['id']+'.pdf')
   if not path.exists():path=ROOT/'.cache/external-pdfs'/(hashlib.sha256(p['qp'].encode()).hexdigest()+'.pdf')
   if not path.exists():continue
   with fitz.open(path) as doc:
    candidates=[]
    for n in range(1,len(doc)):
     for line in doc[n].get_text(sort=True).splitlines():
      line=' '.join(line.split())
      if re.search(r'UCLES|Copyright|©|DO NOT WRITE|Turn over|BLANK PAGE|Free.Response Questions',line,re.I):continue
      count=len(re.findall(r'[A-Za-z]{3,}',line));cjk=len(re.findall(r'[\u3040-\u9fff]',line))
      if 45<=len(line)<=190 and count>=7 or 12<=cjk<=70:
       # Prefer a substantial sentence over short headings and footer labels.
       candidates.append((min(len(line),130),n+1,line))
    if candidates:
     _,page,query=max(candidates)
     chosen=dict(code=p['code'],paperId=p['id'],page=page,query=query,source=p['qp'],filters={k:p[k] for k in ['code','year','session','component']})
   if chosen:break
  if not chosen:raise RuntimeError('No original-PDF probe for '+subject['code'])
  probes.append(chosen)
 write_json(ROOT/'docs/reports/scie-search-probes.json',probes)
 print('Original-PDF probes:',len(probes))
if __name__=='__main__':main()
