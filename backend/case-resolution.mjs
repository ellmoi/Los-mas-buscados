// Resultado público opcional dentro del JSON del caso; no introduce estados nuevos.
export function applyResolution(latest,body,data,user,fail){
 const previous=JSON.parse(latest.body).resolution;
 const requested=body.state??latest.state;
 if(latest.kind==='adoption'){
  if(body.resolution!==undefined)fail(400,'Gestiona el resultado desde la adopción.');
  return;
 }
 if((body.state!==undefined||body.resolution!==undefined)&&latest.owner_id!==user.id)fail(403,'Solo el creador puede resolver o reabrir este caso.');
 if(body.resolution!==undefined&&requested!=='resolved')fail(400,'El resultado corresponde a un caso resuelto.');
 if(body.resolution!==undefined){
  const value=body.resolution;
  if(!value||typeof value!=='object'||Array.isArray(value)||!['reunited','safe','other'].includes(value.outcome)||typeof value.note!=='string'||value.note.trim().length>300)fail(400,'Selecciona un resultado y una nota de hasta 300 caracteres.');
  if(latest.state==='resolved'&&(previous?.outcome!==value.outcome||previous?.note!==value.note.trim()))fail(409,'El caso ya está resuelto. Actualiza la página para consultar el resultado guardado.');
 }
 if(requested==='resolved'){
  if(latest.state==='resolved'){if(previous)data.resolution=previous;}
  else data.resolution={outcome:body.resolution?.outcome||'other',note:body.resolution?.note.trim()||'',resolvedAt:new Date().toISOString()};
 }
 // Reabrir elimina el resultado vigente. La publicación y sus mensajes permanecen.
}
