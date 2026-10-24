"""Process recovered directory links separately while the initial run finishes."""
import concurrent.futures,json,time
import build_corpus as b

def main():
 original=json.loads((b.ROOT/'docs/reports/scie-caie-jobs.json').read_text())
 recovered=json.loads((b.ROOT/'docs/reports/scie-caie-recovered-jobs.json').read_text())
 old={tuple(j) for j in original['jobs']};jobs=[tuple(j) for j in recovered['jobs'] if tuple(j) not in old]
 results=[];start=time.time()
 with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
  for i,result in enumerate(pool.map(lambda j:b.process(j,b.ROOT/'.cache/pdfs'),jobs)):
   results.append(result)
   if (i+1)%20==0:print(i+1,len(jobs),int(time.time()-start),flush=True)
 b.write_json(b.ROOT/'.cache/scie-recovered-stage.json',dict(results=results))
 print('accepted',sum('paper' in r for r in results),'/',len(results),flush=True)
if __name__=='__main__':main()
