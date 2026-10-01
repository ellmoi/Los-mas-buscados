import {request} from './services/api.js';
import {escapeHTML as e} from './components/ui.js';
import {editorialBody} from './pages/editorial.js';
const statuses={draft:'Borrador',published:'Publicado',hidden:'Oculto'};
export function editorialForm(item={}){
  return `<form class="card admin-section" data-editorial-edit><h2>${item.id?'Editar contenido':'Nueva entrada'}</h2><label>Sección<select class="select" name="kind"><option value="article">Información y cuidados</option><option value="project" ${item.kind==='project'?'selected':''}>Nuestro trabajo</option></select></label>${[['title','Título',160],['summary','Resumen',500],['text','Texto (sin formato HTML)',20000],['sourceUrl','Fuente pública HTTPS',500]].map(([key,label,max])=>`<label>${label}${key==='summary'||key==='text'?`<textarea class="textarea" name="${key}" rows="${key==='text'?12:3}" maxlength="${max}" required>${e(item[key]||'')}</textarea>`:`<input class="input" name="${key}" ${key==='sourceUrl'?'type="url"':''} maxlength="${max}" value="${e(item[key]||'')}" required>`}</label>`).join('')}${item.id?'<label>Justificación<textarea class="textarea" name="reason" minlength="10" maxlength="500" required></textarea></label><p>Guardar retira la publicación hasta una nueva revisión.</p>':''}<button class="button">Guardar borrador</button></form>`;
}
export async function adminEditorial(root,isCurrent){
  let offset=0,filter='all',busy=false;
  async function run(action){
    if(busy)return;busy=true;
    const controls=[...root.querySelectorAll('button,input,textarea,select')].map(control=>({control,disabled:control.disabled}));
    controls.forEach(({control})=>control.disabled=true);
    const error=root.querySelector('[data-editorial-error]');if(error)error.textContent='';
    try{await action();}catch(err){if(isCurrent()){const target=root.querySelector('[data-editorial-error]');if(target)target.textContent=err.message;}}
    finally{busy=false;controls.forEach(({control,disabled})=>control.disabled=disabled);}
  }
  async function show(){
    const data=await request('/admin/editorial?'+new URLSearchParams({offset,status:filter}));if(!isCurrent())return;
    root.innerHTML=`<p role="alert" data-editorial-error></p><div class="moderation-toolbar"><button class="button" data-editorial-new>Nueva entrada</button><label>Estado<select class="select" data-editorial-filter>${[['all','Todos'],...Object.entries(statuses)].map(([key,label])=>`<option value="${key}" ${filter===key?'selected':''}>${label}</option>`).join('')}</select></label></div><p>${data.total} entradas</p><div class="moderation-list">${data.items.map(item=>`<article class="card admin-section"><h2>${e(item.title)}</h2><p>${item.kind==='project'?'Nuestro trabajo':'Información y cuidados'} · ${statuses[item.status]}</p><button class="button secondary" data-editorial-open="${e(item.id)}">Editar y revisar</button></article>`).join('')||'<p>No hay entradas en esta vista.</p>'}</div><div class="moderation-pagination"><button class="button secondary" data-editorial-prev ${offset?'':'disabled'}>Anterior</button><button class="button secondary" data-editorial-next ${offset+data.limit>=data.total?'disabled':''}>Siguiente</button></div><div data-editorial-editor></div>`;
    root.querySelector('[data-editorial-new]').onclick=()=>{if(!busy)editor();};
    root.querySelector('[data-editorial-filter]').onchange=event=>{if(busy)return;filter=event.target.value;offset=0;run(show);};
    root.querySelector('[data-editorial-prev]').onclick=()=>{if(busy)return;offset=Math.max(0,offset-data.limit);run(show);};
    root.querySelector('[data-editorial-next]').onclick=()=>{if(busy)return;offset+=data.limit;run(show);};
    root.querySelectorAll('[data-editorial-open]').forEach(button=>button.onclick=()=>run(async()=>{const item=await request('/admin/editorial/'+encodeURIComponent(button.dataset.editorialOpen));if(isCurrent())editor(item);}));
  }
  function editor(item){
    const host=root.querySelector('[data-editorial-editor]');
    host.innerHTML=editorialForm(item)+(item?`<section class="admin-section"><h2>Vista previa guardada</h2>${editorialBody(item)}</section><form class="card admin-section" data-editorial-review><h2>Revisar publicación</h2><p>Revisa el texto guardado y su fuente antes de publicar. Los cambios sin guardar no forman parte de esta decisión.</p><label>Decisión<select class="select" name="status"><option value="published">Publicar contenido revisado</option><option value="hidden">Ocultar</option></select></label><label>Fecha de revisión<input class="input" type="date" name="reviewedOn" value="${e(item.reviewedOn||'')}" max="${new Date().toISOString().slice(0,10)}"></label><label>Justificación<textarea class="textarea" name="reason" minlength="10" maxlength="500" required></textarea></label><button class="button">Guardar decisión</button></form>`:'');
    host.querySelector('select')?.focus();
    const edit=host.querySelector('[data-editorial-edit]'),review=host.querySelector('[data-editorial-review]');
    if(review)edit.addEventListener('input',()=>{review.querySelector('button').disabled=true;review.querySelector('p').textContent='Guarda los cambios y vuelve a abrir la entrada para revisar la nueva versión.';});
    host.querySelectorAll('form').forEach(form=>form.addEventListener('submit',event=>{
      event.preventDefault();if(busy||form.querySelector('button').disabled)return;
      // Capturar antes de deshabilitar: FormData omite los controles deshabilitados.
      const body={...Object.fromEntries(new FormData(form)),...(item?{revision:item.revision}:{})};
      const path='/admin/editorial'+(item?'/'+encodeURIComponent(item.id):'')+(form.hasAttribute('data-editorial-review')?'/review':'');
      run(async()=>{await request(path,{method:item?'PATCH':'POST',body:JSON.stringify(body)});if(isCurrent())await show();});
    }));
  }
  await show();
}
