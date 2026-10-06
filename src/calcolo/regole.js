// §4.9 Regola di recupero: stesso sotto-obiettivo mai due volte nella stessa giornata,
// né in due giornate della stessa classe a distanza < N giorni.
import { giorniTra } from '../pianificazione/date.js';

/**
 * @param prove [{giornataId, data (ISO|null), sottoObiettivi: string[]}] di una classe
 * @returns [{giornataId, tipo: 'doppio'|'vicino', codice, altra?}]
 */
export function violazioniRegola(prove, minGiorni = 9) {
  const out = [];
  for (const p of prove) {
    const visti = new Set();
    for (const c of p.sottoObiettivi) {
      if (visti.has(c)) out.push({ giornataId: p.giornataId, tipo: 'doppio', codice: c });
      visti.add(c);
    }
  }
  const datate = prove.filter((p) => p.data);
  for (let i = 0; i < datate.length; i++) {
    for (let j = i + 1; j < datate.length; j++) {
      const a = datate[i];
      const b = datate[j];
      if (Math.abs(giorniTra(a.data, b.data)) >= minGiorni) continue;
      for (const c of a.sottoObiettivi) {
        if (b.sottoObiettivi.includes(c)) {
          out.push({ giornataId: b.giornataId, tipo: 'vicino', codice: c, altra: a.giornataId });
        }
      }
    }
  }
  return out;
}

export function descriviViolazione(v) {
  return v.tipo === 'doppio'
    ? `⚠ ${v.codice} compare due volte nella giornata`
    : `⚠ ${v.codice} ripetuto a meno di 9 giorni da ${v.altra}: niente recupero`;
}
