import {CorpusLoader,openCorpusCache,prioritizeSubjects} from './corpus-loader.mjs';
import {LLM_MODEL,DEFAULT_API_BASE,apiBase,extractWithLLM,parallelRecognition} from './llm-ocr.mjs?v=20261024-3';
import {PaperPreview} from './paper-preview.mjs?v=20261024-4';
import {isScieSubject,normalizeScope,scopeCodes} from './subject-scope.mjs';
import {readableBlocks,readableExcerpt,recognitionPresentation} from './readability.mjs?v=20261024-4';
import {fileMetadata,pdfTextRows,splitPDF,mapMS,validateImportedIndex,safeURL} from './import-utils.mjs';
import './vendor/compat.mjs';
import {normalize,tokens} from './search.mjs';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const seasons={j:'Jan',m:'Feb / Mar',s:'May / Jun',w:'Oct / Nov'};
const state={manifest:null,builtin:[],localPapers:[],localRecords:[],records:[],papers:new Map(),index:null,results:[],shown:20,level:'',query:'',view:'search',bookmarks:readJSON('pt-bookmarks',[]),blobUrls:new Map(),db:null,ready:false,importing:false,loadWarnings:[],scope:normalizeScope(readJSON('pt-subject-scope',null)),scopedCodes:[],scopedRecords:[],scopedPapers:[]};
function readJSON(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}}
function store(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{toast('浏览器存储不可用，当前设置无法保存。')}}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),4000)}

