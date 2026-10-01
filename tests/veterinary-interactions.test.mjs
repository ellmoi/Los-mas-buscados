import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bindVeterinaries} from '../frontend/js/pages/veterinaries.js';

test('Una búsqueda fallida conserva los filtros de la lista al cargar más',async t=>{
  const originalDocument=globalThis.document,originalFetch=globalThis.fetch;
  t.after(()=>{globalThis.document=originalDocument;globalThis.fetch=originalFetch;});
  const button={},more={},status={},requests=[];
  let submit,html='';
  const form={elements:{city:{value:'Bogotá'},service:{value:''}},querySelector:()=>button,
    addEventListener:(_name,handler)=>{submit=handler;}};
  const list={replaceChildren(){html='';},insertAdjacentHTML(_where,value){html+=value;}};
  const nodes={'form':form,'[data-vet-list]':list,'[role=status]':status,'[data-vet-more]':more};
  globalThis.document={querySelector:()=>({isConnected:true,querySelector:key=>nodes[key]})};
  globalThis.fetch=async url=>{
    const params=new URL(url,'http://localhost').searchParams;
    requests.push(Object.fromEntries(params));
    if(params.get('city')==='Cali')throw Error('Sin conexión');
    return {ok:true,json:async()=>({items:[{name:'Ficha '+params.get('offset')}],offset:Number(params.get('offset')),total:3,limit:1})};
  };
  const settle=()=>new Promise(resolve=>setImmediate(resolve));
  bindVeterinaries();await settle();
  const previous=html;
  form.elements.city.value='Cali';submit({preventDefault(){}});await settle();
  assert.equal(html,previous);assert.equal(button.disabled,false);assert.equal(more.disabled,false);
  assert.match(status.textContent,/No se pudo conectar/);
  more.onclick();await settle();
  assert.equal(requests[2].city,'Bogotá');assert.equal(requests[2].offset,'1');
  assert.match(html,/Ficha 0/);assert.match(html,/Ficha 1/);
});
