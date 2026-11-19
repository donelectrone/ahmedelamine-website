/* Teacher Toolkit. No framework. All data stays on the device (localStorage).
   Text lives in i18n.js (English is the key, French and Arabic are the values). */
(() => {
'use strict';

/* ---------- constants & tiny helpers ---------- */
const KEY = 'teacher-toolkit.v1';
const APP_VER = '1.3.0';
/* Links shown in the About card. Leave one empty and its button is simply not shown. */
const LINKS = { website: 'https://ahmedelamine.com', instagram: '', youtube: '', whatsappChannel: '' };                           // when this changes, the stored data is copied aside once before anything else touches it
const CATCH_UP_DAYS = 31;                          // how far back finished sessions are counted after the app was closed
const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LONG_KEYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_KEYS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SCHOOL_DAYS = [0, 1, 2, 3, 4];             // Sunday to Thursday. Friday and Saturday are off.
// Default evaluation types. A programme file can bring its own list.
const SKILL_LABEL = { writing: 'Writing', grammar: 'Grammar', vocabulary: 'Vocabulary', reading: 'Reading', listening: 'Listening', speaking: 'Speaking', pronunciation: 'Pronunciation', homework: 'Homework' };
const RES = { A: { g: '✓', label: 'Acquis', w: 1 }, E: { g: '–', label: 'En cours', w: 0.5 }, N: { g: '×', label: 'Non acquis', w: 0 } };
const CYCLE = [null, 'A', 'E', 'N'];             // tap on a card: none -> green -> yellow -> red -> none
const MODES = [['eval', 'Evaluation'], ['present', 'Presence'], ['heat', 'Heatmap']];
const TABS = [['classes', 'Classes'], ['pupils', 'Pupils'], ['seating', 'Seating'], ['schedule', 'Schedule'], ['calendar', 'Calendar'], ['app', 'App']];
const COMMON_SUBJECTS = ['English', 'French', 'Arabic', 'Mathematics', 'Physics', 'Natural sciences', 'History', 'Geography', 'Islamic education', 'Civic education', 'Computer science'];
const LEVEL_GROUPS = [['Primary', ['1AP', '2AP', '3AP', '4AP', '5AP']], ['Middle school', ['1AM', '2AM', '3AM', '4AM']], ['Secondary', ['1AS', '2AS', '3AS']]];
const LANGS = [['ar', 'العربية'], ['fr', 'Français'], ['en', 'English']];
const T0 = 6 * 60, T1 = 20 * 60, PX = 14;

let state = null;                                 // set by load() below, read by t()
const lang = () => (state && state.settings && state.settings.lang) || 'en';
const t = (s, v) => {
  const d = typeof I18N !== 'undefined' ? I18N[lang()] : null;
  let o = (d && d[s]) || s;
  if (v) o = o.replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? ''));
  return o;
};
const dayS = i => t(DAY_KEYS[i]), dayL = i => t(DAY_LONG_KEYS[i]), monS = i => t(MONTH_KEYS[i]);
const detectLang = () => { const n = String(navigator.language || 'en').slice(0, 2); return n === 'ar' ? 'ar' : n === 'fr' ? 'fr' : 'en'; };

const $ = (s, el = document) => el.querySelector(s);
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) { if (kid == null || kid === false) continue; el.append(kid.nodeType ? kid : document.createTextNode(String(kid))); }
  return el;
}
const uid = () => Math.random().toString(36).slice(2, 9);
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtTime = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const sum = a => a.reduce((x, y) => x + y, 0);
function icon(name) {
  const p = {
    soundOn: '<path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    soundOff: '<path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M17 9.5l5 5M22 9.5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    moon: '<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" fill="currentColor"/>',
    sun: '<circle cx="12" cy="12" r="4.2" fill="currentColor"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    sliders: '<path d="M4 7h9M19 7h1M4 17h1M11 17h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="7" r="2.6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="17" r="2.6" fill="none" stroke="currentColor" stroke-width="2"/>',
    back: '<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    next: '<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'
  }[name];
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = p; return s;
}

/* ---------- school calendar: trimesters and days off ---------- */
/* Defaults for the Algerian school year (September to June). Teachers can change every date in the Calendar tab. */
function defaultTerms(d = new Date()) {
  const y = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;      // July and August already belong to the coming year
  return [{ from: `${y}-09-01`, to: `${y}-12-31` }, { from: `${y + 1}-01-01`, to: `${y + 1}-03-31` }, { from: `${y + 1}-04-01`, to: `${y + 1}-06-30` }];
}
function termsOk(a) {
  const ds = /^\d{4}-\d\d-\d\d$/;
  return Array.isArray(a) && a.length === 3 && a.every((x, i) => x && ds.test(x.from) && ds.test(x.to) && x.from <= x.to && (i === 0 || a[i - 1].to < x.from));
}
function normaliseCalendar(o) {
  o.daysOff = Array.isArray(o.daysOff) ? o.daysOff.filter(d => d && d.from && d.to && d.from <= d.to) : [];
  if (!termsOk(o.terms)) o.terms = defaultTerms();
}

/* ---------- programme helpers ---------- */
const lessonCache = {};
function lessonsOf(level) {
  if (lessonCache[level]) return lessonCache[level];
  const out = [], p = PROGRAMMES[level];
  if (p) for (const sq of p.sequences) for (const se of sq.sessions) for (const l of se.lessons) out.push({ ...l, seq: sq.id, session: se.id });
  return (lessonCache[level] = out);
}
function registerProgramme(p) { const key = p.id || p.level; p.id = key; PROGRAMMES[key] = p; delete lessonCache[key]; return key; }
/* A copy saved on the device only replaces the shipped programme when its "rev" is higher. Otherwise a stale copy
   would hide every lesson added later. Custom (placeholder) programmes only exist on the device, so they always load. */
function adoptProgramme(p) {
  const key = p.id || p.level, cur = PROGRAMMES[key];
  if (!cur || p.custom || (p.rev || 0) > (cur.rev || 0)) registerProgramme(p);
}
/* A class for a subject that has no programme file yet. It is upgraded by itself when the file appears. */
function makeCustomProgramme(subject, level) {
  return registerProgramme({ id: `custom-${level}-${uid()}`, custom: true, level, subject, sessionMinutes: 45, skills: [], sequences: [] });
}
const subjectLabel = s => t(s);
const progLabel = key => { const p = PROGRAMMES[key]; return p ? `${p.level}${p.subject ? ' · ' + subjectLabel(p.subject) : ''}` : key; };
const skillLabel = id => {
  const L = lang();
  for (const p of Object.values(PROGRAMMES)) { const s = (p.skills || []).find(x => x.id === id); if (s) return s[L] || t(s.label); }
  return t(SKILL_LABEL[id] || id);
};
const skillsOf = cls => { const p = PROGRAMMES[cls.level]; return p && p.skills && p.skills.length ? p.skills : Object.entries(SKILL_LABEL).map(([id, label]) => ({ id, label })); };
/* Default phases. A programme file can set its own with "stages": [{ "name": "...", "pct": 10 }, ...] */
function defaultStages(total, prog) {
  const base = prog && prog.stages && prog.stages.length ? prog.stages.map(s => [s.name, s.pct / 100]) : [['Warm-up', .1], ['Presentation', .3], ['Practice', .45], ['Wrap-up', .15]];
  const last = base.length - 1;
  let rest = total;
  return base.map(([name, p], i) => { const min = i === last ? Math.max(1, rest) : Math.max(1, Math.round(total * p)); rest -= min; return { name, min }; });
}

/* ---------- state ---------- */
function makeClass(name, level, names, opts = {}) {
  const prog = PROGRAMMES[level], lessons = lessonsOf(level);
  const pupils = names.map(n => ({ id: uid(), name: n }));
  const cols = 6, rows = 4, gaps = new Set(opts.gaps || []);
  let k = 0;
  const cells = Array.from({ length: cols * rows }, (_, i) => gaps.has(i) ? null : { p: pupils[k++]?.id ?? null });
  const upTo = opts.doneUpTo || 0;                      // lessons with id <= doneUpTo start as done (example data)
  const cls = { id: uid(), name, level, pupils, cols, rows, cells, done: lessons.filter(l => l.id <= upTo).map(l => l.id), sessionMin: prog.sessionMinutes, stages: defaultStages(prog.sessionMinutes, prog) };
  ensureSeats(cls); return cls;
}
/* Every active pupil must have a desk, otherwise they vanish from the main screen. Free desks are used first,
   then rows are added at the back of the class. Aisles (empty cells) are never filled. Returns 0 nothing changed, 1 seated, 2 desks added. */
const activePupils = cls => cls.pupils.filter(p => !p.archived);
function ensureSeats(cls) {
  const act = activePupils(cls), ids = new Set(act.map(p => p.id));
  let changed = 0;
  cls.cells.forEach(c => { if (c && c.p && !ids.has(c.p)) { c.p = null; changed = 1; } });   // archived pupils give their desk back
  const seated = new Set(cls.cells.filter(c => c && c.p).map(c => c.p));
  const left = act.filter(p => !seated.has(p.id));
  if (!left.length) return changed;
  for (const c of cls.cells) { if (!left.length) break; if (c && !c.p) { c.p = left.shift().id; changed = 1; } }
  while (left.length) {
    const row = Array.from({ length: cls.cols }, () => ({ p: left.length ? left.shift().id : null }));
    cls.cells = [...row, ...cls.cells]; cls.rows += 1; changed = 2;
  }
  return changed;
}
function blankState() {
  return { v: 3, example: false, progs: {}, classes: [], timetable: [], logs: [], doneKeys: {}, daysOff: [], terms: defaultTerms(), lastSeen: Date.now(), settings: { sound: false, theme: null, lang: detectLang(), lastBackup: Date.now(), setupDone: false } };
}
/* Example data is built from the programmes that are actually shipped (programmes.js), up to three classes,
   in level order. Nothing is hard-coded: change the programme files and the example follows. */
