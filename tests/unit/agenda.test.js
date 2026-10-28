import { describe, test, expect } from 'vitest';
import { creaStatoIniziale } from '../../src/dati/seed.js';
import * as A from '../../src/dati/azioni.js';
import { pianificaTutte } from '../../src/pianificazione/planner.js';
import { lezioniDaConfermare, lezioniNelPeriodo } from '../../src/dati/selettori.js';
import { migra } from '../../src/dati/schema.js';

const stato = creaStatoIniziale();
const LEZ = { classe: '4BM', data: '2026-11-02' };

describe('agenda del docente', () => {
  test('una lezione svolta si conferma e si può tornare a «da confermare»', () => {
    let s = A.impostaEsitoLezione(stato, { ...LEZ, esito: 'svolta' });
    expect(A.esitoLezione(s, LEZ.classe, LEZ.data)).toBe('svolta');
    s = A.impostaEsitoLezione(s, { ...LEZ, esito: null });
    expect(A.esitoLezione(s, LEZ.classe, LEZ.data)).toBeNull();
    expect(s.lezioniSvolte).toEqual([]);
  });

  test('assente io / classe / entrambi: la lezione non è svolta e la sequenza si aggiorna', () => {
    for (const esito of ['docente', 'classe', 'entrambi']) {
      const s = A.impostaEsitoLezione(A.impostaEsitoLezione(stato, { ...LEZ, esito: 'svolta' }), { ...LEZ, esito });
      expect(s.lezioniSvolte).toEqual([]);
      expect(s.eventi).toEqual([expect.objectContaining({ ...LEZ, chi: esito })]);
      expect(pianificaTutte(s)['4BM'].lezioni.find((l) => l.data === LEZ.data).tipo).toBe('saltata');
    }
  });

  test('il motivo scritto resta quando si riconferma lo stesso esito', () => {
    let s = A.impostaEsitoLezione(stato, { ...LEZ, esito: 'classe', motivo: 'Gita al museo' });
    s = A.impostaEsitoLezione(s, { ...LEZ, esito: 'classe' });
    expect(s.eventi[0].motivo).toBe('Gita al museo');
    expect(() => A.impostaEsitoLezione(stato, { ...LEZ, esito: 'boh' })).toThrow();
  });

  test('conferma della settimana: solo le lezioni senza esito', () => {
    const lezioni = lezioniNelPeriodo(stato, '2026-11-02', '2026-11-06');
    let s = A.impostaEsitoLezione(stato, { classe: lezioni[0].classe, data: lezioni[0].data, esito: 'docente' });
    s = A.confermaLezioni(s, lezioni);
    expect(A.esitoLezione(s, lezioni[0].classe, lezioni[0].data)).toBe('docente');
    expect(s.lezioniSvolte).toHaveLength(lezioni.length - 1);
    expect(lezioniDaConfermare(s, '2026-11-06').filter((l) => l.data >= '2026-11-02')).toEqual([]);
  });

  test('migrazione v3 → v4 aggiunge le lezioni svolte', () => {
    const { lezioniSvolte: _x, ...vecchio } = stato;
    expect(migra({ ...vecchio, schemaVersion: 3 }).lezioniSvolte).toEqual([]);
  });
});
