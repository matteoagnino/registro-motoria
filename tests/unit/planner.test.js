import { describe, test, expect } from 'vitest';
import { creaStatoIniziale } from '../../src/dati/seed.js';
import { pianificaTutte, quadrimestreDiData } from '../../src/pianificazione/planner.js';
import * as A from '../../src/dati/azioni.js';
import { lezioniNelPeriodo, allertaGiochi } from '../../src/dati/selettori.js';
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
    expect(piano['4BM'].giornate['Q1-G02'].data).toBe('2026-10-19');
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
  test('saltare una lezione con prova: la prova prende il posto del recupero, le successive restano al loro posto', () => {
    const extra = [
      { id: 'Q1-G04', quadrimestre: 'Q1', descrizione: 'Prova 4', sottoObiettivi: { 4: ['4.1'], 5: ['4.1'] }, ancora: {}, progetto: null },
      { id: 'Q1-G05', quadrimestre: 'Q1', descrizione: 'Prova 5', sottoObiettivi: { 4: ['4.2'], 5: ['4.2'] }, ancora: {}, progetto: null }
    ];
    const s = { ...stato, giornate: [...stato.giornate, ...extra] };
    const a = pianificaTutte(s)['4BM'].giornate;
    const b = pianificaTutte({ ...s, eventi: [{ id: 'x', classe: '4BM', data: '2026-11-16', motivo: 'Assenza docente' }] })['4BM'].giornate;
    expect(a['Q1-G04'].data).toBe('2026-11-16');
    expect(b['Q1-G04']).toMatchObject({ data: '2026-11-23', stato: 'slittata' });
    expect(b['Q1-G05']).toEqual(a['Q1-G05']);
    const lezioni = pianificaTutte({ ...s, eventi: [{ id: 'x', classe: '4BM', data: '2026-11-16', motivo: 'Assenza docente' }] })['4BM'].lezioni;
    const recG04 = lezioni.find((l) => l.recuperoDi === 'Q1-G04');
    expect(recG04.data > b['Q1-G04'].data && recG04.data !== b['Q1-G05'].data).toBe(true);
  });
  test('se la prova recuperata viola i giorni minimi con la successiva, la sequenza scala in avanti', () => {
    const extra = [
      { id: 'Q1-G04', quadrimestre: 'Q1', descrizione: 'Prova 4', sottoObiettivi: { 4: ['4.1'], 5: ['4.1'] }, ancora: {}, progetto: null },
      { id: 'Q1-G05', quadrimestre: 'Q1', descrizione: 'Prova 5', sottoObiettivi: { 4: ['4.1'], 5: ['4.1'] }, ancora: {}, progetto: null }
    ];
    const s = { ...stato, giornate: [...stato.giornate, ...extra] };
    const a = pianificaTutte(s)['4BM'];
    const b = pianificaTutte({ ...s, eventi: [{ id: 'x', classe: '4BM', data: a.giornate['Q1-G04'].data, motivo: 'Gita' }] })['4BM'];
    expect(b.giornate['Q1-G05'].data > a.giornate['Q1-G05'].data).toBe(true);
    expect(b.violazioni).toEqual([]);
  });
  test('saltare una lezione senza prova non sposta nulla', () => {
    const libera = piano['4BM'].lezioni.find((l) => l.tipo === 'normale');
    const p = pianificaTutte({ ...stato, eventi: [{ id: 'x', classe: '4BM', data: libera.data, motivo: 'Gita' }] })['4BM'];
    expect(p.giornate).toEqual(piano['4BM'].giornate);
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
  test('prima settimana (orario ridotto) senza lezioni', () => {
    for (const p of Object.values(piano)) expect(p.lezioni[0].data >= '2026-09-21').toBe(true);
  });
  test('osservazione basket Manzoni nella settimana del 19/10, la lezione dopo è di recupero', () => {
    const l = piano['4BM'].lezioni;
    expect(l.find((x) => x.data === '2026-10-19')).toMatchObject({ tipo: 'progetto', giornataId: 'Q1-G02' });
    expect(l.find((x) => x.data === '2026-10-26')).toMatchObject({ tipo: 'progetto', recuperoDi: 'Q1-G02' });
  });
  test('progetto senza settimana indicata → giornata nell\'ultima lezione del progetto', () => {
    const giornate = stato.giornate.map((g) => (g.id === 'Q1-G02' ? { ...g, ancora: {} } : g));
    expect(pianificaTutte({ ...stato, giornate })['4BM'].giornate['Q1-G02'].data).toBe('2026-10-26');
  });
  test('5BB: venerdì 23/10 fascia V1 10:30–12:30, ricostruita a ritroso e dopo le vacanze', () => {
    const orario = (d) => piano['5BB'].lezioni.find((x) => x.data === d);
    expect(orario('2026-10-23')).toMatchObject({ inizio: '10:30', scenario: 'Venerdì 1' });
    expect(orario('2026-10-16')).toMatchObject({ inizio: '14:30', scenario: 'Venerdì 2' });
    expect(orario('2026-10-09')).toMatchObject({ inizio: '10:30' });
    expect(orario('2026-09-25')).toMatchObject({ inizio: '10:30' });
    expect(orario('2026-09-18')).toBeUndefined();
    // 21/12 V2 · settimana 28/12 di vacanza non conta · 8/01 V1
    expect(orario('2027-01-08')).toMatchObject({ inizio: '10:30', scenario: 'Venerdì 1' });
  });
  test('5BB: venerdì alternati tra due fasce', () => {
    const l = piano['5BB'].lezioni;
    expect(new Set(l.map((x) => x.scenario))).toEqual(new Set(['Venerdì 1', 'Venerdì 2']));
    expect(scenarioSettimana('2026-09-18', '2026-09-14', ['Venerdì 1', 'Venerdì 2'])).toBe('Venerdì 1');
    expect(scenarioSettimana('2026-09-25', '2026-09-14', ['Venerdì 1', 'Venerdì 2'])).toBe('Venerdì 2');
  });
});

