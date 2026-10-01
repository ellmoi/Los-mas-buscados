import {request} from './services/api.js';
import {escapeHTML as e} from './components/ui.js';
const labels={pending:'Pendientes',reviewed:'Revisadas',dismissed:'Descartadas'};
const states={visible:'Visible',hidden:'Oculto',deleted:'Retirado por su autor'};
export function commentReportCard(item){
  return `<article class="card admin-section"><h2>Denuncia #${item.id} · ${e(states[item.commentStatus])}</h2><p>Comentario de ${e(item.authorName)}</p><p class="comment-text">${e(item.text||'El autor retiró el texto.')}</p>${item.reportedRevision!==item.commentRevision?'<p class="caption">El comentario cambió desde la denuncia. Revisa su estado actual antes de decidir.</p>':''}<p><strong>Motivo privado de ${e(item.reporterName)}:</strong> ${e(item.reason)}</p><a href="#/mascota/${encodeURIComponent(item.caseId)}">Consultar caso</a>${item.status==='pending'?`<form data-resolve-comment-report="${item.id}" data-revision="${item.commentRevision}"><label>Decisión<select class="select" name="decision">${item.commentStatus==='visible'?'<option value="hide">Ocultar comentario y resolver</option>':''}<option value="reviewed">Revisado, conservar estado actual</option><option value="dismissed">Descartar denuncia</option></select></label><label>Justificación<textarea class="textarea" name="reason" minlength="10" maxlength="500" required></textarea></label><button class="button secondary">Guardar decisión</button></form>`:`<p>${e(labels[item.status])} · ${e(item.resolverName)} · ${e(item.resolvedAt)}</p><p>${e(item.resolution)}</p>`}</article>`;
}
export async function adminCommentReports(root,isCurrent){
  let filter='pending',before=null,history=[],busy=false;
  async function load(nextFilter=filter,nextBefore=before,nextHistory=history){
    const data=await request('/admin/comment-reports?'+new URLSearchParams({status:nextFilter,...(nextBefore?{before:nextBefore}:{})}));
    if(!isCurrent())return;
    filter=nextFilter;before=nextBefore;history=nextHistory;
    root.innerHTML=`<p role="alert" data-reports-error></p><div class="moderation-toolbar"><label>Estado<select class="select" data-reports-filter>${Object.entries(labels).map(([key,label])=>`<option value="${key}" ${filter===key?'selected':''}>${label}</option>`).join('')}</select></label><button class="button secondary" data-reports-refresh>Actualizar</button></div><div class="moderation-list">${data.items.map(commentReportCard).join('')||'<p>No hay denuncias en esta vista.</p>'}</div><div class="moderation-pagination"><button class="button secondary" data-reports-prev ${history.length?'':'disabled'}>Anterior</button><button class="button secondary" data-reports-next ${data.hasMore?'':'disabled'}>Siguiente</button></div>`;
    root.querySelector('[data-reports-filter]').onchange=event=>{const value=event.target.value;run(()=>load(value,null,[]));};
    root.querySelector('[data-reports-refresh]').onclick=()=>run(()=>load());
    root.querySelector('[data-reports-next]').onclick=()=>run(()=>load(filter,data.nextBefore,[...history,before]));
    root.querySelector('[data-reports-prev]').onclick=()=>run(()=>load(filter,history.at(-1),history.slice(0,-1)));
    root.querySelectorAll('form').forEach(form=>form.onsubmit=event=>{
      event.preventDefault();
      const body={decision:form.elements.decision.value,reason:form.elements.reason.value,commentRevision:Number(form.dataset.revision)};
      run(async()=>{await request('/admin/comment-reports/'+form.dataset.resolveCommentReport,{method:'PATCH',body:JSON.stringify(body)});await load();});
    });
  }
  async function run(action){
    if(busy)return;busy=true;
    const controls=[...root.querySelectorAll('button,select,textarea')].map(control=>({control,disabled:control.disabled}));controls.forEach(({control})=>control.disabled=true);
    try{await action();}catch(error){if(isCurrent())root.querySelector('[data-reports-error]').textContent=error.message;}finally{busy=false;controls.forEach(({control,disabled})=>control.disabled=disabled);}
  }
  await load();
}
