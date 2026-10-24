import {makeIndex,search} from './search.mjs';
let index=null;
self.onmessage=e=>{const {id,type,records,query,filters}=e.data;try{if(type==='build'){index=makeIndex(records);self.postMessage({id,ok:true,count:records.length})}else if(type==='search'){if(!index)throw new Error('索引尚未就绪');self.postMessage({id,ok:true,results:search(index,query,filters)})}}catch(error){self.postMessage({id,ok:false,error:error.message})}};
