import {request} from '../services/api.js';
import {escapeHTML as e,header,statePage} from '../components/ui.js';

export const editorialPath=item=>item.kind==='project'?'/nuestro-trabajo/':'/informacion/especie/';
export function editorialCard(item){return `<article class="card project-card"><h2><a href="#${editorialPath(item)}${encodeURIComponent(item.id)}">${e(item.title)}</a></h2><p>${e(item.summary)}</p><small>Revisado el ${e(item.reviewedOn)}</small></article>`;}
export function editorialBody(item){return `<article class="card project-card editorial-document"><h1>${e(item.title)}</h1><p class="editorial-summary">${e(item.summary)}</p><div class="editorial-text">${e(item.text)}</div><p>Revisado el ${e(item.reviewedOn||'Pendiente')} · <a href="${e(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">Consultar fuente</a></p></article>`;}
export function editorialLibrary(kind){
  const project=kind==='project';
  return header(project?'Proyectos de Buscados':'Biblioteca abierta',project?'Nuestro trabajo':'Información y cuidados',project?'Procesos y resultados documentados por el equipo de Buscados.':'Artículos con fuentes y fecha de revisión.')+`<section data-editorial-library="${kind}"><form class="card library-tools"><label>Buscar por título o resumen<input class="input" name="q" maxlength="160"></label><button class="button">Buscar</button></form><div class="content-grid" data-editorial-list></div><p role="status"></p><button class="button secondary" data-editorial-more hidden>Ver más publicaciones</button></section>`;
}
export async function editorialDetail(id,kind){
  let item;
  try{item=await request('/editorial/'+encodeURIComponent(id));}catch(error){if(error.status!==404)throw error;}
  const back=kind==='project'?'/nuestro-trabajo':'/informacion';
  if(!item||item.kind!==kind)return statePage('Contenido no disponible','Sin publicación','La entrada no existe o aún no está publicada.',`<a class="button secondary" href="#${back}">Volver</a>`);
  return `<a class="button secondary" href="#${back}">Volver</a>`+editorialBody(item);
}
export function bindEditorial(){
  const root=document.querySelector('[data-editorial-library]');if(!root)return;
  const form=root.querySelector('form'),list=root.querySelector('[data-editorial-list]'),status=root.querySelector('[role=status]'),more=root.querySelector('[data-editorial-more]'),button=form.querySelector('button');
  let busy=false,offset=0,q='';
  async function load(reset=false){
    if(busy)return;busy=true;button.disabled=more.disabled=true;status.textContent='Cargando…';
    const query=reset?form.elements.q.value:q;
    try{
      const data=await request('/editorial?'+new URLSearchParams({kind:root.dataset.editorialLibrary,q:query,offset:reset?0:offset}));
      if(!root.isConnected)return;
      if(reset){list.replaceChildren();q=query;}
      list.insertAdjacentHTML('beforeend',data.items.map(editorialCard).join(''));offset=data.offset+data.items.length;more.hidden=offset>=data.total;
      status.textContent=data.total?`${offset} de ${data.total} publicaciones`:q?'No hay publicaciones con esa búsqueda.':'Aún no hay contenido publicado. Aparecerá aquí después de su revisión.';
    }catch(error){if(root.isConnected)status.textContent=error.message;}
    finally{busy=false;button.disabled=more.disabled=false;}
  }
  form.addEventListener('submit',event=>{event.preventDefault();load(true);});more.onclick=()=>load();load(true);
}
