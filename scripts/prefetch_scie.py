"""Optional persistent-connection downloader; no live indexes are modified.

Uses requests if available. The normal builder later parses and verifies every
cached PDF. Working backwards minimizes overlap with the ascending builder.
"""
import concurrent.futures,json,threading,time
from pathlib import Path
import requests

ROOT=Path(__file__).resolve().parents[1];CACHE=ROOT/'.cache/pdfs'
BASE='https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/'
local=threading.local()
def fetch(name):
 path=CACHE/name
 if path.exists():return 'cached'
 if not hasattr(local,'session'):
  local.session=requests.Session();local.session.headers['User-Agent']='PaperTrace/1.0 (educational source index)'
 try:
  response=local.session.get(BASE+name,timeout=(6,20));response.raise_for_status()
  data=response.content
  if not data.startswith(b'%PDF'):return 'not_pdf'
  temporary=path.with_suffix('.prefetch')
  temporary.write_bytes(data)
  if path.exists():temporary.unlink()
  else:temporary.replace(path)
  return 'downloaded'
 except Exception as error:return str(error)[:120]

def main():
 jobs=json.loads((ROOT/'docs/reports/scie-caie-recovered-jobs.json').read_text())['jobs']
 names=[f'{code}_{session}{year%100:02d}_{kind}_{component}.pdf' for code,year,session,component in reversed(jobs) for kind in ['qp','ms']]
 names=[n for n in names if not (CACHE/n).exists()];results=[];start=time.time()
 with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
  pending={pool.submit(fetch,name):name for name in names}
  for i,f in enumerate(concurrent.futures.as_completed(pending)):
   results.append({'file':pending[f],'result':f.result()})
   if (i+1)%100==0:print(i+1,len(names),int(time.time()-start),flush=True)
 (ROOT/'docs/reports/scie-prefetch.json').write_text(json.dumps(results),encoding='utf-8')
 print('completed',len(results),flush=True)
if __name__=='__main__':main()
