import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeIndex, search, normalize} from '../dist/search.mjs';

// These queries/page labels are read from the original PDFs in .cache/pdfs,
// not generated from the index records. URLs are the manifest's public sources.
// Run after the additive expansion: node --test tests/expanded-search-audit.test.mjs
export const expandedAuditCases=JSON.parse(fs.readFileSync(new URL('./fixtures/expanded-search-cases.json',import.meta.url)));
const manifest=JSON.parse(fs.readFileSync(new URL('../dist/data/manifest.json',import.meta.url)));
const records=manifest.subjects.flatMap(s=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+s.code+'.json',import.meta.url))).map(r=>({...r,level:s.level})));
const byId=new Map(records.map(r=>[r.id,r]));
const papers=new Map(manifest.papers.map(p=>[p.id,p]));
const index=makeIndex(records);

test('expanded subjects: independently read original questions, source IDs and QP pages',t=>{
  let top1=0,top5=0,equivalentSourceTop1=0,noResults=0,correctPage=0;
  const details=expandedAuditCases.map(c=>{
    const results=search(index,c.query);
    const expected=byId.get(c.id);
    const rank=results.findIndex(r=>r.id===c.id)+1;
    const first=results[0];
    const sameQuestion=Boolean(first&&expected&&normalize(first.text)===normalize(expected.text));
    if(rank===1)top1++;
    if(rank>0&&rank<=5)top5++;
    if(rank===1||sameQuestion)equivalentSourceTop1++;
    if(!results.length)noResults++;
    if(expected?.page===c.page)correctPage++;
    return {id:c.id,rank,page:expected?.page,expectedPage:c.page,first:first?.id,identicalQuestion:sameQuestion,candidates:results.length,source:papers.get(expected?.paperId)?.qp};
  });
  t.diagnostic(JSON.stringify({samples:details.length,subjects:new Set(expandedAuditCases.map(c=>c.id.slice(0,4))).size,questions:records.length,top1,top5,equivalentSourceTop1,noResults,correctPage,details}));
  for(const d of details){
    assert(byId.has(d.id),`${d.id} is missing from the expanded corpus`);
    assert.equal(d.page,d.expectedPage,d.id);
    assert(d.rank>0&&d.rank<=5,`${d.id} has rank ${d.rank}; first is ${d.first}`);
  }
});

test('expanded-subject metadata filters preserve the same original source',()=>{
  for(const c of expandedAuditCases){
    const r=byId.get(c.id);
    assert(r,c.id);
    const results=search(index,c.query,{code:r.code,year:r.year,session:r.session,component:r.component,level:r.level});
    assert(results.slice(0,5).some(hit=>hit.id===c.id),c.id);
    assert(results.every(hit=>hit.code===r.code&&hit.year===r.year&&hit.session===r.session&&hit.component===r.component&&hit.level===r.level),c.id);
  }
});

test('Chinese topic searches also cover biology, economics and accounting',()=>{
  for(const [query,code,term] of [['渗透','0610','osmosis'],['机会成本','0455','opportunity'],['折旧','0452','depreciation']]){
    const results=search(index,query,{code});
    assert(results.length>0,query);
    assert(results.some(r=>normalize(r.text).includes(term)),query);
  }
});
