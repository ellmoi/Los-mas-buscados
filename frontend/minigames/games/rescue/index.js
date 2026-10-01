import {header} from '../../../js/components/ui.js';
import {createWorld,updateWorld,nearPlace,places,returnFromCombat} from './world.js';
import {createMapRenderer} from './draw.js';
import {bindMovement} from './input.js';
import {avatars} from '../shared/pixel-art.js';
import {beginPoint1,currentBeat,advanceStory,updateStory} from './story.js';
import {drawPortrait} from './portraits.js';
import {createGameLoop} from '../../index.js';

export function rescuePage() {
  return `${header('Minijuegos','Un barrio que cuida','Recorre el barrio y decide cuándo intervenir.')}
  <section data-rescue aria-label="Un barrio que cuida">
    <div data-map-view>
      <div class="rescue-frame">
        <p class="rescue-objective" data-objective>Explora el barrio · Punto 1 disponible</p>
        <canvas class="rescue-canvas" data-world width="384" height="288" tabindex="0" aria-label="Mapa del barrio. Usa WASD o flechas para caminar." aria-describedby="rescue-help"></canvas>
        <div class="rescue-map" data-minimap><canvas width="128" height="96" aria-label="Minimapa: punto blanco, tu posición; marco, evento disponible; gris, pendiente."></canvas><small>□ disponible · ● tú</small></div>
        <div class="rescue-fade" data-fade hidden></div>
        <div class="rescue-overlay" data-map-overlay>
          <canvas data-portrait width="160" height="160" tabindex="-1" aria-label="Reacción del avatar: ceño fruncido, mirada de desaprobación y boca torcida." hidden></canvas>
          <h2 data-map-title>ANTES DE SALIR</h2><p data-map-copy tabindex="-1">Ponle un nombre a tu avatar y recorre el barrio a tu ritmo.</p>
          <div data-avatar-control><label>Nombre de tu avatar <input class="input" data-avatar-name type="text" maxlength="24" required autocomplete="off" placeholder="Escribe un nombre"></label><label>Apariencia <select class="select" data-avatar>${Object.entries(avatars).map(([id,a])=>`<option value="${id}">${a.name} · avatar de prueba</option>`).join('')}</select></label></div>
          <button class="button" type="button" data-map-start>Entrar al barrio</button>
          <button class="button secondary" type="button" data-map-cancel hidden>Seguir explorando</button>
        </div>
      </div>
      <div class="rescue-toolbar"><button class="button secondary" type="button" data-map-pause>Pausar</button><button class="button" type="button" data-interact>Interactuar · E</button><button class="button secondary" type="button" data-toggle-map aria-pressed="true">Ocultar minimapa</button><a class="button ghost" href="#/minijuegos">Minijuegos</a></div>
      <div class="rescue-directions" aria-label="Caminar por el mapa">
        <button class="button secondary" type="button" data-move="left" aria-label="Caminar izquierda">←</button><button class="button secondary" type="button" data-move="up" aria-label="Caminar arriba">↑</button><button class="button secondary" type="button" data-move="down" aria-label="Caminar abajo">↓</button><button class="button secondary" type="button" data-move="right" aria-label="Caminar derecha">→</button>
      </div>
      <p class="rescue-message" data-map-message role="status" aria-live="polite">Listo para explorar.</p>
      <ul class="rescue-places">${places.map(p=>`<li data-place="${p.id}">${p.name} · ${p.available?'Disponible':'Pendiente'}</li>`).join('')}</ul>
      <p id="rescue-help" class="rescue-help">WASD / flechas: caminar · E: interactuar. También puedes mantener los botones de dirección. Los diálogos avanzan con sus botones. Estado local: se conserva al volver del combate, no al recargar o salir del juego.</p>
    </div><div data-combat-view hidden></div>
  </section>`;
}

