import {request} from '../services/api.js';
import {escapeHTML as e} from '../components/ui.js';
import {getUser} from '../components/session-menu.js';
import {loginForCase} from '../auth-return.js';

let preparedThread=null;

const date=value=>e(new Date(value).toLocaleString('es-CO'));
export const messageBubble=(m,peerName='Contacto')=>`<article class="message-bubble ${m.mine?'mine':''}"><strong>${m.mine?'Tú':e(peerName)}</strong><p>${e(m.text)}</p><small>${date(m.created)}</small></article>`;
export const conversationCard=c=>`<a class="card conversation-card" href="#/mensajes/${encodeURIComponent(c.id)}"><div><h2>${e(c.caseName)}</h2><p>${e(c.peerName)}</p><span>${c.caseHidden?'Caso oculto':c.caseState==='resolved'?'Caso resuelto':c.closedByMe||c.closedByOther?'Conversación cerrada':'Contacto abierto'}</span><p class="conversation-preview">${e(c.lastText||'Sin mensajes todavía')}</p>${c.lastCreated?`<small>${date(c.lastCreated)}</small>`:''}</div>${c.unread?`<span class="badge">${c.unread} sin leer</span>`:''}</a>`;
export const threadCases=cases=>(cases||[]).map(p=>p.available?`<a class="card thread-case" href="#/mascota/${encodeURIComponent(p.id)}">${p.image?`<img src="${e(p.image)}" alt="${e(p.name)}" loading="lazy" decoding="async">`:'<span class="thread-no-photo">Sin foto</span>'}<span><strong>${e(p.name)}</strong><small>${p.kind==='lost'?'Reporte perdido':p.kind==='found'?'Reporte encontrado':'Adopción'}${p.state==='resolved'?' · Resuelto':''}</small></span></a>`:'<div class="card thread-case">Reporte relacionado no disponible.</div>').join('');
export async function messagesPage(id){
 if(!id){return `<header class="page-header"><div><span class="eyebrow">Tu espacio</span><h1>Mensajes</h1><p>Conversaciones privadas sobre los casos de la comunidad.</p></div><button class="button secondary" data-inbox-refresh>Actualizar</button></header><div data-inbox class="conversation-list"></div><p role="status" data-message-status></p><button class="button secondary" data-inbox-more hidden>Ver más conversaciones</button>`;}
 const c=await request('/conversations/'+encodeURIComponent(id));
 preparedThread=c;
 return `<section data-thread="${e(c.id)}"><header class="page-header"><div><a href="#/mensajes">← Mensajes</a><h1 data-thread-name>${e(c.caseName)}</h1><p>Conversación con ${e(c.peerName)}</p></div><button class="button secondary" data-thread-refresh>Actualizar</button></header><div class="thread-cases" data-thread-cases>${threadCases(c.cases)}</div><p class="moderation-notice" data-thread-notice></p><button class="button secondary" data-thread-close></button><button class="button secondary" data-older hidden>Ver mensajes anteriores</button><div class="message-list" data-message-list></div><form class="card message-compose" data-send-message><label for="message-text">Tu mensaje</label><textarea class="textarea" id="message-text" name="text" maxlength="2000" required></textarea><small>Solo texto · Hasta 2000 caracteres. Verifica detalles del animal antes de acordar una entrega.</small><button class="button">Enviar mensaje</button></form><p role="status" aria-live="polite" data-message-status></p></section>`;
}
export function bindMessages(){
 const open=document.querySelector('[data-open-contact]');
 open?.addEventListener('click',async()=>{
  if(open.disabled)return;
  if(!getUser()){location.hash=loginForCase();return;}
  const status=document.querySelector('[data-contact-status]');open.disabled=true;status.textContent='Abriendo conversación…';
  try{const c=await request('/cases/'+encodeURIComponent(open.dataset.openContact)+'/conversations',{method:'POST',body:JSON.stringify({openOnly:true,...(open.dataset.relatedCase?{relatedCaseId:open.dataset.relatedCase}:{})})});if(open.isConnected)location.hash='#/mensajes/'+c.id;}
  catch(error){if(error.status===401){location.hash=loginForCase();return;}status.textContent=error.message;}finally{open.disabled=false;}
 });
 const contact=document.querySelector('[data-contact-case]');
 contact?.addEventListener('input',()=>{delete contact.dataset.clientId;});
 contact?.addEventListener('submit',async event=>{
  event.preventDefault();if(!getUser()){location.hash=loginForCase();return;}
  const button=contact.querySelector('button'),status=contact.querySelector('[role=status]');button.disabled=true;contact.elements.text.disabled=true;status.textContent='Enviando…';
  contact.dataset.clientId ||= crypto.randomUUID();
  try{const c=await request('/cases/'+encodeURIComponent(contact.dataset.contactCase)+'/conversations',{method:'POST',body:JSON.stringify({text:contact.elements.text.value,clientId:contact.dataset.clientId})});location.hash='#/mensajes/'+c.id;}
  catch(error){status.textContent=error.message;}finally{button.disabled=false;contact.elements.text.disabled=false;}
 });
 const inbox=document.querySelector('[data-inbox]');
 if(inbox){
  let offset=0,version=0;const status=document.querySelector('[data-message-status]'),more=document.querySelector('[data-inbox-more]');
  const load=async(reset=false)=>{const generation=++version;more.disabled=true;status.textContent='Cargando…';
   try{const result=await request('/conversations?offset='+(reset?0:offset));if(!inbox.isConnected||generation!==version)return;if(reset)inbox.replaceChildren();inbox.insertAdjacentHTML('beforeend',result.items.map(conversationCard).join(''));offset=result.offset+result.items.length;more.hidden=offset>=result.total;status.textContent=result.total?`${result.total} conversaciones`:'Aún no tienes mensajes. Contacta al responsable desde el detalle de un caso.';}
   catch(error){if(generation===version)status.textContent=error.message;}finally{if(generation===version)more.disabled=false;}
  };
  more.onclick=()=>load();document.querySelector('[data-inbox-refresh]').onclick=()=>load(true);load(true);
 }
 const thread=document.querySelector('[data-thread]');if(!thread)return;
 const id=thread.dataset.thread,base='/conversations/'+encodeURIComponent(id),list=thread.querySelector('[data-message-list]'),status=thread.querySelector('[data-message-status]'),form=thread.querySelector('form'),older=thread.querySelector('[data-older]'),close=thread.querySelector('[data-thread-close]');
 let before=null,version=0,closedByMe=false,sendBlocked=false,sending=false;
 const load=async(history=false,initial=null)=>{
  const generation=++version;older.disabled=true;
  try{
   const result=initial||await request(base+(history?'?before='+before:''));if(!thread.isConnected||generation!==version)return;
   if(!history)list.replaceChildren();list.insertAdjacentHTML(history?'afterbegin':'beforeend',result.items.map(m=>messageBubble(m,result.peerName)).join(''));
   const references=thread.querySelector('[data-thread-cases]'),heading=thread.querySelector('[data-thread-name]');if(references)references.innerHTML=threadCases(result.cases);if(heading)heading.textContent=result.caseName;
   before=result.nextBefore;older.hidden=!result.hasMore;closedByMe=result.closedByMe;
   sendBlocked=result.closedByMe||result.closedByOther||result.caseHidden;
   form.querySelector('textarea').disabled=sendBlocked||sending;form.querySelector('button').disabled=sendBlocked||sending;
   close.textContent=closedByMe?'Retirar mi cierre':'Cerrar conversación';
   thread.querySelector('[data-thread-notice]').textContent=result.caseHidden?'El caso está oculto por moderación. El historial se conserva, pero no se pueden enviar mensajes.':result.closedByOther?'La otra persona cerró la conversación.':closedByMe?'Cerraste esta conversación. Puedes retirar tu cierre para volver a conversar.':result.caseState==='resolved'?'Caso resuelto. Se conserva esta conversación para seguimiento. Usa Actualizar para consultar respuestas.':'Solo los dos participantes pueden acceder a esta conversación desde la aplicación. Usa Actualizar para consultar respuestas nuevas.';
   if(!sending)status.textContent=history?'Mensajes anteriores cargados.':`Conversación actualizada: ${result.items.length} mensajes en esta página.`;
   const last=result.items.at(-1)?.id;
   if(last)await request(base+'/read',{method:'POST',body:JSON.stringify({lastId:last})});
  }catch(error){if(generation===version)status.textContent=error.message;}finally{if(generation===version){older.disabled=false;form.elements.text.disabled=sendBlocked||sending;form.querySelector('button').disabled=sendBlocked||sending;}}
 };
 older.onclick=()=>load(true);thread.querySelector('[data-thread-refresh]').onclick=()=>load();
 close.onclick=async()=>{close.disabled=true;try{await request(base,{method:'PATCH',body:JSON.stringify({closed:!closedByMe})});await load();}catch(error){status.textContent=error.message;}finally{close.disabled=false;}};
 form.addEventListener('input',()=>{delete form.dataset.clientId;});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(sending)return;sending=true;const button=form.querySelector('button');button.disabled=true;form.elements.text.disabled=true;form.dataset.clientId ||= crypto.randomUUID();status.textContent='Enviando…';
  try{await request(base+'/messages',{method:'POST',body:JSON.stringify({text:form.elements.text.value,clientId:form.dataset.clientId})});form.reset();delete form.dataset.clientId;status.textContent='Mensaje enviado.';await load();}
  catch(error){status.textContent=error.message;}finally{sending=false;button.disabled=sendBlocked;form.elements.text.disabled=sendBlocked;}
 });
 const initial=preparedThread?.id===id?preparedThread:null;preparedThread=null;load(false,initial);
}
