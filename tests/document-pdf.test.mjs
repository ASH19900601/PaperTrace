import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pdfTextLines,pdfPageQuestions,combinePageQuestions} from '../dist/document-recognition.mjs';
import '../dist/vendor/compat.mjs';
globalThis.DOMMatrix??=class{};
Promise.try??=((fn,...args)=>new Promise(resolve=>resolve(fn(...args))));
const pdfjs=await import('../dist/vendor/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc=new URL('../dist/vendor/pdf-worker.mjs',import.meta.url).href;
async function questions(name){
 const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(new URL('./fixtures/'+name,import.meta.url)))}).promise,pages=[];
 try{for(let n=1;n<=doc.numPages;n++){
  const page=await doc.getPage(n),v=page.getViewport({scale:1});
  const lines=pdfTextLines((await page.getTextContent()).items,v,pdfjs.Util.transform);
  pages.push({questions:pdfPageQuestions(lines,n,v.width,v.height)});
 }return combinePageQuestions(pages)}finally{await doc.destroy()}
}
test('whole chemistry PDF yields 40 questions, omits cover, copyright and periodic table',async()=>{
 const q=await questions('0620_s24_qp_21.pdf');
 assert.deepEqual(q.map(q=>q.number),Array.from({length:40},(_,i)=>i+1));
 assert.equal(q[0].page,2);assert.equal(q.at(-1).endPage,14);
 assert.match(q[3].searchText,/1 The centre of an atom/);
 assert(!q[0].searchText.includes('ice and water'));
});
test('whole physics PDF joins continued parts and omits reference pages',async()=>{
 const q=await questions('9702_s24_qp_22.pdf');
 assert.deepEqual(q.map(q=>q.number),[1,2,3,4,5,6,7]);
 assert.equal(q[1].page,6);assert.equal(q[1].endPage,7);
 assert.match(q[1].searchText,/skydiver/);assert.match(q[1].searchText,/68\s?kg/);
 assert(!q[1].searchText.includes('Lightning'));
 assert(!q.at(-1).searchText.includes('publisher will'));
 assert(!q.at(-1).searchText.includes('Copyright Acknowledgements'));
});
