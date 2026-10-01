import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir,writeFile,rename,unlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
export function runtimeConfig(env=process.env){
 const production=env.NODE_ENV==='production',secure=env.COOKIE_SECURE==='true',mailMode=env.MAIL_MODE||'file';
 const url=new URL(env.PUBLIC_URL||`http://localhost:${env.PORT||3000}`);
 if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||!['http:','https:'].includes(url.protocol))throw new Error('PUBLIC_URL debe ser un origen HTTP(S), sin rutas ni credenciales.');
 if(!['file','resend'].includes(mailMode))throw new Error('MAIL_MODE debe ser file o resend.');
 if(production&&(!secure||url.protocol!=='https:'||mailMode==='file'||!env.PUBLIC_URL))throw new Error('Producción requiere PUBLIC_URL HTTPS, COOKIE_SECURE=true y MAIL_MODE=resend.');
 if(mailMode==='resend'&&(!env.RESEND_API_KEY||!env.MAIL_FROM))throw new Error('Configura RESEND_API_KEY y MAIL_FROM.');
 return {production,secure,mailMode,publicUrl:url.origin,dataDir:resolve(env.DATA_DIR||resolve(root,'data')),apiKey:env.RESEND_API_KEY,from:env.MAIL_FROM};
}
export function createMailer(config,dataDir){
 return async({to,url,kind='recovery',idempotencyKey,from=config.from})=>{
  const verification=kind==='verification';
  const subject=verification?'Verifica tu correo en Buscados':'Recupera tu cuenta de Buscados';
  const text=verification?`Confirma tu dirección de correo para tu cuenta de Buscados:\n\n${url}\n\nVence en 24 horas y solo puede usarse una vez. Si no lo solicitaste, ignora este mensaje.`:`Solicitaste recuperar tu cuenta de Buscados. Abre este enlace para elegir una nueva contraseña:\n\n${url}\n\nVence en 30 minutos y solo puede usarse una vez. Si no lo solicitaste, ignora este mensaje.`;
  if(config.mailMode==='file'){
   const dir=resolve(dataDir,'mail');await mkdir(dir,{recursive:true});
   const id=idempotencyKey||randomUUID();
   if(!/^[a-zA-Z0-9-]{1,80}$/.test(id))throw new Error('Identificador de correo inválido.');
   // El mismo trabajo usa el mismo archivo incluso si el proceso reinicia tras escribirlo.
   const temporary=resolve(dir,`${id}-${randomUUID()}.tmp`);
   try{
    await writeFile(temporary,JSON.stringify({to,subject,text},null,2),{encoding:'utf8',flag:'wx',mode:0o600});
    await rename(temporary,resolve(dir,`${id}.json`));
   }finally{await unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});}return;
  }
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${config.apiKey}`,'Content-Type':'application/json',...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},body:JSON.stringify({from,to:[to],subject,text}),signal:AbortSignal.timeout(10000)});
  if(!response.ok){
   const value=response.headers.get('retry-after'),seconds=Number(value);
   const retryAfterMs=value?(Number.isFinite(seconds)?seconds*1000:Math.max(0,Date.parse(value)-Date.now())):0;
   throw Object.assign(new Error('No se pudo entregar el correo.'),{status:response.status,retryable:response.status===408||response.status===409||response.status===429||response.status>=500,retryAfterMs});
  }
 };
}
