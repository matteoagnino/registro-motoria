// Messaggi JSON divisi in pezzi per il canale dati (i messaggi grandi non passano interi su tutti i browser).

let contatore = 0;

/**
 * @param {unknown} msg
 * @param {number} dimensione caratteri di dati per pezzo
 * @returns {string[]}
 */
export function aPezzi(msg, dimensione = 16000) {
  const testo = JSON.stringify(msg);
  const id = `${Date.now().toString(36)}${(contatore++).toString(36)}`;
  const n = Math.max(1, Math.ceil(testo.length / dimensione));
  return Array.from({ length: n }, (_, i) => JSON.stringify({ id, i, n, d: testo.slice(i * dimensione, (i + 1) * dimensione) }));
}

/** Rimette insieme i pezzi: `aggiungi` restituisce il messaggio quando è completo, altrimenti null. */
export class Ricomponi {
  #inCorso = new Map();

  aggiungi(pezzo) {
    const { id, i, n, d } = JSON.parse(pezzo);
    const parti = this.#inCorso.get(id) ?? [];
    const nuove = [...parti];
    nuove[i] = d;
    if (nuove.filter((x) => x != null).length < n) {
      this.#inCorso.set(id, nuove);
      return null;
    }
    this.#inCorso.delete(id);
    return JSON.parse(nuove.join(''));
  }
}
