/** Frontera asíncrona demo. Las páginas nunca mutan los arreglos fuente. */
import {pets,posts,vets,notifications} from "../data/demo-data.js";
import {classifications,editorialCollections,knowledgeEntries,officialProjects,collectionSchema,lifeCycleSchema,speciesSchema,projectSchema,contentRelations} from "../data/content-data.js";
import {categories,validateCategoryHierarchy} from "../data/category-data.js";
import {foundations,foundationAnimals,sponsorships,foundationSchema,foundationAnimalSchema,sponsorshipSchema,validateFoundationData} from "../data/foundation-data.js";
import {adoptionApplications,adoptionApplicationSchema,adoptionApplicationStatuses,validateAdoptionRelationships} from "../data/adoption-data.js";
import {departments,municipalities} from "../data/colombia-locations.js";
import {validateLocationCatalog} from "../data/location-validation.js";
import {validateDemoCases} from "../data/case-validation.js";
const hierarchyStatus=validateCategoryHierarchy(classifications,categories);
const foundationStatus=validateFoundationData();
const relationshipStatus=validateAdoptionRelationships(foundations,foundationAnimals,sponsorships);
const locationStatus=validateLocationCatalog(departments,municipalities);
const caseStatus=validateDemoCases(pets,departments,municipalities);
const wait=(value,delay=120)=>new Promise(resolve=>setTimeout(()=>resolve(structuredClone(value)),delay));
const childrenOf=(classificationId,parentId=null)=>categories.filter(item=>item.classificationId===classificationId&&item.parentId===parentId);
function resolveNavigation(classificationSlug,categorySlugs=[]){const classification=classifications.find(item=>item.slug===classificationSlug);if(!classification)return null;let parentId=null,current=null;const trail=[];for(const slug of categorySlugs){current=categories.find(item=>item.classificationId===classification.id&&item.parentId===parentId&&item.slug===slug);if(!current)return null;trail.push(current);parentId=current.id}return {classification,current,trail,children:childrenOf(classification.id,current?.id||null)}}
function foundationWithCounts(item){const animals=foundationAnimals.filter(animal=>animal.foundationId===item.id);return {...item,adoptionCount:animals.filter(x=>x.adoptionStatus==="available").length,sponsorshipCount:animals.filter(x=>x.sponsorshipStatus==="available").length}}
export const api={
 getPosts:()=>wait(posts),getPets:(kind)=>wait(kind?pets.filter(p=>p.kind===kind):pets),getPet:(id)=>wait(pets.find(p=>p.id===id)),getVets:()=>wait(vets),getNotifications:()=>wait(notifications),
 getClassifications:()=>wait(classifications),getCategories:(classificationId,parentId=null)=>wait(childrenOf(classificationId,parentId)),getCategoryNavigation:(slug,path)=>wait(resolveNavigation(slug,path)),getHierarchyStatus:()=>wait(hierarchyStatus),
 getCollections:()=>wait(editorialCollections),getKnowledgeEntries:()=>wait(knowledgeEntries),getSpecies:(id)=>wait(knowledgeEntries.find(x=>x.id===id||x.slug===id)),getOfficialProjects:()=>wait(officialProjects),getOfficialProject:(id)=>wait(officialProjects.find(x=>x.id===id||x.slug===id)),
 getFoundations:()=>wait(foundations.map(foundationWithCounts)),getFoundation:(id)=>wait(foundations.find(x=>x.id===id||x.slug===id)).then(item=>item?foundationWithCounts(item):null),getFoundationAnimals:(foundationId)=>wait(foundationAnimals.filter(x=>x.foundationId===foundationId)),getFoundationAnimal:(id)=>wait(foundationAnimals.find(x=>x.id===id||x.slug===id)),
 getLocationStatus:()=>wait({...locationStatus,cases:caseStatus}),getDepartments:()=>wait(departments),getMunicipalities:(departmentId)=>wait(municipalities.filter(item=>!departmentId||item.departmentId===departmentId)),
 getAdoptableFoundationAnimals:()=>wait(foundationAnimals.filter(x=>x.adoptionStatus==="available")),getAdoptionApplicationsForUser:(userId)=>wait(adoptionApplications.filter(x=>x.applicantUserId===userId)),getSponsorshipsForUser:(userId)=>wait(sponsorships.filter(x=>x.sponsorUserId===userId)),getFoundationStatus:()=>wait({...foundationStatus,relationships:relationshipStatus}),
 getContentSchemas:()=>wait({collectionSchema,lifeCycleSchema,speciesSchema,projectSchema,contentRelations,foundationSchema,foundationAnimalSchema,sponsorshipSchema,adoptionApplicationSchema,adoptionApplicationStatuses}),
 search:async(q)=>wait(pets.filter(p=>`${p.name} ${p.species} ${p.breed} ${p.city} ${p.zone}`.toLowerCase().includes(q.toLowerCase().trim()))),submitDemo:()=>wait({ok:true},350)
};
