// Genera una vista HTML con los componentes y datos de la demostración ya iniciada.
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {socialCase,socialContext} from '../frontend/js/components/social.js';
import {escapeHTML as e} from '../frontend/js/components/ui.js';
const origin='http://localhost:'+Number(process.env.DEMO_PORT||3001);
const site=await (await fetch(origin+'/api/v1/site')).json();
if(!site.demo)throw Error('El muestrario solo utiliza el servidor de demostración.');
const {items}=await (await fetch(origin+'/api/v1/cases?limit=5')).json();
const local=items.map(item=>({...item,image:'assets/demo/'+item.id.replace(/^demo-/,'')+'.jpg'}));
const navigation=[['inicio','Inicio'],['explorar','Explorar'],['perdidos','Perdidos'],['encontrados','Encontrados'],['adopciones','Adopciones'],['mensajes','Mensajes'],['informacion','Información y cuidados'],['nuestro-trabajo','Nuestro trabajo'],['veterinarias','Veterinarias']];
const cards=local.map(socialCase).join('').replace(/href="#\/mascota\//g,`href="${origin}/#/mascota/`).replace(/<button type="button" data-share-case[^>]*>[\s\S]*?<\/button>/g,`<a href="${origin}">Abrir demostración →</a>`);
const context=socialContext().replace(/<button class="button" data-modal="lost">[\s\S]*?<\/button>/,`<a class="button" href="${origin}/#/inicio">Probar la página</a>`).replace('href="#/informacion"',`href="${origin}/#/informacion"`);
writeFileSync(fileURLToPath(new URL('../frontend/muestrario.html',import.meta.url)),`<!doctype html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Buscados · Muestrario visual</title>${['tokens','styles','pages','content','release','social'].map(name=>`<link rel="stylesheet" href="css/${name}.css">`).join('')}</head>
<body class="social-app"><div class="app-shell"><header class="mobile-header"><strong>Buscados · Muestra visual</strong><a href="${origin}">Abrir demo</a></header><aside class="sidebar"><a class="brand" href="${origin}"><span class="brand-mark">B</span><span><strong>Buscados</strong><small>Juntos, de vuelta a casa</small></span></a><nav class="main-nav" aria-label="Explorar demostración">${navigation.map(([path,label])=>`<a class="nav-link ${path==='inicio'?'active':''}" href="${origin}/#/${path}">${e(label)}</a>`).join('')}</nav></aside><main class="main-content"><section class="card demo-banner"><strong>Muestrario visual de Buscados</strong><p>Esta vista reutiliza el diseño, las fotos y los componentes de la aplicación. Los casos y comentarios son ficticios.</p><a href="${origin}">Abrir la demostración funcional →</a></section><header class="community-heading"><div><span class="eyebrow">Juntos, de vuelta a casa</span><h1>Tu comunidad</h1><p>Cada pista puede ser el comienzo de un reencuentro.</p></div></header><div class="social-feed">${cards}</div></main><aside class="context-panel">${context}</aside><nav class="mobile-nav" aria-label="Demostración móvil"><a class="nav-link active" href="${origin}">Inicio</a><a class="nav-link" href="${origin}/#/adopciones">Adopciones</a><a class="nav-link" href="${origin}/#/mensajes">Mensajes</a></nav></div></body></html>`);
console.log('Muestrario creado: frontend/muestrario.html');
