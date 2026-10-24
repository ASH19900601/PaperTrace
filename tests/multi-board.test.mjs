import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeIndex,search} from '../dist/search.mjs';
import {validateImportedIndex} from '../dist/import-utils.mjs';

const paper={id:'AP-BIO_s25_qp_1',code:'AP-BIO',year:2025,session:'s',component:'1',pages:12};
const record={id:paper.id+'-p4',paperId:paper.id,code:paper.code,year:paper.year,session:paper.session,component:paper.component,page:4,endPage:4,question:null,msPage:null,text:'The enzyme catalyzes the conversion of the substrate into a product.'};
test('multi-board references retain their board and exact original page',()=>{
 const index=makeIndex([record,{...record,id:'other',code:'9700'}]);
 for(const q of ['AP-BIO_s25_qp_1-p4','ap-bio_s25_qp_1 Page 4','AP-BIO_s25_ms_1 第4页'])assert.deepEqual(search(index,q).map(r=>r.id),[record.id],q);
 assert.equal(search(index,'AP-BIO_s25_qp_1 Page 99').length,0);
 assert.equal(search(index,'AP-BIO_s25_qp_1 Q4').length,0);
});
test('Pearson January IDs work without being relabelled as February/March',()=>{
 const r={...record,id:'4EA1_j24_qp_11-p2',paperId:'4EA1_j24_qp_11',code:'4EA1',year:2024,session:'j',component:'11',page:2,endPage:2};
 assert.deepEqual(search(makeIndex([r]),r.id).map(x=>x.id),[r.id]);
});
test('JSON indexes accept board codes while rejecting path-like codes',()=>{
 const data={format:'papertrace-index-v1',papers:[paper],records:[record]};
 assert.equal(validateImportedIndex(data).records[0].id,record.id);
 assert.throws(()=>validateImportedIndex({...data,papers:[{...paper,code:'../AP-BIO'}]}));
});
test('Chinese and Japanese fragments match inside unspaced source sentences',()=>{
 const index=makeIndex([{...record,id:'chinese',text:'作者走过安静的小巷，看见街边的一棵古树。'},{...record,id:'japanese',text:'毎朝学校まで自転車で通っています。'}]);
 assert.equal(search(index,'安静的小巷')[0].id,'chinese');
 assert.equal(search(index,'自転車で')[0].id,'japanese');
});
