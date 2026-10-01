import {request} from '../services/api.js';

export async function showDemoBanner(){
  try{
    const site=await request('/site');
    if(!site.demo||document.querySelector('[data-demo-banner]'))return;
    const banner=document.createElement('section');
    banner.className='card demo-banner';banner.dataset.demoBanner='';
    banner.innerHTML=`<strong>Explora Buscados en funcionamiento</strong>
      <p>Una comunidad de ejemplo: fotos, comentarios y conversaciones ficticias para conocer la experiencia.</p>
      <button class="button" type="button" data-try-demo>Entrar como visitante de prueba</button>
      <a class="button secondary" href="#/mascota/luna">Ver un caso con comentarios</a>
      <p data-demo-status role="status"></p>
      <details><summary>Cuentas de demostración</summary><p>Visitante: ana@buscados.example<br>Equipo: demo@buscados.example<br>Contraseña: Demo-Buscados-2026!</p><a href="#/login">Iniciar sesión manualmente</a></details>`;
    banner.querySelector('[data-try-demo]').onclick=async event=>{
      const button=event.currentTarget;button.disabled=true;
      try{
        await request('/login',{method:'POST',body:JSON.stringify({email:'ana@buscados.example',password:'Demo-Buscados-2026!'})});
        location.hash='/mensajes';location.reload();
      }catch(error){banner.querySelector('[data-demo-status]').textContent=error.message;button.disabled=false;}
    };
    document.querySelector('#main-content').prepend(banner);
  }catch{/* El aviso no debe impedir usar la aplicación si falla esta consulta. */}
}
