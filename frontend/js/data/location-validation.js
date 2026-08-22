/** Validación de desarrollo: falla pronto si el catálogo local pierde integridad. */
export function validateLocationCatalog(departments,municipalities){
  const unique=(items,key,label)=>{const seen=new Set();for(const item of items){if(!item[key])throw new Error(label+" vacío");if(seen.has(item[key]))throw new Error(label+" duplicado: "+item[key]);seen.add(item[key])}return seen};
  const departmentIds=unique(departments,"id","Department ID"),departmentCodes=unique(departments,"code","Department code");
  const municipalityIds=unique(municipalities,"id","Municipality ID"),municipalityCodes=unique(municipalities,"code","Municipality code");
  for(const municipality of municipalities)if(!departmentIds.has(municipality.departmentId))throw new Error("Municipio sin departamento válido: "+municipality.id);
  return {valid:true,departments:departmentIds.size,departmentCodes:departmentCodes.size,municipalities:municipalityIds.size,municipalityCodes:municipalityCodes.size};
}
