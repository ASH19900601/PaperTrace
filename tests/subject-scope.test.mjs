import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isScieSubject,normalizeScope,scopeCodes} from '../dist/subject-scope.mjs';
import {makeIndex,search} from '../dist/search.mjs';

const manifest=JSON.parse(fs.readFileSync(new URL('../dist/data/manifest.json',import.meta.url)));
test('reviewed default covers 67 versions and keeps five supplemental codes opt-in',()=>{
 const codes=manifest.subjects.map(s=>s.code),selected=scopeCodes(codes,normalizeScope(null));
 assert.equal(selected.length,67);
 assert.deepEqual(codes.filter(c=>!isScieSubject(c)).sort(),['0417','0452','0606','0654','9609']);
 assert.equal(manifest.subjects.filter(s=>selected.includes(s.code)).reduce((n,s)=>n+s.questions,0),72055);
 assert.equal(scopeCodes([...codes,'LOCAL'],normalizeScope(null)).includes('LOCAL'),false);
 assert.equal(scopeCodes([...codes,'LOCAL'],normalizeScope({mode:'all'})).length,73);
});
test('out-of-scope records are never traversed, even for an explicit filename',()=>{
 const records=['9702','0417'].map(code=>({id:code+'_s24_qp_12-q1',paperId:code+'_s24_qp_12',code,year:2024,session:'s',component:'12',question:1,text:'A distinctive source sentence about a skydiver.'}));
 const index=makeIndex(records),codes=['9702'];
 // If search scans all documents rather than the selected buckets this throws.
 const extra=index.byCode.get('0417')[0],saved=extra.r;
 Object.defineProperty(extra,'r',{get(){throw new Error('Visited excluded subject')},configurable:true});
 assert.deepEqual(search(index,'distinctive source sentence',{codes}).map(r=>r.code),['9702']);
 assert.deepEqual(search(index,'0417_s24_qp_12 Q1',{codes}),[]);
 assert.deepEqual(search(index,'skydiver',{codes,code:'0417'}),[]);
 assert.deepEqual(search(index,'skydiver',{codes:[]}),[]);
 Object.defineProperty(extra,'r',{value:saved});
 assert.equal(search(index,'0417_s24_qp_12 Q1',{codes:['9702','0417']})[0].id,records[1].id);
 assert.equal(search(index,'skydiver').length,2);
});
