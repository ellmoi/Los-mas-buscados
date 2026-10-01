// Frontera navegador/servidor: centraliza fetch, JSON y errores. No debe contener secretos.
import {taxonomy,speciesSchema,projectSchema,contentRelations} from '../data/content-data.js';
import {clearSessionUser,ensureDemoStore,getDemoPassword,getDemoStore,getSessionUser,normalizeCase,parseJsonBody,publicUser,saveDemoStore,setSessionUser,syncDemoCommentCounts} from '../demo-store.js';

const buildApiUrl = path => {
  const normalized = path.startsWith('/api/v1') ? path : '/api/v1' + path;
  return normalized;
};

function normalizeApiPath(path) {
  const next = path.startsWith('/') ? path : '/' + path;
  return next.startsWith('/api/v1') ? next : '/api/v1' + next;
}

function issue(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function demoRequest(path, options = {}) {
  const state = ensureDemoStore();
  const result = handleDemoRequest(path, options, state);
  syncDemoCommentCounts(state);
  saveDemoStore(state);
  return result;
}

function handleDemoRequest(path, options, state) {
  const method = (options.method || 'GET').toUpperCase();
  const requestPath = normalizeApiPath(path);
  const query = requestPath.includes('?') ? requestPath.split('?')[1] || '' : '';
  const pathname = requestPath.split('?')[0];
  const sessionUser = getSessionUser();
  const parseBody = () => parseJsonBody(options);
  const commentResponse = comment => {
    const author = state.users.find(user => user.id === comment.author_id);
    return {
      id: comment.id,
      caseId: comment.case_id,
      authorName: author?.name || 'Miembro de la comunidad',
      text: comment.text,
      status: comment.status,
      revision: comment.revision,
      created: comment.created,
      updated: comment.updated || comment.created,
      canReport: !!sessionUser && comment.author_id !== sessionUser.id && comment.status === 'visible',
      canEdit: !!sessionUser && comment.author_id === sessionUser.id && comment.status !== 'deleted',
    };
  };

  const requireUser = () => {
    if (!sessionUser) throw issue(401, 'Inicia sesión para continuar.');
    return sessionUser;
  };

  if (pathname === '/api/v1/site' && method === 'GET') return { demo: true };
  if (pathname === '/api/v1/me' && method === 'GET') return publicUser(sessionUser);
  if (pathname === '/api/v1/logout' && method === 'POST') {
    clearSessionUser();
    return { ok: true };
  }
  if (pathname === '/api/v1/login' && method === 'POST') {
    const body = parseBody();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const user = state.users.find(item => item.email === email && item.password === password);
    if (!user) throw issue(401, 'Correo o contraseña incorrectos.');
    setSessionUser(user);
    return publicUser(user);
  }
  if (pathname === '/api/v1/register' && method === 'POST') {
    const body = parseBody();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!body.name || !email || password.length < 8) throw issue(400, 'Revisa nombre, correo y contraseña.');
    const exists = state.users.some(item => item.email === email);
    if (exists) throw issue(409, 'Ese correo ya está registrado.');
    const user = { id: 'user-' + Math.random().toString(36).slice(2, 9), name: String(body.name).trim(), email, password, role: 'USER' };
    state.users.push(user);
    setSessionUser(user);
    return publicUser(user);
  }
  if (pathname === '/api/v1/notifications' && method === 'GET') {
    const user = requireUser();
    const items = state.notifications.filter(item => item.user_id === user.id);
    return { items, total: items.length, limit: items.length, offset: 0 };
  }
  if (pathname === '/api/v1/notifications/read' && method === 'POST') {
    const user = requireUser();
    state.notifications.forEach(item => { if (item.user_id === user.id) item.read = true; });
    return { ok: true };
  }
  const threadSummary = (thread, user) => {
    const pet = state.cases.find(item => item.id === thread.case_id);
    const owner = thread.owner_id === user.id;
    const peer = state.users.find(item => item.id === (owner ? thread.visitor_id : thread.owner_id));
    const last = thread.messages.at(-1);
    const reference = pet ? normalizeCase(pet, user) : null;
    return { id: thread.id, caseId: thread.case_id, caseName: reference?.name || 'Caso no disponible', caseState: pet?.state,
      peerName: peer?.name || 'Contacto', lastText: last?.text || '', lastCreated: last?.created || thread.created,
      closedByMe: !!thread[owner ? 'owner_closed' : 'visitor_closed'], closedByOther: !!thread[owner ? 'visitor_closed' : 'owner_closed'],
      caseHidden: !pet || pet.visibility === 'hidden', unread: 0, cases: reference ? [{...reference, available: pet.visibility !== 'hidden'}] : [] };
  };
  const appendMessage = (thread, user, body) => {
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text || text.length > 2000 || !body.clientId) throw issue(400, 'Escribe entre 1 y 2000 caracteres.');
    const previous = thread.messages.find(item => item.sender_id === user.id && item.clientId === body.clientId);
    if (previous) { if (previous.text !== text) throw issue(409, 'El identificador de env?o ya se utiliz?.'); return; }
    const summary = threadSummary(thread, user);
    if (summary.closedByMe || summary.closedByOther || summary.caseHidden) throw issue(409, 'La conversaci?n est? cerrada o el caso est? oculto.');
    thread.messages.push({id: 'message-' + crypto.randomUUID(), sender_id: user.id, text, clientId: body.clientId, created: new Date().toISOString()});
  };
  const contact = pathname.match(/^\/api\/v1\/cases\/([^/]+)\/conversations$/);
  if (contact && method === 'POST') {
    const user = requireUser(), body = parseBody();
    const pet = state.cases.find(item => item.id === decodeURIComponent(contact[1]) && item.visibility !== 'hidden');
    if (!pet) throw issue(404, 'Caso no disponible.');
    if (pet.owner_id === user.id) throw issue(400, 'No puedes iniciar una conversaci?n contigo mismo.');
    let thread = state.conversations.find(item => item.case_id === pet.id && item.visitor_id === user.id);
    if (!thread) {
      if (pet.state === 'resolved') throw issue(409, 'El caso ya est? resuelto.');
      thread = {id: 'conversation-' + crypto.randomUUID(), case_id: pet.id, owner_id: pet.owner_id, visitor_id: user.id, created: new Date().toISOString(), messages: []};
      state.conversations.push(thread);
    }
    if (!body.openOnly) appendMessage(thread, user, body);
    return {id: thread.id};
  }
  if (pathname === '/api/v1/conversations' && method === 'GET') {
    const user = requireUser();
    const rows = state.conversations.filter(item => item.owner_id === user.id || item.visitor_id === user.id);
    const offset = Math.max(0, Number(new URLSearchParams(query).get('offset')) || 0);
    return {items: rows.slice(offset, offset + 20).map(item => threadSummary(item, user)), total: rows.length, offset, limit: 20};
  }
  const threadRoute = pathname.match(/^\/api\/v1\/conversations\/([^/]+)(?:\/(messages|read))?$/);
  if (threadRoute) {
    const user = requireUser();
    const thread = state.conversations.find(item => item.id === decodeURIComponent(threadRoute[1]));
    if (!thread || (thread.owner_id !== user.id && thread.visitor_id !== user.id)) throw issue(404, 'Conversaci?n no encontrada.');
    if (method === 'GET' && !threadRoute[2]) return {...threadSummary(thread, user), items: thread.messages.map(item => ({...item, mine: item.sender_id === user.id})), hasMore: false, nextBefore: null};
    if (method === 'POST' && threadRoute[2] === 'messages') { appendMessage(thread, user, parseBody()); return {ok: true}; }
    if (method === 'POST' && threadRoute[2] === 'read') return {ok: true};
    if (method === 'PATCH' && !threadRoute[2]) {
      const body = parseBody();
      if (typeof body.closed !== 'boolean') throw issue(400, 'Estado inv?lido.');
      thread[thread.owner_id === user.id ? 'owner_closed' : 'visitor_closed'] = body.closed;
      return {ok: true};
    }
  }
  if (pathname === '/api/v1/veterinaries' && method === 'GET') {
    const params = new URLSearchParams(query);
    const city = (params.get('city') || '').trim().toLowerCase();
    const items = state.vets.filter(vet => !city || `${vet.name} ${vet.city}`.toLowerCase().includes(city));
    return { items, total: items.length, limit: items.length, offset: 0 };
  }
  if (pathname === '/api/v1/editorial' && method === 'GET') {
    const params = new URLSearchParams(query);
    const items = state.editorial.filter(item => !params.get('kind') || item.kind === params.get('kind'));
    return { items, total: items.length, offset: Number(params.get('offset') || 0), limit: items.length };
  }
  if (pathname.startsWith('/api/v1/editorial/') && method === 'GET') {
    const id = pathname.split('/').at(-1);
    const item = state.editorial.find(entry => entry.id === id);
    if (!item) throw issue(404, 'Contenido no encontrado.');
    return item;
  }
  if (pathname === '/api/v1/cases' && method === 'GET') {
    const params = new URLSearchParams(query);
    const kind = params.get('kind');
    const q = (params.get('q') || '').trim().toLowerCase();
    const mine = params.get('mine') === 'true';
    const offset = Math.max(0, Number(params.get('offset') || 0));
    const limit = Math.max(1, Math.min(100, Number(params.get('limit') || 24)));
    let items = state.cases.filter(item => item.visibility !== 'hidden' || sessionUser?.role === 'ADMIN' || item.owner_id === sessionUser?.id);
    if (kind) items = items.filter(item => item.kind === kind);
    if (mine) {
      if (!sessionUser) throw issue(401, 'Inicia sesión para ver tus casos.');
      items = items.filter(item => item.owner_id === sessionUser.id);
    }
    if (q) {
      items = items.filter(item => JSON.stringify(normalizeCase(item, sessionUser)).toLowerCase().includes(q));
    }
    const page = items.slice(offset, offset + limit).map(item => normalizeCase(item, sessionUser));
    return { items: page, total: items.length, limit, offset };
  }
  if (pathname === '/api/v1/cases' && method === 'POST') {
    const user = requireUser();
    const body = parseBody();
    const caseId = body.id || `demo-${Math.random().toString(36).slice(2, 8)}`;
    if (!['lost','found','adoption'].includes(body.kind)) throw issue(400, 'Selecciona un tipo de caso válido.');
    const created = new Date().toISOString();
    const raw = {
      id: caseId,
      owner_id: user.id,
      kind: body.kind,
      state: body.kind === 'adoption' ? 'available' : 'open',
      visibility: 'visible',
      status: 'Publicado',
      created,
      body: JSON.stringify({
        id: caseId,
        name: body.name || 'Nueva publicación',
        species: body.species || 'Perro',
        city: body.city || 'Bogotá',
        zone: body.zone || 'Centro',
        description: body.description || '',
        breed: body.breed || '',
        sex: body.sex || '',
        size: body.size || '',
        age: body.age || '',
        color: body.color || '',
        traits: body.traits || '',
        image: body.image || '',
        photos: Array.isArray(body.photos) ? body.photos : [body.image].filter(Boolean),
      }),
    };
    state.cases.push(raw);
    saveDemoStore(state);
    return normalizeCase(raw, user);
  }
  const caseComments = pathname.match(/^\/api\/v1\/cases\/([^/]+)\/comments$/);
  if (caseComments && method === 'GET') {
    const caseId = decodeURIComponent(caseComments[1]);
    if (!state.cases.some(item => item.id === caseId)) throw issue(404, 'Caso no disponible para comentarios.');
    const items = state.comments
      .filter(comment => comment.case_id === caseId && (comment.status === 'visible' || (comment.status === 'hidden' && comment.author_id === sessionUser?.id)))
      .sort((left, right) => right.created.localeCompare(left.created))
      .map(commentResponse);
    return { items, hasMore: false, nextBefore: null };
  }
  if (caseComments && method === 'POST') {
    const user = requireUser();
    const caseId = decodeURIComponent(caseComments[1]);
    if (!state.cases.some(item => item.id === caseId)) throw issue(404, 'Caso no disponible para comentarios.');
    const body = parseBody();
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text || text.length > 1000) throw issue(400, 'Escribe entre 1 y 1000 caracteres.');
    const previous = state.comments.find(comment => comment.author_id === user.id && comment.clientId === body.clientId);
    if (previous) return commentResponse(previous);
    const now = new Date().toISOString();
    const comment = {
      id: 'demo-comment-' + Math.random().toString(36).slice(2, 10),
      case_id: caseId,
      author_id: user.id,
      clientId: body.clientId || '',
      text,
      status: 'visible',
      revision: 1,
      created: now,
      updated: now,
    };
    state.comments.push(comment);
    syncDemoCommentCounts(state);
    saveDemoStore(state);
    return commentResponse(comment);
  }
  const commentEdit = pathname.match(/^\/api\/v1\/comments\/([^/]+)$/);
  if (commentEdit && method === 'PATCH') {
    const user = requireUser();
    const comment = state.comments.find(item => item.id === decodeURIComponent(commentEdit[1]));
    if (!comment) throw issue(404, 'Comentario no encontrado.');
    if (comment.author_id !== user.id && user.role !== 'ADMIN') throw issue(403, 'Solo el autor puede modificar este comentario.');
    const body = parseBody();
    if (Number(body.revision) !== comment.revision) throw issue(409, 'El comentario cambió. Actualiza antes de continuar.');
    if (comment.status === 'deleted') throw issue(409, 'El comentario fue retirado y no puede recuperarse.');
    if (comment.author_id !== user.id) throw issue(403, 'Solo el autor puede modificar este comentario.');
    if (body.status === 'deleted') {
      comment.text = '';
      comment.status = 'deleted';
    } else {
      const text = typeof body.text === 'string' ? body.text.trim() : '';
      if (!text || text.length > 1000) throw issue(400, 'Escribe entre 1 y 1000 caracteres.');
      comment.text = text;
    }
    comment.revision++;
    comment.updated = new Date().toISOString();
    syncDemoCommentCounts(state);
    saveDemoStore(state);
    return commentResponse(comment);
  }
  const commentReport = pathname.match(/^\/api\/v1\/comments\/([^/]+)\/reports$/);
  if (commentReport && method === 'POST') {
    const user = requireUser();
    const comment = state.comments.find(item => item.id === decodeURIComponent(commentReport[1]) && item.status === 'visible');
    if (!comment || comment.author_id === user.id) throw issue(404, 'Comentario no disponible.');
    const body = parseBody();
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (reason.length < 10 || reason.length > 500) throw issue(400, 'Escribe un motivo de 10 a 500 caracteres.');
    const previous = state.commentReports.find(report => report.comment_id === comment.id && report.reporter_id === user.id);
    if (!previous) state.commentReports.push({
      id: 'demo-comment-report-' + Math.random().toString(36).slice(2, 10),
      comment_id: comment.id,
      reporter_id: user.id,
      reason,
      reportedRevision: comment.revision,
      status: 'pending',
      created: new Date().toISOString(),
    });
    saveDemoStore(state);
    return { message: 'Denuncia registrada. El equipo revisará el comentario.' };
  }
  if (pathname === '/api/v1/admin/comments' && method === 'GET') {
    const user = requireUser();
    if (user.role !== 'ADMIN') throw issue(403, 'Acceso administrativo restringido.');
    const params = new URLSearchParams(query);
    const status = params.get('status') || 'visible';
    const items = state.comments.filter(item => status === 'all' || item.status === status).map(comment => ({ ...commentResponse(comment), caseId: comment.case_id }));
    return { items, total: items.length, hasMore: false, nextBefore: null };
  }
  const adminComment = pathname.match(/^\/api\/v1\/admin\/comments\/([^/]+)$/);
  if (adminComment && method === 'PATCH') {
    const user = requireUser();
    if (user.role !== 'ADMIN') throw issue(403, 'Acceso administrativo restringido.');
    const comment = state.comments.find(item => item.id === decodeURIComponent(adminComment[1]));
    if (!comment) throw issue(404, 'Comentario no encontrado.');
    const body = parseBody();
    if (Number(body.revision) !== comment.revision) throw issue(409, 'El comentario cambió. Actualiza antes de continuar.');
    if (!['visible', 'hidden'].includes(body.status)) throw issue(400, 'Selecciona ocultar o restaurar.');
    comment.status = body.status;
    comment.revision++;
    comment.updated = new Date().toISOString();
    saveDemoStore(state);
    return { ok: true, ...commentResponse(comment) };
  }
  if (pathname === '/api/v1/admin/comment-reports' && method === 'GET') {
    const user = requireUser();
    if (user.role !== 'ADMIN') throw issue(403, 'Acceso administrativo restringido.');
    const params = new URLSearchParams(query);
    const status = params.get('status') || 'pending';
    const items = state.commentReports.filter(report => status === 'all' || report.status === status).map(report => {
      const comment = state.comments.find(item => item.id === report.comment_id);
      const reporter = state.users.find(item => item.id === report.reporter_id);
      return { ...report, commentId: report.comment_id, caseId: comment?.case_id || '', commentStatus: comment?.status || 'deleted', commentRevision: comment?.revision || 1, reportedRevision: report.reportedRevision, authorName: state.users.find(item => item.id === comment?.author_id)?.name || '', reporterName: reporter?.name || '', text: comment?.text || '' };
    });
    return { items, total: items.length, hasMore: false, nextBefore: null };
  }
  const adminCommentReport = pathname.match(/^\/api\/v1\/admin\/comment-reports\/([^/]+)$/);
  if (adminCommentReport && method === 'PATCH') {
    const user = requireUser();
    if (user.role !== 'ADMIN') throw issue(403, 'Acceso administrativo restringido.');
    const report = state.commentReports.find(item => item.id === decodeURIComponent(adminCommentReport[1]));
    if (!report) throw issue(404, 'Denuncia no encontrada.');
    const body = parseBody();
    const comment = state.comments.find(item => item.id === report.comment_id);
    if (Number(body.commentRevision) !== comment?.revision) throw issue(409, 'El comentario cambió. Actualiza antes de continuar.');
    if (!['hide', 'reviewed', 'dismissed'].includes(body.decision)) throw issue(400, 'Selecciona una decisión válida.');
    if (body.decision === 'hide') {
      comment.status = 'hidden';
      comment.revision++;
      comment.updated = new Date().toISOString();
      syncDemoCommentCounts(state);
    }
    report.status = body.decision === 'dismissed' ? 'dismissed' : 'reviewed';
    report.decision = body.decision;
    report.resolution = body.reason || '';
    report.resolvedAt = new Date().toISOString();
    report.resolverName = user.name;
    saveDemoStore(state);
    return { ok: true };
  }
  if (pathname.match(/^\/api\/v1\/cases\/[^/]+$/)) {
    const id = pathname.split('/').at(-1);
    const item = state.cases.find(entry => entry.id === id);
    if (!item) throw issue(404, 'Caso no encontrado.');
    if (method === 'GET') {
      const user = getSessionUser();
      if (item.visibility === 'hidden' && !(user && (user.role === 'ADMIN' || item.owner_id === user.id))) throw issue(404, 'Caso no encontrado.');
      return normalizeCase(item, user);
    }
    if (method === 'PATCH') {
      const user = requireUser();
      if (item.owner_id !== user.id && user.role !== 'ADMIN') throw issue(403, 'No puedes modificar este caso.');
      const body = parseBody();
      const next = { ...item };
      const existing = typeof item.body === 'string' ? JSON.parse(item.body) : item.body || {};
      const merged = { ...existing, ...body };
      if (body.state !== undefined) next.state = body.state;
      if (body.visibility !== undefined) next.visibility = body.visibility;
      if (body.reason !== undefined) next.moderationReason = body.reason;
      next.body = JSON.stringify(merged);
      Object.assign(item, next);
      saveDemoStore(state);
      return normalizeCase(item, user);
    }
  }
  if (pathname === '/api/v1/admin/summary' && method === 'GET') {
    const user = requireUser();
    if (user.role !== 'ADMIN') throw issue(403, 'Acceso administrativo restringido.');
    return {
      users: state.users.length,
      cases: state.cases.length,
      pending: state.reports.filter(item => item.status === 'pending').length,
      hidden: state.cases.filter(item => item.visibility === 'hidden').length,
    };
  }
  if (pathname === '/api/v1/admin/cases' && method === 'GET') {
    const user = requireUser();
    if (user.role !== 'ADMIN') throw issue(403, 'Acceso administrativo restringido.');
    const params = new URLSearchParams(query);
    const visibility = params.get('visibility') || 'all';
    const items = state.cases.filter(item => visibility === 'all' || (visibility === 'visible' ? item.visibility !== 'hidden' : item.visibility === 'hidden')).map(item => ({
      ...normalizeCase(item, user),
      visibility: item.visibility || 'visible',
      moderationReason: item.moderationReason || '',
    }));
    return { items, total: items.length, limit: items.length, offset: 0 };
  }
  if (pathname.startsWith('/api/v1/admin/cases/') && pathname.endsWith('/moderation') && method === 'PATCH') {
    const user = requireUser();
    if (user.role !== 'ADMIN') throw issue(403, 'Acceso administrativo restringido.');
    const id = pathname.split('/')[4];
    const item = state.cases.find(entry => entry.id === id);
    const body = parseBody();
    item.visibility = body.visibility === 'hidden' ? 'hidden' : 'visible';
    item.moderationReason = body.reason || 'Cambio moderado desde la demo';
    return { ok: true, item: normalizeCase(item, user) };
  }
  if (pathname === '/api/v1/admin/reports' && method === 'GET') {
    const user = requireUser();
    if (user.role !== 'ADMIN') throw issue(403, 'Acceso administrativo restringido.');
    return { items: state.reports, total: state.reports.length, limit: state.reports.length, offset: 0 };
  }
  if (pathname.startsWith('/api/v1/admin/reports/') && method === 'PATCH') {
    const user = requireUser();
    if (user.role !== 'ADMIN') throw issue(403, 'Acceso administrativo restringido.');
    const id = pathname.split('/').at(-1);
    const report = state.reports.find(item => item.id === id);
    const body = parseBody();
    if (report) report.status = body.status || report.status;
    const auditEntry = { id: 'audit-' + Math.random().toString(36).slice(2, 8), action: body.status || 'review_report', reason: body.reason || 'Decisión registrada en la demo', actorName: user.name, target_id: report?.case_id || id, created: new Date().toISOString() };
    state.audit.push(auditEntry);
    return { ok: true };
  }
  if (pathname === '/api/v1/admin/audit' && method === 'GET') {
    const user = requireUser();
    if (user.role !== 'ADMIN') throw issue(403, 'Acceso administrativo restringido.');
    return { items: state.audit, total: state.audit.length, limit: state.audit.length, offset: 0 };
  }
  if (pathname === '/api/v1/admin/mail' && method === 'GET') {
    const user = requireUser();
    if (user.role !== 'ADMIN') throw issue(403, 'Acceso administrativo restringido.');
    return { counts: [{ status: 'sent', total: 1 }], items: [] };
  }
  throw issue(404, 'Servicio no encontrado.');
}

