export function canonicalComponent(code,component) {
  const value=String(component);
  return code==='0417'&&['2','3'].includes(value)?value.padStart(2,'0'):value;
}

export function fileMetadata(name) {
  const m = name.match(/^(\d{4})_([msw])(\d{2})_(qp|ms)_(\d{1,2})\.pdf$/i);
  if (!m) return null;
  const component=canonicalComponent(m[1],m[5]);
  return {code:m[1],session:m[2].toLowerCase(),year:2000+Number(m[3]),type:m[4].toLowerCase(),component,id:`${m[1]}_${m[2].toLowerCase()}${m[3]}_qp_${component}`};
}

// Preserve cells: MCQ mark schemes have several Question / Answer columns.
export function pdfTextRows(items, viewport, transform) {
  const groups = [];
  for (const item of items) {
    if (!item.str?.trim()) continue;
    const tx=transform(viewport.transform,item.transform), x=tx[4], y=tx[5], size=Math.hypot(tx[0],tx[1]);
    if (y<45 || y>viewport.height-50 || x<23 || size<8.5) continue;
    let line=groups.find(g=>Math.abs(g.y-y)<2);
    if (!line) { line={y,x,parts:[]}; groups.push(line); }
    line.x=Math.min(line.x,x);
    line.parts.push({x,y,text:item.str.trim(),font:item.fontName});
  }
  return groups.sort((a,b)=>a.y-b.y).map(g=>({...g,parts:g.parts.sort((a,b)=>a.x-b.x),text:g.parts.map(p=>p.text).join(' ').replace(/\.{4,}/g,' ').trim()}))
    .filter(g=>g.text && !(g.y<65&&/^\d{1,3}$/.test(g.text)&&g.x>viewport.width*.35&&g.x<viewport.width*.65) && !/UCLES|DO NOT WRITE|BLANK PAGE|Turn over|Permission to reproduce/i.test(g.text));
}

export function splitPDF(pages,m) {
  let expected=1,current=null,records=[],questionMargin=null,questionFont=null;
  for (let i=1;i<pages.length;i++) {
    if (pages[i].some(r=>/The Periodic Table of Elements|Important values, constants and standards|\bAdditional page\b|you may use this page/i.test(r.text))) continue;
    const removed=new Set([...pages[i].map(r=>r.text).join(' ').matchAll(/Due to an issue with Question\s+(\d+),\s*the question has been removed/gi)].map(m=>Number(m[1])));
    const numbered=pages[i].filter(r=>r.x>=26&&r.x<=67&&/^(\d{1,2})(?:\s|$)/.test(r.text));
    for (const row of pages[i]) {
      while(removed.has(expected))expected++;
      const match=row.text.match(/^(\d{1,2})(?:\s|$)/);
      const sourceIntro=expected===1&&/^Read the source material carefully before answering Question 1\./.test(row.text);
      const inQuestionColumn=questionMargin===null||(row.x>=questionMargin-12&&row.x<=questionMargin+5);
      const font=row.parts?.[0]?.font;
      const compactNumberRun=match&&numbered.some(r=>Math.abs(row.y-r.y)>2&&Math.abs(row.y-r.y)<=24&&Math.abs(row.x-r.x)<=12&&Math.abs(Number(match[1])-Number(r.text.match(/^(\d{1,2})/)[1]))===1&&font===r.parts?.[0]?.font);
      const sameQuestionFont=!questionFont||!font||font===questionFont||!compactNumberRun;
      if ((sourceIntro||(match&&match[1]===String(expected)&&sameQuestionFont))&&row.x>=26&&row.x<=67&&inQuestionColumn) {
        questionMargin??=row.x;
        if(!sourceIntro)questionFont??=font;
        if (current) records.push(current);
        current={question:expected++,page:i+1,endPage:i+1,text:''};
      }
      if (current) { current.text+=row.text+'\n'; current.endPage=i+1; }
    }
  }
  if (current) records.push(current);
  records=records.filter(r=>r.text.trim().length>=8);
  if (!records.length) records=pages.map((rows,i)=>({question:null,page:i+1,endPage:i+1,text:rows.map(r=>r.text).join('\n')})).filter(r=>r.page>1&&r.text.length>60);
  return records.map(r=>({...r,text:r.text.trim(),id:m.id+(r.question?'-q'+r.question:'-p'+r.page),paperId:m.id,code:m.code,year:m.year,session:m.session,component:m.component,msPage:null}));
}

