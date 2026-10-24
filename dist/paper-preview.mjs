export function previewPage(record,page=record.page){
  const start=Math.max(1,Number(record.page)||1),end=Math.max(start,Number(record.endPage)||start);
  return Math.max(start,Math.min(end,Number(page)||start));
}
export function serverPageURL(record,page){
  return 'api/paper-page?'+new URLSearchParams({paper:record.paperId,page:String(previewPage(record,page))});
}

// Every pane owns its cancellation token so late downloads cannot replace a newer question.
export class PaperPreview{
  constructor(root,{pdfjs,getPaper,getConfig}){this.root=root;this.pdfjs=pdfjs;this.getPaper=getPaper;this.getConfig=getConfig;this.serial=0;this.urls=[]}
  clear(){this.serial++;this.controller?.abort();this.renderTask?.cancel();this.loadingTask?.destroy().catch(()=>{});for(const url of this.urls)URL.revokeObjectURL(url);this.urls=[];this.root.replaceChildren();this.root.hidden=true;this.key=''}
  async show(record,requestedPage,{force=false,query='',full=false}={}){
    if(!record){this.clear();return}
    let page=previewPage(record,requestedPage),plan={mode:'page',label:'',page,pages:Array.from({length:(record.endPage||record.page)-record.page+1},(_,i)=>record.page+i)};
    const key=JSON.stringify([record.id,requestedPage,query,full]);if(key===this.key&&!force)return;
    this.clear();this.key=key;this.root.hidden=false;const serial=this.serial,current=()=>this.serial===serial;
    const controller=this.controller=new AbortController(),paper=this.getPaper(record),config=this.getConfig();
    const resource=path=>config.pdfPreviewBase?new URL(path,config.pdfPreviewBase+'/').href:path;
    const url=paper.qpBlob?URL.createObjectURL(paper.qpBlob):paper.qp;
    if(paper.qpBlob)this.urls.push(url);
    if(!url||!(/^(https:|blob:)/.test(url))){this.root.textContent='暂无原卷预览，可阅读题干摘要。';return}
    const head=document.createElement('div');head.className='preview-heading';
    const identity=document.createElement('div'),title=document.createElement('strong'),source=document.createElement('span');source.className='preview-source';
    identity.append(title,source);head.append(identity);
    const controls=document.createElement('div');controls.className='preview-controls';head.append(controls);
    const status=document.createElement('p');status.className='preview-status';status.setAttribute('role','status');status.textContent='正在定位对应小问…';
    const view=document.createElement('div');view.className='preview-page';this.root.append(head,status,view);
    const heading=()=>{
      title.textContent=(plan.label?'Question '+plan.label:record.question?'Question '+record.question:'原卷题目')+' · '+(plan.mode==='part'?'小问预览':plan.mode==='question'?'题目预览':'整页预览');
      source.textContent=record.paperId+'.pdf · 第 '+page+' 页';view.dataset.mode=plan.mode;controls.replaceChildren();
      const position=plan.pages.indexOf(page);
      for(const [label,target,disabled] of [['上一页',plan.pages[position-1],position<=0],['下一页',plan.pages[position+1],position>=plan.pages.length-1]]){
        if(plan.pages.length<2)continue;
        const button=document.createElement('button');button.className='btn small';button.textContent=label;button.disabled=disabled;button.onclick=()=>this.show(record,target,{query,full});controls.append(button);
      }
      if(plan.mode!=='page'||full){const toggle=document.createElement('button');toggle.className='btn small';toggle.textContent=full?'返回小问':'查看整页';toggle.onclick=()=>this.show(record,page,{query,full:!full});controls.append(toggle)}
      const original=document.createElement('a');original.className='btn small';original.textContent='打开原卷 ↗';original.href=url.split('#')[0]+'#page='+page;original.target='_blank';original.rel='noopener noreferrer';controls.append(original);
    };
    heading();const timer=setTimeout(()=>controller.abort(),30000);
    try{
      if(!paper.qpBlob&&config.pdfPreview){
        try{
          const response=await fetch(resource('api/paper-preview'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({record:record.id,query:query.slice(0,8000),page:requestedPage,full}),signal:controller.signal});
          if(!response.ok)throw new Error('定位未完成');
          const selected=await response.json();if(selected.record!==record.id)throw new Error('来源不一致');
          plan=selected;page=selected.page;
        }catch(error){if(controller.signal.aborted)throw error}
        if(!current())return;heading();
        const response=await fetch(resource(plan.image||serverPageURL(record,page)),{signal:controller.signal});if(!response.ok)throw new Error('原卷图片暂不可用');
        const imageURL=URL.createObjectURL(await response.blob());if(!current()){URL.revokeObjectURL(imageURL);return}this.urls.push(imageURL);
        const image=document.createElement('img');image.alt=`${record.paperId} ${plan.label?'Question '+plan.label:'第 '+page+' 页'}`;image.src=imageURL;await image.decode();if(!current())return;view.replaceChildren(image);
      }else{
        const lib=await this.pdfjs();if(!current())return;
        const loading=this.loadingTask=lib.getDocument({url,standardFontDataUrl:new URL('vendor/standard_fonts/',location.href).href,rangeChunkSize:65536,disableAutoFetch:true,disableStream:true});
        const abort=()=>{loading.destroy().catch(()=>{})};controller.signal.addEventListener('abort',abort,{once:true});
        try{
          const doc=await loading.promise;if(!current())return;
          const pdfPage=await doc.getPage(page);if(!current())return;
          const viewport=pdfPage.getViewport({scale:Math.min(1.6,1400/pdfPage.getViewport({scale:1}).height)});
          const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);canvas.setAttribute('aria-label',`${record.paperId} 第 ${page} 页`);
          this.renderTask=pdfPage.render({canvasContext:canvas.getContext('2d'),viewport});await this.renderTask.promise;if(!current())return;view.replaceChildren(canvas);
        }finally{controller.signal.removeEventListener('abort',abort);await loading.destroy().catch(()=>{});if(this.loadingTask===loading)this.loadingTask=null;this.renderTask=null}
      }
      status.textContent=plan.mode==='part'?'已定位小问 '+plan.label:plan.mode==='question'?'已定位题目 '+plan.label:full?'正在查看原卷整页':'未定位到明确小问，显示对应原卷整页';
    }catch(error){
      if(!current())return;
      plan.mode='page';plan.label='';heading();status.textContent='已切换到对应原卷第 '+page+' 页';
      const frame=document.createElement('iframe');frame.title=`${record.paperId} 第 ${page} 页 PDF`;frame.src=url.split('#')[0]+`#page=${page}&view=FitH&toolbar=0`;frame.referrerPolicy='no-referrer';view.replaceChildren(frame);
    }finally{clearTimeout(timer)}
  }
}
