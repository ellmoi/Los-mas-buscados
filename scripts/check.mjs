// Verificación estática sin dependencias: no ejecuta módulos del navegador.
import {readdirSync,readFileSync,existsSync} from 'node:fs';
import {resolve,dirname,extname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url)),files=[];
function walk(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const path=resolve(dir,item.name);if(item.isDirectory())walk(path);else files.push(path);}}
for(const dir of ['frontend','backend','scripts','tests','admin'])walk(resolve(root,dir));
files.push(resolve(root,'server.mjs'),resolve(root,'index.html'));
const errors=[];let modules=0,links=0,styles=0;
function checkLink(from,url){
 if(!url||url.startsWith('#')||/^[a-z]+:/i.test(url)||url.startsWith('//'))return;
 const clean=url.split(/[?#]/)[0];if(!clean)return;
 const destination=clean.startsWith('/')?resolve(root,'.'+clean):resolve(dirname(from),clean);
 links++;if(!existsSync(destination))errors.push(`${relative(root,from)}: referencia inexistente ${url}`);
}
for(const file of files){
 const source=readFileSync(file,'utf8'),extension=extname(file);
 if(['.js','.mjs'].includes(extension)){
  modules++;const checked=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(checked.status!==0)errors.push(checked.stderr||`No se pudo validar ${file}`);
  for(const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*)(['"])(\.{1,2}\/[^'"]+)\1/g))checkLink(file,match[2]);
 }
 if(extension==='.html')for(const match of source.matchAll(/(?:href|src)=["']([^"']+)["']/g))checkLink(file,match[1]);
 if(extension==='.css'){
  styles++;let depth=0,quote=null,comment=false;
  for(let i=0;i<source.length;i++){
   const c=source[i],next=source[i+1];
   if(comment){if(c==='*'&&next==='/'){comment=false;i++;}continue;}
   if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote=null;continue;}
   if(c==='/'&&next==='*'){comment=true;i++;continue;}
   if(c==='"'||c==="'"){quote=c;continue;}
   if(c==='{')depth++;if(c==='}')depth--;if(depth<0)break;
  }
  if(depth!==0||quote||comment)errors.push(`${relative(root,file)}: bloque, comentario o cadena CSS sin cerrar`);
 }
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log(`Correcto: ${modules} módulos JavaScript, ${links} referencias locales y ${styles} hojas CSS (balance estructural).`);
