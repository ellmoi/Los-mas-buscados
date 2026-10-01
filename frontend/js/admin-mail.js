import {request} from './services/api.js';
import {escapeHTML as e} from './components/ui.js';
const names={pending:'Pendiente',sending:'Enviando',sent:'Aceptado por el transporte',failed:'Fallido',expired:'Enlace vencido o utilizado'};
export async function adminMail(root,isCurrent){
  const data=await request('/admin/mail');if(!isCurrent())return;
  root.innerHTML=`<section class="card admin-section"><h2>Cola de correo</h2><p>Los fallos temporales se reintentan automáticamente, hasta ocho intentos. El estado aceptado no confirma la llegada a la bandeja de entrada. En modo local se guarda un archivo.</p><button class="button secondary" data-mail-refresh>Actualizar</button><p role="status"></p></section><div class="metric-grid">${data.counts.map(row=>`<article class="card metric"><span>${names[row.status]}</span><strong>${row.total}</strong></article>`).join('')}</div><div class="moderation-list">${data.items.map(item=>`<article class="card admin-section"><h2>${item.kind==='verification'?'Verificación de correo':'Recuperación de cuenta'}</h2><p>${names[item.status]} · ${item.attempts} intentos</p><p>${item.status==='pending'?'Próximo intento: '+e(new Date(item.next_attempt).toLocaleString('es-CO')):'Actualizado: '+e(new Date(item.updated).toLocaleString('es-CO'))}</p>${item.error_code?`<p>Código: ${e(item.error_code)}</p>`:''}</article>`).join('')||'<p>No hay solicitudes de correo.</p>'}</div>`;
  root.querySelector('[data-mail-refresh]').onclick=async event=>{
    const button=event.currentTarget;button.disabled=true;
    try{await adminMail(root,isCurrent);}catch(error){if(isCurrent())root.querySelector('[role=status]').textContent=error.message;}finally{button.disabled=false;}
  };
}
