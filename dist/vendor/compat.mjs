// Small feature shims for PDF.js on browsers predating Uint8Array encodings.
if(!Uint8Array.prototype.toHex)Object.defineProperty(Uint8Array.prototype,'toHex',{value:function(){return Array.from(this,b=>b.toString(16).padStart(2,'0')).join('')},configurable:true});
if(!Uint8Array.fromBase64)Object.defineProperty(Uint8Array,'fromBase64',{value:function(s){return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))},configurable:true});
if(!Uint8Array.prototype.toBase64)Object.defineProperty(Uint8Array.prototype,'toBase64',{value:function(){let text='';for(let i=0;i<this.length;i+=8192)text+=String.fromCharCode(...this.subarray(i,i+8192));return btoa(text)},configurable:true});
