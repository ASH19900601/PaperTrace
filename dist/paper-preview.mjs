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
  async show(record,page=record?.page,{force=false}={}){
    if(!record){this.clear();return}
    page=previewPage(record,page);const key=record.id+':'+page;
    if(key===this.key&&!force)return;
    this.clear();this.key=key;this.root.hidden=false;const serial=this.serial,current=()=>this.serial===serial;
    const controller=this.controller=new AbortController(),paper=this.getPaper(record);
    const url=paper.qpBlob?URL.createObjectURL(paper.qpBlob):paper.qp;
    if(paper.qpBlob)this.urls.push(url);
    if(!url||!(/^(https:|blob:)/.test(url))){this.root.textContent='暂无原卷预览，可阅读下方题干。';return}
    const head=document.createElement('div');head.className='preview-heading';
    const title=document.createElement('strong');title.textContent=`原卷预览 · 第 ${page} 页`;head.append(title);
    const controls=document.createElement('div');controls.className='preview-controls';
    for(const [label,target,disabled] of [['上一页',page-1,page<=record.page],['下一页',page+1,page>=(record.endPage||record.page)]]){
      const button=document.createElement('button');button.className='btn small';button.textContent=label;button.disabled=disabled;button.onclick=()=>this.show(record,target);controls.append(button);
    }
    const original=document.createElement('a');original.className='btn small';original.textContent='打开原卷 ↗';original.href=url.split('#')[0]+'#page='+page;original.target='_blank';original.rel='noopener noreferrer';controls.append(original);head.append(controls);
    const status=document.createElement('p');status.className='preview-status';status.setAttribute('role','status');status.textContent='正在从来源网站加载原卷页面…';
    const view=document.createElement('div');view.className='preview-page';this.root.append(head,status,view);
    const timer=setTimeout(()=>controller.abort(),20000);
    try{
      if(!paper.qpBlob&&this.getConfig().pdfPreview){
        const previewBase=this.getConfig().pdfPreviewBase;
        const endpoint=previewBase?new URL(serverPageURL(record,page),previewBase+'/').href:serverPageURL(record,page);
        const response=await fetch(endpoint,{signal:controller.signal});if(!response.ok)throw new Error('原卷图片暂不可用');
        const imageURL=URL.createObjectURL(await response.blob());if(!current()){URL.revokeObjectURL(imageURL);return}this.urls.push(imageURL);
        const image=document.createElement('img');image.alt=`${record.paperId} 第 ${page} 页`;image.src=imageURL;await image.decode();if(!current())return;view.replaceChildren(image);
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
      status.textContent='原卷页面已加载';
    }catch(error){
      if(!current())return;
      status.textContent='正在使用原卷阅读器预览；下方题干和搜索结果可继续使用。';
      const frame=document.createElement('iframe');frame.title=`${record.paperId} 第 ${page} 页 PDF`;frame.src=url.split('#')[0]+`#page=${page}&view=FitH&toolbar=0`;frame.referrerPolicy='no-referrer';view.replaceChildren(frame);
    }finally{clearTimeout(timer)}
  }
}
