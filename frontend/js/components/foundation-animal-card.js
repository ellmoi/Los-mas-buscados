/** Tarjeta compartida por Adopciones y el perfil de Fundación. */
const careLabels={underCare:"Bajo cuidado",recovering:"En recuperación",temporaryHome:"Hogar temporal",readyForHome:"Preparado para hogar"};
const adoptionLabels={notAvailable:"No disponible",available:"En adopción",inProcess:"En proceso",adopted:"Adoptado",temporarilyUnavailable:"Adopción pausada"};

export function foundationAnimalCard(animal,{foundationName="",showCare=true}={}){
  const search=[animal.name,animal.temporarySpeciesLabel,animal.location,animal.size,animal.sex,...animal.specialNeeds].join(" ").toLowerCase();
  return `<article class="card foundation-animal-card" data-adoption-card data-search="${search}" data-species="${animal.temporarySpeciesLabel}" data-size="${animal.size}" data-sex="${animal.sex}" data-needs="${animal.specialNeeds.length?"yes":"no"}">
    <a href="#/animales/${animal.slug}" class="animal-image-link"><img src="${animal.images[0]}" alt="${animal.name}, ${animal.temporarySpeciesLabel}" loading="lazy"></a>
    <div><div class="card-labels"><span class="demo-badge">Datos de demostración</span>${showCare?`<span class="badge">${careLabels[animal.careStatus]}</span>`:""}</div>
    <h3>${animal.name}</h3><p>${animal.temporarySpeciesLabel} · ${animal.estimatedAge} · ${animal.size}</p>
    ${foundationName?`<p class="caption">Bajo el cuidado de ${foundationName}</p>`:""}<span class="status-line">${adoptionLabels[animal.adoptionStatus]}</span>
    <a class="text-link" href="#/animales/${animal.slug}">Ver animal →</a></div></article>`;
}
