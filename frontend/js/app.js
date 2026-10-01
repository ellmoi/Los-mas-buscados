import {loginForCase} from './auth-return.js';
import {bindComments} from './pages/comments.js';
import {showDemoBanner} from './components/demo-banner.js';
import {bindEditorial} from './pages/editorial.js';
// Coordinador del navegador: ruta → HTML → eventos. La API, no este archivo, decide los permisos.
import {icon,routeIcon} from "./components/icons.js";
import {socialContext,bindSharing} from "./components/social.js";
import {accountPage,verificationPage,bindAccount} from "./pages/account.js";
import {bindRecovery} from "./recovery.js";
import {veterinaries,bindVeterinaries} from "./pages/veterinaries.js";
import {applicationsPage,bindAdoptions} from "./pages/adoptions.js";
import {notificationsPage,bindNotifications} from "./pages/notifications.js";
import {messagesPage,bindMessages} from "./pages/messages.js";
import {bindReport} from "./report-case.js";
import {myCases,bindCases} from "./cases.js";
import {navigationSection} from "./history-state.js";import {APP_CONFIG,navItems} from "./config.js";import {home,listing} from "./pages/core.js";import {detail} from "./pages/detail.js";import {explore} from "./pages/more.js";import {uncommon,knowledge,speciesDetail,ourWork,projectDetail} from "./pages/discovery.js";import {login,register,recovery,resetPassword} from "./pages/auth.js";import {statePage,loading} from "./components/ui.js";import {openModal,toast} from "./components/modal.js";import {getDemoRole,renderSessionUI,loadSession} from "./components/session-menu.js";
const root=document.querySelector("#page-root"),context=document.querySelector("#context-panel"),sidebar=document.querySelector(".sidebar");document.querySelectorAll("[data-brand-name]").forEach(el=>el.textContent=APP_CONFIG.brand.name);
const currentPath=()=>location.hash.replace(/^#/,"").split("?")[0]||"/inicio";const privateRoutes=new Set(["/mensajes","/perfil","/publicaciones","/casos","/notificaciones","/solicitudes-adopcion","/configuracion"]);let renderVersion=0,disposePage=null;
function renderNav(){
 const role=getDemoRole(),logged=role!=="PUBLIC";
 const primary=[{label:"Inicio",route:"/inicio"},{label:"Explorar",route:"/explorar"},{label:"Perdidos",route:"/perdidos"},{label:"Encontrados",route:"/encontrados"},{label:"Minijuegos",route:"/minijuegos"},...(logged?[{label:"Mensajes",route:"/mensajes"},{label:"Notificaciones",route:"/notificaciones"},{label:"Mis casos",route:"/casos"},{label:"Mi cuenta",route:"/configuracion"}]:[])];
 const link=item=>'<a class="nav-link" href="#'+item.route+'" data-route="'+item.route+'"><span class="symbol">'+routeIcon(item.route)+'</span><span>'+item.label+'</span>'+(item.soon?'<small class="soon">'+item.soon+'</small>':'')+'</a>';
 const extra=navItems.filter(item=>item.route&&!primary.some(p=>p.route===item.route)&&!['/perfil','/mensajes','/notificaciones'].includes(item.route)&&!(item.private&&!logged));
 document.querySelector('#main-nav').innerHTML=primary.map(link).join('')+'<details class="nav-more"><summary>'+icon('more')+'Más espacios</summary>'+extra.map(link).join('')+'</details>';
 document.querySelector('#mobile-nav').innerHTML=[{label:'Inicio',route:'/inicio'},{label:'Explorar',route:'/explorar'}].map(link).join('')+'<button class="mobile-report" type="button" data-mobile-report aria-label="Reportar mascota perdida">'+icon('plus',25)+'</button>'+[{label:logged?'Mensajes':'Ingresar',route:logged?'/mensajes':'/login'},{label:logged?'Mi cuenta':'Perdidos',route:logged?'/configuracion':'/perdidos'}].map(link).join('');
 document.querySelector('[data-mobile-report]').onclick=()=>openModal('lost');
}

async function render(){const version=++renderVersion;disposePage?.();disposePage=null;try{const path=currentPath(),role=getDemoRole();renderNav();if(role==="PUBLIC"&&(privateRoutes.has(path)||(path.startsWith("/mensajes/")||path.startsWith("/solicitudes-adopcion/")))){location.hash=loginForCase();return}root.innerHTML=loading();context.innerHTML=socialContext();markNavigation(path);closeNavigation();let content,mountPage;if(path==="/inicio")content=await home();else if(path==="/explorar")content=await explore();else if(path==="/minijuegos"||path==="/minijuegos/combat"||path==="/minijuegos/rescate"){const page=await (await import("../minigames/index.js")).loadMinigame(path);content=page.html;mountPage=page.mount;}else if(path==="/perdidos")content=await listing("lost");else if(path==="/encontrados")content=await listing("found");else if(path==="/solicitudes-adopcion")content=await applicationsPage();else if(path.startsWith("/solicitudes-adopcion/"))content=await applicationsPage(path.split("/").pop());else if(path==="/adopciones")content=await listing("adoption");else if(path==="/poco-comunes")content=await uncommon();else if(path==="/informacion")content=await knowledge();else if(path.startsWith("/informacion/especie/"))content=await speciesDetail(path.split("/").pop());else if(path==="/nuestro-trabajo")content=await ourWork();else if(path.startsWith("/nuestro-trabajo/"))content=await projectDetail(path.split("/").pop());else if(path==="/veterinarias")content=await veterinaries();else if(path==="/mensajes")content=await messagesPage();else if((path.startsWith("/mensajes/")||path.startsWith("/solicitudes-adopcion/")))content=await messagesPage(path.split("/").pop());else if(path==="/perfil")content=await myCases();else if(path==="/publicaciones")content=await myCases();else if(path==="/casos")content=await myCases();else if(path==="/notificaciones")content=await notificationsPage();else if(path==="/login")content=login();else if(path==="/registro")content=register();else if(path==="/restablecer")content=resetPassword();else if(path==="/recuperar")content=recovery();else if(path==="/configuracion")content=await accountPage();else if(path==="/verificar-correo")content=verificationPage();else if(path.startsWith("/mascota/"))content=await detail(path.split("/").pop());else{const labels={"/mensajes":["Mensajes","Próximamente"],"/donaciones":["Donaciones","En desarrollo"],"/tienda":["Tienda","Próximamente"],"/gps":["Localización GPS","En desarrollo"]};const item=labels[path];content=item?statePage(item[0],item[1]):statePage("Página no encontrada","404","La ruta solicitada no existe dentro del prototipo.")}if(version!==renderVersion)return;root.innerHTML=content;if(path.startsWith('/mascota/'))markNavigation(path);disposePage=bind();if(mountPage){const disposeBindings=disposePage,disposeMounted=mountPage(root);disposePage=()=>{disposeMounted?.();disposeBindings?.();};}document.querySelector("#main-content").focus({preventScroll:true});window.scrollTo({top:0,behavior:"instant"})}catch(error){if(version!==renderVersion)return;disposePage?.();disposePage=null;root.innerHTML='<section class="card state-card"><h1>No pudimos cargar esta página</h1><p data-error></p><button class="button" data-retry>Reintentar</button></section>';root.querySelector("[data-error]").textContent=error.message;root.querySelector("[data-retry]").onclick=render;}}
function smartBack(button){const fallback=button.dataset.backFallback||"#/inicio";if(window.__nexoNavigationCount>0)history.back();else location.href=fallback}
function bind(){bindComments();bindEditorial();[root,context].forEach(area=>area.querySelectorAll("[data-modal]").forEach(b=>b.addEventListener("click",()=>openModal(b.dataset.modal))));document.querySelectorAll("[data-demo]").forEach(b=>b.addEventListener("click",()=>toast(b.dataset.demo)));document.querySelectorAll("[data-back-fallback]").forEach(b=>b.addEventListener("click",()=>smartBack(b)));document.querySelectorAll("[data-support]").forEach(b=>b.addEventListener("click",()=>{b.classList.toggle("active");b.textContent=b.classList.contains("active")?"Apoyado":"Apoyar"}));bindSharing();const disposeCases=bindCases(render);bindAccount(render);bindRecovery(render);bindMessages();bindNotifications();bindAdoptions(render);bindVeterinaries();bindReport();bindContentFilters();return disposeCases}
function bindContentFilters(){const search=document.querySelector("[data-content-search]"),filter=document.querySelector("[data-content-filter]");if(!search)return;const update=()=>{const query=search.value.trim().toLowerCase(),category=filter.value;let visible=0;document.querySelectorAll("[data-content-card]").forEach(card=>{const match=card.dataset.search.includes(query)&&(!category||card.dataset.search.includes(category));card.hidden=!match;if(match)visible++});document.querySelector("[data-content-empty]").hidden=visible>0;document.querySelector("[data-content-count]").textContent=visible+" categorías visibles · 0 fichas publicadas"};search.addEventListener("input",update);filter.addEventListener("change",update)}
function refreshSession(){renderSessionUI(()=>{const path=currentPath();if(getDemoRole()==="PUBLIC"&&(privateRoutes.has(path)||(path.startsWith("/mensajes/")||path.startsWith("/solicitudes-adopcion/"))))location.hash="#/inicio";else render()})}try{await loadSession();}catch(error){toast(error.message);}refreshSession();document.querySelectorAll("[data-modal]").forEach(b=>b.addEventListener("click",()=>{closeNavigation();openModal(b.dataset.modal);}));document.querySelector("[data-mobile-menu]").addEventListener("click",()=>setNavigation(!sidebar.classList.contains("open")));window.addEventListener("hashchange",render);render();

window.addEventListener("case-saved",()=>render());

function markNavigation(path){
 const section=navigationSection(path,root.querySelector('[data-case-kind]')?.dataset.caseKind);
 document.querySelectorAll('[data-route]').forEach(link=>{const active=link.dataset.route===section;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
 const more=document.querySelector('.nav-more');if(more?.querySelector('[aria-current]'))more.open=true;
}
function setNavigation(open,restoreFocus=false){
 const mobile=window.matchMedia('(max-width:800px)').matches,expanded=mobile&&open;
 sidebar.classList.toggle('open',expanded);sidebar.inert=mobile&&!expanded;
 document.querySelector('[data-nav-scrim]').hidden=!expanded;
 const trigger=document.querySelector('[data-mobile-menu]');trigger.setAttribute('aria-expanded',String(expanded));trigger.setAttribute('aria-label',expanded?'Cerrar navegación':'Abrir navegación');
 for(const element of [document.querySelector('#main-content'),context,document.querySelector('#mobile-nav')])element.inert=expanded;
 if(expanded)sidebar.querySelector('button,a[href]')?.focus();else if(restoreFocus&&mobile)trigger.focus();
}
function closeNavigation(){setNavigation(false);}
document.querySelector('[data-close-nav]').onclick=()=>setNavigation(false,true);
document.querySelector('[data-nav-scrim]').onclick=()=>setNavigation(false,true);
document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();closeNavigation();document.querySelector('#main-content').focus();});
document.addEventListener('keydown',event=>{
 if(!sidebar.classList.contains('open')||document.querySelector('#modal-root').childElementCount)return;
 if(event.key==='Escape'){event.preventDefault();setNavigation(false,true);}
 if(event.key==='Tab'){
  const items=[...sidebar.querySelectorAll('a[href],button:not(:disabled),summary')].filter(el=>el.getClientRects().length),first=items[0],last=items.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 }
});
window.matchMedia('(max-width:800px)').addEventListener('change',closeNavigation);
closeNavigation();
document.querySelectorAll(".brand-mark").forEach(el=>el.innerHTML=icon("paw",25));document.querySelector("[data-mobile-menu]").innerHTML=icon("menu");

showDemoBanner();
