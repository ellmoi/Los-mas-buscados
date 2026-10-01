import {randomUUID} from 'node:crypto';

// Una sola instancia del servidor por base de datos. Nunca registra enlaces ni destinatarios.
export function installMailQueue(db,{deliver,now=Date.now,intervalMs=1000}){
  db.exec(`CREATE TABLE IF NOT EXISTS mail_outbox(
    id TEXT PRIMARY KEY,kind TEXT NOT NULL,token_hash TEXT NOT NULL,payload TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed','expired')),
    attempts INTEGER NOT NULL DEFAULT 0,next_attempt INTEGER NOT NULL,expires INTEGER NOT NULL,
    created INTEGER NOT NULL,updated INTEGER NOT NULL,error_code TEXT);
    CREATE INDEX IF NOT EXISTS mail_outbox_due ON mail_outbox(status,next_attempt);
    UPDATE mail_outbox SET status='pending' WHERE status='sending';`);
  let stopped=false,running=null,timer;
  function enqueue(message,{tokenHash,expires}){
    const id=randomUUID(),time=now();
    db.prepare('INSERT INTO mail_outbox(id,kind,token_hash,payload,next_attempt,expires,created,updated) VALUES(?,?,?,?,?,?,?,?)')
      .run(id,message.kind||'recovery',tokenHash,JSON.stringify(message),time,expires,time,time);
    return id;
  }
  function finish(id,status,errorCode=null){db.prepare('UPDATE mail_outbox SET status=?,payload=NULL,updated=?,error_code=? WHERE id=?').run(status,now(),errorCode,id);}
  async function drain(){
    // Batches finitos evitan monopolizar el proceso si entra correo continuamente.
    for(let i=0;i<25&&!stopped;i++){
      const row=db.prepare("SELECT * FROM mail_outbox WHERE status='pending' AND next_attempt<=? ORDER BY created,id LIMIT 1").get(now());
      if(!row)break;
      const table=row.kind==='verification'?'email_verifications':'password_resets';
      if(row.expires<=now()||!db.prepare(`SELECT 1 FROM ${table} WHERE token=? AND expires>?`).get(row.token_hash,now())){finish(row.id,'expired');continue;}
      if(row.attempts>=8){finish(row.id,'failed','attempt_limit');continue;}
      db.prepare("UPDATE mail_outbox SET status='sending',attempts=attempts+1,updated=? WHERE id=?").run(now(),row.id);
      try{
        await deliver({...JSON.parse(row.payload),idempotencyKey:row.id});
        if(stopped)return;
        finish(row.id,'sent');
      }catch(error){
        if(stopped)return;
        const attempts=row.attempts+1;
        const code=Number.isInteger(error.status)?'http_'+error.status:'transport_error';
        if(row.expires<=now())finish(row.id,'expired');
        else if(error.retryable===false||attempts>=8)finish(row.id,'failed',code);
        else{
          const delay=Math.max(Math.min(30000*2**(attempts-1),900000),Math.min(Math.max(Number(error.retryAfterMs)||0,0),86400000));
          db.prepare("UPDATE mail_outbox SET status='pending',next_attempt=?,updated=?,error_code=? WHERE id=?").run(Math.min(now()+delay,row.expires),now(),code,row.id);
        }
      }
    }
  }
  function kick(){
    if(stopped)return Promise.resolve();
    if(!running)running=drain().catch(()=>console.error('No se pudo procesar la cola de correo.')).finally(()=>{running=null;});
    return running;
  }
  function start(){if(timer||stopped)return;timer=setInterval(kick,intervalMs);timer.unref();kick();}
  function stop(){stopped=true;clearInterval(timer);}
  return {enqueue,kick,start,stop};
}
