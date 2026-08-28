export const classifications=[
  {id:"mammals",slug:"mamiferos",name:"Mamíferos",description:"Estructura preparada para categorías de mamíferos domésticos, silvestres y de cuidado especializado.",icon:"track",parentId:null,subcategories:[],status:"structure"},
  {id:"birds",slug:"aves",name:"Aves",description:"Base para organizar información por grupos, contextos de hallazgo y necesidades de orientación.",icon:"bird",parentId:null,subcategories:[],status:"structure"},
  {id:"reptiles",slug:"reptiles",name:"Reptiles",description:"Clasificación preparada para futuras subcategorías y fichas verificadas.",icon:"scale",parentId:null,subcategories:[],status:"structure"},
  {id:"amphibians",slug:"anfibios",name:"Anfibios",description:"Espacio flexible para incorporar clasificación y contenido responsable más adelante.",icon:"drop",parentId:null,subcategories:[],status:"structure"},
  {id:"fish",slug:"peces",name:"Peces",description:"Base de navegación para fichas, cuidados y relaciones con otros contenidos.",icon:"fish",parentId:null,subcategories:[],status:"structure"},
  {id:"invertebrates",slug:"invertebrados",name:"Invertebrados",description:"Una entrada amplia para categorías y subcategorías que se definirán con contenido real.",icon:"wing",parentId:null,subcategories:[],status:"structure"}
];

export const editorialCollections=[];
export const knowledgeEntries=[];
export const officialProjects=[];

export const collectionSchema={
  identity:["id","slug","name","description"],
  selection:["speciesIds","tags"],
  presentation:["cover","featuredSpeciesIds","status"]
};

export const lifeCycleSchema={
  type:null,
  description:null,
  stages:[],
  stageShape:{id:"",name:"",description:"",duration:null,image:null}
};

export const speciesSchema={
  required:["id","slug"],
  identity:["commonName","scientificName","classificationId"],
  description:["summary","distribution","habitat"],
  biology:["diet","behavior","lifeCycle","reproduction"],
  humanInteraction:["conditions","handling","risks","recommendations","whatToDo","whatNotToDo"],
  mediaAndSources:["images","references","relatedContentIds"],
  discovery:["tags","collectionIds"],
  projects:["projectIds"],
  optionalByDefault:true
};

export const projectSchema={
  required:["id","slug","title"],
  identity:["cover","status","startDate"],
  narrative:["description","objective","observations","results"],
  records:["gallery","progressLog","updates","references"],
  flexibleTracking:["individuals","stages"],
  relations:["speciesIds","knowledgeEntryIds","relatedProjectIds"],
  optionalByDefault:true
};

export const contentRelations={
  speciesToKnowledge:{},
  speciesToProjects:{},
  speciesToCollections:{},
  projectToKnowledge:{}
};