function exampleProgrammes() {
  const order = LEVEL_GROUPS.flatMap(g => g[1]), rank = p => { const i = order.indexOf(p.level); return i < 0 ? 99 : i; };
  return Object.values(PROGRAMMES).filter(p => p && !p.custom && lessonsOf(p.id || p.level).length)
    .sort((x, y) => rank(x) - rank(y) || String(x.subject).localeCompare(String(y.subject))).slice(0, 3);
}
function seed() {
  const progs = exampleProgrammes();
  if (!progs.length) return blankState();                    // no programme shipped yet: nothing to build an example from
  const names = ['Amine', 'Yasmine', 'Rayan', 'Lina', 'Anis', 'Ines', 'Walid', 'Sara', 'Mehdi', 'Nour', 'Zakaria', 'Hiba', 'Ilyes', 'Maya', 'Sofiane', 'Rania', 'Khaled', 'Imane', 'Oussama', 'Chaima', 'Bilal', 'Asma'];
  const taken = new Set(), classes = progs.map((p, i) => {
    const key = p.id || p.level, total = lessonsOf(key).length;
    let nm = ''; for (const L of 'ABCDEF') { nm = `${p.level}-${L}`; if (!taken.has(nm)) break; } taken.add(nm);
    const pupils = i === 0 ? names : [...names.slice(i * 3), ...names.slice(0, i * 3)].slice(0, 20 - i * 2);
    return makeClass(nm, key, pupils, { doneUpTo: Math.max(1, Math.round(total * [0.35, 0.15, 0.25][i])), gaps: i === 0 ? [8, 15] : [] });
  });
  const now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes(), tt = [];
  const dur = c => c.sessionMin, span = classes.reduce((n, c) => n + dur(c), 0) + 15 * (classes.length - 1);
  let at = clamp(Math.floor(nowMin / 15) * 15 - 15, 0, Math.max(0, 1380 - span));      // today: back to back, the first one already running
  classes.forEach(c => { tt.push({ id: uid(), classId: c.id, day: now.getDay(), start: at, dur: dur(c) }); at += dur(c) + 15; });
  SCHOOL_DAYS.filter(d => d !== now.getDay()).forEach(d => classes.forEach((c, i) => tt.push({ id: uid(), classId: c.id, day: d, start: 8 * 60 + i * 120, dur: dur(c) })));
  const logs = [], rnd = n => Math.floor(Math.random() * n);
  const motives = ['Helped a classmate', 'Great participation', 'Excellent homework', 'Very polite'];
  const bad = ['Chatting during the task', 'Forgot the book', 'Late to class'];
  for (const c of classes) {
    const ls = lessonsOf(c.level).filter(l => c.done.includes(l.id)), sk = skillsOf(c).map(x => x.id);
    for (const p of c.pupils) {
      const ability = 0.25 + Math.random() * 0.7;
      for (let i = 0, n = rnd(9); i < n; i++) {
        const l = ls[rnd(ls.length)], d = new Date(now - (1 + rnd(60)) * 864e5);
        const r = Math.random() < ability ? 'A' : (Math.random() < .6 ? 'E' : 'N');
        logs.push({ t: +d, date: ymd(d), type: 'eval', classId: c.id, pupilId: p.id, skill: sk[rnd(sk.length)], result: r, lessonId: l.id });
      }
      for (let i = 0, n = rnd(4); i < n; i++) { const d = new Date(now - (1 + rnd(40)) * 864e5); logs.push({ t: +d, date: ymd(d), type: 'star', classId: c.id, pupilId: p.id, motive: motives[rnd(4)], lessonId: ls[rnd(ls.length)].id }); }
      if (Math.random() < .3) { const d = new Date(now - (1 + rnd(40)) * 864e5); logs.push({ t: +d, date: ymd(d), type: 'warn', classId: c.id, pupilId: p.id, motive: bad[rnd(3)], lessonId: ls[rnd(ls.length)].id }); }
      if (Math.random() < .25) { const d = new Date(now - (1 + rnd(40)) * 864e5); logs.push({ t: +d, date: ymd(d), type: 'absent', classId: c.id, pupilId: p.id, lessonId: ls[rnd(ls.length)].id }); }
    }
  }
  return { v: 3, example: true, progs: Object.fromEntries(classes.map(c => [c.level, PROGRAMMES[c.level]])), classes, timetable: tt, logs, doneKeys: {}, daysOff: [], terms: defaultTerms(), lastSeen: Date.now(), settings: { sound: false, theme: null, lang: 'en', lastBackup: Date.now(), setupDone: true } };
}
function load() {
  try {
    const s = localStorage.getItem(KEY);
    if (s) {
      const o = JSON.parse(s);
      if (o && Array.isArray(o.classes)) {
        o.settings = o.settings || {};
        if (o.settings.appVer !== APP_VER) {              // safety copy before a new version touches the data
          try { localStorage.setItem(`${KEY}.pre-${o.settings.appVer || 'old'}`, s); } catch (e) { /* storage full: skip the copy */ }
          o.settings.appVer = APP_VER;
        }
        o.progs = o.progs || {}; Object.values(o.progs).forEach(adoptProgramme);
        Object.keys(o.progs).forEach(k => { if (PROGRAMMES[k] && !PROGRAMMES[k].custom) o.progs[k] = PROGRAMMES[k]; });
        o.classes.forEach(c => { if (!PROGRAMMES[c.level] && PROGRAMMES[c.level + '-english']) c.level += '-english'; });
        o.doneKeys = o.doneKeys || {}; normaliseCalendar(o);
        o.lastSeen = Number.isFinite(o.lastSeen) && o.lastSeen <= Date.now() ? o.lastSeen : Date.now();   // kept, so sessions that ended while the app was closed are counted
        o.settings.lang = o.settings.lang || detectLang();
        if (o.settings.setupDone === undefined) o.settings.setupDone = true;   // saved by an earlier version
        return o;
      }
    }
  } catch (e) { /* storage unavailable */ }
  return blankState();
}
state = load();
let saveTimer;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }, 150); }
const ui = { mode: 'eval', skill: null, round: 0, activeId: null, view: 'main', tab: 'classes', profileId: null, setCls: null, setup: null, schedDay: SCHOOL_DAYS.includes(new Date().getDay()) ? new Date().getDay() : 0, term: null, off: null };

const classById = id => state.classes.find(c => c.id === id);
const activeClass = () => classById(ui.activeId) || state.classes[0];
/* The current lesson is the first lesson after the latest one marked done. */
function curLesson(cls) {
  const ls = lessonsOf(cls.level); let last = -1;
  if (!ls.length) return { id: 0, title: 'No programme for this subject yet', skills: [], seq: 0, session: 0 };
  ls.forEach((l, i) => { if (cls.done.includes(l.id)) last = i; });
  return ls[Math.min(last + 1, ls.length - 1)];
}
function toggleDone(cls, id) { cls.done = cls.done.includes(id) ? cls.done.filter(x => x !== id) : [...cls.done, id]; save(); }

/* ---------- logs & scoring ---------- */
const today = () => ymd(new Date());
function addLog(o) { const e = { t: Date.now(), date: today(), ...o }; state.logs.push(e); save(); return e; }
const isAbsent = (cid, pid, date = today()) => state.logs.some(l => l.type === 'absent' && l.classId === cid && l.pupilId === pid && l.date === date);
const summons = (cid, pid) => { const ct = curTerm(); return state.logs.filter(l => l.type === 'eval' && l.classId === cid && l.pupilId === pid && termOf(l.date) === ct).length; };   // calls this trimester
/* A skill can be tested many times in one lesson: each test is a "round". */
const evalMatch = (l, cid, skill, lessonId) => l.type === 'eval' && l.classId === cid && l.skill === skill && l.lessonId === lessonId && l.date === today();
const findEval = (cid, pid, skill, lessonId, round) => state.logs.find(l => evalMatch(l, cid, skill, lessonId) && l.pupilId === pid && (l.round || 0) === round);
const latestRound = (cid, skill, lessonId) => Math.max(0, ...state.logs.filter(l => evalMatch(l, cid, skill, lessonId)).map(l => l.round || 0));
function setEval(cid, pid, skill, lessonId, round, result) {
  const e = findEval(cid, pid, skill, lessonId, round);
  if (e) { if (result) { e.result = result; e.t = Date.now(); } else state.logs.splice(state.logs.indexOf(e), 1); }
  else if (result) state.logs.push({ t: Date.now(), date: today(), type: 'eval', classId: cid, pupilId: pid, skill, result, lessonId, round });
  save();
}
/* Marks are per trimester. A date before the first trimester belongs to a previous school year and is left out.
   The year mark is the average of the trimester marks that have results. */
function termOf(date) {
  const T = state.terms; if (date < T[0].from) return -1;
  for (let i = 0; i < 3; i++) if (date <= T[i].to) return i;
  return 2;
}
const curTerm = () => Math.max(0, termOf(today()));
const viewTerm = () => ui.term == null ? curTerm() : ui.term;
const termLabel = k => k === 'year' ? t('Year') : t('T{n}', { n: k + 1 });
function termScore(cid, pid, skill, ti) {
  const ev = state.logs.filter(l => l.type === 'eval' && l.classId === cid && l.pupilId === pid && (!skill || l.skill === skill) && termOf(l.date) === ti);
  return ev.length ? sum(ev.map(l => RES[l.result].w)) / ev.length : null;
}
function scoreOf(cid, pid, skill, term = viewTerm()) {
  if (term !== 'year') return termScore(cid, pid, skill, term);
  const v = [0, 1, 2].map(i => termScore(cid, pid, skill, i)).filter(x => x != null);
  return v.length ? sum(v) / v.length : null;
}
function termChips(onPick) {
  const cur = viewTerm();
  return h('div', { class: 'tchips', role: 'group', 'aria-label': t('Trimesters') }, [0, 1, 2, 'year'].map(k => h('button', { class: 'chip sm', type: 'button', 'aria-pressed': String(cur === k), onclick: () => { ui.term = k; onPick(); } }, termLabel(k))));
}
// red (hue 0) -> orange -> yellow -> green (hue 128). Saturation and lightness come from --heat-s / --heat-l, so dark mode has its own.
function heatColor(s) { return `hsl(${Math.round(clamp(s, 0, 1) * 128)} var(--heat-s) var(--heat-l))`; }
// white -> light blue by how often a pupil was called, compared with the busiest pupil
const blueColor = f => `color-mix(in oklab, var(--h-blue) ${Math.round(f * 75)}%, var(--raised))`;
const fmt20 = s => (Math.round(s * 200) / 10).toString();

