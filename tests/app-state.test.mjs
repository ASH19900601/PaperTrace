import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as imports from '../dist/import-utils.mjs';
import * as scope from '../dist/subject-scope.mjs';
import * as readability from '../dist/readability.mjs';
import {normalize,tokens} from '../dist/search.mjs';

function harness(fetch,storage=new Map()) {
  const elements=new Map(), searches=[];
  const element=key=>{
    if(!elements.has(key))elements.set(key,{value:'',textContent:'',innerHTML:'',hidden:false,disabled:false,dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},getContext(){return{}},setAttribute(){},insertAdjacentHTML(){}});
    return elements.get(key);
  };
  class Worker {
    postMessage(message){if(message.type==='build')queueMicrotask(()=>this.onmessage({data:{id:message.id,ok:true}}));else searches.push({message,reply:results=>this.onmessage({data:{id:message.id,ok:true,results}})});}
    terminate(){}
  }
  const context=vm.createContext({...imports,...readability,...scope,normalize,tokens,fetch,Worker,URL,Map,Set,Promise,performance,console,localStorage:{getItem(k){return storage.get(k)??null},setItem(k,v){storage.set(k,v)}},document:{querySelector:element,querySelectorAll(){return[]},addEventListener(){}},window:{scrollTo(){}},history:{replaceState(){}},location:{hash:'',href:'http://localhost/'},setTimeout(){return 0},clearTimeout(){}});
  const source=fs.readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('import.meta.url',JSON.stringify(new URL('../dist/app.mjs',import.meta.url).href)).replace(/initialize\(\);\s*$/,'globalThis.api={state,initialize,runSearch,rebuild,changeScope,setView};');
  vm.runInContext(source,context);
  return {...context.api,element,searches};
}
const record={id:'4024_s24_qp_12-q1',paperId:'4024_s24_qp_12',code:'4024',year:2024,session:'s',component:'12',question:1,page:2,endPage:2,msPage:null,text:'A distinctive mathematical problem'};
test('one missing subject shard does not disable the other searchable subjects',async()=>{
  const manifest={subjects:[{code:'4024',name:'Mathematics',nameZh:'数学',level:'O Level'},{code:'9702',level:'AS & A Level'}],papers:[{id:record.paperId,code:'4024',year:2024,questions:1},{id:'9702_s24_qp_22',code:'9702'}]};
  const app=harness(async url=>({ok:url!=='data/9702.json',json:async()=>url==='data/manifest.json'?manifest:[record]}));
  await app.initialize();
  assert.equal(app.state.ready,true);
  assert.equal(app.state.records.length,1);
  assert.equal(app.state.records[0].level,'O Level');
  assert.equal(app.state.papers.size,1);
  assert.equal(app.state.loadWarnings.join(','),'9702');
  assert.match(app.element('#corpusNote').textContent,/未加载科目：9702/);
  assert.equal(app.state.scopedRecords.length,0);
  app.changeScope({mode:'all'});
  assert.match(app.element('#levelTabs').innerHTML,/O Level/);
  assert.equal(app.state.scopedRecords.length,1);
});
test('clearing a query invalidates an earlier asynchronous search response',async()=>{
  const app=harness();app.state.ready=true;
  app.element('#query').value='skydiver aircraft';
  const searching=app.runSearch();
  app.element('#query').value='';await app.runSearch();
  app.searches[0].reply([record]);await searching;
  assert.equal(app.state.query,'');
  assert.equal(app.state.results.length,0);
  assert.equal(app.element('#resultsList').innerHTML,'');
  assert.equal(app.element('#searchButton').disabled,false);
});

const physics={...record,id:'9702_s24_qp_22-q1',paperId:'9702_s24_qp_22',code:'9702'};
const ict={...record,id:'0417_s24_qp_12-q1',paperId:'0417_s24_qp_12',code:'0417'};
const scopeManifest={subjects:[{code:'9702',nameZh:'物理',level:'AS & A Level'},{code:'0417',nameZh:'ICT',level:'IGCSE'}],papers:[physics,ict].map(r=>({id:r.paperId,code:r.code,year:2024,questions:1}))};
const scopeFetch=async url=>({ok:true,json:async()=>url==='data/manifest.json'?structuredClone(scopeManifest):url==='data/9702.json'?[physics]:[ict]});
test('default scope restricts worker requests, library cards and paper table together',async()=>{
 const app=harness(scopeFetch);await app.initialize();app.setView('library');
 assert.equal(app.state.scopedCodes.join(','),'9702');
 assert.match(app.element('#subjectGrid').innerHTML,/物理/);assert.doesNotMatch(app.element('#subjectGrid').innerHTML,/ICT/);
 assert.doesNotMatch(app.element('#paperTable').innerHTML,/0417_s24/);
 app.element('#query').value='distinctive mathematical';const run=app.runSearch();
 assert.equal(app.searches[0].message.filters.codes.join(','),'9702');app.searches[0].reply([physics]);await run;
});
test('opt-in expansion persists across reload and restore clears an incompatible subject filter',async()=>{
 const storage=new Map(),app=harness(scopeFetch,storage);await app.initialize();
 app.changeScope({mode:'scie',extraCodes:['0417']});app.setView('library');
 assert.match(app.element('#subjectGrid').innerHTML,/已加入的额外科目/);assert.match(app.element('#paperTable').innerHTML,/0417_s24/);
 assert(app.element('#subjectGrid').innerHTML.indexOf('物理')<app.element('#subjectGrid').innerHTML.indexOf('ICT'));
 const reload=harness(scopeFetch,storage);await reload.initialize();assert(reload.state.scopedCodes.includes('0417'));
 reload.element('#subjectFilter').value='0417';reload.state.level='IGCSE';reload.changeScope({mode:'scie'});
 assert.equal(reload.element('#subjectFilter').value,'');assert.equal(reload.state.level,'');assert.equal(reload.state.scopedCodes.join(','),'9702');
});
test('scope changes rerun active searches and discard responses from the previous scope',async()=>{
 const app=harness(scopeFetch);await app.initialize();app.element('#query').value='distinctive mathematical';const pending=app.runSearch();
 app.changeScope({mode:'all'});assert.equal(app.searches.length,2);assert(app.searches[1].message.filters.codes.includes('0417'));
 app.searches[1].reply([physics,ict]);await Promise.resolve();app.searches[0].reply([physics]);await pending;
 assert.equal(app.state.results.length,2);
});
