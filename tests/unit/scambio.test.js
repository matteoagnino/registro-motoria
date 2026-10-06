import { describe, test, expect } from 'vitest';
import { creaStatoIniziale } from '../../src/dati/seed.js';
import * as A from '../../src/dati/azioni.js';
import { creaPacchetto, leggiPacchetto, leggiFileVoti, analizzaImport, applicaImport } from '../../src/dati/scambio.js';
import { campoVuoto, importaPacchetto, campoLivello, campoStato, esportaVoti, daEsportare } from '../../src/dati/campo.js';
import { riepilogoClasse } from '../../src/dati/selettori.js';

const mac = () => A.importaElencoAlunni(creaStatoIniziale(), '4BM', ['Alunno Prova 01', 'Alunno Prova 02', 'Alunno Prova 03']);
const tick = (ms) => new Date(Date.UTC(2026, 10, 2, 10, 0, 0) + ms);

function registraSuIpad(campo, alunnoId, so, livelli) {
  return livelli.reduce((c, v, i) => campoLivello(c, { classe: '4BM', alunnoId, giornataId: 'Q1-G03', sottoObiettivo: so, indice: i, valore: v }), campo);
}

describe('pacchetto classe Mac → iPad', () => {
  test('contiene classi, alunni, giornate datate e rubriche', () => {
    const p = leggiPacchetto(JSON.stringify(creaPacchetto(mac(), ['4BM'])));
    expect(p.classi[0].codice).toBe('4BM');
    expect(p.classi[0].giornate.find((g) => g.id === 'Q1-G03')).toMatchObject({ data: '2026-11-02', sottoObiettivi: ['1.1', '1.2', 'TEC.1'] });
    expect(p.alunni).toHaveLength(3);
    expect(p.sottoObiettivi['4'][0].indicatori[0].descrittori.Ottimo).toBeTruthy();
    expect(() => leggiPacchetto('{"formato":"altro"}')).toThrow();
  });
});

describe('flusso completo iPad → Mac', () => {
  test('registro 3 alunni, esporto, importo → voti identici; re-import senza doppioni; modifica segnalata', () => {
    const s = mac();
    const alunni = A.alunniDi(s, '4BM');
    let campo = importaPacchetto(campoVuoto('ipad-1'), creaPacchetto(s, ['4BM']));
    campo = registraSuIpad(campo, alunni[0].id, '1.1', [8, 7, 8, 7]);
    campo = registraSuIpad(campo, alunni[1].id, '1.1', [9, 9, 9, 9]);
    campo = campoStato(campo, { classe: '4BM', alunnoId: alunni[2].id, giornataId: 'Q1-G03', sottoObiettivi: ['1.1', '1.2', 'TEC.1'], valore: 'AS' });
    expect(daEsportare(campo)).toHaveLength(5);

    const { file, campo: dopoExport } = esportaVoti(campo, { ora: tick(1000) });
    const testo = JSON.stringify(file);
    const f = leggiFileVoti(testo);
    const an = analizzaImport(s, f);
    expect(an).toMatchObject({ uguali: [], modifiche: [], sconosciute: [] });
    expect(an.nuove).toHaveLength(5);
    const s2 = applicaImport(s, an);
    const r = riepilogoClasse(s2, '4BM', 'Q1');
    expect(r[0].r.perSotto['1.1']).toBe(8);
    expect(r[1].r.perSotto['1.1']).toBe(9);
    expect(r[2].r.daRecuperare).toBe(1);

    // stesso file di nuovo: nessun duplicato
    const an2 = analizzaImport(s2, leggiFileVoti(testo));
    expect(an2.nuove).toHaveLength(0);
    expect(an2.uguali).toHaveLength(5);
    expect(applicaImport(s2, an2).registrazioni).toHaveLength(s2.registrazioni.length);

    // modifica successiva sull'iPad: esportata e segnalata come modifica
    expect(daEsportare(dopoExport)).toHaveLength(0);
    const modificato = campoLivello(dopoExport, { classe: '4BM', alunnoId: alunni[0].id, giornataId: 'Q1-G03', sottoObiettivo: '1.1', indice: 0, valore: 10 });
    const f3 = esportaVoti(modificato, { ora: tick(5000) }).file;
    expect(f3.registrazioni).toHaveLength(1);
    const an3 = analizzaImport(s2, leggiFileVoti(JSON.stringify(f3)));
    expect(an3.modifiche).toHaveLength(1);
    expect(an3.modifiche[0].prima.livelli[0]).toBe(8);
    expect(an3.modifiche[0].dopo.livelli[0]).toBe(10);
    expect(applicaImport(s2, an3, []).registrazioni).toEqual(s2.registrazioni); // rifiutata
    const s3 = applicaImport(s2, an3, [an3.modifiche[0].dopo.id]); // accettata
    expect(s3.registrazioni.find((r) => r.id === an3.modifiche[0].dopo.id).livelli[0]).toBe(10);
  });
  test('file voti danneggiati rifiutati', () => {
    expect(() => leggiFileVoti('x')).toThrow();
    expect(() => leggiFileVoti(JSON.stringify({ formato: 'registro-motoria-voti', registrazioni: [{ id: 'a' }] }))).toThrow(/incompleta/);
    expect(() => leggiFileVoti(JSON.stringify({ formato: 'registro-motoria-voti', registrazioni: [{ id: 'a', alunnoId: 'b', giornataId: 'c', sottoObiettivo: 'd', livelli: [11] }] }))).toThrow(/livello/);
  });
  test('alunni sconosciuti segnalati e non importati', () => {
    const an = analizzaImport(mac(), { registrazioni: [{ id: 'z', alunnoId: 'nessuno', giornataId: 'Q1-G01', sottoObiettivo: '1.1', livelli: [8] }] });
    expect(an.sconosciute).toHaveLength(1);
  });
  test('reimportare il pacchetto non perde le registrazioni locali non esportate', () => {
    const s = mac();
    const a = A.alunniDi(s, '4BM')[0];
    let campo = importaPacchetto(campoVuoto('ipad-1'), creaPacchetto(s, ['4BM']));
    campo = registraSuIpad(campo, a.id, '1.1', [8]);
    const c2 = importaPacchetto(campo, creaPacchetto(s, ['4BM']));
    expect(c2.registrazioni).toHaveLength(1);
    expect(daEsportare(c2)).toHaveLength(1);
  });
});
