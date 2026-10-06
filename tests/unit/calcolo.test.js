import { describe, test, expect } from 'vitest';
import didattica from '../../seed/didattica.json';
import {
  arrotonda, votoProva, giudizioVoto, giudizioDaValore, pesoProva, mediaPonderata, valoreFinale,
  votoRegistrazione, daRecuperare
} from '../../src/calcolo/voti.js';
import { riepilogoAlunno, vociVoto, spiegaVoto, MSG_ES, MSG_POCHI, MSG_OP } from '../../src/calcolo/riepilogo.js';
import { violazioniRegola } from '../../src/calcolo/regole.js';

const impostazioni = { scala: didattica.scala, soglie: didattica.soglie, parametri: didattica.parametri };
const SO4 = didattica.sotto_obiettivi['4'];
const META_Q1 = '2026-12-01';

// Caso di riferimento del modello Excel classe 4 (alunni d'esempio).
const DATE = { 'Q1-G01': '2026-09-28', 'Q1-G02': '2026-10-26', 'Q1-G03': '2026-11-02', 'Q1-G04': '2026-12-14' };
const reg = (alunnoId, giornataId, sottoObiettivo, livelli, extra = {}) => ({
  id: `${alunnoId}-${giornataId}-${sottoObiettivo}`, alunnoId, giornataId, sottoObiettivo, livelli, stato: null, ...extra
});
const ROSSI = [
  reg('r', 'Q1-G01', '1.1', [8, 8, 7, null]),
  reg('r', 'Q1-G02', '3.1', [8, 9, 8, 8]),
  reg('r', 'Q1-G02', '3.2', [8, 8, 9, 8]),
  reg('r', 'Q1-G03', '1.1', [8, 7, 8, 7]),
  reg('r', 'Q1-G03', '1.2', [7, 7, 8, 7]),
  reg('r', 'Q1-G03', 'TEC.1', [9, 9, 8, 9])
];
const BIANCHI = [
  reg('b', 'Q1-G01', '1.1', [7, 7, null, null]),
  reg('b', 'Q1-G02', '3.1', [9, 9, 9, 8]),
  reg('b', 'Q1-G02', '3.2', [8, 8, 8, 8]),
  reg('b', 'Q1-G03', '1.1', [null, null, null, null], { stato: 'AS' }),
  reg('b', 'Q1-G03', '1.2', [null, null, null, null], { stato: 'AS' }),
  reg('b', 'Q1-G03', 'TEC.1', [null, null, null, null], { stato: 'AS' })
];

function calcola(registrazioni, alunno, { rubrica, definitivi, quadrimestre = 'Q1' } = {}) {
  const voci = vociVoto({
    registrazioni, quadrimestre, metaISO: META_Q1, parametri: impostazioni.parametri,
    dataGiornata: (g) => DATE[g], quadrimestreDi: (g) => g.slice(0, 2)
  });
  return riepilogoAlunno({ alunno, quadrimestre, voci, sottoObiettivi: SO4, rubrica, definitivi, impostazioni });
}

describe('voto di una prova (§4.1)', () => {
  test('media degli indicatori compilati arrotondata da ,50 per eccesso', () => {
    expect(votoProva([8, 8, 7, null])).toBe(8);
    expect(votoProva([8, 9, 8, 8])).toBe(8);
    expect(votoProva([7, 7, 8, 7])).toBe(7);
    expect(votoProva([9, 9, 8, 9])).toBe(9);
  });
  test('casi limite 7,49 / 7,50 / 9,6', () => {
    expect(arrotonda(7.49)).toBe(7);
    expect(arrotonda(7.5)).toBe(8);
    expect(arrotonda(9.6)).toBe(10);
    expect(votoProva([7, 8])).toBe(8); // 7,50
    expect(votoProva([7, 7, 8, 8])).toBe(8); // 7,50
    expect(votoProva([7, 7, 7, 8])).toBe(7); // 7,25
  });
  test('nessun indicatore → nessun voto', () => {
    expect(votoProva([null, null, null, null])).toBeNull();
    expect(votoProva([])).toBeNull();
    expect(votoProva(undefined)).toBeNull();
  });
  test('arrotondamento a 2 decimali come Excel', () => {
    expect(arrotonda(23 / 3, 2)).toBe(7.67);
    expect(arrotonda(7.735, 2)).toBe(7.74);
    expect(arrotonda(8.125, 2)).toBe(8.13);
  });
});

