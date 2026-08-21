export const taxonomy=[
  {id:"mammals",slug:"mamiferos",name:"Mamíferos",description:"Estructura preparada para categorías de mamíferos domésticos, silvestres y de cuidado especializado.",icon:"track",parentId:null,subcategories:[],status:"structure"},
  {id:"birds",slug:"aves",name:"Aves",description:"Base para organizar información por grupos, contextos de hallazgo y necesidades de orientación.",icon:"bird",parentId:null,subcategories:[],status:"structure"},
  {id:"reptiles",slug:"reptiles",name:"Reptiles",description:"Categoría preparada para futuras subcategorías y fichas verificadas.",icon:"scale",parentId:null,subcategories:[],status:"structure"},
  {id:"amphibians",slug:"anfibios",name:"Anfibios",description:"Espacio flexible para incorporar clasificación y contenido responsable más adelante.",icon:"drop",parentId:null,subcategories:[],status:"structure"},
  {id:"fish",slug:"peces",name:"Peces",description:"Base de navegación para fichas, cuidados y relaciones con otros contenidos.",icon:"fish",parentId:null,subcategories:[],status:"structure"},
  {id:"invertebrates",slug:"invertebrados",name:"Invertebrados",description:"Una entrada amplia para categorías y subcategorías que se definirán con contenido real.",icon:"wing",parentId:null,subcategories:[],status:"structure"},
  {id:"uncommon",slug:"poco-comunes",name:"Poco comunes",description:"Organismos que suelen quedar fuera de los espacios tradicionales de ayuda y cuidado.",icon:"spiral",parentId:null,subcategories:[],status:"structure"}
];
export const knowledgeEntries=[];
export const officialProjects=[];
export const speciesSchema={identity:["commonName","scientificName","taxonomyId","classification"],overview:["description","habitat","distribution","diet","behavior","lifeCycle"],guidance:["environmentalConditions","generalCare","risks","recommendations","whatToDo","whatNotToDo"],media:["photos","sources"],relations:["knowledgeEntryIds","projectIds","relatedSpeciesIds"]};
export const projectSchema={identity:["title","cover","status","startDate"],narrative:["description","objective","observations","results"],records:["gallery","progressLog","updates","references"],tracking:["individuals","stages"],relations:["speciesIds","knowledgeEntryIds","relatedProjectIds"]};
export const contentRelations={speciesToKnowledge:{},speciesToProjects:{},projectToKnowledge:{}};
