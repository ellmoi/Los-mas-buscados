import {request} from '../services/api.js';
export async function showDemoBanner(){
  try{
    const site=await request('/site');if(!site.demo||document.querySelector('[data-demo-banner]'))return;
    const banner=document.createElement('section');banner.className='card demo-banner';banner.dataset.demoBanner='';
    banner.innerHTML='<strong>Buscados ? Demo de portafolio</strong><p>Explora reportes de mascotas, adopciones y conversaciones con datos ficticios.</p><details><summary>Probar con una cuenta de ejemplo</summary><p>Equipo: <b>demo@buscados.example</b><br>Visitante: <b>ana@buscados.example</b><br>Contrase?a de ambas: <b>Demo-Buscados-2026!</b></p><p>Usa estas cuentas y datos de prueba para recorrer la aplicaci?n.</p><a href="#/login">Iniciar sesi?n</a> ? <a href="./admin/">Administraci?n</a></details>';
    document.querySelector('#main-content').prepend(banner);
  }catch{/* El aviso no debe impedir usar la aplicación si falla esta consulta. */}
}