describe('giudizi (§4.2, §4.6)', () => {
  test('giudizio del voto intero', () => {
    const attesi = { 10: 'Ottimo', 9: 'Distinto', 8: 'Buono', 7: 'Discreto', 6: 'Sufficiente', 5: 'Non sufficiente' };
    for (const [v, g] of Object.entries(attesi)) expect(giudizioVoto(Number(v), impostazioni.scala)).toBe(g);
    expect(giudizioVoto(null, impostazioni.scala)).toBe('');
  });
  test('soglie esatte', () => {
    const g = (v) => giudizioDaValore(v, impostazioni.soglie);
    expect(g(9.5)).toBe('Ottimo');
    expect(g(9.49)).toBe('Distinto');
    expect(g(8.5)).toBe('Distinto');
    expect(g(8.49)).toBe('Buono');
    expect(g(7.5)).toBe('Buono');
    expect(g(7.49)).toBe('Discreto');
    expect(g(6.5)).toBe('Discreto');
    expect(g(6.49)).toBe('Sufficiente');
    expect(g(5.5)).toBe('Sufficiente');
    expect(g(5.49)).toBe('Non sufficiente');
    expect(g(5)).toBe('Non sufficiente');
    expect(g(null)).toBe('');
  });
});

describe('pesi e medie (§4.3–4.5)', () => {
  const p = impostazioni.parametri;
  test('peso 1 prima della metà, 1,5 dalla metà in poi', () => {
    expect(pesoProva('2026-11-30', META_Q1, p)).toBe(1);
    expect(pesoProva('2026-12-01', META_Q1, p)).toBe(1.5);
    expect(pesoProva('2027-03-29', '2027-03-29', p)).toBe(1.5);
  });
  test('media ponderata a 2 decimali', () => {
    expect(mediaPonderata([{ voto: 8, peso: 1 }, { voto: 7, peso: 1.5 }])).toBe(7.4);
    expect(mediaPonderata([])).toBeNull();
    expect(mediaPonderata([{ voto: null, peso: 1 }])).toBeNull();
  });
  test('valore finale con e senza rubrica di processo', () => {
    expect(valoreFinale(7.67, 8, p)).toBe(7.74);
    expect(valoreFinale(7.67, null, p)).toBe(7.67);
    expect(valoreFinale(null, 8, p)).toBeNull();
  });
});

describe('caso di riferimento "Rossi" (SPEC §4.10)', () => {
  const alunno = { id: 'r', stato: 'Attivo', op: false };
  test('voti delle singole prove', () => {
    expect(ROSSI.map(votoRegistrazione)).toEqual([8, 8, 8, 8, 7, 9]);
  });
  test('medie e giudizi del 1° quadrimestre', () => {
    const r = calcola(ROSSI, alunno);
    expect(r.perSotto['1.1']).toBe(8);
    expect(r.perSotto['1.2']).toBe(7);
    expect(r.perSotto['3.1']).toBe(8);
    expect(r.perSotto['3.2']).toBe(8);
    expect(r.obiettivi.A).toMatchObject({ n: 3, media: 7.67, valore: 7.67, calcolato: 'Buono' });
    expect(r.obiettivi.B).toMatchObject({ n: 2, media: 8, valore: 8, calcolato: 'Buono' });
    expect(r.obiettivi.TEC).toMatchObject({ media: 9, calcolato: 'Distinto' });
    expect(r.obiettivi.CIV.media).toBeNull();
    expect(r.riporta).toEqual({ A: 'Buono', B: 'Buono', TEC: 'Distinto', CIV: '' });
    expect(r.avvisi).toEqual([]);
  });
  test('con rubrica di processo 8: A = 7,74 → Buono', () => {
    const r = calcola(ROSSI, alunno, { rubrica: 8 });
    expect(r.obiettivi.A.valore).toBe(7.74);
    expect(r.obiettivi.A.calcolato).toBe('Buono');
    expect(r.obiettivi.B.valore).toBe(8);
    expect(r.obiettivi.TEC.valore).toBe(9); // TEC e CIV: solo prove
    expect(r.obiettivi.A.spiegazione).toContain('7,74');
  });
  test('2° quadrimestre vuoto → avviso pochi voti', () => {
    const r = calcola(ROSSI, alunno, { quadrimestre: 'Q2' });
    expect(r.obiettivi.A.n).toBe(0);
    expect(r.avvisi).toEqual([MSG_POCHI]);
  });
  test('il giudizio definitivo prevale sul calcolato', () => {
    const r = calcola(ROSSI, alunno, { definitivi: { A: 'Distinto' } });
    expect(r.obiettivi.A.calcolato).toBe('Buono');
    expect(r.riporta.A).toBe('Distinto');
  });
});

