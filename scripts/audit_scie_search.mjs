import fs from 'node:fs';
import {makeIndex,search,normalize} from '../dist/search.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const manifest=read('dist/data/manifest.json');
const records=manifest.subjects.flatMap(s=>read('dist/data/'+s.code+'.json').map(r=>({...r,level:s.level})));
const index=makeIndex(records);
const probes=read('docs/reports/scie-search-probes.json');
const checks=probes.map(p=>{
 const hits=search(index,p.query,p.filters);
 const rank=hits.findIndex(r=>r.paperId===p.paperId&&r.page===p.page)+1;
 return {...p,rank,first:hits[0]?.id,passed:rank>0&&rank<=5};
});
const manual=[
 {paperId:'AP-PSY_s24_qp_1',page:3,query:'Professor Gonzalez hypothesizes that students will remember more information from his detailed course description'},
 {paperId:'AQA-7582_s25_qp_2',page:2,query:'Different types of data are collected from laboratory or field tests'},
 {paperId:'0509_s20_qp_11',page:4,query:'窗外的兩種聲音吸引了'},
 {paperId:'0519_w20_qp_02',page:3,query:'りんごを 五つ 買いました'},
 {paperId:'9482_s21_qp_11',page:3,query:'How would you perform the role of BIFF in selected moments from the extract to reveal his changing feelings for his father'},
].map(p=>{
 const hits=search(index,p.query);const rank=hits.findIndex(r=>r.paperId===p.paperId&&r.page===p.page)+1;
 return {...p,rank,first:hits[0]?.id,firstText:hits[0]?.text.slice(0,350),passed:rank>0&&rank<=5};
});
const report={records:records.length,newSubjectChecks:checks.length,passed:checks.filter(c=>c.passed).length,checks,unfilteredManualChecks:manual};
fs.writeFileSync(new URL('../docs/reports/scie-search-validation.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify({records:records.length,smokePassed:report.passed,total:checks.length,unfilteredManual:manual.map(({paperId,rank,first})=>({paperId,rank,first})),failures:checks.filter(c=>!c.passed)},null,2));
if(checks.some(c=>!c.passed))process.exitCode=1;
