export const COMMON_CODES=['9702','9701','9700','9709','0625','0620','0610','0580','9231','0606','4PH1','4CH1','4BI1','4MA1'];

export function prioritizeSubjects(codes){
  return [...codes].sort((a,b)=>(COMMON_CODES.indexOf(a)<0?999:COMMON_CODES.indexOf(a))-(COMMON_CODES.indexOf(b)<0?999:COMMON_CODES.indexOf(b)));
}

// A separate database keeps downloaded data independent of users' imported PDFs.
export async function openCorpusCache(){
  try{return await new Promise((resolve,reject)=>{
    const req=indexedDB.open('papertrace-corpus',1);
    req.onupgradeneeded=()=>req.result.createObjectStore('subjects');
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  })}catch{return null}
}

export class CorpusLoader{
  constructor(manifest,{cache=null,fetcher=fetch}={}){this.manifest=manifest;this.cache=cache;this.fetcher=(...args)=>fetcher(...args);this.jobs=new Map();this.cached=new Set()}
  async cachedValue(code){
    if(!this.cache)return null;
    try{return await new Promise((resolve,reject)=>{const req=this.cache.transaction('subjects').objectStore('subjects').get(code);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}catch{return null}
  }
  async load(code){
    if(this.jobs.has(code))return this.jobs.get(code);
    const job=this.read(code);this.jobs.set(code,job);
    try{return await job}catch(error){this.jobs.delete(code);throw error}
  }
  async read(code){
    const version=this.manifest.updatedAt,entry=await this.cachedValue(code);
    if(entry&&entry.version===version&&Array.isArray(entry.records)){this.cached.add(code);return entry.records}
    const response=await this.fetcher('data/'+encodeURIComponent(code)+'.json?v='+encodeURIComponent(version||''));
    if(!response.ok)throw new Error('科目 '+code+' 题库加载失败');
    const records=await response.json();if(!Array.isArray(records))throw new Error('科目 '+code+' 题库格式无效');
    if(this.cache)try{const tx=this.cache.transaction('subjects','readwrite');tx.objectStore('subjects').put({version,records},code);tx.onerror=()=>{};tx.onabort=()=>{}}catch{}
    return records;
  }
}