export function mapMS(pages,records) {
  const mapping=new Map(), questions=new Set(records.map(r=>r.question));
  pages.forEach((rows,i)=>{
    if (!i) return;
    const cells=rows.flatMap(r=>r.parts?.length?r.parts.map(p=>({...p,y:p.y??r.y})): [r]);
    const headers=cells.filter(r=>/^Question$/i.test(r.text.trim()));
    if (!headers.length||!cells.some(r=>/^Answer$/i.test(r.text.trim()))) return;
    for (const row of cells) {
      const m=row.text.match(/^(\d{1,2})\s*(?:\([a-z0-9iv]+\))*(?:\s|$)/i);
      if (m&&questions.has(+m[1])&&headers.some(h=>row.x>=h.x-12&&row.x<=h.x+45&&row.y>h.y)&&!mapping.has(+m[1])) mapping.set(+m[1],i+1);
    }
  });
  return records.map(r=>({...r,msPage:mapping.get(r.question)||null}));
}

export function validRecord(r) {
  return r&&typeof r.id==='string'&&r.id.length>0&&r.id.length<100&&typeof r.paperId==='string'&&r.paperId.length>0&&r.paperId.length<100&&/^[A-Z0-9][A-Z0-9-]{1,29}$/.test(r.code)&&Number.isInteger(r.year)&&r.year>=1990&&r.year<=2100&&['j','m','s','w'].includes(r.session)&&/^\d{1,2}$/.test(r.component)&&typeof r.text==='string'&&r.text.trim().length>0&&r.text.length<=200000&&Number.isInteger(r.page)&&r.page>0&&Number.isInteger(r.endPage)&&r.endPage>=r.page&&r.endPage<=10000&&(r.msPage==null||Number.isInteger(r.msPage)&&r.msPage>0&&r.msPage<=10000)&&(r.question===null||Number.isInteger(r.question)&&r.question>0&&r.question<100);
}
export function safeURL(s) {try {const u=new URL(s);return u.protocol==='https:'?u.href:null;} catch {return null;}}

export function validateImportedIndex(d,existingPapers=[]) {
  if (d?.format!=='papertrace-index-v1'||!Array.isArray(d.papers)||!Array.isArray(d.records)||d.records.length>100000||d.papers.length>10000) throw new Error('索引格式无效');
  if (!d.records.every(validRecord)) throw new Error('题目索引字段无效');
  const ids=new Map(), recordIds=new Set(), counts=new Map(), existing=new Map(existingPapers.map(p=>[p.id,p]));
  for (const p of d.papers) {
    if (!p||typeof p.id!=='string'||p.id.length>100||!/^[A-Z0-9][A-Z0-9-]{1,29}$/.test(p.code)||!Number.isInteger(p.year)||p.year<1990||p.year>2100||!['j','m','s','w'].includes(p.session)||!/^\d{1,2}$/.test(p.component)||!Number.isInteger(p.pages)||p.pages<0||p.pages>10000||ids.has(p.id)) throw new Error('试卷元数据无效或重复');
    const expected=`${p.code}_${p.session}${String(p.year).slice(-2)}_qp_${p.component}`;
    if (p.id!==expected) throw new Error('试卷编号与科目、年份、考季或卷别不一致');
    ids.set(p.id,p);
  }
  const records=d.records.map(r=>{
    const p=ids.get(r.paperId);
    if (!p) throw new Error('题目缺少对应试卷元数据');
    if (['code','year','session','component'].some(k=>r[k]!==p[k])||r.endPage>p.pages||r.id!==r.paperId+(r.question===null?'-p'+r.page:'-q'+r.question)||recordIds.has(r.id)) throw new Error('题目来源、页码或编号不一致，或题目重复');
    recordIds.add(r.id); counts.set(r.paperId,(counts.get(r.paperId)||0)+1);
    return {id:r.id,paperId:r.paperId,code:r.code,year:r.year,session:r.session,component:r.component,question:r.question,page:r.page,endPage:r.endPage,msPage:r.msPage||null,text:r.text};
  });
  const papers=d.papers.map(p=>{const old=existing.get(p.id);return {id:p.id,code:p.code,year:p.year,session:p.session,component:p.component,pages:p.pages,questions:counts.get(p.id)||0,qp:safeURL(p.qp),ms:safeURL(p.ms),qpBlob:old?.qpBlob,msBlob:old?.msBlob,local:true,msVerified:!!old?.msBlob};});
  return {papers,records};
}
