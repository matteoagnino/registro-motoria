import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { checkFiles, checkPath, checkContent } from '../../scripts/privacy-check.mjs';

describe('privacy-check', () => {
  test('blocca un file finto test.rmvoti.json', () => {
    expect(checkPath('test.rmvoti.json')).toHaveLength(1);
    expect(checkFiles(['test.rmvoti.json'], () => '{}').length).toBeGreaterThan(0);
  });
  test('blocca pacchetti, archivi, backup ed Excel fuori da riferimenti/', () => {
    for (const f of ['4AM.rmpack.json', 'registro-motoria-archivio.json', 'backup/x.json', 'dati/a.json', 'export/riepilogo.xlsx']) {
      expect(checkPath(f).length, f).toBeGreaterThan(0);
    }
    expect(checkPath('riferimenti/Registro_Motoria_MODELLO_classe4.xlsx')).toEqual([]);
  });
  test('blocca nomi non finti, ammette nomi finti', () => {
    const campo = 'cognome' + 'Nome'; // spezzato per non far scattare la guardia su questo file
    expect(checkContent('tests/x.json', `{"${campo}": "Nome Qualunque"}`)).toHaveLength(1);
    expect(checkContent('tests/x.js', "{ cognomeNome: 'Alunno Prova 01' }")).toEqual([]);
    expect(checkContent('tests/x.js', "{ cognomeNome: 'Rossi Mario (esempio)' }")).toEqual([]);
  });
  test('blocca URL esterni e API di rete nel codice runtime', () => {
    expect(checkContent('src/a.js', 'const u = "https://example.com/x"')).toHaveLength(1);
    expect(checkContent('src/a.js', 'fetch("/x")')).toHaveLength(1);
    expect(checkContent('src/a.js', 'const ns = "http://www.w3.org/2000/svg"')).toEqual([]);
    expect(checkContent('tests/a.js', 'fetch("https://example.com")')).toEqual([]);
  });
});

// Requisito CLAUDE.md §2.3: zero richieste di rete dal codice dell'app.
describe('nessuna richiesta di rete nel codice runtime', () => {
  const files = [];
  const walk = (d) => readdirSync(d).forEach((f) => {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p); else if (/\.(js|html|css)$/.test(p)) files.push(p);
  });
  walk('src');
  files.push('index.html');
  test.each(files)('%s', (f) => {
    expect(checkContent(f.startsWith('src') ? f : `src/${f}`, readFileSync(f, 'utf8'))).toEqual([]);
  });
});
