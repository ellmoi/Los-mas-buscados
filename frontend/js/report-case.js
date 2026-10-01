import {request} from './services/api.js';
export function bindReport(){
 const form=document.querySelector('[data-report-case]');
 form?.addEventListener('submit',async event=>{
  event.preventDefault();const button=form.querySelector('button'),status=form.querySelector('[role=status]');button.disabled=true;status.textContent='Enviando…';
  try{await request('/cases/'+encodeURIComponent(form.dataset.reportCase)+'/reports',{method:'POST',body:JSON.stringify({reason:form.elements.reason.value})});form.reset();status.textContent='Reporte recibido. El equipo revisará el caso.';}
  catch(error){status.textContent=error.message;}finally{button.disabled=false;}
 });
}
