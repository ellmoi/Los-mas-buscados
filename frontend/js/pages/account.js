import {request} from '../services/api.js';
import {loadSession,renderSessionUI} from '../components/session-menu.js';
import {escapeHTML as e} from '../components/ui.js';
import {toast} from '../components/modal.js';

export function accountView(user){
 if(!user)return '<section class="card state-card"><h1>Inicia sesión</h1><a class="button" href="#/login">Ir a mi cuenta</a></section>';
 return `<header class="page-header"><div><span class="eyebrow">Tu espacio</span><h1>Mi cuenta</h1><p>Administra tus datos y confirma tu correo.</p></div><a class="button secondary" href="#/casos">Mis casos</a></header><nav class="filters" aria-label="Seguimiento"><a class="button secondary" href="#/casos?state=open">Mis reportes activos</a><a class="button secondary" href="#/casos?state=resolved">Mis reportes resueltos</a><a class="button secondary" href="#/mensajes">Mis conversaciones</a></nav><div class="account-grid"><section class="card account-section"><h2>Tu nombre</h2><p>Es el nombre que ven las personas con las que conversas.</p><form data-account-form><label for="account-name">Nombre</label><input class="input" id="account-name" name="name" maxlength="80" required autocomplete="name" value="${e(user.name)}"><button class="button">Guardar nombre</button><p role="status"></p></form></section><section class="card account-section"><h2>Correo electrónico</h2><p class="account-email">${e(user.email)}</p><span class="badge ${user.emailVerified?'success':''}">${user.emailVerified?'Correo verificado':'Pendiente de verificación'}</span>${user.emailVerified?'<p>Ya confirmaste el acceso a esta dirección de correo.</p>':'<p>Solicita un enlace y confirma tu dirección. El enlace vence en 24 horas.</p><button class="button secondary" data-request-verification>Solicitar enlace</button><p role="status" data-verification-status></p>'}</section><section class="card account-section"><h2>Acceso a tu cuenta</h2><p>Si necesitas una nueva contraseña, solicita un enlace de recuperación.</p><a class="button secondary" href="#/recuperar">Recuperar contraseña</a></section></div>`;
}
export async function accountPage(){return accountView(await loadSession());}
export const verificationPage=()=>'<section class="card auth-card"><h1>Confirma tu correo</h1><p>Presiona el botón para confirmar la dirección asociada al enlace que recibiste.</p><form data-verify-email><button class="button">Confirmar correo</button><p role="status"></p></form><p><a href="#/configuracion">Volver a mi cuenta o solicitar otro enlace</a></p></section>';
export function bindAccount(render){
 const form=document.querySelector('[data-account-form]');
 form?.addEventListener('submit',async event=>{
  event.preventDefault();const button=form.querySelector('button'),status=form.querySelector('[role=status]');button.disabled=true;status.textContent='Guardando…';
  try{await request('/me',{method:'PATCH',body:JSON.stringify({name:form.elements.name.value})});await loadSession();renderSessionUI(render);await render();toast('Nombre actualizado.');}catch(error){status.textContent=error.message;}finally{button.disabled=false;}
 });
 const send=document.querySelector('[data-request-verification]');
 send?.addEventListener('click',async()=>{
  send.disabled=true;const status=document.querySelector('[data-verification-status]');status.textContent='Solicitando enlace…';
  try{const result=await request('/email/verification',{method:'POST',body:'{}'});status.textContent=result.message;}catch(error){status.textContent=error.message;}finally{send.disabled=false;}
 });
 const verify=document.querySelector('[data-verify-email]');
 verify?.addEventListener('submit',async event=>{
  event.preventDefault();const button=verify.querySelector('button'),status=verify.querySelector('[role=status]');button.disabled=true;
  const token=new URLSearchParams(location.hash.split('?')[1]||'').get('token');
  try{const result=await request('/email/verify',{method:'POST',body:JSON.stringify({token})});
   // Remove the consumed token even if session refresh fails afterward.
   history.replaceState(null,'','#/verificar-correo');status.textContent=result.message;
   try{await loadSession();renderSessionUI(render);}catch{toast('Correo confirmado. Actualiza la página para refrescar tu cuenta.');}
  }catch(error){status.textContent=error.message;button.disabled=false;}
 });
}
