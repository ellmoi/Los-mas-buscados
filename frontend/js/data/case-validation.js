/** Reutiliza la misma regla para casos perdidos y encontrados. */
import {validateCaseLocation} from "./location-model.js";
export function validateDemoCases(cases,departments,municipalities){let validated=0;for(const item of cases.filter(caseItem=>["lost","found"].includes(caseItem.kind))){validateCaseLocation(item.location,item.occurredAt,{departments,municipalities});if(!item.createdAt)throw new Error("Caso sin createdAt: "+item.id);validated++}return {valid:true,cases:validated}}
