export const stop=new Set('a an the and or of to in on for is are be by as at it this that which with from has have had was were not what when how state explain calculate determine find using shown fig figure table following each its'.split(' '));
const aliases={'化学':'chemistry','物理':'physics','数学':'mathematics','计算机':'computer','加速度':'acceleration','速度':'velocity speed','力矩':'moment torque','滴定':'titration','焓':'enthalpy','电场':'electric field','电流':'current','电阻':'resistance','概率':'probability','正态分布':'normal distribution','二项分布':'binomial distribution','队列':'queue','栈':'stack','链表':'linked list','数组':'array','递归':'recursion','氧化':'oxidation','还原':'reduction','平衡':'equilibrium','离子':'ion','氯':'chlorine chloride','光栅':'diffraction grating','衍射':'diffraction','干涉':'interference','有机':'organic','积分':'integration','微分':'differentiation'};
Object.assign(aliases,{'光合作用':'photosynthesis','呼吸作用':'respiration','渗透':'osmosis','主动运输':'active transport','有丝分裂':'mitosis','酶':'enzyme','细胞':'cell','遗传':'inheritance','机会成本':'opportunity cost','需求':'demand','供给':'supply','通货膨胀':'inflation','资产':'assets','负债':'liabilities','折旧':'depreciation','现金流':'cash flow','市场营销':'marketing'});
export function normalize(s){return String(s).normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").replace(/[‐‑–—−]/g,'-').replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim()}
export function tokens(s){for(const [a,b] of Object.entries(aliases))s=s.split(a).join(' '+b+' ');return normalize(s).split(' ').filter(t=>t&&!stop.has(t)).flatMap(t=>{
  // Chinese/Japanese source paragraphs have no word spaces. Index overlapping
  // pairs so a copied short fragment can match inside a longer sentence.
  const extra=[];for(const m of t.matchAll(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]{2,}/gu)){const chars=[...m[0]];for(let i=0;i<chars.length-1;i++)extra.push(chars[i]+chars[i+1])}
  return extra.length?[t,...extra]:[t];
})}
export function makeIndex(records){const df=new Map();const docs=records.map(r=>{const norm=normalize(r.text);const ts=tokens(norm);const tf=new Map();ts.forEach(t=>tf.set(t,(tf.get(t)||0)+1));for(const t of tf.keys())df.set(t,(df.get(t)||0)+1);return {r,norm,tf,len:ts.length}});const byCode=new Map();for(const d of docs){if(!byCode.has(d.r.code))byCode.set(d.r.code,[]);byCode.get(d.r.code).push(d)}return{docs,byCode,df,avg:docs.reduce((s,d)=>s+d.len,0)/(docs.length||1)}}
export function appendIndex(index,records){
  const added=makeIndex(records),total=index.avg*index.docs.length+added.avg*added.docs.length;
  for(const doc of added.docs)index.docs.push(doc);
  for(const [code,docs] of added.byCode){if(!index.byCode.has(code))index.byCode.set(code,[]);index.byCode.get(code).push(...docs)}
  for(const [term,count] of added.df)index.df.set(term,(index.df.get(term)||0)+count);
  index.avg=total/(index.docs.length||1);return index;
}
// Both a downloaded filename and the code printed on the PDF identify a paper.
// MS references point to the corresponding QP question records.
function paperReference(query){
  const filename=query.match(/(?<![\p{L}\p{N}])([A-Z0-9][A-Z0-9-]{1,29})[_\s/-]+([jmsw])(\d{2})[_\s/-]+(?:(?:qp|ms)[_\s/-]+)?(\d{1,2})(?!\d)/iu);
  if(filename)return {match:filename[0],code:filename[1].toUpperCase(),session:filename[2].toLowerCase(),year:filename[3],component:canonicalComponent(filename[1],filename[4])};
  const printed=query.match(/(?<!\d)(\d{4})\s*\/\s*(\d{1,2})\s*\/\s*(F\s*\/\s*M|M\s*\/\s*J|O\s*\/\s*N)\s*\/\s*(\d{2})(?!\d)/i);
  if(printed)return {match:printed[0],code:printed[1],session:{FM:'m',MJ:'s',ON:'w'}[printed[3].replace(/[\s/]/g,'').toUpperCase()],year:printed[4],component:canonicalComponent(printed[1],printed[2])};
  return null;
}

