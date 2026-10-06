#!/usr/bin/env node
// Guardia anti-dati: blocca commit/push se compaiono file di dati degli alunni,
// nomi non palesemente finti o richieste di rete verso servizi esterni nel codice runtime.
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FORBIDDEN_PATHS = [
  { re: /\.rmpack\.json$/i, why: 'pacchetto classe (contiene nomi degli alunni)' },
  { re: /\.rmvoti\.json$/i, why: 'file voti (contiene valutazioni)' },
  { re: /archivio[^/]*\.json$/i, why: 'archivio del registro' },
  { re: /(^|\/)backup\//i, why: 'cartella backup' },
  { re: /(^|\/)dati\//i, why: 'cartella dati' }
];

// Nomi ammessi: solo palesemente finti.
const FAKE_NAME = /^(|Alunno Prova( \d+)?|Alunna Prova( \d+)?|.*\(esempio\)|Prova .*|Test .*|Finto .*)$/i;
const NAME_FIELD = /["']?cognomeNome["']?\s*:\s*["']([^"']*)["']/g;

const ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'www.w3.org'];
const URL_RE = /https?:\/\/([a-z0-9.-]+)/gi;
const NETWORK_API = /\b(fetch\s*\(|XMLHttpRequest|sendBeacon|new\s+WebSocket|EventSource\s*\()/;

const TEXT_EXT = /\.(js|mjs|cjs|json|html|css|md|txt|csv|svg|yml|yaml)$/i;

export function checkPath(path) {
  const v = [];
  for (const { re, why } of FORBIDDEN_PATHS) {
    if (re.test(path)) v.push(`${path}: ${why}`);
  }
  if (/\.xlsx$/i.test(path) && !path.startsWith('riferimenti/')) {
    v.push(`${path}: file Excel fuori da riferimenti/ (potrebbe contenere dati)`);
  }
  return v;
}

export function checkContent(path, text) {
  const v = [];
  for (const m of text.matchAll(NAME_FIELD)) {
    if (!FAKE_NAME.test(m[1].trim())) v.push(`${path}: nome non finto in cognomeNome ("${m[1].slice(0, 3)}…")`);
  }
  if (path.startsWith('src/')) {
    for (const m of text.matchAll(URL_RE)) {
      const host = m[1].toLowerCase();
      if (!ALLOWED_HOSTS.includes(host)) v.push(`${path}: URL esterno nel codice runtime (${host})`);
    }
    if (NETWORK_API.test(text)) v.push(`${path}: API di rete nel codice runtime`);
  }
  return v;
}

export function checkFiles(files, read) {
  const violations = [];
  for (const f of files) {
    violations.push(...checkPath(f));
    if (TEXT_EXT.test(f)) {
      const text = read(f);
      if (text != null) violations.push(...checkContent(f, text));
    }
  }
  return violations;
}

function gitList(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function candidateFiles() {
  const set = new Set([
    ...gitList('git ls-files'),
    ...gitList('git diff --cached --name-only --diff-filter=ACMR'),
    ...gitList('git ls-files --others --exclude-standard')
  ]);
  return [...set].filter((f) => !f.startsWith('node_modules/'));
}

function readSafe(f) {
  try {
    if (!existsSync(f) || statSync(f).size > 5_000_000) return null;
    return readFileSync(f, 'utf8');
  } catch {
    return null;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = candidateFiles();
  const violations = checkFiles(files, readSafe);
  if (violations.length) {
    console.error('✖ privacy-check FALLITO — non committare:\n' + violations.map((x) => '  - ' + x).join('\n'));
    process.exit(1);
  }
  console.log(`✔ privacy-check superato (${files.length} file controllati)`);
}
