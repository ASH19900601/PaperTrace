import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileMetadata,pdfTextRows,splitPDF,mapMS,validateImportedIndex} from '../dist/import-utils.mjs';
import '../dist/vendor/compat.mjs';

test('ICT practical QP 02 and MS 2 share their import identity',()=>{
 assert.equal(fileMetadata('0417_w20_qp_02.pdf').id,'0417_w20_qp_02');
 assert.equal(fileMetadata('0417_w20_ms_2.pdf').id,'0417_w20_qp_02');
});

// PDF.js's browser build initializes this unused rendering matrix at import.
// These tests perform real PDF text extraction; they never render a canvas.
globalThis.DOMMatrix??=class {};
Promise.try??=((fn,...args)=>new Promise(resolve=>resolve(fn(...args))));
const pdfjs=await import('../dist/vendor/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc=new URL('../dist/vendor/pdf-worker.mjs',import.meta.url).href;
async function readPDF(name) {
  const data=new Uint8Array(fs.readFileSync(new URL('./fixtures/'+name,import.meta.url)));
  const doc=await pdfjs.getDocument({data}).promise;
  try {
    const pages=[];
    for(let n=1;n<=doc.numPages;n++) {
      const page=await doc.getPage(n);
      pages.push(pdfTextRows((await page.getTextContent()).items,page.getViewport({scale:1}),pdfjs.Util.transform));
    }
    return pages;
  } finally {await doc.destroy();}
}

test('PDF.js import preserves real physics questions and QP/MS pages',async()=>{
  const name='9702_s24_qp_22.pdf';
  const records=splitPDF(await readPDF(name),fileMetadata(name));
  assert.deepEqual(records.map(r=>r.question),[1,2,3,4,5,6,7]);
  assert.equal(records[1].page,6);
  assert.match(records[1].text,/skydiver/i);
  assert.deepEqual(mapMS(await readPDF('9702_s24_ms_22.pdf'),records).map(r=>r.msPage),[6,7,8,10,11,12,12]);
});
test('PDF.js import preserves all 40 MCQ questions and their stems',async()=>{
  const name='0620_s24_qp_21.pdf';
  const records=splitPDF(await readPDF(name),fileMetadata(name));
  assert.deepEqual(records.map(r=>r.question),Array.from({length:40},(_,i)=>i+1));
  assert.match(records[8].text,/ammonia/i);
});

test('an officially withdrawn Q22 does not hide Q23 to Q30',async()=>{
 const name='0455_w21_qp_12.pdf';
 const records=splitPDF(await readPDF(name),fileMetadata(name));
 assert.deepEqual(records.map(r=>r.question),Array.from({length:30},(_,i)=>i+1).filter(q=>q!==22));
 assert.equal(records.find(r=>r.question===23).page,9);
});

test('source material explicitly introduces unnumbered Q1',async()=>{
 const name='0455_w21_qp_22.pdf';
 const records=splitPDF(await readPDF(name),fileMetadata(name));
 assert.deepEqual(records.map(r=>r.question),[1,2,3,4,5]);
 assert.deepEqual(records.map(r=>r.page),[2,4,4,4,5]);
});

test('a small typesetting shift still imports every accounting MCQ',async()=>{
 const name='0452_w25_qp_12.pdf';
 const records=splitPDF(await readPDF(name),fileMetadata(name));
 assert.deepEqual(records.map(r=>r.question),Array.from({length:35},(_,i)=>i+1));
 assert.equal(records[28].page,10);
});

test('code and spreadsheet row numbers do not create main questions',async()=>{
 for(const [name,count] of Object.entries({'0417_w21_qp_11.pdf':13,'9608_w19_qp_12.pdf':6,'0478_m22_qp_22.pdf':5,'0620_s21_qp_61.pdf':4,'0620_s26_qp_63.pdf':4})){
  const records=splitPDF(await readPDF(name),fileMetadata(name));
  assert.deepEqual(records.map(r=>r.question),Array.from({length:count},(_,i)=>i+1),name);
 }
});

test('legitimate main-question font changes remain searchable',async()=>{
 for(const [name,count] of [['0452_s24_qp_12.pdf',35],['0455_m23_qp_12.pdf',30]]){
  const records=splitPDF(await readPDF(name),fileMetadata(name));
  assert.deepEqual(records.map(r=>r.question),Array.from({length:count},(_,i)=>i+1),name);
 }
});
test('PDF.js import handles short mathematics and older chemistry layouts',async()=>{
  const math='9709_m24_qp_12.pdf',chem='9701_m20_qp_52.pdf';
  const maths=splitPDF(await readPDF(math),fileMetadata(math));
  assert.equal(maths[0].question,1);
  assert.match(maths[0].text,/exact value/i);
  const chemistry=splitPDF(await readPDF(chem),fileMetadata(chem));
  assert.deepEqual(chemistry.map(r=>r.question),[1,2]);
  assert.match(chemistry[0].text,/Brass/);
});

test('biology table entries are not mistaken for later main questions during local import',async()=>{
  const first='9700_s24_qp_51.pdf',second='9700_s24_qp_53.pdf';
  const a=splitPDF(await readPDF(first),fileMetadata(first));
  assert.deepEqual(a.map(r=>r.question),[1,2,3]);
  assert.equal(a[2].page,14);
  assert.match(a[2].text,/Female mosquitoes/);
  const b=splitPDF(await readPDF(second),fileMetadata(second));
  assert.deepEqual(b.map(r=>r.question),[1,2]);
  assert.equal(b[1].page,7);
  assert.match(b[1].text,/Complete Table 2.3/);
});
test('real MCQ mark scheme maps all 40 entries and its continuation page',async()=>{
  const records=Array.from({length:40},(_,i)=>({question:i+1,msPage:99}));
  const mapped=mapMS(await readPDF('9701_m24_ms_12.pdf'),records);
  assert.equal(mapped[0].msPage,2);
  assert.equal(mapped[39].msPage,3);
  assert(mapped.every(r=>r.msPage===2||r.msPage===3));
  assert.equal(mapMS([],records)[0].msPage,null,'a new MS must not retain stale page offsets');
});
test('mark scheme mapping preserves parallel Question / Answer columns',()=>{
  const row=(y,parts)=>({x:parts[0][0],y,text:parts.map(p=>p[1]).join(' '),parts:parts.map(([x,text])=>({x,y,text}))});
  const pages=[[],[row(100,[[40,'Question'],[130,'Answer'],[280,'Question'],[370,'Answer']]),row(130,[[40,'1'],[130,'A'],[280,'21'],[370,'B']])]];
  assert.deepEqual(mapMS(pages,[{question:1},{question:21}]).map(r=>r.msPage),[2,2]);
});

function sampleIndex() {
  const paper={...fileMetadata('9702_s24_qp_22.pdf'),pages:16};
  const record={id:paper.id+'-q2',paperId:paper.id,code:paper.code,year:paper.year,session:paper.session,component:paper.component,question:2,page:6,endPage:7,msPage:7,text:'A skydiver jumps from an aircraft.'};
  return {format:'papertrace-index-v1',papers:[paper],records:[record]};
}
test('JSON index validates source identity, page bounds and duplicate records',()=>{
  assert.equal(validateImportedIndex(sampleIndex()).records.length,1);
  for (const mutate of [d=>d.records[0].code='9701',d=>d.records[0].endPage=17,d=>d.records[0].id='other',d=>d.records.push({...d.records[0]}),d=>d.papers.push({...d.papers[0]})]) {
    const data=sampleIndex(); mutate(data); assert.throws(()=>validateImportedIndex(data));
  }
});
