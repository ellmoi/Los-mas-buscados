import {test} from 'node:test';
import assert from 'node:assert/strict';
import {safeReturn,loginForCase,returnAfterAuth,authSwitch} from '../frontend/js/auth-return.js';
import {login,register} from '../frontend/js/pages/auth.js';
import {caseContact,resolutionActions,resolutionNote,bindResolution} from '../frontend/js/components/case-lifecycle.js';
import {bindMessages,messagesPage,threadCases} from '../frontend/js/pages/messages.js';
import {loadSession} from '../frontend/js/components/session-menu.js';

const settle=()=>new Promise(r=>setImmediate(r));
const element=()=>({dataset:{},listeners:{},disabled:false,hidden:false,isConnected:true,value:'',textContent:'',innerHTML:'',addEventListener(type,fn){this.listeners[type]=fn;},setAttribute(key,value){this[key]=value;},focus(){this.focused=true;},replaceChildren(){this.innerHTML='';},insertAdjacentHTML(_position,html){this.innerHTML+=html;}});
function globals(t){const saved=Object.fromEntries(['document','fetch','location','window'].map(key=>[key,globalThis[key]]));t.after(async()=>{globalThis.fetch=async()=>({ok:true,json:async()=>null});await loadSession();Object.assign(globalThis,saved);});}

