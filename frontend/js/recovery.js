import {request} from './services/api.js';
import {loadSession,renderSessionUI} from './components/session-menu.js';
import {toast} from './components/modal.js';
export function bindRecovery(render){
 const form=document.querySelector('[data-recovery-form]');if(!form)return;
 form.addEventListener('submit',async event=>{
  event.preventDefault();const reset=form.dataset.recoveryForm==='reset',status=form.querySelector('[role=status]'),button=form.querySelector('button');
  if(reset&&form.elements.password.value!==form.elements.confirm.value){status.textContent='Las contraseñas no coinciden.';return;}
  const token=new URLSearchParams(location.hash.split('?')[1]||'').get('token');
  const body=reset?{token,password:form.elements.password.value}:{email:form.elements.email.value};
  button.disabled=true;status.textContent='Procesando…';
  try{
   const result=await request('/password/'+(reset?'reset':'forgot'),{method:'POST',body:JSON.stringify(body)});
   status.textContent=result.message;
   if(reset){form.reset();await loadSession();renderSessionUI(render);location.replace('#/login');toast(result.message);}
  }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
 });
}
