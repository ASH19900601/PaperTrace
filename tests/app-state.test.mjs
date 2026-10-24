import * as corpus from '../dist/corpus-loader.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as imports from '../dist/import-utils.mjs';
import * as scope from '../dist/subject-scope.mjs';
import * as readability from '../dist/readability.mjs';
import {normalize,tokens} from '../dist/search.mjs';
import * as llm from '../dist/llm-ocr.mjs';

function harness(fetch,storage=new Map()) {
  const elements=new Map(), searches=[];
  const element=key=>{
    if(!elements.has(key))elements.set(key,{value:'',textContent:'',innerHTML:'',hidden:false,disabled:false,dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},getContext(){return{}},setAttribute(){},insertAdjacentHTML(){}});
    return elements.get(key);
  };
  class Worker {
    postMessage(message){if(['build','append'].includes(message.type))queueMicrotask(()=>this.onmessage({data:{id:message.id,ok:true}}));else searches.push({message,reply:results=>this.onmessage({data:{id:message.id,ok:true,results}})});}
    terminate(){}
  }
  const context=vm.createContext({...corpus,...imports,...readability,...scope,...llm,AbortController,CSS:{escape:s=>s},PaperPreview:class{show(){return Promise.resolve()}clear(){}},normalize,tokens,fetch,Worker,URL,Map,Set,Promise,performance,console,localStorage:{getItem(k){return storage.get(k)??null},setItem(k,v){storage.set(k,v)}},document:{querySelector:element,querySelectorAll(){return[]},addEventListener(){}},window:{scrollTo(){}},history:{replaceState(){}},location:{hash:'',href:'http://localhost/'},setTimeout(){return 0},clearTimeout(){}});
  const source=fs.readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('import.meta.url',JSON.stringify(new URL('../dist/app.mjs',import.meta.url).href)).replace(/initialize\(\);\s*$/,'globalThis.api={state,initialize,runSearch,rebuild,changeScope,setView,applyRecognition,setRecognition:job=>activeRecognition=job};');
  vm.runInContext(source,context);
  return {...context.api,element,searches};
}
const record={id:'4024_s24_qp_12-q1',paperId:'4024_s24_qp_12',code:'4024',year:2024,session:'s',component:'12',question:1,page:2,endPage:2,msPage:null,text:'A distinctive mathematical problem'};
test('one missing subject shard does not disable the other searchable subjects',async()=>{
  const manifest={subjects:[{code:'4024',name:'Mathematics',nameZh:'数学',level:'O Level'},{code:'9702',level:'AS & A Level'}],papers:[{id:record.paperId,code:'4024',year:2024,questions:1},{id:'9702_s24_qp_22',code:'9702'}]};
  const app=harness(async url=>({ok:!url.startsWith('data/9702.json'),json:async()=>url==='data/manifest.json'?manifest:[record]}));
  await app.initialize();
  await app.changeScope({mode:'all'});
  assert.equal(app.state.ready,true);
  assert.equal(app.state.records.length,1);
  assert.equal(app.state.records[0].level,'O Level');
  assert.equal(app.state.papers.size,2);
  assert.equal(app.state.loadWarnings.join(','),'9702');
  assert.match(app.element('#corpusNote').textContent,/未加载科目：9702/);
  assert.equal(app.state.scopedRecords.length,1);
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
const scopeFetch=async url=>({ok:true,json:async()=>url==='data/manifest.json'?structuredClone(scopeManifest):url.startsWith('data/9702.json')?[physics]:[ict]});
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
 await app.changeScope({mode:'scie',extraCodes:['0417']});app.setView('library');
 assert.match(app.element('#subjectGrid').innerHTML,/已加入的额外科目/);assert.match(app.element('#paperTable').innerHTML,/0417_s24/);
 assert(app.element('#subjectGrid').innerHTML.indexOf('物理')<app.element('#subjectGrid').innerHTML.indexOf('ICT'));
 const reload=harness(scopeFetch,storage);await reload.initialize();assert(reload.state.scopedCodes.includes('0417'));
 reload.element('#subjectFilter').value='0417';reload.state.level='IGCSE';reload.changeScope({mode:'scie'});
 assert.equal(reload.element('#subjectFilter').value,'');assert.equal(reload.state.level,'');assert.equal(reload.state.scopedCodes.join(','),'9702');
});
test('scope changes rerun active searches and discard responses from the previous scope',async()=>{
 const app=harness(scopeFetch);await app.initialize();app.element('#query').value='distinctive mathematical';const pending=app.runSearch();
 await app.changeScope({mode:'all'});assert(app.searches.length>=2);assert(app.searches[1].message.filters.codes.includes('0417'));
 app.searches.at(-1).reply([physics,ict]);await Promise.resolve();app.searches[0].reply([physics]);await pending;
 assert.equal(app.state.results.length,2);
});


test('first subject is searchable while a slower common subject is still downloading',async()=>{
 let finish;const slow=new Promise(resolve=>{finish=resolve});const calls=[];
 const manifest={subjects:[{code:'9702',level:'AS & A Level'},{code:'9701',level:'AS & A Level'},{code:'0417',level:'IGCSE'}],papers:[{id:physics.paperId,code:'9702',questions:1},{id:'9701_s24_qp_22',code:'9701',questions:1},{id:ict.paperId,code:'0417',questions:1}]};
 const app=harness(async url=>{calls.push(url);return {ok:true,json:async()=>url==='data/manifest.json'?manifest:url.startsWith('data/9701.json')?slow:url.startsWith('data/9702.json')?[physics]:[]}});
 const initializing=app.initialize();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(app.state.ready,true);assert.equal(app.state.records.length,1);assert(!calls.some(url=>url.startsWith('data/0417.json')));
 app.element('#query').value='distinctive mathematical';const run=app.runSearch();app.searches[0].reply([physics]);await run;assert.equal(app.state.results.length,1);
 finish([]);await initializing;
});


test('photo search retains hidden OCR noise while rendering only readable prose',async()=>{
 const physics={...record,id:'9702_s24_qp_22-q2',paperId:'9702_s24_qp_22',code:'9702'};
 const manifest={subjects:[{code:'9702',level:'AS & A Level'}],papers:[{id:physics.paperId,code:'9702',year:2024,questions:1}]};
 const app=harness(async url=>({ok:true,json:async()=>url==='data/manifest.json'?manifest:[physics]}));await app.initialize();
 const raw='A small aircraft is flying horizontally.\nSRE Ce z\n63m z\n[a]\nFig. 1.1';
 const job={results:{ocr:{text:raw,ms:1000}}};app.setRecognition(job);app.applyRecognition(job,'ocr');
 assert.equal(app.searches.at(-1).message.query,raw);
 assert(!app.element('#ocrReadable').innerHTML.includes('SRE'));
 assert(!app.element('#query').value.includes('SRE'));
 app.searches.at(-1).reply([physics]);await new Promise(resolve=>setImmediate(resolve));
 const html=app.element('#resultsList').innerHTML;
 assert(html.indexOf('data-preview-pane="'+physics.id+'"')<html.indexOf('</article>'));
 assert(html.includes('data-preview="'+physics.id+'"'));
});
