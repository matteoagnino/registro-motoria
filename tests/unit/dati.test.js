import 'fake-indexeddb/auto';
import { describe, test, expect } from 'vitest';
import { creaStatoIniziale } from '../../src/dati/seed.js';
import * as A from '../../src/dati/azioni.js';
import { riepilogoClasse, verificaVoti, dataGiornata, daRecuperareClasse } from '../../src/dati/selettori.js';
import { serializzaArchivio, deserializzaArchivio } from '../../src/dati/archivio.js';
import { migra, SCHEMA_VERSION, leggiArchivio, validaStato } from '../../src/dati/schema.js';
import { apriPersistenza, MAX_BACKUP } from '../../src/dati/persistenza.js';
import { creaStore } from '../../src/dati/store.js';

const nomi = ['Alunno Prova 03', 'Alunno Prova 01', 'Alunno Prova 02'];

function conAlunni() {
  return A.importaElencoAlunni(creaStatoIniziale(), '4BM', nomi);
}

describe('alunni', () => {
  test('elenco iniziale in ordine alfabetico, nuovi in coda, numero fisso', () => {
    let s = conAlunni();
    expect(A.alunniDi(s, '4BM').map((a) => [a.numero, a.cognomeNome])).toEqual([
      [1, 'Alunno Prova 01'], [2, 'Alunno Prova 02'], [3, 'Alunno Prova 03']
    ]);
    s = A.aggiungiAlunno(s, { classe: '4BM', cognomeNome: 'Alunno Prova 00' });
    expect(A.alunniDi(s, '4BM').at(-1)).toMatchObject({ numero: 4, cognomeNome: 'Alunno Prova 00' });
  });
  test('Ritirato non cancella e il numero non cambia', () => {
    const s = conAlunni();
    const a = A.alunniDi(s, '4BM')[1];
    const s2 = A.modificaAlunno(s, a.id, { stato: 'Ritirato', numero: 99 });
    expect(A.alunniDi(s2, '4BM')).toHaveLength(3);
    expect(A.alunniDi(s2, '4BM')[1]).toMatchObject({ numero: 2, stato: 'Ritirato' });
  });
  test('immutabilità: lo stato originale non cambia', () => {
    const s = conAlunni();
    const copia = JSON.stringify(s);
    A.aggiungiAlunno(s, { classe: '4BM', cognomeNome: 'Alunno Prova 09' });
    expect(JSON.stringify(s)).toBe(copia);
  });
  test('validazione', () => {
    expect(() => A.aggiungiAlunno(conAlunni(), { classe: '4BM', cognomeNome: '  ' })).toThrow();
    expect(() => A.aggiungiAlunno(conAlunni(), { classe: 'XX', cognomeNome: 'Alunno Prova 1' })).toThrow();
    expect(() => A.aggiungiClasse(conAlunni(), { codice: '4BM', livello: 4 })).toThrow();
  });
});

