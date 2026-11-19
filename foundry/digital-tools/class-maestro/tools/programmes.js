#!/usr/bin/env node
/* Programme tool. The JSON files in programmes/ are the only source of truth.

   node tools/programmes.js                    check every programme file
   node tools/programmes.js --build            check, then regenerate programmes.js (the copy bundled for first launch and offline use)
   node tools/programmes.js --against <dir>    also compare with an older copy of programmes/ (the one teachers already have):
                                               lesson ids must stay append-only, and "rev" must go up when anything changed

   Run it after every change to a programme file, and before publishing. It exits with code 1 when something is wrong. */
'use strict';
const fs = require('fs'), path = require('path');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'programmes');
const args = process.argv.slice(2);
const build = args.includes('--build');
const ai = args.indexOf('--against');
const againstDir = ai >= 0 ? path.resolve(args[ai + 1] || '') : null;

const errors = [], warnings = [];
const err = (f, m) => errors.push(`${f}: ${m}`);
const warn = (f, m) => warnings.push(`${f}: ${m}`);
const isInt = n => Number.isInteger(n);
const readJSON = (p, f) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { err(f, `cannot read or parse (${e.message})`); return null; } };
const lessonsOf = p => p.sequences.flatMap(sq => sq.sessions.flatMap(se => se.lessons));
function similarity(a, b) {            // 1 = identical, 0 = nothing in common (edit distance, case-insensitive)
  a = a.toLowerCase(); b = b.toLowerCase();
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - d[a.length][b.length] / Math.max(a.length, b.length, 1);
}

function checkProgramme(f, p, entry) {
  if (!p || typeof p !== 'object') return;
  for (const k of ['id', 'level', 'subject', 'lang']) if (!p[k] || typeof p[k] !== 'string') err(f, `"${k}" is missing`);
  if (entry) for (const k of ['id', 'level', 'subject']) if (p[k] !== entry[k]) err(f, `"${k}" is "${p[k]}" but index.json says "${entry[k]}"`);
  if (f !== `${p.id}.json`) warn(f, `file name should be "${p.id}.json"`);
  if (!isInt(p.rev) || p.rev < 1) err(f, '"rev" must be a whole number from 1. Raise it every time the file changes.');
  if (!(p.sessionMinutes > 0)) err(f, '"sessionMinutes" is missing. It sets the length of the pacer.');
  else if (![30, 45, 50, 55, 60, 90].includes(p.sessionMinutes)) warn(f, `sessionMinutes is ${p.sessionMinutes}: check this is the real session length`);

  if (!Array.isArray(p.stages) || !p.stages.length) err(f, '"stages" is missing');
  else {
    const total = p.stages.reduce((a, s) => a + (Number(s.pct) || 0), 0);
    if (Math.round(total) !== 100) err(f, `stage percentages add up to ${total}, not 100`);
    p.stages.forEach((s, i) => { if (!s.name || !(s.pct > 0)) err(f, `stage ${i + 1} needs a "name" and a "pct" above 0`); });
  }

  const skillIds = new Set();
  if (!Array.isArray(p.skills) || !p.skills.length) err(f, '"skills" is missing');
  else p.skills.forEach(s => {
    if (!s.id || !s.label) err(f, 'every skill needs an "id" and a "label"');
    else if (skillIds.has(s.id)) err(f, `skill "${s.id}" is listed twice`);
    else skillIds.add(s.id);
  });

  if (!Array.isArray(p.sequences) || !p.sequences.length) { err(f, '"sequences" is missing'); return; }
  const seqIds = new Set(), sesIds = new Set(), titles = new Set();
  let expected = 1;
  for (const sq of p.sequences) {
    if (!isInt(sq.id) || seqIds.has(sq.id)) err(f, `sequence id ${sq.id} is not a unique whole number`);
    seqIds.add(sq.id);
    if (!Array.isArray(sq.sessions) || !sq.sessions.length) { err(f, `sequence ${sq.id} has no sessions`); continue; }
    for (const se of sq.sessions) {
      if (!isInt(se.id) || sesIds.has(se.id)) err(f, `session id ${se.id} (sequence ${sq.id}) is not a unique whole number`);
      sesIds.add(se.id);
      if (!Array.isArray(se.lessons) || !se.lessons.length) { err(f, `session ${se.id} has no lessons`); continue; }
      for (const l of se.lessons) {
        if (l.id !== expected) err(f, `lesson id ${l.id} found where ${expected} was expected. Ids run 1, 2, 3... in order, no gaps.`);
        expected = (isInt(l.id) ? l.id : expected) + 1;
        if (!l.title || typeof l.title !== 'string' || !l.title.trim()) err(f, `lesson ${l.id} has no title`);
        else if (l.title.length > 60) warn(f, `lesson ${l.id} title is ${l.title.length} characters: it may wrap on a phone`);
        if (l.title && titles.has(l.title.toLowerCase())) warn(f, `lesson ${l.id}: the title "${l.title}" is used twice`);
        if (l.title) titles.add(l.title.toLowerCase());
        if (!Array.isArray(l.skills) || !l.skills.length) warn(f, `lesson ${l.id} has no skills`);
        else for (const k of l.skills) if (!skillIds.has(k)) err(f, `lesson ${l.id} uses the skill "${k}", which is not in "skills"`);
      }
    }
  }
}

