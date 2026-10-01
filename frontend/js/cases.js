import {returnAfterAuth} from './auth-return.js';
import {bindResolution} from './components/case-lifecycle.js';
import {bindCaseList} from './case-list.js';
// Controladores de casos y autenticación. Se vuelven a enlazar cuando app.js reemplaza la pantalla.
import {api,request} from './services/api.js';
import {getUser,loadSession,renderSessionUI} from './components/session-menu.js';
import {filters,escapeHTML as e} from './components/ui.js';
import {toast} from './components/modal.js';
export async function myCases(){const user=getUser();return `<header class="page-header"><div><span class="eyebrow">Tu espacio</span><h1>Mis reportes</h1><p>${e(user?.name)} · Gestiona tus casos y consulta su historial.</p></div><button class="button" data-modal="lost">Nuevo reporte</button></header><nav class="filters" aria-label="Seguimiento de mis casos"><a class="button secondary" href="#/casos">Todos</a><a class="button secondary" href="#/casos?state=open">Activos</a><a class="button secondary" href="#/casos?state=resolved">Resueltos</a><a class="button secondary" href="#/mensajes">Mis conversaciones</a></nav>${filters()}<div class="grid-list" data-live-cases data-mine="true"></div><p role="status" data-list-status></p><button class="button secondary" data-load-more hidden>Ver más casos</button>`;}
export function bindCases(render){
  const form=document.querySelector('[data-auth-form]');
  form?.addEventListener('submit',async event=>{
    event.preventDefault();const error=form.querySelector('[data-form-error]');error.textContent='';const button=form.querySelector('button');
    if(form.dataset.register==='true'&&form.querySelector('#password').value!==form.querySelector('#confirm').value){error.textContent='Las contraseñas no coinciden.';return;}
    button.disabled=true;
    try{await request(form.dataset.register==='true'?'/register':'/login',{method:'POST',body:JSON.stringify({name:form.querySelector('#name')?.value,email:form.querySelector('#email').value,password:form.querySelector('#password').value})});await loadSession();renderSessionUI(render);location.hash=returnAfterAuth();}catch(err){error.textContent=err.message;}finally{button.disabled=false;}
  });
  document.querySelector('[data-edit-case]')?.addEventListener('click',async event=>{const button=event.currentTarget;button.disabled=true;try{const p=await api.getPet(button.dataset.editCase);if(!p)throw new Error('El caso ya no está disponible.');if(button.isConnected)window.dispatchEvent(new CustomEvent('edit-case',{detail:p}));}catch(error){toast(error.message);}finally{button.disabled=false;}});
  bindResolution(render);
  return bindCaseList();
}
