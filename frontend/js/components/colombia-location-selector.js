/**
 * Selector Departamento → Municipio reutilizable.
 * Los IDs DIVIPOLA enlazan ambas listas: al cambiar departamento se limpia el
 * municipio, filter() limita los resultados y sort() los mantiene legibles.
 */
import { departments, municipalities } from "../data/colombia-locations.js";

export const normalizeLocationText = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
const options = items => items.map(item => `<option value="${item.id}">${item.name}</option>`).join("");

export function locationSelectorMarkup(prefix = "case") {
  return `<fieldset class="location-selector full" data-location-selector data-prefix="${prefix}"><legend>Ubicación aproximada</legend>
    <div class="field"><label for="${prefix}-department">Departamento</label><select id="${prefix}-department" class="select" data-location-department required><option value="">Selecciona</option>${options(departments)}</select></div>
    <div class="field"><label for="${prefix}-municipality-search">Buscar ciudad o municipio</label><input id="${prefix}-municipality-search" class="input" data-location-search autocomplete="off" placeholder="Ejemplo: Rionegro" disabled></div>
    <div class="field full"><label for="${prefix}-municipality">Ciudad o municipio</label><select id="${prefix}-municipality" class="select municipality-results" data-location-municipality required disabled><option value="">Selecciona primero un departamento</option></select><small data-location-status aria-live="polite">Selecciona un departamento.</small></div>
    <div class="field full"><label for="${prefix}-place">Lugar del evento</label><input id="${prefix}-place" class="input" data-location-place required placeholder="Barrio, vereda, sector o punto de referencia"><small>No publiques una dirección de vivienda ni coordenadas exactas.</small></div>
  </fieldset>`;
}

export function bindLocationSelector(root) {
  root.querySelectorAll("[data-location-selector]").forEach(container => {
    const department = container.querySelector("[data-location-department]"), search = container.querySelector("[data-location-search]"), municipality = container.querySelector("[data-location-municipality]"), status = container.querySelector("[data-location-status]"); let available = [];
    const render = () => { const query = normalizeLocationText(search.value); const visible = available.filter(item => normalizeLocationText(item.name).includes(query)).slice(0, 80); municipality.innerHTML = '<option value="">Selecciona</option>' + options(visible); status.textContent = visible.length + " municipios disponibles" };
    department.addEventListener("change", () => { available = municipalities.filter(item => item.departmentId === department.value).sort((a, b) => a.name.localeCompare(b.name, "es")); search.value = ""; search.disabled = !department.value; municipality.disabled = !department.value; render(); if (department.value) search.focus() });
    search.addEventListener("input", render); search.addEventListener("keydown", event => { if (event.key === "Escape") { search.value = ""; render() } if (event.key === "ArrowDown") { event.preventDefault(); municipality.focus() } });
  })
}

export function caseLocationFiltersMarkup() { return `<div class="field"><label for="case-department-filter">Departamento</label><select id="case-department-filter" class="select" data-filter="department"><option value="">Todos</option>${options(departments)}</select></div><div class="field"><label for="case-municipality-filter">Municipio</label><select id="case-municipality-filter" class="select" data-filter="municipality" disabled><option value="">Todos</option></select></div>` }

export function bindCaseLocationFilters(root, onChange) { const department = root.querySelector('[data-filter="department"]'), municipality = root.querySelector('[data-filter="municipality"]'); if (!department) return; department.addEventListener("change", () => { const list = municipalities.filter(item => item.departmentId === department.value).sort((a, b) => a.name.localeCompare(b.name, "es")); municipality.innerHTML = '<option value="">Todos</option>' + options(list); municipality.disabled = !department.value; municipality.value = ""; onChange() }) }

export const findDepartment = id => departments.find(item => item.id === id);
export const findMunicipality = id => municipalities.find(item => item.id === id);
