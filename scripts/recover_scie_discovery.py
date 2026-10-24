"""Retry failed directory discovery with urllib, retaining successful jobs."""
import concurrent.futures,json
import build_corpus as b

def main():
 saved=json.loads((b.ROOT/'docs/reports/scie-caie-jobs.json').read_text())
 subjects=[s['code'] for s in b.SCIE_SUBJECTS];years=list(range(2020,2027));sessions=['m','s','w']
 urls=[];errors=[]
 for error in saved['discoveryErrors']:
  url=error['directory']
  root=next((code for code,directory in b.DIRECTORIES.items() if url.endswith('/'+directory)),None)
  if root:
   found,e=b.discover_directories(root,years,sessions);urls.extend(found)
   if e:errors.append(e)
  else:urls.append(url)
 jobs=set(tuple(j) for j in saved['jobs'])
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
  for found,error in pool.map(lambda u:b.discover_jobs(u,subjects,years,sessions),sorted(set(urls))):
   jobs.update(found)
   if error:errors.append(error)
 b.write_json(b.ROOT/'docs/reports/scie-caie-recovered-jobs.json',dict(subjects=subjects,years=years,sessions=sessions,jobs=sorted(jobs),discoveryErrors=errors))
 print('jobs',len(jobs),'remaining directory errors',len(errors),flush=True)
if __name__=='__main__':main()
