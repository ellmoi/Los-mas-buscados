import {request} from '../services/api.js';
import {escapeHTML as e} from '../components/ui.js';

export function vetCard(v){return `<article class="card contact-case"><h2>${e(v.name)}</h2><p>${e(v.city)} · ${e(v.address)}</p><p><strong>Servicios:</strong> ${e(v.services)}</p><p><strong>Horario informado:</strong> ${e(v.hours)}</p><p><strong>Teléfono:</strong> ${e(v.phone)}</p><p>Datos revisados el ${e(v.verifiedOn)} · <a href="${e(v.sourceUrl)}" target="_blank" rel="noopener noreferrer">Consultar fuente</a></p></article>`;}
export function veterinaries(){return `<section data-vets><header class="page-header"><div><span class="eyebrow">Cuidado cercano</span><h1>Directorio veterinario</h1><p>Consulta establecimientos con datos revisados por el equipo. Confirma directamente horarios y disponibilidad antes de acudir.</p></div></header><form class="card filters-panel" data-vet-search><label>Ciudad<input class="input" name="city" maxlength="100" placeholder="Ej. Bogotá"></label><label>Servicio<input class="input" name="service" maxlength="100" placeholder="Ej. vacunación"></label><button class="button">Buscar</button></form><p>La revisión corresponde a los datos de contacto y su fuente; no es una acreditación profesional.</p><div data-vet-list></div><p role="status"></p><button class="button secondary" data-vet-more hidden>Ver más establecimientos</button></section>`;}
export function bindVeterinaries(){
  const root=document.querySelector('[data-vets]');if(!root)return;
  const form=root.querySelector('form'),list=root.querySelector('[data-vet-list]'),status=root.querySelector('[role=status]'),more=root.querySelector('[data-vet-more]');
  let offset=0,busy=false,filters={city:'',service:''};
  async function load(reset=false){if(busy)return;busy=true;more.disabled=true;form.querySelector('button').disabled=true;status.textContent='Cargando…';
    const requestedFilters=reset?{city:form.elements.city.value,service:form.elements.service.value}:filters;
    try{const data=await request('/veterinaries?'+new URLSearchParams({...requestedFilters,offset:reset?0:offset}));if(!root.isConnected)return;
      if(reset){list.replaceChildren();filters=requestedFilters;}list.insertAdjacentHTML('beforeend',data.items.map(vetCard).join(''));offset=data.offset+data.items.length;more.hidden=offset>=data.total;
      status.textContent=data.total?`${offset} de ${data.total} establecimientos`:filters.city||filters.service?'No hay establecimientos con esos filtros.':'Aún no hay establecimientos publicados. Agregaremos fichas cuando sus datos hayan sido revisados.';
    }catch(error){if(root.isConnected)status.textContent=error.message;}finally{busy=false;more.disabled=false;form.querySelector('button').disabled=false;}
  }
  form.addEventListener('submit',event=>{event.preventDefault();load(true);});more.onclick=()=>load();load(true);
}
