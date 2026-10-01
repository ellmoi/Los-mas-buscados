import {test} from 'node:test';
import assert from 'node:assert/strict';
import {adminCommentReports} from '../frontend/js/admin-comment-reports.js';
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('Bandeja de denuncias: captura decisión antes del bloqueo y recupera controles tras fallo',async t=>{
  const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
  const error={},filter={value:'pending',disabled:false},refresh={disabled:false},prev={disabled:true},next={disabled:true};
  const reason={value:'Justificación del equipo',disabled:false},decision={value:'hide',disabled:false};
  const form={dataset:{resolveCommentReport:'1',revision:'2'},elements:{reason,decision}};
  const nodes={'[data-reports-error]':error,'[data-reports-filter]':filter,'[data-reports-refresh]':refresh,'[data-reports-prev]':prev,'[data-reports-next]':next};
  const root={innerHTML:'',querySelector:key=>nodes[key],querySelectorAll:selector=>selector==='form'?[form]:[filter,refresh,prev,next,reason,decision]};
  let fail=true,posts=[];
  globalThis.fetch=async(_url,options)=>{
    if(options.method==='PATCH'){
      assert.equal(reason.disabled,true);posts.push(JSON.parse(options.body));
      if(fail)throw Error('Sin conexión');
    }
    return {ok:true,json:async()=>({items:[],hasMore:false,nextBefore:null})};
  };
  await adminCommentReports(root,()=>true);
  form.onsubmit({preventDefault(){}});await settle();
  assert.match(error.textContent,/No se pudo conectar/);assert.equal(reason.disabled,false);assert.equal(prev.disabled,true);
  fail=false;form.onsubmit({preventDefault(){}});await settle();
  assert.deepEqual(posts,[{decision:'hide',reason:'Justificación del equipo',commentRevision:2},{decision:'hide',reason:'Justificación del equipo',commentRevision:2}]);
  assert.equal(refresh.disabled,false);
});
