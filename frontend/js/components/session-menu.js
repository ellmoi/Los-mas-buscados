import {request} from '../services/api.js';
import {escapeHTML as e} from './ui.js';
let user = null;
export const getUser = () => user;
export const getDemoRole = () => user?.role || 'PUBLIC';
export async function loadSession(){user=await request('/me');return user;}
export function renderSessionUI(onChange){
  document.querySelector('#demo-session-control').replaceChildren();
  const account=document.querySelector('#account-area');
  account.innerHTML=user?'<div class="session-account"><strong>'+e(user.name)+'</strong>'+(user.role==='ADMIN'?'<a href="./admin/">Administración</a>':'')+'<a href="#/configuracion">Mi cuenta</a><a href="#/mensajes">Mensajes</a><a href="#/notificaciones">Notificaciones</a><a href="#/solicitudes-adopcion">Solicitudes de adopción</a><a href="#/casos">Mis casos</a><button class="button secondary block" data-logout>Cerrar sesión</button></div>':'<div class="guest-actions"><a class="button secondary block" href="#/login">Iniciar sesión</a><a class="button block" href="#/registro">Crear cuenta</a></div>';
  account.querySelector('[data-logout]')?.addEventListener('click',async event=>{event.target.disabled=true;try{await request('/logout',{method:'POST'});user=null;renderSessionUI(onChange);onChange();}catch(error){event.target.disabled=false;const p=document.createElement('p');p.textContent=error.message;account.append(p);}});
}