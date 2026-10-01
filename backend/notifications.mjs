// Los triggers guardan el aviso en la misma transacción que el evento original.
export function installNotifications(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS notifications(
    id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL REFERENCES users(id),
    kind TEXT NOT NULL,target_id TEXT NOT NULL,created TEXT NOT NULL,read INTEGER NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS notifications_user_id ON notifications(user_id,id);
    CREATE TRIGGER IF NOT EXISTS notify_message AFTER INSERT ON messages BEGIN
      INSERT INTO notifications(user_id,kind,target_id,created)
      SELECT CASE WHEN NEW.sender_id=owner_id THEN visitor_id ELSE owner_id END,
        'message',NEW.conversation_id,NEW.created FROM conversations WHERE id=NEW.conversation_id;
    END;
    CREATE TRIGGER IF NOT EXISTS notify_moderation_insert AFTER INSERT ON moderation
    WHEN NEW.visibility='hidden' BEGIN
      INSERT INTO notifications(user_id,kind,target_id,created)
      SELECT owner_id,'case_hidden',NEW.case_id,NEW.updated FROM cases WHERE id=NEW.case_id;
    END;
    CREATE TRIGGER IF NOT EXISTS notify_moderation_update AFTER UPDATE ON moderation
    WHEN NEW.visibility!=OLD.visibility BEGIN
      INSERT INTO notifications(user_id,kind,target_id,created)
      SELECT owner_id,CASE WHEN NEW.visibility='hidden' THEN 'case_hidden' ELSE 'case_restored' END,
        NEW.case_id,NEW.updated FROM cases WHERE id=NEW.case_id;
    END;`);
  async function route({req,url,json,send,fail,requireUser}) {
    const path=url.pathname;
    if(path!=='/api/v1/notifications'&&!path.startsWith('/api/v1/notifications/'))return false;
    const user=requireUser(req);
    if(path==='/api/v1/notifications'&&req.method==='GET') {
      const raw=Number(url.searchParams.get('before'));
      if(url.searchParams.has('before')&&(!Number.isSafeInteger(raw)||raw<1))fail(400,'Cursor inválido.');
      const rows=db.prepare('SELECT id,kind,target_id AS targetId,created,read FROM notifications WHERE user_id=? AND id<? ORDER BY id DESC LIMIT 26').all(user.id,raw||Number.MAX_SAFE_INTEGER);
      const items=rows.slice(0,25).map(row=>({...row,read:!!row.read}));
      const unread=db.prepare('SELECT count(*) AS n FROM notifications WHERE user_id=? AND read=0').get(user.id).n;
      send(200,{items,unread,hasMore:rows.length>25,nextBefore:items.at(-1)?.id||null});return true;
    }
    if(path==='/api/v1/notifications/read'&&req.method==='POST') {
      const body=await json(req);
      if(!Number.isSafeInteger(body.throughId)||body.throughId<1)fail(400,'Identificador inválido.');
      db.prepare('UPDATE notifications SET read=1 WHERE user_id=? AND id<=?').run(user.id,body.throughId);
      send(200,{ok:true});return true;
    }
    const match=/^\/api\/v1\/notifications\/(\d+)\/read$/.exec(path);
    if(match&&req.method==='POST') {
      const id=Number(match[1]);
      if(!Number.isSafeInteger(id)||!db.prepare('SELECT 1 FROM notifications WHERE id=? AND user_id=?').get(id,user.id))fail(404,'Notificación no encontrada.');
      db.prepare('UPDATE notifications SET read=1 WHERE id=? AND user_id=?').run(id,user.id);
      send(200,{ok:true});return true;
    }
    fail(404,'Servicio de notificaciones no encontrado.');
  }
  return {route};
}
