// Cada entrada conserva su posición: retroceder no cuenta como una visita nueva.
export function installNavigationHistory(target){
 const {history,location}=target;
 const depth=()=>Number.isSafeInteger(history.state?.buscadosDepth)&&history.state.buscadosDepth>=0?history.state.buscadosDepth:null;
 target.__nexoNavigationCount=depth()??0;
 history.replaceState({...history.state,buscadosDepth:target.__nexoNavigationCount},'',location.href);
 const changed=()=>{
  const existing=depth();
  target.__nexoNavigationCount=existing??target.__nexoNavigationCount+1;
  if(existing===null)history.replaceState({...history.state,buscadosDepth:target.__nexoNavigationCount},'',location.href);
 };
 target.addEventListener('hashchange',changed);
 return ()=>target.removeEventListener('hashchange',changed);
}
export function navigationSection(path,kind){
 if(path.startsWith('/mascota/'))return {lost:'/perdidos',found:'/encontrados',adoption:'/adopciones'}[kind]||path;
 for(const section of ['/minijuegos','/mensajes','/solicitudes-adopcion','/informacion','/nuestro-trabajo'])if(path.startsWith(section+'/'))return section;
 return ['/perfil','/publicaciones'].includes(path)?'/casos':path;
}
if(typeof window!=='undefined')installNavigationHistory(window);
