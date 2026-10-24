import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeIndex,search,normalize} from '../dist/search.mjs';
const manifest=JSON.parse(fs.readFileSync(new URL('../dist/data/manifest.json',import.meta.url)));
const records=manifest.subjects.flatMap(s=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+s.code+'.json',import.meta.url))));
const index=makeIndex(records);
test('distinctive real sentence recovers paper and question',()=>{const results=search(index,'A skydiver jumps from an aircraft at time t = 0 and falls vertically downwards');assert.equal(results[0].id,'9702_s24_qp_22-q2');assert.equal(results[0].page,6)});
test('filename plus question is deterministic',()=>{const rs=search(index,'9702_s24_qp_22 Q2');assert.equal(rs.length,1);assert.equal(rs[0].id,'9702_s24_qp_22-q2')});
test('source IDs and common question-number spelling variants are deterministic',()=>{
 for(const suffix of ['Q 2','Question: 2','Question #2','q. 2','第 2 题','-q2','Ｑ２']){
  const rs=search(index,'9702_s24_qp_22'+(suffix.startsWith('-')?'':' ')+suffix);
  assert.deepEqual(rs.map(r=>r.id),['9702_s24_qp_22-q2'],suffix);
 }
 assert.equal(search(index,'9702_s24_qp_22 Q99').length,0);
});
test('mark-scheme filenames find the corresponding source question, never unrelated vocabulary',()=>{
 assert.deepEqual(search(index,'9702_s24_ms_22.pdf Q2').map(r=>r.id),['9702_s24_qp_22-q2']);
 assert.equal(search(index,'9999_s24_ms_22.pdf Q2').length,0);
});
test('printed PDF reference supports all three exam sessions',()=>{
 for(const [query,id] of [['9702/22/M/J/24 Q2','9702_s24_qp_22-q2'],['9709 / 12 / F / M / 24 Question 2','9709_m24_qp_12-q2'],['9702/22/O/N/24 Q2','9702_w24_qp_22-q2']]){
  assert.deepEqual(search(index,query).map(r=>r.id),[id],query);
 }
});

test('ICT practical MS 2 resolves to QP 02',()=>{
 const local=makeIndex([{id:'0417_w20_qp_02-q1',paperId:'0417_w20_qp_02',code:'0417',year:2020,session:'w',component:'02',question:1,text:'Practical document production'}]);
 assert.deepEqual(search(local,'0417_w20_ms_2.pdf Q1').map(r=>r.id),['0417_w20_qp_02-q1']);
});
test('a whole paper is sorted by numeric main-question order',()=>{
 assert.deepEqual(search(index,'0620_s24_qp_21').map(r=>r.question),Array.from({length:40},(_,i)=>i+1));
});
test('OCR text with a printed paper header still ranks the question text',()=>{
 const rs=search(index,'6\n9702/22/M/J/24\nA skydiver jumps from an aircraft at time t = 0 and falls vertically downwards');
 assert.equal(rs[0].id,'9702_s24_qp_22-q2');
 assert(rs.every(r=>r.paperId==='9702_s24_qp_22'));
});
test('subject, year, session, component and level filters apply together',()=>{const rs=search(index,'diffraction grating',{code:'9702',year:'2024',session:'s',component:'22',level:'AS & A Level'});assert(rs.some(r=>r.question===6));assert(rs.every(r=>r.code==='9702'&&r.year===2024&&r.session==='s'&&r.component==='22'));assert.equal(search(index,'9702_s24_qp_22 Q2',{level:'IGCSE'}).length,0)});
test('nonexistent vocabulary gives no fabricated source',()=>assert.equal(search(index,'zzxqvnotaword zzxqvsecondword').length,0));
test('Chinese topic alias finds English source text',()=>assert(search(index,'光栅').some(r=>r.code==='9702')));
test('explicit qualification metadata overrides a syllabus-code prefix guess',()=>{
 const base=records.find(r=>r.id==='9702_s24_qp_22-q2');
 const local=makeIndex([{...base,id:'local-igcse',code:'1234',level:'IGCSE'},{...base,id:'local-alevel',code:'0123',level:'AS & A Level'}]);
 assert.deepEqual(search(local,'skydiver',{level:'IGCSE'}).map(r=>r.id),['local-igcse']);
 assert.deepEqual(search(local,'skydiver',{level:'AS & A Level'}).map(r=>r.id),['local-alevel']);
});
test('normalization handles typographical symbols',()=>assert.equal(normalize('Kelvin’s  10−2'),'kelvin s 10 2'));
test('every question refers to a real manifest paper and valid page',()=>{const ps=new Map(manifest.papers.map(p=>[p.id,p]));assert.equal(new Set(records.map(r=>r.id)).size,records.length);for(const r of records){const p=ps.get(r.paperId);assert(p,r.id);assert(r.page>=2&&r.page<=p.pages,r.id);assert(r.endPage>=r.page&&r.endPage<=p.pages,r.id);assert.equal(r.code,p.code);assert(r.text.length>=8,r.id);assert(!r.msPage||r.msPage>=2,r.id)}});
test('manifest totals reflect actual records',()=>{assert.equal(records.length,manifest.stats.questions);for(const s of manifest.subjects)assert.equal(records.filter(r=>r.code===s.code).length,s.questions)});
