/** Página general de adopciones: deriva sus resultados de FoundationAnimal. */
import {api} from "../services/api.js";
import {header,statePage} from "../components/ui.js";
import {foundationAnimalCard} from "../components/foundation-animal-card.js";

export async function adoptionsPage(){
  const [animals,foundations]=await Promise.all([api.getAdoptableFoundationAnimals(),api.getFoundations()]);
  const options=(key)=>[...new Set(animals.map(item=>item[key]).filter(Boolean))].map(value=>`<option value="${value}">${value}</option>`).join("");
  const cards=animals.map(animal=>foundationAnimalCard(animal,{foundationName:foundations.find(item=>item.id===animal.foundationId)?.name||"Fundación"})).join("");
  return header("Animales que buscan hogar","Adopciones","Cada perfil pertenece a una fundación responsable. Esta experiencia es demostrativa y no envía solicitudes reales.")+
  `<section class="card adoption-tools"><label>Buscar<input class="input" data-adoption-search placeholder="Nombre, especie o ubicación"></label><label>Especie<select class="select" data-adoption-filter="species"><option value="">Todas</option>${options("temporarySpeciesLabel")}</select></label><label>Tamaño<select class="select" data-adoption-filter="size"><option value="">Todos</option>${options("size")}</select></label><label>Sexo<select class="select" data-adoption-filter="sex"><option value="">Todos</option>${options("sex")}</select></label><label>Cuidados especiales<select class="select" data-adoption-filter="needs"><option value="">Todos</option><option value="yes">Sí</option><option value="no">No</option></select></label></section>
  <p class="caption" data-adoption-count>${animals.length} animales disponibles</p><div class="foundation-animal-grid" data-adoption-grid>${cards}</div><div data-adoption-empty hidden>${statePage("Sin coincidencias","Filtros","Prueba una combinación diferente.")}</div>`;
}
