import {test} from 'node:test';
import assert from 'node:assert/strict';
import {apiBase,extractionPayload,extractWithLLM,readExtraction,parallelRecognition,LLM_TIMEOUT_MS} from '../dist/llm-ocr.mjs';
import {previewPage,serverPageURL,PaperPreview} from '../dist/paper-preview.mjs';

const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
test('OCR is delivered while the LLM is pending; failure of LLM leaves it usable',async()=>{
  const ocr=deferred(),llm=deferred(),results=[],errors=[];
  const pending=parallelRecognition({ocr:()=>ocr.promise,llm:()=>llm.promise},{onResult:(source,text)=>results.push([source,text]),onError:source=>errors.push(source)});
  ocr.resolve('A skydiver jumps.');await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(results,[['ocr','A skydiver jumps.']]);llm.reject(new Error('timeout'));await pending;
  assert.deepEqual(errors,['llm']);assert.equal(results.length,1);
});
test('LLM can finish first; cancelled images never publish late OCR or LLM output',async()=>{
  const slow=deferred(),results=[];let current=true;
  const pending=parallelRecognition({ocr:()=>slow.promise,llm:async()=>'Recognized formula x²'}, {onResult:source=>results.push(source),isCurrent:()=>current});
  await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(results,['llm']);current=false;slow.resolve('stale photo');await pending;assert.deepEqual(results,['llm']);
});
test('stream parser joins fragmented UTF-8 and requires completion',async()=>{
  const bytes=new TextEncoder().encode('data: {"type":"response.output_text.delta","delta":"题目 x²"}\n\ndata: {"type":"response.completed","response":{"output":[]}}\n\n');
  const response=new Response(new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=3)c.enqueue(bytes.slice(i,i+3));c.close()}}),{headers:{'Content-Type':'text/event-stream'}});
  assert.equal(await readExtraction(response),'题目 x²');
  await assert.rejects(readExtraction(new Response('{"delta":"partial"}\n',{headers:{'Content-Type':'application/x-ndjson'}})),/中断/);
  assert.equal(await readExtraction(new Response('{"delta":"one"}\n{"done":true,"text":"one two"}\n',{headers:{'Content-Type':'application/x-ndjson'}})),'one two');
});
test('shared mode never forwards a personal key; static mode uses the exact requested model and low effort',async()=>{
  const calls=[];const fetcher=async(...args)=>{calls.push(args);return new Response('{"done":true,"text":"question"}\n',{headers:{'Content-Type':'application/x-ndjson'}})};
  await extractWithLLM('data:image/png;base64,abc',{server:true,key:'private-test',fetcher});
  assert.equal(calls[0][0],'api/ocr');assert.deepEqual(JSON.parse(calls[0][1].body),{image:'data:image/png;base64,abc'});assert.equal(calls[0][1].headers.Authorization,undefined);
  await extractWithLLM('image',{key:'my-test-key',base:'https://example.com/v1/',fetcher});
  assert.equal(calls[1][0],'https://example.com/v1/chat/completions');const payload=JSON.parse(calls[1][1].body);
  assert.equal(payload.model,'gpt-6.1-sol');assert.equal(payload.reasoning_effort,'low');assert.equal(payload.stream,true);assert.equal(payload.store,false);
  assert.throws(()=>apiBase('http://example.com/v1'),/HTTPS/);
});
test('LLM timeout aborts its request without involving the OCR engine',async()=>{
  assert.equal(LLM_TIMEOUT_MS,75000);
  await assert.rejects(extractWithLLM('image',{server:true,timeoutMs:10,fetcher:(_url,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted'))))}),/等待超时/);
});
test('LLM waiting and retry status reach the UI without becoming recognized text',async()=>{
  const statuses=[],text=[];
  const body=[{status:'processing',message:'识别处理中 · 30 秒'},{status:'retrying',message:'正在自动重试…'},{delta:'A question'},{done:true,text:'A question'}].map(e=>JSON.stringify(e)).join('\n');
  assert.equal(await extractWithLLM('image',{server:true,onStatus:s=>statuses.push(s),onProgress:s=>text.push(s),fetcher:async()=>new Response(body,{headers:{'Content-Type':'application/x-ndjson'}})}),'A question');
  assert.deepEqual(statuses,['识别处理中 · 30 秒','正在自动重试…']);assert.deepEqual(text,['A question']);
});
test('LLM errors retain server detail and replace raw gateway HTML',async()=>{
  await assert.rejects(readExtraction(new Response(JSON.stringify({error:'识别服务账户额度不足。'}),{status:402})),/额度不足/);
  await assert.rejects(readExtraction(new Response('<html>504 gateway</html>',{status:504})),/^Error: 识别服务响应超时/);
  await assert.rejects(readExtraction(new Response('{"error":"识别服务等待超时，请稍后重试。","code":504}\n',{headers:{'Content-Type':'application/x-ndjson'}})),/等待超时/);
});
test('static relay uses only the visitor key and is limited to its configured provider',async()=>{
  const calls=[],fetcher=async(...args)=>{calls.push(args);return new Response('{"done":true,"text":"question"}\n',{headers:{'Content-Type':'application/x-ndjson'}})};
  await extractWithLLM('image',{key:'visitor-key',relay:'https://example.com/api/ocr-personal',fetcher});
  assert.equal(calls[0][0],'https://example.com/api/ocr-personal');assert.equal(calls[0][1].headers.Authorization,'Bearer visitor-key');assert.deepEqual(JSON.parse(calls[0][1].body),{image:'image'});
  await extractWithLLM('image',{key:'custom-key',base:'https://another.example/v1',relay:'https://example.com/api/ocr-personal',fetcher});
  assert.equal(calls[1][0],'https://another.example/v1/chat/completions');
});
test('PDF preview clamps navigation to matched question pages and sends only a catalog paper ID',()=>{
  const r={paperId:'9702_s24_qp_22',page:6,endPage:8};
  assert.equal(previewPage(r,2),6);assert.equal(previewPage(r,99),8);
  assert.equal(serverPageURL(r,7),'api/paper-page?paper=9702_s24_qp_22&page=7');
});
test('cancelling a preview aborts download, rendering and PDF worker together',()=>{
  const actions=[],root={replaceChildren(){actions.push('clear')},hidden:false};
  const view=new PaperPreview(root,{});view.controller={abort(){actions.push('abort')}};view.renderTask={cancel(){actions.push('cancel')}};view.loadingTask={destroy(){actions.push('destroy');return Promise.resolve()}};
  view.clear();assert.deepEqual(actions,['abort','cancel','destroy','clear']);assert.equal(root.hidden,true);
});

test('Chat Completions stream requires a successful finish reason',async()=>{
 const response=reason=>new Response('data: '+JSON.stringify({choices:[{delta:{content:'A skydiver jumps.'},finish_reason:null}]})+'\n\ndata: '+JSON.stringify({choices:[{delta:{},finish_reason:reason}]})+'\n\ndata: [DONE]\n\n',{headers:{'Content-Type':'text/event-stream'}});
 assert.equal(await readExtraction(response('stop')),'A skydiver jumps.');await assert.rejects(readExtraction(response('length')),/完整题干/);
});