describe('lezioni non svolte (più classi in una volta)', () => {
  test('un giorno di assenza del docente: tutte le lezioni del giorno, già segnate ignorate', () => {
    const delGiorno = lezioniNelPeriodo(stato, '2026-11-02');
    expect(delGiorno.length).toBeGreaterThan(1);
    expect(delGiorno.every((l) => l.data === '2026-11-02')).toBe(true);
    const lezioni = delGiorno.map(({ classe, data }) => ({ classe, data }));
    let s = A.aggiungiEvento(stato, { ...lezioni[0], motivo: 'Gita' });
    s = A.segnaLezioniNonSvolte(s, lezioni, 'Assenza docente');
    expect(s.eventi).toHaveLength(lezioni.length);
    expect(s.eventi.find((e) => e.classe === lezioni[0].classe).motivo).toBe('Gita');
    expect(lezioniNelPeriodo(s, '2026-11-02')).toEqual([]);
    expect(() => A.segnaLezioniNonSvolte(stato, [], 'x')).toThrow();
  });
});

describe('giornate dei Giochi della Gioventù', () => {
  const g = (id, so, giochi = false) => ({ id, quadrimestre: 'Q1', descrizione: '', ancora: {}, progetto: null, giochi, sottoObiettivi: { 4: [so], 5: [so] } });
  test('cuscinetti esauriti: la giornata dei Giochi non si sacrifica, si propone una giornata normale', () => {
    const so = ['4.1', '4.2', '4.3', 'CIV.1'];
    const molte = Array.from({ length: 12 }, (_, i) => g(`Q1-G${String(i + 4).padStart(2, '0')}`, so[i % 4], i === 11));
    const p = pianificaTutte({ ...stato, giornate: [...stato.giornate, ...molte] })['4BM'];
    const avviso = p.avvisi.find((a) => a.startsWith('Q1-G15'));
    expect(avviso).toMatch(/Giochi della Gioventù, da non sacrificare/);
    expect(avviso).toMatch(/sacrifica Q1-G\d\d \(non dei Giochi\)/);
  });
  test('la lezione con la prova dei Giochi è contrassegnata', () => {
    const p = pianificaTutte({ ...stato, giornate: [...stato.giornate, g('Q1-G04', '4.1', true)] })['4BM'];
    expect(p.lezioni.find((l) => l.giornataId === 'Q1-G04').giochi).toBe(true);
  });
  test('avviso quando una classe resta indietro su una giornata dei Giochi', () => {
    const s = { ...stato, giornate: [...stato.giornate, g('Q1-G04', '4.1', true)] };
    const date = Object.fromEntries(s.classi.map((c) => [c.codice, pianificaTutte(s)[c.codice].giornate['Q1-G04'].data]));
    const prima = Object.values(date).sort()[0];
    expect(allertaGiochi(s, '2026-09-01')).toEqual([]);
    const a = allertaGiochi(s, prima)[0];
    expect(a.svolte.every((c) => date[c] <= prima)).toBe(true);
    expect(a.mancanti.length).toBeGreaterThan(0);
  });
});
