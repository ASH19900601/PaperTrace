"""Verify actual official PDFs and stage page indexes without modifying live data."""
import argparse,concurrent.futures,hashlib,json,time
import fitz
import build_corpus
from build_corpus import ROOT,write_json,read_url,PDF_LOCK,extract_pages

CACHE=ROOT/'.cache/external-pdfs'
def pdf(url):
 if not url:return None
 path=CACHE/(hashlib.sha256(url.encode()).hexdigest()+'.pdf')
 data=path.read_bytes() if path.exists() else read_url(url)
 if not data.startswith(b'%PDF'):raise ValueError('not an anonymously accessible PDF')
 with PDF_LOCK:
  with fitz.open(stream=data,filetype='pdf') as doc:
   if len(doc)<1:raise ValueError('empty PDF')
 if not path.exists():path.write_bytes(data)
 return data

def process(j):
 pid=f"{j['code']}_{j['session']}{j['year']%100:02d}_qp_{j['component']}"
 try:
  data=pdf(j['qp'])
  with PDF_LOCK:records,pages=extract_pages(data)
  if not records:raise ValueError('no searchable pages')
 except Exception as e:return {'file':pid,'error':str(e)}
 error=None
 try:ms=bool(pdf(j.get('ms')))
 except Exception as e:ms=False;error=str(e)
 p={**j,'id':pid,'pages':pages,'questions':len(records),'indexMode':'page','msVerified':ms,'ms':j.get('ms') if ms else None}
 for r in records:r.update(id=pid+'-p'+str(r['page']),paperId=pid,code=j['code'],year=j['year'],session=j['session'],component=j['component'],msPage=None)
 return dict(paper=p,records=records,msError=error)

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--transport',choices=['urllib','curl'],default='urllib')
 build_corpus.TRANSPORT=parser.parse_args().transport
 catalogue=json.loads((ROOT/'docs/reports/scie-external-sources.json').read_text(encoding='utf-8'))
 CACHE.mkdir(parents=True,exist_ok=True);results=[];start=time.time()
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
  for i,r in enumerate(pool.map(process,catalogue['jobs'])):
   results.append(r)
   if (i+1)%10==0:print(i+1,len(catalogue['jobs']),int(time.time()-start),flush=True)
 write_json(ROOT/'.cache/scie-external-stage.json',dict(subjects=catalogue['subjects'],results=results))
 write_json(ROOT/'docs/reports/scie-external-ingest.json',dict(attempted=len(results),accepted=sum('paper' in r for r in results),failures=[r for r in results if 'error' in r],msMissing=[r['paper']['id'] for r in results if 'paper' in r and not r['paper']['msVerified']]))
 print('Completed',sum('paper' in r for r in results),'/',len(results),flush=True)
if __name__=='__main__':main()
