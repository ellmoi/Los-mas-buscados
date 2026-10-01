import {applyResolution} from './backend/case-resolution.mjs';
// Entrada del backend: crea SQLite, instala módulos y despacha HTTP. Guía: docs/GUIA_DE_ESTUDIO.md, sección 8.
import http from 'node:http';
import {installCaseSearch,searchConditions,findMatches} from './backend/case-search.mjs';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installModeration } from './backend/moderation.mjs';
import { installMessages } from './backend/messages.mjs';
import { installRecovery } from './backend/recovery.mjs';
import { runtimeConfig,createMailer } from './backend/runtime.mjs';
import { installAccount } from './backend/account.mjs';
import { installVeterinaries } from './backend/veterinaries.mjs';
import { installEditorial } from './backend/editorial.mjs';
import { installMailQueue } from './backend/mail-queue.mjs';
import { installComments } from './backend/comments.mjs';
import { installCommentReports } from './backend/comment-reports.mjs';
import { installAdoptions } from './backend/adoptions.mjs';
import { installNotifications } from './backend/notifications.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const derive = promisify(scrypt);
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const digest = value => createHash('sha256').update(value).digest('hex');
export function createApp(options = {}) {
  const config=runtimeConfig();
  const {dataDir=config.dataDir,secure=config.secure,deliver=createMailer(config,dataDir),now}=options;
  mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(resolve(dataDir, 'buscados.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'USER');
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS cases(id TEXT PRIMARY KEY,owner_id TEXT REFERENCES users(id),kind TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'open',body TEXT NOT NULL,created TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS cases_kind_created ON cases(kind,created);
    CREATE INDEX IF NOT EXISTS cases_owner ON cases(owner_id);
    CREATE TABLE IF NOT EXISTS images(id TEXT PRIMARY KEY,case_id TEXT REFERENCES cases(id),mime TEXT NOT NULL,bytes BLOB NOT NULL);`);
  const moderation = installModeration(db);
  installCaseSearch(db);
  const comments = installComments(db);
  const commentReports = installCommentReports(db);
  const veterinaries = installVeterinaries(db);
  const editorial = installEditorial(db);
  const messages = installMessages(db);
  const notifications = installNotifications(db);
  const adoptions = installAdoptions(db);
  const mailQueue=installMailQueue(db,{deliver,now});
  const mailOptions={publicUrl:config.publicUrl,now,enqueue:(message,meta)=>mailQueue.enqueue({...message,from:config.from},meta),wake:()=>mailQueue.kick()};
  const recovery = installRecovery(db,mailOptions);
  const account = installAccount(db,mailOptions);
  const publicUser = u => u ? { id: u.id, name: u.name, email: u.email, role: u.role, emailVerified:account.emailVerified(u) } : null;
  const cookieToken = req => /(?:^|;\s*)session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1] || '';
  const currentUser = req => db.prepare('SELECT u.* FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.token=? AND s.expires>?').get(digest(cookieToken(req)), Date.now());
  const requireUser = req => currentUser(req) || fail(401, 'Inicia sesión para continuar.');
  function session(req, res, user) {
    db.prepare('DELETE FROM sessions WHERE token=? OR expires<=?').run(digest(cookieToken(req)), Date.now());
    const token = randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token), user.id, Date.now() + 604800000);
    res.setHeader('Set-Cookie', `session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${secure ? '; Secure' : ''}`);
  }
  function pack(row, user) {
    const photos = db.prepare('SELECT id FROM images WHERE case_id=? ORDER BY rowid').all(row.id).map(x => '/api/v1/images/' + x.id);
    return { ...JSON.parse(row.body), commentCount:comments.count(row.id), ...moderation.metadata(row,user), ...adoptions.metadata(row,user), id: row.id, isOwner: !!user && user.id === row.owner_id, canResolve: !!user && user.id === row.owner_id && row.kind !== 'adoption', kind: row.kind, state: row.state, status: row.kind === 'adoption' ? ({available:'Disponible para adopción',paused:'Adopción pausada',adopted:'Adoptado'}[row.state]) : row.state === 'resolved' ? 'Resuelto' : row.kind === 'lost' ? 'Perdido' : 'Encontrado', time: new Date(row.created).toLocaleDateString('es-CO'), photos, image: photos[0] || '', canEdit: !!user && (user.id === row.owner_id || user.role === 'ADMIN') };
  }
  function validate(body,kind) {
    const result = {};
    for (const [key, max, required] of [['name',80,true],['species',40,true],['city',80,true],['zone',120,true],['description',500,true],['size',30,false],['breed',80,false],['sex',30,false],['color',80,false],['age',80,kind==='adoption'],['care',500,kind==='adoption'],['requirements',500,kind==='adoption']]) {
      const value = body[key] ?? '';
      if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) fail(400, `Revisa el campo ${key}.`);
      result[key] = value.trim();
    }
    return result;
  }
  function photos(input) {
    if (!Array.isArray(input) || input.length > 3) fail(400, 'Adjunta hasta tres fotografías.');
    return input.map(value => {
      if (typeof value !== 'string') fail(400, 'Fotografía inválida.');
      const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+=*)$/.exec(value);
      if (!match) fail(400, 'Formato de fotografía inválido.');
      const bytes = Buffer.from(match[2], 'base64');
      const mime = match[1];
      const valid = mime === 'image/png' ? bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')) : mime === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP';
      if (!valid || bytes.length > 2 * 1024 * 1024) fail(400, 'Cada fotografía debe ser JPG, PNG o WebP de hasta 2 MB.');
      return { id: randomUUID(), mime, bytes };
    });
  }
  async function json(req) {
    if (!req.headers['content-type']?.startsWith('application/json')) fail(415, 'Se requiere JSON.');
    let size = 0; const chunks = [];
    for await (const chunk of req) { size += chunk.length; if (size > 9 * 1024 * 1024) fail(413, 'El envío supera el tamaño permitido.'); chunks.push(chunk); }
    try { const body = JSON.parse(Buffer.concat(chunks)); if (!body || Array.isArray(body) || typeof body !== 'object') throw Error(); return body; } catch { fail(400, 'JSON inválido.'); }
  }
  const attempts = new Map();
  const server = http.createServer(async (req, res) => {
    const send = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','same-origin');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Frame-Options','DENY');
    if(secure)res.setHeader('Strict-Transport-Security','max-age=31536000');
    try {
      const url = new URL(req.url, 'http://localhost'); const path = url.pathname;
      if (!['GET','HEAD'].includes(req.method)) {
        if (req.headers['sec-fetch-site'] === 'cross-site') fail(403, 'Origen no permitido.');
        const origin=config.production?config.publicUrl:`${secure ? 'https' : 'http'}://${req.headers.host}`;
        if (req.headers.origin && req.headers.origin !== origin) fail(403, 'Origen no permitido.');
      }
      if (path === '/api/v1/me' && req.method === 'GET') return send(200, publicUser(currentUser(req)));
      if(await account.route({req,url,json,send,fail,requireUser,publicUser}))return;
      if(path==='/api/v1/health'&&req.method==='GET'){db.prepare('SELECT 1').get();return send(200,{ok:true});}
      if(path==='/api/v1/site'&&req.method==='GET')return send(200,{demo:!!options.demo});
      if(path==='/api/v1/admin/mail'&&req.method==='GET'){
        if(requireUser(req).role!=='ADMIN')fail(403,'Acceso administrativo restringido.');
        return send(200,{counts:db.prepare('SELECT status,count(*) AS total FROM mail_outbox GROUP BY status').all(),items:db.prepare('SELECT id,kind,status,attempts,next_attempt,created,updated,error_code FROM mail_outbox ORDER BY created DESC,id DESC LIMIT 50').all()});
      }
      if(await recovery.route({req,url,json,send,fail}))return;
      if(await veterinaries.route({req,url,json,send,fail,requireUser}))return;
      if(await editorial.route({req,url,json,send,fail,requireUser}))return;
      if(await comments.route({req,url,json,send,fail,requireUser,currentUser}))return;
      if(await commentReports.route({req,url,json,send,fail,requireUser}))return;
      if(await moderation.route({req,url,json,send,fail,requireUser,pack}))return;
      if(await messages.route({req,url,json,send,fail,requireUser}))return;
      if(await notifications.route({req,url,json,send,fail,requireUser}))return;
      if(await adoptions.route({req,url,json,send,fail,requireUser}))return;
      if (['/api/v1/register','/api/v1/login'].includes(path) && req.method === 'POST') {
        const key = req.socket.remoteAddress; const now = Date.now();
        for (const [ip, entry] of attempts) if (entry.until < now) attempts.delete(ip);
        const entry = attempts.get(key) || { count: 0, until: now + 900000 }; attempts.set(key, entry);
        if (++entry.count > 30) fail(429, 'Demasiados intentos. Vuelve a intentar en 15 minutos.');
        const body = await json(req); const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 128) fail(400, 'Revisa el correo y la contraseña (8 a 128 caracteres).');
        let user;
        if (path.endsWith('/register')) {
          if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 80) fail(400, 'Escribe tu nombre (máximo 80 caracteres).');
          const salt = randomBytes(16).toString('hex'); const hash = (await derive(body.password, salt, 64)).toString('hex');
          user = { id: randomUUID(), name: body.name.trim(), email, role: 'USER' };
          try { db.prepare('INSERT INTO users(id,name,email,password) VALUES(?,?,?,?)').run(user.id,user.name,email,`${salt}:${hash}`); } catch (error) { if (error.message.includes('UNIQUE')) fail(409, 'Ese correo ya está registrado.'); throw error; }
        } else {
          user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
          const [salt, hash] = (user?.password || `${'0'.repeat(32)}:${'0'.repeat(128)}`).split(':');
          const derived = await derive(body.password,salt,64);
          if (!user || !timingSafeEqual(derived,Buffer.from(hash,'hex')) || db.prepare('SELECT password FROM users WHERE id=?').get(user.id)?.password!==user.password) fail(401, 'Correo o contraseña incorrectos.');
        }
        session(req,res,user); return send(200,publicUser(user));
      }
      if (path === '/api/v1/logout' && req.method === 'POST') {
        db.prepare('DELETE FROM sessions WHERE token=?').run(digest(cookieToken(req)));
        res.setHeader('Set-Cookie',`session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure ? '; Secure' : ''}`); return send(200,{ok:true});
      }
      if (path === '/api/v1/cases' && req.method === 'GET') {
        const user = url.searchParams.get('mine') === 'true' ? requireUser(req) : currentUser(req);
        const where = []; const args = [];
        if (url.searchParams.has('kind')) { where.push('kind=?'); args.push(url.searchParams.get('kind')); }
        if (url.searchParams.get('mine') === 'true') { where.push('owner_id=?'); args.push(user.id); }
        else where.push(moderation.publicClause);
        const search = searchConditions(url.searchParams);
        where.push(...search.where);args.push(...search.args);
        const limit = Math.min(100,Math.max(1,Math.floor(Number(url.searchParams.get('limit')) || 24)));
        const rawOffset = Number(url.searchParams.get('offset'));
        const offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
        const clause = where.length ? ' WHERE '+where.join(' AND ') : '';
        const total = db.prepare('SELECT count(*) AS n FROM cases'+clause).get(...args).n;
        const rows = db.prepare('SELECT * FROM cases'+clause+' ORDER BY '+search.order+' LIMIT ? OFFSET ?').all(...args,...search.orderArgs,limit,offset);
        return send(200,{items:rows.map(row=>pack(row,user)),total,limit,offset});
      }
      if (path === '/api/v1/cases' && req.method === 'POST') {
        const user = requireUser(req); const body = await json(req);
        if (!['lost','found','adoption'].includes(body.kind)) fail(400,'Selecciona perdido, encontrado o adopción.');
        const data = validate(body,body.kind); const media = photos(body.photos || []); const id = randomUUID();
        db.exec('BEGIN');
        try { db.prepare('INSERT INTO cases(id,owner_id,kind,state,body,created) VALUES(?,?,?,?,?,?)').run(id,user.id,body.kind,body.kind==='adoption'?'available':'open',JSON.stringify(data),new Date().toISOString());
          for (const p of media) db.prepare('INSERT INTO images VALUES(?,?,?,?)').run(p.id,id,p.mime,p.bytes);
          db.exec('COMMIT'); } catch(error) { db.exec('ROLLBACK'); throw error; }
        return send(201,pack(db.prepare('SELECT * FROM cases WHERE id=?').get(id),user));
      }
      const matchPath = /^\/api\/v1\/cases\/([^/]+)\/matches$/.exec(path);
      if (matchPath && req.method === 'GET') {
        const user = currentUser(req);
        const source = db.prepare('SELECT * FROM cases WHERE id=?').get(matchPath[1]);
        if (!source || !moderation.canView(source,user)) fail(404,'Caso no encontrado.');
        if (moderation.metadata(source,user).visibility === 'hidden') return send(200,{items:[]});
        const items = findMatches(db,source,moderation.publicClause).map(({row,reasons})=>({...pack(row,user),matchReasons:reasons}));
        return send(200,{items});
      }
      if (/^\/api\/v1\/cases\/[^/]+$/.test(path)) {
        const row = db.prepare('SELECT * FROM cases WHERE id=?').get(path.split('/').at(-1)); if (!row) fail(404,'Caso no encontrado.');
        if (req.method === 'GET') {const user=currentUser(req);if(!moderation.canView(row,user))fail(404,'Caso no encontrado.');return send(200,pack(row,user));}
        if (req.method === 'PATCH') {
          const user = requireUser(req); if (row.owner_id !== user.id && user.role !== 'ADMIN') fail(403,'No puedes modificar este caso.');
          const body = await json(req);
          // Leer de nuevo tras recibir el cuerpo evita sobrescribir cambios concurrentes.
          const latest = db.prepare('SELECT * FROM cases WHERE id=?').get(row.id);
          const data = validate({...JSON.parse(latest.body),...body},latest.kind);
          if(latest.kind==='adoption'&&body.state!==undefined)fail(400,'Gestiona el estado desde la adopción o su solicitud.');
          const state = body.state ?? latest.state; if (latest.kind!=='adoption'&&!['open','resolved'].includes(state)) fail(400,'Estado inválido.');
          applyResolution(latest,body,data,user,fail);
          const media = body.photos === undefined ? null : photos(body.photos);
          db.exec('BEGIN');
          try { db.prepare('UPDATE cases SET body=?,state=? WHERE id=?').run(JSON.stringify(data),state,row.id);
            if (media) { db.prepare('DELETE FROM images WHERE case_id=?').run(row.id); for (const p of media) db.prepare('INSERT INTO images VALUES(?,?,?,?)').run(p.id,row.id,p.mime,p.bytes); }
            db.exec('COMMIT'); } catch(error) { db.exec('ROLLBACK'); throw error; }
          return send(200,pack(db.prepare('SELECT * FROM cases WHERE id=?').get(row.id),user));
        }
      }
      if (/^\/api\/v1\/images\/[^/]+$/.test(path) && req.method === 'GET') {
        const p = db.prepare('SELECT * FROM images WHERE id=?').get(path.split('/').at(-1)); if (!p) fail(404,'Imagen no encontrada.');
        const row=db.prepare('SELECT * FROM cases WHERE id=?').get(p.case_id);
        if(!row||!moderation.canView(row,currentUser(req)))fail(404,'Imagen no encontrada.');
        res.writeHead(200,{'Content-Type':p.mime,'Cache-Control':'private, no-store'}); return res.end(p.bytes);
      }
      if (path.startsWith('/api/')) fail(404,'Servicio no encontrado.');
      if (path === '/admin' || path.startsWith('/admin/')) { const user = requireUser(req); if (user.role !== 'ADMIN') fail(403,'Acceso administrativo restringido.'); }
      if (!['GET','HEAD'].includes(req.method)) fail(405,'Método no permitido.');
      let file;
      if (path === '/' || path === '/index.html') file = resolve(root,'index.html');
      else if (path === '/admin' || path === '/admin/') file = resolve(root,'admin/index.html');
      else if (path.startsWith('/frontend/') || path.startsWith('/admin/')) {
        let decoded;try{decoded=decodeURIComponent(path);}catch{fail(404,'Página no encontrada.');}
        file = resolve(root,'.'+decoded);
      }
      else fail(404,'Página no encontrada.');
      if (!file.startsWith(resolve(root,'frontend')+sep) && !file.startsWith(resolve(root,'admin')+sep) && file !== resolve(root,'index.html')) fail(404,'Página no encontrada.');
      // Autorizar el destino resuelto, no solo el texto de la URL (puede estar codificado).
      if(file.startsWith(resolve(root,'admin')+sep)){const user=requireUser(req);if(user.role!=='ADMIN')fail(403,'Acceso administrativo restringido.');}
      const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
      if (!types[extname(file)]) fail(404,'Archivo no encontrado.');
      let bytes; try { bytes = readFileSync(file); } catch { fail(404,'Archivo no encontrado.'); }
      res.writeHead(200,{'Content-Type':types[extname(file)]}); res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch(error) { if (!error.status) console.error(error); if (!res.headersSent) send(error.status || 500,{error:error.status ? error.message : 'No pudimos completar la operación.'}); else res.end(); }
  });
  server.on('listening',()=>mailQueue.start());
  server.on('close',()=>{mailQueue.stop();db.close();});
  return server;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  const server=createApp().listen(port, process.env.HOST || '127.0.0.1',()=>console.log(`Buscados: http://localhost:${port}`));
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close());
}
