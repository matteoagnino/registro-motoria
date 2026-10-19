// Giochi della Gioventù: calcoli dalle schede tecniche 2025/26 (FGI, FIDAL, FIPAV), statistiche, classifiche, storico.
import { arrotonda } from '../calcolo/voti.js';

const numero = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Prove individuali a tempo: chiave nel risultato dell'alunno. */
export const PROVE_TEMPO = ['supergym', 'ostacoli'];

/**
 * Tempo di gara = (tempo + penalità) × (1 − riduzione). Al centesimo.
 * La riduzione (es. 0,3 = −30%) è il «correttivo sul risultato» delle schede FIDAL per alunni con disabilità.
 */
export function tempoGara(tempo, penalita = 0, riduzione = 0) {
  const t = numero(tempo);
  if (t == null) return null;
  return arrotonda((t + (numero(penalita) ?? 0)) * (1 - (numero(riduzione) ?? 0)), 2);
}

/** Tempo di gara di un alunno in una prova; null se manca o se il risultato è escluso dal calcolo. */
export function tempoAlunno(individuale, prova) {
  const r = individuale?.[prova];
  if (!r || r.escluso) return null;
  return tempoGara(r.tempo, prova === 'supergym' ? r.penalita : 0, r.riduzione);
}

export function statistiche(valori) {
  const v = valori.filter((x) => numero(x) != null).sort((a, b) => a - b);
  const n = v.length;
  if (!n) return { n: 0, media: null, troncata: null, mediana: null, devStd: null, migliore: null, peggiore: null };
  const somma = v.reduce((a, b) => a + b, 0);
  const media = somma / n;
  const mediana = n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
  const devStd = n > 1 ? Math.sqrt(v.reduce((a, x) => a + (x - media) ** 2, 0) / (n - 1)) : null; // STDEV campionaria come Excel
  return {
    n,
    media: arrotonda(media, 2),
    troncata: n > 2 ? arrotonda((somma - v[0] - v[n - 1]) / (n - 2), 2) : null,
    mediana: arrotonda(mediana, 2),
    devStd: devStd == null ? null : arrotonda(devStd, 2),
    migliore: v[0],
    peggiore: v[n - 1]
  };
}

/** Statistiche di una classe in una rilevazione. Media = somma dei tempi / alunni che hanno un tempo valido. */
export function statisticheClasse(risultato) {
  const ind = risultato?.individuali ?? [];
  const squadra = (id) => {
    const gruppi = (risultato?.squadra?.[id] ?? []).filter((x) => numero(x) != null);
    return gruppi.length ? arrotonda(gruppi.reduce((a, b) => a + b, 0), 2) : null;
  };
  return {
    supergym: statistiche(ind.map((i) => tempoAlunno(i, 'supergym'))),
    ostacoli: statistiche(ind.map((i) => tempoAlunno(i, 'ostacoli'))),
    lancia: squadra('lancia'),
    staffetta: squadra('staffetta'),
    spikeball: squadra('spikeball')
  };
}

/** Punteggio di classe per una prova (tempo: media ufficiale, minore è meglio; squadra: totale, maggiore è meglio). */
export function punteggioProva(stat, prova) {
  if (prova.tipo === 'individuale_tempo') return stat[prova.id]?.media ?? null;
  return stat[prova.id] ?? null;
}

/** Punti per posizione (scheda FIDAL 2025/26): 1ª = 8, poi 7…; dall'8ª in giù 1 punto. Pari merito = stessi punti. */
export const puntiPosizione = (pos) => Math.max(1, 9 - pos);

/**
 * Classifica tra classi. In ogni prova: punti 8…1 per posizione + eventuale «correttivo di classifica»
 * (+0,5/+1 pt) assegnato alla classe per alunni con disabilità. Classifica generale = somma dei punti;
 * a parità, spareggio sul giudizio del docente su rispetto delle regole, comportamento e fair play (campo fairPlay).
 * @param voci [{classe, stat, fairPlay, bonus}] — classi dello stesso livello
 * @param prove definizioni delle prove
 */
export function classifica(voci, prove) {
  const perProva = {};
  const totali = new Map(voci.map((v) => [v.classe, 0]));
  for (const p of prove) {
    const minoreMeglio = p.tipo === 'individuale_tempo';
    const valori = voci.map((v) => ({ classe: v.classe, valore: punteggioProva(v.stat, p) })).filter((x) => x.valore != null);
    valori.sort((a, b) => (minoreMeglio ? a.valore - b.valore : b.valore - a.valore));
    const righe = [];
    valori.forEach((x, i) => {
      const pos = i > 0 && x.valore === valori[i - 1].valore ? righe[i - 1].posizione : i + 1;
      const bonus = numero(voci.find((v) => v.classe === x.classe)?.bonus?.[p.id]) ?? 0;
      righe.push({ ...x, posizione: pos, bonus, punti: puntiPosizione(pos) + bonus });
    });
    for (const r of righe) totali.set(r.classe, totali.get(r.classe) + r.punti);
    perProva[p.id] = righe;
  }
  const fp = new Map(voci.map((v) => [v.classe, numero(v.fairPlay) ?? 0]));
  const generale = [...totali.entries()]
    .map(([classe, punti]) => ({ classe, punti, fairPlay: fp.get(classe) }))
    .sort((a, b) => b.punti - a.punti || b.fairPlay - a.fairPlay || a.classe.localeCompare(b.classe));
  generale.forEach((g, i) => {
    const prec = generale[i - 1];
    g.posizione = prec && prec.punti === g.punti && prec.fairPlay === g.fairPlay ? prec.posizione : i + 1;
    g.spareggioFairPlay = Boolean(prec && prec.punti === g.punti && prec.fairPlay !== g.fairPlay) ||
      Boolean(generale[i + 1] && generale[i + 1].punti === g.punti && generale[i + 1].fairPlay !== g.fairPlay);
  });
  return { perProva, generale };
}