test('Contacto: login y registro preservan ambos reportes, sin redirecciones externas',async t=>{
 globals(t);globalThis.fetch=async()=>({ok:true,json:async()=>null});await loadSession();
 const original='#/mascota/found-id?from=lost-id',url=loginForCase(original);globalThis.location={hash:url};
 assert.equal(returnAfterAuth(),original);assert.equal(returnAfterAuth(authSwitch('registro')),original);
 assert.match(login(),/registro\?next=/);assert.match(register(),/login\?next=/);
 for(const value of ['https://evil.test','//evil.test','#/mascota/<script>','#/mascota/ok?from=https://evil.test'])assert.equal(safeReturn(value),'#/casos');
 globalThis.location.hash=original;
 const publicContact=caseContact({id:'found-id',kind:'found',state:'open',isOwner:false});assert.match(publicContact,/Iniciar sesión para contactar/);assert.ok(publicContact.includes(url));
 globalThis.fetch=async()=>({ok:true,json:async()=>({id:'viewer'})});await loadSession();
 assert.match(caseContact({id:'found-id',kind:'found',state:'open'}),/data-related-case="lost-id"/);
 assert.equal(caseContact({id:'found-id',kind:'found',isOwner:true}),'');assert.equal(caseContact({id:'found-id',kind:'found',visibility:'hidden'}),'');
});
test('Contacto: un clic abre/reutiliza conversación, conserva referencia y evita doble envío',async t=>{
 globals(t);globalThis.location={hash:'#/mascota/found-id?from=lost-id'};
 globalThis.fetch=async()=>({ok:true,json:async()=>({id:'viewer'})});await loadSession();
 const button=element(),status=element();button.dataset={openContact:'found-id',relatedCase:'lost-id'};
 globalThis.document={querySelector:key=>({'[data-open-contact]':button,'[data-contact-status]':status}[key]||null)};
 const calls=[];let release;globalThis.fetch=async(path,options)=>{calls.push({path,body:JSON.parse(options.body)});await new Promise(r=>{release=r;});return {ok:true,json:async()=>({id:'conversation-id'})};};
 bindMessages();const pending=button.listeners.click();await settle();await button.listeners.click();assert.equal(calls.length,1);assert.equal(calls[0].body.relatedCaseId,'lost-id');assert.equal(calls[0].body.openOnly,true);
 release();await pending;assert.equal(globalThis.location.hash,'#/mensajes/conversation-id');assert.equal(button.disabled,false);
 globalThis.fetch=async()=>({ok:false,status:409,json:async()=>({error:'El caso ya está resuelto.'})});await button.listeners.click();assert.match(status.textContent,/resuelto/);assert.equal(button.disabled,false);
 globalThis.location.hash='#/mascota/found-id?from=lost-id';globalThis.fetch=async()=>({ok:false,status:401,json:async()=>({error:'Inicia sesión.'})});await button.listeners.click();assert.equal(returnAfterAuth(), '#/mascota/found-id?from=lost-id');
});
test('Resolución: confirmar antes de guardar, cancelar/Escape, foco y recuperación ante error',async t=>{
 globals(t);const trigger=element(),panel=element(),form=element(),cancel=element(),submit=element(),status=element(),outcome=element(),note=element();
 trigger.dataset={resolveCase:'case-id',state:'resolved'};panel.hidden=true;outcome.value='reunited';note.value='Volvió a casa';form.elements={outcome,note};
 panel.querySelector=key=>({form,'[data-cancel-resolution]':cancel,'[data-confirm-resolution]':submit,'[data-resolution-status]':status}[key]);
 globalThis.document={querySelector:key=>({'[data-resolve-case]':trigger,'[data-resolution-panel]':panel}[key])};
 const calls=[];let fail=true,renders=0;globalThis.fetch=async(path,options)=>{calls.push({path,body:JSON.parse(options.body)});if(fail)throw Error('Offline');return {ok:true,json:async()=>({state:'resolved'})};};
 bindResolution(async()=>{renders++;});trigger.listeners.click();assert.equal(calls.length,0);assert.equal(panel.hidden,false);assert.equal(outcome.focused,true);
 cancel.listeners.click();assert.equal(panel.hidden,true);assert.equal(trigger.focused,true);assert.equal(calls.length,0);
 trigger.listeners.click();panel.listeners.keydown({key:'Escape',preventDefault(){}});assert.equal(panel.hidden,true);
 trigger.listeners.click();await form.listeners.submit({preventDefault(){}});assert.equal(renders,0);assert.match(status.textContent,/conectar/);assert.equal(submit.disabled,false);assert.equal(note.value,'Volvió a casa');
 fail=false;await form.listeners.submit({preventDefault(){}});assert.equal(renders,1);assert.deepEqual(calls.at(-1).body,{state:'resolved',resolution:{outcome:'reunited',note:'Volvió a casa'}});
 assert.equal(resolutionActions({canResolve:false}),'');assert.match(resolutionActions({id:'case-id',canResolve:true,state:'open'}),/hidden aria-labelledby/);
 const html=resolutionNote({state:'resolved',resolution:{outcome:'reunited',note:'<img onerror=bad>'}});assert.ok(!html.includes('<img'));assert.match(html,/Caso resuelto/);
});
test('Conversación: reutiliza la lectura inicial, referencias escapadas y actualización manual',async t=>{
 globals(t);const nodes=Object.fromEntries(['[data-message-list]','[data-message-status]','[data-older]','[data-thread-close]','[data-thread-refresh]','[data-thread-notice]','[data-thread-cases]','[data-thread-name]'].map(key=>[key,element()]));
 const form=element(),text=element(),button=element();form.elements={text};form.querySelector=key=>key==='button'?button:text;nodes.form=form;
 const thread=element();thread.dataset.thread='thread-id';thread.querySelector=key=>nodes[key];globalThis.document={querySelector:key=>key==='[data-thread]'?thread:null};
 let reads=0;const data={id:'thread-id',caseName:'Luna',peerName:'Ana <script>',caseState:'resolved',items:[],cases:[{id:'case-id',available:true,name:'Luna <script>',kind:'lost',state:'resolved'}]};
 globalThis.fetch=async()=>{reads++;return {ok:true,json:async()=>data};};
 const page=await messagesPage('thread-id');assert.ok(!page.includes('<script>'));bindMessages();await settle();assert.equal(reads,1);assert.match(nodes['[data-thread-notice]'].textContent,/Caso resuelto/);
 await nodes['[data-thread-refresh]'].onclick();assert.equal(reads,2);assert.match(nodes['[data-message-status]'].textContent,/Conversación actualizada/);
 assert.ok(!threadCases([{id:'secret',available:false,name:'PRIVATE'}]).includes('PRIVATE'));
});

test('Login real del controlador vuelve al caso con su coincidencia después de cargar la sesión',async t=>{
 globals(t);globalThis.window={addEventListener(){}};
 const {bindCases}=await import('../frontend/js/cases.js');
 const form=element(),button=element(),error=element(),email=element(),password=element(),account=element(),control=element();email.value='ana@example.test';password.value='test-only-password';form.dataset.register='false';
 form.querySelector=key=>({'button':button,'[data-form-error]':error,'#email':email,'#password':password}[key]);account.querySelector=()=>null;
 globalThis.document={querySelector:key=>({'[data-auth-form]':form,'#account-area':account,'#demo-session-control':control}[key]||null)};
 const target='#/mascota/found-id?from=lost-id';globalThis.location={hash:loginForCase(target)};
 const paths=[];globalThis.fetch=async path=>{paths.push(path);return {ok:true,json:async()=>({id:'ana',name:'Ana',role:'USER'})};};
 bindCases(()=>{});await form.listeners.submit({preventDefault(){}});assert.equal(globalThis.location.hash,target);assert.deepEqual(paths,['/api/v1/login','/api/v1/me']);assert.equal(error.textContent,'');
});
