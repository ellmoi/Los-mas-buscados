import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bindEditorial} from '../frontend/js/pages/editorial.js';

test('CMS: una búsqueda fallida conserva la consulta al cargar más',async t=>{
  const originalDocument=globalThis.document,originalFetch=globalThis.fetch;
  t.after(()=>{globalThis.document=originalDocument;globalThis.fetch=originalFetch;});
  const button={},more={},status={},requests=[];
  let submit,html='';
  const form={elements:{q:{value:'Inicial'}},querySelector:()=>button,
    addEventListener:(_name,handler)=>{submit=handler;}};
  const list={replaceChildren(){html='';},insertAdjacentHTML(_where,value){html+=value;}};
  const nodes={'form':form,'[data-editorial-list]':list,'[role=status]':status,'[data-editorial-more]':more};
  globalThis.document={querySelector:()=>({isConnected:true,dataset:{editorialLibrary:'article'},querySelector:key=>nodes[key]})};
  globalThis.fetch=async url=>{
    const params=new URL(url,'http://localhost').searchParams;
    requests.push(Object.fromEntries(params));
    if(params.get('q')==='Nueva')throw Error('Sin conexión');
    return {ok:true,json:async()=>({items:[{id:'id',kind:'article',title:'Ficha '+params.get('offset')}],offset:Number(params.get('offset')),total:3,limit:1})};
  };
  const settle=()=>new Promise(resolve=>setImmediate(resolve));
  bindEditorial();await settle();
  const previous=html;
  form.elements.q.value='Nueva';submit({preventDefault(){}});await settle();
  assert.equal(html,previous);assert.equal(button.disabled,false);assert.equal(more.disabled,false);
  assert.match(status.textContent,/No se pudo conectar/);
  more.onclick();await settle();
  assert.equal(requests[2].q,'Inicial');assert.equal(requests[2].offset,'1');
  assert.match(html,/Ficha 0/);assert.match(html,/Ficha 1/);
});