export async function request(path, options = {}) {
  // Pages no dispone de backend: mantiene los recorridos de presentación en el navegador.
  // En otros entornos los errores HTTP se propagan; nunca se sustituyen por datos demo.
  const apiPath = normalizeApiPath(path);
  const method = (options.method || 'GET').toUpperCase();
  const location = globalThis.window?.location;
  if (location?.hostname?.endsWith('.github.io') || location?.protocol === 'file:') {
    return demoRequest(apiPath, options);
  }
  let response;
  try {
    response = await fetch(buildApiUrl(apiPath), {
      credentials: 'same-origin',
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      method,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw issue(0, 'No se pudo conectar con el servidor. Inténtalo de nuevo.');
  }
  if (response.status === 204) return null;
  let data;
  try { data = await response.json(); }
  catch { throw issue(response.status || 502, 'El servidor no devolvió datos válidos.'); }
  if (!response.ok) throw issue(response.status || 500, data?.error || 'La operación falló en el servidor.');
  return data;
}

export const api = {
  listCases: (params, options) => request('/cases?' + new URLSearchParams(params), options),
  getMatches: id => request('/cases/' + encodeURIComponent(id) + '/matches'),
  getPets: async kind => (await request('/cases?limit=100' + (kind ? '&kind=' + kind : ''))).items,
  getPet: async id => { try { return await request('/cases/' + encodeURIComponent(id)); } catch (error) { if (error.status === 404) return null; throw error; } },
  saveCase: (body, id) => request('/cases' + (id ? '/' + encodeURIComponent(id) : ''), { method: id ? 'PATCH' : 'POST', body: JSON.stringify(body) }),
  search: async q => (await request('/cases?limit=100&q=' + encodeURIComponent(q))).items,
  getPosts: async () => [],
  getVets: async () => (await request('/veterinaries')).items,
  getNotifications: async () => (await request('/notifications')).items,
  getTaxonomy: async () => taxonomy,
  getContentSchemas: async () => ({ speciesSchema, projectSchema, contentRelations }),
};
