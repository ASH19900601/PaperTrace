import {recognitionPresentation} from './readability.mjs?v=20261024-4';

const furniture=/UCLES|DO NOT WRITE|BLANK PAGE|Turn over|Permission to reproduce|^\*\s*\d{8,}\s*\*|^\d{4}\/\d{2}\/|^Page \d+ of \d+|[\u0000-\u0008]/i;
const letters=s=>(s.match(/[\p{L}]/gu)||[]).length;

export function mergeTextLines(lines){
  const input=lines.flatMap(line=>line.parts?.length?line.parts:[line]).map(line=>{
    const b=line.box||[],xs=b.map(p=>p[0]),ys=b.map(p=>p[1]);
    return {text:String(line.text||'').trim(),confidence:line.confidence??1,x:line.x??Math.min(...xs),y:line.y??Math.min(...ys),width:line.width??Math.max(...xs)-Math.min(...xs),height:line.height??Math.max(...ys)-Math.min(...ys)};
  }).filter(l=>l.text&&Number.isFinite(l.x)&&Number.isFinite(l.y));
  const rows=[];
  for(const line of input.sort((a,b)=>a.y-b.y||a.x-b.x)){
    let row=rows.find(r=>Math.abs((r.y+r.height/2)-(line.y+line.height/2))<=Math.max(3,Math.min(r.height,line.height)*.45));
    if(!row){row={...line,parts:[]};rows.push(row)}
    row.parts.push(line);const right=Math.max(row.x+row.width,line.x+line.width);row.x=Math.min(row.x,line.x);row.width=right-row.x;row.height=Math.max(row.height,line.height);
  }
  return rows.map(r=>({...r,text:r.parts.sort((a,b)=>a.x-b.x).map(p=>p.text).join(' '),confidence:r.parts.reduce((n,p)=>n+p.confidence*p.text.length,0)/r.parts.reduce((n,p)=>n+p.text.length,0)}));
}

export function pdfTextLines(items,viewport,transform){
  return mergeTextLines(items.filter(i=>i.str?.trim()).map(i=>{
    const t=transform(viewport.transform,i.transform),height=Math.hypot(t[2],t[3])||Math.hypot(t[0],t[1]);
    return {text:i.str,confidence:1,x:t[4],y:t[5]-height,height,width:Math.abs(i.width*viewport.scale)};
  })).filter(r=>!furniture.test(r.text)&&!(r.y<viewport.height*.08&&/^\d{1,3}$/.test(r.text)&&r.x>viewport.width*.3));
}

export function nativeTextUsable(lines){
  const text=lines.map(l=>l.text).join(' ');
  return letters(text)>=45&&(text.match(/[\ufffd\u0000-\u0008]/g)||[]).length/Math.max(1,text.length)<.015;
}

export function pdfPageQuestions(lines,page,width,height){
  const text=lines.map(l=>l.text).join('\n');
  const mainQuestion=lines.some(l=>/^\d{1,2}\s+(?:[A-Z]|\(a\))/.test(l.text));
  const instructions=/READ THESE INSTRUCTIONS|Write your name|Write your centre number|INSTRUCTIONS[\s\S]*Answer all questions/i.test(text);
  const reference=lines.some(l=>/^(?:Data|Formulae|Formula sheet|List of formulae|The Periodic Table|Periodic Table of (?:the )?Elements)$/i.test(l.text.trim()));
  const copyright=/publisher will be pleased to make amends|Cambridge Assessment International Education is part of|copyright acknowledgements/i.test(text);
  if(/The Periodic Table of Elements/i.test(text)&&/lanthanoids|actinoids/i.test(text))return [];
  if(!mainQuestion&&(instructions||reference||copyright))return [];
  return splitRecognizedQuestions(text,{lines,page,width,height});
}

