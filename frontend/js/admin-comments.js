import {request} from './services/api.js';
import {escapeHTML as e} from './components/ui.js';
const labels={visible:'Visible',hidden:'Oculto',deleted:'Retirado por su autor'};
export function moderationComment(item){
  return `<article class="card admin-section"><h2>${e(item.authorName)} · ${labels[item.status]}</h2><p class="comment-text">${e(item.text||'El autor retiró el texto.')}</p><a href="#/mascota/${encodeURIComponent(item.caseId)}">Consultar caso</a>${item.status!=='deleted'?`<form data-moderate-comment="${item.id}" data-revision="${item.revision}" data-status="${item.status==='hidden'?'visible':'hidden'}"><label>Justificación<textarea class="textarea" name="reason" minlength="10" maxlength="500" required></textarea></label><button class="button secondary">${item.status==='hidden'?'Restaurar':'Ocultar'} comentario</button></form>`:''}</article>`;
}
export async function adminComments(root,isCurrent){
  let filter='visible',before=null,history=[],busy=false;
  async function load(nextFilter=filter,nextBefore=before,nextHistory=history){
    const data=await request('/admin/comments?'+new URLSearchParams({status:nextFilter,...(nextBefore?{before:nextBefore}:{})}));
    if(!isCurrent())return;
    filter=nextFilter;before=nextBefore;history=nextHistory;
    root.innerHTML=`<p role="alert" data-comments-error></p><div class="moderation-toolbar"><label>Estado<select class="select" data-comments-filter>${Object.entries(labels).map(([key,label])=>`<option value="${key}" ${filter===key?'selected':''}>${label}</option>`).join('')}</select></label><button class="button secondary" data-comments-refresh>Actualizar</button></div><div class="moderation-list">${data.items.map(moderationComment).join('')||'<p>No hay comentarios en esta vista.</p>'}</div><div class="moderation-pagination"><button class="button secondary" data-comments-prev ${history.length?'':'disabled'}>Anterior</button><button class="button secondary" data-comments-next ${data.hasMore?'':'disabled'}>Siguiente</button></div>`;
    root.querySelector('[data-comments-filter]').onchange=event=>{const value=event.target.value;run(()=>load(value,null,[]));};
    root.querySelector('[data-comments-refresh]').onclick=()=>run(()=>load());
    root.querySelector('[data-comments-next]').onclick=()=>run(()=>load(filter,data.nextBefore,[...history,before]));
    root.querySelector('[data-comments-prev]').onclick=()=>run(()=>load(filter,history.at(-1),history.slice(0,-1)));
    root.querySelectorAll('form').forEach(form=>form.onsubmit=event=>{
      event.preventDefault();const reason=form.elements.reason.value;
      run(async()=>{await request('/admin/comments/'+form.dataset.moderateComment,{method:'PATCH',body:JSON.stringify({revision:Number(form.dataset.revision),status:form.dataset.status,reason})});await load();});
    });
  }
  async function run(action){
    if(busy)return;busy=true;
    const controls=[...root.querySelectorAll('button,select,textarea')].map(control=>({control,disabled:control.disabled}));controls.forEach(({control})=>control.disabled=true);
    try{await action();}catch(error){if(isCurrent())root.querySelector('[data-comments-error]').textContent=error.message;}finally{busy=false;controls.forEach(({control,disabled})=>control.disabled=disabled);}
  }
  await load();
}
