/**
 * ARCHIVO: foundation-data.js
 *
 * RESPONSABILIDAD:
 * Define los datos y contratos conceptuales del módulo Fundaciones.
 *
 * QUÉ APRENDER AQUÍ:
 * - Una cuenta USER y una organización Foundation son entidades diferentes.
 * - Un Animal representa un individuo; no reemplaza una ficha Species.
 * - Las relaciones usan IDs para evitar copiar información.
 *
 * UTILIZADO POR:
 * - services/api.js, que entrega clones asíncronos de estos datos demo.
 */

export const foundationSchema={
  required:["id","slug","name"],
  organization:["description","mission","location","contact","externalLinks"],
  presentation:["logo","cover","animalTypes","currentNeeds","updates"],
  moderation:["verificationStatus","status"],
  relationships:["managerUserIds","animalIds"],
  optionalByDefault:true
};

export const foundationAnimalSchema={
  required:["id","slug","foundationId","name"],
  identity:["speciesId","temporarySpeciesLabel","sex","estimatedAge","size"],
  care:["description","story","healthSummary","specialNeeds","location"],
  states:["careStatus","adoptionStatus","sponsorshipStatus"],
  media:["images"],
  timestamps:["createdAt","updatedAt"],
  optionalByDefault:true
};

export const sponsorshipSchema={
  required:["id","animalId","foundationId","sponsorUserId","status"],
  lifecycle:["startedAt","endedAt"],
  support:["supportType","needIds"],
  transparency:["updates","useReports"],
  optionalByDefault:true
};

export const foundationStatuses=["pending","verified","rejected","suspended"];
export const animalCareStatuses=["underCare","recovering","temporaryHome","readyForHome"];
export const adoptionStatuses=["notAvailable","available","inProcess","adopted","temporarilyUnavailable"];
export const sponsorshipStatuses=["notAvailable","available","active","paused","ended"];

export const foundations=[{
  id:"foundation-demo-open-paws",slug:"organizacion-demo-huellas-abiertas",name:"Organización Demo Huellas Abiertas",isDemo:true,
  description:"Perfil ficticio creado únicamente para comprobar la experiencia de Fundaciones en Los Más Buscados.",
  mission:"Demostrar cómo una organización podrá presentar su labor, sus animales y sus necesidades sin afirmar actividad real.",
  location:"Bogotá · ubicación general de demostración",contact:{email:"contacto-demo@ejemplo.invalid",phone:null},externalLinks:[],
  logo:null,cover:"https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1400&q=80",
  animalTypes:["Animales de compañía","Pequeños mamíferos"],currentNeeds:["Alimentación","Medicamentos","Atención veterinaria"],
  verificationStatus:"pending",status:"demo",managerUserIds:["demo-user-manager"],animalIds:["animal-demo-alba","animal-demo-nilo","animal-demo-copo"],
  updates:[],supportUseNotes:[]
}];

export const foundationAnimals=[
  {id:"animal-demo-alba",slug:"alba-demo",foundationId:"foundation-demo-open-paws",name:"Alba",isDemo:true,speciesId:null,temporarySpeciesLabel:"Perro",sex:"Hembra",estimatedAge:"3 años",size:"Mediana",description:"Animal individual de demostración bajo cuidado temporal.",story:"Historia reservada para contenido real verificable.",healthSummary:"Información clínica no disponible en esta demostración.",specialNeeds:["Seguimiento veterinario"],location:"Bogotá · zona general",careStatus:"underCare",adoptionStatus:"available",sponsorshipStatus:"available",images:["https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=1100&q=85"],createdAt:"2026-08-21",updatedAt:"2026-08-21"},
  {id:"animal-demo-nilo",slug:"nilo-demo",foundationId:"foundation-demo-open-paws",name:"Nilo",isDemo:true,speciesId:null,temporarySpeciesLabel:"Gato",sex:"Macho",estimatedAge:"Adulto joven",size:"Pequeño",description:"Perfil demo para visualizar un individuo en proceso de recuperación.",story:"No se publica una historia ficticia como si fuera un rescate real.",healthSummary:"Resumen pendiente de información real.",specialNeeds:["Recuperación"],location:"Bogotá · zona general",careStatus:"recovering",adoptionStatus:"temporarilyUnavailable",sponsorshipStatus:"available",images:["https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=1100&q=85"],createdAt:"2026-08-21",updatedAt:"2026-08-21"},
  {id:"animal-demo-copo",slug:"copo-demo",foundationId:"foundation-demo-open-paws",name:"Copo",isDemo:true,speciesId:null,temporarySpeciesLabel:"Conejo doméstico",sex:"Por confirmar",estimatedAge:"Edad estimada pendiente",size:"Pequeño",description:"Tercer individuo demo para comprobar filtros y estados escalables.",story:"Contenido real pendiente.",healthSummary:"Sin información clínica publicada.",specialNeeds:[],location:"Bogotá · zona general",careStatus:"underCare",adoptionStatus:"notAvailable",sponsorshipStatus:"notAvailable",images:["https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=1100&q=85"],createdAt:"2026-08-21",updatedAt:"2026-08-21"}
];

// No existen apadrinamientos activos: el arreglo vacío evita inventar relaciones USER ↔ Animal.
export const sponsorships=[];

export function validateFoundationData(){
  const foundationIds=new Set(foundations.map(item=>item.id)),animalIds=new Set();
  for(const animal of foundationAnimals){
    if(animalIds.has(animal.id))throw new Error("Animal ID duplicado: "+animal.id);
    if(!foundationIds.has(animal.foundationId))throw new Error("Foundation inexistente en "+animal.id);
    animalIds.add(animal.id);
  }
  for(const foundation of foundations)for(const id of foundation.animalIds)if(!animalIds.has(id))throw new Error("Animal inexistente en "+foundation.id+": "+id);
  for(const item of sponsorships){if(!animalIds.has(item.animalId)||!foundationIds.has(item.foundationId))throw new Error("Apadrinamiento con referencias inválidas: "+item.id)}
  return {valid:true,foundations:foundationIds.size,animals:animalIds.size,sponsorships:sponsorships.length};
}
