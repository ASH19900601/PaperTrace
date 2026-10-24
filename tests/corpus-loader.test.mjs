import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CorpusLoader,prioritizeSubjects} from '../dist/corpus-loader.mjs';
import {makeIndex,appendIndex,search} from '../dist/search.mjs';

test('physics, chemistry, biology and mathematics start ahead of other subjects',()=>{
  assert.deepEqual(prioritizeSubjects(['9695','9709','9700','9701','9702','0625']),['9702','9701','9700','9709','0625','9695']);
});
function memoryCache(){
  const data=new Map();
  return {data,transaction(){return {objectStore(){return {
    get(key){const req={};queueMicrotask(()=>{req.result=data.get(key);req.onsuccess()});return req},
    put(value,key){data.set(key,value)}
  }}}}};
}
test('reopening reuses persisted subjects and a new corpus version fetches fresh data',async()=>{
  const cache=memoryCache(),calls=[],fetcher=async url=>{calls.push(url);return {ok:true,json:async()=>[{id:'q1',text:'question'}]}};
  const first=new CorpusLoader({updatedAt:'v1'},{cache,fetcher});
  await Promise.all([first.load('9702'),first.load('9702')]);assert.equal(calls.length,1);
  const reopened=new CorpusLoader({updatedAt:'v1'},{cache,fetcher});await reopened.load('9702');assert.equal(calls.length,1);assert(reopened.cached.has('9702'));
  await new CorpusLoader({updatedAt:'v2'},{cache,fetcher}).load('9702');assert.equal(calls.length,2);assert.match(calls[1],/v=v2/);
});
test('storage errors leave network loading available and failed downloads can retry',async()=>{
  let calls=0;const loader=new CorpusLoader({updatedAt:'v1'},{cache:{transaction(){throw Error('storage blocked')}},fetcher:async()=>({ok:++calls>1,json:async()=>[]})});
  await assert.rejects(loader.load('9702'));assert.deepEqual(await loader.load('9702'),[]);
});
test('incremental indexing preserves complete index rankings and statistics',()=>{
  const records=Array.from({length:60},(_,i)=>({id:'q'+i,code:i%2?'9702':'9701',text:i%3?'A skydiver accelerates through air with terminal velocity':'Chemical equilibrium temperature concentration',year:2024}));
  const whole=makeIndex(records),part=makeIndex(records.slice(0,8));appendIndex(part,records.slice(8,29));appendIndex(part,records.slice(29));
  assert.deepEqual(part.df,whole.df);assert(Math.abs(part.avg-whole.avg)<1e-10);
  for(const query of ['terminal velocity','equilibrium concentration']){
    const a=search(whole,query),b=search(part,query);assert.deepEqual(b.map(r=>r.id),a.map(r=>r.id));assert(Math.abs(a[0].score-b[0].score)<1e-10);
  }
});

test('native fetch is called without a class receiver',async()=>{
 const loader=new CorpusLoader({updatedAt:'v1'},{fetcher:function(){assert.equal(this,undefined);return Promise.resolve({ok:true,json:async()=>[]})}});
 assert.deepEqual(await loader.load('9702'),[]);
});
