import {DatabaseSync} from 'node:sqlite';
import {scryptSync,randomBytes,createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {createApp} from '../server.mjs';
import {pets,vets} from '../frontend/js/data/demo-data.js';

const root=fileURLToPath(new URL('../',import.meta.url));
export const demoPassword='Demo-Buscados-2026!';
export function seedDemo(database){
  const db=new DatabaseSync(database);
  try{
    db.exec('PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS demo_seed(version INTEGER PRIMARY KEY);');
    const upgradeComments=()=>{
      if(db.prepare('SELECT 1 FROM demo_seed WHERE version=2').get())return false;
      db.exec('BEGIN');
      try{
        for(const row of db.prepare('SELECT id,body FROM cases').all()){
          const body=JSON.parse(row.body);
          for(const [index,comment] of (body.demoComments||[]).entries()){
            const now=new Date().toISOString(),author=comment.author.startsWith('Equipo')?'demo-editor':'demo-reader';
            db.prepare('INSERT OR IGNORE INTO comments(case_id,author_id,text,client_id,request_hash,created,updated) VALUES(?,?,?,?,?,?,?)').run(row.id,author,comment.text,'demo-public-comment-'+row.id+'-'+index,createHash('sha256').update(comment.text).digest('hex'),now,now);
          }
          if(body.demoComments){delete body.demoComments;db.prepare('UPDATE cases SET body=? WHERE id=?').run(JSON.stringify(body),row.id);}
        }
        db.prepare('INSERT INTO demo_seed VALUES(2)').run();db.exec('COMMIT');return true;
      }catch(error){db.exec('ROLLBACK');throw error;}
    };
    if(db.prepare('SELECT 1 FROM demo_seed WHERE version=1').get())return upgradeComments();
    if(db.prepare('SELECT count(*) AS n FROM users').get().n)throw Error('La demostración requiere una base vacía. No se modificaron las cuentas existentes.');
    const now=new Date().toISOString(),day=now.slice(0,10),salt=randomBytes(16).toString('hex');
    const password=salt+':'+scryptSync(demoPassword,salt,64).toString('hex');
    db.exec('BEGIN');
    try{
      for(const [id,name,email,role] of [['demo-editor','Equipo Buscados · Demo','demo@buscados.example','ADMIN'],['demo-reader','Ana · Demo','ana@buscados.example','USER']]){
        db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(id,name,email,password,role);
      }
      for(const [index,p] of pets.entries()){
        const body={...p,care:p.kind==='adoption'?'Cuidados y seguimiento acordados con su responsable. Ejemplo de demostración.':'',requirements:p.kind==='adoption'?'Un hogar seguro y tiempo para acompañarle. Ejemplo de demostración.':''};
        delete body.image;delete body.reward;
        if(index===0)body.demoComments=[{author:'Ana · Demo',text:'Compartí la publicación con mis vecinos. ¡Ojalá Luna vuelva pronto!'},{author:'Equipo Buscados · Demo',text:'Gracias por acompañar la búsqueda. Cada pista cuenta.'}];
        if(p.id==='mora')body.demoComments=[{author:'Ana · Demo',text:'Qué bonita. Ya envié mi solicitud para conocerla.'}];
        const created=new Date(Date.now()-index*3600000).toISOString();
        db.prepare('INSERT INTO cases VALUES(?,?,?,?,?,?)').run('demo-'+p.id,'demo-editor',p.kind,p.kind==='adoption'?'available':'open',JSON.stringify(body),created);
        const bytes=readFileSync(resolve(root,'frontend/assets/demo',p.id+'.jpg'));
        db.prepare('INSERT INTO images VALUES(?,?,?,?)').run('demo-photo-'+p.id,'demo-'+p.id,'image/jpeg',bytes);
      }
      // Comentarios conversacionales: se usa la mensajería privada existente.
      for(const [caseId,id,texts] of [
        ['demo-luna','demo-conversation-luna',['Vi una perrita parecida cerca del parque. ¿Podemos comparar sus marcas?','Gracias por escribir. Te comparto los detalles por aquí.','Voy a revisar las fotos. Ojalá pronto esté de vuelta en casa.']],
        ['demo-mora','demo-conversation-mora',['Mora se ve muy tranquila. Me gustaría conocerla.','Gracias por tu interés. Podemos hablar de sus rutinas y del proceso de adopción.']]
      ]){
        db.prepare('INSERT INTO conversations(id,case_id,owner_id,visitor_id,created) VALUES(?,?,?,?,?)').run(id,caseId,'demo-editor','demo-reader',now);
        texts.forEach((text,i)=>db.prepare('INSERT INTO messages(conversation_id,sender_id,text,client_id,created) VALUES(?,?,?,?,?)').run(id,i%2?'demo-editor':'demo-reader',text,id+'-'+i,new Date(Date.now()-(texts.length-i)*60000).toISOString()));
      }
      db.prepare('INSERT INTO adoption_applications(id,case_id,applicant_id,message,created,updated) VALUES(?,?,?,?,?,?)').run('demo-application','demo-mora','demo-reader','Me gustaría conocer a Mora y conversar sobre sus cuidados. Solicitud de ejemplo.',now,now);
      db.prepare('INSERT INTO notifications(user_id,kind,target_id,created) VALUES(?,?,?,?)').run('demo-editor','adoption_application','demo-mora',now);
      vets.forEach((v,i)=>{
        const body={name:v.name+' · Demo',city:'Bogotá',address:'Dirección de ejemplo; no acudir',phone:'+00 000 000 0000',hours:v.hours,services:v.services,sourceUrl:'https://example.com'};
        db.prepare("INSERT INTO veterinaries(id,body,status,verified_on,created,updated) VALUES(?,?,'published',?,?,?)").run('demo-vet-'+i,JSON.stringify(body),day,now,now);
      });
      for(const [id,kind,title,summary,text] of [
        ['demo-guide','article','Una comunidad que se acompaña','Así puede verse una guía de la comunidad.','Una fotografía, una descripción y una conversación pueden reunir a una familia.\n\nEste artículo es una muestra editorial. Usa el panel para escribir, revisar y publicar el contenido definitivo.'],
        ['demo-project','project','Historias de vuelta a casa','Un espacio para documentar el trabajo de Buscados.','Aquí podrás contar el propósito del proyecto, sus actividades y los resultados documentados.\n\nEsta publicación demuestra la presentación del CMS; no describe resultados reales.']
      ])db.prepare("INSERT INTO editorial(id,body,status,reviewed_on,created,updated) VALUES(?,?,'published',?,?,?)").run(id,JSON.stringify({kind,title,summary,text,sourceUrl:'https://example.com'}),day,now,now);
      db.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?)').run('demo-audit','demo-editor','create_editorial','demo-guide','Muestra local de contenido editorial.',now);
      db.prepare('INSERT INTO demo_seed VALUES(1)').run();db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}
    upgradeComments();return true;
  }finally{db.close();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.env.NODE_ENV==='production')throw Error('El modo demo solo se puede usar en desarrollo local.');
  const port=Number(process.env.DEMO_PORT||3001),dataDir=resolve(root,'data/demo');
  process.env.MAIL_MODE='file';process.env.COOKIE_SECURE='false';process.env.PUBLIC_URL='http://localhost:'+port;
  const server=createApp({dataDir,demo:true,secure:false});
  seedDemo(resolve(dataDir,'buscados.sqlite'));
  server.listen(port,'127.0.0.1',()=>console.log(`Demostración: http://localhost:${port}\nCuenta: demo@buscados.example\nContraseña: ${demoPassword}\nSegunda cuenta: ana@buscados.example (misma contraseña)\nDatos de muestra guardados en data/demo; no se vuelven a crear al reiniciar.`));
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close());
}
