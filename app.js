'use strict';
/* Brote · seguimiento de hábitos.
   Todo vive en el teléfono: IndexedDB como almacenamiento principal y localStorage como copia. */

const VERSION = '1.0.0';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clone = o => JSON.parse(JSON.stringify(o));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pad = n => String(n).padStart(2, '0');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const DAY = 864e5;
const inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();

/* ---------- Fechas: claves 'AAAA-MM-DD' en hora local ---------- */
const dk = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pk = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const todayK = () => dk(new Date());
const addK = (k, n) => { const d = pk(k); d.setDate(d.getDate() + n); return dk(d); };
const dowK = k => (pk(k).getDay() + 6) % 7;
const weekK = k => addK(k, -dowK(k));
const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DOW_LONG = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const ALL = [0, 1, 2, 3, 4, 5, 6];
const fmtLong = k => cap(pk(k).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }));
const fmtShort = k => pk(k).toLocaleDateString('es', { day: 'numeric', month: 'short' }).replace('.', '');
const fmtClock = t => new Date(t).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
function dayName(k) {
  const t = todayK();
  if (k === t) return 'Hoy';
  if (k === addK(t, -1)) return 'Ayer';
  return cap(DOW_LONG[dowK(k)]);
}
function daysText(days) {
  if (days.length === 7) return 'Todos los días';
  if (days.join() === '0,1,2,3,4') return 'De lunes a viernes';
  if (days.join() === '5,6') return 'Fines de semana';
  return days.map(d => DOW_LONG[d].slice(0, 3)).join(', ');
}

/* ---------- Horas ---------- */
const toMin = s => { const [h, m] = String(s).split(':').map(Number); return h * 60 + m; };
const fromMin = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
const wrap = d => ((((d + 720) % 1440) + 1440) % 1440) - 720;
const fmtMins = m => { m = Math.round(Math.abs(m)); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`; };

/* ---------- Iconos ---------- */
const ICONS = {
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  calendar: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4',
  chart: 'M4 4v16h16M8 16v-4M12 16V8M16 16v-6',
  sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5a2 2 0 1 0 0 4a2 2 0 1 0 0-4M9 15a2 2 0 1 0 0 4a2 2 0 1 0 0-4',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  x: 'M6 6l12 12M18 6L6 18',
  left: 'M15 6l-6 6 6 6',
  right: 'M9 6l6 6-6 6',
  down: 'M6 9l6 6 6-6',
  pencil: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  archive: 'M3 4h18v4H3zM5 8v12h14V8M10 12h4',
  restore: 'M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  flame: 'M12 3c.5 3.5 5 5.5 5 10.5a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 1.6 1 2.6 2 3 0-3-.5-5.5.5-8.5z',
  repeat: 'M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4',
  counter: 'M4 6h16v12H4zM9 12h6M12 9v6',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 16V5M7 10l5-5 5 5M5 20h14',
  share: 'M12 15V3M7 8l5-5 5 5M5 12v8h14v-8',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  sprout: 'M12 21v-9M12 12c0-4 3-7 8-7 0 5-3 7-8 7zM12 15c0-3-2.5-5.5-7-5.5 0 4 2.5 5.5 7 5.5z',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  copy: 'M8 8h12v12H8zM4 16V4h12',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n]}"/></svg>`;

/* ---------- Catálogos ---------- */
const TYPES = {
  check: { n: 'Diario', d: 'Sí o no, en los días que elijas', ic: 'check' },
  weekly: { n: 'Veces por semana', d: 'Suma uno cada vez hasta tu meta semanal', ic: 'repeat' },
  count: { n: 'Cantidad diaria', d: 'Cuenta vasos, páginas, minutos…', ic: 'counter' },
  time: { n: 'Hora objetivo', d: 'Anotas a qué hora lo hiciste y te evalúa', ic: 'clock' },
};
const MODES = { max: 'No más tarde de', min: 'No más temprano de', near: 'Lo más cerca posible de' };
const MODES_SHORT = { max: 'antes de las', min: 'después de las', near: 'cerca de las' };
const TOLS = [0, 5, 10, 15, 20, 30, 45, 60];
const COLORS = ['#22a55b', '#2f7cf6', '#f08c2e', '#e5484d', '#8b5cf6', '#14b3a3', '#d9a514', '#ec5fa3'];
const EMOJIS = ['💧', '💪', '📖', '🛌', '🧘', '🏃', '🚶', '🍎', '🥗', '🦷', '💊', '✍️', '📝', '🎸', '🎨', '🧠', '📚', '🌱', '☀️', '🌙', '⏰', '😴', '📵', '🚭', '🍷', '☕', '🍫', '🥤', '🧹', '💰', '🙏', '❤️', '🐶', '🌳', '🎯', '🏋️', '🚴', '🏊', '🧴', '✅'];
const LOG_KINDS = { habito: 'Hábitos', registro: 'Registros', logro: 'Logros', datos: 'Datos', ajustes: 'Ajustes' };
const DAY_MS = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365];
const WEEK_MS = [2, 4, 8, 12, 26, 52];
const PHRASES = [
  'Los hábitos pequeños, repetidos, hacen cambios grandes.',
  'No tienes que ser perfecto, solo constante.',
  'Hoy cuenta más que el día perfecto que nunca llega.',
  'Cada vez que cumples, te pareces un poco más a quien quieres ser.',
  'Si hoy cuesta, hazlo en versión mini. Dos minutos también cuentan.',
  'La motivación te hace empezar; el hábito te hace seguir.',
  'Fallar un día es humano. Lo importante es no fallar dos seguidos.',
  'Lo que haces todos los días importa más que lo que haces de vez en cuando.',
  'Un poco mejor cada día se nota muchísimo en un año.',
  'Tu yo de mañana te va a agradecer lo de hoy.',
  'Empieza fácil. La constancia viene antes que la intensidad.',
  'No rompas la cadena.',
  'Celebra lo que cumples, no solo lo que te falta.',
  'Progreso, no perfección.',
  'Un mal día no borra una buena semana.',
  'Lo difícil es empezar. Después, el hábito te lleva.',
];

/* ---------- Estado inicial ---------- */
function newHabit(over) {
  return { id: uid(), name: '', emoji: '🌱', color: COLORS[0], type: 'check', days: ALL.slice(), weekly: 3, goal: 8, unit: '', target: '23:00', mode: 'max', tol: 15, why: '', start: todayK(), created: Date.now(), archivedAt: null, ...over };
}
function seedHabits() {
  return [
    newHabit({ name: 'Beber agua', emoji: '💧', color: '#2f7cf6', type: 'count', goal: 8, unit: 'vasos', why: 'Más energía y mejor concentración.' }),
    newHabit({ name: 'Hacer ejercicio', emoji: '💪', color: '#f08c2e', type: 'weekly', weekly: 3, why: 'Sentirme fuerte y con buena salud.' }),
    newHabit({ name: 'Acostarme temprano', emoji: '🛌', color: '#14b3a3', type: 'time', target: '23:00', mode: 'max', tol: 15, why: 'Dormir bien cambia todo el día siguiente.' }),
    newHabit({ name: 'Leer 10 minutos', emoji: '📖', color: '#8b5cf6', type: 'check', why: 'Aprender algo nuevo cada día.' }),
    newHabit({ name: 'Meditar', emoji: '🧘', color: '#22a55b', type: 'check', days: [0, 1, 2, 3, 4], why: 'Bajar el estrés y pensar con calma.' }),
  ];
}
function freshState() {
  return {
    v: 1, savedAt: 0, created: Date.now(),
    settings: { theme: 'auto', motivate: true, celebrate: true, lastBackup: 0, installHidden: false, welcomeHidden: false },
    habits: seedHabits(), entries: {}, milestones: {}, log: [],
  };
}
function normalize(st) {
  const base = freshState();
  if (!st || typeof st !== 'object') return base;
  const out = { ...base, ...st };
  delete out.app; delete out.exported; delete out.version;
  out.settings = { ...base.settings, ...(st.settings || {}) };
  if (!Array.isArray(out.habits)) out.habits = base.habits;
  if (!Array.isArray(out.log)) out.log = [];
  for (const k of ['entries', 'milestones']) if (!out[k] || typeof out[k] !== 'object' || Array.isArray(out[k])) out[k] = {};
  out.habits = out.habits.map(h => newHabit({ ...h }));
  return out;
}

