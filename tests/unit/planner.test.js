import { describe, test, expect } from 'vitest';
import { creaStatoIniziale } from '../../src/dati/seed.js';
import { pianificaTutte, quadrimestreDiData } from '../../src/pianificazione/planner.js';
import { isChiuso, scenarioSettimana } from '../../src/pianificazione/lezioni.js';
import { giornoSettimana } from '../../src/pianificazione/date.js';

const stato = creaStatoIniziale();
const piano = pianificaTutte(stato);

describe('pianificazione 2026/27', () => {
  test('genera il calendario di tutte le 11 classi', () => {
    expect(Object.keys(piano)).toHaveLength(11);
    for (const p of Object.values(piano)) expect(p.lezioni.length).toBeGreaterThan(30);
  });
  test('nessuna lezione in giorni di chiusura e solo nel giorno dell\'orario', () => {
    for (const c of stato.classi) {
      const giorni = new Set(c.lezioni.map((l) => l.giorno));
      for (const l of piano[c.codice].lezioni) {
        expect(isChiuso(l.data, stato.anno.chiusure), `${c.codice} ${l.data}`).toBe(false);
        expect(giorni.has(giornoSettimana(l.data))).toBe(true);
        expect(l.data >= stato.anno.inizio && l.data <= stato.anno.fine).toBe(true);
      }
    }
  });
  test('G01 il 28/09 e G03 di 4BM lunedì 2/11/2026', () => {
    expect(piano['4BM'].giornate['Q1-G01'].data).toBe('2026-09-28');
    expect(piano['4BM'].giornate['Q1-G02'].data).toBe('2026-10-26');
    expect(piano['4BM'].giornate['Q1-G03'].data).toBe('2026-11-02');
  });
  test('alternanza prova → recupero e progetto basket come blocco', () => {
    const l = piano['4BM'].lezioni;
    const i = l.findIndex((x) => x.data === '2026-09-28');
    expect(l[i].tipo).toBe('prova');
    expect(l.filter((x) => x.tipo === 'progetto').map((x) => x.data)).toEqual(['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26']);
    const g03 = l.findIndex((x) => x.data === '2026-11-02');
    expect(l[g03 + 1].tipo).toBe('recupero');
  });
  test('2 cuscinetti per quadrimestre e lezioni libere', () => {
    for (const p of Object.values(piano)) {
      for (const q of ['Q1', 'Q2']) {
        expect(p.lezioni.filter((l) => l.tipo === 'cuscinetto' && quadrimestreDiData(l.data, stato.anno) === q)).toHaveLength(2);
      }
      const libere = p.lezioni.filter((l) => l.tipo === 'libera');
      expect(libere).toHaveLength(2);
      expect(libere[0].data < '2026-12-23').toBe(true);
      expect(libere[1]).toBe(p.lezioni[p.lezioni.length - 1]);
    }
  });
  test('la regola dei 9 giorni non è mai violata dal pianificatore', () => {
    for (const p of Object.values(piano)) expect(p.violazioni).toEqual([]);
  });
  test('Boncompagni: basket senza date → G02 da pianificare con avviso', () => {
    expect(piano['4AB'].giornate['Q1-G02'].stato).toBe('da pianificare');
    expect(piano['4AB'].avvisi.join()).toMatch(/basket/);
    expect(piano['4AB'].giornate['Q1-G03'].data).toBe('2026-11-03');
  });
  test('una gita fa slittare le giornate successive della sola classe coinvolta', () => {
    const conGita = { ...stato, eventi: [{ id: 'e1', classe: '4BM', data: '2026-11-02', motivo: 'Uscita didattica' }] };
    const p2 = pianificaTutte(conGita);
    expect(p2['4BM'].giornate['Q1-G03']).toMatchObject({ data: '2026-11-09', stato: 'slittata' });
    expect(p2['4BM'].lezioni.find((l) => l.data === '2026-11-02')).toMatchObject({ tipo: 'saltata', motivo: 'Uscita didattica' });
    for (const c of stato.classi.filter((x) => x.codice !== '4BM')) {
      expect(p2[c.codice].giornate).toEqual(piano[c.codice].giornate);
    }
  });
  test('saltare una lezione con prova anticipata fa scalare tutta la sequenza', () => {
    const extra = [
      { id: 'Q1-G04', quadrimestre: 'Q1', descrizione: 'Prova 4', sottoObiettivi: { 4: ['4.1'], 5: ['4.1'] }, ancora: {}, progetto: null },
      { id: 'Q1-G05', quadrimestre: 'Q1', descrizione: 'Prova 5', sottoObiettivi: { 4: ['4.2'], 5: ['4.2'] }, ancora: {}, progetto: null }
    ];
    const s = { ...stato, giornate: [...stato.giornate, ...extra] };
    const a = pianificaTutte(s)['4BM'].giornate;
    const b = pianificaTutte({ ...s, eventi: [{ id: 'x', classe: '4BM', data: '2026-11-16', motivo: 'Assenza docente' }] })['4BM'].giornate;
    expect(a['Q1-G04'].data).toBe('2026-11-16');
    expect(b['Q1-G04'].data).toBe('2026-11-23');
    expect(b['Q1-G05'].data > a['Q1-G05'].data).toBe(true);
  });
  test('cuscinetti esauriti → avviso con proposta di sacrificio', () => {
    const molte = Array.from({ length: 12 }, (_, i) => ({
      id: `Q1-G${String(i + 4).padStart(2, '0')}`, quadrimestre: 'Q1', descrizione: '', ancora: {}, progetto: null,
      sottoObiettivi: { 4: [['4.1', '4.2', '4.3', 'CIV.1'][i % 4]], 5: [['4.1', '4.2', '4.3', 'CIV.1'][i % 4]] }
    }));
    const p = pianificaTutte({ ...stato, giornate: [...stato.giornate, ...molte] })['4BM'];
    expect(p.avvisi.some((a) => /cuscinett/.test(a))).toBe(true);
    expect(p.violazioni).toEqual([]);
  });
  test('5BB: venerdì alternati tra due fasce', () => {
    const l = piano['5BB'].lezioni;
    expect(new Set(l.map((x) => x.scenario))).toEqual(new Set(['Venerdì 1', 'Venerdì 2']));
    expect(scenarioSettimana('2026-09-18', '2026-09-14', ['Venerdì 1', 'Venerdì 2'])).toBe('Venerdì 1');
    expect(scenarioSettimana('2026-09-25', '2026-09-14', ['Venerdì 1', 'Venerdì 2'])).toBe('Venerdì 2');
  });
});
