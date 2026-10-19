// Stato della modalità campo (iPad): pacchetto importato + registrazioni locali.
import * as A from './azioni.js';
import { creaFileVoti } from './scambio.js';

export function campoVuoto(deviceId) {
  return { pacchetto: null, registrazioni: [], modificate: [], nonEsportate: [], ultimoExport: null, importatoIl: null, deviceId };
}

/**
 * Importa un pacchetto (sostituisce il precedente). Le registrazioni fatte qui e non ancora
 * esportate restano, a meno che il pacchetto ne contenga una versione più recente.
 */
export function importaPacchetto(campo, pacchetto, ora = new Date()) {
  const nelPacchetto = new Map(pacchetto.registrazioni.map((r) => [r.id, r]));
  const mod = new Set(campo.modificate);
  const locali = campo.registrazioni.filter((r) => mod.has(r.id) && !(nelPacchetto.get(r.id)?.updatedAt >= r.updatedAt));
  const idLocali = new Set(locali.map((r) => r.id));
  return {
    ...campo,
    pacchetto: { ...pacchetto, registrazioni: undefined },
    registrazioni: [...pacchetto.registrazioni.filter((r) => !idLocali.has(r.id)), ...locali],
    modificate: campo.modificate,
    nonEsportate: (campo.nonEsportate ?? []).filter((id) => idLocali.has(id)),
    importatoIl: ora.toISOString()
  };
}

/** Applica un'azione di registro (da azioni.js) e traccia le registrazioni modificate. */
function conAzione(campo, azione, payload) {
  const pseudo = { registrazioni: campo.registrazioni, meta: { deviceId: campo.deviceId } };
  const dopo = azione(pseudo, { ...payload, deviceId: campo.deviceId });
  const prima = new Map(campo.registrazioni.map((r) => [r.id, r]));
  const cambiate = dopo.registrazioni.filter((r) => prima.get(r.id) !== r).map((r) => r.id);
  return {
    ...campo,
    registrazioni: dopo.registrazioni,
    modificate: [...new Set([...campo.modificate, ...cambiate])],
    nonEsportate: [...new Set([...(campo.nonEsportate ?? []), ...cambiate])]
  };
}

export const campoLivello = (campo, p) => conAzione(campo, A.impostaLivello, p);
export const campoStato = (campo, p) => conAzione(campo, A.impostaStatoGiornata, p);
export const campoRecupero = (campo, p) => conAzione(campo, A.impostaRecupero, p);

/** Registrazioni da esportare: modificate qui dopo l'ultimo export (o tutte quelle fatte su questo iPad). */
export function daEsportare(campo, tutte = false) {
  const ids = new Set(tutte ? campo.modificate : (campo.nonEsportate ?? []));
  return campo.registrazioni.filter((r) => ids.has(r.id));
}

export function esportaVoti(campo, { tutte = false, ora = new Date() } = {}) {
  const registrazioni = daEsportare(campo, tutte);
  return {
    file: creaFileVoti({ registrazioni, deviceId: campo.deviceId, ora }),
    campo: { ...campo, ultimoExport: ora.toISOString(), nonEsportate: [] }
  };
}

export const trovaCampo = (campo, alunnoId, giornataId, so) =>
  campo.registrazioni.find((r) => r.alunnoId === alunnoId && r.giornataId === giornataId && r.sottoObiettivo === so);

// ---------- Supporto alla lezione in palestra ----------

const MINUTI_PRIMA = 30;
const MINUTI_DOPO = 15;
const PROMEMORIA_EXPORT_ORE = 24;
const minuti = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Registrazione di un assente non ancora recuperata (nessuna data di recupero e nessun voto). */
const inSospeso = (r) => r.stato === 'AS' && !r.recuperataIl && !(r.livelli || []).some((l) => l != null);

/** Recuperi in sospeso di una classe: [{alunno, giornataId}] in ordine di numero e giornata. */
export function recuperiInSospeso(campo, classe) {
  const alunni = new Map((campo.pacchetto?.alunni ?? []).filter((a) => a.classe === classe && a.stato === 'Attivo').map((a) => [a.id, a]));
  const visti = new Set();
  const out = [];
  for (const r of campo.registrazioni) {
    const a = alunni.get(r.alunnoId);
    const k = `${r.alunnoId}|${r.giornataId}`;
    if (!a || visti.has(k) || !inSospeso(r)) continue;
    visti.add(k);
    out.push({ alunno: a, giornataId: r.giornataId });
  }
  return out.sort((x, y) => x.alunno.numero - y.alunno.numero || x.giornataId.localeCompare(y.giornataId));
}

/**
 * Lezioni di oggi di tutte le classi del pacchetto, in ordine di orario; `adesso` è vera per quella in corso
 * (da 30' prima dell'inizio a 15' dopo la fine).
 */
export function lezioniDiOggi(pacchetto, oggi, ora) {
  const m = minuti(ora);
  return (pacchetto?.classi ?? [])
    .flatMap((c) => (c.calendario ?? []).filter((l) => l.data === oggi).map((l) => ({ ...l, classe: c.codice })))
    .sort((a, b) => a.inizio.localeCompare(b.inizio))
    .map((l) => ({ ...l, adesso: m >= minuti(l.inizio) - MINUTI_PRIMA && m <= minuti(l.fine) + MINUTI_DOPO }));
}

/** Giornata da aprire per una lezione: la prova del giorno o quella da recuperare. */
export const giornataDellaLezione = (l) => l.giornataId ?? l.recuperoDi ?? null;

/** Promemoria: registrazioni non esportate modificate da più di 24 ore. */
export function promemoriaExport(campo, ora = new Date()) {
  const nonEsportate = daEsportare(campo);
  if (!nonEsportate.length) return null;
  const piuVecchia = nonEsportate.map((r) => r.updatedAt).filter(Boolean).sort()[0];
  if (!piuVecchia || ora - new Date(piuVecchia) < PROMEMORIA_EXPORT_ORE * 3600000) return null;
  return { n: nonEsportate.length, dal: piuVecchia };
}
