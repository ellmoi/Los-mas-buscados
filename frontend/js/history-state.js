window.__nexoNavigationCount=0;
function normalizeProfileRoute(){if(location.hash.startsWith("#/perfil?"))location.replace("#/perfil")}
normalizeProfileRoute();
window.addEventListener("hashchange",()=>{window.__nexoNavigationCount++;normalizeProfileRoute()});