state.bookmarks=Array.isArray(state.bookmarks)?state.bookmarks.filter(id=>typeof id==='string'):[];
function meta(code){return state.manifest?.subjects.find(s=>s.code===code)||{code,name:'Subject '+code,nameZh:'科目 '+code,level:code.startsWith('0')?'IGCSE':code.startsWith('9')?'AS & A Level':'其他科目'}}
function paper(r){return state.papers.get(r.paperId)||{}}
function paperUrl(p,type,page){const blob=p[type+'Blob'];let url;if(blob){const key=p.id+type;if(!state.blobUrls.has(key))state.blobUrls.set(key,URL.createObjectURL(blob));url=state.blobUrls.get(key)}else url=safeURL(p[type]);return url?(page?url.split('#')[0]+'#page='+page:url):null}
function link(url,label,classes='btn small',extra=''){return url?`<a class="${classes}" href="${esc(url)}" target="_blank" rel="noopener noreferrer" ${extra}>${label}</a>`:''}
function msLink(r){const p=paper(r),url=paperUrl(p,'ms',r.msPage);if(url)return link(url,p.msVerified||p.msBlob?'查看 MS ↗':'打开 MS（未验证）↗','btn primary small',`title="${r.msPage?'定位到第 '+r.msPage+' 页':'打开整份 Mark Scheme，查找题号'}"`);return link(safeURL(p.sourcePage)||'https://pastpapers.papacambridge.com/search-past-papers?query='+encodeURIComponent(p.id?.replace('_qp_','_ms_')||r.paperId),p.sourcePage?'查看官方评分资源 ↗':'查找 MS ↗','btn small')}
function highlight(text,terms){const pieces=String(text).split(/([\p{L}\p{N}]+)/u);const ts=new Set(terms);return pieces.map(s=>ts.has(normalize(s))?'<mark>'+esc(s)+'</mark>':esc(s)).join('')}
function readableHTML(text,terms=[]){return readableBlocks(text).map(b=>`<p class="reading-${b.type}">${highlight(b.text,terms.filter(t=>t.length>=4).slice(0,6))}</p>`).join('')}
function snippet(r){return highlight(readableExcerpt(r.text,r.hits||[]),(r.hits||[]).filter(t=>t.length>=4).slice(0,6))}
function resultCard(r){const s=meta(r.code),p=paper(r),saved=state.bookmarks.includes(r.id),isLocal=!!p.local;return `<article class="result-card" data-result="${esc(r.id)}"><div class="card-top"><div class="card-labels"><span class="tag">${esc(s.examBoard||'CAIE')} · ${esc(s.level)}</span><span class="code">${esc(r.code)} · ${esc(s.nameZh)}</span><span class="match-label">${r.exact?'原句 / 编号命中':r.hits?.length?'命中 '+r.hits.length+' 个关键词':isLocal?'本机题库':'已收藏'}</span></div><button class="save-btn ${saved?'saved':''}" data-save="${esc(r.id)}" title="${saved?'取消收藏':'收藏题目'}" aria-label="${saved?'取消收藏':'收藏题目'}">${saved?'★':'☆'}</button></div><h3>${r.year} ${seasons[r.session]} <span class="muted">/</span> ${esc(p.componentLabel||'Paper '+r.component)} <span class="muted">/</span> ${r.question?'Question '+r.question:'原卷第 '+r.page+' 页 · 按页索引'}</h3><p class="snippet">${snippet(r)}</p><div class="card-bottom"><span class="card-meta">${esc(r.paperId)}.pdf · 原卷 p.${r.page}${r.endPage>r.page?'–'+r.endPage:''}${isLocal?' · 本机导入':''}<br>${p.msVerified||p.msBlob?'MS 已'+(p.msBlob?'配对':'检查')+(r.msPage?' · 答案 p.'+r.msPage:' · 打开整份查看题号'):paperUrl(p,'ms')?'MS 链接未验证 · 请核对来源':'MS 未验证 · 提供来源检索'}</span><div class="card-actions"><button class="preview-btn" data-preview="${esc(r.id)}" aria-expanded="false">展开原卷小问</button><button class="preview-btn" data-detail="${esc(r.id)}">题目详情</button>${link(paperUrl(p,'qp',r.page),'原卷 ↗')}${msLink(r)}</div></div><section class="paper-preview result-preview" data-preview-pane="${esc(r.id)}" aria-label="${esc(r.paperId)} ${r.question?'Question '+r.question:'第 '+r.page+' 页'} 原卷预览" hidden></section></article>`}
function renderResults(){clearResultPreviews();let list=[...state.results];const sort=$('#sortSelect').value;if(sort==='newest')list.sort((a,b)=>b.year-a.year||b.score-a.score);if(sort==='oldest')list.sort((a,b)=>a.year-b.year||b.score-a.score);$('#emptyState').hidden=!!state.query;$('#resultsList').innerHTML=state.query?(list.length?list.slice(0,state.shown).map(resultCard).join(''):`<div class="no-results"><strong>暂时没有找到匹配试题</strong><br>试试更有辨识度的英文原句，或放宽科目、年份和卷别筛选。<br>如果原卷不在收录范围，先到「导入试卷」补充题库。${state.scopedCodes.length<availableCodes().length?'<br><button class="btn small" data-expand-scope>扩展到全部科目并重新搜索</button>':''}</div>`):'';$('#loadMore').hidden=state.shown>=list.length;$('#resultsTitle').textContent=state.query?`找到 ${list.length.toLocaleString()} 条候选来源`:'从一道没有出处的题开始';if(state.query&&state.scopedCodes.some(c=>!loadedCodes.has(c)&&state.manifest?.subjects.some(s=>s.code===c)))$('#resultsTitle').textContent+=' · 其余科目加载后自动更新';if(state.query&&list[0])showResultPreview(list[0].id)}
function filters(){return{codes:state.scopedCodes,code:$('#subjectFilter').value,year:$('#yearFilter').value,session:$('#seasonFilter').value,component:$('#paperFilter').value,level:state.level}}
let engine=null,engineId=0;const engineTasks=new Map();function engineRequest(type,data){if(!engine){engine=new Worker(new URL('./index-worker.mjs?v=20261024-2',import.meta.url),{type:'module'});engine.onmessage=e=>{const task=engineTasks.get(e.data.id);if(task){engineTasks.delete(e.data.id);e.data.ok?task.resolve(e.data):task.reject(new Error(e.data.error))}};engine.onerror=()=>{for(const task of engineTasks.values())task.reject(new Error('搜索线程加载失败，请刷新页面重试'));engineTasks.clear();engine.terminate();engine=null}}return new Promise((resolve,reject)=>{const id=++engineId;engineTasks.set(id,{resolve,reject});engine.postMessage({id,type,...data})})}
let searchGeneration=0;
async function runSearch(){
  const q=(recognitionSearchText||$('#query').value).trim(),generation=++searchGeneration;
  clearResultPreviews();
  if(!q){state.pendingSearch=false;state.query='';state.results=[];$('#searchTiming').textContent='';$('#searchButton').disabled=!state.ready;renderResults();return}
  if(!state.ready){state.pendingSearch=true;toast('题库正在加载，完成后会自动搜索。');return}
  if(tokens(q).length===0&&!/\d{4}/.test(q)){state.query='';state.results=[];$('#searchButton').disabled=false;renderResults();toast('请加入更有辨识度的关键词，例如 diffraction grating。');return}
  state.query=q;state.shown=20;const t=performance.now();$('#searchButton').disabled=true;
  try{const selected=filters().code||state.scopedCodes.find(code=>new RegExp('(?:^|[^A-Z0-9])'+code+'(?:[_/\\s]|$)','i').test(q));if(selected&&!loadedCodes.has(selected)&&corpusLoader){await loadSubjects([selected]);if(generation!==searchGeneration)return}const response=await engineRequest('search',{query:q,filters:filters()});if(generation!==searchGeneration)return;state.results=response.results;$('#searchTiming').textContent=`${Math.round(performance.now()-t)} ms · ${state.scopedRecords.length.toLocaleString()} 条范围内索引`;renderResults();store('pt-last-query',$('#query').value.trim())}
  catch(e){if(generation!==searchGeneration)return;state.results=[];renderResults();$('#resultsTitle').textContent='搜索未完成';$('#resultsList').innerHTML=`<div class="error-box">${esc(e.message)}</div>`;toast(e.message)}
  finally{if(generation===searchGeneration)$('#searchButton').disabled=false}
}
function setView(v){if(!['search','library','saved','import'].includes(v))v='search';state.view=v;$('#subjectScope').hidden=!state.manifest||!['search','library'].includes(v);$$('.view').forEach(el=>el.hidden=el.id!==v+'View');$$('.nav').forEach(b=>b.classList.toggle('active',b.dataset.view===v));$('#viewTitle').textContent={search:'试题搜索',library:'题库总览',saved:'我的收藏',import:'导入试卷'}[v];if(v==='library')renderLibrary();if(v==='saved')renderSaved();if(v==='import')renderImported();history.replaceState(null,'','#'+v);window.scrollTo({top:0,behavior:'smooth'})}
function availableCodes(){return [...new Set([...state.records.map(r=>r.code),...[...state.papers.values()].map(p=>p.code)])].sort()}
function renderScope(){
  const available=availableCodes(),selected=new Set(scopeCodes(available,state.scope));
  state.scopedCodes=[...selected];
  state.scopedRecords=state.records.filter(r=>selected.has(r.code));
  state.scopedPapers=[...state.papers.values()].filter(p=>selected.has(p.code));
  const extra=available.filter(c=>!isScieSubject(c)),chosenExtra=extra.filter(c=>selected.has(c));
  $('#subjectScope').hidden=!['search','library'].includes(state.view);
  $('#scopeTitle').textContent=state.scope.mode==='all'?'全部科目 · 深国交优先':chosenExtra.length?'深国交科目 + 自选扩展':'深国交科目';
  $('#scopeSummary').textContent=`题库总览与搜题共用 · ${selected.size} 个科目 / 考试版本 · ${state.scopedPapers.length.toLocaleString()} 份 QP · 选择保存在本机`;
  $('#scopeAll').hidden=state.scope.mode==='all';
  $('#scopeReset').hidden=state.scope.mode==='scie'&&!state.scope.extraCodes.length;
  $('#extraSubjects').innerHTML=extra.length?extra.map(c=>`<label><input type="checkbox" data-extra-code="${esc(c)}" ${selected.has(c)?'checked':''}><span>${esc(c)} · ${esc(meta(c).nameZh)}<small>${esc(meta(c).level)} · ${esc(meta(c).examBoard||'CAIE')}</small></span></label>`).join(''):'<p class="scope-note">暂无额外科目。导入其他科目后，可在这里加入范围。</p>';
  const prev=filters(),years=[...new Set(state.scopedPapers.map(r=>r.year))].sort((a,b)=>b-a),components=[...new Set(state.scopedPapers.map(r=>r.component).filter(Boolean))].sort();
  renderLevels();
  const options=codes=>codes.map(c=>`<option value="${esc(c)}">${esc(c)} ${esc(meta(c).nameZh)}</option>`).join('');
  $('#subjectFilter').innerHTML='<option value="">当前范围全部科目</option>'+[true,false].map(scie=>{const codes=state.scopedCodes.filter(c=>isScieSubject(c)===scie);return codes.length?`<optgroup label="${scie?'深国交科目':'额外科目'}">${options(codes)}</optgroup>`:''}).join('');
  $('#yearFilter').innerHTML='<option value="">全部年份</option>'+years.map(y=>`<option>${y}</option>`).join('');
  $('#paperFilter').innerHTML='<option value="">全部卷别</option>'+components.map(c=>`<option value="${esc(c)}">Paper ${esc(c)}</option>`).join('');
  $('#subjectFilter').value=selected.has(prev.code)?prev.code:'';
  $('#yearFilter').value=years.some(y=>String(y)===prev.year)?prev.year:'';
  $('#paperFilter').value=components.includes(prev.component)?prev.component:'';
  $('#questionCount').textContent=state.scopedRecords.length.toLocaleString();
  $('#rangeLabel').textContent=`${years.at(-1)||'—'}–${years[0]||'—'} · 当前范围 ${selected.size} 个科目代码${state.loadWarnings.length?' · 部分科目未加载':''}`;
  $('#corpusNote').textContent=`当前范围 ${state.scopedPapers.length.toLocaleString()} 份 QP · ${state.scopedRecords.length.toLocaleString()} 条题目 / 页面索引 · 全库 ${state.papers.size.toLocaleString()} 份 QP，可在上方扩展科目${state.loadWarnings.length?' · 未加载科目：'+state.loadWarnings.join('、'):''}`;
}
function changeScope(scope){
  state.scope=normalizeScope(scope);store('pt-subject-scope',state.scope);renderScope();
  if(state.view==='library')renderLibrary();
  const loading=loadRemaining();
  if(state.query){state.results=[];runSearch()}
  return loading;
}
function rebuild(){const job=appendQueue.then(()=>rebuildNow());appendQueue=job.catch(()=>{});return job}
async function rebuildNow(){
  const map=new Map(state.builtin.map(r=>[r.id,r]));state.localRecords.forEach(r=>map.set(r.id,r));
  state.records=[...map.values()].map(r=>({...r,level:meta(r.code).level}));
  state.papers=new Map([...(state.manifest?.papers||[]),...state.localPapers].map(p=>[p.id,p]));
  state.ready=false;++searchGeneration;$('#searchButton').disabled=true;$('#queryHint').textContent='正在建立本机搜索索引…';
  const building=engineRequest('build',{records:state.records});renderScope();updateSavedCount();
  try{await building;state.ready=true;$('#searchButton').disabled=false;$('#queryHint').textContent='英文原句更准确 · 支持试卷编号，如 9702_s24_qp_22'}catch(e){$('#queryHint').textContent=e.message;toast(e.message);return}
  if(state.pendingSearch||state.query){state.pendingSearch=false;runSearch()}
  if(state.view==='library')renderLibrary();if(state.view==='saved')renderSaved();renderImported();
}
function renderLevels(){const levels=[...new Set(state.scopedCodes.map(c=>meta(c).level))].sort();if(state.level&&!levels.includes(state.level))state.level='';$('#levelTabs').innerHTML=['',...levels].map(level=>`<button class="level ${state.level===level?'active':''}" data-level="${esc(level)}">${esc(level||'全部')}</button>`).join('')}
function updateSavedCount(){$('#savedCount').textContent=state.bookmarks.length}
function toggleSave(id){const pos=state.bookmarks.indexOf(id);if(pos<0)state.bookmarks.push(id);else state.bookmarks.splice(pos,1);store('pt-bookmarks',state.bookmarks);updateSavedCount();renderResults();if(state.view==='saved')renderSaved();toast(pos<0?'已收藏到本机学习空间':'已取消收藏')}
function renderSaved(){const list=state.bookmarks.map(id=>state.records.find(r=>r.id===id)).filter(Boolean);$('#savedList').innerHTML=list.length?list.map(resultCard).join(''):'<div class="empty-small">还没有收藏的题目。<br>搜索后，点击题目右上角的 ☆ 保存。</div>';if(list.length<state.bookmarks.length)$('#savedList').insertAdjacentHTML('beforeend','<p class="muted">部分收藏对应的本机试卷已删除。重新导入原卷后可恢复显示。</p>')}
function showDetail(id){const r=state.records.find(r=>r.id===id);if(!r)return;const p=paper(r);$('#detailCode').textContent=(meta(r.code).examBoard||'CAIE')+' · '+meta(r.code).level+' · '+r.code+' · '+meta(r.code).name;$('#detailTitle').textContent=`${r.year} ${seasons[r.session]} / ${p.componentLabel||'Paper '+r.component} / ${r.question?'Question '+r.question:'原卷第 '+r.page+' 页 · 按页索引'}`;$('#detailMeta').innerHTML=`<span class="tag">原卷 p.${r.page}${r.endPage>r.page?'–'+r.endPage:''}</span><span class="tag">${r.msPage?'MS p.'+r.msPage:'MS 题号需手动查找'}</span>`;$('#detailText').innerHTML=readableHTML(recognitionPresentation(r.text).text,tokens(state.query));$('#detailRawText').textContent=r.text;$('#detailRaw').open=false;$('#detailActions').innerHTML=link(paperUrl(p,'qp',r.page),'打开原卷 QP ↗','btn')+msLink(r)+`<button class="btn" data-copy="${esc(r.id)}">复制来源编号</button>`;$('#detailDialog').showModal();getDetailPreview().show(r,undefined,{query:state.query})}
function renderLibrary(){
  if(!state.manifest)return;
  const papers=state.scopedPapers,verified=papers.filter(p=>p.msVerified||p.msBlob).length;
  $('#libraryStats').innerHTML=[[state.scopedPapers.reduce((n,p)=>n+(p.questions||0),0).toLocaleString(),'范围内题目 / 页面索引'],[papers.length.toLocaleString(),'范围内 QP'],[verified.toLocaleString(),'已配对 / 已检查 MS'],[new Set(papers.map(p=>p.code)).size,'范围内科目代码']].map(([n,s])=>`<div class="stat-cell"><b>${n}</b><span>${s}</span></div>`).join('');
  const card=c=>{const s=meta(c),ps=papers.filter(p=>p.code===c),rs=state.scopedRecords.filter(r=>r.code===c),ys=[...new Set(ps.map(p=>p.year))].sort();return `<div class="subject-card"><span class="tag">${esc(s.level)} · ${esc(c)}</span><h3>${esc(s.nameZh)} <small>${esc(s.name)}</small></h3><p>${ys[0]}–${ys.at(-1)} · ${ps.length} 份 QP</p><strong>${ps.reduce((n,p)=>n+(p.questions||0),0).toLocaleString()}</strong> <small>${rs.some(r=>r.question===null)?'条题目 / 页面索引':'道题'}</small><p class="muted">${loadedCodes.has(c)?'已可搜索':'搜索时自动加载'} · ${esc(s.examBoard||'CAIE')}${s.coverage?' · '+esc(s.coverage):''}</p></div>`};
  $('#subjectGrid').innerHTML=[true,false].map(scie=>{const codes=state.scopedCodes.filter(c=>isScieSubject(c)===scie&&papers.some(p=>p.code===c));return codes.length?`<h3 class="subject-group">${scie?'深国交科目':'已加入的额外科目'} · ${codes.length} 个科目 / 考试版本</h3>`+codes.map(card).join(''):''}).join('');
  renderPaperTable();
}
function renderPaperTable(){const q=$('#paperSearch').value.trim().toLowerCase(),list=state.scopedPapers.filter(p=>p.id.toLowerCase().includes(q)).sort((a,b)=>Number(isScieSubject(b.code))-Number(isScieSubject(a.code))||b.year-a.year||a.id.localeCompare(b.id));$('#paperTable').innerHTML=paperTable(list.slice(0,150))+(list.length>150?`<div class="table-footer muted">当前范围共 ${list.length} 份，显示前 150 份。输入编号缩小范围。</div>`:'')}
function paperTable(list){return list.length?`<table><thead><tr><th>试卷编号</th><th>科目 / 年份 / 考季</th><th>索引数</th><th>来源</th><th>Mark Scheme</th></tr></thead><tbody>${list.map(p=>`<tr><td class="code">${esc(p.id)}</td><td>${esc(meta(p.code).nameZh)} · ${p.year} ${seasons[p.session]}</td><td>${p.questions}</td><td>${link(paperUrl(p,'qp'),'打开 QP','')} ${p.local?'本机':''}</td><td>${paperUrl(p,'ms')?link(paperUrl(p,'ms'),p.msBlob?'本机 MS':p.msVerified?'已检查 MS':'MS（未验证）',''):'未配对'}</td></tr>`).join('')}</tbody></table>`:'<div class="empty-small">暂无试卷记录</div>'}
function renderImported(){$('#importedTable').innerHTML=paperTable(state.localPapers)}
async function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open('papertrace-v1',1);req.onupgradeneeded=()=>{req.result.createObjectStore('papers',{keyPath:'id'});req.result.createObjectStore('records',{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function dbAll(name){return new Promise((resolve,reject)=>{const t=state.db.transaction(name,'readonly'),req=t.objectStore(name).getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function persist(papers,records){if(!state.db)throw new Error('浏览器不支持 IndexedDB，无法保存导入。');return new Promise((resolve,reject)=>{const tx=state.db.transaction(['papers','records'],'readwrite'),ps=tx.objectStore('papers'),rs=tx.objectStore('records');const replacing=new Set(papers.map(p=>p.id));for(const old of state.localRecords)if(replacing.has(old.paperId))rs.delete(old.id);for(const p of papers)ps.put(p);for(const r of records)rs.put(r);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('保存已中断'))})}
async function refreshLocal(){[state.localPapers,state.localRecords]=await Promise.all([dbAll('papers'),dbAll('records')]);await rebuild()}
let corpusLoader=null,loadingRemaining=null,appendQueue=Promise.resolve();
const loadedCodes=new Set(),subjectJobs=new Map();
const loadStarted=performance.now();
function loadingStatus(){
  const pending=state.scopedCodes.filter(c=>!loadedCodes.has(c)&&state.manifest?.subjects.some(s=>s.code===c)),count=state.scopedRecords.length.toLocaleString();
  const years=[...new Set(state.scopedPapers.map(p=>p.year))].sort();
  $('#rangeLabel').textContent=`${years[0]||'—'}–${years.at(-1)||'—'} · 已加载 ${state.scopedCodes.length-pending.length} / ${state.scopedCodes.length} 个科目`;
  $('#corpusNote').textContent=`当前可搜 ${count} 条索引 · ${state.scopedPapers.length.toLocaleString()} 份 QP`+(pending.length?` · 其余 ${pending.length} 个科目按需加载`:' · 当前范围已就绪')+(state.loadWarnings.length?' · 未加载科目：'+state.loadWarnings.join('、'):'');
  if(state.ready)$('#queryHint').textContent=pending.length?'常见科目优先加载 · 已可搜索，其他科目后台继续加载':'英文原句更准确 · 支持试卷编号，如 9702_s24_qp_22';
}
async function loadSubjects(codes){
  return Promise.allSettled(codes.map(code=>{
    if(loadedCodes.has(code))return Promise.resolve();
    if(subjectJobs.has(code))return subjectJobs.get(code);
    const job=(async()=>{
      try{
        const records=await corpusLoader.load(code);
        const adding=appendQueue.then(async()=>{
          const localIds=new Set(state.localRecords.map(r=>r.id));
          const added=records.filter(r=>!localIds.has(r.id)).map(r=>({...r,level:meta(r.code).level}));
          await engineRequest('append',{records:added});
          state.builtin.push(...records);state.records.push(...added);loadedCodes.add(code);
          state.loadWarnings=state.loadWarnings.filter(c=>c!==code);
          if(!state.ready){state.ready=true;$('#searchButton').disabled=false;$('#searchTiming').textContent=`首批题库 ${(performance.now()-loadStarted)/1000<1?'< 1':((performance.now()-loadStarted)/1000).toFixed(1)} 秒就绪`;}
          renderScope();loadingStatus();
          if(state.view==='library')renderLibrary();if(state.view==='saved')renderSaved();
          if(state.pendingSearch){state.pendingSearch=false;void runSearch()}
        });
        appendQueue=adding.catch(()=>{});await adding;
      }catch(error){console.warn('Subject loading failed:',code,error);if(!state.loadWarnings.includes(code))state.loadWarnings.push(code);loadingStatus();throw error}
      finally{subjectJobs.delete(code)}
    })();subjectJobs.set(code,job);return job;
  }));
}
async function loadRemaining(){
  if(!corpusLoader||loadingRemaining)return loadingRemaining;
  loadingRemaining=(async()=>{
    const attempted=new Set();
    while(true){
      const next=prioritizeSubjects(state.scopedCodes.filter(c=>!loadedCodes.has(c)&&!attempted.has(c)&&state.manifest.subjects.some(s=>s.code===c))).slice(0,3);
      if(!next.length)break;next.forEach(c=>attempted.add(c));await loadSubjects(next);
    }
    loadingStatus();if(state.query)void runSearch();
  })();
  try{await loadingRemaining}finally{loadingRemaining=null}
}
async function initialize(){
  void configureEnhancements();
  try{
    try{state.db=await openDB();[state.localPapers,state.localRecords]=await Promise.all([dbAll('papers'),dbAll('records')])}catch(e){toast('本机数据库不可用，内置题库仍可搜索。')}
    const response=await fetch('data/manifest.json');if(!response.ok)throw new Error('题库清单加载失败');state.manifest=await response.json();
    state.papers=new Map([...state.manifest.papers,...state.localPapers].map(p=>[p.id,p]));
    corpusLoader=new CorpusLoader(state.manifest,{cache:await openCorpusCache(),fetcher:fetch});
    state.records=state.localRecords.map(r=>({...r,level:meta(r.code).level}));
    await engineRequest('build',{records:state.records});state.ready=!!state.records.length;
    renderScope();setView(location.hash.slice(1)||'search');renderImported();updateSavedCount();loadingStatus();
    const first=prioritizeSubjects(state.scopedCodes.filter(c=>state.manifest.subjects.some(s=>s.code===c))).slice(0,4);
    await loadSubjects(first);
    void loadRemaining();
  }catch(e){$('#corpusNote').textContent='题库加载失败，请刷新页面重试。';$('#rangeLabel').textContent='加载失败';$('#resultsList').innerHTML=`<div class="error-box">${esc(e.message)}。请检查网络后刷新。</div>`;toast(e.message)}
}
// Image OCR runs locally; optional LLM extraction sends the selected crop to the configured service.
let sourceImage=null,rotation=0,crop=null,pointerStart=null;
const canvas=$('#imageCanvas'),ctx=canvas.getContext('2d');
function drawImage(){if(!sourceImage)return;const swap=rotation%180!==0;canvas.width=swap?sourceImage.height:sourceImage.width;canvas.height=swap?sourceImage.width:sourceImage.height;ctx.save();ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(rotation*Math.PI/180);ctx.drawImage(sourceImage,-sourceImage.width/2,-sourceImage.height/2);ctx.restore();if(crop){ctx.fillStyle='#314c3622';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='#4b812e';ctx.lineWidth=Math.max(3,canvas.width/300);ctx.strokeRect(crop.x,crop.y,crop.w,crop.h)}}
async function loadImage(file){if(!file?.type.startsWith('image/')){toast('请选择图片文件。');return}if(file.size>30*1024*1024){toast('图片超过 30 MB，请压缩后上传。');return}cancelRecognition();try{let bitmap=await createImageBitmap(file);const scale=Math.min(1,4000/Math.max(bitmap.width,bitmap.height));const c=document.createElement('canvas');c.width=Math.round(bitmap.width*scale);c.height=Math.round(bitmap.height*scale);c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);bitmap.close();sourceImage=c;rotation=0;crop=null;$('#ocrReview').hidden=true;$('#ocrRawText').textContent='';$('#queryWrap').hidden=false;$('#imageEditor').hidden=false;$('#imageDrop').hidden=true;drawImage();$('#ocrStatus').textContent='框选题干可减少背景干扰；也可以直接识别整张图片。';setMode('photo')}catch{toast('无法读取此图片，请使用 JPG、PNG 或 WebP。')}}
function point(e){const b=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(canvas.width,(e.clientX-b.left)*canvas.width/b.width)),y:Math.max(0,Math.min(canvas.height,(e.clientY-b.top)*canvas.height/b.height))}}
canvas.addEventListener('pointerdown',e=>{if(!sourceImage)return;cancelRecognition();pointerStart=point(e);canvas.setPointerCapture(e.pointerId);crop=null});canvas.addEventListener('pointermove',e=>{if(!pointerStart)return;const p=point(e);crop={x:Math.min(p.x,pointerStart.x),y:Math.min(p.y,pointerStart.y),w:Math.abs(p.x-pointerStart.x),h:Math.abs(p.y-pointerStart.y)};drawImage()});canvas.addEventListener('pointerup',()=>{pointerStart=null;if(crop&&(crop.w<20||crop.h<20)){crop=null;drawImage()}});canvas.addEventListener('pointercancel',()=>{pointerStart=null});
let enhancementConfig={llm:{available:false},pdfPreview:false},llmSettings={},activeRecognition=null,photoRevision=0;
let detailPreview=null,recognitionSearchText='';
const resultPreviews=new Map();
let warmOCRPromise=null,warmOCRWorker=null;
function prepareOCR(){
  if(!warmOCRPromise){
    if(!globalThis.Tesseract)return Promise.reject(new Error('OCR 引擎尚未加载，请刷新重试。'));
    warmOCRPromise=Tesseract.createWorker('eng',1,{workerPath:new URL('vendor/worker.min.js',location.href).href,corePath:new URL('vendor/',location.href).href,langPath:new URL('vendor/',location.href).href,logger:m=>{
      const job=activeRecognition;
      if(job&&photoRevision===job.revision)$('#ocrStatus').textContent='OCR · '+({'loading tesseract core':'加载引擎','loading language traineddata':'加载英文模型','initializing api':'初始化','recognizing text':'识别题干'}[m.status]||'准备识别')+(m.progress!=null?' '+Math.round(m.progress*100)+'%':'');
    }}).then(worker=>{warmOCRWorker=worker;return worker}).catch(error=>{warmOCRPromise=null;throw error});
  }
  return warmOCRPromise;
}
function previewOptions(){return {pdfjs,getPaper:paper,getConfig:()=>enhancementConfig}}
function clearResultPreviews(){for(const preview of resultPreviews.values())preview.clear();resultPreviews.clear()}
function showResultPreview(id,toggle=false){
  const record=state.results.find(r=>r.id===id)||state.records.find(r=>r.id===id);if(!record)return;
  const container=state.view==='saved'?'#savedList':'#resultsList';
  const root=$(container+' [data-preview-pane="'+CSS.escape(id)+'"]'),button=$(container+' [data-preview="'+CSS.escape(id)+'"]');if(!root)return;
  let preview=resultPreviews.get(id);
  if(toggle&&preview&&!root.hidden){preview.clear();resultPreviews.delete(id);if(button){button.textContent='展开原卷小问';button.setAttribute('aria-expanded','false')}return}
  if(!preview){preview=new PaperPreview(root,previewOptions());resultPreviews.set(id,preview)}
  if(button){button.textContent='收起原卷预览';button.setAttribute('aria-expanded','true')}
  void preview.show(record,undefined,{query:state.query}).catch(()=>{});
}
function getDetailPreview(){return detailPreview||(detailPreview=new PaperPreview($('#detailPreview'),previewOptions()))}
async function configureEnhancements(){
  try{llmSettings=JSON.parse(sessionStorage.getItem('pt-llm-settings')||'{}')}catch{llmSettings={}}
  $('#llmBase').value=llmSettings.base||DEFAULT_API_BASE;$('#llmKey').value=llmSettings.key||'';
  $('#llmEnabled').checked=!!llmSettings.key;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2500);
  try{const response=await fetch('api/config',{signal:controller.signal});if(response.ok){const config=await response.json();if(config.llm&&typeof config.pdfPreview==='boolean')enhancementConfig=config}}catch{}finally{clearTimeout(timer)}
  if(!enhancementConfig.llm.available){
    try{const response=await fetch('hosting.json');if(response.ok){const hosting=await response.json();if(hosting.personalOcrRelay)enhancementConfig.personalOcrRelay=apiBase(hosting.personalOcrRelay);if(!enhancementConfig.pdfPreview&&hosting.pdfPreviewBase){enhancementConfig.pdfPreviewBase=apiBase(hosting.pdfPreviewBase);enhancementConfig.pdfPreview=true}}}catch{}
  }
  const shared=enhancementConfig.llm.available;
  $('#llmPersonal').hidden=shared;$('#llmEnabled').checked=shared||!!llmSettings.key;
  $('#llmHint').textContent=shared?'本站已提供 LLM 识别，勾选后会将所选题目图片发送至识别服务。':'填写自己的 API Key 后启用；密钥仅保留在当前标签页会话。默认 API 通过本站 HTTPS 服务转发图片和本次密钥。';
  $('#recognitionBadge').textContent='本机 OCR · 可并行 LLM';
}
function saveLLMSettings(){
  try{const base=apiBase($('#llmBase').value),key=$('#llmKey').value.trim();llmSettings={base,key};sessionStorage.setItem('pt-llm-settings',JSON.stringify(llmSettings));$('#llmEnabled').checked=!!key;toast(key?'LLM 已启用，当前标签页可使用。':'已清除 API Key。')}catch(error){toast(error.message)}
}
function cancelRecognition(){
  photoRevision++;recognitionSearchText='';const job=activeRecognition;if(job){job.controller.abort();if(job.worker){if(warmOCRWorker===job.worker){warmOCRWorker=null;warmOCRPromise=null}job.worker.terminate().catch(()=>{})}activeRecognition=null}
  $('#recognizeImage').disabled=false;$('#ocrSources').hidden=true;$('#llmProgress').hidden=true;$('#llmProgress').textContent='';
}
function recognitionCanvas(maxEdge){
  const area=crop&&crop.w>20&&crop.h>20?crop:{x:0,y:0,w:canvas.width,h:canvas.height};
  const scratch=document.createElement('canvas');scratch.width=canvas.width;scratch.height=canvas.height;
  const context=scratch.getContext('2d');context.translate(scratch.width/2,scratch.height/2);context.rotate(rotation*Math.PI/180);context.drawImage(sourceImage,-sourceImage.width/2,-sourceImage.height/2);
  const output=document.createElement('canvas'),scale=Math.min(maxEdge===2400?2:1,maxEdge/Math.max(area.w,area.h));output.width=Math.max(1,Math.round(area.w*scale));output.height=Math.max(1,Math.round(area.h*scale));
  const target=output.getContext('2d');target.fillStyle='white';target.fillRect(0,0,output.width,output.height);target.drawImage(scratch,area.x,area.y,area.w,area.h,0,0,output.width,output.height);return output;
}
function applyRecognition(job,source){
  if(!job||activeRecognition!==job||!job.results[source])return;
  const text=job.results[source].text,cleaned=recognitionPresentation(text);job.selected=source;recognitionSearchText=cleaned.searchText.slice(0,8000);
  $('#query').value=cleaned.text.slice(0,8000);$('#ocrRawText').textContent=text;$('#ocrRaw').open=false;
  const photoMode=$('.search-tab.active')?.dataset.mode==='photo';
  $('#ocrReadable').innerHTML=readableHTML($('#query').value)||'<p class="reading-empty">已保留识别内容用于匹配，可在下方查看原卷。</p>';$('#ocrReview').hidden=!photoMode;$('#queryWrap').hidden=photoMode;$('#editOCR').textContent='修改识别文字';
  $('#ocrSummary').textContent=(source==='llm'?'LLM':'OCR')+' · '+(job.results[source].ms/1000).toFixed(1)+' 秒 · '+'已显示可读题干，完整识别内容用于匹配。';
  $('#useOCR').classList.toggle('primary',source==='ocr');$('#useLLM').classList.toggle('primary',source==='llm');
  void runSearch();
}
async function recognize(){
  if(!sourceImage)return;
  cancelRecognition();const job=activeRecognition={controller:new AbortController(),results:{},selected:'',edited:false,revision:photoRevision};
  const current=()=>activeRecognition===job&&photoRevision===job.revision;
  $('#recognizeImage').disabled=true;$('#ocrSources').hidden=false;$('#useOCR').disabled=true;$('#useLLM').disabled=true;
  $('#ocrStatus').textContent='本机 OCR 正在识别…';$('#llmStatus').textContent='';
  const jobs={ocr:async()=>{
    if(!globalThis.Tesseract)throw new Error('OCR 引擎尚未加载，请刷新重试。');
    const output=recognitionCanvas(2400);
    const worker=await prepareOCR();if(!current())throw new Error('已取消');job.worker=worker;
    try{return (await worker.recognize(output)).data.text}catch(error){if(warmOCRWorker===worker){warmOCRWorker=null;warmOCRPromise=null;await worker.terminate().catch(()=>{})}throw error}finally{job.worker=null}
  }};
  if($('#llmEnabled').checked){
    if(enhancementConfig.llm.available||llmSettings.key){
      const image=recognitionCanvas(1280).toDataURL('image/jpeg',0.82);$('#llmStatus').textContent='LLM · 正在快速提取…';
      jobs.llm=()=>extractWithLLM(image,{server:enhancementConfig.llm.available,key:llmSettings.key,base:llmSettings.base,relay:enhancementConfig.personalOcrRelay,signal:job.controller.signal,onStatus:message=>{if(current())$('#llmStatus').textContent='LLM · '+message},onProgress:text=>{if(current()){$('#llmProgress').hidden=false;$('#llmProgress').textContent=recognitionPresentation(text).text}}});
    }else $('#llmStatus').textContent='LLM · 请填写并保存 API Key；OCR 已继续。';
  }
  try{await parallelRecognition(jobs,{isCurrent:current,onResult:(source,text,ms)=>{
    job.results[source]={text,ms};$('#'+(source==='ocr'?'ocrStatus':'llmStatus')).textContent=(source==='ocr'?'OCR':'LLM')+' · 已完成 · '+(ms/1000).toFixed(1)+' 秒';
    $('#'+(source==='ocr'?'useOCR':'useLLM')).disabled=false;
    if(source==='llm')$('#llmProgress').hidden=true;
    if(!job.selected&&!job.edited)applyRecognition(job,source);
  },onError:(source,error)=>{$('#'+(source==='ocr'?'ocrStatus':'llmStatus')).textContent=(source==='ocr'?'OCR':'LLM')+' · '+error.message.replace(/^LLM[ ·：:]*/,'');if(source==='llm')$('#llmProgress').hidden=true}})}finally{if(current())$('#recognizeImage').disabled=false}
}

function setMode(mode){$$('.search-tab').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-selected',b.dataset.mode===mode)});$('#photoArea').hidden=mode!=='photo';$('#ocrReview').hidden=mode!=='photo'||!$('#ocrRawText').textContent;$('#queryWrap').hidden=mode==='photo'&&!!$('#ocrRawText').textContent;if(mode==='text'){recognitionSearchText='';$('#query').focus();}else void prepareOCR().catch(()=>{})}
// Batch PDF imports: filename metadata, geometric question splitting, local MS matching.
let pdfjsPromise;async function pdfjs(){if(!pdfjsPromise)pdfjsPromise=import('./vendor/pdf.mjs').then(m=>{m.GlobalWorkerOptions.workerSrc=new URL('vendor/pdf-worker.mjs',location.href).href;return m});return pdfjsPromise}

async function pdfRows(file){const lib=await pdfjs();const doc=await lib.getDocument({data:await file.arrayBuffer(),standardFontDataUrl:new URL('vendor/standard_fonts/',location.href).href}).promise;try{const pages=[];for(let n=1;n<=doc.numPages;n++){const p=await doc.getPage(n),content=await p.getTextContent();pages.push(pdfTextRows(content.items,p.getViewport({scale:1}),lib.Util.transform))}return pages}finally{await doc.destroy()}}


async function importPDFs(files){if(!files.length)return;if(state.importing){toast('请等待当前导入完成。');return}if(!state.ready){toast('请等待题库加载完成。');return}if(!state.db){toast('本机数据库不可用，无法导入。');return}state.importing=true;$('#pdfInput').disabled=true;$('#importProgress').hidden=false;$('#importLog').textContent='';let ok=0;const log=t=>$('#importLog').textContent+=t+'\n';try{const ordered=[...files].sort((a,b)=>(fileMetadata(a.name)?.type==='ms'?1:0)-(fileMetadata(b.name)?.type==='ms'?1:0));for(let i=0;i<ordered.length;i++){const f=ordered[i],m=fileMetadata(f.name);$('#importProgress').value=i/ordered.length*100;if(!m){log('跳过 '+f.name+'：文件名需为 9702_s24_qp_22.pdf 格式。');continue}if(f.size>30*1024*1024){log('跳过 '+f.name+'：超过 30 MB。');continue}try{log('正在提取 '+f.name+'…');const pages=await pdfRows(f),old=state.papers.get(m.id),p={...(old||{}),id:m.id,code:m.code,year:m.year,session:m.session,component:m.component,pages:pages.length,questions:old?.questions||0,local:true};let records=[];if(m.type==='qp'){records=splitPDF(pages,m);if(!records.length){log('未导入 '+f.name+'：无可提取题干，可能是扫描版。请使用拍照识别。');continue}p.qpBlob=f;p.questions=records.length;const previous=new Map([...state.records,...state.localRecords].filter(r=>r.paperId===m.id).map(r=>[r.id,r.msPage]));records=records.map(r=>({...r,msPage:previous.get(r.id)||null}));if(old?.msBlob){try{records=mapMS(await pdfRows(old.msBlob),records)}catch{}}}else{p.pages=old?.pages||0;p.msPages=pages.length;p.msBlob=f;p.msVerified=true;records=mapMS(pages,[...new Map([...state.records,...state.localRecords].map(r=>[r.id,r])).values()].filter(r=>r.paperId===m.id))}await persist([p],records);const urlKey=p.id+m.type;if(state.blobUrls.has(urlKey)){URL.revokeObjectURL(state.blobUrls.get(urlKey));state.blobUrls.delete(urlKey)}state.papers.set(p.id,p);state.localRecords=state.localRecords.filter(r=>r.paperId!==p.id);for(const r of records){const idx=state.localRecords.findIndex(x=>x.id===r.id);if(idx>=0)state.localRecords[idx]=r;else state.localRecords.push(r)}const idx=state.localPapers.findIndex(x=>x.id===p.id);if(idx>=0)state.localPapers[idx]=p;else state.localPapers.push(p);ok++;log('完成 '+f.name+(m.type==='qp'?' · '+records.length+' 条索引':' · MS 已配对'))}catch(e){log('失败 '+f.name+'：'+e.message)}}await refreshLocal();$('#importProgress').value=100;log('完成：'+ok+' / '+ordered.length+' 个文件已保存。');toast('导入完成，已更新搜索题库。')}finally{state.importing=false;$('#pdfInput').disabled=false;$('#pdfInput').value=''}}
function exportIndex(){const papers=state.localPapers.map(({qpBlob,msBlob,...p})=>p);const data=JSON.stringify({format:'papertrace-index-v1',exportedAt:new Date().toISOString(),papers,records:state.localRecords},null,2);const u=URL.createObjectURL(new Blob([data],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='PaperTrace_local_index.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);toast('已导出索引文字；本地原 PDF 需另行保留。')}

async function importJSON(file){if(state.importing||!state.ready){toast('请等待题库加载或当前导入完成。');$('#jsonInput').value='';return}state.importing=true;try{if(file.size>60*1024*1024)throw new Error('JSON 文件最大 60 MB');const d=JSON.parse(await file.text());const {papers,records}=validateImportedIndex(d,state.localPapers);await persist(papers,records);await refreshLocal();toast('已导入 '+records.length+' 条索引。')}catch(e){toast('导入失败：'+e.message)}finally{state.importing=false;$('#jsonInput').value=''}}
// Event wiring.
$('#editOCR').onclick=()=>{const editing=$('#queryWrap').hidden;$('#queryWrap').hidden=!editing;$('#editOCR').textContent=editing?'完成修改':'修改识别文字';if(editing)$('#query').focus();else $('#ocrReadable').innerHTML=readableHTML($('#query').value)};
$('#searchOCR').onclick=runSearch;
$('#saveLLM').onclick=saveLLMSettings;
$('#clearLLM').onclick=()=>{$('#llmKey').value='';llmSettings={};try{sessionStorage.removeItem('pt-llm-settings')}catch{}$('#llmEnabled').checked=false;toast('已清除 API Key。')};
$('#useOCR').onclick=()=>applyRecognition(activeRecognition,'ocr');
$('#useLLM').onclick=()=>applyRecognition(activeRecognition,'llm');
$('#query').addEventListener('input',()=>{recognitionSearchText='';if(activeRecognition)activeRecognition.edited=true});
$('#detailDialog').addEventListener('close',()=>detailPreview?.clear());

$('#scopeAll').onclick=()=>changeScope({mode:'all'});
$('#scopeReset').onclick=()=>changeScope({mode:'scie'});
$('#extraSubjects').onchange=e=>{const code=e.target.dataset.extraCode;if(!code)return;const extras=new Set(state.scopedCodes.filter(c=>!isScieSubject(c)));if(e.target.checked)extras.add(code);else extras.delete(code);changeScope({mode:'scie',extraCodes:[...extras]})};
$('#resultsList').addEventListener('click',e=>{if(e.target.closest('[data-expand-scope]'))changeScope({mode:'all'})});

$$('.nav').forEach(b=>b.onclick=()=>setView(b.dataset.view));$$('[data-goto]').forEach(b=>b.onclick=()=>setView(b.dataset.goto));$('.brand').onclick=e=>{e.preventDefault();setView('search')};$$('.search-tab').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));$('#searchButton').onclick=runSearch;$('#query').onkeydown=e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();runSearch()}};$$('[data-query]').forEach(b=>b.onclick=()=>{recognitionSearchText='';$('#query').value=b.dataset.query;runSearch()});$('#levelTabs').onclick=e=>{const b=e.target.closest('[data-level]');if(!b)return;state.level=b.dataset.level;$$('.level').forEach(el=>el.classList.toggle('active',el===b));if(state.query)runSearch()};['subjectFilter','yearFilter','seasonFilter','paperFilter'].forEach(id=>$('#'+id).onchange=()=>{if(state.query)runSearch()});$('#clearFilters').onclick=()=>{['subjectFilter','yearFilter','seasonFilter','paperFilter'].forEach(id=>$('#'+id).value='');state.level='';$$('.level').forEach(el=>el.classList.toggle('active',el.dataset.level===''));if(state.query)runSearch()};$('#sortSelect').onchange=renderResults;$('#loadMore').onclick=()=>{state.shown+=20;renderResults()};$('#paperSearch').oninput=renderPaperTable;
document.addEventListener('click',async e=>{const preview=e.target.closest('[data-preview]');if(preview)showResultPreview(preview.dataset.preview,true);const save=e.target.closest('[data-save]'),detail=e.target.closest('[data-detail]'),copy=e.target.closest('[data-copy]');if(save)toggleSave(save.dataset.save);if(detail)showDetail(detail.dataset.detail);if(copy){const r=state.records.find(r=>r.id===copy.dataset.copy);if(r){const text=`${r.id}\n${r.code}/${r.component} ${seasons[r.session]} ${r.year} ${r.question?'Question '+r.question:'Page '+r.page}\n${paperUrl(paper(r),'qp',r.page)||''}\n${paperUrl(paper(r),'ms',r.msPage)||''}`;try{await navigator.clipboard.writeText(text);toast('已复制来源编号和链接。')}catch{toast('剪贴板不可用，请手动复制上方编号。')}}}});
$('#helpButton').onclick=()=>$('#helpDialog').showModal();$('#closeHelp').onclick=()=>$('#helpDialog').close();$('#closeDetail').onclick=()=>$('#detailDialog').close();$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}}));document.addEventListener('keydown',e=>{if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&!$('dialog[open]')){e.preventDefault();setView('search');$('#query').focus()}});
$('#chooseImage').onclick=e=>{e.stopPropagation();$('#imageInput').click()};$('#samplePhoto').onclick=async e=>{e.stopPropagation();try{const r=await fetch('sample-question.png');if(!r.ok)throw new Error();await loadImage(new File([await r.blob()],'9702_s24_qp_22-Q2.png',{type:'image/png'}));$('#ocrStatus').textContent='示例来源：9702_s24_qp_22 Q2 · 点击识别文字体验完整流程'}catch{toast('示例图片加载失败。')}};$('#takePhoto').onclick=e=>{e.stopPropagation();$('#cameraInput').click()};$('#imageDrop').onclick=()=>$('#imageInput').click();$('#imageDrop').onkeydown=e=>{if(e.key==='Enter')$('#imageInput').click()};['imageInput','cameraInput'].forEach(id=>$('#'+id).onchange=e=>{loadImage(e.target.files[0]);e.target.value=''});$('#imageDrop').ondragover=e=>{e.preventDefault();$('#imageDrop').classList.add('drag')};$('#imageDrop').ondragleave=()=>$('#imageDrop').classList.remove('drag');$('#imageDrop').ondrop=e=>{e.preventDefault();$('#imageDrop').classList.remove('drag');loadImage(e.dataTransfer.files[0])};document.addEventListener('paste',e=>{if(state.view!=='search')return;const item=[...e.clipboardData.items].find(i=>i.type.startsWith('image/'));if(item){e.preventDefault();loadImage(item.getAsFile())}});$('#changeImage').onclick=()=>$('#imageInput').click();$('#rotateImage').onclick=()=>{cancelRecognition();rotation=(rotation+90)%360;crop=null;drawImage()};$('#resetCrop').onclick=()=>{cancelRecognition();crop=null;drawImage()};$('#recognizeImage').onclick=recognize;
$('#sampleImport').onclick=async()=>{const b=$('#sampleImport');if($('#pdfInput').disabled)return;b.disabled=true;try{const names=['9702_s24_qp_22.pdf','9702_s24_ms_22.pdf'],files=await Promise.all(names.map(async name=>{const r=await fetch('examples/'+name);if(!r.ok)throw new Error('示例试卷加载失败');return new File([await r.blob()],name,{type:'application/pdf'})}));await importPDFs(files)}catch(e){toast(e.message)}finally{b.disabled=false}};$('#pdfInput').onchange=e=>importPDFs(e.target.files);$('#exportIndex').onclick=exportIndex;$('#chooseJson').onclick=()=>$('#jsonInput').click();$('#jsonInput').onchange=e=>{if(e.target.files[0])importJSON(e.target.files[0])};$('#deleteImports').onclick=async()=>{if(state.importing){toast('请等待当前导入完成。');return}if(!state.localPapers.length){toast('暂无本机导入记录。');return}if(!confirm('清除当前浏览器中导入的 PDF 和题目索引？内置题库和收藏编号会保留。'))return;try{await new Promise((resolve,reject)=>{const tx=state.db.transaction(['papers','records'],'readwrite');tx.objectStore('papers').clear();tx.objectStore('records').clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});state.blobUrls.forEach(u=>URL.revokeObjectURL(u));state.blobUrls.clear();await refreshLocal();toast('已清除本机导入。')}catch(e){toast('清除失败：'+e.message)}};
initialize();