export function search(index,query,filters={}){
  query=String(query).normalize('NFKC');
  if(!normalize(query))return[];
  const file=paperReference(query);
  const qmatch=file&&query.match(/(?:\bquestion\b|\bq)\s*[:.#]?\s*(\d{1,3})(?!\d)|第\s*(\d{1,3})\s*题/i);
  const question=qmatch?Number(qmatch[1]||qmatch[2]):null;
  const pmatch=file&&!qmatch&&query.match(/(?:\bpage\b|\bp)\s*[:.#]?\s*(\d{1,4})(?!\d)|第\s*(\d{1,4})\s*页/i);
  const page=pmatch?Number(pmatch[1]||pmatch[2]):null;
  // An OCR crop can contain a PDF header as well as a question. Keep ranking
  // the remaining text within that paper instead of returning its first Q.
  let textQuery=file?query.replace(file.match,'').replace(/\.pdf\b/gi,''):query;
  if(qmatch)textQuery=textQuery.replace(qmatch[0],'');
  if(pmatch)textQuery=textQuery.replace(pmatch[0],'');
  const terms=[...new Set(tokens(textQuery))].slice(0,100);
  const phrase=normalize(textQuery);
  const N=index.docs.length;
  const found=[];
  // Select subject buckets before traversal, including filename / OCR searches.
  const codes=Array.isArray(filters.codes)?new Set(filters.codes):null;
  const candidates=filters.code?(codes&&!codes.has(String(filters.code))?[]:index.byCode.get(String(filters.code))||[]):codes?[...codes].flatMap(c=>index.byCode.get(c)||[]):index.docs;
  for(const d of candidates){
    const r=d.r;
    const level=r.level||(r.code.startsWith('0')?'IGCSE':'AS & A Level');
    if(filters.code&&r.code!==String(filters.code)||filters.year&&String(r.year)!==String(filters.year)||filters.session&&r.session!==filters.session||filters.component&&r.component!==String(filters.component)||filters.level&&level!==filters.level)continue;
    if(file){
      if(r.code!==file.code||r.session!==file.session||String(r.year).slice(-2)!==file.year||r.component!==file.component||question!==null&&r.question!==question||page!==null&&(page<r.page||page>r.endPage))continue;
      if(question!==null||page!==null||!terms.length){found.push({...r,score:100,hits:['paper code'],exact:true});continue}
    }
    let score=0,hits=[];
    for(const t of terms){
      let tf=d.tf.get(t)||0,weight=1;
      if(!tf&&t.length>=5){
        for(const [w,v] of d.tf){
          if(w.length>=4&&(w.startsWith(t)||t.startsWith(w))){tf=v;weight=.55;break}
        }
      }
      if(tf){
        const idf=Math.log(1+(N-(index.df.get(t)||1)+.5)/((index.df.get(t)||1)+.5));
        score+=idf*(tf*2.2)/(tf+1.2*(.25+.75*d.len/(index.avg||1)))*weight;
        hits.push(t);
      }
    }
    const exact=phrase.length>=8&&d.norm.includes(phrase);
    if(exact)score+=20+terms.length*2;
    const coverage=hits.length/(terms.length||1);
    score*=.3+.7*coverage;
    if(score>0&&(coverage>=.25||hits.length>=3||exact))found.push({...r,score,hits,exact});
  }
  return found.sort((a,b)=>b.score-a.score||b.year-a.year||a.id.localeCompare(b.id,undefined,{numeric:true}));
}
import {canonicalComponent} from './import-utils.mjs';