/* ---------- Almacenamiento ---------- */
const DB = {
  idb: null,
  async init() {
    try {
      this.idb = await new Promise((res, rej) => {
        const r = indexedDB.open('brote', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
        r.onblocked = () => rej(new Error('blocked'));
      });
    } catch (e) { this.idb = null; }
  },
  idbGet(k) {
    if (!this.idb) return Promise.resolve(null);
    return new Promise(res => {
      try { const r = this.idb.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => res(r.result ?? null); r.onerror = () => res(null); }
      catch (e) { res(null); }
    });
  },
  idbSet(k, v) {
    if (!this.idb) return Promise.resolve(false);
    return new Promise(res => {
      try {
        const tx = this.idb.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(v, k);
        tx.oncomplete = () => res(true); tx.onerror = () => res(false); tx.onabort = () => res(false);
      } catch (e) { res(false); }
    });
  },
  lsGet(k) { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
  lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  async load() {
    const a = await this.idbGet('state'), b = this.lsGet('brote.state');
    if (a && b) return (b.savedAt || 0) > (a.savedAt || 0) ? b : a;
    return a || b;
  },
  async save(st) {
    st.savedAt = Date.now();
    const snap = clone(st);
    // localStorage primero: es síncrono y sobrevive aunque iOS cierre la app justo después.
    const ok2 = this.lsSet('brote.state', snap);
    const ok1 = await this.idbSet('state', snap);
    return ok1 || ok2;
  },
};

let S = null;
let saveTimer = null, saveFailed = false, persisted = false;
function persist(now) {
  clearTimeout(saveTimer);
  if (now) return flush();
  saveTimer = setTimeout(flush, 150);
}
async function flush() {
  clearTimeout(saveTimer); saveTimer = null;
  if (!S) return;
  const ok = await DB.save(S);
  if (!ok && !saveFailed) toast('No se pudo guardar en el teléfono. Exporta un respaldo desde Ajustes.', 'bad');
  saveFailed = !ok;
}
function logEv(k, m, merge) {
  const last = S.log[S.log.length - 1];
  if (merge && last && last.merge === merge && Date.now() - last.t < 120000) { last.m = m; last.t = Date.now(); return; }
  S.log.push({ t: Date.now(), k, m, ...(merge ? { merge } : {}) });
  if (S.log.length > 5000) S.log.splice(0, S.log.length - 5000);
}

/* ---------- Puntuación ---------- */
const habitById = id => S.habits.find(h => h.id === id);
const activeHabits = () => S.habits.filter(h => !h.archivedAt);
const getV = (h, k) => (S.entries[k] || {})[h.id];
const counted = (h, k) => k >= h.start && (!h.archivedAt || k < h.archivedAt);
const isSched = (h, k) => h.type !== 'weekly' && h.days.includes(dowK(k));
function setVal(h, k, v) {
  const day = S.entries[k] || (S.entries[k] = {});
  if (v == null || v === 0 || v === false || v === '') delete day[h.id];
  else day[h.id] = v;
  if (!Object.keys(day).length) delete S.entries[k];
  if (v && k < h.start) h.start = k;
}
function timeEval(h, v) {
  const diff = wrap(toMin(v) - toMin(h.target));
  const off = h.mode === 'max' ? diff : h.mode === 'min' ? -diff : Math.abs(diff);
  const score = off <= h.tol ? 1 : Math.max(0, 1 - (off - h.tol) / 120);
  const txt = diff === 0 ? 'justo a la hora' : `${fmtMins(diff)} ${diff > 0 ? 'más tarde' : 'antes'}`;
  return { diff, score, txt, label: evalLabel(score) };
}
const evalLabel = s => (s >= 1 ? 'Perfecto' : s >= 0.75 ? 'Bien' : s >= 0.4 ? 'Regular' : s > 0 ? 'Lejos' : 'Muy lejos');
// Puntaje del hábito en un día (0 a 1), sin mirar desde cuándo existe. null = ese día no aplica.
function scoreRaw(h, k) {
  const v = getV(h, k);
  if (h.type === 'weekly') return v ? 1 : null;
  if (!isSched(h, k)) return null;
  if (h.type === 'check') return v ? 1 : 0;
  if (h.type === 'count') return Math.min(1, (v || 0) / h.goal);
  return v ? timeEval(h, v).score : 0;
}
const score = (h, k) => (counted(h, k) ? scoreRaw(h, k) : null);
function dayScore(k, only) {
  const t = todayK();
  if (k > t) return null;
  if (k === t && !S.entries[t]) return null;
  const list = only ? [only] : S.habits;
  const sc = list.map(h => score(h, k)).filter(x => x != null);
  return sc.length ? sc.reduce((a, b) => a + b, 0) / sc.length : null;
}
function countWeek(h, ws) {
  let n = 0;
  for (let i = 0; i < 7; i++) if (getV(h, addK(ws, i))) n++;
  return n;
}
function streak(h) {
  const t = todayK();
  if (h.type === 'weekly') {
    let w = weekK(t);
    if (countWeek(h, w) < h.weekly) w = addK(w, -7);
    let n = 0;
    while (w >= weekK(h.start) && countWeek(h, w) >= h.weekly) { n++; w = addK(w, -7); }
    return n;
  }
  let k = t, n = 0;
  if (!((score(h, k) ?? 0) >= 0.75)) k = addK(k, -1);
  while (k >= h.start) {
    const s = score(h, k);
    if (s == null) { k = addK(k, -1); continue; }
    if (s >= 0.75) { n++; k = addK(k, -1); } else break;
  }
  return n;
}
function bestStreak(h) {
  const t = todayK();
  let best = 0, cur = 0;
  if (h.type === 'weekly') {
    for (let w = weekK(h.start); w <= weekK(t); w = addK(w, 7)) {
      if (countWeek(h, w) >= h.weekly) best = Math.max(best, ++cur); else if (w < weekK(t)) cur = 0;
    }
    return best;
  }
  for (let k = h.start; k <= t; k = addK(k, 1)) {
    const s = score(h, k);
    if (s == null) continue;
    if (s >= 0.75) best = Math.max(best, ++cur); else if (k < t) cur = 0;
  }
  return best;
}
// Cumplimiento (0 a 1) en los últimos `days` días; null si aún no hay datos.
function compliance(h, days = 30) {
  const t = todayK();
  const from = days ? [h.start, addK(t, -(days - 1))].sort().pop() : h.start;
  const vals = [];
  if (h.type === 'weekly') {
    for (let w = weekK(from); w <= weekK(t); w = addK(w, 7)) {
      const c = countWeek(h, w);
      if (w < weekK(t) || c >= h.weekly) vals.push(Math.min(1, c / h.weekly));
    }
  } else {
    for (let k = from; k <= t; k = addK(k, 1)) {
      const s = score(h, k);
      if (s == null || (k === t && getV(h, k) == null)) continue;
      vals.push(s);
    }
  }
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}
function overall(days) {
  const t = todayK(), vals = [];
  for (let i = 0; i < days; i++) { const s = dayScore(addK(t, -i)); if (s != null) vals.push(s); }
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}
const pct = s => (s == null ? '—' : Math.round(s * 100) + '%');
// Rojo (falló) → ámbar → verde (cumplió)
const heat = s => `hsl(${Math.round(4 + clamp(s, 0, 1) * 128)}, 66%, ${s > 0.35 && s < 0.7 ? 46 : 48}%)`;
const heatInk = s => (s > 0.32 && s < 0.68 ? '#211a05' : '#fff');

/* ---------- Motivación ---------- */
function phraseOfDay() {
  const n = Math.floor(pk(todayK()).getTime() / DAY);
  return PHRASES[((n % PHRASES.length) + PHRASES.length) % PHRASES.length];
}
function motivation() {
  const t = todayK(), y = addK(t, -1);
  const hs = activeHabits();
  if (!hs.length) return null;
  const daily = hs.filter(h => isSched(h, t));
  const done = daily.filter(h => (scoreRaw(h, t) ?? 0) >= 1);
  const now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
  if (daily.length && done.length === daily.length) {
    const weeklyLeft = hs.filter(h => h.type === 'weekly' && countWeek(h, weekK(t)) < h.weekly);
    return { tone: 'good', title: '¡Día completo!', text: weeklyLeft.length ? `Cumpliste todo lo de hoy. Si te animas, suma uno a «${weeklyLeft[0].name}».` : 'Cumpliste todo lo de hoy. Así se construye una racha.' };
  }
  for (const h of daily) {
    if (h.type !== 'time' || getV(h, t) || h.mode !== 'max') continue;
    const left = wrap(toMin(h.target) - nowMin);
    if (left > 0 && left <= 90) return { tone: 'info', title: `Quedan ${fmtMins(left)}`, text: `${h.emoji} ${h.name}: tu meta es ${MODES_SHORT[h.mode]} ${h.target}.` };
  }
  const missed = hs.find(h => isSched(h, y) && counted(h, y) && (score(h, y) ?? 1) < 0.75 && (scoreRaw(h, t) ?? 0) < 1 && isSched(h, t));
  if (missed) return { tone: 'warn', title: 'Que no sean dos días seguidos', text: `Ayer se te pasó «${missed.name}». Hoy es el día perfecto para retomarlo.${missed.why ? ` Recuerda: ${missed.why}` : ''}` };
  const atRisk = daily.filter(h => (scoreRaw(h, t) ?? 0) < 1).map(h => ({ h, s: streak(h) })).filter(x => x.s >= 2).sort((a, b) => b.s - a.s)[0];
  if (atRisk) return { tone: 'streak', title: `${atRisk.s} días seguidos con «${atRisk.h.name}»`, text: 'No cortes la racha hoy. Vas muy bien.' };
  const daysLeft = 7 - dowK(t);
  const behind = hs.filter(h => h.type === 'weekly').map(h => ({ h, left: h.weekly - countWeek(h, weekK(t)) })).find(x => x.left > 0 && x.left >= daysLeft - 1);
  if (behind) return { tone: 'warn', title: `Te ${behind.left === 1 ? 'falta' : 'faltan'} ${behind.left} de «${behind.h.name}»`, text: `Quedan ${plural(daysLeft, 'día', 'días')} esta semana. ¡Todavía llegas!` };
  if (!done.length && daily.length) {
    const easiest = daily.map(h => ({ h, c: compliance(h, 30) ?? 0 })).sort((a, b) => b.c - a.c)[0].h;
    return { tone: 'info', title: nowMin < 720 ? 'Buen día para empezar' : 'Todavía hay tiempo', text: `Empieza por «${easiest.name}». Lo pequeño también cuenta.` };
  }
  if (daily.length) return { tone: 'info', title: `Llevas ${done.length} de ${daily.length}`, text: done.length / daily.length >= 0.5 ? 'Más de la mitad. ¡Sigue así!' : 'Cada hábito cumplido suma. Vamos por el siguiente.' };
  return { tone: 'info', title: 'Día libre de hábitos diarios', text: 'Aprovecha para sumar a tus metas semanales.' };
}

/* ---------- UI: utilidades ---------- */
const ui = { tab: 'today', view: null, edit: null, day: null, weekOf: null, cal: null, calHabit: 'all', showOff: false };

function toast(msg, kind = '') {
  const box = $('#toasts');
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.innerHTML = (kind === 'good' ? ic('check') : kind === 'star' ? ic('star') : '') + `<span>${esc(msg)}</span>`;
  box.appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, kind === 'star' ? 3800 : 2600);
}
const layers = [];
function openSheet(html, { acts = {}, onClose, center = false } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'layer' + (center ? ' layer-center' : '');
  wrap.innerHTML = `<div class="backdrop" data-act="close-layer"></div><div class="sheet${center ? ' dialog' : ''}" role="dialog" aria-modal="true">${center ? '' : '<div class="grab" aria-hidden="true"></div>'}<div class="sheet-body">${html}</div></div>`;
  wrap._acts = acts; wrap._onClose = onClose;
  document.body.appendChild(wrap);
  layers.push(wrap);
  requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('open')));
  document.body.classList.add('locked');
  return wrap;
}
function closeLayer(wrap = layers[layers.length - 1]) {
  if (!wrap || wrap._closing) return;
  wrap._closing = true;
  const i = layers.indexOf(wrap);
  if (i >= 0) layers.splice(i, 1);
  wrap.classList.remove('open');
  setTimeout(() => wrap.remove(), 240);
  if (!layers.length) document.body.classList.remove('locked');
  if (wrap._onClose) wrap._onClose();
}
const setSheet = (wrap, html) => { $('.sheet-body', wrap).innerHTML = html; };
function confirmBox({ title, text = '', ok = 'Aceptar', cancel = 'Cancelar', danger = false }) {
  return new Promise(res => {
    openSheet(`<h3 class="dlg-title">${esc(title)}</h3>${text ? `<p class="dlg-text">${esc(text)}</p>` : ''}
      <div class="dlg-btns"><button class="btn btn-soft" data-act="no">${esc(cancel)}</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="yes">${esc(ok)}</button></div>`, {
      center: true,
      acts: { yes: (el, e, l) => { res(true); closeLayer(l); }, no: (el, e, l) => { res(false); closeLayer(l); } },
      onClose: () => res(false),
    });
  });
}
const menuItem = (act, icon, label, danger) => `<button class="menu-item${danger ? ' danger' : ''}" data-act="${act}">${ic(icon)}<span>${label}</span></button>`;
const haptic = (p = 10) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* no soportado */ } };
const bubble = (h, cls = '') => `<span class="emo ${cls}" style="--c:${esc(h.color)}">${esc(h.emoji)}</span>`;

