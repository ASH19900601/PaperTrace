import {makeIndex,appendIndex,search} from './search.mjs?v=20261024-2';
let index=null;
self.onmessage=e=>{const {id,type,records,query,filters}=e.data;try{if(type==='build'||type==='append'){index=type==='append'&&index?appendIndex(index,records):makeIndex(records);self.postMessage({id,ok:true,count:index.docs.length})}else if(type==='search'){if(!index)throw new Error('索引尚未就绪');self.postMessage({id,ok:true,results:search(index,query,filters)})}}catch(error){self.postMessage({id,ok:false,error:error.message})}};
