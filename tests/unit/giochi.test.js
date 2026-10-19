import { describe, test, expect } from 'vitest';
import { creaStatoIniziale } from '../../src/dati/seed.js';
import * as A from '../../src/dati/azioni.js';
import * as G from '../../src/giochi/giochi.js';
import ExcelJS from 'exceljs';
import { excelIscrizioneGiochi } from '../../src/export/excel.js';

describe('calcoli da scheda tecnica', () => {
  test('tempo gara Super Gym = (tempo + penalità) × (1 − correttivo), al centesimo', () => {
    expect(G.tempoGara(52.4, 7)).toBe(59.4); // modello Excel
    expect(G.tempoGara(61.2, 12)).toBe(73.2);
    expect(G.tempoGara(60, 0, 0.3)).toBe(42);
    expect(G.tempoGara(null, 5)).toBeNull();
  });
  test('statistiche come il modello Excel (2 alunni)', () => {
    const s = G.statistiche([59.4, 73.2]);
    expect(s).toMatchObject({ n: 2, media: 66.3, mediana: 66.3, troncata: null, migliore: 59.4, peggiore: 73.2 });
    expect(s.devStd).toBe(9.76);
    expect(G.statistiche([9.85, 11.02]).media).toBe(10.44);
  });
  test('media troncata senza migliore e peggiore', () => {
    expect(G.statistiche([10, 12, 14, 30]).troncata).toBe(13);
    expect(G.statistiche([10, 12, 14, 30]).mediana).toBe(13);
  });
  test('adattamenti per prova (schede 2025/26): riduzione, esclusione dalla media', () => {
    let r = G.risultatoVuoto('2026/27', '4BM', 1);
    r = G.impostaIndividuale(r, 'a', { supergym: { tempo: 50, penalita: 4 }, ostacoli: { tempo: 10 } });
    r = G.impostaIndividuale(r, 'b', { supergym: { tempo: 80, penalita: 0, escluso: true }, ostacoli: { tempo: 20, riduzione: 0.5 } });
    const st = G.statisticheClasse(r);
    expect(st.supergym).toMatchObject({ n: 1, media: 54 }); // b escluso: non entra né nella somma né nel divisore
    expect(st.ostacoli.media).toBe(10); // (10 + 20×0,5) / 2
    expect(G.tempoAlunno(r.individuali.find((i) => i.alunnoId === 'b'), 'supergym')).toBeNull();
  });
  test('correttivo di classifica: punti aggiunti alla classe nella singola prova', () => {
    const voci = [
      { classe: 'X', stat: { lancia: 30 }, bonus: {} },
      { classe: 'Y', stat: { lancia: 20 }, bonus: { lancia: 1 } }
    ];
    const r = G.classifica(voci, [{ id: 'lancia', tipo: 'squadra_punti' }]);
    expect(r.perProva.lancia.map((x) => [x.classe, x.posizione, x.punti])).toEqual([['X', 1, 8], ['Y', 2, 8]]);
    expect(() => G.impostaBonus(G.risultatoVuoto('a', 'b', 1), 'lancia', 5)).toThrow(/tra 0 e 3/);
  });
  test('punti 8, 7, … e 1 dall\'8ª in giù', () => {
    expect([1, 2, 3, 7, 8, 9, 12].map((p) => G.puntiPosizione(p))).toEqual([8, 7, 6, 2, 1, 1, 1]);
  });
});

