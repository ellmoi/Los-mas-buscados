// Solo destinos internos reconocidos; nunca acepta una redirección externa.
export function safeReturn(value){
 if(typeof value!=='string'||value.length>2048)return '#/casos';
 const [path,query='',...extra]=value.split('?');
 if(extra.length||!/^#\/(?:inicio|explorar|perdidos|encontrados|adopciones|casos|perfil|publicaciones|configuracion|notificaciones|veterinarias|poco-comunes|minijuegos(?:\/(?:rescate|combat))?|mascota\/[a-zA-Z0-9-]{1,80}|mensajes(?:\/[a-zA-Z0-9-]{1,80})?|solicitudes-adopcion(?:\/[a-zA-Z0-9-]{1,80})?|informacion(?:\/especie\/[a-zA-Z0-9-]{1,80})?|nuestro-trabajo(?:\/[a-zA-Z0-9-]{1,80})?)$/.test(path))return '#/casos';
 const params=new URLSearchParams(query),allowed=new Set(['q','kind','state','species','sex','size','color','city','zone','period','sort','mine','from']);
 if([...params.keys()].some(key=>!allowed.has(key))||(params.has('from')&&!/^[a-zA-Z0-9-]{1,80}$/.test(params.get('from'))))return '#/casos';
 return value;
}
export const returnAfterAuth=(hash=globalThis.location?.hash||'')=>safeReturn(new URLSearchParams(hash.split('?')[1]||'').get('next'));
export const loginForCase=(hash=globalThis.location?.hash||'')=>'#/login?next='+encodeURIComponent(safeReturn(hash));
export const authSwitch=(route,hash=globalThis.location?.hash||'')=>'#/'+route+'?next='+encodeURIComponent(returnAfterAuth(hash));
