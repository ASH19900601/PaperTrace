import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DOWNLOAD_LEVELS,preferredFiles,singlePaperFilters,availableSubjects,filterFiles,paperOptions,variantOptions,sortFiles,csvFiles,zipBlob} from '../dist/papers-core.mjs';
const root=new URL('../dist/data/downloads/',import.meta.url),read=name=>JSON.parse(fs.readFileSync(new URL(name+'.json',root),'utf8'));
const catalogue=read('index');
test('download subjects follow SCIE scope, including legacy 9608, with explicit expansion',()=>{
  const normal=availableSubjects(catalogue.subjects);assert(normal.some(s=>s.code==='9608'));assert(!normal.some(s=>s.code==='AP-PSY'));assert(!normal.some(s=>s.code==='0417'));
  assert(availableSubjects(catalogue.subjects,{extra:true}).some(s=>s.code==='0417'));
  const expanded=availableSubjects(catalogue.subjects,{extra:true});assert(expanded.every(s=>DOWNLOAD_LEVELS.includes(s.level)));
  assert(!expanded.some(s=>['8022','9844','1JA0','AQA-7582'].includes(s.code)));
  assert(availableSubjects(catalogue.subjects,{board:'Pearson Edexcel',level:'IGCSE'}).some(s=>s.code==='4EA1'));
});
test('default and legacy broad filters resolve to at most one QP and one matching MS for every downloadable subject',()=>{
  for(const subject of availableSubjects(catalogue.subjects,{extra:true})){
    const rows=preferredFiles(read(subject.code).files);
    for(const requested of [{},{years:[2024,2023],sessions:['s','w'],paper:'',variant:''}]){
      const filters=singlePaperFilters(rows,requested),results=filterFiles(rows,{...filters,types:['qp','ms']});
      assert.equal(filters.years.length,1);assert.equal(filters.sessions.length,1);assert(filters.paper);
      for(const type of ['qp','ms'])assert(results.filter(r=>r.type===type).length<=1,subject.code+' '+type);
      assert(results.length>0,subject.code);
      if(results.length===2)assert.deepEqual(results.map(r=>[r.year,r.session,r.paper,r.variant])[0],results.map(r=>[r.year,r.session,r.paper,r.variant])[1]);
    }
  }
});
test('formal Pearson mark schemes replace provisional copies within the selected paper',()=>{
  const rows=preferredFiles(read('4ET1').files),result=filterFiles(rows,{years:[2023],sessions:['j'],paper:'Paper 1',types:['qp','ms']});
  assert.equal(result.filter(r=>r.type==='ms').length,1);
  assert.equal(result.find(r=>r.type==='ms').name,'4et1-01-rms-20230302.pdf');
  const physics=preferredFiles(read('9702').files),filters=singlePaperFilters(physics,{years:[2024],sessions:['s'],paper:'2'});
  assert.equal(filters.variant,'2');assert.deepEqual(filterFiles(physics,{...filters,types:['qp','ms']}).map(r=>r.name).sort(),['9702_s24_ms_22.pdf','9702_s24_qp_22.pdf']);
});
test('CAIE separates paper and variant using published files and keeps session resources',()=>{
  const physics=read('9702').files,match=filterFiles(physics,{years:[2024],sessions:['s'],paper:'2',variant:'2',types:['qp','ms']});
  assert.deepEqual(match.map(r=>r.name).sort(),['9702_s24_ms_22.pdf','9702_s24_qp_22.pdf']);
  assert(filterFiles(physics,{years:[2024],sessions:['s'],paper:'2',variant:'2',types:['gt']}).some(r=>r.name==='9702_s24_gt.pdf'));
  assert.deepEqual(variantOptions(filterFiles(physics,{years:[2024],sessions:['m']}),'2'),['2']);
});
test('Pearson uses printed component labels; AP uses FRQ set labels',()=>{
  const japanese=paperOptions(read('1JA0').files);assert(japanese.includes('Paper 1H'));assert(!japanese.includes('21'));assert(japanese.every(p=>/^Paper [1-4][FH]?$/.test(p)));
  const english=paperOptions(read('4EA1').files);assert(english.includes('Paper 1R'));assert(!english.some(p=>p.includes('Written Paper')||p.startsWith(',')));
  const listening=filterFiles(read('1JA0').files,{paper:'Paper 1H',types:['qp','ms']});
  assert(listening.length>0);assert(listening.every(r=>/^1ja0[-_]1h[-_]/i.test(r.name)));
  assert(read('4ET1').files.find(r=>r.name==='4et1-02-rms-20260820.pdf').paper==='Paper 2');
  const ap=paperOptions(read('AP-PSY').files);assert(ap.includes('FRQ Set 1'));assert(ap.includes('FRQ Set 2'));assert.deepEqual(variantOptions(read('AP-PSY').files),[]);
});
test('every indexed file has a unique identifier and an explicit HTTPS PDF source',()=>{
  let total=0;const ids=new Set();for(const subject of catalogue.subjects){const data=read(subject.code);assert.equal(data.files.length,subject.files);for(const r of data.files){assert(!ids.has(r.id));ids.add(r.id);assert.equal(new URL(r.url).protocol,'https:');assert(new URL(r.url).pathname.toLowerCase().endsWith('.pdf'));assert.equal(r.code,subject.code);assert(r.year>=2018&&r.year<=2026);total++}}
  assert.equal(total,catalogue.files);
});
test('sorting, multi-year filters and CSV preserve actual source links',()=>{
  const rows=filterFiles(read('9702').files,{years:[2023,2024],sessions:['s'],paper:'2',variant:'2',types:['qp']});assert.equal(rows.length,2);
  assert.equal(sortFiles(rows)[0].year,2024);assert.equal(sortFiles(rows,'oldest')[0].year,2023);
  assert(csvFiles(rows).includes('9702_s24_qp_22.pdf'));assert(csvFiles(rows).includes('https://pastpapers.papacambridge.com/'));
});
test('ZIP contains distinct PDF entries, UTF-8 names and correct central directory offsets',async()=>{
  const data=new TextEncoder().encode('%PDF-1.7\nexample'),blob=zipBlob([{name:'paper.pdf',bytes:data},{name:'paper.pdf',bytes:data},{name:'未完成下载.txt',bytes:new TextEncoder().encode('retry')}]);
  const bytes=new Uint8Array(await blob.arrayBuffer()),view=new DataView(bytes.buffer),end=bytes.length-22;
  assert.equal(view.getUint32(0,true),0x04034b50);assert.equal(view.getUint32(end,true),0x06054b50);assert.equal(view.getUint16(end+10,true),3);
  const central=view.getUint32(end+16,true);assert.equal(view.getUint32(central,true),0x02014b50);assert(new TextDecoder().decode(bytes).includes('2_paper.pdf'));
});
