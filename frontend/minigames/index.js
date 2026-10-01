import {header} from '../js/components/ui.js';

// Un reloj por partida, compartido por exploración y combate. Cambiar de modo
// reinicia el delta; parar dentro de un frame impide programar trabajo residual.
export function createGameLoop(step) {
  let frame=null,previous=null,active=false;
  function tick(now){
    frame=null;if(!active)return;
    const dt=previous===null?0:Math.min(Math.max((now-previous)/1000,0),.05);previous=now;
    step(dt);
    if(active&&frame===null)frame=requestAnimationFrame(tick);
  }
  function stop(){active=false;if(frame!==null)cancelAnimationFrame(frame);frame=null;previous=null;}
  return {
    start(){active=true;if(frame===null)frame=requestAnimationFrame(tick);},
    stop,
    setStep(next){stop();step=next;},
  };
}

// Entrada de la sección; los futuros juegos viven en games/, no en app.js.
export function minigamesPage() {
  return `<div data-minigames>${header('Jugar y cuidar', 'Minijuegos', 'Pequeñas experiencias inspiradas en los animales de nuestra comunidad.')}
    <section class="card state-card"><span class="badge">En desarrollo</span>
      <h2>Un barrio que cuida</h2><p>Recorre el barrio, descubre situaciones relacionadas con el bienestar animal y decide cuándo intervenir.</p>
      <a class="button" href="#/minijuegos/rescate">Jugar</a>
    </section></div>`;
}

// Lista explícita: nunca construir imports con texto recibido de la URL.
export async function loadMinigame(path) {
  // El enlace antiguo de combate abre la misma entrada del único videojuego.
  if (path === '/minijuegos/rescate' || path === '/minijuegos/combat') {
    const rescue = await import('./games/rescue/index.js');
    return {html: rescue.rescuePage(), mount: rescue.mount};
  }
  return {html: minigamesPage()};
}
