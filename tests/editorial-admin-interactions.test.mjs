import {test} from 'node:test';
import assert from 'node:assert/strict';
import {adminEditorial} from '../frontend/js/admin-editorial.js';

const settle=()=>new Promise(resolve=>setImmediate(resolve));
function node(){return {disabled:false,textContent:'',listeners:{},focus(){},addEventListener(name,handler){this.listeners[name]=handler;}};}
function form(values,review=false){
  const fields=Object.entries(values).map(([name,value])=>({...node(),name,value})),button=node(),notice=node();
  return {...node(),fields,button,notice,querySelector:key=>key==='button'?button:notice,hasAttribute:()=>review};
}
function setup(t,handler){
  const original={fetch:globalThis.fetch,document:globalThis.document,FormData:globalThis.FormData};
  t.after(()=>Object.assign(globalThis,original));
  const controls=Object.fromEntries(['new','filter','prev','next','error'].map(key=>[key,node()]));
  const open={...node(),dataset:{editorialOpen:'id'}};
  const edit=form({kind:'article',title:'Título',summary:'Resumen',text:'Texto guardado',sourceUrl:'https://example.com',reason:'Corrección del texto'});
  const review=form({status:'published',reviewedOn:'2026-09-14',reason:'Fuente y texto revisados'},true);
  const host={set innerHTML(_value){},querySelector:key=>key==='[data-editorial-edit]'?edit:key==='[data-editorial-review]'?review:node(),querySelectorAll:()=>[edit,review]};
  const root={set innerHTML(_value){},querySelector:key=>key==='[data-editorial-editor]'?host:controls[key.slice('[data-editorial-'.length,-1)],querySelectorAll:key=>key==='[data-editorial-open]'?[open]:[...Object.values(controls),open,...edit.fields,edit.button,...review.fields,review.button]};
  globalThis.FormData=class{constructor(form){return form.fields.filter(field=>!field.disabled).map(field=>[field.name,field.value]);}};
  globalThis.fetch=async(url,options)=>{const body=await handler(url,options);return {ok:true,json:async()=>body};};
  return {root,open,edit,review,controls};
}

test('CMS administrativo: envío conserva campos, recupera controles y evita decisiones sobre cambios sin guardar',async t=>{
  const item={id:'id',kind:'article',title:'Título',summary:'Resumen',text:'Texto guardado',sourceUrl:'https://example.com',revision:3,status:'draft'};
  const writes=[];let finish;
  const ui=setup(t,(url,options)=>{
    if(options.method==='PATCH'){
      writes.push(JSON.parse(options.body));
      return new Promise((_resolve,reject)=>{finish=()=>reject(Error('Fallo simulado'));});
    }
    return url.endsWith('/id')?item:{items:[item],total:1,offset:0,limit:20};
  });
  await adminEditorial(ui.root,()=>true);ui.open.onclick();await settle();
  ui.edit.listeners.input();assert.equal(ui.review.button.disabled,true);
  ui.review.listeners.submit({preventDefault(){}});assert.equal(writes.length,0);
  ui.edit.listeners.submit({preventDefault(){}});await settle();
  assert.equal(ui.edit.button.disabled,true);
  assert.equal(writes[0].title,'Título');assert.equal(writes[0].text,'Texto guardado');assert.equal(writes[0].revision,3);
  ui.edit.listeners.submit({preventDefault(){}});assert.equal(writes.length,1);
  finish();await settle();
  assert.equal(ui.edit.button.disabled,false);assert.equal(ui.edit.fields[0].disabled,false);
  assert.equal(ui.review.button.disabled,true);assert.match(ui.controls.error.textContent,/No se pudo conectar/);
});
