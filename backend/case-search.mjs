// Comparaciones locales sobre campos existentes; no modifica el esquema.
export const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const fields = ['name','species','breed','color','city','zone','description','sex','size'];
const words = value => normalize(value).match(/[\p{L}\p{N}]+/gu) || [];
const unknown = new Set(['','otro','otra','desconocido','desconocida','no se sabe','sin especificar','no especificado','no aplica']);
const known = value => !unknown.has(normalize(value));
const same = (a,b) => known(a) && known(b) && normalize(a) === normalize(b);
const overlap = (a,b) => {
  if (!known(a) || !known(b)) return false;
  const left = new Set(words(a)), right = new Set(words(b));
  return [...left].some(word => word.length > 2 && right.has(word));
};
export function searchRank(body, query) {
  const data = typeof body === 'string' ? JSON.parse(body) : body;
  const tokens = normalize(query).split(' ').filter(Boolean);
  if (!tokens.length) return 0;
  const values = fields.map(field => normalize(data[field]));
  if (!tokens.every(token => values.some(value => value.includes(token)))) return 0;
  return tokens.reduce((sum,token) => sum + values.reduce((score,value,index) => score + (value.includes(token) ? (index < 6 ? 3 : 1) : 0),0),0);
}
export function installCaseSearch(db) {
  db.function('case_normalize',{deterministic:true},normalize);
  db.function('case_search_rank',{deterministic:true},searchRank);
}
export function searchConditions(params, now = Date.now()) {
  const where = [], args = [];
  const q = normalize(params.get('q')).slice(0,100);
  if (q) { where.push('case_search_rank(body,?)>0'); args.push(q); }
  for (const field of ['species','sex','size','color','city','zone']) {
    const value = normalize(params.get(field)).slice(0,120);
    if (!value) continue;
    const expression = `case_normalize(json_extract(body,'$.${field}'))`;
    if (['color','city','zone'].includes(field)) { where.push(`instr(${expression},?)>0`); args.push(value); }
    else { where.push(`${expression}=?`); args.push(value); }
  }
  if (['open','resolved'].includes(params.get('state'))) { where.push('state=?'); args.push(params.get('state')); }
  const period = params.get('period');
  if (['today','7','30'].includes(period)) {
    // Hoy corresponde al día civil en Colombia (UTC-5), no a la fecha del evento.
    const start = period === 'today' ? Math.floor((now-18000000)/86400000)*86400000+18000000 : now-Number(period)*86400000;
    where.push('created>=? AND created<=?'); args.push(new Date(start).toISOString(),new Date(now).toISOString());
  }
  const sort = params.get('sort');
  const order = sort === 'oldest' ? 'created ASC,id ASC' : sort === 'relevance' && q ? 'case_search_rank(body,?) DESC,created DESC,id DESC' : 'created DESC,id DESC';
  return {where,args,order:"CASE WHEN state IN ('open','available') THEN 0 ELSE 1 END,"+order,orderArgs:sort === 'relevance' && q ? [q] : []};
}

// Pesos editables. La puntuación no es una probabilidad de identidad.
export const MATCH_WEIGHTS = Object.freeze({species:20,breed:15,color:20,sex:5,size:5,city:10,zone:10,date:10,description:5});
export function calculateMatchScore(a,b) {
  const reasons = []; let score = 0, identifying = 0;
  const add = (field,label,identity=false) => {score += MATCH_WEIGHTS[field];reasons.push(label);if(identity)identifying++;};
  if (!['lost','found'].includes(a.kind) || b.kind !== (a.kind === 'lost' ? 'found' : 'lost') || a.state !== 'open' || b.state !== 'open' || !same(a.species,b.species)) return {score:0,reasons};
  if (['macho','hembra'].includes(normalize(a.sex)) && ['macho','hembra'].includes(normalize(b.sex)) && !same(a.sex,b.sex)) return {score:0,reasons};
  add('species','Misma especie');
  if (same(a.breed,b.breed)) add('breed','Misma raza indicada',true);
  if (overlap(a.color,b.color)) add('color','Color en común',true);
  else if (known(a.color) && known(b.color)) score -= 15;
  if (same(a.sex,b.sex)) add('sex','Mismo sexo indicado');
  if (same(a.size,b.size)) add('size','Mismo tamaño indicado');
  if (same(a.city,b.city)) {
    add('city','Misma ciudad');
    if (same(a.zone,b.zone)) add('zone','Misma zona indicada');
  } else if (known(a.city) && known(b.city)) score -= 10;
  const days = Math.abs(Date.parse(a.created)-Date.parse(b.created))/86400000;
  if (Number.isFinite(days) && days <= 7) add('date','Publicados con hasta 7 días de diferencia');
  else if (Number.isFinite(days) && days <= 30) {score += 5; reasons.push('Publicados con hasta 30 días de diferencia');}
  const stop = new Set(['perro','gato','gata','mascota','animal','perdido','perdida','encontrado','encontrada','tiene','esta','para','como','pero','desde','tambien']);
  const descriptionWords = value => new Set(words(value).filter(word => word.length >= 4 && !stop.has(word)));
  const left = descriptionWords(a.description), right = descriptionWords(b.description);
  if ([...left].filter(word => right.has(word)).length >= 2) add('description','Detalles de descripción en común',true);
  // Especie, lugar y fecha por sí solos no identifican suficientemente un animal.
  return {score:identifying && score >= 50 ? score : 0,reasons};
}
export function findMatches(db,source,publicClause) {
  if (!['lost','found'].includes(source.kind) || source.state !== 'open') return [];
  const a = {...JSON.parse(source.body),kind:source.kind,state:source.state,created:source.created};
  const best = [];
  const candidates = db.prepare(`SELECT * FROM cases WHERE kind=? AND state='open' AND ${publicClause} AND case_normalize(json_extract(body,'$.species'))=? ORDER BY created DESC,id DESC`);
  for (const row of candidates.iterate(source.kind === 'lost' ? 'found' : 'lost',normalize(a.species))) {
    const result = calculateMatchScore(a,{...JSON.parse(row.body),kind:row.kind,state:row.state,created:row.created});
    if (!result.score) continue;
    best.push({row,...result});best.sort((a,b)=>b.score-a.score || b.row.created.localeCompare(a.row.created) || b.row.id.localeCompare(a.row.id));
    if (best.length > 5) best.pop();
  }
  return best;
}