/* ---------- timetable & pacer maths (clock based, never counts ticks) ---------- */
const isOff = ds => state.daysOff.some(d => ds >= d.from && ds <= d.to);
const offInfo = ds => state.daysOff.find(d => ds >= d.from && ds <= d.to);
/* A day off has no sessions at all: the pacer stays idle, the next session skips it, and nothing is counted as taught. */
const slotsFor = d => isOff(ymd(d)) ? [] : state.timetable.filter(s => s.day === d.getDay()).sort((a, b) => a.start - b.start);
function slotStartDate(slot, date) { const d = new Date(date); d.setHours(0, slot.start, 0, 0); return d; }
const sKey = (slot, start) => `${slot.classId}|${ymd(start)}|${slot.start}`;
function scaledStages(cls, durMin) {
  const S = sum(cls.stages.map(s => s.min)), total = durMin * 60000;
  return cls.stages.map(s => ({ name: s.name, ms: s.min / S * total }));
}
function nextSession(now) {
  for (let i = 0; i < 8; i++) {
    const d = new Date(now); d.setDate(d.getDate() + i);
    for (const slot of slotsFor(d)) { const st = slotStartDate(slot, d); if (st > now) return { slot, start: st }; }
  }
  return null;
}
function getPacer(now) {
  for (const slot of slotsFor(now)) {
    const start = slotStartDate(slot, now); if (now < start) continue;
    const cls = classById(slot.classId); if (!cls) continue;
    const stages = scaledStages(cls, slot.dur), total = sum(stages.map(s => s.ms));
    const el = now - start;                       // 9:15 in a class that began at 8:45 gives 30 minutes
    if (el >= total) continue;
    let acc = 0, idx = 0;
    for (; idx < stages.length - 1; idx++) { if (el < acc + stages[idx].ms) break; acc += stages[idx].ms; }
    return { running: true, slot, cls, key: sKey(slot, start), stages, total, el, idx, stageStart: acc, stageEnd: acc + stages[idx].ms, next: nextSession(now) };
  }
  return { running: false, next: nextSession(now) };
}
function untilText(ms) {
  let m = Math.max(1, Math.ceil(ms / 60000));
  const d = Math.floor(m / 1440); m -= d * 1440; const hh = Math.floor(m / 60); m -= hh * 60;
  const parts = [];
  if (d) parts.push(t(d > 1 ? '{n} days' : '{n} day', { n: d }));
  if (hh) parts.push(t('{n} h', { n: hh }));
  if (m && !d) parts.push(t('{n} min', { n: m }));
  return parts.join(' ') || t('{n} min', { n: 1 });
}
function clock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000)), hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60;
  return hh ? `${hh}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}
/* When a class slot ends, its lesson turns green by itself (once). Sessions that ended while the app was closed
   (or the page was reloaded) are counted too: every day since the last visit is walked through in order. */
function processEnded(now) {
  const nowMs = +now, ls = Math.max(Number(state.lastSeen) || nowMs, nowMs - CATCH_UP_DAYS * 864e5);
  const marked = [], first = new Date(ls); first.setHours(0, 0, 0, 0);
  for (const d = new Date(first); d <= now; d.setDate(d.getDate() + 1)) {
    for (const slot of slotsFor(d)) {
      const st = slotStartDate(slot, d), en = +st + slot.dur * 60000, key = sKey(slot, st);
      if (en > nowMs || en <= ls || state.doneKeys[key] || en <= (slot.since || 0)) continue;   // slot.since: a slot made later never counts earlier days
      state.doneKeys[key] = 1;
      const cls = classById(slot.classId); if (!cls) continue;
      const l = curLesson(cls);
      if (l.id && !cls.done.includes(l.id)) { cls.done.push(l.id); marked.push([cls, l.id]); state.doneKeys[key] = 'L' + l.id; }   // remembers the lesson, so a day off added afterwards can take it back
    }
  }
  state.lastSeen = nowMs;
  if (!marked.length) return;
  save(); renderAll(); if (ui.view === 'settings') renderPanel();
  const undo = () => { marked.forEach(([cls, id]) => { cls.done = cls.done.filter(x => x !== id); }); save(); renderAll(); if (ui.view === 'settings') renderPanel(); };
  toast(marked.length === 1 ? t('Lesson {n} is done', { n: marked[0][1] }) : t('{n} sessions since your last visit were marked done', { n: marked.length }), undo);
  maybeSharePrompt();
}

/* ---------- toast, sound, wake lock ---------- */
let toastTimer;
function toast(msg, undo) {  // messages with Undo stay for 10 seconds
  const el = $('#toast'); el.replaceChildren(...[h('span', {}, msg), undo && h('button', { type: 'button', onclick: () => { undo(); el.hidden = true; } }, t('Undo'))].filter(Boolean));
  el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, undo ? 10000 : 3600);
}
let audio;
/* Five loud beeps in a row, so it is heard in a noisy classroom. */
function tone(force) {
  if (!state.settings.sound && !force) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const t0 = audio.currentTime;
    for (let i = 0; i < 5; i++) {
      const o = audio.createOscillator(), g = audio.createGain(), at = t0 + i * .32;
      o.type = 'square'; o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(.22, at + .01); g.gain.setValueAtTime(.22, at + .16); g.gain.exponentialRampToValueAtTime(.0001, at + .21);
      o.connect(g).connect(audio.destination); o.start(at); o.stop(at + .23);
    }
  } catch (e) { /* audio unavailable */ }
}
let lock = null;
async function wakeLock(want) {
  try {
    if (want && document.visibilityState === 'visible' && !lock && navigator.wakeLock) {
      lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; });
    } else if (!want && lock) { await lock.release(); lock = null; }
  } catch (e) { lock = null; }
}

/* ---------- modal ---------- */
let modals = [];
function modal(builder, opts = {}) {
  const api = {}, scrim = h('div', { class: 'scrim' }), sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' });
  scrim.append(sheet);
  api.sheet = sheet;
  api.close = () => { scrim.remove(); modals = modals.filter(m => m !== api); if (opts.onClose) opts.onClose(); };
  api.rerender = () => sheet.replaceChildren(...[].concat(builder(api)).filter(Boolean));
  scrim.addEventListener('pointerdown', e => { if (e.target === scrim) api.close(); });
  api.rerender(); document.body.append(scrim); modals.push(api);
  return api;
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modals.length) modals[modals.length - 1].close(); });

/* ---------- language, theme ---------- */
function applyLang() {
  const l = lang(), root = document.documentElement;
  root.lang = l; root.dir = l === 'ar' ? 'rtl' : 'ltr';
  const bl = $('#boardLabel'); if (bl) bl.textContent = 'Class Maestro';   // the name sits on the board strip, so it shows in every screenshot without taking space
}
function setLang(l) {
  state.settings.lang = l; save(); applyLang();
  lastMinute = null; pacerSig = null;
  renderAll(); if (ui.view !== 'main') renderPanel();
  tick();
}
const isDark = () => state.settings.theme ? state.settings.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
function applyTheme() { const th = state.settings.theme; if (th) document.documentElement.dataset.theme = th; else delete document.documentElement.dataset.theme; }
function toggleTheme() { state.settings.theme = isDark() ? 'light' : 'dark'; applyTheme(); save(); renderHeader(); }
function toggleSound() { state.settings.sound = !state.settings.sound; if (state.settings.sound) tone(true); save(); renderHeader(); }

/* ---------- header ---------- */
function openSettings(tab) { if (tab) ui.tab = tab; showView('settings'); }
function renderHeader() {
  const cls = activeClass(), dark = isDark();
  $('#hdr').replaceChildren(
    h('div', { class: 'when' }, h('span', { class: 'd', id: 'hdrDate' }), h('span', { class: 't', id: 'hdrTime' })),
    h('button', { class: 'cls-btn', type: 'button', 'aria-label': t('Class and schedule'), onclick: () => openSettings('schedule') },
      h('span', { class: 'cn' }, cls ? cls.name : t('No class')), icon('next')),
    h('button', { class: 'icon-btn', type: 'button', 'aria-pressed': String(!!state.settings.sound), 'aria-label': t('Sound at stage changes'), onclick: toggleSound }, icon(state.settings.sound ? 'soundOn' : 'soundOff')),
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('Light or dark theme'), onclick: toggleTheme }, icon(dark ? 'sun' : 'moon')),
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('Settings'), onclick: () => openSettings() }, icon('sliders'))
  );
  lastMinute = null; renderClock(new Date());
}
let lastMinute = null;
function renderClock(now) {
  const m = now.getMinutes(); if (m === lastMinute) return; lastMinute = m;
  const d = $('#hdrDate'), tm = $('#hdrTime'); if (!d) return;
  d.textContent = `${dayS(now.getDay())} ${now.getDate()} ${monS(now.getMonth())}`; tm.textContent = `${pad(now.getHours())}:${pad(m)}`;
}

/* ---------- pacer bar: stage dots live on the bar and can be dragged ---------- */
let pacerSig = null, pr = {}, lastStage = null;
const cumul = st => { const c = [0]; st.forEach(s => c.push(c[c.length - 1] + s.min)); return c; };
function buildPacer(p) {
  const el = $('#pacer');
  if (!p.running) {
    pr = { idle: h('b', {}), cls: h('span', {}) };
    el.className = 'pacer'; el.replaceChildren(h('div', { class: 'idle' }, pr.idle, pr.cls)); return;
  }
  const cls = p.cls;
  pr = {
    name: h('div', { class: 'stage-name' }), count: h('div', { class: 'count' }),
    segs: p.stages.map(() => h('span', { class: 'seg' }, h('i'))),
    labs: p.stages.map(() => h('span', { class: 'lab' })), left: h('span'), ends: h('span')
  };
  const track = h('div', { class: 'track' }, h('div', { class: 'segs' }, pr.segs));
  pr.dots = p.stages.slice(0, -1).map((_, j) => {
    const dot = h('div', { class: 'dot', role: 'slider', 'aria-label': t('Boundary after stage {n}', { n: j + 1 }) });
    let drag = false;
    dot.addEventListener('pointerdown', e => { e.preventDefault(); dot.setPointerCapture(e.pointerId); drag = true; });
    dot.addEventListener('pointermove', e => {
      if (!drag) return;
      const st = cls.stages, c = cumul(st), r = track.getBoundingClientRect();
      const m = clamp(Math.round((e.clientX - r.left) / r.width * c[c.length - 1]), c[j] + 1, c[j + 2] - 1);
      if (st[j].min !== m - c[j]) { st[j].min = m - c[j]; st[j + 1].min = c[j + 2] - m; tick(); }
    });
    ['pointerup', 'pointercancel'].forEach(ev => dot.addEventListener(ev, () => { if (drag) { drag = false; save(); } }));
    track.append(dot); return dot;
  });
  el.className = 'pacer';
  el.replaceChildren(h('div', { class: 'pacer-top' }, pr.name, pr.count), track, h('div', { class: 'slabs' }, pr.labs), h('div', { class: 'pmeta' }, pr.left, pr.ends));
}
function updatePacer(p, now) {
  const sig = p.running ? p.key + ':' + p.stages.length : 'idle';
  if (sig !== pacerSig) { pacerSig = sig; buildPacer(p); }
  if (!p.running) {
    const off = offInfo(ymd(now));
    if (off) { pr.idle.textContent = t('Day off') + (off.label ? ' · ' + off.label : ''); pr.cls.textContent = p.next ? t('Next session in {x}', { x: untilText(p.next.start - now) }) : ''; }
    else if (p.next) { pr.idle.textContent = t('Next session in {x}', { x: untilText(p.next.start - now) }); pr.cls.textContent = `${classById(p.next.slot.classId)?.name || ''} · ${dayS(p.next.start.getDay())} ${fmtTime(p.next.slot.start)}`; }
    else { pr.idle.textContent = t('No session scheduled'); pr.cls.textContent = t('Add one in the schedule'); }
    return;
  }
  pr.name.replaceChildren(t('Stage {a} of {b}', { a: p.idx + 1, b: p.stages.length }) + ' · ', h('em', {}, t(p.stages[p.idx].name)));
  pr.count.textContent = clock(p.stageEnd - p.el);
  let acc = 0;
  p.stages.forEach((s, i) => {
    const f = i < p.idx ? 1 : i === p.idx ? clamp((p.el - p.stageStart) / s.ms, 0, 1) : 0;
    pr.segs[i].style.flex = `${s.ms} 1 0`; pr.segs[i].firstChild.style.width = (f * 100).toFixed(2) + '%';
    pr.labs[i].style.flex = `${s.ms} 1 0`; pr.labs[i].textContent = t('{n} min', { n: Math.round(s.ms / 60000) }); pr.labs[i].classList.toggle('now', i === p.idx);
    acc += s.ms; if (pr.dots[i]) pr.dots[i].style.left = (acc / p.total * 100) + '%';
  });
  pr.left.textContent = t('{n} min left in the session', { n: Math.ceil((p.total - p.el) / 60000) });
  pr.ends.textContent = t('ends {time}', { time: fmtTime(p.slot.start + p.slot.dur) });
}
function cues(p) {
  const key = p.running ? `${p.key}:${p.idx}` : null;
  if (p.running && lastStage && lastStage.startsWith(p.key + ':') && lastStage !== key) {
    const el = $('#pacer'); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); tone();
  }
  lastStage = key;
}

/* ---------- main loop ---------- */
let lastPersist = 0;
function tick() {
  const now = new Date(), p = getPacer(now);
  const aid = p.running ? p.slot.classId : (p.next ? p.next.slot.classId : state.classes[0]?.id);
  if (aid !== ui.activeId) { ui.activeId = aid; renderAll(); }
  renderClock(now); updatePacer(p, now); cues(p); wakeLock(p.running); processEnded(now);
  if (now - lastPersist > 15000) { lastPersist = +now; save(); }
}

/* ---------- lesson strip and programme list ---------- */
function renderLesson() {
  const cls = activeClass(), box = $('#lesson');
  if (!cls) { box.replaceChildren(h('div', { class: 'txt' }, h('div', { class: 'ttl' }, t('No class yet')), h('div', { class: 'nums' }, t('Add one in Settings')))); return; }
  const l = curLesson(cls), done = l.id && cls.done.includes(l.id);
  box.replaceChildren(
    h('div', { class: 'txt' }, l.id ? h('div', { class: 'nums' }, t('Seq {a} · Session {b} · Lesson {c}', { a: l.seq, b: l.session, c: l.id })) : null,
      h('div', { class: 'ttl' }, l.id ? l.title : t(l.title), done && h('span', { class: 'ok' }, t('Done')))),
    h('button', { class: 'btn', type: 'button', onclick: () => openProgramme(cls) }, t('Change')));
}
/* When each remaining lesson will be taught if every timetable slot of the class is held. Days off are skipped,
   so a lesson that falls on a day off moves to the class's next session. */
function forecast(cls, now = new Date()) {
  const ls = lessonsOf(cls.level), at = {};
  if (!ls.length || !state.timetable.some(s => s.classId === cls.id)) return { at, end: null };
  let i = ls.findIndex(l => l.id === curLesson(cls).id), end = null;
  if (i < 0 || cls.done.includes(ls[i].id)) return { at, end: null };
  for (let k = 0; k < 400 && i < ls.length; k++) {
    const d = new Date(now); d.setDate(d.getDate() + k);
    for (const slot of slotsFor(d)) {
      if (slot.classId !== cls.id || i >= ls.length) continue;
      const st = slotStartDate(slot, d); if (+st + slot.dur * 60000 <= +now) continue;
      at[ls[i].id] = st; end = st; i++;
    }
  }
  return { at, end: i >= ls.length ? end : null };
}
const shortDate = d => `${dayS(d.getDay())} ${d.getDate()} ${monS(d.getMonth())}`;
/* All lessons of the level. Green = done, grey = still to do. Tap a lesson to switch it. */
function openProgramme(cls) {
  modal(api => {
    const ls = lessonsOf(cls.level), rows = [], summary = h('div', { class: 'sub' }), endNote = h('div', { class: 'sub' });
    const list = h('div', { class: 'lessons' });
    const refresh = () => {
      const cur = curLesson(cls);
      summary.textContent = ls.length ? t('{name} · {done} of {total} done · next is lesson {n}', { name: cls.name, done: cls.done.length, total: ls.length, n: cur.id }) : cls.name;
      const fc = forecast(cls);
      endNote.textContent = fc.end ? t('At this pace the last lesson falls on {d}.', { d: shortDate(fc.end) }) : '';
      rows.forEach(([l, b]) => { const d = cls.done.includes(l.id); b.className = 'lrow ' + (d ? 'done ' : '') + (l.id === cur.id && !d ? 'current' : ''); b.lastChild.textContent = d ? '✓' : ''; b.children[2].textContent = !d && fc.at[l.id] ? shortDate(fc.at[l.id]) : ''; });
      renderLesson();
    };
    ls.forEach(l => { const b = h('button', { type: 'button', onclick: () => { toggleDone(cls, l.id); refresh(); } }, h('span', { class: 'ln' }, l.id), h('span', {}, l.title), h('span', { class: 'ld' }), h('span', { class: 'ck' })); rows.push([l, b]); list.append(b); });
    refresh();
    setTimeout(() => { const c = rows.find(([l]) => l.id === curLesson(cls).id)?.[1]; if (c) list.scrollTop = c.offsetTop - list.clientHeight / 2 + c.clientHeight / 2; }, 0);
    if (!ls.length) return [h('h2', {}, t('Programme')), summary, h('div', { class: 'note' }, t('This class has no programme yet. It will appear automatically when it is available.')), h('button', { class: 'btn primary block', type: 'button', onclick: api.close }, t('Done'))];
    return [h('h2', {}, t('Programme')), summary, endNote, h('div', { class: 'legend' }, h('span', {}, h('i', { style: 'background:var(--good-bg)' }), t('Done')), h('span', {}, h('i', { style: 'background:var(--bg);border:1px solid var(--line)' }), t('To do')), h('span', {}, t('Tap a lesson to switch it'))),
      list, h('button', { class: 'btn primary block', type: 'button', onclick: api.close }, t('Done'))];
  }, { onClose: () => { renderAll(); if (ui.view === 'settings') renderPanel(); } });
}

/* ---------- modes, hint, grid ---------- */
function renderModes() {
  $('#modes').replaceChildren(...MODES.map(([k, label]) => h('button', { type: 'button', 'aria-pressed': String(ui.mode === k), onclick: () => setMode(k) }, t(label))));
}
function setMode(k) { ui.mode = k; renderModes(); renderSkills(); renderHint(); renderGrid(); }
/* Skill bubbles under the modes (Evaluation only). Picking one activates the tiles and the Whole class button with a short glow. */
function renderSkills() {
  const box = $('#skills'), cls = activeClass();
  box.hidden = ui.mode !== 'eval' || !cls; if (box.hidden) return;
  const tagged = curLesson(cls).skills, all = skillsOf(cls).map(x => x.id), order = [...tagged.filter(k => all.includes(k)), ...all.filter(k => !tagged.includes(k))];
  box.replaceChildren(...order.map(k => h('button', { class: 'chip' + (tagged.includes(k) ? ' tag' : ''), type: 'button', 'aria-pressed': String(ui.skill === k), onclick: () => {
    ui.skill = ui.skill === k ? null : k; ui.round = ui.skill ? latestRound(cls.id, ui.skill, curLesson(cls).id) : 0; renderSkills(); renderHint(); renderGrid();
    if (ui.skill) { const m = $('#viewMain'); m.classList.remove('glow'); void m.offsetWidth; m.classList.add('glow'); setTimeout(() => m.classList.remove('glow'), 1600); }
  } }, skillLabel(k))));
}
function renderHint() {
  const sk = ui.skill ? skillLabel(ui.skill) : '';
  const evalHint = !ui.skill ? t('Blue shows how often each pupil was called. Pick what you are testing above.')
    : ui.round ? t('Testing {skill} · test {n}. Tap a pupil: green, yellow, red, none.', { skill: sk, n: ui.round + 1 })
    : t('Testing {skill}. Tap a pupil: green, yellow, red, none.', { skill: sk });
  const text = { present: t('Tap a pupil to mark absent. Tap again to undo.'), eval: evalHint, heat: t('{t} mark out of 20. Red is low, green is high. Tap for the pupil card.', { t: termLabel(viewTerm()) }) }[ui.mode];
  const kids = [h('span', {}, text), ui.mode === 'heat' && termChips(() => { renderHint(); renderGrid(); }), ui.mode === 'eval' && h('div', { class: 'hbtns' }, h('button', { class: 'btn', type: 'button', disabled: !ui.skill, onclick: newTest }, t('New test')), h('button', { class: 'btn primary', type: 'button', disabled: !ui.skill, onclick: openWholeClass }, t('Whole class')))].filter(Boolean);
  $('#hint').replaceChildren(...kids);
}
function newTest() {
  const cls = activeClass(); if (!cls || !ui.skill) return;
  const lesson = curLesson(cls);
  if (!state.logs.some(l => evalMatch(l, cls.id, ui.skill, lesson.id) && (l.round || 0) === ui.round)) return toast(t('Nothing is recorded in this test yet'));
  ui.round = latestRound(cls.id, ui.skill, lesson.id) + 1; renderHint(); renderGrid(); toast(t('New {skill} test started', { skill: skillLabel(ui.skill) }));
}
function cardInfo(cls, p, absent, lesson, max) {
  if (absent && ui.mode !== 'heat') return { sub: t('Absent'), c: 'absent' };
  if (ui.mode === 'present') return { sub: t('Present') };
  if (ui.mode === 'heat') { const s = scoreOf(cls.id, p.id); return s == null ? { sub: t('no data') } : { sub: fmt20(s), c: 'heat', style: `background:${heatColor(s)}` }; }
  const e = ui.skill ? findEval(cls.id, p.id, ui.skill, lesson.id, ui.round) : null;
  if (e) return { sub: `${RES[e.result].g} ${t(RES[e.result].label)}`, c: 'r-' + e.result };
  const n = summons(cls.id, p.id);
  return { sub: n ? `${n}×` : t('not yet'), c: 'blue', style: `background:${blueColor(n / max)}` };
}
function renderGrid() {
  const cls = activeClass(), g = $('#grid'); g.replaceChildren();
  if (!cls) { g.append(h('p', { class: 'empty' }, t('Add a class in Settings to start.'))); return; }
  g.style.setProperty('--cols', cls.cols);
  const pm = Object.fromEntries(cls.pupils.map(p => [p.id, p])), lesson = curLesson(cls);
  const seat = ensureSeats(cls); if (seat) { save(); if (seat === 2) toast(t('Desks were added so every pupil has a seat')); g.style.setProperty('--cols', cls.cols); }
  const max = Math.max(1, ...activePupils(cls).map(p => summons(cls.id, p.id)));
  cls.cells.forEach(c => {
    const p = c && c.p && pm[c.p]; if (!p) { g.append(h('div', { class: 'gap' })); return; }
    const absent = isAbsent(cls.id, p.id), info = cardInfo(cls, p, absent, lesson, max);
    let timer, long = false;
    const card = h('button', { type: 'button', class: `card ${info.c || ''}`, style: info.style, 'aria-label': p.name },
      h('span', { class: 'nm' }, p.name), h('span', { class: 'sub' }, info.sub));
    card.addEventListener('pointerdown', () => { long = false; timer = setTimeout(() => { long = true; openProfile(p.id); }, 550); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => card.addEventListener(ev, () => clearTimeout(timer)));
    card.addEventListener('contextmenu', e => e.preventDefault());
    card.addEventListener('click', () => { if (long) { long = false; return; } tapCard(cls, p, absent, lesson); });
    g.append(card);
  });
}
function tapCard(cls, p, absent, lesson) {
  if (ui.mode === 'present') {
    if (absent) state.logs = state.logs.filter(l => !(l.type === 'absent' && l.classId === cls.id && l.pupilId === p.id && l.date === today()));
    else addLog({ type: 'absent', classId: cls.id, pupilId: p.id, lessonId: lesson.id });
    save(); renderGrid(); return;
  }
  if (ui.mode === 'heat' || !ui.skill) { openProfile(p.id); return; }
  if (absent) { toast(t('{p} is absent', { p: p.name })); return; }
  const cur = findEval(cls.id, p.id, ui.skill, lesson.id, ui.round)?.result || null;
  setEval(cls.id, p.id, ui.skill, lesson.id, ui.round, CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length]);
  renderGrid();
}

/* ---------- whole class evaluation ---------- */
/* "Got it right, except ..." or the opposite. Tap names to change them. */
function openWholeClass() {
  const cls = activeClass(); if (!cls || !ui.skill) return;
  const lesson = curLesson(cls);
  const present = cls.cells.filter(c => c && c.p).map(c => cls.pupils.find(p => p.id === c.p)).filter(p => p && !isAbsent(cls.id, p.id));
  let base = 'A'; const exc = {};
  modal(api => {
    const opp = base === 'A' ? 'N' : 'A';
    return [h('h2', {}, t('Whole class')), h('div', { class: 'sub' }, t('{skill} · {n} pupils present', { skill: skillLabel(ui.skill), n: present.length })),
      h('div', { class: 'two' },
        h('button', { class: 'choice', type: 'button', 'aria-pressed': String(base === 'A'), onclick: () => { base = 'A'; Object.keys(exc).forEach(k => delete exc[k]); api.rerender(); } }, t('Got it right')),
        h('button', { class: 'choice', type: 'button', 'aria-pressed': String(base === 'N'), onclick: () => { base = 'N'; Object.keys(exc).forEach(k => delete exc[k]); api.rerender(); } }, t('Got it wrong'))),
      h('div', {}, h('b', {}, base === 'A' ? t('Whole class got it right, except:') : t('Whole class got it wrong, except:'))),
      h('div', { class: 'pchips' }, present.map(p => h('button', {
        class: 'pchip r-' + (exc[p.id] || base), type: 'button',
        onclick: () => { if (!exc[p.id]) exc[p.id] = opp; else if (exc[p.id] === opp) exc[p.id] = 'E'; else delete exc[p.id]; api.rerender(); }
      }, p.name))),
      h('div', { class: 'note', style: 'font-size:12.5px;color:var(--muted)' }, opp === 'N' ? t('Tap a name: red, then yellow, then back.') : t('Tap a name: green, then yellow, then back.')),
      h('button', { class: 'btn primary block', type: 'button', onclick: () => {
        const before = present.map(p => [p.id, findEval(cls.id, p.id, ui.skill, lesson.id, ui.round)?.result || null]), sk = ui.skill, rd = ui.round;
        present.forEach(p => setEval(cls.id, p.id, sk, lesson.id, rd, exc[p.id] || base)); api.close(); renderGrid();
        toast(t('Whole class saved'), () => { before.forEach(([id, r]) => setEval(cls.id, id, sk, lesson.id, rd, r)); renderGrid(); });
      } }, t('Apply'))];
  });
}

/* ---------- views: main, pupil card, settings, setup ---------- */
function showView(v, arg) {
  ui.view = v; if (arg) ui.profileId = arg;
  const main = $('#viewMain'), panel = $('#viewPanel');
  $('#top').hidden = v === 'setup';
  if (v === 'main') { panel.hidden = true; main.hidden = false; $('#lesson').hidden = false; renderAll(); window.scrollTo(0, 0); return; }
  main.hidden = true; panel.hidden = false; $('#lesson').hidden = true; renderPanel(); window.scrollTo(0, 0);
}
function renderPanel() {
  const panel = $('#viewPanel'), v = ui.view;
  if (v === 'setup') { panel.replaceChildren(setupView()); return; }
  const titles = { profile: 'Pupil card', settings: 'Settings' };
  panel.replaceChildren(h('div', { class: 'panel-head' }, h('button', { class: 'back', type: 'button', onclick: () => showView('main') }, icon('back'), t('Back')), h('h1', {}, t(titles[v]))),
    v === 'profile' ? profileView() : settingsView());
}
const openProfile = pid => showView('profile', pid);

function profileView() {
  const cls = activeClass(), p = cls?.pupils.find(x => x.id === ui.profileId);
  if (!p) return h('p', { class: 'empty' }, t('Pupil not found.'));
  const vt = viewTerm(), inView = l => { const ti = termOf(l.date); return ti >= 0 && (vt === 'year' || ti === vt); };
  const allLogs = state.logs.filter(l => l.classId === cls.id && l.pupilId === p.id), logs = allLogs.filter(inView);
  const ranked = activePupils(cls).map(x => [x, scoreOf(cls.id, x.id)]).filter(r => r[1] != null).sort((a, b) => b[1] - a[1]);
  const ri = ranked.findIndex(r => r[0].id === p.id), score = scoreOf(cls.id, p.id);
  const count = ty => logs.filter(l => l.type === ty).length;
  const days = new Set(state.logs.filter(l => l.classId === cls.id && inView(l)).map(l => l.date)).size || 1;
  const att = Math.round((1 - Math.min(count('absent'), days) / days) * 100);
  const skills = [...new Set(logs.filter(l => l.type === 'eval').map(l => l.skill))].map(k => [k, scoreOf(cls.id, p.id, k)]);
  const weak = new Set(skills.filter(s => s[1] < .6).sort((a, b) => a[1] - b[1]).slice(0, 2).map(s => s[0]));
  const ws = new Date(); ws.setHours(0, 0, 0, 0); ws.setDate(ws.getDate() - ((ws.getDay() + 6) % 7));
  const weeks = Array.from({ length: 10 }, (_, i) => {
    const a = +ws - (9 - i) * 7 * 864e5, b = a + 7 * 864e5, ev = allLogs.filter(l => l.type === 'eval' && l.t >= a && l.t < b);
    const s = ev.length ? sum(ev.map(l => RES[l.result].w)) / ev.length : null;
    return h('div', { style: s == null ? '' : `background:${heatColor(s)}`, title: String(ev.length) }, s == null ? '' : Math.round(s * 20));
  });
  const entries = logs.filter(l => l.type !== 'pick').sort((a, b) => b.t - a.t).slice(0, 40).map(l => {
    const d = new Date(l.t), why = l.motive ? ` · ${l.motive}` : '';
    const lab = l.type === 'eval' ? `${skillLabel(l.skill)}: ${RES[l.result].g} ${t(RES[l.result].label)}` : l.type === 'star' ? `${t('★ Bon point')}${why}` : l.type === 'warn' ? `${t('! Warning')}${why}` : t('Absent');
    return h('div', { class: 'logrow' }, h('time', {}, `${d.getDate()} ${monS(d.getMonth())}`), h('span', {}, lab));
  });
  const absAll = allLogs.filter(l => l.type === 'absent'), perTerm = [0, 1, 2].map(i => new Set(absAll.filter(l => termOf(l.date) === i).map(l => l.date)).size);
  const absDates = [...new Set(logs.filter(l => l.type === 'absent').map(l => l.date))].sort().reverse();
  const motive = h('input', { class: 'field', id: 'motive', type: 'text', placeholder: t('Motive, e.g. helped a classmate'), maxlength: '80', 'aria-label': t('Motive') });
  const behave = type => () => {
    const entry = addLog({ type, classId: cls.id, pupilId: p.id, motive: motive.value.trim(), lessonId: curLesson(cls).id });
    toast(`${type === 'star' ? t('★ Bon point') : t('! Warning')} · ${p.name}`, () => { state.logs.splice(state.logs.indexOf(entry), 1); save(); renderPanel(); }); renderPanel();
  };
  return h('div', {}, termChips(renderPanel),
    h('div', { class: 'card-box' }, h('h3', {}, p.name), h('div', { class: 'note' }, ri >= 0 ? t('{c} · rank {a} of {b} for evaluation', { c: cls.name, a: ri + 1, b: ranked.length }) : t('{c} · no evaluations yet', { c: cls.name })),
      h('div', { class: 'kv' }, h('div', {}, h('b', {}, score == null ? '–' : fmt20(score)), h('span', {}, t('Mark /20'))), h('div', {}, h('b', {}, count('star')), h('span', {}, t('Bon points'))), h('div', {}, h('b', {}, count('warn')), h('span', {}, t('Warnings'))), h('div', {}, h('b', {}, att + '%'), h('span', {}, t('Attendance'))))),
    h('div', { class: 'card-box' }, h('h3', {}, t('Behaviour')), motive,
      h('div', { class: 'two' }, h('button', { class: 'btn block', type: 'button', onclick: behave('star') }, t('★ Bon point')), h('button', { class: 'btn danger block', type: 'button', onclick: behave('warn') }, t('! Warning')))),
    h('div', { class: 'card-box' }, h('h3', {}, t('Skills')), skills.length ? skills.map(([k, s]) => h('div', { class: 'skill-row' }, h('span', {}, skillLabel(k)), h('div', { class: 'bar' }, h('i', { style: `width:${Math.round(s * 100)}%` })), weak.has(k) ? h('span', { class: 'flag' }, t('Weak')) : h('span', {}, fmt20(s)))) : h('div', { class: 'note' }, t('Evaluate this pupil to see skill scores.'))),
    h('div', { class: 'card-box' }, h('h3', {}, t('Evaluation by week')), h('div', { class: 'weeks' }, weeks), h('div', { class: 'note' }, t('Last 10 weeks, oldest on the left. Mark out of 20.'))),
    h('div', { class: 'card-box' }, h('h3', {}, t('Absences')), h('div', { class: 'note' }, perTerm.map((n, i) => `${termLabel(i)}: ${n}`).join(' · ')),
      absDates.length ? h('div', { class: 'absdates' }, absDates.map(d => h('span', {}, fmtDay(d)))) : h('div', { class: 'note' }, t('No absences.'))),
    h('div', { class: 'card-box' }, h('h3', {}, t('Log')), entries.length ? entries : h('div', { class: 'note' }, t('Nothing logged yet.'))),
    h('div', { class: 'note', style: 'margin:0 2px 8px' }, t('Continuous assessment mark out of 20, per trimester: the average of its results (green = 20, yellow = 10, red = 0). The year mark is the average of the trimester marks.')));
}

function stepper(val, min, max, step, fmt, on, small) {
  const wrap = h('div', { class: 'stepper' + (small ? ' sm' : '') });
  const v = h('span', {}, fmt(val));
  const set = n => { val = clamp(n, min, max); v.textContent = fmt(val); on(val); };
  wrap.append(h('button', { class: 'mini', type: 'button', 'aria-label': t('Less'), onclick: () => set(val - step) }, '−'), v, h('button', { class: 'mini', type: 'button', 'aria-label': t('More'), onclick: () => set(val + step) }, '+'));
  return wrap;
}
function select(opts, val, on, id) {
  const s = h('select', { class: 'field', id }, opts.map(([v, l]) => h('option', { value: v, selected: String(v) === String(val) }, l)));
  s.addEventListener('change', () => on(s.value)); return s;
}

/* ---------- settings: one screen, five tabs ---------- */
function settingsView() {
  const tabs = h('div', { class: 'tabs ftabs', role: 'tablist' }, TABS.map(([k, label]) => h('button', { class: 'tab', type: 'button', role: 'tab', 'aria-selected': String(ui.tab === k), onclick: () => { ui.tab = k; renderPanel(); } }, t(label))));
  const body = { classes: tabClasses, pupils: tabPupils, seating: tabSeating, schedule: tabSchedule, calendar: tabCalendar, app: tabApp }[ui.tab] || tabClasses;
  setTimeout(() => tabs.querySelector('[aria-selected="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' }), 0);   // the chosen tab is always in view
  return h('div', {}, tabs, h('div', { class: 'fpanel tabpanel' }, body()));
}
function classChips() {
  if (!classById(ui.setCls)) ui.setCls = state.classes[0]?.id;
  return state.classes.length > 1 ? h('div', { class: 'chip-row' }, state.classes.map(c => h('button', { class: 'chip', type: 'button', 'aria-pressed': String(c.id === ui.setCls), onclick: () => { ui.setCls = c.id; renderPanel(); } }, c.name))) : null;
}
function needClass() {
  return h('div', { class: 'card-box' }, h('div', { class: 'note' }, t('Add a class first.')), h('button', { class: 'btn primary block', type: 'button', onclick: () => { ui.tab = 'classes'; renderPanel(); } }, t('Classes')));
}

function tabClasses() {
  const rows = state.classes.map(c => {
    const all = lessonsOf(c.level);
    const inp = h('input', { class: 'field', type: 'text', value: c.name, maxlength: '12', 'aria-label': t('Class name') });
    inp.addEventListener('change', () => { const n = inp.value.trim(); if (n) { c.name = n; save(); renderHeader(); } else inp.value = c.name; });
    const del = h('button', { class: 'mini', type: 'button', 'aria-label': t('Remove'), onclick: e => {
      const b = e.currentTarget;
      if (b.dataset.sure) { state.classes = state.classes.filter(x => x.id !== c.id); state.timetable = state.timetable.filter(s => s.classId !== c.id); state.logs = state.logs.filter(l => l.classId !== c.id); save(); ui.activeId = null; renderPanel(); tick(); }
      else { b.dataset.sure = '1'; b.textContent = '?'; toast(t('Tap again to remove {name} and its records', { name: c.name })); }
    } }, '×');
    return h('div', { class: 'cls-card' }, h('div', { class: 'crow2' }, inp, del),
      h('button', { class: 'prog-btn', type: 'button', onclick: () => openProgramme(c) },
        h('div', { class: 'form-row' }, h('span', { class: 'note' }, progLabel(c.level)), h('span', { class: 'note' }, all.length ? t('{done} of {total} lessons done', { done: c.done.length, total: all.length }) : t('No programme for this subject yet'))),
        h('div', { class: 'bar' }, h('i', { style: `width:${all.length ? Math.round(c.done.length / all.length * 100) : 0}%` }))));
  });
  return h('div', { class: 'card-box' }, h('h3', {}, t('My classes')), rows.length ? rows : h('div', { class: 'note' }, t('No classes yet.')),
    h('button', { class: 'btn primary block', type: 'button', onclick: () => startSetup('add') }, t('Add a class')),
    h('div', { class: 'note' }, t('Rename a class by editing its name. Tap the progress bar to see its lessons.')));
}

function tabPupils() {
  const cls = classById(ui.setCls) || state.classes[0]; if (!cls) return needClass();
  ui.setCls = cls.id;
  /* Pupils are edited in place by id, so fixing a typo keeps every record. A pupil who leaves is archived, never deleted. */
  const rows = activePupils(cls).map(p => {
    const inp = h('input', { class: 'field', type: 'text', value: p.name, maxlength: '30', 'aria-label': p.name });
    const del = h('button', { class: 'mini', type: 'button', 'aria-label': `${t('Archive')} ${p.name}`, onclick: () => archivePupil(cls, p) }, '×');
    inp.addEventListener('change', () => {
      const n = inp.value.trim().slice(0, 30);
      if (!n) { inp.value = p.name; return; }
      p.name = n; inp.value = n; inp.setAttribute('aria-label', n); del.setAttribute('aria-label', `${t('Archive')} ${n}`); save(); renderAll();
    });
    return h('div', { class: 'crow2' }, inp, del);
  });
  const arch = cls.pupils.filter(p => p.archived);
  const ta = h('textarea', { class: 'field', id: 'pupilNames', rows: '4', placeholder: t('Add pupils, one first name per line'), 'aria-label': t('Add pupils, one first name per line') });
  return h('div', {}, classChips(),
    h('div', { class: 'card-box' }, h('h3', {}, t('Pupils')), rows.length ? rows : h('div', { class: 'note' }, t('No pupils yet.')),
      h('div', { class: 'note' }, t('Rename a pupil by editing the name. Archive a pupil who leaves: their history stays.'))),
    h('div', { class: 'card-box' }, h('h3', {}, t('Add pupils')), ta,
      h('button', { class: 'btn primary block', type: 'button', onclick: () => { addPupils(cls, ta.value); renderPanel(); } }, t('Add pupils'))),
    arch.length ? h('div', { class: 'card-box' }, h('h3', {}, t('Archived pupils')),
      arch.map(p => h('div', { class: 'crow2' }, h('span', { class: 'field', style: 'border-style:dashed;color:var(--muted)' }, p.name), h('button', { class: 'btn', type: 'button', onclick: () => restorePupil(cls, p) }, t('Restore')))),
      h('div', { class: 'note' }, t('Archived pupils keep their history. Restore brings them back.'))) : null);
}
function tabSeating() {
  const cls = classById(ui.setCls) || state.classes[0]; if (!cls) return needClass();
  ui.setCls = cls.id;
  const pm = Object.fromEntries(cls.pupils.map(p => [p.id, p]));
  const grid = h('div', { class: 'sgrid', style: `--cols:${cls.cols}` }, cls.cells.map((c, i) => h('button', {
    type: 'button', class: 'scell ' + (c ? (c.p ? 'desk' : 'desk free') : ''), 'aria-label': `${t('Desk')} ${i + 1}`, onclick: () => deskTap(cls, i, renderPanel)
  }, c ? (c.p && pm[c.p] ? pm[c.p].name : t('free')) : '+')));
  return h('div', {}, classChips(), h('div', { class: 'card-box' }, h('h3', {}, t('Seating')),
    h('div', { class: 'two tight' }, h('div', { class: 'cell-lab' }, t('Columns'), stepper(cls.cols, 2, 10, 1, String, v => { resizeGrid(cls, v, cls.rows); afterResize(cls); }, true)), h('div', { class: 'cell-lab' }, t('Rows'), stepper(cls.rows, 1, 12, 1, String, v => { resizeGrid(cls, cls.cols, v); afterResize(cls); }, true))),
    grid, h('div', { class: 'board-label' }, t('Board')),
    h('div', { class: 'note' }, t('As you hold the phone: the top row is the back of the class, the board is at the bottom. Tap a cell to add a desk, seat someone or remove it.'))));
}
/* A smaller grid never hides a pupil: if desks were removed, rows come back as needed. */
function afterResize(cls) { const seat = ensureSeats(cls); save(); if (seat === 2) toast(t('Desks were added so every pupil has a seat')); renderPanel(); }
function tabSchedule() {
  if (!state.classes.length) return needClass();
  const day = ui.schedDay;
  const tl = h('div', { class: 'tl', style: `height:${(T1 - T0) / 15 * PX}px` });
  for (let m = T0; m <= T1; m += 15) { const y = (m - T0) / 15 * PX; tl.append(h('div', { class: 'ln' + (m % 60 === 0 ? ' h' : ''), style: `top:${y}px` })); if (m % 60 === 0) tl.append(h('div', { class: 'lb', style: `top:${y}px` }, fmtTime(m))); }
  state.timetable.filter(s => s.day === day).forEach(s => {
    const c = classById(s.classId); if (!c) return;
    tl.append(h('button', { class: 'blk', type: 'button', style: `top:${(s.start - T0) / 15 * PX}px;height:${s.dur / 15 * PX - 2}px`, onclick: () => openSlotEditor(s) }, `${c.name} · ${fmtTime(s.start)}–${fmtTime(s.start + s.dur)}`));
  });
  const now = new Date();
  if (day === now.getDay()) { const m = now.getHours() * 60 + now.getMinutes(); if (m >= T0 && m <= T1) tl.append(h('div', { class: 'now', style: `top:${(m - T0) / 15 * PX}px` })); }
  const scroller = h('div', { class: 'tl-scroll' }, tl);
  setTimeout(() => { scroller.scrollTop = Math.max(0, (Math.min(480, ...state.timetable.filter(s => s.day === day).map(s => s.start)) - T0) / 15 * PX - 20); }, 0);
  return h('div', { class: 'card-box' }, h('div', { class: 'form-row' }, h('h3', {}, t('Timetable')), h('button', { class: 'btn primary', type: 'button', onclick: () => openSlotEditor(null) }, t('Add to {day}', { day: dayL(day) }))),
    h('div', { class: 'chip-row' }, SCHOOL_DAYS.map(i => h('button', { class: 'chip', type: 'button', 'aria-pressed': String(i === day), onclick: () => { ui.schedDay = i; renderPanel(); } }, dayS(i)))),
    scroller, h('div', { class: 'note' }, t('Tap a slot to move or resize it in 15-minute steps.')));
}
function openSlotEditor(slot) {
  if (!state.classes.length) return toast(t('Add a class first.'));
  const day = slot ? slot.day : ui.schedDay, last = state.timetable.filter(s => s.day === day).reduce((m, s) => Math.max(m, s.start + s.dur), 0);
  const d = slot ? { ...slot } : { id: uid(), classId: (activeClass() || state.classes[0]).id, day, start: last ? Math.min(last, 1380) : 8 * 60, dur: 60 };
  const clash = () => state.timetable.find(s => s.day === day && (!slot || s.id !== slot.id) && d.start < s.start + s.dur && s.start < d.start + d.dur);
  modal(api => {
    const msg = h('div', { class: 'err' }), save1 = h('button', { class: 'btn primary block', type: 'button', onclick: () => {
      if (clash()) return;
      if (!slot || slot.classId !== d.classId || slot.start !== d.start || slot.dur !== d.dur) d.since = Date.now();   // a changed slot only counts from now on
      if (slot) Object.assign(slot, d); else state.timetable.push(d);
      save(); api.close(); renderPanel(); tick();
    } }, t('Save'));
    const check = () => { const c = clash(); msg.textContent = c ? t('Overlaps {c} ({a}–{b}). Move or shorten it.', { c: classById(c.classId)?.name || '', a: fmtTime(c.start), b: fmtTime(c.start + c.dur) }) : ''; save1.disabled = !!c; };
    const out = [h('h2', {}, `${slot ? t('Edit slot') : t('New slot')} · ${dayL(day)}`),
      h('div', { class: 'form-row' }, h('label', { for: 'slClass' }, t('Class')), select(state.classes.map(c => [c.id, c.name]), d.classId, v => { d.classId = v; }, 'slClass')),
      h('div', { class: 'form-row' }, h('label', {}, t('Start')), stepper(d.start, 0, 1425, 15, fmtTime, v => { d.start = v; check(); })),
      h('div', { class: 'form-row' }, h('label', {}, t('Length')), stepper(d.dur, 15, 240, 15, v => t('{n} min', { n: v }), v => { d.dur = v; check(); })),
      msg, save1,
      slot && h('button', { class: 'btn danger block', type: 'button', onclick: () => { state.timetable = state.timetable.filter(s => s.id !== slot.id); save(); api.close(); renderPanel(); tick(); } }, t('Delete slot'))];
    check(); return out;
  });
}
/* ---------- calendar: trimesters and days off ---------- */
function fmtDay(ds) { const [y, m, d] = ds.split('-').map(Number), dt = new Date(y, m - 1, d); return `${dayS(dt.getDay())} ${d} ${monS(m - 1)}`; }
const fmtRange = o => o.from === o.to ? fmtDay(o.from) : `${fmtDay(o.from)} → ${fmtDay(o.to)}`;
/* Sessions that were already counted on those days are taken back, so lesson 10 stays lesson 10. Returns how many were taken back. */
function addDayOff(from, to, label) {
  state.daysOff.push({ id: uid(), from, to, label: label.trim().slice(0, 40) });
  state.daysOff.sort((a, b) => a.from < b.from ? -1 : a.from > b.from ? 1 : 0);
  let back = 0;
  for (const [key, v] of Object.entries(state.doneKeys).sort()) {
    if (typeof v !== 'string' || v[0] !== 'L') continue;
    const [cid, date] = key.split('|'); if (date < from || date > to) continue;
    const cls = classById(cid);
    // The cancelled session never happened, so the class is one lesson further back: the latest lesson done goes back to "to do".
    if (cls && cls.done.length) { const top = Math.max(...cls.done); cls.done = cls.done.filter(x => x !== top); back++; }
    delete state.doneKeys[key];
  }
  save(); lastMinute = null; pacerSig = null; renderAll(); tick();
  return back;
}
function startNewYear() {
  state.terms = defaultTerms(); state.daysOff = state.daysOff.filter(d => d.to >= state.terms[0].from);
  state.classes.forEach(c => { c.done = []; }); ui.term = null;
  save(); renderAll(); renderPanel(); toast(t('New school year started'));
}
function tabCalendar() {
  const off = ui.off = ui.off || { from: today(), to: today(), label: '' }, T = state.terms, td = today();
  const dateInput = (val, label, on) => { const i = h('input', { class: 'field', type: 'date', value: val, 'aria-label': label }); i.addEventListener('change', () => on(i.value, i)); return i; };
  const termRows = T.map((tm, i) => {
    const mk = key => dateInput(tm[key], `${t('Trimester {n}', { n: i + 1 })} · ${key === 'from' ? t('From') : t('To')}`, (v, inp) => {
      const next = state.terms.map(x => ({ ...x })); next[i][key] = v;
      if (!v || !termsOk(next)) { inp.value = state.terms[i][key]; return toast(t('Dates must follow each other without overlap.')); }
      state.terms = next; save(); renderAll(); renderPanel();
    });
    return h('div', { class: 'term-row' }, h('b', {}, termLabel(i)), mk('from'), mk('to'));
  });
  const fromI = dateInput(off.from, t('From'), (v, inp) => { off.from = v; if (!off.to || off.to < v) { off.to = v; toI.value = v; } });
  const toI = dateInput(off.to, t('To'), v => { off.to = v; });
  const label = h('input', { class: 'field', type: 'text', maxlength: '40', value: off.label, placeholder: t('Reason (optional)'), 'aria-label': t('Reason (optional)') });
  label.addEventListener('input', () => { off.label = label.value; });
  const quick = n => () => { const d = new Date(); d.setDate(d.getDate() + n); off.from = off.to = ymd(d); renderPanel(); };
  const list = state.daysOff.map(o => h('div', { class: 'off-row' + (o.to < td ? ' past' : '') },
    h('div', { class: 't' }, fmtRange(o), o.label && h('small', {}, o.label)),
    h('button', { class: 'mini', type: 'button', 'aria-label': `${t('Remove')} ${fmtRange(o)}`, onclick: () => {
      state.daysOff = state.daysOff.filter(x => x !== o); save(); lastMinute = null; pacerSig = null; renderAll(); renderPanel(); tick();
      toast(t('Day off removed'), () => { state.daysOff.push(o); state.daysOff.sort((a, b) => a.from < b.from ? -1 : 1); save(); renderAll(); renderPanel(); tick(); });
    } }, '×')));
  return h('div', {},
    td > T[2].to && h('div', { class: 'card-box' }, h('h3', {}, t('A new school year?')), h('div', { class: 'note' }, t('The trimesters above have ended. Starting a new year sets new trimester dates and puts every class back at lesson 1. Pupils and all records are kept.')),
      h('button', { class: 'btn primary block', type: 'button', onclick: e => confirmTap(e, 'Tap again to start the new school year', startNewYear) }, t('Start a new school year'))),
    h('div', { class: 'card-box' }, h('h3', {}, t('Trimesters')), termRows,
      h('div', { class: 'note' }, t('Dates are a starting point: set them to your school\'s official calendar.')),
      h('button', { class: 'btn block', type: 'button', onclick: () => { state.terms = defaultTerms(); save(); renderAll(); renderPanel(); } }, t('Reset to default dates'))),
    h('div', { class: 'card-box' }, h('h3', {}, t('Days off')),
      h('div', { class: 'note' }, t('Sessions on these days do not count. The lesson moves to the next session.')),
      h('div', { class: 'tchips' }, h('button', { class: 'chip sm', type: 'button', onclick: quick(0) }, t('Today')), h('button', { class: 'chip sm', type: 'button', onclick: quick(1) }, t('Tomorrow'))),
      h('div', { class: 'two' }, h('div', {}, h('div', { class: 'note' }, t('From')), fromI), h('div', {}, h('div', { class: 'note' }, t('To')), toI)), label,
      h('button', { class: 'btn primary block', type: 'button', onclick: () => {
        if (!off.from || !off.to || off.to < off.from) return toast(t('The end date must be after the start date.'));
        const back = addDayOff(off.from, off.to, off.label); ui.off = null; renderPanel();
        toast(back ? t('Day off added · {n} lesson(s) put back to do', { n: back }) : t('Day off added'));
      } }, t('Save day off')),
      list.length ? list : h('div', { class: 'note' }, t('No days off yet.'))));
}
function tabApp() {
  const last = state.settings.lastBackup;
  return h('div', {},
    h('div', { class: 'card-box' }, h('h3', {}, t('Language')), h('div', { class: 'chips' }, LANGS.map(([k, name]) => h('button', { class: 'chip big', type: 'button', 'aria-pressed': String(lang() === k), onclick: () => setLang(k) }, name)))),
    aboutCard(),
    isStandalone() ? null : h('div', { class: 'card-box' }, h('h3', {}, t('Install on your phone')), h('div', { class: 'note' }, t('Your records are safer when the app is installed.')), installSteps()),
    h('div', { class: 'card-box' }, h('h3', {}, t('Weekly backup')),
      h('div', { class: 'note' }, last ? t('Last backup: {d} ({n} days ago).', { d: new Date(last).toLocaleDateString(), n: Math.floor((Date.now() - last) / 864e5) }) : t('No backup yet.')),
      h('button', { class: 'btn primary block', type: 'button', onclick: () => exportBackup() }, t('Save a backup file')),
      h('button', { class: 'btn block', type: 'button', onclick: openRestore }, t('Restore from a backup'))),
    h('div', { class: 'card-box' }, h('h3', {}, t('Start over')), h('div', { class: 'note' }, state.example ? t('The classes, pupils and timetable you see are examples.') : t('Replace everything with example data, or erase it all and run the setup again.')),
      h('button', { class: 'btn block', type: 'button', onclick: e => confirmTap(e, 'Tap again to replace all data', loadExample) }, t('Load example data')),
      h('button', { class: 'btn danger block', type: 'button', onclick: e => confirmTap(e, 'Tap again to erase everything', eraseAll) }, t('Erase everything and start again'))));
}
/* Sharing: the system share sheet where there is one (phones), otherwise a WhatsApp link. */
function shareApp() {
  const url = /^https?:/.test(location.href) ? location.origin + location.pathname.replace(/index\.html$/, '') + '?ref=share' : '';
  const text = t('I use Class Maestro in my classes. It keeps time for the lesson, shows who I have not called yet and records evaluations in one tap. Free, works offline, and the pupils\' data stays on my phone.');
  if (navigator.share) navigator.share({ title: 'Class Maestro', text, url: url || undefined }).catch(() => {});
  else window.open('https://wa.me/?text=' + encodeURIComponent(url ? `${text} ${url}` : text), '_blank', 'noopener');
}
/* Once, right after the third lesson the app closed for the teacher: the moment it has just proved itself. */
function maybeSharePrompt() {
  const total = sum(state.classes.map(c => c.done.length));
  if (state.example || state.settings.sharePrompted || total < 3) return;
  setTimeout(() => {
    if (modals.length || state.settings.sharePrompted) return;
    state.settings.sharePrompted = true; save();
    modal(api => [h('h2', {}, t('Useful so far?')), h('div', { class: 'sub' }, t('Send Class Maestro to one colleague. It takes ten seconds.')),
      h('button', { class: 'btn primary block', type: 'button', onclick: () => { api.close(); shareApp(); } }, t('Share on WhatsApp')), h('button', { class: 'btn block', type: 'button', onclick: api.close }, t('Later'))]);
  }, 5000);
}
function aboutCard() {
  const link = (href, label) => href ? h('a', { class: 'btn block', href, target: '_blank', rel: 'noopener' }, label) : null;
  return h('div', { class: 'card-box about' },
    h('h3', {}, 'Class Maestro'), h('p', { class: 'tagline' }, t('Teaching is an orchestra. You should not have to tune the instruments while you conduct.')),
    h('p', {}, t('I made Class Maestro for the teacher who watches the clock, remembers who has not spoken yet, records marks and keeps the noise down, all at once.')),
    h('p', {}, t('It keeps time for your lesson, shows who has been called the least, and records an evaluation in one tap, so you can put the phone down, look up and teach.')),
    h('p', {}, t('It works offline. Your pupils\' names and marks stay on this phone. No account, no subscription, free.')),
    h('p', { class: 'ask' }, t('If it took some stress off you today, send it to one colleague.')),
    h('button', { class: 'btn primary block', type: 'button', onclick: shareApp }, t('Share on WhatsApp')),
    link(LINKS.whatsappChannel, t('Get the next tool (WhatsApp channel)')), link(LINKS.instagram, 'Instagram'), link(LINKS.youtube, 'YouTube'),
    h('p', { class: 'note' }, t('Tell me which classroom headache to solve next.')),
    h('div', { class: 'note' }, t('Designed by Ahmed El Amine.'), ' ', LINKS.website && h('a', { href: LINKS.website, target: '_blank', rel: 'noopener' }, LINKS.website.replace(/^https?:\/\//, '')), ` · v${APP_VER}`));
}
function confirmTap(e, msgKey, fn) { const b = e.currentTarget; if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = t(msgKey); return; } fn(); }
function loadExample() {
  if (!exampleProgrammes().length) return toast(t('Add a programme file first: the example is built from it.'));
  const keep = { lang: lang(), theme: state.settings.theme, sound: state.settings.sound };
  state = seed(); Object.assign(state.settings, keep); save(); ui.activeId = null; ui.setCls = null; applyTheme(); applyLang(); showView('main'); tick();
}
function eraseAll() {
  const keep = { lang: lang(), theme: state.settings.theme, sound: state.settings.sound };
  state = blankState(); Object.assign(state.settings, keep); save(); ui.activeId = null; ui.setCls = null; applyTheme(); applyLang(); tick(); startSetup('first');
}
function addPupils(cls, text) {
  const taken = new Set(activePupils(cls).map(p => p.name.toLowerCase())); let added = 0, skipped = 0;
  text.split('\n').map(s => s.trim().slice(0, 30)).filter(Boolean).forEach(n => {
    if (taken.has(n.toLowerCase())) { skipped++; return; }
    taken.add(n.toLowerCase()); cls.pupils.push({ id: uid(), name: n }); added++;
  });
  const seat = ensureSeats(cls); save(); renderAll();
  toast(skipped ? t('{n} added, {m} already in the class', { n: added, m: skipped }) : seat === 2 ? t('Desks were added so every pupil has a seat') : t('Pupils saved'));
}
function archivePupil(cls, p) {
  p.archived = true; ensureSeats(cls); save(); renderAll(); renderPanel();
  toast(t('{p} archived', { p: p.name }), () => { delete p.archived; ensureSeats(cls); save(); renderAll(); renderPanel(); });
}
function restorePupil(cls, p) { delete p.archived; ensureSeats(cls); save(); renderAll(); renderPanel(); }
function resizeGrid(cls, cols, rows) {
  // Rows are added or removed at the back of the class (top of the grid); pupils near the board stay where they are.
  const cells = Array.from({ length: cols * rows }, () => null), off = cls.rows - rows;
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) { const or = r + off; if (or >= 0 && or < cls.rows && k < cls.cols) cells[r * cols + k] = cls.cells[or * cls.cols + k]; }
  cls.cols = cols; cls.rows = rows; cls.cells = cells; save();
}
function deskTap(cls, i, done) {
  const c = cls.cells[i];
  if (!c) { const seated = new Set(cls.cells.filter(x => x && x.p).map(x => x.p)), free = cls.pupils.find(p => !seated.has(p.id)); cls.cells[i] = { p: free ? free.id : null }; save(); return done(); }
  modal(api => [h('h2', {}, t('Desk')), h('div', { class: 'sub' }, t('Who sits here?')),
    h('div', { class: 'choice-list' }, [h('button', { class: 'choice', type: 'button', onclick: () => { c.p = null; save(); api.close(); done(); } }, t('Nobody (free desk)')),
      ...activePupils(cls).map(p => h('button', { class: 'choice', type: 'button', 'aria-pressed': String(c.p === p.id), onclick: () => { const j = cls.cells.findIndex(x => x && x.p === p.id); if (j >= 0 && j !== i) cls.cells[j].p = c.p; c.p = p.id; save(); api.close(); done(); } }, p.name))]),
    h('button', { class: 'btn danger block', type: 'button', onclick: () => { cls.cells[i] = null; save(); api.close(); done(); } }, t('Remove this desk'))]);
}

/* ---------- programme files: picked by subject and level, fetched in the background ---------- */
let progIndex = [];
async function loadProgIndex() {
  try { const r = await fetch('programmes/index.json', { cache: 'no-cache' }); if (!r.ok) throw 0; progIndex = await r.json(); localStorage.setItem('ttk.progIndex', JSON.stringify(progIndex)); }
  catch (e) { try { progIndex = JSON.parse(localStorage.getItem('ttk.progIndex') || '[]'); } catch (e2) { progIndex = []; } }
}
function validateProgramme(p) {
  if (!p || !Array.isArray(p.sequences) || !p.sequences.length) return 'The programme file has no "sequences".';
  if (!(p.sessionMinutes > 0)) return 'The programme file needs "sessionMinutes".';
  const ids = new Set(), sk = new Set((p.skills || []).map(x => x.id));
  for (const sq of p.sequences) for (const se of sq.sessions || []) for (const l of se.lessons || []) {
    if (!Number.isInteger(l.id) || !l.title) return 'Every lesson needs a whole-number "id" and a "title".';
    if (ids.has(l.id)) return `Lesson id ${l.id} is used twice.`;
    ids.add(l.id);
    if (sk.size) for (const k of l.skills || []) if (!sk.has(k)) return `Lesson ${l.id} uses the unknown skill "${k}".`;
  }
  if (!ids.size) return 'The programme file has no lessons.';
  if (p.stages && Math.round(p.stages.reduce((a, x) => a + x.pct, 0)) !== 100) return 'The "stages" percentages must add up to 100.';
  return null;
}
async function ensureProgramme(id) {
  if (PROGRAMMES[id]) return id;
  const e = progIndex.find(x => x.id === id); if (!e) throw new Error('Programme not found.');
  let p; try { const r = await fetch('programmes/' + e.file); if (!r.ok) throw 0; p = await r.json(); } catch (err) { throw new Error('Could not download that programme.'); }
  const bad = validateProgramme(p); if (bad) throw new Error(bad);
  p.id = p.id || e.id; return registerProgramme(p);
}
const sameSubject = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
function readyProg(subject, level) {
  const e = progIndex.find(x => x.level === level && sameSubject(x.subject, subject)); if (e) return e.id;
  const b = Object.values(PROGRAMMES).find(p => !p.custom && p.level === level && sameSubject(p.subject, subject)); return b ? b.id : null;
}
function knownSubjects() {
  const set = new Set(COMMON_SUBJECTS);
  progIndex.forEach(e => e.subject && set.add(e.subject));
  Object.values(PROGRAMMES).forEach(p => { if (!p.custom && p.subject) set.add(p.subject); });
  return [...set];
}
/* Programme files can grow after teachers have started. Each launch (online) fetches the files of the programmes in use and
   swaps in a newer one. Lesson ids are append-only (tools/validate-programmes.js checks it), so progress never shifts. */
async function refreshProgrammes() {
  const ids = [...new Set(state.classes.map(c => c.level))].filter(id => PROGRAMMES[id] && !PROGRAMMES[id].custom);
  let newer = false, changed = false;
  for (const id of ids) {
    const e = progIndex.find(x => x.id === id); if (!e) continue;
    try {
      const r = await fetch('programmes/' + e.file, { cache: 'no-cache' }); if (!r.ok) continue;
      const p = await r.json(); p.id = p.id || id;
      const cur = PROGRAMMES[id];
      if (validateProgramme(p) || (p.rev || 0) < (cur.rev || 0) || JSON.stringify(p) === JSON.stringify(cur)) continue;
      if ((p.rev || 0) > (cur.rev || 0)) newer = true;
      registerProgramme(p); state.progs = state.progs || {}; state.progs[id] = p; changed = true;
    } catch (err) { /* offline: the saved copy is used */ }
  }
  if (!changed) return;
  save(); renderAll(); if (ui.view === 'settings') renderPanel();
  if (newer) toast(t('Programmes updated'));
}
/* A class made before its programme existed is switched to the real programme as soon as it is published. */
async function upgradeCustom() {
  let changed = false;
  for (const c of state.classes) {
    const p = PROGRAMMES[c.level]; if (!p || !p.custom) continue;
    const id = readyProg(p.subject, p.level); if (!id) continue;
    try { const key = await ensureProgramme(id); state.progs = state.progs || {}; state.progs[key] = PROGRAMMES[key]; c.level = key; c.done = []; changed = true; toast(t('The programme for {c} is now available', { c: c.name })); } catch (e) { /* try again next time */ }
  }
  if (changed) { save(); renderAll(); if (ui.view === 'settings') renderPanel(); }
}

/* ---------- first launch / add a class: language, subject, level, name ---------- */
function startSetup(mode) {
  ui.setup = { mode, step: mode === 'first' ? 1 : 2, subject: null, other: '', levels: [], names: {}, busy: false };
  showView('setup');
}
function defaultClassName(level, taken) {
  for (let i = 0; i < 26; i++) { const n = `${level}-${String.fromCharCode(65 + i)}`; if (!taken.has(n)) return n; }
  return level;
}
function setupView() {
  const S = ui.setup, first = S.mode === 'first', total = first ? 4 : 3, n = first ? S.step : S.step - 1;
  const rerender = () => renderPanel();
  const subject = () => S.subject === '__other' ? S.other.trim() : S.subject;
  const wrap = h('div', { class: 'setup' });
  wrap.append(h('div', { class: 'step-ind' }, t('Step {a} of {b}', { a: n, b: total })), h('div', { class: 'dots' }, Array.from({ length: total }, (_, i) => h('i', { class: i < n ? 'on' : '' }))));
  let next = null, nextLabel = t('Next');

  if (S.step === 1) {
    wrap.append(h('h1', {}, 'Class Maestro'), h('p', { class: 'lead' }, 'اختر لغتك · Choisissez votre langue · Choose your language'),
      h('div', { class: 'choice-list' }, LANGS.map(([k, name]) => h('button', { class: 'choice big', type: 'button', 'aria-pressed': String(lang() === k), onclick: () => setLang(k) }, name))),
      h('button', { class: 'linkbtn', type: 'button', onclick: loadExample }, t('Try the app with example data')));
    next = () => { S.step = 2; rerender(); };
  } else if (S.step === 2) {
    const subs = knownSubjects();
    wrap.append(h('h1', {}, t('What do you teach?')),
      h('div', { class: 'chips' }, [...subs.map(s => h('button', { class: 'chip big', type: 'button', 'aria-pressed': String(S.subject === s), onclick: () => { S.subject = s; rerender(); } }, subjectLabel(s))),
        h('button', { class: 'chip big', type: 'button', 'aria-pressed': String(S.subject === '__other'), onclick: () => { S.subject = '__other'; rerender(); setTimeout(() => $('#otherSubject')?.focus(), 0); } }, t('Other…'))]));
    if (S.subject === '__other') {
      const inp = h('input', { class: 'field', id: 'otherSubject', type: 'text', maxlength: '30', placeholder: t('Subject name'), value: S.other, 'aria-label': t('Subject name') });
      inp.addEventListener('input', () => { S.other = inp.value; }); wrap.append(inp);
    }
    next = () => { if (!subject()) return toast(S.subject === '__other' ? t('Type the subject name') : t('Pick a subject')); S.step = 3; rerender(); };
  } else if (S.step === 3) {
    const sub = subject();
    wrap.append(h('h1', {}, t('Which levels do you teach?')), h('p', { class: 'lead' }, subjectLabel(sub)));
    LEVEL_GROUPS.forEach(([g, lv]) => wrap.append(h('div', { class: 'grp' }, t(g)),
      h('div', { class: 'chips' }, lv.map(l => h('button', { class: 'chip big' + (readyProg(sub, l) ? ' ready' : ''), type: 'button', 'aria-pressed': String(S.levels.includes(l)), onclick: () => { S.levels = S.levels.includes(l) ? S.levels.filter(x => x !== l) : [...S.levels, l]; rerender(); } }, l)))));
    wrap.append(h('div', { class: 'note' }, t('Green outline: programme ready. The others are filled in automatically when they are published.')));
    next = () => { if (!S.levels.length) return toast(t('Pick at least one level')); const taken = new Set(state.classes.map(c => c.name)); const order = LEVEL_GROUPS.flatMap(g => g[1]); S.levels.sort((a, b) => order.indexOf(a) - order.indexOf(b)); S.levels.forEach(l => { if (!S.names[l]) { S.names[l] = defaultClassName(l, taken); taken.add(S.names[l]); } }); S.step = 4; rerender(); };
  } else {
    wrap.append(h('h1', {}, t('Name your classes')), h('p', { class: 'lead' }, t('One class per level. You can add more later.')));
    S.levels.forEach(l => { const inp = h('input', { class: 'field', type: 'text', maxlength: '12', value: S.names[l] || '', 'aria-label': l }); inp.addEventListener('input', () => { S.names[l] = inp.value; }); wrap.append(h('div', { class: 'namerow' }, h('b', {}, l), inp)); });
    nextLabel = S.busy ? t('Setting up…') : (first ? t('Start') : t('Add'));
    next = finishSetup;
  }
  const minStep = first ? 1 : 2;
  wrap.append(h('div', { class: 'setup-foot' },
    S.step > minStep ? h('button', { class: 'btn', type: 'button', disabled: S.busy, onclick: () => { S.step -= 1; rerender(); } }, t('Back')) : (first ? null : h('button', { class: 'btn', type: 'button', onclick: () => openSettings('classes') }, t('Cancel'))),
    h('button', { class: 'btn primary', type: 'button', disabled: S.busy, onclick: () => next && next() }, nextLabel)));
  return wrap;
}
async function finishSetup() {
  const S = ui.setup; if (!S || S.busy) return;
  const subject = S.subject === '__other' ? S.other.trim() : S.subject;
  S.busy = true; renderPanel();
  let firstClass = null;
  for (const level of S.levels) {
    let key = null; const pid = readyProg(subject, level);
    if (pid) { try { key = await ensureProgramme(pid); } catch (e) { key = null; } }   // offline or file missing: a blank programme is used and upgraded later
    if (!key) key = makeCustomProgramme(subject, level);
    state.progs = state.progs || {}; state.progs[key] = PROGRAMMES[key];
    const c = makeClass((S.names[level] || '').trim() || defaultClassName(level, new Set(state.classes.map(x => x.name))), key, []);
    state.classes.push(c); firstClass = firstClass || c;
  }
  state.settings.setupDone = true; state.example = false; save();
  ui.setup = null; ui.activeId = null; ui.setCls = firstClass ? firstClass.id : null; ui.tab = 'pupils';
  openSettings('pupils'); tick();
  toast(t('Next: add your pupils and your timetable'));
}

/* ---------- backup & restore ---------- */
async function exportBackup() {
  const json = JSON.stringify(state), name = `class-maestro-${ymd(new Date())}.json`;
  let saved = false;
  try {
    const file = new File([json], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); saved = true; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  if (!saved) {
    try { const a = h('a', { href: URL.createObjectURL(new Blob([json], { type: 'application/json' })), download: name }); document.body.append(a); a.click(); a.remove(); saved = true; } catch (e) { /* fall through */ }
  }
  if (saved) { state.settings.lastBackup = Date.now(); save(); if (ui.view === 'settings') renderPanel(); }
  modal(api => [h('h2', {}, saved ? t('Backup saved') : t('Copy your backup')), h('div', { class: 'sub' }, t('If no file appeared, copy this text and keep it in a note or a file. Paste it under Restore to load it back.')),
    h('textarea', { class: 'field', id: 'bk', readonly: true, onfocus: e => e.target.select() }, json),
    h('div', { class: 'two' }, h('button', { class: 'btn block', type: 'button', onclick: () => { const ta = $('#bk'); ta.select(); navigator.clipboard?.writeText(ta.value).then(() => toast(t('Copied')), () => toast(t('Select the text and copy it'))); } }, t('Copy')),
      h('button', { class: 'btn primary block', type: 'button', onclick: () => { state.settings.lastBackup = Date.now(); save(); api.close(); if (ui.view === 'settings') renderPanel(); } }, t('Done')))]);
}
function openRestore() {
  modal(api => {
    const ta = h('textarea', { class: 'field', id: 'rs', placeholder: t('Paste backup text here') }), fi = h('input', { type: 'file', id: 'rsFile', accept: 'application/json,.json' });
    const apply = txt => {
      try {
        const o = JSON.parse(txt); if (!Array.isArray(o.classes) || !Array.isArray(o.timetable) || !Array.isArray(o.logs)) throw 0;
        state = o; state.progs = state.progs || {}; Object.values(state.progs).forEach(adoptProgramme); state.doneKeys = state.doneKeys || {}; normaliseCalendar(state); state.lastSeen = Date.now();
        state.settings = state.settings || {}; state.settings.lang = state.settings.lang || detectLang(); state.settings.setupDone = true;
        save(); ui.activeId = null; api.close(); applyTheme(); applyLang(); showView('main'); tick(); toast(t('Backup restored'));
      } catch (e) { toast(t('That does not look like a Class Maestro backup')); }
    };
    fi.addEventListener('change', () => { const f = fi.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => apply(String(r.result)); r.readAsText(f); });
    return [h('h2', {}, t('Restore a backup')), h('div', { class: 'sub' }, t('This replaces everything on this device.')), h('label', { for: 'rsFile' }, t('Backup file')), fi, ta,
      h('button', { class: 'btn danger block', type: 'button', onclick: () => apply(ta.value) }, t('Restore from pasted text')), h('button', { class: 'btn block', type: 'button', onclick: api.close }, t('Cancel'))];
  });
}
/* iPhone has no install prompt. Without "Add to Home Screen" Safari may also clear the saved data after weeks of no use. */
const isStandalone = () => !!(navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches));
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function installSteps() { return h('div', { class: 'note' }, t('On iPhone: tap Share, then Add to Home Screen. On Android: open the browser menu, then Install app.')); }
function maybeInstallHint() {
  if (!state.settings.setupDone || !state.classes.length || state.settings.installHint || isStandalone() || !isIOS() || modals.length || ui.view === 'setup') return;
  state.settings.installHint = true; save();
  modal(api => [h('h2', {}, t('Install on your phone')), h('div', { class: 'sub' }, t('Your records are safer when the app is installed.')), installSteps(), h('button', { class: 'btn primary block', type: 'button', onclick: api.close }, t('Got it'))]);
}
function checkBackupDue() {
  if (!state.settings.setupDone) return;
  const last = state.settings.lastBackup || 0;
  if (Date.now() - last < 7 * 864e5) return;
  modal(api => [h('h2', {}, t('Weekly backup due')), h('div', { class: 'sub' }, t('Your records live only on this device. Save a backup file to Files, iCloud or Drive.')),
    h('button', { class: 'btn primary block', type: 'button', onclick: () => { api.close(); exportBackup(); } }, t('Save backup now')), h('button', { class: 'btn block', type: 'button', onclick: api.close }, t('Later'))]);
}

/* ---------- boot ---------- */
function renderAll() { renderHeader(); renderLesson(); renderModes(); renderSkills(); renderHint(); renderGrid(); }
applyTheme(); applyLang();
ui.activeId = (() => { const p = getPacer(new Date()); return p.running ? p.slot.classId : (p.next ? p.next.slot.classId : state.classes[0]?.id); })();
renderAll(); tick();
if (!state.settings.setupDone && !state.classes.length) startSetup('first');
setInterval(tick, 1000);
['focus', 'pageshow'].forEach(ev => window.addEventListener(ev, tick));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); else tick(); });
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }
try { if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {}); } catch (e) { /* ignore */ }
setTimeout(checkBackupDue, 800);
loadProgIndex().then(() => { upgradeCustom().then(refreshProgrammes); if (ui.view === 'settings' || ui.view === 'setup') renderPanel(); });
setTimeout(maybeInstallHint, 2500);
})();
