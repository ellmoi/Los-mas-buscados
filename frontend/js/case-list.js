import {api} from './services/api.js';
import {petCard} from './components/ui.js';

export function bindCaseList() {
  const grid=document.querySelector('[data-live-cases]');if(!grid)return;
  const panel=document.querySelector('[data-case-filters]');
  const input=document.querySelector('[data-search-input]'),button=document.querySelector('[data-load-more]');
  const status=document.querySelector('[data-list-status]'),count=document.querySelector('[data-results-count]');
  const controls=[...panel.querySelectorAll('[data-case-filter]')];
  const filterCount=panel.querySelector('[data-filter-count]');
  const route=location.hash.split('?')[0],params=new URLSearchParams(location.hash.split('?')[1]||'');
  input.value=params.get('q')||'';
  for(const control of controls)control.value=params.get(control.dataset.caseFilter)||'';
  let offset=0,generation=0,timer,controller,disposed=false,applied={},loadedKey='',pendingKey='',resultStatus='';
  const read=()=>Object.fromEntries([['q',input.value.trim().replace(/\s+/g,' ')],...controls.map(c=>[c.dataset.caseFilter,c.value.trim()]),...(grid.dataset.mine?[['mine','true']]:[]),...(grid.dataset.kind?[['kind',grid.dataset.kind]]:[])].filter(([,value])=>value));
  function summarize(){const n=controls.filter(c=>c.dataset.caseFilter!=='sort'&&c.value).length;filterCount.textContent=n?`(${n} activos)`:'';}
  async function update(reset=true){
    clearTimeout(timer);
    if(disposed||!grid.isConnected)return;
    const query=reset?read():applied,nextOffset=reset?0:offset,key=JSON.stringify(query);
    if(reset && (key===pendingKey || key===loadedKey)){button.disabled=!!pendingKey;if(!pendingKey)status.textContent=resultStatus;return;}
    const version=++generation;controller?.abort();controller=new AbortController();pendingKey=key;
    button.disabled=true;status.textContent='Cargando casos…';grid.setAttribute('aria-busy','true');
    try{
      const result=await api.listCases({...query,offset:nextOffset,limit:24},{signal:controller.signal});
      if(version!==generation||disposed||!grid.isConnected)return;
      if(!Array.isArray(result?.items)||!Number.isFinite(result.total))throw new Error('No pudimos leer la lista de casos. Intenta de nuevo.');
      if(reset)grid.innerHTML='';grid.insertAdjacentHTML('beforeend',result.items.map(petCard).join(''));
      applied=query;loadedKey=key;offset=nextOffset+result.items.length;
      count.textContent=`${offset} de ${result.total} casos`;button.hidden=offset>=result.total;
      resultStatus=result.total?'':'No encontramos casos. Prueba otra búsqueda o limpia los filtros.';status.textContent=resultStatus;
      if(reset){const suffix=new URLSearchParams(query).toString();history.replaceState(history.state,'',route+(suffix?'?'+suffix:''));}
    }catch(error){if(version===generation&&!disposed&&grid.isConnected&&error.name!=='AbortError')status.textContent=error.message+(offset?' Se conservan los resultados anteriores.':'');}
    finally{if(version===generation&&!disposed){pendingKey='';button.disabled=false;grid.setAttribute('aria-busy','false');}}
  }
  function changed(event){
    if(event.target!==input&&!event.target.dataset.caseFilter)return;
    if(event.type==='input'&&event.target.tagName==='SELECT')return;
    if(event.type==='change'&&event.target.tagName!=='SELECT')return;
    summarize();clearTimeout(timer);generation++;controller?.abort();pendingKey='';button.disabled=true;grid.setAttribute('aria-busy','false');
    timer=setTimeout(()=>update(),event.target.tagName==='SELECT'?0:250);
  }
  function clear(event){
    if(!event.target.closest('[data-clear-filters]'))return;
    input.value='';for(const control of controls)control.value='';summarize();loadedKey='';update();input.focus();
  }
  const more=()=>{if(!button.disabled)update(false);};
  panel.addEventListener('input',changed);panel.addEventListener('change',changed);panel.addEventListener('click',clear);button.addEventListener('click',more);
  summarize();update();
  return ()=>{disposed=true;generation++;clearTimeout(timer);controller?.abort();panel.removeEventListener('input',changed);panel.removeEventListener('change',changed);panel.removeEventListener('click',clear);button.removeEventListener('click',more);};
}
