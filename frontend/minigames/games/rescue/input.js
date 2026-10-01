export const directions = {KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};

export function bindMovement(area,canvas,{active,interact,step}) {
  const controller=new AbortController(),options={signal:controller.signal},held=new Map();
  const clear=()=>held.clear();
  area.addEventListener('keydown',e=>{
    if(!active()||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('a,input,textarea,select'))return;
    const direction=directions[e.code];
    if(direction){e.preventDefault();held.set(e.code,direction);}
    if(e.code==='KeyE'&&!e.repeat){e.preventDefault();interact();}
  },options);
  window.addEventListener('keyup',e=>held.delete(e.code),options);
  area.querySelectorAll('[data-move]').forEach(button=>{
    const direction=button.dataset.move;
    button.addEventListener('pointerdown',e=>{
      if(!active()||e.button!==0)return;e.preventDefault();canvas.focus({preventScroll:true});button.setPointerCapture(e.pointerId);held.set(e.pointerId,direction);
    },options);
    for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,e=>held.delete(e.pointerId),options);
    button.addEventListener('click',e=>{if(active()&&e.detail===0)step(direction);},options);
  });
  return {direction:()=>[...held.values()].at(-1),clear,dispose:()=>{clear();controller.abort();}};
}
