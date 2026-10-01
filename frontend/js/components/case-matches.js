import {api} from '../services/api.js';
import {petCard,escapeHTML as e} from './ui.js';

export function comparisonBackLink(hash=globalThis.location?.hash||''){
  const source=new URLSearchParams(hash.split('?')[1]||'').get('from');
  return source&&/^[a-z0-9-]{1,80}$/i.test(source)?`<a class="button ghost back-button" href="#/mascota/${encodeURIComponent(source)}">← Volver al reporte original</a>`:'';
}

export async function caseMatches(p){
  if(!['lost','found'].includes(p.kind)||p.state!=='open'||p.visibility==='hidden')return '';
  const opposite=p.kind==='lost'?'encontrados':'perdidos';
  let content;
  try{
    const result=await api.getMatches(p.id);
    if(!Array.isArray(result?.items))throw new Error('Respuesta inválida');
    content=result.items.length?`<div class="grid-list match-grid">${result.items.slice(0,5).map(item=>`<div class="match-result">${petCard(item,{from:p.id})}<ul class="match-reasons" aria-label="Por qué podría coincidir">${(item.matchReasons||[]).map(reason=>`<li>${e(reason)}</li>`).join('')}</ul></div>`).join('')}</div>`:'<p>No encontramos coincidencias claras por ahora.</p>';
  }catch{content='<p role="status">No pudimos consultar las coincidencias. Vuelve a abrir el caso para reintentar.</p>';}
  return `<section class="case-matches" aria-labelledby="matches-heading"><h2 id="matches-heading">Posibles coincidencias</h2><p>Estos reportes comparten características. Verifica las fotos y la información con el responsable; la similitud no confirma que sea el mismo animal.</p>${content}<a class="button secondary" href="#/${opposite}?state=open">Ver todos los animales ${opposite}</a></section>`;
}