function checkAgainst(f, p, oldP) {
  if (!p || !oldP || !Array.isArray(p.sequences) || !Array.isArray(oldP.sequences)) return;
  const a = lessonsOf(oldP), b = lessonsOf(p);
  let changed = JSON.stringify(oldP) !== JSON.stringify(p);
  if (b.length < a.length) err(f, `has ${b.length} lessons, the published file has ${a.length}. Lessons must never be removed.`);
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i].id !== b[i].id) { err(f, `lesson at position ${i + 1} was id ${a[i].id}, now ${b[i].id}. Ids must never be renumbered: every teacher's progress is stored by id.`); break; }
    if (a[i].title !== b[i].title) {
      // Ids always run 1..N, so a lesson inserted in the middle looks fine by id alone. The title gives it away:
      // a small edit is a typo fix, anything else means the lesson under this id is now a different one.
      const sim = similarity(a[i].title, b[i].title);
      const msg = `lesson ${a[i].id} was "${a[i].title}" and is now "${b[i].title}"`;
      if (sim < 0.6) err(f, `${msg}. That looks like a different lesson under the same id, so teachers who finished it would lose their place. Add new lessons at the END only.`);
      else warn(f, `${msg} (small edit, accepted as a fix)`);
    }
  }
  if (changed && !(p.rev > oldP.rev)) err(f, `changed since the published file, so "rev" must go up (published: ${oldP.rev}, now: ${p.rev}). Without it teachers keep the old copy.`);
}

const indexPath = path.join(dir, 'index.json');
const index = readJSON(indexPath, 'index.json');
const programmes = {};
if (Array.isArray(index)) {
  const seen = new Set();
  for (const e of index) {
    if (!e.id || !e.file || !e.level || !e.subject) { err('index.json', `entry ${JSON.stringify(e)} needs id, file, level and subject`); continue; }
    if (seen.has(e.id)) err('index.json', `"${e.id}" is listed twice`);
    seen.add(e.id);
    const p = fs.existsSync(path.join(dir, e.file)) ? readJSON(path.join(dir, e.file), e.file) : (err('index.json', `"${e.file}" does not exist`), null);
    if (!p) continue;
    checkProgramme(e.file, p, e); programmes[e.id] = p;
    if (againstDir) {
      const op = path.join(againstDir, e.file);
      if (fs.existsSync(op)) checkAgainst(e.file, p, readJSON(op, `${againstDir}/${e.file}`)); else warn(e.file, 'new file (not in the published copy)');
    }
  }
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.json') && f !== 'index.json' && !index.some(e => e.file === f)) warn(f, 'is not listed in index.json, so the app will never offer it');
} else if (index !== null) err('index.json', 'must be a list');

warnings.forEach(w => console.log('warning  ' + w));
errors.forEach(e => console.log('ERROR    ' + e));
const n = Object.keys(programmes).length;
console.log(errors.length ? `\n${errors.length} error(s). Fix them before publishing.` : `\nOK: ${n} programme file(s), ${Object.values(programmes).reduce((s, p) => s + lessonsOf(p).length, 0)} lessons.`);

if (build && !errors.length) {
  const out = '/* GENERATED by tools/programmes.js --build from programmes/*.json. Do not edit by hand.\n   Bundled so the first launch and the example data work offline. Newer versions arrive from programmes/ at runtime. */\n'
    + 'const PROGRAMMES = ' + JSON.stringify(programmes) + ';\n';
  fs.writeFileSync(path.join(root, 'programmes.js'), out);
  console.log('programmes.js regenerated.');
  // The service worker pre-caches exactly the programmes that exist, and its cache name changes with their content,
  // so a programme removed or edited here also disappears or refreshes on phones that already installed the app.
  const swPath = path.join(root, 'sw.js');
  if (fs.existsSync(swPath)) {
    const hash = require('crypto').createHash('sha1').update(out + JSON.stringify(index)).digest('hex').slice(0, 8);
    const files = ['./programmes/index.json', ...index.map(e => './programmes/' + e.file)];
    const block = `/* BUILD:START written by tools/programmes.js --build. Do not edit. */\nconst BUILD = '${hash}';\nconst PROGRAMME_FILES = ${JSON.stringify(files)};\n/* BUILD:END */`;
    const sw = fs.readFileSync(swPath, 'utf8');
    if (/\/\* BUILD:START[\s\S]*?BUILD:END \*\//.test(sw)) { fs.writeFileSync(swPath, sw.replace(/\/\* BUILD:START[\s\S]*?BUILD:END \*\//, block)); console.log('sw.js updated (' + files.length + ' programme files, build ' + hash + ').'); }
    else console.log('warning  sw.js has no BUILD block: copy the new sw.js first.');
  }
}
process.exit(errors.length ? 1 : 0);
