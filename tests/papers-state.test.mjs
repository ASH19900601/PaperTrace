import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as core from '../dist/papers-core.mjs';
import {isScieSubject} from '../dist/subject-scope.mjs';

const resources=JSON.parse(fs.readFileSync(new URL('../dist/data/downloads/9702.json',import.meta.url),'utf8')).files.filter(r=>['9702_s24_qp_22.pdf','9702_s24_ms_22.pdf'].includes(r.name));
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r});return{promise,resolve}}
const response=data=>({ok:true,json:async()=>data});
const pdfResponse=()=>({ok:true,arrayBuffer:async()=>new TextEncoder().encode('%PDF-1.7\nfixture').buffer});
function harness(fetch,{pdfLibrary}={}){
  const elements=new Map(),downloads=[];
  const element=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',hidden:false,disabled:false,open:false,style:{},classList:{add(){},remove(){},toggle(){}},listeners:{},addEventListener(name,handler){this.listeners[name]=handler},showModal(){this.open=true},close(){this.open=false;this.listeners.close?.()},getContext(){return{}}});return elements.get(id)};
  const context=vm.createContext({...core,isScieSubject,fetch,downloads,pdfLibrary,URL,URLSearchParams,AbortController,TextEncoder,TextDecoder,Uint8Array,Blob,CSS:{escape:s=>s},location:{search:'',href:'http://localhost/papers.html'},localStorage:{getItem(){return null}},document:{getElementById:element,querySelector:element,querySelectorAll(){return[]}},setTimeout(){return 0},clearTimeout(){},console});
  const source=fs.readFileSync(new URL('../dist/papers.mjs',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace("import('./vendor/pdf.mjs')",'Promise.resolve(pdfLibrary)').replace(/void initialize\(\);\s*$/,'saveBlob=(blob,name)=>downloads.push({blob,name}); globalThis.api={batch,loadSubject,openPreview,state,selections,setData:data=>{index=data},setFiles:rows=>{files=rows;filtered=rows}};');
  vm.runInContext(source,context);
  return{...context.api,element,downloads};
}

test('double clicking a pair while server configuration is loading starts one download job',async()=>{
  const config=deferred(),pending=[];
  const app=harness(url=>url==='api/config'?config.promise:new Promise(resolve=>pending.push(resolve)));
  const first=app.batch('zip',resources),second=app.batch('zip',resources);
  config.resolve(response({downloads:true}));await new Promise(resolve=>setImmediate(resolve));
  assert.equal(pending.length,2,'only the two PDFs in one pair should be requested');
  for(const finish of pending)finish(pdfResponse());
  await Promise.all([first,second]);
  assert.equal(app.downloads.length,1);
});

test('changing subject during a download retains the original subject in its ZIP filename',async()=>{
  const pending=[];
  const app=harness(url=>url==='api/config'?Promise.resolve(response({downloads:true})):new Promise(resolve=>pending.push(resolve)));
  const downloading=app.batch('zip',resources);await new Promise(resolve=>setImmediate(resolve));
  app.state.code='9701';
  for(const finish of pending)finish(pdfResponse());
  await downloading;
  assert.match(app.downloads[0].name,/PaperTrace-9702-/);
});

test('switching subjects clears old file selections before the next catalogue has loaded',async()=>{
  const nextSubject=deferred();
  const app=harness(url=>url==='api/config'?Promise.resolve(response({downloads:true})):nextSubject.promise);
  app.setData({subjects:[{code:'9701',version:'1'}]});app.setFiles(resources);
  app.selections.set(resources[0].id,resources[0]);app.state.code='9701';
  const loading=app.loadSubject();
  assert.equal(app.selections.size,0);
  assert.equal(app.element('dlZip').disabled,true);
  assert.equal(app.element('dlCopy').disabled,true);
  assert.equal(app.element('dlPairDownload').hidden,true);
  await new Promise(resolve=>setImmediate(resolve));
  assert.match(app.element('dlFiles').innerHTML,/正在读取本科目资料/);
  nextSubject.resolve({ok:false});await loading;
});

test('closing a PDF preview immediately cancels its pending PDF parser',async()=>{
  const loading=deferred();let destroyed=0;
  const doc={destroy:async()=>{}};
  const app=harness(url=>Promise.resolve(url==='api/config'?response({downloads:true}):pdfResponse()),{
    pdfLibrary:{GlobalWorkerOptions:{},getDocument(){return{promise:loading.promise,destroy:async()=>{destroyed++}}}},
  });
  const opening=app.openPreview(resources[0]);await new Promise(resolve=>setImmediate(resolve));
  app.element('dlPreview').close();const cancelled=destroyed;
  loading.resolve(doc);await opening;
  assert.equal(cancelled,1,'closing must stop parsing immediately, before the PDF resolves');
});

test('PDF previews supply bundled fonts for source papers with unembedded standard fonts',async()=>{
  let options;
  const doc={numPages:1,destroy:async()=>{},getPage:async()=>({getViewport:({scale})=>({width:600*scale,height:800*scale}),render:()=>({promise:Promise.resolve(),cancel(){}})})};
  const app=harness(url=>Promise.resolve(url==='api/config'?response({downloads:true}):pdfResponse()),{
    pdfLibrary:{GlobalWorkerOptions:{},getDocument(settings){options=settings;return{promise:Promise.resolve(doc),destroy:async()=>{}}}},
  });
  await app.openPreview(resources[0]);
  assert.equal(options.standardFontDataUrl,'http://localhost/vendor/standard_fonts/');
  assert.equal(app.element('dlPreviewPage').textContent,'第 1 / 1 页');
});

test('a static deployment labels link exports accurately and hides unavailable server checks',async()=>{
  const app=harness(()=>Promise.resolve({ok:false}));app.setData({subjects:[]});app.setFiles(resources);
  await new Promise(resolve=>setImmediate(resolve));
  assert.match(app.element('dlPairDownload').textContent,/导出.*链接/);
  assert.equal(app.element('dlZip').textContent,'导出所选下载链接');
  assert.equal(app.element('dlCheck').hidden,true);
  assert.equal(app.element('dlDownloadHint').hidden,false);
});
