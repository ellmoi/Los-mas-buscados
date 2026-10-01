// Persistencia exclusiva de la demo estática; no es la base SQLite del servidor.
// Las cuentas son ejemplos públicos. Ver docs/DESARROLLO.md antes de cambiar el esquema.
import { pets, vets, notifications } from './data/demo-data.js';

const STORAGE_KEY = 'buscados-demo-store-v1';
const SESSION_KEY = 'buscados-demo-session-v1';
const demoPassword = 'Demo-Buscados-2026!';

const clone = value => JSON.parse(JSON.stringify(value));
const readStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const writeStorage = value => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Silencioso: el navegador puede bloquear localStorage en modo privado.
  }
};
export function saveDemoStore(value) {
  writeStorage(value);
}
export function syncDemoCommentCounts(store) {
  for (const item of store.cases) {
    const body = typeof item.body === 'string' ? JSON.parse(item.body) : item.body || {};
    const visible = store.comments.filter(comment => comment.case_id === item.id && comment.status === 'visible');
    body.commentCount = visible.length;
    body.commentPreview = visible.slice(-2).map(comment => ({
      author: store.users.find(user => user.id === comment.author_id)?.name || 'Comunidad',
      text: comment.text,
    }));
    item.body = JSON.stringify(body);
    item.commentCount = body.commentCount;
  }
}

// Migración aditiva: completa ejemplos antiguos sin restaurar comentarios retirados.
function enrichDemo(store) {
  if (!store.activitySeedVersion) {
    const examples = [
      ['simba', 'Compartí su foto con los vecinos de Teusaquillo. Estamos pendientes.'],
      ['sin-nombre', 'Gracias por ponerlo a salvo. Compartimos el aviso para encontrar a su familia.'],
      ['bruno', 'Qué bonito. ¿Podemos conversar sobre sus paseos y cuidados?'],
    ];
    for (const [id, text] of examples) {
      if (store.cases.some(item => item.id === id)) store.comments.push({id: 'demo-activity-' + id, case_id: id, author_id: 'demo-reader', text, status: 'visible', revision: 1, created: new Date().toISOString()});
    }
    // Las fotos del catálogo se sirven desde el repositorio, sin depender de Unsplash.
    for (const item of store.cases) {
      if (!pets.some(pet => pet.id === item.id)) continue;
      const body = typeof item.body === 'string' ? JSON.parse(item.body) : item.body || {};
      if (!body.photos?.length || body.photos.every(url => url.includes('images.unsplash.com'))) {
        body.image = new URL('../assets/demo/' + item.id + '.jpg', import.meta.url).href;
        body.photos = [body.image];
        item.body = JSON.stringify(body);
      }
    }
    store.activitySeedVersion = 1;
  }
  syncDemoCommentCounts(store);
}
const readSession = () => {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
};
const writeSession = value => {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
  } catch {
    // Silencioso: el navegador puede bloquear sessionStorage en modo privado.
  }
};

function makeCaseSeed(raw, index) {
  const body = { ...raw };
  delete body.id;
  const created = new Date(Date.now() - index * 3600000).toISOString();
  const image = new URL('../assets/demo/' + raw.id + '.jpg', import.meta.url).href;
  const photos = Array.isArray(body.photos) ? body.photos : [image].filter(Boolean);
  return {
    id: raw.id,
    owner_id: 'demo-editor',
    kind: raw.kind,
    state: raw.kind === 'adoption' ? 'available' : 'open',
    visibility: 'visible',
    status: raw.status || '',
    created,
    body: JSON.stringify({ ...body, photos, image, commentCount: 0 }),
    moderationReason: '',
    reportCount: 0,
    commentCount: 0,
  };
}

