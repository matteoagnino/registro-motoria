import { describe, test, expect } from 'vitest';
import { creaStatoIniziale } from '../../src/dati/seed.js';
import * as A from '../../src/dati/azioni.js';
import { creaPacchetto } from '../../src/dati/scambio.js';
import {
  campoVuoto, importaPacchetto, campoStato, campoLivello, campoRecupero,
  recuperiInSospeso, lezioniDiOggi, giornataDellaLezione, promemoriaExport
} from '../../src/dati/campo.js';

function campoDiProva() {
  let s = { ...creaStatoIniziale(), alunni: [] };
  s = A.importaElencoAlunni(s, '4BM', ['Alunno Prova 01', 'Alunno Prova 02']);
  const c = importaPacchetto(campoVuoto('ipad-test'), creaPacchetto(s, ['4BM', '5BB']));
  return { c, al: A.alunniDi(s, '4BM') };
}

describe('modalità campo: aiuti per la lezione', () => {
  test('il pacchetto porta il calendario reale (5BB venerdì 23/10 alle 10:30)', () => {
    const { c } = campoDiProva();
    const cal = c.pacchetto.classi.find((x) => x.codice === '5BB').calendario;
    expect(cal.find((l) => l.data === '2026-10-23')).toMatchObject({ inizio: '10:30', fine: '12:30' });
  });
  test('lezione di adesso e giornata da aprire', () => {
    const { c } = campoDiProva();
    const prima = lezioniDiOggi(c.pacchetto, '2026-10-19', '09:30');
    expect(prima).toHaveLength(1);
    expect(prima[0]).toMatchObject({ classe: '4BM', adesso: false });
    const adesso = lezioniDiOggi(c.pacchetto, '2026-10-19', '10:05')[0];
    expect(adesso).toMatchObject({ adesso: true, giornataId: 'Q1-G02' });
    expect(giornataDellaLezione(adesso)).toBe('Q1-G02');
    const dopo = lezioniDiOggi(c.pacchetto, '2026-10-26', '11:00')[0];
    expect(giornataDellaLezione(dopo)).toBe('Q1-G02'); // lezione di recupero del basket
  });
  test('recuperi in sospeso: assente senza data di recupero', () => {
    let { c, al } = campoDiProva();
    c = campoStato(c, { classe: '4BM', alunnoId: al[1].id, giornataId: 'Q1-G01', sottoObiettivi: ['1.1'], valore: 'AS' });
    expect(recuperiInSospeso(c, '4BM').map((x) => [x.alunno.numero, x.giornataId])).toEqual([[2, 'Q1-G01']]);
    c = campoRecupero(c, { classe: '4BM', alunnoId: al[1].id, giornataId: 'Q1-G01', sottoObiettivi: ['1.1'], data: '2026-10-05' });
    expect(recuperiInSospeso(c, '4BM')).toEqual([]);
  });
  test('promemoria export dopo 24 ore', () => {
    let { c, al } = campoDiProva();
    expect(promemoriaExport(c)).toBeNull();
    c = campoLivello(c, { classe: '4BM', alunnoId: al[0].id, giornataId: 'Q1-G01', sottoObiettivo: '1.1', indice: 0, valore: 8 });
    const fatta = new Date(c.registrazioni.at(-1).updatedAt);
    expect(promemoriaExport(c, new Date(fatta.getTime() + 3600000))).toBeNull();
    expect(promemoriaExport(c, new Date(fatta.getTime() + 25 * 3600000))).toMatchObject({ n: 1 });
  });
});
