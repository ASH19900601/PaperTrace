import {isScieSubject} from './subject-scope.mjs';
export const FILE_TYPES={qp:{label:'试卷',en:'Question Paper'},ms:{label:'评分标准',en:'Mark Scheme'},gt:{label:'等级分数线',en:'Grade Thresholds'},er:{label:'考官报告',en:'Examiner Report'},in:{label:'附页 / 阅读材料',en:'Insert'},ci:{label:'实验说明',en:'Practical Instructions'}};
export const SEASONS={j:'1 月 · January',m:'2–3 月 · Feb / Mar',s:'5–6 月 · May / Jun',w:'10–11 月 · Oct / Nov'};
export const DOWNLOAD_LEVELS=['IGCSE','AS & A Level'];
export function availableSubjects(subjects,{extra=false,board='',level='',query=''}={}){
  const q=query.trim().toLowerCase();return subjects.filter(s=>DOWNLOAD_LEVELS.includes(s.level)&&(extra||isScieSubject(s.code))&&(!board||s.examBoard===board)&&(!level||s.level===level)&&(!q||[s.code,s.name,s.nameZh].some(v=>v?.toLowerCase().includes(q))));
}
const paperKey=r=>[r.code,r.year,r.session,r.paper,r.variant].join('|');
export function preferredFiles(files){
  const best=new Map(),other=[];
  const quality=r=>(/provisional/i.test(r.name)?0:100)+(/[-_]rms[-_]/i.test(r.name)?10:0)+(r.checked?1:0);
  for(const r of files){
    if(!['qp','ms'].includes(r.type)){other.push(r);continue}
    const key=paperKey(r)+'|'+r.type,old=best.get(key);if(!old||quality(r)>quality(old))best.set(key,r);
  }
  return [...best.values(),...other];
}
export function singlePaperFilters(files,requested={}){
  const papers=files.filter(r=>['qp','ms'].includes(r.type)&&r.paper),rows=papers.length?papers:files;
  const types=new Map();for(const r of papers){const key=paperKey(r);if(!types.has(key))types.set(key,new Set());types.get(key).add(r.type)}
  const paired=rows.filter(r=>types.get(paperKey(r))?.size===2);
  const values=(scope,key)=>[...new Set(scope.map(r=>r[key]))];
  const prefer=scope=>{const pairs=scope.filter(r=>paired.includes(r));return pairs.length?pairs:scope};
  const years=values(rows,'year').sort((a,b)=>b-a),year=requested.years?.find(y=>years.includes(y))??values(prefer(rows),'year').sort((a,b)=>b-a)[0];
  const inYear=rows.filter(r=>r.year===year),seasons=values(inYear,'session');
  const session=requested.sessions?.find(s=>seasons.includes(s))??values(prefer(inYear),'session').sort((a,b)=>'jmsw'.indexOf(b)-'jmsw'.indexOf(a))[0];
  const inSession=inYear.filter(r=>r.session===session),papersHere=paperOptions(inSession);
  const paper=papersHere.includes(requested.paper)?requested.paper:paperOptions(prefer(inSession))[0]||'';
  const inPaper=inSession.filter(r=>r.paper===paper),variants=variantOptions(inPaper);
  const defaults=variantOptions(prefer(inPaper)),variant=variants.includes(requested.variant)?requested.variant:defaults.includes('2')?'2':defaults[0]||'';
  return {years:year===undefined?[]:[year],sessions:session===undefined?[]:[session],paper,variant};
}
export function filterFiles(files,f={}){
  const terms=(f.query||'').toLowerCase().trim().split(/\s+/).filter(Boolean);
  return files.filter(r=>(!f.years?.length||f.years.includes(r.year))&&(!f.sessions?.length||f.sessions.includes(r.session))&&
    (!f.paper||r.paper===f.paper||!r.paper)&&(!f.variant||r.variant===f.variant||!r.variant)&&
    (!f.types?.length||f.types.includes(r.type))&&terms.every(t=>[r.name,r.label,r.year,r.code,FILE_TYPES[r.type]?.label].join(' ').toLowerCase().includes(t)));
}
export function paperOptions(files){return [...new Set(files.map(r=>r.paper).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))}
export function variantOptions(files,paper){return [...new Set(files.filter(r=>!paper||r.paper===paper).map(r=>r.variant).filter(Boolean))].sort()}
export function sortFiles(files,order='newest'){
  const series={j:1,m:2,s:3,w:4},types=Object.keys(FILE_TYPES);
  return [...files].sort((a,b)=>(order==='oldest'?1:-1)*(a.year-b.year||series[a.session]-series[b.session])||a.paper.localeCompare(b.paper,undefined,{numeric:true})||a.variant.localeCompare(b.variant)||types.indexOf(a.type)-types.indexOf(b.type)||a.name.localeCompare(b.name));
}
export function safeName(name){return String(name).replace(/[\\/\x00-\x1f<>:"|?*]/g,'_').replace(/^\.+/,'_').slice(0,180)||'paper.pdf'}
export function csvFiles(files){
  const quote=value=>'"'+String(value??'').replaceAll('"','""')+'"';
  return '\ufeff'+[['文件名','科目','年份','考季','分卷','类型','PDF 链接','来源页面'],...files.map(r=>[r.name,r.code,r.year,SEASONS[r.session],r.label,FILE_TYPES[r.type]?.label,r.url,r.source])].map(row=>row.map(quote).join(',')).join('\r\n');
}
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0});
function crc32(data){let c=0xffffffff;for(const b of data)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0}
// A standard store-only ZIP keeps already-compressed PDFs intact and needs no external library.
export function zipBlob(entries){
  const parts=[],central=[],encoder=new TextEncoder(),used=new Set();let offset=0,centralSize=0;
  const now=new Date(),date=((Math.max(1980,now.getFullYear())-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate(),time=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1);
  for(const [i,item] of entries.entries()){
    let name=safeName(item.name);if(used.has(name))name=`${i+1}_${name}`;used.add(name);
    const filename=encoder.encode(name),bytes=item.bytes instanceof Uint8Array?item.bytes:new Uint8Array(item.bytes),crc=crc32(bytes);
    const local=new Uint8Array(30+filename.length),lv=new DataView(local.buffer);
    lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x800,true);lv.setUint32(14,crc,true);lv.setUint32(18,bytes.length,true);lv.setUint32(22,bytes.length,true);lv.setUint16(26,filename.length,true);local.set(filename,30);
    lv.setUint16(10,time,true);lv.setUint16(12,date,true);
    const header=new Uint8Array(46+filename.length),cv=new DataView(header.buffer);
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint32(16,crc,true);cv.setUint32(20,bytes.length,true);cv.setUint32(24,bytes.length,true);cv.setUint16(28,filename.length,true);cv.setUint32(42,offset,true);header.set(filename,46);
    cv.setUint16(12,time,true);cv.setUint16(14,date,true);
    parts.push(local,bytes);central.push(header);offset+=local.length+bytes.length;centralSize+=header.length;
  }
  const end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,entries.length,true);ev.setUint16(10,entries.length,true);ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);
  return new Blob([...parts,...central,end],{type:'application/zip'});
}