/* Confeti para celebrar */
function confetti(colors) {
  if (!S.settings.celebrate || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  const c = document.createElement('canvas');
  c.className = 'confetti';
  document.body.appendChild(c);
  const dpr = window.devicePixelRatio || 1, W = innerWidth, H = innerHeight;
  c.width = W * dpr; c.height = H * dpr;
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  const pal = colors && colors.length ? colors : COLORS;
  const parts = Array.from({ length: 140 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * 60, y: H * 0.32, vx: (Math.random() - 0.5) * 13, vy: -Math.random() * 13 - 4,
    w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: pal[Math.floor(Math.random() * pal.length)],
  }));
  const t0 = performance.now();
  (function frame(t) {
    const el = t - t0;
    g.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.38; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.max(0, 1 - el / 2200);
      g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore();
    }
    if (el < 2200) requestAnimationFrame(frame); else c.remove();
  })(t0);
}
function milestone(h, n, list, unit) {
  if (!list.includes(n)) return;
  const key = `${h.id}:${unit}:${n}`;
  if (S.milestones[key]) return;
  S.milestones[key] = Date.now();
  confetti([h.color, '#ffd166', '#ffffff']);
  const msg = `¡${n} ${unit} seguid${unit === 'días' ? 'os' : 'as'} con «${h.name}»!`;
  toast(msg, 'star');
  logEv('logro', msg);
}
function afterChange(h, k, before) {
  const t = todayK();
  if (k < addK(t, -1)) return;
  const s = scoreRaw(h, k);
  if (h.type === 'weekly') {
    const c = countWeek(h, weekK(k));
    if (getV(h, k) && c === h.weekly) {
      const key = `${h.id}:semana:${weekK(k)}`;
      if (!S.milestones[key]) { S.milestones[key] = Date.now(); confetti([h.color, '#ffd166']); toast(`¡Meta semanal cumplida! «${h.name}»: ${c} de ${h.weekly}`, 'star'); logEv('logro', `Meta semanal cumplida: ${h.name}`); }
    }
    milestone(h, streak(h), WEEK_MS, 'semanas');
  } else if ((s ?? 0) >= 0.75 && !((before ?? 0) >= 0.75)) {
    milestone(h, streak(h), DAY_MS, 'días');
  }
  const daily = activeHabits().filter(x => isSched(x, k));
  if (daily.length && daily.every(x => (scoreRaw(x, k) ?? 0) >= 1)) {
    const key = 'dia:' + k;
    if (!S.milestones[key]) {
      S.milestones[key] = Date.now();
      confetti(daily.map(x => x.color));
      toast(k === t ? '¡Día perfecto! Cumpliste todos tus hábitos.' : `¡${dayName(k)} quedó perfecto!`, 'good');
      logEv('logro', `Día perfecto: ${fmtLong(k)}`);
    }
  }
}