describe('stati (§4.7) e avvisi (§4.8)', () => {
  test('alunno OP con assenza da recuperare (Bianchi del modello)', () => {
    const r = calcola(BIANCHI, { id: 'b', stato: 'Attivo', op: true });
    expect(r.obiettivi.A).toMatchObject({ n: 1, media: 7, calcolato: 'Discreto' });
    expect(r.obiettivi.B).toMatchObject({ n: 2, media: 8.5, calcolato: 'Distinto' });
    expect(r.daRecuperare).toBe(1);
    expect(r.avvisi.join(' ')).toBe(`${MSG_POCHI} Da recuperare: 1. ${MSG_OP}`);
  });
  test('AS poi recuperato: il voto conta e non è più da recuperare', () => {
    const recuperata = { ...BIANCHI[3], livelli: [8, 8, 8, 9], recuperataIl: '2026-11-09' };
    expect(daRecuperare(BIANCHI[3])).toBe(true);
    expect(daRecuperare(recuperata)).toBe(false);
    expect(votoRegistrazione(recuperata)).toBe(8);
    const r = calcola([...BIANCHI.slice(0, 3), recuperata], { id: 'b', stato: 'Attivo', op: false });
    expect(r.daRecuperare).toBe(0);
    expect(r.obiettivi.A).toMatchObject({ n: 2, media: 7.5, calcolato: 'Buono' });
  });
  test('AS con data di recupero ma senza voto: non più da recuperare', () => {
    expect(daRecuperare({ stato: 'AS', recuperataIl: '2026-11-09', livelli: [] })).toBe(false);
  });
  test('NV non conta', () => {
    const nv = reg('x', 'Q1-G03', '1.1', [5, 5, 5, 5], { stato: 'NV' });
    expect(votoRegistrazione(nv)).toBeNull();
    const r = calcola([ROSSI[0], nv], { id: 'x', stato: 'Attivo' });
    expect(r.obiettivi.A.n).toBe(1);
    expect(r.obiettivi.A.media).toBe(8);
  });
  test('ES: nessun giudizio, avviso referente', () => {
    const r = calcola(ROSSI, { id: 'v', stato: 'ES' });
    expect(r.riporta).toEqual({ A: 'ES', B: 'ES', TEC: 'ES', CIV: 'ES' });
    expect(r.avvisi).toEqual([MSG_ES]);
  });
  test('Ritirato: escluso', () => {
    const r = calcola(ROSSI, { id: 'z', stato: 'Ritirato' });
    expect(r.riporta.A).toBe('');
    expect(r.avvisi).toEqual(['Ritirato']);
  });
  test('peso 1,5 dopo la metà del quadrimestre', () => {
    const tardi = reg('r', 'Q1-G04', '1.2', [10, 10, 10, 10]);
    const r = calcola([...ROSSI, tardi], { id: 'r', stato: 'Attivo' });
    // A: (8 + 8 + 7 + 10×1,5) / 4,5 = 38 / 4,5 = 8,44
    expect(r.obiettivi.A.media).toBe(8.44);
    expect(r.obiettivi.A.calcolato).toBe('Buono');
  });
  test('2.1 concorre solo nel 2° quadrimestre', () => {
    const r = calcola([reg('r', 'Q1-G01', '2.1', [9, 9, 9, 9])], { id: 'r', stato: 'Attivo' });
    expect(r.obiettivi.A.n).toBe(0);
    expect(r.perSotto['2.1']).toBe(9);
  });
  test('spiegazione del voto', () => {
    expect(spiegaVoto([8, 8, 7, null], impostazioni.scala)).toBe('(8 + 8 + 7) / 3 = 7,67 → 8 Buono');
  });
});

describe('regola di recupero (§4.9)', () => {
  test('stesso sotto-obiettivo due volte nella giornata', () => {
    const v = violazioniRegola([{ giornataId: 'G1', data: '2026-09-28', sottoObiettivi: ['1.1', '1.1'] }]);
    expect(v).toEqual([{ giornataId: 'G1', tipo: 'doppio', codice: '1.1' }]);
  });
  test('ripetuto a 8 giorni = violazione; a 9 giorni = ok', () => {
    const base = { giornataId: 'G1', data: '2026-09-28', sottoObiettivi: ['1.1'] };
    expect(violazioniRegola([base, { giornataId: 'G2', data: '2026-10-06', sottoObiettivi: ['1.1'] }])).toHaveLength(1);
    expect(violazioniRegola([base, { giornataId: 'G2', data: '2026-10-07', sottoObiettivi: ['1.1'] }])).toHaveLength(0);
    expect(violazioniRegola([base, { giornataId: 'G2', data: '2026-10-05', sottoObiettivi: ['1.2'] }])).toHaveLength(0);
  });
});
