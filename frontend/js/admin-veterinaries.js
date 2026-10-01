import {request} from './services/api.js';
import {escapeHTML as e} from './components/ui.js';
const statusNames={draft:'Borrador',published:'Publicado',hidden:'Oculto'};
export function vetForm(v={}){
  return `<form class="card admin-section" data-vet-edit><h2>${v.id?'Editar ficha':'Nuevo establecimiento'}</h2>${[['name','Nombre',120],['city','Ciudad',80],['address','Dirección comercial',200],['phone','Teléfono',40],['hours','Horario informado',300],['services','Servicios',300],['sourceUrl','Fuente pública HTTPS',500]].map(([key,label,max])=>`<label>${label}<input class="input" name="${key}" maxlength="${max}" value="${e(v[key]||'')}" ${key==='sourceUrl'?'type="url"':''} required></label>`).join('')}${v.id?'<label>Justificación<textarea class="textarea" name="reason" minlength="10" maxlength="500" required></textarea></label><p>Guardar retira la ficha pública hasta una nueva revisión.</p>':''}<button class="button">Guardar borrador</button><p role="status"></p></form>`;
}
export async function adminVeterinaries(root,isCurrent){
  let selected=null,offset=0,filter='all',busy=false;
  async function run(action){if(busy)return;busy=true;const buttons=[...root.querySelectorAll('button')].map(button=>({button,disabled:button.disabled}));buttons.forEach(({button})=>button.disabled=true);
    try{await action();}catch(error){if(isCurrent())root.querySelector('[data-vet-error]').textContent=error.message;}finally{busy=false;buttons.forEach(({button,disabled})=>button.disabled=disabled);}
  }
  async function show(){
    const data=await request('/admin/veterinaries?'+new URLSearchParams({offset,status:filter}));if(!isCurrent())return;
    root.innerHTML=`<p role="alert" data-vet-error></p><div class="moderation-toolbar"><button class="button" data-vet-new>Nuevo establecimiento</button><label>Mostrar<select class="select" data-vet-filter>${[['all','Todos'],...Object.entries(statusNames)].map(([key,label])=>`<option value="${key}" ${filter===key?'selected':''}>${label}</option>`).join('')}</select></label></div><p>${data.total} establecimientos</p><div class="moderation-list">${data.items.map(v=>`<article class="card admin-section"><h2>${e(v.name)}</h2><p>${e(v.city)} · ${statusNames[v.status]}</p><button class="button secondary" data-vet-open="${e(v.id)}">Editar y revisar</button></article>`).join('')||'<p>No hay fichas en esta vista.</p>'}</div><div class="moderation-pagination"><button class="button secondary" data-vet-prev ${offset?'':'disabled'}>Anterior</button><button class="button secondary" data-vet-next ${offset+data.limit>=data.total?'disabled':''}>Siguiente</button></div><div data-vet-editor></div>`;
    root.querySelector('[data-vet-new]').onclick=()=>editor(null);
    root.querySelector('[data-vet-filter]').onchange=event=>{if(busy)return;filter=event.target.value;offset=0;run(show);};
    root.querySelector('[data-vet-prev]').onclick=()=>{if(busy)return;offset=Math.max(0,offset-data.limit);run(show);};
    root.querySelector('[data-vet-next]').onclick=()=>{if(busy)return;offset+=data.limit;run(show);};
    root.querySelectorAll('[data-vet-open]').forEach(button=>button.onclick=()=>run(async()=>{const v=await request('/admin/veterinaries/'+button.dataset.vetOpen);if(isCurrent())editor(v);}));
  }
  function editor(v){
    if(busy&&!v)return;selected=v;const host=root.querySelector('[data-vet-editor]');
    host.innerHTML=vetForm(v||{})+(v?`<form class="card admin-section" data-vet-review><h2>Revisar y publicar</h2><p>Estado: ${statusNames[v.status]}. Comprueba la fuente y los datos antes de publicar.</p><a href="${e(v.sourceUrl)}" target="_blank" rel="noopener noreferrer">Abrir fuente</a><label>Decisión<select class="select" name="status"><option value="published">Publicar datos revisados</option><option value="hidden">Ocultar</option></select></label><label>Fecha de comprobación<input class="input" name="verifiedOn" type="date" value="${e(v.verifiedOn||'')}"></label><label>Justificación<textarea class="textarea" name="reason" minlength="10" maxlength="500" required></textarea></label><button class="button">Guardar decisión</button></form>`:'');
    host.querySelector('input')?.focus();
    host.querySelectorAll('form').forEach(form=>form.addEventListener('submit',event=>{event.preventDefault();run(async()=>{
      const review=form.hasAttribute('data-vet-review'),body={...Object.fromEntries(new FormData(form)),...(selected?{revision:selected.revision}:{})};
      await request('/admin/veterinaries'+(selected?'/'+selected.id:'')+(review?'/review':''),{method:selected?'PATCH':'POST',body:JSON.stringify(body)});
      if(isCurrent()){selected=null;await show();}
    });}));
  }
  await show();
}