export function mount(container,{session=createWorld()}={}) {
  const area=container.querySelector('[data-rescue]'),get=s=>area.querySelector(s);
  const map=get('[data-map-view]'),slot=get('[data-combat-view]'),canvas=get('[data-world]');
  const mini=get('[data-minimap]'),overlay=get('[data-map-overlay]'),start=get('[data-map-start]'),cancel=get('[data-map-cancel]');
  const title=get('[data-map-title]'),copy=get('[data-map-copy]'),message=get('[data-map-message]'),fade=get('[data-fade]');
  const portrait=get('[data-portrait]'),avatarControl=get('[data-avatar-control]'),avatarSelect=get('[data-avatar]');
  const avatarName=get('[data-avatar-name]');
  const world=session,draw=createMapRenderer(canvas,mini.querySelector('canvas'));
  const canvasHome=canvas.parentNode,canvasLabel=canvas.getAttribute('aria-label');
  const loop=createGameLoop(tick);
  const placeLabels=places.map(p=>({place:p,node:get(`[data-place="${p.id}"]`)})),objective=get('[data-objective]');
  const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('./rescue.css',import.meta.url).href;document.head.append(sheet);
  const controller=new AbortController(),options={signal:controller.signal};
  let resumeMode='exploration',disposed=false,showMini=true,transitionTime=0,combatModule=null,disposeCombat=null,lastPlace='';
  const movement=bindMovement(map,canvas,{active:()=>world.mode==='exploration',interact,step:direction=>{if(updateWorld(world,direction,.05))encounter();draw(world,showMini);sync();}});
  function stopLoop(){loop.stop();movement.clear();}
  function schedule(){if(!disposed)loop.start();}
  function setMessage(text){if(message.textContent!==text)message.textContent=text;}
  function status(p){return world.completedEvents[p.id]?'Completado ✓':p.available?'Disponible':'Pendiente';}
  function sync(){
    const near=nearPlace(world),key=near?.id||'';
    if(key!==lastPlace){lastPlace=key;setMessage(near?`${near.name} · ${status(near)}.`:'Recorre el barrio a tu ritmo.');}
    for(const {place:p,node} of placeLabels){const label=`${p.name} · ${status(p)}`;if(node.textContent!==label)node.textContent=label;}
    const goal=world.completedEvents.point1?'Punto 1 completado ✓ · Puedes seguir explorando':'Explora el barrio · Punto 1 disponible';
    if(objective.textContent!==goal)objective.textContent=goal;
  }
  function panel(style=''){
    overlay.classList.remove('is-story','is-reaction');if(style)overlay.classList.add(style);
    overlay.hidden=false;portrait.hidden=true;avatarControl.hidden=true;cancel.hidden=true;start.disabled=false;
  }
  function showBeat(focus=true){
    const beat=currentBeat(world);panel(beat.portrait?'is-reaction':'is-story');
    title.textContent=beat.speaker==='avatar'?world.avatarName:beat.speaker;
    copy.textContent=beat.text;start.textContent=beat.button;cancel.hidden=!beat.canLeave;
    if(beat.portrait){portrait.hidden=false;drawPortrait(portrait.getContext('2d'),world.selectedAvatar);}
    const waiting=world.scene.time<(beat.wait||0);
    if(focus)(waiting?copy:start).focus({preventScroll:true});
    start.disabled=waiting;setMessage(`${title.textContent}: ${beat.text}`);
  }
  function tick(dt){
    if(disposed)return;
    if(world.mode==='exploration'){
      const trigger=updateWorld(world,movement.direction(),dt);draw(world,showMini);sync();
      if(trigger){encounter();return;}
    }else if(['dialogue','reaction','reaction-hold'].includes(world.mode)){
      updateStory(world,dt);
      if(world.mode==='dialogue')draw(world,showMini);
      if(['dialogue','reaction'].includes(world.mode))start.disabled=world.scene.time<(currentBeat(world).wait||0);
      else if(world.scene.time>=.65){transition();return;}
    }else if(world.mode==='transition'){
      transitionTime+=dt;fade.style.opacity=String(Math.min(1,transitionTime/.45));
      if(transitionTime>=.45&&combatModule){openCombat();return;}
    }else if(world.mode==='return-transition'){
      transitionTime+=dt;fade.style.opacity=String(Math.max(0,1-transitionTime/.45));
      if(transitionTime>=.45){world.scene=null;world.activeEvent=null;explore();return;}
    }else stopLoop();
  }
  function explore(){
    world.mode='exploration';resumeMode='exploration';overlay.hidden=true;fade.hidden=true;cancel.hidden=true;portrait.hidden=true;avatarControl.hidden=true;
    canvas.focus({preventScroll:true});draw(world,showMini);sync();schedule();
  }
  function encounter(){
    if(!beginPoint1(world))return;stopLoop();showBeat();draw(world,showMini);schedule();
  }
  function interact(){
    if(world.mode!=='exploration')return;const near=nearPlace(world);
    if(!near)setMessage('Acércate a un punto para interactuar.');
    else if(!near.available)setMessage(`${near.name}: pendiente. Esta historia todavía no está disponible.`);
    else if(world.completedEvents[near.id])setMessage('Punto 1 completado. El gato está fuera de peligro inmediato.');
    else encounter();
  }
  async function transition(){
    world.mode='transition';transitionTime=0;overlay.hidden=true;fade.hidden=false;fade.style.opacity='0';movement.clear();canvas.focus({preventScroll:true});schedule();
    try{combatModule=await import('../combat/index.js');}
    catch(error){if(disposed)return;stopLoop();world.mode='paused';resumeMode='exploration';panel();fade.hidden=true;title.textContent='NO SE PUDO ABRIR EL COMBATE';copy.textContent=error.message;start.textContent='Volver al barrio';}
  }
  function receiveResult(result){
    disposeCombat?.();disposeCombat=null;restoreCanvas();loop.setStep(tick);slot.replaceChildren();slot.hidden=true;map.hidden=false;
    returnFromCombat(world,result);world.mode='result';panel('is-story');fade.hidden=true;draw(world,showMini);sync();
    title.textContent=result.result==='victory'?'El gato tiene espacio':'Te apartas para tomar aire';
    copy.textContent=result.result==='victory'?'El padre baja los brazos y deja de enfrentarse a ti. Las niñas se apartan y el gato se aleja. Está fuera de peligro inmediato.':'Esta vez no has resuelto la situación. Puedes volver a intentarlo o seguir recorriendo el barrio.';
    start.textContent='Volver al barrio';setMessage(`${title.textContent}. ${copy.textContent}`);start.focus({preventScroll:true});
  }
  function restoreCanvas(){
    canvasHome.insertBefore(canvas,mini);
    canvas.setAttribute('aria-label',canvasLabel);canvas.setAttribute('aria-describedby','rescue-help');
  }
  function openCombat(){
    stopLoop();world.mode='combat';map.hidden=true;slot.hidden=false;
    slot.innerHTML=combatModule.combatPage({advanced:true,embedded:true,sharedCanvas:true,protectedAnimal:'cat'});
    try {disposeCombat=combatModule.mount(slot,{advanced:true,protectedAnimal:'cat',session:world,onReturn:receiveResult,canvas,loop});}
    catch(error){restoreCanvas();loop.setStep(tick);slot.replaceChildren();slot.hidden=true;map.hidden=false;world.mode='paused';resumeMode='exploration';panel();fade.hidden=true;title.textContent='NO SE PUDO INICIAR';copy.textContent=error.message;start.textContent='Volver al barrio';}
  }
  function pause(){
    if(!['exploration','dialogue','reaction','reaction-hold','transition','return-transition'].includes(world.mode))return;
    resumeMode=world.mode;world.mode='paused';stopLoop();panel();
    title.textContent='EN PAUSA';copy.textContent='Tu posición y la escena se conservan.';start.textContent='Reanudar';
  }
  function resume(){
    if(resumeMode==='exploration'){explore();return;}
    world.mode=resumeMode;
    if(['dialogue','reaction','reaction-hold'].includes(world.mode)){
      showBeat();if(world.mode==='reaction-hold'){start.disabled=true;start.textContent='…';portrait.focus({preventScroll:true});}
    }else{overlay.hidden=true;canvas.focus({preventScroll:true});}
    schedule();
  }
  start.addEventListener('click',()=>{
    if(disposed||document.hidden)return;
    if(world.mode==='intro'){
      const name=avatarName.value.trim();
      avatarName.setCustomValidity(!name?'Escribe el nombre de tu avatar.':name.length>24?'Usa un máximo de 24 caracteres.':'');
      if(!avatarName.reportValidity())return;
      world.avatarName=name;world.selectedAvatar=avatars[avatarSelect.value]?avatarSelect.value:'volunteer';explore();return;
    }
    if(['dialogue','reaction'].includes(world.mode)){
      if(!advanceStory(world))return;
      if(world.mode==='reaction-hold'){portrait.focus({preventScroll:true});start.disabled=true;start.textContent='…';cancel.hidden=true;}else showBeat();
      return;
    }
    if(world.mode==='result'){
      world.mode='return-transition';transitionTime=0;overlay.hidden=true;fade.hidden=false;fade.style.opacity='1';canvas.focus({preventScroll:true});schedule();return;
    }
    if(world.mode==='paused')resume();
  },options);
  avatarName.addEventListener('input',()=>avatarName.setCustomValidity(''),options);
  avatarName.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing){event.preventDefault();start.click();}},options);
  cancel.addEventListener('click',()=>{if(world.mode==='dialogue'&&currentBeat(world)?.canLeave){world.scene=null;world.activeEvent=null;stopLoop();explore();}},options);
  get('[data-interact]').addEventListener('click',interact,options);
  get('[data-map-pause]').addEventListener('click',()=>{pause();if(world.mode==='paused')start.focus({preventScroll:true});},options);
  get('[data-toggle-map]').addEventListener('click',event=>{showMini=!showMini;mini.hidden=!showMini;event.currentTarget.textContent=showMini?'Ocultar minimapa':'Mostrar minimapa';event.currentTarget.setAttribute('aria-pressed',String(showMini));draw(world,showMini);},options);
  window.addEventListener('blur',pause,options);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();},options);
  map.addEventListener('focusout',event=>{if(!map.contains(event.relatedTarget))pause();},options);
  const modal=document.querySelector('#modal-root'),observer=new MutationObserver(()=>{if(modal?.childElementCount)pause();});if(modal)observer.observe(modal,{childList:true});
  draw(world,showMini);sync();
  return ()=>{disposed=true;stopLoop();disposeCombat?.();movement.dispose();controller.abort();observer.disconnect();sheet.remove();};
}
