import { describe, test, expect } from 'vitest';
import { creaStatoIniziale } from '../../src/dati/seed.js';
import * as A from '../../src/dati/azioni.js';
import { verificaVoti, avanzamentoGiornata, daRecuperareClasse } from '../../src/dati/selettori.js';
import { validaInfortunio, descriviInfortunio } from '../../src/dati/infortunio.js';
import { votoRegistrazione } from '../../src/calcolo/voti.js';
import { creaFileVoti, leggiFileVoti } from '../../src/dati/scambio.js';

const SO = ['1.1', '1.2', 'TEC.1'];

function conAlunno() {
  const s = A.importaElencoAlunni(creaStatoIniziale(), '4BM', ['Alunno Prova 01']);
  const a = A.alunniDi(s, '4BM')[0];
  return { s, base: { classe: '4BM', alunnoId: a.id, giornataId: 'Q1-G03', sottoObiettivi: SO } };
}

describe('infortunio', () => {
  test('valida le durate a scaglioni e il periodo personalizzato', () => {
    expect(validaInfortunio({ durata: 'oltre14', dal: '2026-11-01' })).toEqual({ durata: 'oltre14', dal: null, al: null });
    expect(validaInfortunio({ durata: 'periodo', dal: '2026-11-03', al: '2026-12-20' })).toEqual({ durata: 'periodo', dal: '2026-11-03', al: '2026-12-20' });
    expect(validaInfortunio(null)).toBeNull();
    expect(() => validaInfortunio({ durata: 'oltre99' })).toThrow();
    expect(() => validaInfortunio({ durata: 'periodo', dal: '2026-12-20', al: '2026-11-03' })).toThrow();
  });

  test('descrizione breve', () => {
    expect(descriviInfortunio({ durata: 'fino7' })).toBe('< 7 giorni (1 settimana)');
    expect(descriviInfortunio({ durata: 'oltre28' })).toBe('> 28 giorni');
    expect(descriviInfortunio({ durata: 'periodo', dal: '2026-11-03', al: '2026-11-20' })).toBe('dal 03/11 al 20/11');
    expect(descriviInfortunio(null)).toBe('durata da indicare');
  });

  test('stato INF: niente voto e prova da recuperare, come per gli assenti', () => {
    let { s, base } = conAlunno();
    s = A.impostaLivello(s, { ...base, sottoObiettivo: '1.1', indice: 0, valore: 8 });
    s = A.impostaStatoGiornata(s, { ...base, valore: 'INF' });
    s = A.impostaInfortunio(s, { ...base, infortunio: { durata: 'oltre21' } });
    const regs = s.registrazioni.filter((r) => r.alunnoId === base.alunnoId);
    expect(regs.every((r) => r.stato === 'INF' && r.infortunio.durata === 'oltre21')).toBe(true);
    expect(regs.every((r) => votoRegistrazione(r) == null)).toBe(true);
    expect(avanzamentoGiornata(s, '4BM', 'Q1-G03').fatti).toBe(1);
    expect(daRecuperareClasse(s, '4BM').get(base.alunnoId)).toEqual(new Set(['Q1-G03']));
    expect(verificaVoti(s, '4BM')[0].celle['Q1-G03']).toBe('Infortunio (> 21 giorni) da recuperare');
  });

  test('con la data del recupero l\'infortunato riceve il voto, pesato alla data del recupero', () => {
    let { s, base } = conAlunno();
    s = A.impostaInfortunio(s, { ...base, infortunio: { durata: 'oltre7' } });
    s = A.impostaRecupero(s, { ...base, data: '2026-11-16' });
    for (const i of [0, 1, 2, 3]) s = A.impostaLivello(s, { ...base, sottoObiettivo: '1.1', indice: i, valore: 8 });
    const r = s.registrazioni.find((x) => x.alunnoId === base.alunnoId && x.sottoObiettivo === '1.1');
    expect(votoRegistrazione(r)).toBe(8);
    expect(daRecuperareClasse(s, '4BM').size).toBe(0);
    expect(verificaVoti(s, '4BM')[0].celle['Q1-G03']).toBe('1.1: 8');
  });

  test('cambiando stato la durata dell\'infortunio si toglie', () => {
    let { s, base } = conAlunno();
    s = A.impostaInfortunio(s, { ...base, infortunio: { durata: 'fino7' } });
    s = A.impostaStatoGiornata(s, { ...base, valore: 'AS' });
    expect(s.registrazioni.every((r) => r.stato === 'AS' && r.infortunio === null)).toBe(true);
  });

  test('il file voti dell\'iPad porta l\'infortunio e rifiuta durate non valide', () => {
    const { s, base } = conAlunno();
    const regs = A.impostaInfortunio(s, { ...base, infortunio: { durata: 'periodo', dal: '2026-11-03', al: null } }).registrazioni;
    const file = leggiFileVoti(JSON.stringify(creaFileVoti({ registrazioni: regs, deviceId: 'ipad-prova' })));
    expect(file.registrazioni[0]).toMatchObject({ stato: 'INF', infortunio: { durata: 'periodo', dal: '2026-11-03' } });
    const rotto = creaFileVoti({ registrazioni: [{ ...regs[0], infortunio: { durata: 'boh' } }], deviceId: 'ipad-prova' });
    expect(() => leggiFileVoti(JSON.stringify(rotto))).toThrow('infortunio');
  });
});

describe('ordine delle classi', () => {
  test('prima Boncompagni poi Manzoni, prima le 4ª poi le 5ª, poi alfabetico', () => {
    const codici = A.ordinaClassi(creaStatoIniziale().classi).map((c) => c.codice);
    expect(codici).toEqual(['4AB', '4BB', '5AB', '5BB', '5CB', '4AM', '4BM', '4CM', '5AM', '5BM', '5CM']);
  });
});
