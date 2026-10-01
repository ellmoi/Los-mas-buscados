import {request} from '../services/api.js';
import {escapeHTML as e} from '../components/ui.js';
import {getUser} from '../components/session-menu.js';

export function commentCard(item){
  return `<article class="card public-comment"><header><strong>${e(item.authorName)}</strong><small>${e(new Date(item.created).toLocaleString('es-CO'))}${item.revision>1?' · Actualizado':''}</small></header><p class="comment-text">${e(item.text)}</p>${item.status==='hidden'?'<p class="caption">Oculto por moderación. Solo tú y el equipo pueden consultarlo.</p>':''}${item.canEdit?`<details><summary>Editar o retirar mi comentario</summary><form data-comment-edit="${item.id}" data-revision="${item.revision}"><label>Comentario<textarea class="textarea" name="text" maxlength="1000" required>${e(item.text)}</textarea></label><button class="button secondary">Guardar cambios</button></form><details><summary>Retirar comentario</summary><p>Se quitará el texto y no podrás recuperarlo.</p><button class="button danger" data-comment-remove="${item.id}" data-revision="${item.revision}">Retirar definitivamente</button></details></details>`:''}${item.canReport?`<details><summary>Denunciar comentario</summary><p>El motivo solo lo verá el equipo de moderación.</p><form data-comment-report="${item.id}"><label>Motivo privado<textarea class="textarea" name="reason" minlength="10" maxlength="500" required></textarea></label><button class="button secondary">Enviar denuncia</button><p role="status" data-report-status></p></form></details>`:''}</article>`;
}
export function commentsSection(p){
  if(p.visibility==='hidden')return '';
  return `<section class="comments-section" data-comments-case="${e(p.id)}"><header class="page-header"><h2>Comentarios públicos</h2><button class="button secondary" data-comments-refresh>Actualizar</button></header><p>Los comentarios son visibles para todos. Usa el contacto privado para compartir datos personales.</p>${getUser()?'<form class="card public-comment" data-comment-new><label>Tu comentario<textarea class="textarea" name="text" required maxlength="1000" placeholder="Escribe algo que ayude a la comunidad."></textarea></label><button class="button">Publicar comentario</button></form>':'<p><a href="#/login">Inicia sesión</a> para comentar.</p>'}<p role="status" data-comments-status></p><div data-comments-list></div><button class="button secondary" data-comments-more hidden>Ver comentarios anteriores</button></section>`;
}
export function bindComments(){
  const root=document.querySelector('[data-comments-case]');if(!root)return;
  const list=root.querySelector('[data-comments-list]'),status=root.querySelector('[data-comments-status]'),more=root.querySelector('[data-comments-more]'),refresh=root.querySelector('[data-comments-refresh]'),form=root.querySelector('[data-comment-new]');
  let busy=false,before=null,pending=null;
  async function run(action){
    if(busy)return;busy=true;
    const controls=[...root.querySelectorAll('button,textarea')].map(control=>({control,disabled:control.disabled}));controls.forEach(({control})=>control.disabled=true);status.textContent='';
    try{await action();}catch(error){if(root.isConnected)status.textContent=error.message;}finally{busy=false;controls.forEach(({control,disabled})=>control.disabled=disabled);}
  }
  async function load(older=false){
    const data=await request('/cases/'+encodeURIComponent(root.dataset.commentsCase)+'/comments'+(older&&before?'?before='+before:''));
    if(!root.isConnected)return;
    if(!older)list.replaceChildren();list.insertAdjacentHTML('beforeend',data.items.map(commentCard).join(''));before=data.nextBefore;more.hidden=!data.hasMore;
    status.textContent=!older&&!data.items.length?'Aún no hay comentarios. Sé el primero en participar.':'';
    bindRows();
  }
  function bindRows(){
    list.querySelectorAll('[data-comment-report]').forEach(report=>report.onsubmit=event=>{
      event.preventDefault();const reason=report.elements.reason.value;
      run(async()=>{
        const result=await request('/comments/'+report.dataset.commentReport+'/reports',{method:'POST',body:JSON.stringify({reason})});
        if(root.isConnected)report.querySelector('[data-report-status]').textContent=result.message;
      });
    });
    list.querySelectorAll('[data-comment-edit]').forEach(edit=>edit.onsubmit=event=>{
      event.preventDefault();const text=edit.elements.text.value;
      run(async()=>{await request('/comments/'+edit.dataset.commentEdit,{method:'PATCH',body:JSON.stringify({text,revision:Number(edit.dataset.revision)})});await load();});
    });
    list.querySelectorAll('[data-comment-remove]').forEach(button=>button.onclick=()=>run(async()=>{await request('/comments/'+button.dataset.commentRemove,{method:'PATCH',body:JSON.stringify({status:'deleted',revision:Number(button.dataset.revision)})});await load();}));
  }
  form?.addEventListener('submit',event=>{
    event.preventDefault();if(busy)return;
    const text=form.elements.text.value.trim();
    if(!pending||pending.text!==text)pending={text,clientId:crypto.randomUUID()};
    const body=pending;
    run(async()=>{
      await request('/cases/'+encodeURIComponent(root.dataset.commentsCase)+'/comments',{method:'POST',body:JSON.stringify(body)});
      pending=null;form.reset();await load();
    });
  });
  refresh.onclick=()=>run(()=>load());more.onclick=()=>run(()=>load(true));run(()=>load());
}
