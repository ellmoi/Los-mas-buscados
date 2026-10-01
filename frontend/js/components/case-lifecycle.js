import {escapeHTML as e} from './ui.js';
import {getUser} from './session-menu.js';
import {api} from '../services/api.js';
import {loginForCase} from '../auth-return.js';

const outcomes={reunited:'Regresó con su familia',safe:'El animal quedó seguro',other:'Otro resultado'};
export function resolutionNote(p){
 if(p.state!=='resolved')return '';
 return `<aside class="case-resolution"><h2>✓ Caso resuelto</h2>${p.resolution?`<p>${e(outcomes[p.resolution.outcome]||'Caso resuelto')}</p>${p.resolution.note?`<p>${e(p.resolution.note)}</p>`:''}`:''}<p class="caption">El reporte permanece en el historial.</p></aside>`;
}
export function resolutionActions(p){
 if(!p.canResolve)return '';
 const reopen=p.state==='resolved';
 return `<button type="button" class="button" data-resolve-case="${e(p.id)}" data-state="${reopen?'open':'resolved'}" aria-expanded="false" aria-controls="resolution-panel">${reopen?'Reabrir caso':'Marcar como resuelto'}</button><section id="resolution-panel" class="case-resolution-confirm" data-resolution-panel hidden aria-labelledby="resolution-question"><h2 id="resolution-question">${reopen?'¿Quieres volver a activar este caso?':'¿La mascota ya está segura o regresó con su familia?'}</h2><form data-resolution-form>${reopen?'<p>El caso volverá a las búsquedas activas. Se retirará el resultado público anterior.</p>':`<label for="resolution-outcome">Resultado<select class="select" id="resolution-outcome" name="outcome" required><option value="">Selecciona un resultado</option><option value="reunited">Regresó con su familia</option><option value="safe">El animal quedó seguro</option><option value="other">Otro resultado</option></select></label><label for="resolution-note">Nota pública opcional<textarea class="textarea" id="resolution-note" name="note" maxlength="300" placeholder="Ej. Luna volvió con su familia."></textarea></label><p class="caption">Hasta 300 caracteres. Evita teléfonos, correos o direcciones personales.</p>`}<div class="filters"><button type="button" class="button secondary" data-cancel-resolution>Cancelar</button><button class="button" data-confirm-resolution>${reopen?'Sí, reabrir caso':'Sí, resolver caso'}</button></div><p role="status" data-resolution-status></p></form></section>`;
}
export function caseContact(p){
 if(p.kind==='adoption'||p.isOwner||p.visibility==='hidden')return '';
 const from=new URLSearchParams((globalThis.location?.hash||'').split('?')[1]||'').get('from');
 const related=from&&/^[a-zA-Z0-9-]{1,80}$/.test(from)&&from!==p.id?from:'';
 const destination=globalThis.location?.hash||'#/mascota/'+p.id;
 return `<section class="card contact-case"><h2>Contactar sobre este caso</h2><p>Intercambia información en privado y verifica características que solo el responsable conozca. No publiques tus datos personales.</p>${p.state==='resolved'?'<p>El caso ya está resuelto. Puedes consultar una conversación anterior; no se abren contactos nuevos.</p>':''}${getUser()?`<button type="button" class="button" data-open-contact="${e(p.id)}" data-related-case="${e(related)}">${p.state==='resolved'?'Consultar conversación anterior':'Contactar sobre este caso'}</button><p role="status" data-contact-status></p>`:`<a class="button" href="${e(loginForCase(destination))}">Iniciar sesión para contactar</a>`}</section>`;
}
export function bindResolution(render){
 const trigger=document.querySelector('[data-resolve-case]'),panel=document.querySelector('[data-resolution-panel]');if(!trigger||!panel)return;
 const form=panel.querySelector('form'),cancel=panel.querySelector('[data-cancel-resolution]'),submit=panel.querySelector('[data-confirm-resolution]'),status=panel.querySelector('[data-resolution-status]');let saving=false;
 const hide=()=>{if(saving)return;panel.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.focus();};
 trigger.addEventListener('click',()=>{panel.hidden=false;trigger.setAttribute('aria-expanded','true');(form.elements.outcome||cancel).focus();});
 cancel.addEventListener('click',hide);panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();hide();}});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(saving)return;saving=true;submit.disabled=true;cancel.disabled=true;status.textContent='Guardando…';
  const body={state:trigger.dataset.state};if(body.state==='resolved')body.resolution={outcome:form.elements.outcome.value,note:form.elements.note.value};
  try{await api.saveCase(body,trigger.dataset.resolveCase);await render();}
  catch(error){status.textContent=error.message;}finally{saving=false;submit.disabled=false;cancel.disabled=false;}
 });
}
