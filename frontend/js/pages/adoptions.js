import {request} from '../services/api.js';
import {escapeHTML as e} from '../components/ui.js';
import {getUser} from '../components/session-menu.js';

const labels={pending:'Pendiente',accepted:'Adopción confirmada',rejected:'No seleccionada',withdrawn:'Retirada'};
export function adoptionActions(p) {
  if(!p.canManageAdoption)return '';
  return `<section class="card contact-case" data-adoption-controls><h2>Gestionar adopción</h2><a class="button secondary" href="#/solicitudes-adopcion?role=owner&caseId=${encodeURIComponent(p.id)}">Ver solicitudes recibidas</a>${p.state==='adopted'?'<p>La adopción fue confirmada. Conservamos su historial y no se puede reabrir.</p>':`<button class="button secondary" data-adoption-state="${e(p.id)}" data-state="${p.state==='paused'?'available':'paused'}">${p.state==='paused'?'Volver a recibir solicitudes':'Pausar solicitudes'}</button><p>Pausar conserva las solicitudes existentes. Para confirmar una adopción, abre la solicitud de la persona seleccionada.</p>`}<p role="status"></p></section>`;
}
export function adoptionContact(p) {
  if(p.canManageAdoption)return '';
  if(p.myApplication)return `<section class="card contact-case"><h2>Tu solicitud: ${labels[p.myApplication.state]}</h2><a class="button" href="#/solicitudes-adopcion/${encodeURIComponent(p.myApplication.id)}">Consultar solicitud</a><p>Se admite una solicitud por persona y mascota.</p></section>`;
  if(p.state!=='available'||p.visibility==='hidden')return '<section class="card contact-case"><h2>Esta mascota no recibe solicitudes</h2><p>Consulta otras mascotas en Adopciones.</p></section>';
  return `<section class="card contact-case"><h2>Quiero adoptar</h2><p>La solicitud solo la verán tú y el responsable. Explica tu experiencia, el hogar que puedes ofrecer y cómo atenderías sus cuidados. No incluyas documentos ni direcciones exactas.</p><p>Enviar una solicitud no reserva la mascota. Se admite una solicitud por persona y mascota; puedes retirarla después.</p><form data-adoption-apply="${e(p.id)}"><label for="adoption-message">Tu presentación<textarea id="adoption-message" class="textarea" name="message" minlength="20" maxlength="2000" required></textarea></label><button class="button">Enviar solicitud privada</button><p role="status"></p></form></section>`;
}
export function applicationCard(item) {
  return `<article class="card conversation-card"><div><h2><a href="#/solicitudes-adopcion/${encodeURIComponent(item.id)}">${e(item.caseName)}</a></h2><p>${item.canManage?'Solicitud de '+e(item.applicantName):'Tu solicitud'}</p><span>${labels[item.state]||e(item.state)}</span></div><a class="button secondary" href="#/solicitudes-adopcion/${encodeURIComponent(item.id)}">Ver solicitud</a></article>`;
}
export function applicationDetail(item) {
  const pending=item.state==='pending',canAccept=pending&&item.canManage&&item.caseState==='available'&&!item.caseHidden;
  return `<section class="card contact-case" data-application="${e(item.id)}"><a href="#/solicitudes-adopcion?role=${item.canManage?'owner':'applicant'}">← Volver a solicitudes</a><h1>${e(item.caseName)}</h1><span class="badge">${labels[item.state]||e(item.state)}</span><h2>${item.canManage?'Solicitud de '+e(item.applicantName):'Tu presentación'}</h2><p class="application-message">${e(item.message)}</p><small>${e(new Date(item.created).toLocaleString('es-CO'))}</small>${item.caseHidden?'<p>La publicación está oculta por moderación; el historial privado se conserva.</p>':''}${!item.caseHidden||item.canManage?`<a href="#/mascota/${encodeURIComponent(item.caseId)}">Consultar mascota y requisitos</a>`:''}${canAccept?'<form data-application-accept><label><input type="checkbox" required> Confirmo que esta adopción se concretó con esta persona. La publicación quedará como Adoptado y las demás solicitudes pendientes se cerrarán. Esta acción no puede deshacerse desde la aplicación.</label><button class="button">Confirmar adopción</button></form>':''}${pending&&item.canManage&&!canAccept?'<p>Para confirmar la adopción, la publicación debe estar disponible y visible.</p>':''}${pending&&item.canManage?'<button class="button secondary" data-application-state="rejected">No seleccionar esta solicitud</button>':''}${item.canWithdraw?'<button class="button secondary" data-application-state="withdrawn">Retirar mi solicitud</button><p>Una solicitud retirada no puede volver a enviarse para la misma mascota.</p>':''}<p role="status"></p></section>`;
}
export async function applicationsPage(id) {
  if(id)return applicationDetail(await request('/adoption-applications/'+encodeURIComponent(id)));
  const params=new URLSearchParams(location.hash.split('?')[1]||''),role=params.get('role')==='owner'?'owner':'applicant';
  return `<section data-applications data-role="${role}" data-case-id="${e(params.get('caseId')||'')}"><header class="page-header"><div><span class="eyebrow">Tu espacio</span><h1>Solicitudes de adopción</h1><p>${role==='owner'?'Solicitudes recibidas para tus mascotas.':'Consulta y gestiona tus solicitudes enviadas.'}</p></div><button class="button secondary" data-application-refresh>Actualizar</button></header><nav class="filters" aria-label="Bandeja de solicitudes"><a class="button secondary" href="#/solicitudes-adopcion?role=applicant" ${role==='applicant'?'aria-current="page"':''}>Enviadas</a><a class="button secondary" href="#/solicitudes-adopcion?role=owner" ${role==='owner'?'aria-current="page"':''}>Recibidas</a><a href="#/adopciones">Explorar adopciones</a></nav><div class="conversation-list" data-application-list></div><p role="status"></p><button class="button secondary" data-application-more hidden>Ver más solicitudes</button></section>`;
}
export function bindAdoptions(render) {
  async function act(root,action) {
    if(root.dataset.busy)return;root.dataset.busy='true';
    const buttons=[...root.querySelectorAll('button')],status=root.querySelector('[role=status]');
    buttons.forEach(button=>button.disabled=true);status.textContent='Guardando…';
    try{await action();}catch(error){if(root.isConnected)status.textContent=error.message;}finally{delete root.dataset.busy;buttons.forEach(button=>button.disabled=false);}
  }
  const apply=document.querySelector('[data-adoption-apply]');
  apply?.addEventListener('submit',event=>{event.preventDefault();if(!getUser()){location.hash='#/login';return;}act(apply,async()=>{
    const result=await request('/cases/'+encodeURIComponent(apply.dataset.adoptionApply)+'/adoption-applications',{method:'POST',body:JSON.stringify({message:apply.elements.message.value})});
    if(apply.isConnected)location.hash='#/solicitudes-adopcion/'+result.id;
  });});
  const state=document.querySelector('[data-adoption-state]');
  state?.addEventListener('click',()=>{const root=state.closest('[data-adoption-controls]');act(root,async()=>{await request('/cases/'+encodeURIComponent(state.dataset.adoptionState)+'/adoption-state',{method:'PATCH',body:JSON.stringify({state:state.dataset.state})});if(root.isConnected)await render();});});
  const detail=document.querySelector('[data-application]');
  if(detail){
    const change=state=>act(detail,async()=>{await request('/adoption-applications/'+encodeURIComponent(detail.dataset.application),{method:'PATCH',body:JSON.stringify({state})});if(detail.isConnected)await render();});
    detail.querySelector('[data-application-accept]')?.addEventListener('submit',event=>{event.preventDefault();change('accepted');});
    detail.querySelectorAll('[data-application-state]').forEach(button=>button.addEventListener('click',()=>change(button.dataset.applicationState)));
  }
  const root=document.querySelector('[data-applications]');if(!root)return;
  const list=root.querySelector('[data-application-list]'),more=root.querySelector('[data-application-more]'),refresh=root.querySelector('[data-application-refresh]');let offset=0;
  const load=reset=>act(root,async()=>{
    const params=new URLSearchParams({role:root.dataset.role,offset:reset?0:offset});if(root.dataset.caseId)params.set('caseId',root.dataset.caseId);
    const result=await request('/adoption-applications?'+params);if(!root.isConnected)return;
    if(reset)list.replaceChildren();list.insertAdjacentHTML('beforeend',result.items.map(applicationCard).join(''));offset=result.offset+result.items.length;more.hidden=offset>=result.total;
    root.querySelector('[role=status]').textContent=result.total?`${offset} de ${result.total} solicitudes`:'Aún no hay solicitudes en esta bandeja.';
  });
  more.onclick=()=>load(false);refresh.onclick=()=>load(true);load(true);
}
