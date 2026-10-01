import {adminComments} from './admin-comments.js';
import {adminCommentReports} from './admin-comment-reports.js';
import {adminVeterinaries} from './admin-veterinaries.js';
import {adminEditorial} from './admin-editorial.js';
import {adminMail} from './admin-mail.js';
import {request} from './services/api.js';
import {caseRow,reportRow,auditRow} from './admin-views.js';
const root=document.querySelector('#admin-root'),title=document.querySelector('#admin-title');
const sections={resumen:'Resumen',casos:'Casos',reportes:'Reportes',auditoria:'Auditoría',veterinarias:'Veterinarias',editorial:'Contenido editorial',correo:'Cola de correo',comentarios:'Comentarios','denuncias-comentarios':'Denuncias de comentarios'};
document.querySelector('#admin-nav').innerHTML=Object.entries(sections).map(([id,label])=>'<a class="nav-link" href="#'+id+'">'+label+'</a>').join('');
let generation=0;
async function render(offset=0){
 const version=++generation,section=location.hash.slice(1)||'resumen';
 title.textContent=sections[section]||'Resumen';
 document.querySelectorAll('#admin-nav a').forEach(a=>{const active=a.hash==='#'+section;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 const previousFilter=root.querySelector('[data-filter]')?.value;
 root.innerHTML='<p role="status">Cargando…</p>';
 try{
  if(section==='veterinarias'){await adminVeterinaries(root,()=>version===generation);return;}
  if(section==='editorial'){await adminEditorial(root,()=>version===generation);return;}
  if(section==='correo'){await adminMail(root,()=>version===generation);return;}
  if(section==='comentarios'){await adminComments(root,()=>version===generation);return;}
  if(section==='denuncias-comentarios'){await adminCommentReports(root,()=>version===generation);return;}
  if(section==='resumen'){
   const data=await request('/admin/summary');if(version!==generation)return;
   root.innerHTML='<section class="metric-grid">'+[['Cuentas',data.users],['Casos',data.cases],['Reportes pendientes',data.pending],['Casos ocultos',data.hidden]].map(([label,value])=>'<article class="card metric"><span>'+label+'</span><strong>'+value+'</strong></article>').join('')+'</section><section class="card admin-section"><h2>Revisa, decide y deja constancia</h2><p>Consulta los reportes de la comunidad. Ocultar un caso lo retira del acceso público; restaurarlo vuelve a publicarlo.</p><a class="button" href="#reportes">Revisar reportes</a></section>';return;
  }
  const endpoint={casos:'cases',reportes:'reports',auditoria:'audit'}[section];if(!endpoint){location.hash='#resumen';return;}
  const filter=previousFilter || (section==='reportes'?'pending':'all');
  const query=new URLSearchParams({offset,...(section==='casos'?{visibility:filter}:section==='reportes'?{status:filter}:{})});
  const data=await request('/admin/'+endpoint+'?'+query);if(version!==generation)return;
  const options=section==='casos'?[['all','Todos'],['visible','Visibles'],['hidden','Ocultos']]:[['pending','Pendientes'],['reviewed','Revisados'],['dismissed','Descartados']];
  root.innerHTML=(section==='auditoria'?'':'<div class="moderation-toolbar"><label>Mostrar<select class="select" data-filter>'+options.map(([id,label])=>'<option value="'+id+'" '+(filter===id?'selected':'')+'>'+label+'</option>').join('')+'</select></label></div>')+'<p role="status">'+data.total+' resultados</p><div class="moderation-list">'+(data.items.length?data.items.map(section==='casos'?caseRow:section==='reportes'?reportRow:auditRow).join(''):'<section class="card admin-section"><h2>No hay elementos en esta vista</h2></section>')+'</div><div class="moderation-pagination"><button class="button secondary" data-prev '+(!offset?'disabled':'')+'>Anterior</button><span>Página '+(Math.floor(offset/data.limit)+1)+'</span><button class="button secondary" data-next '+(offset+data.limit>=data.total?'disabled':'')+'>Siguiente</button></div>';
  root.querySelector('[data-filter]')?.addEventListener('change',()=>render());
  root.querySelector('[data-prev]').onclick=()=>render(Math.max(0,offset-data.limit));root.querySelector('[data-next]').onclick=()=>render(offset+data.limit);
  root.querySelectorAll('form').forEach(form=>form.addEventListener('submit',async event=>{
   event.preventDefault();const button=form.querySelector('button'),error=form.querySelector('[data-action-error]');button.disabled=true;error.textContent='';
   const isCase=!!form.dataset.moderationCase,path=isCase?'/admin/cases/'+form.dataset.moderationCase+'/moderation':'/admin/reports/'+form.dataset.moderationReport;
   const body=Object.fromEntries(new FormData(form));if(isCase)body.visibility=form.dataset.visibility;
   try{await request(path,{method:'PATCH',body:JSON.stringify(body)});if(version===generation)await render(offset);}catch(err){error.textContent=err.message;button.disabled=false;}
  }));
 }catch(error){if(version!==generation)return;root.innerHTML='<section class="card admin-section"><h2>No pudimos cargar el panel</h2><p data-error></p><button class="button" data-retry>Reintentar</button><a href="#/login">Iniciar sesión</a></section>';root.querySelector('[data-error]').textContent=error.message;root.querySelector('[data-retry]').onclick=()=>render(offset);}
}
document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();document.querySelector('#admin-main').focus();});
window.addEventListener('hashchange',()=>{root.replaceChildren();document.querySelector('#admin-main').focus({preventScroll:true});render();});
try{const user=await request('/me');document.querySelector('#admin-account').textContent=user?.name||'Sin sesión';}catch{}
render();