describe('registrazioni e riepilogo', () => {
  function registra(s, alunnoId, giornataId, so, livelli) {
    return livelli.reduce((x, v, i) => A.impostaLivello(x, { classe: '4BM', alunnoId, giornataId, sottoObiettivo: so, indice: i, valore: v }), s);
  }
  test('dal registro al riepilogo (caso Rossi)', () => {
    let s = conAlunni();
    const [a] = A.alunniDi(s, '4BM');
    s = registra(s, a.id, 'Q1-G01', '1.1', [8, 8, 7, null]);
    s = registra(s, a.id, 'Q1-G02', '3.1', [8, 9, 8, 8]);
    s = registra(s, a.id, 'Q1-G02', '3.2', [8, 8, 9, 8]);
    s = registra(s, a.id, 'Q1-G03', '1.1', [8, 7, 8, 7]);
    s = registra(s, a.id, 'Q1-G03', '1.2', [7, 7, 8, 7]);
    s = registra(s, a.id, 'Q1-G03', 'TEC.1', [9, 9, 8, 9]);
    expect(s.registrazioni).toHaveLength(6);
    expect(dataGiornata(s, '4BM', 'Q1-G03')).toBe('2026-11-02');
    const r = riepilogoClasse(s, '4BM', 'Q1')[0].r;
    expect(r.obiettivi.A.media).toBe(7.67);
    expect(r.riporta).toMatchObject({ A: 'Buono', B: 'Buono', TEC: 'Distinto' });
    s = A.impostaRubrica(s, a.id, 'Q1', 8);
    expect(riepilogoClasse(s, '4BM', 'Q1')[0].r.obiettivi.A.valore).toBe(7.74);
    expect(verificaVoti(s, '4BM')[0].celle['Q1-G03']).toBe('1.1: 8 · 1.2: 7 · TEC.1: 9');
  });
  test('stato AS e recupero', () => {
    let s = conAlunni();
    const b = A.alunniDi(s, '4BM')[1];
    s = A.impostaStatoGiornata(s, { classe: '4BM', alunnoId: b.id, giornataId: 'Q1-G03', sottoObiettivi: ['1.1', '1.2', 'TEC.1'], valore: 'AS' });
    expect(daRecuperareClasse(s, '4BM').get(b.id)).toEqual(new Set(['Q1-G03']));
    expect(verificaVoti(s, '4BM')[1].celle['Q1-G03']).toBe('AS da recuperare');
    s = A.impostaLivello(s, { classe: '4BM', alunnoId: b.id, giornataId: 'Q1-G03', sottoObiettivo: '1.1', indice: 0, valore: 8 });
    s = A.impostaRecupero(s, { classe: '4BM', alunnoId: b.id, giornataId: 'Q1-G03', sottoObiettivi: ['1.1', '1.2', 'TEC.1'], data: '2026-11-09' });
    expect(daRecuperareClasse(s, '4BM').size).toBe(0);
  });
  test('livelli non validi rifiutati', () => {
    const s = conAlunni();
    const [a] = A.alunniDi(s, '4BM');
    expect(() => A.impostaLivello(s, { classe: '4BM', alunnoId: a.id, giornataId: 'Q1-G01', sottoObiettivo: '1.1', indice: 0, valore: 11 })).toThrow();
  });
  test('modifica di un descrittore riflessa ovunque (unica fonte)', () => {
    const s = A.aggiornaIndicatore(creaStatoIniziale(), '4', '1.1', 0, { descrittori: { Ottimo: 'Nuovo testo' } });
    expect(s.didattica.sottoObiettivi['4'][0].indicatori[0].descrittori.Ottimo).toBe('Nuovo testo');
    expect(s.didattica.sottoObiettivi['4'][0].indicatori[0].descrittori.Buono).toMatch(/autonomia/);
  });
  test('giornate: massimo 4 sotto-obiettivi, nessun doppione', () => {
    const s = creaStatoIniziale();
    expect(() => A.salvaGiornata(s, { id: 'Q1-G04', sottoObiettivi: { 4: ['1.1', '1.1'], 5: [] } })).toThrow();
    expect(() => A.salvaGiornata(s, { id: 'Q1-G04', sottoObiettivi: { 4: ['1.1', '1.2', '4.1', '4.2', '4.3'], 5: [] } })).toThrow();
    const s2 = A.salvaGiornata(s, { id: A.prossimoIdGiornata(s, 'Q1'), sottoObiettivi: { 4: ['4.1'], 5: ['4.1'] } });
    expect(s2.giornate.map((g) => g.id)).toContain('Q1-G04');
  });
});