/** Classifiche dell'anno per livello (4ª e 5ª separate) e proposta delle classi da iscrivere. */
export function classificheAnno(stato, anno, rilevazione) {
  const out = {};
  for (const livello of [4, 5]) {
    const voci = stato.classi.filter((c) => c.livello === livello).map((c) => {
      const ris = stato.giochi.risultati.find((r) => r.anno === anno && r.classe === c.codice && r.rilevazione === rilevazione);
      return { classe: c.codice, stat: statisticheClasse(ris), fairPlay: ris?.fairPlay, bonus: ris?.bonus };
    }).filter((v) => Object.values(v.stat).some((x) => (typeof x === 'object' ? x?.n : x != null)));
    const cl = classifica(voci, stato.giochi.prove);
    out[livello] = { ...cl, proposta: cl.generale[0]?.classe ?? null };
  }
  return out;
}

/** Riga di storico pluriennale per una classe in un anno (per il confronto negli anni). */
export function rigaStorico(classe, anno, rilevazione, stat) {
  return {
    anno, classe: classe.codice, livello: classe.livello, plesso: classe.plesso, rilevazione,
    supergymMedia: stat.supergym.media, supergymTroncata: stat.supergym.troncata,
    ostacoliMedia: stat.ostacoli.media, ostacoliTroncata: stat.ostacoli.troncata,
    lancia: stat.lancia, staffetta: stat.staffetta, spikeball: stat.spikeball, n: stat.supergym.n
  };
}

// ---------- Azioni pure sui risultati ----------

export function risultatoVuoto(anno, classe, rilevazione) {
  return { anno, classe, rilevazione, individuali: [], squadra: { lancia: [], staffetta: [], spikeball: [] }, bonus: {}, fairPlay: null };
}

export function trovaRisultato(stato, anno, classe, rilevazione) {
  return stato.giochi.risultati.find((r) => r.anno === anno && r.classe === classe && r.rilevazione === rilevazione);
}

/** Aggiorna (o crea) il risultato di una classe in una rilevazione con fn(risultato) → nuovo risultato. */
export function aggiornaRisultato(stato, { anno, classe, rilevazione }, fn) {
  const esistente = trovaRisultato(stato, anno, classe, rilevazione);
  const nuovo = fn(esistente ?? risultatoVuoto(anno, classe, rilevazione));
  const altri = stato.giochi.risultati.filter((r) => r !== esistente);
  return { ...stato, giochi: { ...stato.giochi, risultati: [...altri, nuovo] } };
}

/** patch: { supergym: {tempo, penalita, riduzione, escluso, adattato}, ostacoli: {tempo, riduzione, escluso}, nota } */
export function impostaIndividuale(risultato, alunnoId, patch) {
  const prima = risultato.individuali.find((i) => i.alunnoId === alunnoId) ?? { alunnoId, supergym: {}, ostacoli: {} };
  const dopo = {
    ...prima, ...patch,
    supergym: { ...prima.supergym, ...(patch.supergym || {}) },
    ostacoli: { ...prima.ostacoli, ...(patch.ostacoli || {}) }
  };
  return { ...risultato, individuali: [...risultato.individuali.filter((i) => i.alunnoId !== alunnoId), dopo] };
}

/** Correttivo di classifica della classe in una prova (es. +0,5 o +1 punto). */
export function impostaBonus(risultato, prova, valore) {
  const v = numero(valore);
  if (v != null && (v < 0 || v > 3)) throw new Error('Correttivo di classifica tra 0 e 3 punti.');
  return { ...risultato, bonus: { ...(risultato.bonus ?? {}), [prova]: v } };
}

export function impostaGruppo(risultato, prova, indice, valore) {
  const gruppi = [...(risultato.squadra[prova] ?? [])];
  gruppi[indice] = valore;
  return { ...risultato, squadra: { ...risultato.squadra, [prova]: gruppi } };
}

/** Archivia nello storico pluriennale le statistiche di tutte le classi per anno e rilevazione. */
export function archiviaStorico(stato, anno, rilevazione) {
  const nuove = stato.classi
    .map((c) => ({ c, ris: trovaRisultato(stato, anno, c.codice, rilevazione) }))
    .filter((x) => x.ris)
    .map(({ c, ris }) => rigaStorico(c, anno, rilevazione, statisticheClasse(ris)));
  const restanti = stato.giochi.storico.filter((r) => !(r.anno === anno && r.rilevazione === rilevazione));
  return { ...stato, giochi: { ...stato.giochi, storico: [...restanti, ...nuove] } };
}
