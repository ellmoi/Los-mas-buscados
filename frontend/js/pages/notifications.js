import {request} from '../services/api.js';
import {escapeHTML as e} from '../components/ui.js';

export function notificationCard(item) {
  const title={adoption_application:'Recibiste una solicitud de adopción',adoption_accepted:'Tu adopción fue confirmada',adoption_rejected:'Tu solicitud de adopción no fue seleccionada',adoption_withdrawn:'Una solicitud de adopción fue retirada',message:'Tienes un nuevo mensaje',case_hidden:'Tu caso fue ocultado por moderación',case_restored:'Tu caso vuelve a estar visible'}[item.kind]||'Actualización de tu caso';
  const href=(item.kind.startsWith('adoption_')?'#/solicitudes-adopcion/':item.kind==='message'?'#/mensajes/':'#/mascota/')+encodeURIComponent(item.targetId);
  return `<article class="card conversation-card"><div><h2><a href="${e(href)}">${title}</a></h2><p>${e(new Date(item.created).toLocaleString('es-CO'))}</p><span>${item.read?'Leída':'Sin leer'}</span></div>${item.read?'':`<button class="button secondary" data-notification-read="${e(item.id)}">Marcar como leída</button>`}</article>`;
}
export function notificationsPage() {
  return `<section data-notifications><header class="page-header"><div><span class="eyebrow">Tu espacio</span><h1>Notificaciones</h1><p>Avisos de mensajes, solicitudes de adopción y cambios de moderación. Pulsa Actualizar para consultar novedades.</p></div><button class="button secondary" data-notification-refresh>Actualizar</button></header><p data-notification-count></p><button class="button secondary" data-notification-all disabled>Marcar todas como leídas</button><div class="conversation-list" data-notification-list></div><p role="status" data-notification-status></p><button class="button secondary" data-notification-more hidden>Ver anteriores</button></section>`;
}
export function bindNotifications() {
  const root=document.querySelector('[data-notifications]');if(!root)return;
  const find=key=>root.querySelector(`[data-notification-${key}]`);
  const list=find('list'),status=find('status'),more=find('more'),all=find('all'),refresh=find('refresh');
  let before=null,throughId=null,busy=false;
  const lock=value=>{busy=value;refresh.disabled=value;more.disabled=value;all.disabled=value||!throughId;list.querySelectorAll('button').forEach(button=>button.disabled=value);};
  async function load(history=false) {
    const result=await request('/notifications'+(history?'?before='+before:''));
    if(!root.isConnected)return;
    if(!history){list.replaceChildren();throughId=result.items[0]?.id||null;}
    list.insertAdjacentHTML('beforeend',result.items.map(notificationCard).join(''));
    before=result.nextBefore;more.hidden=!result.hasMore;
    find('count').textContent=`${result.unread} sin leer`;
    status.textContent=!list.children.length?'Aún no tienes notificaciones. Los nuevos mensajes, solicitudes de adopción y cambios de moderación aparecerán aquí.':'';
  }
  async function run(action) {
    if(busy)return;lock(true);status.textContent='Cargando…';
    try{await action();}catch(error){if(root.isConnected)status.textContent=error.message;}finally{if(root.isConnected)lock(false);}
  }
  refresh.onclick=()=>run(()=>load());more.onclick=()=>run(()=>load(true));
  all.onclick=()=>run(async()=>{await request('/notifications/read',{method:'POST',body:JSON.stringify({throughId})});await load();});
  list.addEventListener('click',event=>{const button=event.target.closest('[data-notification-read]');if(button)run(async()=>{await request('/notifications/'+encodeURIComponent(button.dataset.notificationRead)+'/read',{method:'POST'});await load();});});
  run(()=>load());
}
