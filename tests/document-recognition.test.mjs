import {test} from 'node:test';
import assert from 'node:assert/strict';
import {splitRecognizedQuestions,combinePageQuestions,nativeTextUsable,requestFastOCR} from '../dist/document-recognition.mjs';

test('separates multiple numbered questions without splitting decimals, parts or table values',()=>{
  const text='1 A gas is heated. The pressure is kept constant.\n(a) Explain what happens to the particles.\n2.0 kg\n2 A mixture of ice and water is left to stand.\nWhich row describes the changes?\n3 Hydrogen chloride gas is released in the apparatus.\nCalculate the time taken.';
  const questions=splitRecognizedQuestions(text);
  assert.deepEqual(questions.map(q=>q.number),[1,2,3]);
  assert.match(questions[0].searchText,/2\.0kg/);assert.match(questions[0].searchText,/^1 A gas/);assert(!questions[0].searchText.includes('mixture'));
});
test('layout joins detached question numbers and ignores page headers and centered figure labels',()=>{
  const lines=[{text:'2',x:290,y:10,width:15,height:15},
    {text:'1',x:48,y:62,width:12,height:14},{text:'A gas is heated at constant pressure.',x:70,y:62,width:260,height:14},
    {text:'26',x:240,y:140,width:30,height:14},{text:'An arrow inside the diagram',x:200,y:160,width:220,height:14},
    {text:'2',x:48,y:240,width:12,height:14},{text:'The ice is melting in a warm room.',x:70,y:240,width:260,height:14}];
  const q=splitRecognizedQuestions('',{lines,width:600,height:840});
  assert.deepEqual(q.map(q=>q.number),[1,2]);assert.match(q[0].text,/gas is heated/);
});
test('low-confidence debris is retained for matching but hidden from readable text',()=>{
  const q=splitRecognizedQuestions('',{lines:[
    {text:'1 A small aircraft is flying horizontally.',confidence:.98,x:50,y:50,width:320,height:15},
    {text:'alphabet soup fragments invented rubbish',confidence:.2,x:50,y:80,width:320,height:15},
    {text:'Calculate the time taken to reach the ground.',confidence:.99,x:50,y:110,width:320,height:15}]});
  assert.match(q[0].searchText,/alphabet soup/);assert(!q[0].text.includes('alphabet soup'));
});
test('indented numbered statements remain inside the main question',()=>{
  const lines=[{text:'4 Which statements about diffusion are correct?',x:49,y:60,height:12,width:400},
    {text:'1 The particles move randomly in all directions.',x:120,y:95,height:12,width:380},
    {text:'2 The particles have kinetic energy.',x:120,y:120,height:12,width:380},
    {text:'5 Which method separates these substances?',x:49,y:260,height:12,width:400}];
  const q=splitRecognizedQuestions('',{lines,width:595,height:842});
  assert.deepEqual(q.map(q=>q.number),[4,5]);assert.match(q[0].searchText,/2 The particles/);
});
test('native PDF text is preferred and broken text layers require OCR',()=>{
  assert(nativeTextUsable([{text:'A small aircraft travels horizontally above the ground at a constant speed.'}]));
  assert(!nativeTextUsable([{text:'\ufffd'.repeat(40)}]));assert(!nativeTextUsable([]));
});
test('multi-page continuation stays with its question while a new question gets its own entry',()=>{
  const q=combinePageQuestions([{questions:[{number:1,page:2,endPage:2,text:'First question',searchText:'First question'}]},
    {questions:[{number:null,page:3,endPage:3,text:'Continued part',searchText:'Continued part'},{number:2,page:3,endPage:3,text:'Second question',searchText:'Second question'}]}]);
  assert.equal(q.length,2);assert.equal(q[0].endPage,3);assert.match(q[0].text,/Continued part/);
});
test('fast OCR accepts structured results and propagates cancellation',async()=>{
  let request;
  const result=await requestFastOCR('image',{fetcher:async(url,init)=>{request={url,init};return {ok:true,json:async()=>({text:'The skydiver falls.',lines:[]})}}});
  assert.equal(request.url,'api/vision-ocr');assert.equal(result.text,'The skydiver falls.');
  const controller=new AbortController();controller.abort();
  await assert.rejects(requestFastOCR('image',{signal:controller.signal,fetcher:async(_,init)=>{assert(init.signal.aborted);throw new Error('cancelled')}}),/cancelled/);
});

test('two columns keep independent numbered questions in reading order',()=>{
 const lines=[{text:'1 A gas is heated at constant pressure.',x:40,y:100,width:390,height:20},
 {text:'2 Which particles move more quickly?',x:40,y:240,width:360,height:20},
 {text:'3 The concentration is increased.',x:630,y:100,width:350,height:20},
 {text:'4 Which chemical reaction is reversible?',x:630,y:240,width:390,height:20}];
 const q=splitRecognizedQuestions('',{lines,width:1200,height:840});
 assert.deepEqual(q.map(q=>q.number),[1,2,3,4]);
 assert(!q[0].searchText.includes('concentration'));
});

test('PDF spacing in physical quantities matches the compact source index',()=>{
 const [q]=splitRecognizedQuestions('15 The reaction releases 486 kJ / mol of energy.\nThe bond energy is 436 kJ / mol.');
 assert.match(q.searchText,/486kJ/);assert.match(q.searchText,/436kJ/);
 assert.match(q.text,/486 kJ/);
});
