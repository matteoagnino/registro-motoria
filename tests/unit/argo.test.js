import { describe, test, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { creaStatoIniziale } from '../../src/dati/seed.js';
import * as A from '../../src/dati/azioni.js';
import { leggiRigheArgo, leggiExcelArgo, analizzaArgo, applicaArgo, inMaiuscoletto } from '../../src/dati/argo.js';

// Stessa forma della «Lista schede alunno» di Argo, con nomi palesemente finti.
const pad = (n, nome, coda = '') => `          ${n}       ${nome}${' '.repeat(60)}${coda}   `;
const RIGHE = [
  ['Lista schede alunno'],
  ['Alunno', 'Recapiti alunno', 'Recapitigenitore/tutore 1', 'Media Generale ', 'Note'],
  [pad(1, 'ALUNNO PROVA 01', 'Iscritto dal 01-10-2026'), '-', '-'],
  [pad(2, "PROVA D'ESEMPIO DUE"), '-', '-'],
  [pad(3, 'ALUNNO PROVA 03', 'Ritirato il 05-10-2026'), '-', '-'],
  [pad(4, 'ALUNNO PROVA 04'), '-', '-']
];

async function xlsx(righe) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('foglio1');
  righe.forEach((r) => ws.addRow(r));
  return wb.xlsx.writeBuffer();
}

describe('import anagrafiche da Argo', () => {
  test('legge numero, nome e stato ignorando le intestazioni', () => {
    const a = leggiRigheArgo(RIGHE);
    expect(a.map((x) => x.numero)).toEqual([1, 2, 3, 4]);
    expect(a[0]).toMatchObject({ cognomeNome: 'Alunno Prova 01', ritirato: false, nota: 'Iscritto dal 01-10-2026' });
    expect(a[1].cognomeNome).toBe("Prova D'Esempio Due");
    expect(a[2].ritirato).toBe(true);
  });
  test('file senza alunni → errore chiaro', () => {
    expect(() => leggiRigheArgo([['Altro file'], ['x']])).toThrow(/Lista schede alunno/);
  });
  test('legge davvero un .xlsx', async () => {
    const a = await leggiExcelArgo(await xlsx(RIGHE));
    expect(a).toHaveLength(4);
  });
  test('classe vuota: importa con i numeri di Argo, salta i ritirati', () => {
    const s0 = { ...creaStatoIniziale(), alunni: [] };
    const an = analizzaArgo(s0, '4BM', leggiRigheArgo(RIGHE));
    expect(an.nuovi.map((x) => x.numero)).toEqual([1, 2, 4]);
    const s = applicaArgo(s0, '4BM', an);
    expect(A.alunniDi(s, '4BM').map((a) => [a.numero, a.cognomeNome])).toEqual([
      [1, 'Alunno Prova 01'], [2, "Prova D'Esempio Due"], [4, 'Alunno Prova 04']
    ]);
  });
  test('classe già popolata: nuovi in coda, ritirati segnati, nessuno cancellato', () => {
    let s = { ...creaStatoIniziale(), alunni: [] };
    s = A.importaElencoAlunni(s, '4BM', ['Alunno Prova 03', 'Alunno Prova 01', 'Alunno Prova 05']);
    const an = analizzaArgo(s, '4BM', leggiRigheArgo(RIGHE));
    expect(an.nuovi.map((x) => x.cognomeNome)).toEqual(["Prova D'Esempio Due", 'Alunno Prova 04']);
    expect(an.ritirati.map((a) => a.cognomeNome)).toEqual(['Alunno Prova 03']);
    expect(an.soloRegistro.map((a) => a.cognomeNome)).toEqual(['Alunno Prova 05']);
    const dopo = A.alunniDi(applicaArgo(s, '4BM', an), '4BM');
    expect(dopo).toHaveLength(5);
    expect(dopo.find((a) => a.cognomeNome === 'Alunno Prova 03').stato).toBe('Ritirato');
    expect(dopo.slice(-2).map((a) => a.numero)).toEqual([4, 5]);
  });
  test('maiuscoletto con accenti e apostrofi', () => {
    expect(inMaiuscoletto("PROVA DELL'ESEMPIO NICOLÒ")).toBe("Prova Dell'Esempio Nicolò");
  });
});
