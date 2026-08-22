/**
 * Contrato del proceso de adopción. Una solicitud relaciona a un USER con un
 * Animal y conserva la fundación responsable; nunca duplica la ficha animal.
 */
export const adoptionApplicationSchema={
  required:["id","animalId","foundationId","applicantUserId","status","createdAt"],
  review:["answers","reviewNotes","updatedAt"],optionalByDefault:true
};

export const adoptionApplicationStatuses=["submitted","underReview","interview","approved","rejected","withdrawn"];

// Demo honesta: todavía no existen solicitudes reales ni inventadas.
export const adoptionApplications=[];

export function validateAdoptionRelationships(foundations,animals,sponsorships){
  const unique=(items,key,label)=>{const seen=new Set();for(const item of items){if(seen.has(item[key]))throw new Error(label+" duplicado: "+item[key]);seen.add(item[key])}return seen};
  const foundationIds=unique(foundations,"id","Foundation ID"),foundationSlugs=unique(foundations,"slug","Foundation slug");
  const animalIds=unique(animals,"id","Animal ID"),animalSlugs=unique(animals,"slug","Animal slug");
  void foundationSlugs;void animalSlugs;
  for(const animal of animals)if(!foundationIds.has(animal.foundationId))throw new Error("Foundation inexistente en "+animal.id);
  for(const foundation of foundations)for(const animalId of foundation.animalIds||[]){const animal=animals.find(item=>item.id===animalId);if(!animal)throw new Error("Animal inexistente en "+foundation.id+": "+animalId);if(animal.foundationId!==foundation.id)throw new Error("Relación Foundation/Animal inconsistente: "+animalId)}
  for(const item of adoptionApplications){const animal=animals.find(candidate=>candidate.id===item.animalId);if(!animal||!foundationIds.has(item.foundationId))throw new Error("Solicitud con referencias inválidas: "+item.id);if(animal.foundationId!==item.foundationId)throw new Error("Solicitud con fundación inconsistente: "+item.id);if(!adoptionApplicationStatuses.includes(item.status))throw new Error("Estado de solicitud inválido: "+item.id)}
  for(const item of sponsorships){const animal=animals.find(candidate=>candidate.id===item.animalId);if(!animal||!foundationIds.has(item.foundationId))throw new Error("Apadrinamiento con referencias inválidas: "+item.id);if(animal.foundationId!==item.foundationId)throw new Error("Apadrinamiento con fundación inconsistente: "+item.id)}
  return {valid:true,foundations:foundationIds.size,animals:animalIds.size,adoptionApplications:adoptionApplications.length,sponsorships:sponsorships.length};
}