export function splitRecognizedQuestions(text,{lines=[],page=1,height=0,width=0,columns=true}={}){
  const merged=lines.length?mergeTextLines(lines):[];
  if(columns&&width&&merged.length){
    const raw=merged.flatMap(r=>r.parts),middle=width/2;
    const crosses=raw.some(r=>r.y>height*.1&&r.x<middle-10&&r.x+r.width>middle+10&&letters(r.text)>12);
    if(!crosses){
      const left=raw.filter(r=>r.x+r.width/2<middle),right=raw.filter(r=>r.x+r.width/2>=middle).map(r=>({...r,x:r.x-middle}));
      const numbered=rows=>mergeTextLines(rows).some(r=>/^\d{1,2}[.)]?\s+/.test(r.text)&&letters(r.text)>8);
      if(numbered(left)&&numbered(right)){
        return [left,right].flatMap(lines=>splitRecognizedQuestions('',{lines,page,width:middle,height,columns:false}));
      }
    }
  }
  let rows=merged.length?merged:String(text).replace(/\r\n?/g,'\n').split('\n').map(text=>({text:text.trim(),confidence:1}));
  const footer=rows.findIndex(r=>/publisher will be pleased to make amends|To avoid the issue of disclosure of answer-related|Copyright Acknowledgements Booklet|Cambridge Assessment International Education is part of/i.test(r.text));
  if(footer>=0)rows=rows.slice(0,footer);
  rows=rows.filter(r=>r.text&&!furniture.test(r.text)&&!/^[_\s.─━|¦-]{6,}$/.test(r.text)&&!(height&&r.y<height*.08&&/^\d{1,3}$/.test(r.text)&&r.x>width*.3));
  const left=merged.length?Math.min(...rows.filter(r=>letters(r.text)>8).map(r=>r.x)):0;
  const anchor=(r,i)=>{
    if(/^<<<QUESTION>>>|^\[Question \d+\]/i.test(r.text))return {number:null};
    const match=r.text.match(/^(?:Question\s+)?(\d{1,2})(?:[.)：:]\s+|\s+|$)(.*)$/i);
    if(!match||+match[1]===0||r.confidence<.45)return null;
    if(Number.isFinite(left)&&Number.isFinite(r.x)&&r.x>left+Math.max(12,width*.025))return null;
    const tail=match[2]||rows[i+1]?.text||'';
    if(letters(tail)<8&&!/^\([a-z]\)/i.test(tail))return null;
    if(/^\d|^[×÷=+−-]|^(?:cm|mm|kg|mol|m s)\b/.test(tail))return null;
    return {number:+match[1]};
  };
  const starts=rows.map((r,i)=>({i,...anchor(r,i)})).filter(s=>'number' in s);
  const groups=starts.length?starts.map((s,n)=>({number:s.number,rows:rows.slice(s.i,starts[n+1]?.i??rows.length)})):[{number:null,rows}];
  if(starts[0]?.i>0){
    const prefix=rows.slice(0,starts[0].i),text=prefix.map(r=>r.text).join('\n');
    if(letters(text)>35&&/[?？]|\b(?:Calculate|Determine|Explain|Which|What)\b/i.test(text))groups.unshift({number:null,rows:prefix});
    else if(letters(text)>20)groups[0].rows.unshift(...prefix);
  }
  return groups.map((g,index)=>{
    const searchText=g.rows.map(r=>r.text).join('\n').replace(/<<<QUESTION>>>|\[Question \d+\]/gi,'')
      .replace(/(\d)[ \t]+(?=(?:[kMµμm]?[JWVF]|[kMµμm]A|[kMµμm]?Hz|[kMµμm]?Pa|kg|g|cm|mm|km|m|s|mol)\b)/g,'$1').trim();
    const confident=g.rows.filter(r=>r.confidence>=.65||/^\d{1,2}\b|^\([a-zivx]+\)/i.test(r.text)).map(r=>/^[A-D]\s+[A-Z]/.test(r.text)?'\n'+r.text:r.text).join('\n');
    const display=recognitionPresentation(confident,{compact:false}).text;
    return {number:g.number,page,endPage:page,text:display||recognitionPresentation(searchText,{compact:false}).text,searchText,label:g.number?'题 '+g.number:'题目 '+(index+1),confidence:g.rows.reduce((s,r)=>s+r.confidence,0)/Math.max(1,g.rows.length)};
  }).filter(q=>letters(q.searchText)>=12&&q.text.trim());
}

export function combinePageQuestions(pages){
  const result=[];
  for(const {questions} of pages){
    for(const q of questions){
      const previous=result.at(-1);
      // A text continuation on the next PDF page belongs to the previous numbered question.
      if(previous&&previous.number&&q.number===null&&q.page===previous.endPage+1){
        previous.text+='\n\n'+q.text;previous.searchText+='\n'+q.searchText;previous.endPage=q.page;
      }else result.push({...q});
    }
  }
  return result;
}

export async function requestFastOCR(image,{signal,fetcher=fetch,timeoutMs=20000}={}){
  const controller=new AbortController(),abort=()=>controller.abort();
  if(signal?.aborted)controller.abort();else signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(abort,timeoutMs);
  try{
    const response=await fetcher('api/vision-ocr',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image}),signal:controller.signal});
    const body=await response.json();if(!response.ok)throw new Error(body.error||'快速 OCR 暂不可用');
    if(!body.text?.trim())throw new Error('未检测到清晰题干');return body;
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
}

export function tesseractLines(data){
  return (data.blocks||[]).flatMap(b=>b.paragraphs||[]).flatMap(p=>p.lines||[]).map(l=>({text:l.text,confidence:l.confidence/100,x:l.bbox.x0,y:l.bbox.y0,width:l.bbox.x1-l.bbox.x0,height:l.bbox.y1-l.bbox.y0}));
}