/* ---------- Gráficos ---------- */
function niceTicks(min, max, count = 4) {
  if (min === max) { min -= 1; max += 1; }
  const step0 = (max - min) / count, mag = 10 ** Math.floor(Math.log10(step0)), f = step0 / mag;
  const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, t = [];
  for (let v = lo; v <= hi + step / 2; v += step) t.push(+v.toFixed(6));
  return t;
}
function dayBars(keys, getS, { h = 120, label = '' } = {}) {
  const W = 340, H = h, L = 30, R = 6, T = 8, B = 20, bw = (W - L - R) / keys.length;
  const Y = v => T + (1 - v) * (H - T - B);
  const grid = [0, 0.5, 1].map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="c-grid"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" class="c-lab">${v * 100}%</text>`).join('');
  const bars = keys.map((k, i) => {
    const s = getS(k), x = L + i * bw + bw * 0.16, w = bw * 0.68;
    const lab = i === 0 || i === keys.length - 1 || dowK(k) === 0 ? `<text x="${x + w / 2}" y="${H - 5}" text-anchor="middle" class="c-lab">${pk(k).getDate()}</text>` : '';
    if (s == null) return `<rect x="${x.toFixed(1)}" y="${(H - B - 2).toFixed(1)}" width="${w.toFixed(1)}" height="2" rx="1" class="c-none"/>${lab}`;
    const hh = Math.max(3, (H - T - B) * s);
    return `<rect x="${x.toFixed(1)}" y="${(H - B - hh).toFixed(1)}" width="${w.toFixed(1)}" height="${hh.toFixed(1)}" rx="2.5" fill="${heat(s)}"><title>${esc(fmtShort(k))}: ${pct(s)}</title></rect>${lab}`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${grid}${bars}</svg>`;
}
function heatmap(h, weeks) {
  const t = todayK(), cs = 16, gap = 3, L = 18, T = 16;
  if (!weeks) {
    const start = h ? h.start : S.habits.reduce((m, x) => (x.start < m ? x.start : m), t);
    weeks = clamp(Math.round((pk(weekK(t)) - pk(weekK(start))) / (7 * DAY)) + 1, 10, 16);
  }
  const first = addK(weekK(t), -7 * (weeks - 1));
  const W = L + weeks * (cs + gap), H = T + 7 * (cs + gap);
  let cells = '', months = '', lastM = -1;
  for (let w = 0; w < weeks; w++) {
    const ws = addK(first, w * 7), m = pk(ws).getMonth();
    if (m !== lastM) { months += `<text x="${L + w * (cs + gap)}" y="10" class="c-lab">${esc(pk(ws).toLocaleDateString('es', { month: 'short' }).replace('.', ''))}</text>`; lastM = m; }
    for (let d = 0; d < 7; d++) {
      const k = addK(ws, d);
      if (k > t) continue;
      const s = h ? score(h, k) : dayScore(k);
      const fill = s == null ? '' : ` fill="${heat(s)}"`;
      cells += `<rect x="${L + w * (cs + gap)}" y="${T + d * (cs + gap)}" width="${cs}" height="${cs}" rx="4" class="${s == null ? 'c-empty' : ''}"${fill}><title>${esc(fmtShort(k))}${s == null ? '' : ': ' + pct(s)}</title></rect>`;
    }
  }
  const dl = [0, 2, 4].map(d => `<text x="0" y="${T + d * (cs + gap) + 12}" class="c-lab">${DOW[d]}</text>`).join('');
  return `<div class="hm-wrap"><svg class="heatmap" viewBox="0 0 ${W} ${H}" style="max-width:${W}px" role="img" aria-label="Mapa de cumplimiento de las últimas ${weeks} semanas">${months}${dl}${cells}</svg></div>`;
}
function timeChart(h) {
  const t = todayK(), pts = [];
  for (let i = 29; i >= 0; i--) { const k = addK(t, -i), v = getV(h, k); if (v) pts.push({ k, d: wrap(toMin(v) - toMin(h.target)), s: timeEval(h, v).score }); }
  if (pts.length < 2) return '<p class="chart-empty">Anota la hora al menos 2 días para ver cómo vas.</p>';
  const W = 340, H = 170, L = 44, R = 10, T = 12, B = 22;
  const lo = Math.min(-60, ...pts.map(p => p.d)), hi = Math.max(60, ...pts.map(p => p.d));
  const span = hi - lo, step = span <= 90 ? 15 : span <= 180 ? 30 : span <= 360 ? 60 : 120;
  const y0 = Math.floor(lo / step) * step, y1 = Math.ceil(hi / step) * step;
  const ticks = []; for (let v = y0; v <= y1; v += step) ticks.push(v);
  const Y = d => T + ((d - y0) / (y1 - y0)) * (H - T - B);
  const X = i => L + (pts.length === 1 ? 0.5 : i / (pts.length - 1)) * (W - L - R);
  const band = h.mode === 'max' ? [y0, h.tol] : h.mode === 'min' ? [-h.tol, y1] : [-h.tol, h.tol];
  const grid = ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="c-grid"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" class="c-lab">${fromMin(toMin(h.target) + v)}</text>`).join('');
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.d).toFixed(1)}`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Horas anotadas frente a la meta">
    <rect x="${L}" y="${Y(Math.max(band[0], y0))}" width="${W - L - R}" height="${Math.max(0, Y(Math.min(band[1], y1)) - Y(Math.max(band[0], y0)))}" class="c-band"/>
    ${grid}<line x1="${L}" x2="${W - R}" y1="${Y(0)}" y2="${Y(0)}" class="c-target"/>
    <text x="${L + 4}" y="${Y(0) - 5}" class="c-lab c-strong">Meta</text>
    <path d="${path}" class="c-line"/>
    ${pts.map((p, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.d).toFixed(1)}" r="4.5" fill="${heat(p.s)}" class="c-pt"><title>${esc(fmtShort(p.k))}: ${fromMin(toMin(h.target) + p.d)}</title></circle>`).join('')}
    <text x="${L}" y="${H - 5}" class="c-lab">${esc(fmtShort(pts[0].k))}</text><text x="${W - R}" y="${H - 5}" text-anchor="end" class="c-lab">${esc(fmtShort(pts[pts.length - 1].k))}</text>
  </svg>`;
}
function countChart(h) {
  const t = todayK(), keys = [...Array(14)].map((_, i) => addK(t, i - 13));
  const vals = keys.map(k => getV(h, k) || 0);
  const W = 340, H = 150, L = 30, R = 6, T = 10, B = 20;
  const max = Math.max(h.goal, ...vals), ticks = niceTicks(0, max, 3).filter(v => v >= 0), y1 = ticks[ticks.length - 1];
  const Y = v => T + (1 - v / y1) * (H - T - B), bw = (W - L - R) / keys.length;
  const grid = ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="c-grid"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" class="c-lab">${v}</text>`).join('');
  const bars = keys.map((k, i) => {
    const v = vals[i], x = L + i * bw + bw * 0.18, w = bw * 0.64, sch = isSched(h, k);
    const hh = Math.max(v ? 3 : 0, H - B - Y(v));
    return `<rect x="${x.toFixed(1)}" y="${(H - B - hh).toFixed(1)}" width="${w.toFixed(1)}" height="${hh.toFixed(1)}" rx="2.5" fill="${sch ? heat(Math.min(1, v / h.goal)) : 'var(--line)'}"><title>${esc(fmtShort(k))}: ${v}</title></rect>${i % 2 === 1 ? '' : `<text x="${x + w / 2}" y="${H - 5}" text-anchor="middle" class="c-lab">${pk(k).getDate()}</text>`}`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Cantidad de los últimos 14 días">${grid}${bars}<line x1="${L}" x2="${W - R}" y1="${Y(h.goal)}" y2="${Y(h.goal)}" class="c-target"/><text x="${W - R}" y="${Y(h.goal) - 5}" text-anchor="end" class="c-lab c-strong">Meta ${h.goal}</text></svg>`;
}
function ring(s, size = 64, label) {
  const r = size / 2 - 6, C = 2 * Math.PI * r;
  return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-label="${esc(label || pct(s))}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bg"/>
    ${s ? `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fg" stroke="${heat(s)}" stroke-dasharray="${(C * clamp(s, 0, 1)).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>` : ''}
    <text x="${size / 2}" y="${size / 2 + size * 0.085}" text-anchor="middle" style="font-size:${size * (s != null && s >= 0.995 ? 0.21 : 0.25)}px">${s == null ? '—' : Math.round(s * 100) + '%'}</text></svg>`;
}

/* ---------- Render principal ---------- */
function render(keepScroll) {
  const y = window.scrollY;
  let html;
  if (ui.view === 'edit' && ui.edit) html = vEdit();
  else { ui.view = null; html = ({ today: vToday, calendar: vCalendar, stats: vStats, settings: vSettings }[ui.tab] || vToday)(); }
  $('#view').innerHTML = html;
  document.body.dataset.view = ui.view || ui.tab;
  renderTabbar();
  if (keepScroll) window.scrollTo(0, y);
}
function go(tab) { ui.tab = tab; ui.view = null; render(); window.scrollTo(0, 0); }
function renderTabbar() {
  const tb = $('#tabbar');
  tb.hidden = !!ui.view;
  if (ui.view) return;
  const tabs = [['today', 'sun', 'Hoy'], ['calendar', 'calendar', 'Calendario'], ['stats', 'chart', 'Progreso'], ['settings', 'sliders', 'Ajustes']];
  tb.innerHTML = `<div class="tab-in">${tabs.map(([t, i, l]) => `<button class="tab${ui.tab === t ? ' on' : ''}" data-act="tab" data-t="${t}" ${ui.tab === t ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span></button>`).join('')}</div>`;
}

/* ---------- Vista: Hoy ---------- */
function vToday() {
  const t = todayK(), k = ui.day, isToday = k === t;
  const ws = ui.weekOf;
  const strip = [...Array(7)].map((_, i) => {
    const d = addK(ws, i), fut = d > t, s = fut ? null : dayScore(d);
    return `<button class="sd${d === k ? ' sel' : ''}${d === t ? ' today' : ''}" data-act="day" data-k="${d}" ${fut ? 'disabled' : ''} aria-label="${esc(fmtLong(d))}${s != null ? ', ' + pct(s) : ''}">
      <span>${DOW[i]}</span><i${s != null ? ` class="has" style="background:${heat(s)};color:${heatInk(s)}"` : ''}>${pk(d).getDate()}</i></button>`;
  }).join('');
  const hs = activeHabits();
  const due = hs.filter(h => h.type === 'weekly' || isSched(h, k));
  const off = hs.filter(h => !due.includes(h));
  const daily = due.filter(h => h.type !== 'weekly');
  const done = daily.filter(h => (scoreRaw(h, k) ?? 0) >= 1).length;
  const avg = daily.length ? daily.reduce((a, h) => a + (scoreRaw(h, k) ?? 0), 0) / daily.length : null;
  const mot = isToday && S.settings.motivate ? motivation() : null;
  const standalone = window.navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const showInstall = ios && !standalone && !inFrame && !S.settings.installHidden;
  const showWelcome = !S.settings.welcomeHidden && Object.keys(S.entries).length < 2;
  const showBackup = Object.keys(S.entries).length >= 7 && Date.now() - (S.settings.lastBackup || 0) > 14 * DAY;
  const order = h => ({ time: 0, count: 1, check: 2, weekly: 3 }[h.type]);
  return `
  <header class="page-head">
    <p class="eyebrow">${esc(fmtLong(k))}</p>
    <div class="head-row"><h1>${dayName(k)}</h1>${isToday ? '' : `<button class="btn btn-sm btn-soft" data-act="go-today">Volver a hoy</button>`}</div>
  </header>
  <div class="week">
    <button class="icon-btn sm" data-act="week" data-d="-7" aria-label="Semana anterior">${ic('left')}</button>
    <div class="strip">${strip}</div>
    <button class="icon-btn sm" data-act="week" data-d="7" ${ws >= weekK(t) ? 'disabled' : ''} aria-label="Semana siguiente">${ic('right')}</button>
  </div>
  ${showInstall ? `<div class="notice"><div class="notice-ic">${ic('share')}</div><div><b>Instala Brote en tu iPhone</b><p>Toca <b>Compartir</b> y luego <b>Agregar a pantalla de inicio</b>. Así funciona sin internet y tus datos quedan protegidos.</p></div><button class="icon-btn sm" data-act="hide-install" aria-label="Ocultar">${ic('x')}</button></div>` : ''}
  ${showWelcome ? `<div class="notice"><div class="notice-ic">${ic('sprout')}</div><div><b>Te dejamos 5 hábitos de ejemplo</b><p>Tócalos para ver detalles, editarlos o borrarlos. Crea los tuyos con <b>Nuevo hábito</b>.</p></div><button class="icon-btn sm" data-act="hide-welcome" aria-label="Ocultar">${ic('x')}</button></div>` : ''}
  ${showBackup ? `<button class="notice notice-btn" data-act="open-exp"><div class="notice-ic">${ic('download')}</div><div><b>Haz un respaldo</b><p>${S.settings.lastBackup ? 'Tu último respaldo fue hace más de 2 semanas' : 'Aún no guardas una copia de tus datos'}. Toma 10 segundos.</p></div>${ic('right')}</button>` : ''}
  ${daily.length ? `<section class="card day-card">
    ${ring(avg, 76, `${done} de ${daily.length}`)}
    <div class="day-txt">
      <p class="label">${isToday ? 'Tu día' : 'Ese día'}</p>
      <p class="day-big"><b>${done}</b> de ${plural(daily.length, 'hábito', 'hábitos')}</p>
      ${mot ? `<p class="mot mot-${mot.tone}"><b>${esc(mot.title)}${/[.!?»]$/.test(mot.title) ? '' : '.'}</b> ${esc(mot.text)}</p>` : `<p class="muted small">${avg >= 1 ? 'Todo cumplido.' : 'Puedes anotar o corregir lo que hiciste ese día.'}</p>`}
    </div>
  </section>` : ''}
  ${mot && S.settings.motivate ? `<p class="phrase">${ic('sprout', 'ic-sm')}${esc(phraseOfDay())}</p>` : ''}
  <div class="habits">${due.sort((a, b) => order(a) - order(b)).map(h => vHabitCard(h, k)).join('') || (hs.length ? '' : `<div class="empty"><p><b>Aún no tienes hábitos</b></p><p class="muted">Crea el primero. Empieza con algo tan fácil que no puedas decir que no.</p></div>`)}</div>
  ${off.length ? `<button class="off-toggle" data-act="toggle-off" aria-expanded="${ui.showOff}">${ic(ui.showOff ? 'down' : 'right', 'ic-sm')} No toca ${isToday ? 'hoy' : 'ese día'} · ${off.length}</button>
    ${ui.showOff ? `<div class="habits off">${off.map(h => `<button class="hc hc-off" data-act="habit" data-id="${h.id}">${bubble(h)}<span class="hc-txt"><b>${esc(h.name)}</b><small>${esc(daysText(h.days))}</small></span></button>`).join('')}</div>` : ''}` : ''}
  <button class="btn btn-block btn-outline" data-act="new">${ic('plus')} Nuevo hábito</button>`;
}
function vHabitCard(h, k) {
  const v = getV(h, k), s = scoreRaw(h, k), st = streak(h);
  let sub = '', ctrl = '', bar = null, extra = '';
  const tick = `<button class="tick${v ? ' on' : ''}" data-act="tick" data-id="${h.id}" aria-pressed="${!!v}" aria-label="${v ? 'Desmarcar' : 'Marcar como hecho'}">${ic('check')}</button>`;
  if (h.type === 'check') { sub = v ? 'Hecho' : 'Pendiente'; ctrl = tick; }
  else if (h.type === 'weekly') {
    const c = countWeek(h, weekK(k));
    sub = c >= h.weekly ? `¡Meta cumplida! ${c} de ${h.weekly} esta semana` : `${c} de ${h.weekly} esta semana`;
    extra = `<span class="dots">${[...Array(Math.max(h.weekly, c))].map((_, i) => `<i class="${i < c ? 'on' : ''}"></i>`).join('')}</span>`;
    ctrl = tick;
  } else if (h.type === 'count') {
    sub = `${v || 0} de ${h.goal}${h.unit ? ' ' + esc(h.unit) : ''}`;
    bar = (v || 0) / h.goal;
    ctrl = `<div class="counter"><button data-act="cnt" data-d="-1" data-id="${h.id}" aria-label="Restar uno" ${v ? '' : 'disabled'}>${ic('minus')}</button><button class="cnt-plus" data-act="cnt" data-d="1" data-id="${h.id}" aria-label="Sumar uno">${ic('plus')}</button></div>`;
  } else {
    if (v) { const e = timeEval(h, v); sub = `${v} · ${e.txt}`; extra = `<span class="eval" style="background:${heat(e.score)};color:${heatInk(e.score)}">${e.label}</span>`; }
    else sub = `Meta: ${MODES_SHORT[h.mode]} ${h.target}`;
    ctrl = `<button class="time-btn${v ? ' on' : ''}" data-act="time" data-id="${h.id}">${v ? esc(v) : 'Anotar'}</button>`;
  }
  return `<article class="hc${s != null && s >= 1 ? ' done' : ''}" style="--c:${esc(h.color)}">
    <button class="hc-main" data-act="habit" data-id="${h.id}">
      ${bubble(h)}
      <span class="hc-txt"><b>${esc(h.name)}</b><small>${sub}</small>${extra ? `<span class="hc-extra">${extra}</span>` : ''}</span>
    </button>
    <div class="hc-side">${st >= 2 ? `<span class="streak" title="Racha">${ic('flame')}${st}</span>` : ''}${ctrl}</div>
    ${bar != null ? `<div class="hc-bar" aria-hidden="true"><i style="width:${Math.min(100, bar * 100)}%"></i></div>` : ''}
  </article>`;
}

/* ---------- Vista: Calendario ---------- */
function vCalendar() {
  const t = todayK();
  if (!ui.cal) ui.cal = t.slice(0, 8) + '01';
  const m0 = pk(ui.cal), y = m0.getFullYear(), mo = m0.getMonth();
  const isCur = ui.cal === t.slice(0, 8) + '01';
  const only = ui.calHabit === 'all' ? null : habitById(ui.calHabit);
  if (!only) ui.calHabit = 'all';
  const dim = new Date(y, mo + 1, 0).getDate(), blanks = dowK(ui.cal);
  let cells = '<span></span>'.repeat(blanks), sum = 0, n = 0, perfect = 0;
  for (let d = 1; d <= dim; d++) {
    const k = dk(new Date(y, mo, d)), fut = k > t;
    const s = fut ? null : only ? score(only, k) : dayScore(k);
    if (s != null) { sum += s; n++; if (s >= 0.999) perfect++; }
    cells += fut
      ? `<span class="cd fut">${d}</span>`
      : `<button class="cd${k === t ? ' today' : ''}${s != null ? ' has' : ''}" ${s != null ? `style="background:${heat(s)};color:${heatInk(s)}"` : ''} data-act="cal-day" data-k="${k}" aria-label="${esc(fmtLong(k))}${s != null ? ', ' + pct(s) : ''}">${d}</button>`;
  }
  const hs = S.habits.filter(h => !h.archivedAt);
  return `
  <header class="page-head"><p class="eyebrow">De rojo a verde</p><h1>Calendario</h1></header>
  <div class="chips chips-scroll">
    <button class="chip${ui.calHabit === 'all' ? ' on' : ''}" data-act="cal-habit" data-id="all">Todos</button>
    ${hs.map(h => `<button class="chip${ui.calHabit === h.id ? ' on' : ''}" data-act="cal-habit" data-id="${h.id}">${esc(h.emoji)} ${esc(h.name)}</button>`).join('')}
  </div>
  <section class="card cal">
    <div class="cal-head"><button class="icon-btn" data-act="cal" data-d="-1" aria-label="Mes anterior">${ic('left')}</button><h2>${esc(cap(m0.toLocaleDateString('es', { month: 'long', year: 'numeric' })))}</h2><button class="icon-btn" data-act="cal" data-d="1" ${isCur ? 'disabled' : ''} aria-label="Mes siguiente">${ic('right')}</button></div>
    <div class="cal-grid">${DOW.map(d => `<span class="cal-dow">${d}</span>`).join('')}${cells}</div>
    <div class="legend"><span>Fallé la mayoría</span><i></i><span>Cumplí todo</span></div>
  </section>
  <div class="tiles">
    <div class="tile"><small>Cumplimiento del mes</small><b>${n ? pct(sum / n) : '—'}</b><em>${only ? esc(only.name) : 'todos los hábitos'}</em></div>
    <div class="tile"><small>Días perfectos</small><b>${perfect}</b><em>de ${plural(n, 'día registrado', 'días registrados')}</em></div>
  </div>
  <p class="muted small center">Toca un día para ver el detalle o corregirlo.</p>`;
}
function openDay(k) {
  const hs = S.habits.filter(h => !h.archivedAt && (h.type === 'weekly' ? getV(h, k) : isSched(h, k)));
  const s = dayScore(k);
  const rows = hs.map(h => {
    const v = getV(h, k), sc = scoreRaw(h, k);
    let txt;
    if (h.type === 'check' || h.type === 'weekly') txt = v ? 'Hecho' : 'No lo hiciste';
    else if (h.type === 'count') txt = `${v || 0} de ${h.goal}${h.unit ? ' ' + h.unit : ''}`;
    else txt = v ? `${v} · ${timeEval(h, v).txt}` : 'Sin anotar';
    return `<li>${bubble(h, 'sm')}<span class="dl-txt"><b>${esc(h.name)}</b><small>${esc(txt)}</small></span><span class="pill" style="background:${heat(sc ?? 0)};color:${heatInk(sc ?? 0)}">${pct(sc ?? 0)}</span></li>`;
  }).join('');
  openSheet(`
    <div class="sheet-top"><div><p class="eyebrow">${esc(fmtLong(k))}</p><h3 class="sheet-title">${s == null ? 'Sin registros' : `Cumpliste el ${pct(s)}`}</h3></div><button class="icon-btn" data-act="close-layer" aria-label="Cerrar">${ic('x')}</button></div>
    ${rows ? `<ul class="day-list">${rows}</ul>` : '<p class="muted">Ese día no tocaba ningún hábito.</p>'}
    <button class="btn btn-primary btn-block" data-act="edit-day">${ic('pencil')} Anotar o corregir este día</button>`, {
    acts: { 'edit-day': (el, e, l) => { closeLayer(l); ui.day = k; ui.weekOf = weekK(k); go('today'); } },
  });
}

/* ---------- Vista: Progreso ---------- */
function vStats() {
  const t = todayK(), hs = activeHabits();
  const keys = [...Array(30)].map((_, i) => addK(t, i - 29));
  let perfect = 0;
  for (const k of keys) { const s = dayScore(k); if (s != null && s >= 0.999) perfect++; }
  const best = hs.map(h => ({ h, s: streak(h) })).sort((a, b) => b.s - a.s)[0];
  const cards = hs.map(h => {
    const c30 = compliance(h, 30), st = streak(h), bs = bestStreak(h);
    const unit = n => (h.type === 'weekly' ? 'sem.' : n === 1 ? 'día' : 'días');
    let extra = '';
    if (h.type === 'time') {
      const ds = []; for (let i = 0; i < 30; i++) { const v = getV(h, addK(t, -i)); if (v) ds.push(wrap(toMin(v) - toMin(h.target))); }
      if (ds.length) { const a = ds.reduce((x, y) => x + y, 0) / ds.length; extra = `<p class="hs-extra">${ic('clock', 'ic-sm')} Promedio ${fromMin(toMin(h.target) + a)} · ${a === 0 ? 'justo en la meta' : `${fmtMins(a)} ${a > 0 ? 'más tarde' : 'antes'} que tu meta`}</p>`; }
    } else if (h.type === 'count') {
      const vs = []; for (let i = 0; i < 30; i++) { const k = addK(t, -i); if (isSched(h, k) && counted(h, k) && (getV(h, k) != null || k !== t)) vs.push(getV(h, k) || 0); }
      if (vs.length) extra = `<p class="hs-extra">${ic('counter', 'ic-sm')} Promedio ${(vs.reduce((a, b) => a + b, 0) / vs.length).toLocaleString('es', { maximumFractionDigits: 1 })} ${esc(h.unit || '')} al día</p>`;
    } else if (h.type === 'weekly') {
      extra = `<p class="hs-extra">${ic('repeat', 'ic-sm')} Esta semana ${countWeek(h, weekK(t))} de ${h.weekly}</p>`;
    }
    const mini = [...Array(28)].map((_, i) => { const k = addK(t, i - 27), s = score(h, k); return `<i${s != null ? ` style="background:${heat(s)}"` : ''}></i>`; }).join('');
    return `<button class="card hs" data-act="habit" data-id="${h.id}">
      <div class="hs-top">${bubble(h)}<span class="hs-name"><b>${esc(h.name)}</b><small>${TYPES[h.type].n}${h.type === 'weekly' ? ` · ${h.weekly} por semana` : ''}</small></span>${ring(c30, 54)}</div>
      <div class="hs-mini" aria-hidden="true">${mini}</div>
      <div class="hs-meta"><span>${ic('flame', 'ic-sm')} Racha <b>${st}</b> ${unit(st)}</span><span>${ic('star', 'ic-sm')} Mejor <b>${bs}</b> ${unit(bs)}</span><span>Últimos 30 días</span></div>
      ${extra}
    </button>`;
  }).join('');
  return `
  <header class="page-head"><p class="eyebrow">Cómo vas</p><h1>Progreso</h1></header>
  <div class="tiles">
    <div class="tile"><small>Últimos 7 días</small><b>${pct(overall(7))}</b><em>de cumplimiento</em></div>
    <div class="tile"><small>Últimos 30 días</small><b>${pct(overall(30))}</b><em>de cumplimiento</em></div>
    <div class="tile"><small>Días perfectos</small><b>${perfect}</b><em>en 30 días</em></div>
    <div class="tile"><small>Mejor racha actual</small><b>${best ? best.s : 0}</b><em>${best && best.s ? esc(best.h.emoji + ' ' + best.h.name) : 'empieza hoy'}</em></div>
  </div>
  <section class="card panel"><div class="panel-head"><h2>Cada día</h2><span class="muted small">Últimos 30 días</span></div>${dayBars(keys, k => dayScore(k), { label: 'Cumplimiento diario de los últimos 30 días' })}</section>
  <section class="card panel"><div class="panel-head"><h2>Constancia</h2><span class="muted small">Cada cuadro es un día</span></div>${heatmap(null)}</section>
  <div class="sec-head"><h2>Por hábito</h2></div>
  <div class="hs-list">${cards || '<p class="muted">Crea un hábito para ver su progreso.</p>'}</div>`;
}

/* Detalle de un hábito */
function openHabit(id) {
  const h = habitById(id);
  if (!h) return;
  const t = todayK();
  const c30 = compliance(h, 30), call = compliance(h, 0), st = streak(h), bs = bestStreak(h);
  const unit = n => (h.type === 'weekly' ? (n === 1 ? 'semana' : 'semanas') : n === 1 ? 'día' : 'días');
  let goal = '';
  if (h.type === 'check') goal = daysText(h.days);
  else if (h.type === 'weekly') goal = `${h.weekly} veces por semana`;
  else if (h.type === 'count') goal = `${h.goal}${h.unit ? ' ' + h.unit : ''} al día · ${daysText(h.days).toLowerCase()}`;
  else goal = `${MODES[h.mode]} las ${h.target}${h.tol ? ` (margen ${h.tol} min)` : ''} · ${daysText(h.days).toLowerCase()}`;
  let chart = '';
  if (h.type === 'time') chart = `<h4 class="mini-title">Tus horas, últimos 30 días</h4>${timeChart(h)}`;
  if (h.type === 'count') chart = `<h4 class="mini-title">Últimos 14 días</h4>${countChart(h)}`;
  const hist = [];
  for (let i = 0; i < 60 && hist.length < 8; i++) {
    const k = addK(t, -i), v = getV(h, k);
    if (v == null) continue;
    const txt = h.type === 'time' ? `${v} · ${timeEval(h, v).txt}` : h.type === 'count' ? `${v} ${h.unit || ''}` : 'Hecho';
    const s = scoreRaw(h, k) ?? 1;
    hist.push(`<li><span>${esc(dayName(k) === 'Hoy' || dayName(k) === 'Ayer' ? dayName(k) : fmtShort(k))}</span><span class="rc">${esc(txt)}</span><span class="pill" style="background:${heat(s)};color:${heatInk(s)}">${pct(s)}</span></li>`);
  }
  const w = openSheet(`
    <div class="sheet-top"><div class="hd-head">${bubble(h, 'lg')}<div><h3 class="sheet-title">${esc(h.name)}</h3><p class="muted small">${TYPES[h.type].n} · ${esc(goal)}</p></div></div><button class="icon-btn" data-act="close-layer" aria-label="Cerrar">${ic('x')}</button></div>
    ${h.why ? `<p class="why">${ic('heart', 'ic-sm')}<span>${esc(h.why)}</span></p>` : ''}
    <div class="stat-grid">
      <div class="stat"><small>Últimos 30 días</small><b>${pct(c30)}</b></div>
      <div class="stat"><small>Desde el inicio</small><b>${pct(call)}</b></div>
      <div class="stat"><small>Racha actual</small><b>${st} <span>${unit(st)}</span></b></div>
      <div class="stat"><small>Mejor racha</small><b>${bs} <span>${unit(bs)}</span></b></div>
    </div>
    ${chart}
    <h4 class="mini-title">Constancia</h4>${heatmap(h)}
    ${hist.length ? `<h4 class="mini-title">Últimos registros</h4><ul class="rc-list">${hist.join('')}</ul>` : ''}
    <p class="muted small">Desde el ${esc(fmtLong(h.start).toLowerCase())}.</p>
    <div class="menu">${menuItem('h-edit', 'pencil', 'Editar hábito')}${menuItem('h-arch', 'archive', 'Archivar (pausar sin borrar)')}${menuItem('h-del', 'trash', 'Eliminar hábito', true)}</div>`, {
    acts: {
      'h-edit': (el, e, l) => { closeLayer(l); ui.edit = { ...clone(h), isNew: false }; ui.view = 'edit'; render(); window.scrollTo(0, 0); },
      'h-arch': async (el, e, l) => {
        if (!await confirmBox({ title: `¿Archivar «${h.name}»?`, text: 'Deja de aparecer en Hoy y no cuenta para tus porcentajes desde ahora. Su historial se guarda y puedes restaurarlo desde Ajustes.', ok: 'Archivar' })) return;
        h.archivedAt = t; logEv('habito', `Hábito archivado: ${h.name}`); persist(); closeLayer(l); render(true); toast('Hábito archivado');
      },
      'h-del': async (el, e, l) => {
        if (!await confirmBox({ title: `¿Eliminar «${h.name}»?`, text: 'Se borra el hábito y todo su historial. No se puede deshacer. Si solo quieres pausarlo, archívalo.', ok: 'Eliminar', danger: true })) return;
        deleteHabit(h); closeLayer(l); render(true); toast('Hábito eliminado');
      },
    },
  });
  const hm = $('.hm-wrap', w);
  if (hm) hm.scrollLeft = hm.scrollWidth;
}
function deleteHabit(h) {
  S.habits = S.habits.filter(x => x !== h);
  for (const k of Object.keys(S.entries)) { delete S.entries[k][h.id]; if (!Object.keys(S.entries[k]).length) delete S.entries[k]; }
  for (const k of Object.keys(S.milestones)) if (k.startsWith(h.id + ':')) delete S.milestones[k];
  if (ui.calHabit === h.id) ui.calHabit = 'all';
  logEv('habito', `Hábito eliminado: ${h.name}`);
  persist();
}

/* ---------- Editor de hábito ---------- */
function vEdit() {
  const e = ui.edit;
  const days = `<div class="fgroup"><p class="flabel">Qué días</p>
    <div class="daypick">${DOW.map((d, i) => `<button class="dp${e.days.includes(i) ? ' on' : ''}" data-act="ed-day" data-i="${i}" aria-pressed="${e.days.includes(i)}" aria-label="${DOW_LONG[i]}">${d}</button>`).join('')}</div>
    <div class="chips">${[['Todos', ALL], ['Lun a Vie', [0, 1, 2, 3, 4]], ['Fin de semana', [5, 6]]].map(([l, ds]) => `<button class="chip sm${e.days.join() === ds.join() ? ' on' : ''}" data-act="ed-days" data-v="${ds.join(',')}">${l}</button>`).join('')}</div></div>`;
  let fields = '';
  if (e.type === 'check') fields = days;
  else if (e.type === 'weekly') fields = `<div class="fgroup"><p class="flabel">Meta semanal</p><div class="row-inline"><div class="stepper"><button data-act="ed-step" data-k="weekly" data-d="-1" aria-label="Menos">${ic('minus')}</button><b>${e.weekly}</b><button data-act="ed-step" data-k="weekly" data-d="1" aria-label="Más">${ic('plus')}</button></div><span class="muted">${e.weekly === 1 ? 'vez' : 'veces'} por semana</span></div><p class="hint">Cada día que lo hagas suma uno. La semana va de lunes a domingo.</p></div>`;
  else if (e.type === 'count') fields = `<div class="fgroup"><p class="flabel">Meta diaria</p><div class="row-inline"><div class="stepper"><button data-act="ed-step" data-k="goal" data-d="-1" aria-label="Menos">${ic('minus')}</button><b>${e.goal}</b><button data-act="ed-step" data-k="goal" data-d="1" aria-label="Más">${ic('plus')}</button></div><label class="sr" for="ed-unit">Unidad</label><input id="ed-unit" class="field" data-f="ed-unit" value="${esc(e.unit)}" placeholder="vasos, páginas, min…" maxlength="16"></div><p class="hint">Si llegas a la mitad, el día cuenta como 50%.</p></div>${days}`;
  else fields = `
    <div class="fgroup"><label class="flabel" for="ed-target">Hora meta</label><input id="ed-target" type="time" class="field big-in" data-f="ed-target" value="${esc(e.target)}"></div>
    <div class="fgroup"><p class="flabel">Cómo se evalúa</p><div class="opts">${Object.entries(MODES).map(([k, l]) => `<button class="opt sm${e.mode === k ? ' on' : ''}" data-act="ed-mode" data-v="${k}" aria-pressed="${e.mode === k}"><b>${l} ${esc(e.target)}</b><small>${k === 'max' ? 'Ideal para acostarse: antes está perfecto' : k === 'min' ? 'Ideal para no comer tarde o no levantarse antes' : 'Ideal para levantarse siempre a la misma hora'}</small></button>`).join('')}</div></div>
    <div class="fgroup"><label class="flabel" for="ed-tol">Margen sin penalizar</label><select id="ed-tol" class="field" data-f="ed-tol">${TOLS.map(x => `<option value="${x}"${x === e.tol ? ' selected' : ''}>${x ? x + ' minutos' : 'Sin margen'}</option>`).join('')}</select>
    <p class="hint">Dentro del margen es 100%. Después baja poco a poco hasta 0% cuando te pasas por 2 horas. Ejemplo con tu meta: ${[0, 30, 60].map(m => { const ex = e.mode === 'min' ? -(e.tol + m) : e.tol + m; const s = timeEval(e, fromMin(toMin(e.target) + ex)).score; return `${fromMin(toMin(e.target) + ex)} → ${pct(s)}`; }).join(' · ')}.</p></div>
    ${days}`;
  return `
  <header class="sub-head"><button class="icon-btn" data-act="ed-cancel" aria-label="Volver">${ic('left')}</button><h2>${e.isNew ? 'Nuevo hábito' : 'Editar hábito'}</h2><button class="btn btn-sm btn-primary" data-act="ed-save">Guardar</button></header>
  <div class="ed-preview">${bubble(e, 'xl')}<p class="ed-pname">${esc(e.name) || '<span class="muted">Tu hábito</span>'}</p></div>
  <div class="form">
    <div class="fgroup"><label class="flabel" for="ed-name">Nombre</label><input id="ed-name" class="field" data-f="ed-name" value="${esc(e.name)}" placeholder="Ej: Caminar 20 minutos" maxlength="40" autocomplete="off"></div>
    <div class="fgroup"><p class="flabel">Ícono</p><div class="emojis">${EMOJIS.map(x => `<button class="emj${e.emoji === x ? ' on' : ''}" data-act="ed-emoji" data-v="${x}" aria-label="Ícono ${x}">${x}</button>`).join('')}</div></div>
    <div class="fgroup"><p class="flabel">Color</p><div class="swatches">${COLORS.map(c => `<button class="swatch${e.color === c ? ' on' : ''}" style="--c:${c}" data-act="ed-color" data-v="${c}" aria-label="Color" aria-pressed="${e.color === c}"></button>`).join('')}</div></div>
    <div class="fgroup"><p class="flabel">Tipo de hábito</p><div class="opts">${Object.entries(TYPES).map(([k, tp]) => `<button class="opt${e.type === k ? ' on' : ''}" data-act="ed-type" data-v="${k}" aria-pressed="${e.type === k}">${ic(tp.ic)}<span><b>${tp.n}</b><small>${tp.d}</small></span></button>`).join('')}</div></div>
    ${fields}
    <div class="fgroup"><label class="flabel" for="ed-why">¿Por qué es importante para ti?</label><textarea id="ed-why" class="field" data-f="ed-why" rows="2" maxlength="140" placeholder="Te lo recordaremos cuando cueste.">${esc(e.why)}</textarea></div>
  </div>`;
}

/* ---------- Vista: Ajustes ---------- */
function vSettings() {
  const st = S.settings;
  const tog = (k, label, desc) => `<div class="row"><div class="row-txt"><b>${label}</b>${desc ? `<small>${desc}</small>` : ''}</div><button class="switch" role="switch" aria-checked="${!!st[k]}" aria-label="${label}" data-act="set-toggle" data-k="${k}"><i></i></button></div>`;
  const link = (act, icon, title, sub, danger) => `<button class="row row-link${danger ? ' danger' : ''}" data-act="open-${act}">${ic(icon)}<span class="row-txt"><b>${title}</b><small>${sub}</small></span>${ic('right', 'ic-sm row-chev')}</button>`;
  const arch = S.habits.filter(h => h.archivedAt).length;
  const nEntries = Object.values(S.entries).reduce((n, d) => n + Object.keys(d).length, 0);
  return `
  <header class="page-head"><p class="eyebrow">Brote ${VERSION}</p><h1>Ajustes</h1></header>
  <section class="group"><h2 class="group-title">Motivación</h2><div class="card list">
    ${tog('motivate', 'Mensajes motivadores', 'Te dice cómo vas y qué te conviene hacer hoy')}
    ${tog('celebrate', 'Celebraciones', 'Confeti al completar el día y en tus rachas')}
  </div></section>
  <section class="group"><h2 class="group-title">Apariencia</h2><div class="card list">
    <div class="row"><div class="row-txt"><b>Tema</b></div><div class="seg">${[['auto', 'Auto'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([v, l]) => `<button data-act="set-theme" data-v="${v}" class="${st.theme === v ? 'on' : ''}" aria-pressed="${st.theme === v}">${l}</button>`).join('')}</div></div>
  </div></section>
  <section class="group"><h2 class="group-title">Tus datos</h2>
    <p class="group-note">Todo se guarda en este teléfono y sigue ahí aunque cierres la app.${persisted ? ' El almacenamiento está protegido contra el borrado automático.' : ''} Exporta un respaldo de vez en cuando por si cambias de teléfono.</p>
    <div class="card list">
      ${link('exp', 'download', 'Exportar respaldo', st.lastBackup ? 'Último: ' + fmtShort(dk(new Date(st.lastBackup))) : 'Aún no has hecho ninguno')}
      ${link('imp', 'upload', 'Importar respaldo', 'Restaura tus datos desde un archivo')}
      ${link('log', 'list', 'Registro de actividad', `${S.log.length.toLocaleString('es')} acciones · ${nEntries.toLocaleString('es')} registros de hábitos`)}
      ${link('archived', 'archive', 'Hábitos archivados', arch ? plural(arch, 'hábito', 'hábitos') : 'Ninguno')}
    </div></section>
  <section class="group"><h2 class="group-title">Ayuda</h2><div class="card list">
    ${link('install', 'share', 'Instalar en iPhone', 'Úsala como app, incluso sin internet')}
    ${link('how', 'info', 'Cómo se calcula el cumplimiento', 'Porcentajes, rachas y colores')}
  </div></section>
  <section class="group"><div class="card list">${link('wipe', 'trash', 'Borrar todos los datos', 'Elimina hábitos, registros e historial', true)}</div></section>
  <p class="foot-note">Hecho con cariño para que tus hábitos crezcan. Tus datos no salen de tu teléfono.</p>`;
}

/* ---------- Hojas ---------- */
function openTime(h) {
  const t = todayK();
  let day = ui.day;
  const now = new Date(), nowS = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const morning = now.getHours() < 12 && h.mode !== 'min';
  if (day === t && morning && !getV(h, t) && !getV(h, addK(t, -1)) && toMin(h.target) > 12 * 60) day = addK(t, -1);
  const initial = () => getV(h, day) || (Math.abs(wrap(toMin(nowS) - toMin(h.target))) <= 180 && day === t ? fromMin(Math.round(toMin(nowS) / 5) * 5) : h.target);
  let val = initial();
  const w = openSheet('', {
    acts: {
      'tm-day': el => { day = el.dataset.k; val = initial(); draw(); },
      'tm-now': () => { val = nowS; $('#tm-in', w).value = val; preview(); },
      'tm-save': (el, e, l) => {
        const v = $('#tm-in', w).value;
        if (!/^\d{2}:\d{2}$/.test(v)) { toast('Elige una hora'); return; }
        const before = scoreRaw(h, day);
        setVal(h, day, v);
        const ev = timeEval(h, v);
        logEv('registro', `${h.name} (${fmtShort(day)}): ${v} · ${ev.txt} · ${ev.label} ${pct(ev.score)}`);
        afterChange(h, day, before);
        persist(); closeLayer(l); render(true);
        toast(`${ev.label}: ${ev.txt}`, ev.score >= 0.75 ? 'good' : '');
      },
      'tm-clear': (el, e, l) => { setVal(h, day, null); logEv('registro', `${h.name} (${fmtShort(day)}): registro borrado`); persist(); closeLayer(l); render(true); },
      'input:tm-in': el => { val = el.value; preview(); },
    },
  });
  function preview() {
    const box = $('.tm-eval', w);
    if (!/^\d{2}:\d{2}$/.test(val)) { box.innerHTML = ''; return; }
    const e = timeEval(h, val);
    box.innerHTML = `<span class="eval big" style="background:${heat(e.score)};color:${heatInk(e.score)}">${e.label} · ${pct(e.score)}</span><span>${esc(cap(e.txt))}${h.tol && e.score === 1 && e.diff > 0 ? ', dentro de tu margen' : ''}</span>`;
  }
  function draw() {
    const showDay = ui.day === t;
    setSheet(w, `
      <div class="sheet-top"><div class="hd-head">${bubble(h)}<div><h3 class="sheet-title">${esc(h.name)}</h3><p class="muted small">Meta: ${MODES[h.mode].toLowerCase()} las ${h.target}${h.tol ? ` · margen ${h.tol} min` : ''}</p></div></div></div>
      ${showDay ? `<div class="seg seg-block">${[[addK(t, -1), 'Anoche / ayer'], [t, 'Hoy']].map(([k, l]) => `<button data-act="tm-day" data-k="${k}" class="${day === k ? 'on' : ''}" aria-pressed="${day === k}">${l}</button>`).join('')}</div>` : `<p class="muted small">Anotando el ${esc(fmtLong(day).toLowerCase())}.</p>`}
      <label class="flabel" for="tm-in">¿A qué hora fue?</label>
      <div class="tm-row"><input id="tm-in" type="time" class="field big-in" data-f="tm-in" value="${esc(val)}"><button class="btn btn-soft" data-act="tm-now">Ahora</button></div>
      <div class="tm-eval"></div>
      <button class="btn btn-primary btn-block" data-act="tm-save">Guardar</button>
      ${getV(h, day) ? `<button class="btn btn-ghost-bad btn-block" data-act="tm-clear">Borrar registro</button>` : ''}`);
    preview();
  }
  draw();
}
function backupJSON() { return JSON.stringify({ app: 'brote', version: VERSION, exported: Date.now(), ...S }); }
function markBackup(how) { S.settings.lastBackup = Date.now(); logEv('datos', `Respaldo exportado (${how})`); persist(); }
function openExport() {
  openSheet(`
    <h3 class="sheet-title">Exportar respaldo</h3>
    <p class="muted">Incluye tus hábitos, todos los registros, logros y el registro de actividad. Guárdalo en Archivos, iCloud Drive o envíatelo por correo.</p>
    <div class="stack"><button class="btn btn-primary btn-block" data-act="exp-file">${ic('download')} Guardar archivo</button><button class="btn btn-soft btn-block" data-act="exp-copy">${ic('copy')} Copiar como texto</button></div>`, {
    acts: {
      'exp-file': async (el, e, l) => {
        const name = `brote-respaldo-${todayK()}.json`;
        const blob = new Blob([backupJSON()], { type: 'application/json' });
        try {
          const file = new File([blob], name, { type: 'application/json' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Respaldo de Brote' }); markBackup('archivo'); closeLayer(l); render(true); return; }
        } catch (err) { if (err && err.name === 'AbortError') return; }
        try {
          const url = URL.createObjectURL(blob), a = document.createElement('a');
          a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 5000);
          markBackup('archivo'); closeLayer(l); render(true); toast('Respaldo descargado', 'good');
        } catch (err) { toast('No se pudo crear el archivo. Usa «Copiar como texto».', 'bad'); }
      },
      'exp-copy': (el, e, l) => {
        const txt = backupJSON();
        const fallback = () => { setSheet(l, `<h3 class="sheet-title">Copia este texto</h3><p class="muted">Mantén presionado, selecciona todo y copia. Pégalo en Notas o en un correo.</p><textarea id="exp-txt" class="field mono" rows="8" readonly>${esc(txt)}</textarea>`); const ta = $('#exp-txt', l); ta.focus(); ta.select(); markBackup('texto'); };
        if (!navigator.clipboard) { fallback(); return; }
        navigator.clipboard.writeText(txt).then(() => { markBackup('texto'); closeLayer(l); render(true); toast('Respaldo copiado. Pégalo en Notas o en un correo.', 'good'); }, fallback);
      },
    },
  });
}
function openImport() {
  const w = openSheet(`
    <h3 class="sheet-title">Importar respaldo</h3>
    <p class="muted">Reemplaza los datos de esta app por los del respaldo.</p>
    <label class="btn btn-primary btn-block file-btn" for="imp-file">${ic('upload')} Elegir archivo .json</label>
    <input id="imp-file" type="file" accept="application/json,.json,text/plain" class="sr" data-f="imp-file">
    <label class="flabel" for="imp-txt">O pega el texto del respaldo</label>
    <textarea id="imp-txt" class="field mono" rows="4" placeholder='{"app":"brote", …}'></textarea>
    <button class="btn btn-soft btn-block" data-act="imp-text">Importar texto</button>`, {
    acts: {
      'input:imp-file': el => { const f = el.files && el.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => doImport(String(rd.result), w); rd.readAsText(f); },
      'imp-text': () => doImport($('#imp-txt', w).value, w),
    },
  });
}
async function doImport(txt, layer) {
  let obj;
  try { obj = JSON.parse(txt); } catch (e) { toast('Ese contenido no es un respaldo válido', 'bad'); return; }
  if (!obj || !Array.isArray(obj.habits) || typeof obj.entries !== 'object') { toast('Ese archivo no es un respaldo de Brote', 'bad'); return; }
  if (!await confirmBox({ title: '¿Reemplazar tus datos?', text: `El respaldo tiene ${plural(obj.habits.length, 'hábito', 'hábitos')} y ${plural(Object.keys(obj.entries).length, 'día registrado', 'días registrados')}. Lo que tienes ahora se perderá.`, ok: 'Importar', danger: true })) return;
  S = normalize(obj);
  logEv('datos', `Respaldo importado: ${plural(S.habits.length, 'hábito', 'hábitos')}`);
  persist(true); applyTheme(); closeLayer(layer); render(); toast('Datos importados', 'good');
}
function openLog() {
  let f = 'all', lim = 150;
  const w = openSheet('', { acts: { 'log-f': el => { f = el.dataset.k; lim = 150; draw(); }, 'log-more': () => { lim += 300; draw(); } } });
  function draw() {
    const items = S.log.filter(x => f === 'all' || x.k === f).slice().reverse();
    let last = '';
    const rows = items.slice(0, lim).map(x => {
      const k = dk(new Date(x.t)), head = k !== last ? `<p class="log-day">${esc(k === todayK() ? 'Hoy' : k === addK(todayK(), -1) ? 'Ayer' : fmtLong(k))}</p>` : '';
      last = k;
      return `${head}<div class="log-row"><time>${fmtClock(x.t)}</time><span class="log-k k-${x.k}">${esc(LOG_KINDS[x.k] || x.k)}</span><p>${esc(x.m)}</p></div>`;
    }).join('');
    setSheet(w, `
      <div class="sheet-top"><div><p class="eyebrow">${S.log.length.toLocaleString('es')} acciones</p><h3 class="sheet-title">Registro de actividad</h3></div><button class="icon-btn" data-act="close-layer" aria-label="Cerrar">${ic('x')}</button></div>
      <div class="chips chips-scroll">${[['all', 'Todo'], ...Object.entries(LOG_KINDS)].map(([k, l]) => `<button class="chip${f === k ? ' on' : ''}" data-act="log-f" data-k="${k}">${l}</button>`).join('')}</div>
      <div class="log">${rows || '<p class="muted">Sin acciones en esta categoría.</p>'}</div>
      ${items.length > lim ? `<button class="btn btn-soft btn-block" data-act="log-more">Ver más (${items.length - lim})</button>` : ''}`);
  }
  draw();
}
function openArchived() {
  const w = openSheet('', {
    acts: {
      'ar-restore': el => { const h = habitById(el.dataset.id); h.archivedAt = null; logEv('habito', `Hábito restaurado: ${h.name}`); persist(); draw(); render(true); toast(`«${h.name}» vuelve a tus hábitos`, 'good'); },
      'ar-del': async el => { const h = habitById(el.dataset.id); if (!await confirmBox({ title: `¿Eliminar «${h.name}»?`, text: 'Se borra con todo su historial.', ok: 'Eliminar', danger: true })) return; deleteHabit(h); draw(); render(true); },
    },
  });
  function draw() {
    const list = S.habits.filter(h => h.archivedAt);
    setSheet(w, `<div class="sheet-top"><h3 class="sheet-title">Hábitos archivados</h3><button class="icon-btn" data-act="close-layer" aria-label="Cerrar">${ic('x')}</button></div>
      ${list.length ? `<ul class="day-list">${list.map(h => `<li>${bubble(h, 'sm')}<span class="dl-txt"><b>${esc(h.name)}</b><small>Archivado el ${esc(fmtShort(h.archivedAt))}</small></span><button class="icon-btn sm" data-act="ar-restore" data-id="${h.id}" aria-label="Restaurar">${ic('restore')}</button><button class="icon-btn sm" data-act="ar-del" data-id="${h.id}" aria-label="Eliminar">${ic('trash')}</button></li>`).join('')}</ul>` : '<p class="muted">No tienes hábitos archivados. Archivar sirve para pausar un hábito sin perder su historial.</p>'}`);
  }
  draw();
}
function openInstall() {
  openSheet(`
    <h3 class="sheet-title">Instalar en iPhone</h3>
    <ol class="steps">
      <li><b>Abre esta página en Safari.</b> En Chrome u otras apps no aparece la opción.</li>
      <li>Toca el botón <b>Compartir</b> ${ic('share', 'ic-sm')} en la barra inferior.</li>
      <li>Desliza y elige <b>Agregar a pantalla de inicio</b>.</li>
      <li>Toca <b>Agregar</b>. Brote aparecerá con su ícono, como cualquier app.</li>
    </ol>
    <p class="muted small">Ábrela siempre desde el ícono. Funciona sin internet y tus datos quedan guardados en el teléfono aunque la cierres.</p>
    <button class="btn btn-primary btn-block" data-act="close-layer">Entendido</button>`);
}
function openHow() {
  openSheet(`
    <h3 class="sheet-title">Cómo se calcula</h3>
    <div class="how">
      <p><b>Diario.</b> Cada día que toca vale 100% si lo marcas y 0% si no.</p>
      <p><b>Cantidad diaria.</b> Vale lo que llevas de la meta: 4 de 8 vasos es 50%.</p>
      <p><b>Hora objetivo.</b> Dentro de tu margen es 100%. Fuera del margen baja poco a poco y llega a 0% cuando te pasas por 2 horas. Si la meta es «no más tarde de», hacerlo antes siempre es 100%.</p>
      <p><b>Veces por semana.</b> Cada semana vale lo que cumpliste de tu meta: 2 de 3 es 67%. Los días que lo haces cuentan como cumplidos en el calendario.</p>
      <p><b>Colores del calendario.</b> Cada día es el promedio de los hábitos que tocaban: rojo si fallaste la mayoría, amarillo a mitad de camino y verde si cumpliste.</p>
      <p><b>Rachas.</b> Días seguidos con al menos 75% en ese hábito. Los días que no toca no cortan la racha, y hoy no la corta mientras el día no termine.</p>
    </div>
    <div class="legend"><span>0%</span><i></i><span>100%</span></div>
    <button class="btn btn-primary btn-block" data-act="close-layer">Entendido</button>`);
}

/* ---------- Acciones ---------- */
const ACT = {
  tab: el => { if (el.dataset.t === 'today') { ui.day = todayK(); ui.weekOf = weekK(ui.day); } go(el.dataset.t); },
  day: el => { ui.day = el.dataset.k; render(true); },
  week: el => { ui.weekOf = addK(ui.weekOf, Number(el.dataset.d)); const t = todayK(); ui.day = ui.weekOf === weekK(t) ? t : addK(ui.weekOf, 6); render(true); },
  'go-today': () => { ui.day = todayK(); ui.weekOf = weekK(ui.day); render(true); },
  'toggle-off': () => { ui.showOff = !ui.showOff; render(true); },
  'hide-install': () => { S.settings.installHidden = true; persist(); render(true); },
  'hide-welcome': () => { S.settings.welcomeHidden = true; persist(); render(true); },
  tick: el => {
    const h = habitById(el.dataset.id), k = ui.day, before = scoreRaw(h, k);
    const on = !getV(h, k);
    setVal(h, k, on ? 1 : null);
    logEv('registro', `${h.name} (${fmtShort(k)}): ${on ? 'hecho' : 'desmarcado'}`);
    haptic(on ? 15 : 8);
    if (on) afterChange(h, k, before);
    persist(); render(true);
  },
  cnt: el => {
    const h = habitById(el.dataset.id), k = ui.day, before = scoreRaw(h, k);
    const v = clamp((getV(h, k) || 0) + Number(el.dataset.d), 0, 999);
    setVal(h, k, v);
    logEv('registro', `${h.name} (${fmtShort(k)}): ${v} de ${h.goal}${h.unit ? ' ' + h.unit : ''}`, `cnt:${h.id}:${k}`);
    haptic(8);
    if (v === h.goal && Number(el.dataset.d) > 0) toast(`¡Meta de hoy cumplida en «${h.name}»!`, 'good');
    afterChange(h, k, before);
    persist(); render(true);
  },
  time: el => openTime(habitById(el.dataset.id)),
  habit: el => openHabit(el.dataset.id),
  new: () => { ui.edit = { ...newHabit({ color: COLORS[S.habits.length % COLORS.length] }), isNew: true }; ui.view = 'edit'; render(); window.scrollTo(0, 0); },
  'ed-cancel': () => { ui.edit = null; ui.view = null; render(); window.scrollTo(0, 0); },
  'ed-emoji': el => { ui.edit.emoji = el.dataset.v; render(true); },
  'ed-color': el => { ui.edit.color = el.dataset.v; render(true); },
  'ed-type': el => { ui.edit.type = el.dataset.v; if (ui.edit.type === 'count' && !ui.edit.unit) ui.edit.unit = 'veces'; render(true); },
  'ed-mode': el => { ui.edit.mode = el.dataset.v; render(true); },
  'ed-day': el => { const i = Number(el.dataset.i), d = ui.edit.days; ui.edit.days = d.includes(i) ? d.filter(x => x !== i) : [...d, i].sort(); render(true); },
  'ed-days': el => { ui.edit.days = el.dataset.v.split(',').map(Number); render(true); },
  'ed-step': el => { const k = el.dataset.k; ui.edit[k] = clamp(ui.edit[k] + Number(el.dataset.d), 1, k === 'weekly' ? 7 : 999); render(true); },
  'ed-save': () => {
    const e = ui.edit;
    e.name = e.name.trim();
    if (!e.name) { toast('Ponle un nombre al hábito'); $('#ed-name').focus(); return; }
    if (e.type !== 'weekly' && !e.days.length) { toast('Elige al menos un día'); return; }
    if (e.type === 'time' && !/^\d{2}:\d{2}$/.test(e.target)) { toast('Elige la hora meta'); return; }
    const { isNew, ...data } = e;
    const i = S.habits.findIndex(h => h.id === e.id);
    if (i >= 0) S.habits[i] = data; else S.habits.push(data);
    logEv('habito', `${isNew ? 'Hábito creado' : 'Hábito editado'}: ${data.name} (${TYPES[data.type].n.toLowerCase()})`);
    persist(); ui.edit = null; ui.view = null; render(); window.scrollTo(0, 0);
    toast(isNew ? '¡Hábito creado! Empieza hoy mismo.' : 'Cambios guardados', 'good');
  },
  cal: el => { const d = pk(ui.cal); d.setMonth(d.getMonth() + Number(el.dataset.d)); ui.cal = dk(d); render(true); },
  'cal-habit': el => { ui.calHabit = el.dataset.id; render(true); },
  'cal-day': el => openDay(el.dataset.k),
  'set-toggle': el => { const k = el.dataset.k; S.settings[k] = !S.settings[k]; logEv('ajustes', `${el.getAttribute('aria-label')}: ${S.settings[k] ? 'activado' : 'desactivado'}`); persist(); render(true); },
  'set-theme': el => { S.settings.theme = el.dataset.v; applyTheme(); logEv('ajustes', `Tema: ${el.textContent}`); persist(); render(true); },
  'open-exp': () => openExport(),
  'open-imp': () => openImport(),
  'open-log': () => openLog(),
  'open-archived': () => openArchived(),
  'open-install': () => openInstall(),
  'open-how': () => openHow(),
  'open-wipe': async () => {
    if (!await confirmBox({ title: '¿Borrar todos los datos?', text: 'Se eliminarán tus hábitos, registros, logros y el registro de actividad. Te recomendamos exportar un respaldo antes. No se puede deshacer.', ok: 'Borrar todo', danger: true })) return;
    S = freshState(); logEv('datos', 'Se borraron todos los datos y se restauraron los hábitos de ejemplo');
    persist(true); applyTheme(); ui.day = todayK(); ui.weekOf = weekK(ui.day); go('today'); toast('Datos borrados');
  },
};
const INPUT = {
  'ed-name': el => { ui.edit.name = el.value; const p = $('.ed-pname'); if (p) p.textContent = el.value || 'Tu hábito'; },
  'ed-unit': el => { ui.edit.unit = el.value.trim(); },
  'ed-why': el => { ui.edit.why = el.value.trim(); },
  'ed-target': el => { if (/^\d{2}:\d{2}$/.test(el.value)) { ui.edit.target = el.value; render(true); } },
  'ed-tol': el => { ui.edit.tol = Number(el.value); render(true); },
};

/* ---------- Eventos ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const act = el.dataset.act, layer = el.closest('.layer');
  if (act === 'close-layer') { closeLayer(layer || undefined); return; }
  if (layer && layer._acts[act]) { layer._acts[act](el, e, layer); return; }
  if (ACT[act]) ACT[act](el, e);
});
function onInput(e) {
  const el = e.target, f = el.dataset && el.dataset.f;
  if (!f) return;
  if (el.type === 'time') {
    // En el editor, la hora meta se aplica al cerrar la rueda; en la hoja de registro se previsualiza en vivo.
    if (f === 'ed-target' && e.type !== 'change') return;
  } else {
    const onChange = el.type === 'file' || el.tagName === 'SELECT';
    if ((e.type === 'change') !== onChange) return;
  }
  const layer = el.closest('.layer');
  if (layer && layer._acts['input:' + f]) { layer._acts['input:' + f](el, e, layer); return; }
  if (INPUT[f]) INPUT[f](el, e);
}
document.addEventListener('input', onInput);
document.addEventListener('change', onInput);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && layers.length) closeLayer(); });
let lastToday = null;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { flush(); return; }
  const t = todayK();
  if (lastToday && t !== lastToday) { if (ui.day === lastToday) { ui.day = t; ui.weekOf = weekK(t); } if (!layers.length) render(true); }
  lastToday = t;
});
window.addEventListener('pagehide', () => { flush(); });

let themeTouched = false;
function applyTheme() {
  const t = S.settings.theme, root = document.documentElement;
  if (t === 'auto') { if (themeTouched) root.removeAttribute('data-theme'); }
  else { root.dataset.theme = t; themeTouched = true; }
  const m = $('meta[name="theme-color"]');
  if (m) m.content = getComputedStyle(document.body).getPropertyValue('--bg').trim() || '#f2f4f1';
}

async function init() {
  await DB.init();
  const loaded = await DB.load();
  if (loaded) S = normalize(loaded);
  else { S = freshState(); logEv('datos', 'Brote instalado con 5 hábitos de ejemplo.'); persist(true); }
  lastToday = todayK();
  ui.day = lastToday; ui.weekOf = weekK(lastToday);
  applyTheme();
  render();
  try {
    if (navigator.storage && navigator.storage.persisted) {
      persisted = await navigator.storage.persisted();
      if (!persisted && navigator.storage.persist && window.navigator.standalone) persisted = await navigator.storage.persist();
    }
  } catch (e) { /* no disponible */ }
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost') && !inFrame) navigator.serviceWorker.register('sw.js').catch(() => {});
}
init();