export function ensureDemoStore() {
  const existing = readStorage();
  if (existing) {
    existing.comments ||= [
      { id: 'demo-comment-1', case_id: 'luna', author_id: 'demo-reader', text: 'La vi por el parque de los Hippies esta mañana. Voy a compartir el aviso con los vecinos.', status: 'visible', revision: 1, created: new Date(Date.now() - 5400000).toISOString() },
      { id: 'demo-comment-2', case_id: 'luna', author_id: 'demo-editor', text: 'Gracias por ayudar. Si tienes un avistamiento, escríbenos por el contacto privado.', status: 'visible', revision: 1, created: new Date(Date.now() - 3600000).toISOString() },
      { id: 'demo-comment-3', case_id: 'mora', author_id: 'demo-reader', text: '¿Mora convive bien con otros gatos? Me gustaría conocer el proceso de adopción.', status: 'visible', revision: 1, created: new Date(Date.now() - 1800000).toISOString() },
    ];
    existing.commentReports ||= [];
    enrichDemo(existing);
    writeStorage(existing);
    return existing;
  }

  const users = [
    { id: 'demo-editor', name: 'Equipo Buscados · Demo', email: 'demo@buscados.example', password: demoPassword, role: 'ADMIN' },
    { id: 'demo-reader', name: 'Ana · Demo', email: 'ana@buscados.example', password: demoPassword, role: 'USER' },
  ];

  const cases = pets.map((pet, index) => makeCaseSeed({ ...pet, image: pet.image }, index));
  const conversations = [
    {
      id: 'demo-conversation-luna',
      case_id: 'luna',
      owner_id: 'demo-editor',
      visitor_id: 'demo-reader',
      created: new Date(Date.now() - 1800000).toISOString(),
      messages: [
        { id: 'msg-1', text: 'Vi una perrita parecida cerca del parque. ¿Podemos comparar sus marcas?', sender_id: 'demo-reader', created: new Date(Date.now() - 1800000).toISOString() },
        { id: 'msg-2', text: 'Gracias por escribir. Te comparto los detalles por aquí.', sender_id: 'demo-editor', created: new Date(Date.now() - 1200000).toISOString() },
        { id: 'msg-3', text: 'Voy a revisar las fotos. Ojalá pronto esté de vuelta en casa.', sender_id: 'demo-reader', created: new Date(Date.now() - 600000).toISOString() },
      ],
    },
    {
      id: 'demo-conversation-mora',
      case_id: 'mora',
      owner_id: 'demo-editor',
      visitor_id: 'demo-reader',
      created: new Date(Date.now() - 7200000).toISOString(),
      messages: [
        { id: 'msg-4', text: 'Mora se ve muy tranquila. Me gustaría conocerla.', sender_id: 'demo-reader', created: new Date(Date.now() - 7200000).toISOString() },
        { id: 'msg-5', text: 'Gracias por tu interés. Podemos hablar de sus rutinas y del proceso de adopción.', sender_id: 'demo-editor', created: new Date(Date.now() - 1800000).toISOString() },
      ],
    },
  ];

  const reports = [
    {
      id: 'report-1',
      case_id: 'luna',
      caseName: 'Luna',
      reason: 'El collar que aparece en la foto parece ser del caso original y necesitamos verificar si la información fue publicada por una persona distinta.',
      created: new Date(Date.now() - 86400000).toISOString(),
      status: 'pending',
      reporterName: 'Camila',
    },
  ];

  const audit = [
    {
      id: 'audit-1',
      action: 'review_report',
      reason: 'Se revisó un posible caso duplicado y se mantienen los datos públicos.',
      actorName: 'Equipo Buscados · Demo',
      target_id: 'luna',
      created: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  const state = {
    users,
    cases,
    comments: [
      { id: 'demo-comment-1', case_id: 'luna', author_id: 'demo-reader', text: 'La vi por el parque de los Hippies esta mañana. Voy a compartir el aviso con los vecinos.', status: 'visible', revision: 1, created: new Date(Date.now() - 5400000).toISOString() },
      { id: 'demo-comment-2', case_id: 'luna', author_id: 'demo-editor', text: 'Gracias por ayudar. Si tienes un avistamiento, escríbenos por el contacto privado.', status: 'visible', revision: 1, created: new Date(Date.now() - 3600000).toISOString() },
      { id: 'demo-comment-3', case_id: 'mora', author_id: 'demo-reader', text: '¿Mora convive bien con otros gatos? Me gustaría conocer el proceso de adopción.', status: 'visible', revision: 1, created: new Date(Date.now() - 1800000).toISOString() },
    ],
    commentReports: [],
    conversations,
    reports,
    audit,
    notifications: notifications.map((item, index) => ({ ...item, id: 'notif-' + index, user_id: 'demo-reader', read: index > 1 })),
    editorial: [
      {
        id: 'demo-guide',
        kind: 'article',
        title: 'Una comunidad que se acompaña',
        summary: 'Así puede verse una guía de la comunidad.',
        text: 'Una fotografía, una descripción y una conversación pueden reunir a una familia.',
        status: 'published',
        created: new Date(Date.now() - 259200000).toISOString(),
      },
      {
        id: 'demo-project',
        kind: 'project',
        title: 'Historias de vuelta a casa',
        summary: 'Un espacio para documentar el trabajo de Buscados.',
        text: 'Aquí podrás contar el propósito del proyecto, sus actividades y los resultados documentados.',
        status: 'published',
        created: new Date(Date.now() - 432000000).toISOString(),
      },
    ],
    vets: clone(vets).map((vet, index) => ({
      id: 'demo-vet-' + index,
      ...vet,
      status: 'published',
      sourceUrl: 'https://example.com',
      city: 'Bogotá',
      verified_on: new Date(Date.now() - 86400000).toISOString(),
      created: new Date(Date.now() - 86400000).toISOString(),
    })),
  };

  enrichDemo(state);
  writeStorage(state);
  return state;
}

export function getDemoStore() {
  return ensureDemoStore();
}

export function getSessionUser() {
  const session = readSession();
  if (!session?.userId) return null;
  const store = getDemoStore();
  return store.users.find(user => user.id === session.userId) || null;
}

export function setSessionUser(user) {
  writeSession({ userId: user.id });
}

export function clearSessionUser() {
  writeSession(null);
}

export function publicUser(user) {
  return user ? { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: true } : null;
}

export function parseJsonBody(options) {
  if (!options?.body) return {};
  try {
    return JSON.parse(options.body);
  } catch {
    return {};
  }
}

export function normalizeCase(row, user = null) {
  const body = typeof row.body === 'string' ? JSON.parse(row.body) : row.body || {};
  const photos = Array.isArray(body.photos) ? body.photos : Array.isArray(row.photos) ? row.photos : [body.image || row.image].filter(Boolean);
  const visibility = row.visibility || 'visible';
  const kind = row.kind || body.kind || 'lost';
  const state = row.state || body.state || (kind === 'adoption' ? 'available' : 'open');
  const status = row.status || (kind === 'adoption'
    ? (state === 'available' ? 'Disponible para adopción' : state === 'paused' ? 'Adopción pausada' : 'Adoptado')
    : state === 'resolved' ? 'Resuelto' : kind === 'lost' ? 'Perdido' : 'Encontrado');
  return {
    ...body,
    id: row.id,
    kind,
    state,
    status,
    visibility,
    moderationReason: row.moderationReason || body.moderationReason || '',
    commentCount: body.commentCount || row.commentCount || 0,
    time: row.created ? new Date(row.created).toLocaleDateString('es-CO') : body.time || '',
    photos,
    image: photos[0] || body.image || '',
    canEdit: !!user && (user.id === row.owner_id || user.role === 'ADMIN'),
    isOwner: !!user && user.id === row.owner_id,
    owner_id: row.owner_id,
    city: body.city || '',
    zone: body.zone || '',
    species: body.species || '',
    description: body.description || '',
    name: body.name || '',
  };
}

export function nextCaseId() {
  const store = getDemoStore();
  return 'demo-' + (Math.random().toString(36).slice(2, 9));
}

export function sendJsonResponse(payload) {
  return payload;
}

export function getDemoPassword() {
  return demoPassword;
}
