import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bindCaseList} from '../frontend/js/case-list.js';

const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(t,hash='#/explorar'){
  const saved=Object.fromEntries(['document','fetch','location','history','setTimeout','clearTimeout'].map(key=>[key,globalThis[key]]));
  t.after(()=>Object.assign(globalThis,saved));
  const events=()=>({listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},removeEventListener(type){delete this.listeners[type];}});
  const input={value:'',tagName:'INPUT',dataset:{},focus(){this.focused=true;}};
  const controls=['kind','species','sex','size','color','city','zone','period','sort','state'].map(name=>({value:'',dataset:{caseFilter:name},tagName:['color','city','zone'].includes(name)?'INPUT':'SELECT'}));
  const filterCount={},panel={...events(),querySelectorAll:()=>controls,querySelector:()=>filterCount};
  const grid={isConnected:true,dataset:{},innerHTML:'',setAttribute(key,value){this[key]=value;},insertAdjacentHTML(_where,html){this.innerHTML+=html;}};
  const button={...events()},status={},count={};
  const nodes={'[data-live-cases]':grid,'[data-case-filters]':panel,'[data-search-input]':input,'[data-load-more]':button,'[data-list-status]':status,'[data-results-count]':count};
  const urls=[];globalThis.document={querySelector:key=>nodes[key]};globalThis.location={hash};globalThis.history={state:{},replaceState(_state,_title,url){urls.push(url);}};
  let timer;globalThis.setTimeout=fn=>{timer=fn;return 1;};globalThis.clearTimeout=()=>{timer=null;};
  const change=(name,value)=>{const target=name==='q'?input:controls.find(c=>c.dataset.caseFilter===name);target.value=value;const type=target.tagName==='SELECT'?'change':'input';panel.listeners[type]({target,type});};
  const flush=async()=>{const fn=timer;timer=null;await fn?.();await settle();};
  return {input,controls,grid,panel,button,status,count,filterCount,urls,change,flush};
}
test('Listado: combinar, debounce, paginar, limpiar, restaurar URL y limpiar listeners',async t=>{
  const f=fixture(t,'#/explorar?species=Gato&color=Negro'),requests=[];
  globalThis.fetch=async url=>{
    const q=Object.fromEntries(new URL(url,'http://local').searchParams);requests.push(q);
    return {ok:true,json:async()=>({items:q.q==='ausente'?[]:[{id:'case-'+q.offset,name:'Caso',kind:'found'}],total:q.q==='ausente'?0:3})};
  };
  const dispose=bindCaseList();await settle();assert.equal(requests[0].species,'Gato');assert.equal(requests[0].color,'Negro');
  f.change('q','Bo');f.change('q','Bogo');f.change('q','Bogota');f.change('period','7');await f.flush();
  assert.equal(requests.length,2);assert.equal(requests[1].q,'Bogota');assert.equal(requests[1].period,'7');assert.equal(requests[1].species,'Gato');
  f.button.listeners.click();await settle();assert.equal(requests[2].offset,'1');assert.equal(requests[2].period,'7');assert.match(f.grid.innerHTML,/case-0/);assert.match(f.grid.innerHTML,/case-1/);
  f.change('q','  Bogota  ');await f.flush();assert.equal(requests.length,3);
  f.change('q','ausente');await f.flush();assert.match(f.status.textContent,/No encontramos casos/);assert.equal(f.button.hidden,true);
  f.panel.listeners.click({target:{closest:()=>true}});await settle();const clear=requests.at(-1);assert.equal(clear.q,undefined);assert.equal(clear.species,undefined);assert.equal(clear.color,undefined);assert.equal(clear.period,undefined);assert.equal(clear.offset,'0');assert.equal(f.input.focused,true);
  assert.equal(f.urls.at(-1),'#/explorar');assert.equal(f.filterCount.textContent,'');
  dispose();assert.equal(Object.keys(f.panel.listeners).length,0);assert.equal(Object.keys(f.button.listeners).length,0);
});
test('Listado: fallo conserva filtros aplicados y respuestas obsoletas no reemplazan resultados',async t=>{
  const f=fixture(t,'#/explorar?city=Bogota'),requests=[];let release;
  globalThis.fetch=async url=>{
    const q=Object.fromEntries(new URL(url,'http://local').searchParams);requests.push(q);
    if(q.city==='Cali')throw Error('Offline');
    if(q.city==='Lento')await new Promise(resolve=>{release=resolve;});
    return {ok:true,json:async()=>({items:[{id:q.city+'-'+q.offset,name:q.city}],total:10})};
  };
  const dispose=bindCaseList();await settle();
  f.change('city','Cali');await f.flush();assert.match(f.status.textContent,/resultados anteriores/);assert.equal(f.button.disabled,false);
  f.button.listeners.click();await settle();assert.equal(requests.at(-1).city,'Bogota');assert.equal(requests.at(-1).offset,'1');
  f.change('city','Lento');const slow=f.flush();await settle();
  f.change('city','Medellin');await f.flush();release();await slow;
  assert.match(f.grid.innerHTML,/Medellin/);assert.ok(!f.grid.innerHTML.includes('Lento'));assert.equal(f.grid['aria-busy'],'false');
  dispose();
});

test('Mis reportes: la paginación y limpiar filtros conservan el alcance privado',async t=>{
  const f=fixture(t,'#/casos?state=resolved');f.grid.dataset.mine='true';const requests=[];
  globalThis.fetch=async url=>{requests.push(Object.fromEntries(new URL(url,'http://local').searchParams));return {ok:true,json:async()=>({items:[],total:0})};};
  const dispose=bindCaseList();await settle();assert.equal(requests[0].mine,'true');assert.equal(requests[0].state,'resolved');
  f.panel.listeners.click({target:{closest:()=>true}});await settle();assert.equal(requests.at(-1).mine,'true');assert.equal(requests.at(-1).state,undefined);dispose();
});
