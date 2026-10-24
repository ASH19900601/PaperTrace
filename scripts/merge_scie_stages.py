"""Publish verified staged additions after all primary writers have finished."""
import json,time
from collections import Counter,defaultdict
import build_corpus as b

def main():
 out=b.ROOT/'dist/data';existing,old=b.read_existing(out)
 sources=json.loads((b.ROOT/'.cache/scie-external-stage.json').read_text(encoding='utf-8'))
 recovered=json.loads((b.ROOT/'.cache/scie-recovered-stage.json').read_text(encoding='utf-8'))
 results=sources['results']+recovered['results']
 papers,records,rejected,accepted=b.merge_results(existing,old,results)
 subjects={s['code']:dict(s) for s in existing['subjects']}
 for s in b.SCIE_SUBJECTS+sources['subjects']:
  subjects[s['code']]={**subjects.get(s['code'],{}),**{k:v for k,v in s.items() if k not in ['directory','indexMode']}}
 pc=Counter(p['code'] for p in papers);rc=Counter(r['code'] for r in records);qc=Counter(r['code'] for r in records if r['question'] is not None)
 metadata=[{**subjects[c],'papers':pc[c],'questions':rc[c],'questionRecords':qc[c],'pageRecords':rc[c]-qc[c],'examBoard':subjects[c].get('examBoard','CAIE')} for c in sorted(pc)]
 stats=dict(papers=len(papers),questions=len(records),questionRecords=sum(qc.values()),pageRecords=len(records)-sum(qc.values()),msVerified=sum(p.get('msVerified',False) for p in papers))
 manifest={**existing,'updatedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'papers':papers,'subjects':metadata,'years':sorted({p['year'] for p in papers}),'stats':stats,'scope':{'excluded':['AP History'],'ap':'公开 FRQ','newSubjects':'按原卷页码索引'}}
 # Check the original corpus is preserved before publishing any shard.
 baseline=json.loads((b.ROOT/'docs/reports/scie-baseline.json').read_text())
 bm,br=b.read_existing(b.Path(baseline['backup'])/'data')
 newpapers={p['id'] for p in papers};newrecords={r['id']:r for r in records}
 assert all(p['id'] in newpapers for p in bm['papers'])
 assert all(newrecords.get(r['id'])==r for r in br),'Baseline record changed'
 shards=defaultdict(list)
 for r in records:shards[r['code']].append(r)
 for code,shard in shards.items():b.write_json(out/f'{code}.json',shard)
 b.write_json(out/'manifest.json',manifest)
 requested=set()
 for filename in ['scie-caie-recovered-jobs.json','scie-extra-caie-jobs.json']:
  path=b.ROOT/'docs/reports'/filename
  if path.exists():
   for code,year,session,component in json.loads(path.read_text())['jobs']:requested.add(f'{code}_{session}{year%100:02d}_qp_{component}')
 for j in json.loads((b.ROOT/'docs/reports/scie-external-sources.json').read_text(encoding='utf-8'))['jobs']:requested.add(f"{j['code']}_{j['session']}{j['year']%100:02d}_qp_{j['component']}")
 report=dict(stats=stats,baseline=baseline,baselineRecordsUnchanged=len(br),baselinePapersRetained=len(bm['papers']),newSubjects=[s for s in metadata if s['code'] not in {s['code'] for s in bm['subjects']}],missingRequestedCodes=[s['code'] for s in b.SCIE_SUBJECTS+sources['subjects'] if s['code'] not in pc],unresolvedPapers=sorted(requested-newpapers),msMissing=[p['id'] for p in papers if not p.get('msVerified')],stageFailures=[r for r in results if 'error' in r and r['file'].removesuffix('.pdf') not in newpapers]+rejected)
 b.write_json(b.ROOT/'docs/reports/scie-expansion-final.json',report)
 print(json.dumps(stats), 'subjects',len(metadata),'missing',report['missingRequestedCodes'],flush=True)
if __name__=='__main__':main()
