import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bindMessages} from '../frontend/js/pages/messages.js';

// Dobles mínimos del DOM: ejercitan los listeners reales, sin afirmar cobertura visual.
function element() {
  return {disabled:false,hidden:false,textContent:'',dataset:{},isConnected:true,
    listeners:{},addEventListener(name,callback){this.listeners[name]=callback;},
    replaceChildren(){},insertAdjacentHTML(){}};
}
function setup(t,handler) {
  const originalDocument=globalThis.document,originalFetch=globalThis.fetch;
  const text=Object.assign(element(),{value:'Vi esta mascota'}),button=element();
  const form=Object.assign(element(),{elements:{text},reset(){text.value='';},
    querySelector(selector){return selector==='button'?button:text;}});
  const nodes=Object.fromEntries(['[data-message-list]','[data-message-status]',
    '[data-older]','[data-thread-close]','[data-thread-refresh]','[data-thread-notice]'].map(key=>[key,element()]));
  nodes.form=form;
  const thread=Object.assign(element(),{dataset:{thread:'test'},querySelector:key=>nodes[key]});
  globalThis.document={querySelector:key=>key==='[data-thread]'?thread:null};
  globalThis.fetch=async(url,options)=>{const body=await handler(url,options);return {ok:true,json:async()=>body};};
  t.after(()=>{globalThis.document=originalDocument;globalThis.fetch=originalFetch;});
  bindMessages();
  return {text,button,form,nodes,submit:()=>form.listeners.submit({preventDefault(){}})};
}
const openThread={items:[],nextBefore:null,hasMore:false,closedByMe:false,closedByOther:false,caseHidden:false};
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('Un refresco fallido después de enviar libera los controles',async t=>{
  let reads=0;
  const ui=setup(t,(_url,options)=>{
    if(options.method==='POST')return {};
    if(++reads>1)throw new Error('Fallo de lectura');
    return openThread;
  });
  await settle();
  await ui.submit();
  assert.equal(ui.button.disabled,false);
  assert.equal(ui.text.disabled,false);
  assert.equal(ui.text.value,'');
  assert.match(ui.nodes['[data-message-status]'].textContent,/No se pudo conectar/);
});

test('El reintento conserva texto e identificador para evitar mensajes duplicados',async t=>{
  const attempts=[];
  const ui=setup(t,(_url,options)=>{
    if(options.method!=='POST')return openThread;
    attempts.push(JSON.parse(options.body));
    if(attempts.length===1)throw new Error('Respuesta perdida');
    return {};
  });
  await settle();
  await ui.submit();
  assert.equal(ui.text.value,'Vi esta mascota');
  assert.equal(ui.button.disabled,false);
  await ui.submit();
  assert.equal(attempts.length,2);
  assert.deepEqual(attempts[0],attempts[1]);
  assert.ok(attempts[0].clientId);
  assert.equal(ui.form.dataset.clientId,undefined);
});

test('Actualizar durante un envío mantiene el bloqueo y respeta el cierre remoto',async t=>{
  let finishSend,closed=false,posts=0;
  const ui=setup(t,(_url,options)=>{
    if(options.method==='POST'){posts++;return new Promise(resolve=>{finishSend=resolve;});}
    return {...openThread,closedByOther:closed};
  });
  await settle();
  const pending=ui.submit();
  await settle();
  await ui.nodes['[data-thread-refresh]'].onclick();
  assert.equal(ui.button.disabled,true);
  assert.equal(ui.text.disabled,true);
  await ui.submit();
  assert.equal(posts,1);
  closed=true;
  finishSend({});
  await pending;
  assert.equal(ui.button.disabled,true);
  assert.equal(ui.text.disabled,true);
  assert.match(ui.nodes['[data-thread-notice]'].textContent,/otra persona cerró/);
});
