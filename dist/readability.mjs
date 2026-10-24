// Presentation only. The source index is never rewritten by these helpers.
export function cleanOCR(text){
  const removed=[];
  const lines=String(text).replace(/\r\n?/g,'\n').split('\n').filter(line=>{
    const words=line.trim().split(/\s+/).filter(Boolean);
    // The observed ruled-background artifact is a run of E/F glyphs. Do not
    // generalize this to DNA bases, variable lists or other meaningful letters.
    const repeated=words.length>=12 && !/\d/.test(line) && words.filter(w=>/^[a-z]{1,2}$/i.test(w)).length/words.length>.8 && words.filter(w=>/^e{1,3}$/i.test(w)).length>=5 && new Set(words.map(w=>w.toLowerCase())).size/words.length<.6;
    const rule=/^[\s._─━|¦-]{8,}$/.test(line);
    if(repeated||rule){removed.push(line);return false}return true;
  });
  return {text:readableBlocks(lines.join('\n')).map(b=>b.text).join('\n\n'),removed};
}

export function readableBlocks(text){
  const lines=String(text).replace(/\r\n?/g,'\n').split('\n').map(s=>s.replace(/[\t ]+/g,' ').trim());
  const blocks=[];let current=null;
  const flush=()=>{if(current)blocks.push(current);current=null};
  for(let i=0;i<lines.length;i++){
    let line=lines[i];
    if(!line){flush();continue}
    if(/^(?:©.*(?:UCLES|Cambridge)|\[?Turn over\]?|BLANK PAGE|DO NOT WRITE IN THIS AREA|\*\d{8,}\*|\d{4}\/\d{2}\/\w\/\w\/\d{2})$/i.test(line))continue;
    if(/^[. _─━]{6,}$/.test(line))continue;
    line=line.replace(/\.{5,}|_{5,}/g,'______');
    // A detached MCQ letter belongs with its following answer, not a paragraph of letters.
    if(/^[A-D]$/.test(line)&&lines[i+1]&&!/^[A-D]$/.test(lines[i+1]))line+='  '+lines[++i];
    if(/^\[(?:Total:\s*)?\d+\]$/i.test(line)&&current){current.text+=' '+line;continue}
    const part=/^(?:\([a-zivx]+\)|[A-D]\s{2}|\d{1,2}[.)]\s)/i.test(line);
    if(!part&&current&&current.type!=='fragment'&&!/[.!?。！？:：\]]$/.test(current.text)&&/[.!?。！？]$/.test(line)&&!line.includes('______')){current.text+=' '+line;continue}
    const prose=(line.match(/[\p{L}]{2,}/gu)||[]).length>=3||/[\u3400-\u9fff]{4}/u.test(line);
    const type=part?'part':prose?'paragraph':'fragment';
    if(part||!current||(type==='fragment')!==(current.type==='fragment'))flush();
    if(!current)current={type,text:line};
    else current.text+=(type==='fragment'?'\n':' ')+line;
  }
  flush();return blocks;
}

export function readableExcerpt(text,hits=[],limit=280){
  const blocks=readableBlocks(text),prose=blocks.filter(b=>b.type!=='fragment');
  const candidates=prose.length?prose:blocks;
  if(!candidates.length)return '';
  const words=hits.filter(t=>t.length>=4);
  const score=b=>words.reduce((n,w)=>n+(b.text.toLowerCase().includes(w.toLowerCase())?1:0),0);
  const best=candidates.reduce((a,b)=>score(b)>score(a)?b:a);
  let excerpt=best.text.replace(/\s+/g,' ');
  if(excerpt.length>limit){const cut=excerpt.lastIndexOf(' ',limit);excerpt=excerpt.slice(0,cut>limit*.65?cut:limit)+'…'}
  return excerpt;
}