describe('archivio JSON e migrazioni', () => {
  test('round-trip senza perdite', () => {
    let s = conAlunni();
    const [a] = A.alunniDi(s, '4BM');
    s = A.impostaLivello(s, { classe: '4BM', alunnoId: a.id, giornataId: 'Q1-G01', sottoObiettivo: '1.1', indice: 2, valore: 7 });
    s = A.impostaGiudizioDefinitivo(s, { alunnoId: a.id, quadrimestre: 'Q1', obiettivo: 'A', giudizio: 'Distinto', commento: 'ok' });
    s = A.aggiungiEvento(s, { classe: '4BM', data: '2026-11-16', motivo: 'Gita' });
    const back = deserializzaArchivio(serializzaArchivio(s));
    expect(back).toEqual(s);
  });
  test('file non validi rifiutati con messaggio chiaro', () => {
    expect(() => deserializzaArchivio('non json')).toThrow(/JSON/);
    expect(() => deserializzaArchivio('{"a":1}')).toThrow(/archivio/);
  });
  test('migrazione da schema 0 (archivio senza versione)', () => {
    const vecchio = { ...creaStatoIniziale() };
    delete vecchio.schemaVersion;
    delete vecchio.eventi;
    vecchio.registrazioni = [{ id: 'x', alunnoId: 'a', giornataId: 'Q1-G01', sottoObiettivo: '1.1' }];
    const m = migra(vecchio);
    expect(m.schemaVersion).toBe(SCHEMA_VERSION);
    expect(m.eventi).toEqual([]);
    expect(m.registrazioni[0]).toMatchObject({ livelli: [null, null, null, null], stato: null, deviceId: 'sconosciuto' });
    expect(validaStato(m)).toEqual([]);
    const testo = JSON.stringify({ formato: 'registro-motoria-archivio', stato: vecchio });
    expect(leggiArchivio(testo).schemaVersion).toBe(SCHEMA_VERSION);
  });
  test('migrazione 1 → 2: correzioni di calendario solo se i valori sono quelli iniziali', () => {
    const base = creaStatoIniziale();
    const v1 = {
      ...base, schemaVersion: 1,
      anno: {
        ...base.anno,
        chiusure: base.anno.chiusure.filter((c) => c.dal !== '2026-09-14'),
        vincoli: base.anno.vincoli.map((v) => ({ ...v, al: '2026-10-31', nota: 'Palestra inagibile: lezioni in aula' }))
      },
      impostazioni: { ...base.impostazioni, settimanaRifVenerdi1: '' },
      giornate: base.giornate.map((g) => (g.id === 'Q1-G02' ? { ...g, ancora: { ...g.ancora, Manzoni: '2026-10-26' } } : g))
    };
    const m = migra(v1);
    expect(m.schemaVersion).toBe(SCHEMA_VERSION);
    expect(m.anno.chiusure[0]).toMatchObject({ dal: '2026-09-14', al: '2026-09-18' });
    expect(m.anno.vincoli[0]).toMatchObject({ al: '2027-06-10' });
    expect(m.anno.vincoli[0].nota).toMatch(/nuova comunicazione/);
    expect(m.impostazioni.settimanaRifVenerdi1).toBe('2026-10-19');
    expect(m.giornate.find((g) => g.id === 'Q1-G02').ancora.Manzoni).toBe('2026-10-19');
    // valori già cambiati da Matteo: restano
    const scelto = migra({ ...v1, impostazioni: { ...v1.impostazioni, settimanaRifVenerdi1: '2026-10-12' } });
    expect(scelto.impostazioni.settimanaRifVenerdi1).toBe('2026-10-12');
    expect(migra(m)).toEqual(m);
  });
  test('migrazione 2 → 3: correttivo Giochi dell\'alunno → riduzione per prova', () => {
    const base = creaStatoIniziale();
    const v2 = { ...base, schemaVersion: 2, giochi: { ...base.giochi, risultati: [{ anno: '2026/27', classe: '4BM', rilevazione: 1, squadra: {},
      individuali: [{ alunnoId: 'a', correttivo: 0.3, supergym: { tempo: 50 }, ostacoli: { tempo: 10 } }] }] } };
    const ind = migra(v2).giochi.risultati[0].individuali[0];
    expect(ind.correttivo).toBeUndefined();
    expect(ind.supergym).toEqual({ riduzione: 0.3, tempo: 50 });
    expect(ind.ostacoli).toEqual({ riduzione: 0.3, tempo: 10 });
  });
  test('schema più recente dell\'app → errore', () => {
    expect(() => migra({ schemaVersion: SCHEMA_VERSION + 1 })).toThrow(/più recente/);
  });
});

describe('persistenza IndexedDB e store', () => {
  test('salva, rilegge e tiene solo gli ultimi backup', async () => {
    const p = apriPersistenza('test-db-1');
    const s = conAlunni();
    await p.scrivi('stato', s);
    expect(await p.leggi('stato')).toEqual(s);
    for (let i = 0; i < MAX_BACKUP + 3; i++) await p.aggiungiBackup({ n: i }, `b${i}`);
    const elenco = await p.elencoBackup();
    expect(elenco).toHaveLength(MAX_BACKUP);
    expect(elenco[0].motivo).toBe(`b${MAX_BACKUP + 2}`);
    expect(await p.leggiBackup(elenco[0].id)).toEqual({ n: MAX_BACKUP + 2 });
  });
  test('store: aggiornamento immutabile e autosalvataggio', async () => {
    const salvati = [];
    const store = creaStore({ v: 1 }, { salva: (s) => salvati.push(s), ritardo: 5 });
    let notifiche = 0;
    store.ascolta(() => notifiche++);
    const prima = store.get();
    store.aggiorna((s) => ({ ...s, v: 2 }));
    expect(prima).toEqual({ v: 1 });
    expect(store.get()).toEqual({ v: 2 });
    await store.salvaOra();
    expect(salvati.at(-1)).toEqual({ v: 2 });
    expect(notifiche).toBe(1);
  });
});
