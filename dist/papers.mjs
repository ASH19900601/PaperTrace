import {FILE_TYPES,SEASONS,DOWNLOAD_LEVELS,preferredFiles,singlePaperFilters,availableSubjects,filterFiles,paperOptions,variantOptions,sortFiles,safeName,csvFiles,zipBlob} from './papers-core.mjs';
import {isScieSubject} from './subject-scope.mjs';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PAGE_SIZE=40,MAX_SELECTION=100;
let saved={};try{saved=JSON.parse(localStorage.getItem('pt-download-filters-v2')||'{}')}catch{}
const params=new URLSearchParams(location.search);
const list=(key,fallback)=>params.has(key)?params.get(key).split(',').filter(Boolean):fallback;
const state={extra:params.has('extra')?params.get('extra')==='1':!!saved.extra,board:params.get('board')??saved.board??'CAIE',level:params.get('level')??saved.level??'AS & A Level',code:params.get('subject')??saved.code??'9702',years:list('years',saved.years??null)?.map(Number),sessions:list('seasons',saved.sessions??[]),paper:params.get('paper')??saved.paper??'',variant:params.get('variant')??saved.variant??'',types:list('types',saved.types??['qp','ms']),query:params.get('q')||'',sort:'newest',page:1};
if(params.has('subject')&&!isScieSubject(state.code))state.extra=true;
let index=null,files=[],filtered=[],generation=0,hosted=false,queue=null,failed=[],retryMode='zip',preview=null,previewGeneration=0,pdfRender=null;
const selections=new Map(),statuses=new Map(),shards=new Map();
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('visible'),4500)}
function error(message){$('dlError').hidden=!message;$('dlError').innerHTML=message?`${esc(message)} <button class="text-btn" id="dlReload">重新加载</button>`:''}
function saveFilters(){
  const saved={...state};delete saved.query;delete saved.page;delete saved.sort;
  try{localStorage.setItem('pt-download-filters-v2',JSON.stringify(saved))}catch{}
  const p=new URLSearchParams();p.set('subject',state.code);p.set('board',state.board);p.set('level',state.level);p.set('years',(state.years||[]).join(','));p.set('seasons',state.sessions.join(','));p.set('types',state.types.join(','));
  if(state.extra)p.set('extra','1');if(state.paper)p.set('paper',state.paper);if(state.variant)p.set('variant',state.variant);if(state.query)p.set('q',state.query);
  history.replaceState(null,'','?'+p.toString());
}
function options(select,values,current,blank){select.innerHTML=(blank!==undefined?`<option value="">${esc(blank)}</option>`:'')+values.map(v=>`<option value="${esc(v.value??v)}">${esc(v.label??v)}</option>`).join('');select.value=current;select.disabled=!values.length}
function courses(){
  $('dlExtra').checked=state.extra;
  const all=availableSubjects(index.subjects,{extra:state.extra}),boards=[...new Set(all.map(s=>s.examBoard||'CAIE'))];
  if(!boards.includes(state.board))state.board=boards.includes('CAIE')?'CAIE':boards[0]||'';
  options($('dlBoard'),boards,state.board);
  const levels=[...new Set(availableSubjects(all,{extra:true,board:state.board}).map(s=>s.level))];
  if(!levels.includes(state.level))state.level=levels.includes('AS & A Level')?'AS & A Level':levels[0]||'';
  options($('dlLevel'),levels,state.level);
  const subjects=availableSubjects(all,{extra:true,board:state.board,level:state.level});
  if(!subjects.some(s=>s.code===state.code))state.code=subjects.find(s=>s.code==='9702')?.code||subjects[0]?.code||'';
  options($('dlSubject'),subjects.map(s=>({value:s.code,label:`${s.code} · ${s.nameZh} · ${s.name}`})),state.code);
  document.querySelectorAll('[data-quick]').forEach(b=>b.classList.toggle('active',b.dataset.quick===state.code));
}
function chips(id,values,selected,kind,allLabel){
  $(id).innerHTML=(allLabel?`<button type="button" data-all="${kind}" class="${!selected.length?'active':''}">${allLabel}</button>`:'')+values.map(v=>`<label><input type="${kind==='types'?'checkbox':'radio'}" name="${kind}" data-filter="${kind}" value="${esc(v.value??v)}" ${selected.includes(v.value??v)?'checked':''}><span>${esc(v.label??v)}</span></label>`).join('');
}
function facets(){
  Object.assign(state,singlePaperFilters(files,state));
  const years=[...new Set(files.map(r=>r.year))].sort((a,b)=>b-a);
  if(state.years===null)state.years=years.slice(0,1);else{const previous=state.years;state.years=state.years.filter(y=>years.includes(y));if(previous.length&&!state.years.length)state.years=years.slice(0,1)}
  chips('dlYears',years,state.years,'years');
  const inYears=filterFiles(files,{years:state.years}),sessions=[...new Set(inYears.map(r=>r.session))].sort((a,b)=>'jmsw'.indexOf(a)-'jmsw'.indexOf(b));
  state.sessions=state.sessions.filter(s=>sessions.includes(s));chips('dlSeasons',sessions.map(v=>({value:v,label:SEASONS[v]||v})),state.sessions,'sessions');
  const scoped=filterFiles(files,{years:state.years,sessions:state.sessions,types:['qp','ms']}),papers=paperOptions(scoped);
  if(!papers.includes(state.paper))state.paper='';
  options($('dlPaper'),papers.map(p=>({value:p,label:/^\d+$/.test(p)?'Paper '+p:p})),state.paper);
  const variants=variantOptions(scoped,state.paper);if(!variants.includes(state.variant))state.variant='';
  options($('dlVariant'),variants.map(v=>({value:v,label:'Variant '+v})),state.variant);$('dlVariantLabel').hidden=!variants.length;
  const subject=index.subjects.find(s=>s.code===state.code);
  $('dlPaperHint').textContent=subject?.examBoard==='CAIE'?'例如 22 表示 Paper 2 · Variant 2。分数线与考官报告适用于整个考季。':subject?.examBoard==='College Board'?'使用官方 FRQ 名称区分套题与视唱题，配套提供 Scoring Guidelines。':'保留原卷的 1H、1F、1R 等标识；按所选年份显示实际卷别。';
  const types=Object.keys(FILE_TYPES).filter(t=>files.some(f=>f.type===t));state.types=state.types.filter(t=>types.includes(t));
  chips('dlTypes',types.map(t=>({value:t,label:`${FILE_TYPES[t].label} · ${t.toUpperCase()}`})),state.types,'types');
  $('dlSubjectSummary').textContent=subject?`${subject.nameZh} · ${subject.examBoard} · ${subject.level} · ${years.at(-1)||'—'}–${years[0]||'—'} · ${files.length.toLocaleString()} 份资料`:'';
}
function updateSelection(){
  $('dlPairDownload').disabled=!!queue;
  const visible=filtered.slice((state.page-1)*PAGE_SIZE,state.page*PAGE_SIZE),count=visible.filter(r=>selections.has(r.id)).length;
  $('dlSelectPage').checked=!!visible.length&&count===visible.length;$('dlSelectPage').indeterminate=count>0&&count<visible.length;$('dlSelectPage').disabled=!visible.length;
  const outside=[...selections.keys()].filter(id=>!filtered.some(r=>r.id===id)).length;
  $('dlSelectionCount').textContent=`已选 ${selections.size} 份${outside?' · 其他筛选 '+outside+' 份':''}`;
  $('dlSelectAll').textContent=filtered.length>MAX_SELECTION?'选择前 100 份':'选择筛选结果';$('dlSelectAll').disabled=!filtered.length;
  for(const id of ['dlCopy','dlCheck','dlZip'])$(id).disabled=!selections.size||!!queue;
}
function fileCard(r){
  const status=statuses.get(r.id),type=FILE_TYPES[r.type],series=SEASONS[r.session]||r.session;
  return `<article class="dl-file ${selections.has(r.id)?'selected':''}" data-file="${esc(r.id)}"><label class="dl-file-check"><input type="checkbox" data-select="${esc(r.id)}" ${selections.has(r.id)?'checked':''} aria-label="选择 ${esc(r.name)}"></label><div class="dl-file-icon ${esc(r.type)}">${r.type.toUpperCase()}</div><div><h3>${r.year} ${esc(series.split(' · ')[1]||series)} <span class="muted">/</span> ${esc(r.label)} <span class="muted">/</span> ${esc(type.label)}</h3><div class="dl-file-meta"><span>${esc(r.code)}</span><span>${esc(type.en)}</span><span>${esc(new URL(r.url).hostname)}</span></div><div class="dl-file-name">${esc(r.name)}</div><div class="dl-file-state ${esc(status?.kind||'')}">${esc(status?.text||'')}</div></div><div class="dl-file-actions"><a class="text-btn" href="${esc(r.url)}" target="_blank" rel="noopener">来源 PDF ↗</a>${r.source?`<a class="text-btn" href="${esc(r.source)}" target="_blank" rel="noopener">资料目录 ↗</a>`:''}<button class="btn small" data-preview="${esc(r.id)}">预览</button><button class="btn primary small" data-download="${esc(r.id)}">下载 ↓</button></div></article>`;
}
function render(){
  filtered=sortFiles(state.types.length?filterFiles(files,state):[],state.sort);
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));state.page=Math.max(1,Math.min(state.page,pages));
  const pair=filtered.filter(r=>['qp','ms'].includes(r.type));
  $('dlResultTitle').textContent=pair.length===2&&new Set(pair.map(r=>r.type)).size===2?'这一套试卷与答案':`找到 ${filtered.length.toLocaleString()} 份资料`;
  $('dlPairDownload').hidden=!pair.length;$('dlPairDownload').disabled=!!queue;
  $('dlPairDownload').textContent=hosted?(pair.length===2?'下载这一套 QP + MS ↓':`下载当前 ${pair[0]?.type.toUpperCase()||'资料'} ↓`):(pair.length===2?'导出这一套下载链接':`导出当前 ${pair[0]?.type.toUpperCase()||'资料'} 链接`);
  $('dlResultNote').textContent=`${state.years?.length?state.years.join('、'):'全部年份'} · ${state.sessions.length?state.sessions.map(s=>SEASONS[s].split(' · ')[1]).join('、'):'全部考季'}${state.paper?' · '+(/^\d+$/.test(state.paper)?'Paper '+state.paper:state.paper):''}${state.variant?' · Variant '+state.variant:''}`;
  $('dlFiles').innerHTML=filtered.length?filtered.slice((state.page-1)*PAGE_SIZE,state.page*PAGE_SIZE).map(fileCard).join(''):`<div class="dl-empty"><strong>${state.types.length?'当前条件下暂无资料':'请选择资料类型'}</strong>${state.types.length?'可以调整年份、考季或关键词；目录只列出已收录的文件。':'勾选试卷、评分标准或其他配套资料。'}</div>`;
  $('dlPageStatus').textContent=`${state.page} / ${pages} 页`;$('dlPrev').disabled=state.page===1;$('dlNext').disabled=state.page===pages;
  updateSelection();
}
function update(){facets();selections.clear();state.page=1;render();saveFilters()}
async function loadSubject(){
  const revision=++generation;files=[];filtered=[];selections.clear();error('');$('dlPairDownload').hidden=true;$('dlFiles').innerHTML='<div class="dl-empty">正在读取本科目资料…</div>';$('dlResultTitle').textContent='正在读取资料…';updateSelection();
  const subject=index.subjects.find(s=>s.code===state.code);if(!subject)return;
  try{
    if(!shards.has(subject.code)){
      const response=await fetch(`data/downloads/${encodeURIComponent(subject.code)}.json?v=${subject.version}`);if(!response.ok)throw new Error('本科目目录加载失败');
      const data=await response.json();if(!Array.isArray(data.files))throw new Error('目录格式暂不可用');shards.set(subject.code,preferredFiles(data.files));
    }
    if(revision!==generation)return;files=shards.get(subject.code);update();
  }catch(e){if(revision!==generation)return;error(e.message);$('dlResultTitle').textContent='目录暂未加载';$('dlFiles').innerHTML=''}
}
async function initialize(){
  try{
    const response=await fetch('data/downloads/index.json');if(!response.ok)throw new Error('资料目录加载失败，请稍后重试');index=await response.json();index.subjects=index.subjects.filter(s=>DOWNLOAD_LEVELS.includes(s.level));
    $('catalogCount').textContent=index.subjects.reduce((sum,s)=>sum+s.files,0).toLocaleString();$('catalogDate').textContent='目录更新 '+index.updatedAt.slice(0,10);
    if(params.has('subject')){const subject=index.subjects.find(s=>s.code===state.code);if(subject){if(!params.has('board'))state.board=subject.examBoard;if(!params.has('level'))state.level=subject.level}}
    courses();$('dlQuery').value=state.query;await loadSubject();
  }catch(e){error(e.message)}
}
const configReady=(async()=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4000);
  try{const r=await fetch('api/config',{signal:controller.signal});if(r.ok){const c=await r.json();hosted=!!c.downloads;$('developerCredit').textContent=c.developerCredit||'';$('developerCredit').hidden=!c.developerCredit}}
  catch{}finally{clearTimeout(timer)}
})();
void configReady.then(()=>{
  $('dlZip').textContent=hosted?'打包下载 ZIP ↓':'导出所选下载链接';
  $('dlCheck').hidden=!hosted;$('dlDownloadHint').hidden=hosted;
  if(files.length)render();
});
function saveBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=safeName(name);document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
function status(r,text,kind=''){statuses.set(r.id,{text,kind});const row=document.querySelector(`[data-file="${CSS.escape(r.id)}"] .dl-file-state`);if(row){row.textContent=text;row.className='dl-file-state '+kind}}
async function bytesFor(r,signal){
  await configReady;const response=await fetch(hosted?'api/paper-file?id='+encodeURIComponent(r.id):r.url,{signal});
  if(!response.ok){let message='下载失败，请稍后重试';try{message=(await response.json()).error||message}catch{}throw new Error(message)}
  const bytes=new Uint8Array(await response.arrayBuffer());if(new TextDecoder().decode(bytes.subarray(0,5))!=='%PDF-')throw new Error('来源暂未返回 PDF，请使用资料目录查找');return bytes;
}
async function downloadOne(r){
  await configReady;if(!hosted){window.open(r.url,'_blank','noopener');return}
  status(r,'正在获取 PDF…');
  try{const bytes=await bytesFor(r);saveBlob(new Blob([bytes],{type:'application/pdf'}),r.name);status(r,`已下载 · ${(bytes.length/1024).toFixed(0)} KB`,'ok')}catch(e){status(r,e.message,'error');toast(e.message)}
}
async function batch(mode,resources=[...selections.values()]){
  if(queue||!resources.length)return;const code=resources[0].code;await configReady;if(queue)return;
  if(!hosted){saveBlob(new Blob([csvFiles(resources)],{type:'text/csv;charset=utf-8'}),'PaperTrace-links.csv');toast('已导出下载链接，可逐项打开来源 PDF。');return}
  const job={controller:new AbortController(),cancelled:false,done:0,bytes:0,collected:[],failed:[],pending:[...resources]};queue=job;failed=[];retryMode=mode;updateSelection();
  $('dlQueue').hidden=false;$('dlRetry').hidden=true;$('dlCancel').hidden=false;$('dlProgress').max=resources.length;$('dlProgress').value=0;
  $('dlQueueTitle').textContent=mode==='check'?'正在检查 PDF 可用性':'正在获取 PDF 并准备 ZIP';
  $('dlCancel').textContent=mode==='check'?'停止检查':'停止并保存已下载';
  const message=()=>{$('dlQueueMessage').textContent=`已处理 ${job.done} / ${resources.length} 份 · 成功 ${job.collected.length} · 未完成 ${job.failed.length}${job.bytes?' · '+(job.bytes/1048576).toFixed(1)+' MB':''}`;$('dlProgress').value=job.done};message();
  const worker=async()=>{
    while(job.pending.length&&!job.cancelled){
      const r=job.pending.shift();status(r,mode==='check'?'正在检查…':'正在下载…');
      try{
        if(mode==='check'){
          const response=await fetch('api/paper-check?id='+encodeURIComponent(r.id),{signal:job.controller.signal});const result=await response.json();if(!response.ok)throw new Error(result.error||'检查失败');job.collected.push({name:r.name});status(r,`可下载 · ${(result.bytes/1024).toFixed(0)} KB`,'ok');
        }else{
          const bytes=await bytesFor(r,job.controller.signal);if(job.bytes+bytes.length>150*1048576){job.cancelled=true;job.controller.abort();throw new Error('本批已达 150 MB，请分批继续下载')}
          job.bytes+=bytes.length;job.collected.push({name:r.name,bytes});status(r,'已加入下载包','ok');
        }
      }catch(e){job.failed.push(r);status(r,e.name==='AbortError'?'已停止，可重试':e.message,'error')}
      job.done++;message();
    }
  };
  try{
    await Promise.all([worker(),worker()]);failed=[...job.failed,...job.pending];
    if(mode==='zip'&&job.collected.length){
      const entries=[...job.collected];if(failed.length)entries.push({name:'未完成下载.txt',bytes:new TextEncoder().encode(failed.map(r=>r.name+'\n'+r.url).join('\n\n'))});
      saveBlob(zipBlob(entries),`PaperTrace-${code}-${new Date().toISOString().slice(0,10)}.zip`);
    }
    $('dlQueueTitle').textContent=job.cancelled?(mode==='check'?'已停止检查':'已停止，已获取文件已保留'):mode==='check'?'可用性检查完成':job.collected.length?'下载包已保存':'暂未成功下载';
    $('dlQueueMessage').textContent=`成功 ${job.collected.length} / ${resources.length} 份${failed.length?' · '+failed.length+' 份可重试':''}${mode==='zip'&&job.collected.length?' · ZIP 内保留原始 PDF 文件名':''}`;
  }catch(e){$('dlQueueTitle').textContent='本次处理未完成';$('dlQueueMessage').textContent=e.message;failed=resources}
  finally{queue=null;$('dlRetry').hidden=!failed.length;$('dlCancel').hidden=true;updateSelection()}
}
async function openPreview(r){
  const revision=++previewGeneration;preview?.controller?.abort();pdfRender?.cancel();void preview?.loadingTask?.destroy();preview={resource:r,page:1,doc:null,controller:new AbortController()};
  $('dlPreviewType').textContent=FILE_TYPES[r.type].en;$('dlPreviewName').textContent=r.name;$('dlPreviewSource').href=r.url;$('dlPreviewPage').textContent='';$('dlPreviewCanvas').hidden=true;$('dlPreviewStatus').textContent='正在加载 PDF…';$('dlPreviewPrev').disabled=true;$('dlPreviewNext').disabled=true;
  if(!$('dlPreview').open)$('dlPreview').showModal();
  try{
    const [bytes,pdf]=await Promise.all([bytesFor(r,preview.controller.signal),import('./vendor/pdf.mjs')]);if(revision!==previewGeneration)return;
    pdf.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.mjs',location.href).href;
    const task=preview.loadingTask=pdf.getDocument({data:bytes,isEvalSupported:false,standardFontDataUrl:new URL('./vendor/standard_fonts/',location.href).href}),doc=await task.promise;if(revision!==previewGeneration){void doc.destroy();return}preview.doc=doc;await renderPreview(revision);
  }catch(e){if(revision===previewGeneration)$('dlPreviewStatus').textContent='预览暂不可用，可打开来源 PDF 或下载后查看。'}
}
async function renderPreview(revision=++previewGeneration){
  if(!preview?.doc)return;pdfRender?.cancel();
  $('dlPreviewPrev').disabled=true;$('dlPreviewNext').disabled=true;
  const current=preview;try{
    const page=await current.doc.getPage(current.page);if(revision!==previewGeneration||current!==preview)return;
    const size=page.getViewport({scale:1}),viewport=page.getViewport({scale:Math.min(1.6,1500/size.width)}),canvas=$('dlPreviewCanvas');canvas.width=viewport.width;canvas.height=viewport.height;
    const rendering=page.render({canvasContext:canvas.getContext('2d'),viewport});pdfRender=rendering;await rendering.promise;if(revision!==previewGeneration||current!==preview)return;
    canvas.hidden=false;$('dlPreviewStatus').textContent='';$('dlPreviewPage').textContent=`第 ${current.page} / ${current.doc.numPages} 页`;$('dlPreviewPrev').disabled=current.page===1;$('dlPreviewNext').disabled=current.page===current.doc.numPages;
  }catch(e){if(e.name!=='RenderingCancelledException'&&revision===previewGeneration)$('dlPreviewStatus').textContent='本页未完成，请切换页面或下载查看。'}
}
function selectMany(rows){for(const r of rows){if(selections.size>=MAX_SELECTION)break;selections.set(r.id,r)}render();if(selections.size>=MAX_SELECTION)toast('已选 100 份，可先下载这一批后继续选择。')}
for(const id of ['dlBoard','dlLevel','dlSubject','dlExtra'])$(id).onchange=()=>{
  if(!index)return;state.extra=$('dlExtra').checked;state.board=$('dlBoard').value;state.level=$('dlLevel').value;state.code=$('dlSubject').value;state.years=null;state.sessions=[];state.paper='';state.variant='';state.types=['qp','ms'];state.query='';$('dlQuery').value='';courses();void loadSubject();
};
document.querySelectorAll('[data-quick]').forEach(button=>button.onclick=()=>{if(!index)return;const s=index.subjects.find(x=>x.code===button.dataset.quick);Object.assign(state,{code:s.code,board:s.examBoard,level:s.level,years:null,sessions:[],paper:'',variant:'',types:['qp','ms'],query:''});$('dlQuery').value='';courses();void loadSubject()});
for(const id of ['dlYears','dlSeasons','dlTypes']){
  $(id).onchange=e=>{const input=e.target;if(!input.dataset.filter)return;const key=input.dataset.filter,value=key==='years'?Number(input.value):input.value;state[key]=key==='types'?(input.checked?[...state[key],value]:state[key].filter(v=>v!==value)):[value];update()};
  $(id).onclick=e=>{const b=e.target.closest('[data-all]');if(b){state[b.dataset.all]=[];update()}};
}
$('dlPaper').onchange=()=>{state.paper=$('dlPaper').value;state.variant='';update()};$('dlVariant').onchange=()=>{state.variant=$('dlVariant').value;update()};
$('dlQuery').oninput=()=>{state.query=$('dlQuery').value;state.page=1;render();saveFilters()};$('dlSort').onchange=()=>{state.sort=$('dlSort').value;state.page=1;render()};
$('dlReset').onclick=()=>{Object.assign(state,{years:null,sessions:[],paper:'',variant:'',types:['qp','ms'],query:''});$('dlQuery').value='';update()};
$('dlShare').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);toast('已复制当前筛选链接。')}catch{toast('可复制浏览器地址栏分享当前筛选。')}};
$('dlFiles').onchange=e=>{const id=e.target.dataset.select;if(!id)return;if(e.target.checked){if(selections.size>=MAX_SELECTION){e.target.checked=false;toast('每批可选择 100 份，下载后可继续。');return}selections.set(id,files.find(r=>r.id===id))}else selections.delete(id);e.target.closest('.dl-file').classList.toggle('selected',e.target.checked);updateSelection()};
$('dlFiles').onclick=e=>{const b=e.target.closest('[data-download],[data-preview]');if(!b)return;const r=files.find(f=>f.id===(b.dataset.download||b.dataset.preview));if(r)b.dataset.download?void downloadOne(r):void openPreview(r)};
$('dlSelectPage').onchange=e=>{const rows=filtered.slice((state.page-1)*PAGE_SIZE,state.page*PAGE_SIZE);if(e.target.checked)selectMany(rows);else{for(const r of rows)selections.delete(r.id);render()}};
$('dlSelectAll').onclick=()=>selectMany(filtered);$('dlClear').onclick=()=>{selections.clear();render()};
$('dlCopy').onclick=()=>saveBlob(new Blob([csvFiles([...selections.values()])],{type:'text/csv;charset=utf-8'}),'PaperTrace-links.csv');
$('dlPairDownload').onclick=()=>batch('zip',filtered.filter(r=>['qp','ms'].includes(r.type)));
$('dlZip').onclick=()=>batch('zip');$('dlCheck').onclick=()=>batch('check');$('dlRetry').onclick=()=>batch(retryMode,failed);
$('dlCancel').onclick=()=>{if(queue){queue.cancelled=true;queue.controller.abort()}};
for(const [id,delta] of [['dlPrev',-1],['dlNext',1]])$(id).onclick=()=>{state.page+=delta;render();$('dlResultTitle').scrollIntoView({block:'start',behavior:'smooth'})};
$('dlError').onclick=e=>{if(e.target.id==='dlReload')index?void loadSubject():void initialize()};
$('dlClosePreview').onclick=()=>$('dlPreview').close();$('dlPreview').addEventListener('close',()=>{++previewGeneration;preview?.controller?.abort();pdfRender?.cancel();void preview?.loadingTask?.destroy();preview=null});
$('dlPreviewPrev').onclick=()=>{if(preview?.doc&&preview.page>1){preview.page--;void renderPreview()}};$('dlPreviewNext').onclick=()=>{if(preview?.doc&&preview.page<preview.doc.numPages){preview.page++;void renderPreview()}};
$('dlPreviewDownload').onclick=()=>{if(preview)void downloadOne(preview.resource)};
void initialize();
