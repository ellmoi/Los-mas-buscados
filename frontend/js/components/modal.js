import {loginForCase} from '../auth-return.js';
// Formulario compartido para crear/editar casos. Su cierre libera listeners y URLs de previsualización.
import {getUser} from "./session-menu.js";
import {api} from "../services/api.js";
const fields={lost:{title:"Reportar mascota perdida"},found:{title:"Registrar mascota encontrada"},adoption:{title:"Publicar mascota en adopción"}};
let activeClose;
export function openModal(type,existing=null){if(activeClose?.()===false)return;if(!["lost","found","adoption"].includes(type)){toast("Esta función estará disponible en una próxima entrega.");return;}if(!getUser()){location.hash=loginForCase();toast("Inicia sesión para publicar un caso.");return;}const opener=document.activeElement;const f={title:existing?"Editar caso":fields[type].title,intro:"Comparte una zona aproximada, sin direcciones personales.",extra:caseFields()+(type==="adoption"?adoptionFields():"")};const root=document.querySelector("#modal-root");root.innerHTML=`<div class="modal-backdrop" data-close-backdrop><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-head"><div><span class="eyebrow">Reporte de la comunidad</span><h2 id="modal-title">${f.title}</h2></div><button class="icon-btn" data-close-modal aria-label="Cerrar">×</button></header><form data-case-form><div class="modal-body"><p>${f.intro}</p><div class="form-grid">${f.extra}<div class="field full"><label for="description">Descripción</label><textarea id="description" class="textarea" maxlength="500" required placeholder="Agrega la información más útil..."></textarea><small>Máximo 500 caracteres</small></div><div class="field full"><label class="upload" for="media"><strong>Selecciona fotografías</strong><span class="caption">Hasta 3 fotografías · JPG, PNG o WebP · 2 MB cada una</span><input id="media" type="file" accept="image/jpeg,image/png,image/webp" multiple></label><div class="preview-grid" data-preview-grid></div></div></div></div><p class="form-error" role="alert" data-save-error></p><footer class="modal-foot"><button type="button" class="button secondary" data-close-modal>Cancelar</button><button class="button">Guardar caso</button></footer></form></section></div>`;document.body.classList.add("modal-open");root.querySelector("button, input, textarea")?.focus();if(existing){for(const input of root.querySelectorAll("[name]"))input.value=existing[input.name]||"";root.querySelector("#description").value=existing.description;}bindModal(root,opener,type,existing)}
function bindModal(root,opener,type,existing){
  const controller=new AbortController(),options={signal:controller.signal},urls=[];
  const shell=document.querySelector(".app-shell"),wasInert=shell?.inert;
  if(shell)shell.inert=true;
  const revoke=()=>{urls.splice(0).forEach(url=>URL.revokeObjectURL(url))};
  let saving=false;const close=()=>{if(saving)return false;controller.abort();revoke();root.innerHTML="";document.body.classList.remove("modal-open");if(shell)shell.inert=wasInert;activeClose=null;if(opener?.isConnected)opener.focus();return true;};
  activeClose=close;
  root.addEventListener("click",event=>{if(event.target.closest("[data-close-modal]")||event.target.matches("[data-close-backdrop]"))close()},options);
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"){event.preventDefault();close();return}
    if(event.key!=="Tab")return;
    const items=[...root.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')].filter(el=>el.getClientRects().length);
    const first=items[0],last=items.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
  },options);
  root.querySelector("#media")?.addEventListener("change",event=>{
    revoke();const grid=root.querySelector("[data-preview-grid]");grid.replaceChildren();
    [...event.target.files].slice(0,3).forEach((file,index)=>{const img=document.createElement("img");const url=URL.createObjectURL(file);urls.push(url);img.src=url;img.alt="Vista previa "+(index+1);grid.append(img)})
  },options);
  root.querySelector("form").addEventListener("submit",async event=>{
    event.preventDefault();const button=event.submitter,error=root.querySelector('[data-save-error]');error.textContent='';button.disabled=true;button.textContent='Guardando…';saving=true;
    try{
      const form=event.currentTarget,files=[...form.querySelector('#media').files];
      if(files.length>3||files.some(f=>f.size>2*1024*1024))throw new Error('Selecciona hasta 3 imágenes de máximo 2 MB cada una.');
      const body={...Object.fromEntries(new FormData(form)),kind:type,description:form.querySelector('#description').value};
      if(files.length)body.photos=await Promise.all(files.map(file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('No pudimos leer una fotografía.'));reader.readAsDataURL(file);})));
      const saved=await api.saveCase(body,existing?.id);saving=false;close();toast('Caso guardado.');
      if(location.hash==='#/mascota/'+saved.id)window.dispatchEvent(new Event('case-saved'));else location.hash='#/mascota/'+saved.id;
    }catch(err){error.textContent=err.message;}finally{saving=false;button.disabled=false;button.textContent='Guardar caso';}
  },options);
}
export function toast(message){const root=document.querySelector("#toast-root");const item=document.createElement("div");item.className="toast";item.textContent=message;root.append(item);setTimeout(()=>item.remove(),3500)}

function caseFields(){return '<div class="field"><label for="case-name">Nombre o identificación</label><input class="input" id="case-name" name="name" required maxlength="80" placeholder="Ej. perro café sin nombre"></div><div class="field"><label for="case-species">Especie</label><select class="select" id="case-species" name="species"><option>Perro</option><option>Gato</option><option>Ave</option><option>Otro</option></select></div><div class="field"><label for="case-city">Ciudad</label><input class="input" id="case-city" name="city" required maxlength="80"></div><div class="field"><label for="case-zone">Barrio o zona aproximada</label><input class="input" id="case-zone" name="zone" required maxlength="120"></div><div class="field"><label for="case-size">Tamaño</label><select class="select" id="case-size" name="size"><option value="">Sin especificar</option><option>Pequeño</option><option>Mediano</option><option>Grande</option></select></div><div class="field"><label for="case-color">Color</label><input class="input" id="case-color" name="color" maxlength="80"></div>';}
window.addEventListener('edit-case',event=>openModal(event.detail.kind,event.detail));

function adoptionFields(){return `<div class="field full"><label for="adoption-age">Edad aproximada</label><input class="input" id="adoption-age" name="age" maxlength="80" required placeholder="Ej. 2 años aproximadamente"></div><div class="field full"><label for="adoption-care">Salud y cuidados conocidos</label><textarea class="textarea" id="adoption-care" name="care" maxlength="500" required placeholder="Vacunas, esterilización, cuidados especiales o información por confirmar"></textarea></div><div class="field full"><label for="adoption-requirements">Necesidades del hogar y requisitos</label><textarea class="textarea" id="adoption-requirements" name="requirements" maxlength="500" required placeholder="Convivencia, espacio, tiempo y seguimiento esperado"></textarea></div>`;}
