import {DatabaseSync,backup} from 'node:sqlite';
import {mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {runtimeConfig} from '../backend/runtime.mjs';
export async function backupDatabase(source,destination){
 if(!existsSync(source))throw new Error('No existe la base de datos.');
 mkdirSync(destination,{recursive:true});
 const path=resolve(destination,`buscados-${Date.now()}-${randomUUID()}.sqlite`);
 const db=new DatabaseSync(source,{readOnly:true});
 try{await backup(db,path);const copy=new DatabaseSync(path,{readOnly:true});try{if(copy.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('La copia no superó la verificación de integridad.');}finally{copy.close();}}finally{db.close();}
 return path;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(await backupDatabase(resolve(runtimeConfig().dataDir,'buscados.sqlite'),resolve('backups')));}catch(error){console.error(error.message);process.exitCode=1;}
}
