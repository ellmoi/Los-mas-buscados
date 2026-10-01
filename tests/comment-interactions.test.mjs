import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bindComments} from '../frontend/js/pages/comments.js';

const settle=()=>new Promise(resolve=>setImmediate(resolve));
function setup(t,handler){
  const originalDocument=globalThis.document,originalFetch=globalThis.fetch;
  t.after(()=>{globalThis.document=originalDocument;globalThis.fetch=originalFetch;});
  const button={disabled:false},text={value:'Comentario de prueba',disabled:false},status={},more={disabled:false},refresh={disabled:false};
  let submit,html='';
  const form={elements:{text},reset(){text.value='';},addEventListener(_type,fn){submit=fn;}};
  const list={replaceChildren(){html='';},insertAdjacentHTML(_position,value){html+=value;},querySelectorAll(){return [];}};
  const nodes={'[data-comments-list]':list,'[data-comments-status]':status,'[data-comments-more]':more,'[data-comments-refresh]':refresh,'[data-comment-new]':form};
  const root={isConnected:true,dataset:{commentsCase:'case'},querySelector:key=>nodes[key],querySelectorAll:()=>[button,text,more,refresh]};
  globalThis.document={querySelector:()=>root};
  globalThis.fetch=async(url,options)=>{const body=await handler(url,options);return {ok:true,json:async()=>body};};
  bindComments();return {button,text,status,more,refresh,root,submit:()=>submit({preventDefault(){}}),html:()=>html};
}
const empty={items:[],hasMore:false,nextBefore:null};

test('Comentarios: el reintento conserva identificador y texto; el refresco fallido no duplica el envío',async t=>{
  const attempts=[];let reads=0,failRead=false;
  const ui=setup(t,(_url,options)=>{
    if(options.method==='POST'){
      attempts.push(JSON.parse(options.body));
      if(attempts.length===1)throw Error('Respuesta perdida');
      failRead=true;return {};
    }
    reads++;if(failRead)throw Error('Sin conexión');return empty;
  });
  await settle();ui.submit();await settle();
  assert.equal(ui.text.value,'Comentario de prueba');assert.equal(ui.button.disabled,false);
  assert.match(ui.status.textContent,/No se pudo conectar/);
  ui.submit();await settle();assert.deepEqual(attempts[0],attempts[1]);assert.equal(ui.text.value,'');assert.equal(ui.button.disabled,false);
  failRead=false;ui.refresh.onclick();await settle();assert.equal(attempts.length,2);assert.ok(reads>=3);
});

test('Comentarios: bloqueo durante envío y carga anterior conserva cursor tras un fallo',async t=>{
  let finish,posts=0,older=0;const urls=[];
  const ui=setup(t,(url,options)=>{
    if(options.method==='POST'){posts++;return new Promise(resolve=>{finish=resolve;});}
    urls.push(url);
    if(url.includes('before=')){if(++older===1)throw Error('Sin conexión');return empty;}
    return {items:[{id:5,authorName:'Autor',text:'Visible',created:new Date().toISOString(),revision:1}],hasMore:true,nextBefore:5};
  });
  await settle();const first=ui.html();ui.more.onclick();await settle();assert.equal(ui.html(),first);
  ui.more.onclick();await settle();assert.equal(urls.at(-1),urls.at(-2));
  ui.submit();await settle();assert.equal(ui.button.disabled,true);ui.submit();ui.refresh.onclick();assert.equal(posts,1);
  ui.root.isConnected=false;finish({});await settle();assert.equal(ui.button.disabled,false);
});