describe('classifica con 5 quarte e 6 quinte finte', () => {
  function statoGiochi() {
    let s = creaStatoIniziale();
    // 4ª: 5 classi seed; 5ª: 6 classi seed
    const tempi = { '4BM': 50, '4CM': 55, '4AB': 52, '4AM': 60, '4BB': 58, '5AM': 49, '5CB': 51, '5BM': 47, '5CM': 53, '5AB': 56, '5BB': 54 };
    for (const c of s.classi) {
      s = A.importaElencoAlunni(s, c.codice, ['Alunno Prova 01', 'Alunno Prova 02', 'Alunno Prova 03', 'Alunno Prova 04']);
      const al = A.alunniDi(s, c.codice);
      const base = tempi[c.codice];
      s = G.aggiornaRisultato(s, { anno: '2026/27', classe: c.codice, rilevazione: 1 }, (r) => {
        let x = r;
        // tempi: base-2, base, base+2, base+20 (outlier) → troncata = base+1
        [base - 2, base, base + 2, base + 20].forEach((t, i) => { x = G.impostaIndividuale(x, al[i].id, { supergym: { tempo: t, penalita: 0 }, ostacoli: { tempo: t / 5 } }); });
        x = G.impostaGruppo(x, 'lancia', 0, 20);
        x = G.impostaGruppo(x, 'lancia', 1, c.codice === '4AB' ? 30 : 25);
        return { ...x, fairPlay: c.codice === '4CM' ? 9 : 7 };
      });
    }
    return s;
  }
  test('media ufficiale e troncata per classe', () => {
    const s = statoGiochi();
    const st = G.statisticheClasse(G.trovaRisultato(s, '2026/27', '4BM', 1));
    expect(st.supergym.media).toBe(55); // (48+50+52+70)/4
    expect(st.supergym.troncata).toBe(51); // (50+52)/2
    expect(st.lancia).toBe(45);
  });
  test('classifiche separate per livello, punti e proposta', () => {
    const cl = G.classificheAnno(statoGiochi(), '2026/27', 1);
    expect(cl[4].perProva.supergym.map((r) => r.classe)).toEqual(['4BM', '4AB', '4CM', '4BB', '4AM']);
    expect(cl[4].perProva.supergym.map((r) => r.punti)).toEqual([8, 7, 6, 5, 4]);
    expect(cl[5].perProva.supergym.map((r) => r.classe)).toEqual(['5BM', '5AM', '5CB', '5CM', '5BB', '5AB']);
    expect(cl[4].perProva.lancia[0]).toMatchObject({ classe: '4AB', punti: 8 });
    expect(cl[4].perProva.lancia.slice(1).every((r) => r.posizione === 2 && r.punti === 7)).toBe(true);
    // 4BM: 8+8+7 = 23 ; 4AB: 7+7+8 = 22
    expect(cl[4].generale[0]).toMatchObject({ classe: '4BM', punti: 23 });
    expect(cl[4].proposta).toBe('4BM');
    expect(cl[5].proposta).toBe('5BM');
  });
  test('spareggio su rispetto delle regole, comportamento e fair play', () => {
    const voci = [
      { classe: 'X', stat: { lancia: 10 }, fairPlay: 6 },
      { classe: 'Y', stat: { lancia: 10 }, fairPlay: 9 }
    ];
    const r = G.classifica(voci, [{ id: 'lancia', tipo: 'squadra_punti' }]);
    expect(r.generale.map((g) => g.classe)).toEqual(['Y', 'X']);
    expect(r.generale[0].spareggioFairPlay).toBe(true);
  });
  test('archivio nello storico pluriennale', () => {
    const s = G.archiviaStorico(statoGiochi(), '2026/27', 1);
    expect(s.giochi.storico).toHaveLength(11);
    expect(s.giochi.storico.find((r) => r.classe === '4BM')).toMatchObject({ supergymMedia: 55, supergymTroncata: 51, livello: 4 });
    expect(G.archiviaStorico(s, '2026/27', 1).giochi.storico).toHaveLength(11);
  });
});

describe('elenco per l\'iscrizione ai Giochi', () => {
  test('nomi dal registro, ritirati esclusi, colonne da completare vuote', async () => {
    let s = { ...creaStatoIniziale(), alunni: [] };
    s = A.importaElencoAlunni(s, '4BM', ['Alunno Prova 01', 'Alunno Prova 02', 'Alunno Prova 03']);
    s = A.modificaAlunno(s, A.alunniDi(s, '4BM')[1].id, { stato: 'Ritirato' });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await excelIscrizioneGiochi(s, '4BM'));
    const ws = wb.worksheets[0];
    expect(ws.getRow(3).getCell(6).value).toBe('Data di nascita');
    expect([ws.getCell(4, 2).value, ws.getCell(5, 2).value]).toEqual(['Alunno Prova 01', 'Alunno Prova 03']);
    expect(ws.getCell(6, 2).value).toBeNull();
    expect(ws.getCell(4, 6).value).toBe('');
  });
});
