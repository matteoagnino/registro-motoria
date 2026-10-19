// Scambio file a senso unico (SPEC §2): pacchetto classe Mac→iPad, file voti iPad→Mac.
import { pianificaTutte } from '../pianificazione/planner.js';
import { aggiornaRisultato, impostaIndividuale, trovaRisultato, PROVE_TEMPO } from '../giochi/giochi.js';

export const FORMATO_PACCHETTO = 'registro-motoria-pacchetto';
export const FORMATO_VOTI = 'registro-motoria-voti';
const CONTENUTO = ['livelli', 'stato', 'recuperataIl'];

/** Pacchetto per l'iPad: classi, alunni, giornate datate per classe, rubriche, codici stato, registrazioni esistenti. */
export function creaPacchetto(stato, codiciClassi, ora = new Date()) {
  const piano = pianificaTutte(stato);
  const classi = stato.classi.filter((c) => codiciClassi.includes(c.codice));
  const ids = new Set(stato.alunni.filter((a) => codiciClassi.includes(a.classe)).map((a) => a.id));
  const livelli = [...new Set(classi.map((c) => String(c.livello)))];
  return {
    formato: FORMATO_PACCHETTO,
    versione: 1,
    creatoIl: ora.toISOString(),
    anno: stato.anno.id,
    classi: classi.map((c) => ({
      codice: c.codice, livello: c.livello, plesso: c.plesso, lezioni: c.lezioni,
      // Lezioni datate dell'anno (con fascia del venerdì già risolta): servono all'iPad per «la lezione di adesso».
      calendario: (piano[c.codice]?.lezioni ?? []).filter((l) => l.tipo !== 'saltata')
        .map(({ data, inizio, fine, tipo, giornataId, recuperoDi }) => ({ data, inizio, fine, tipo, giornataId: giornataId ?? null, recuperoDi: recuperoDi ?? null })),
      giornate: stato.giornate.map((g) => ({
        id: g.id, quadrimestre: g.quadrimestre, descrizione: g.descrizione,
        sottoObiettivi: g.sottoObiettivi[String(c.livello)] ?? [],
        data: piano[c.codice]?.giornate[g.id]?.data ?? null
      })).filter((g) => g.sottoObiettivi.length)
    })),
    alunni: stato.alunni.filter((a) => ids.has(a.id)).map(({ id, classe, numero, cognomeNome, stato: st, op }) => ({ id, classe, numero, cognomeNome, stato: st, op })),
    sottoObiettivi: Object.fromEntries(livelli.map((l) => [l, stato.didattica.sottoObiettivi[l]])),
    scala: stato.impostazioni.scala,
    codiciStato: stato.didattica.codiciStato,
    registrazioni: stato.registrazioni.filter((r) => ids.has(r.alunnoId)),
    giochi: {
      anno: stato.anno.id,
      penalita: stato.giochi.penalitaSupergym,
      tempi: tempiDelMac(stato, codiciClassi)
    }
  };
}

/** Tempi già registrati sul Mac per le classi del pacchetto (anno in corso), nel formato del cronometro. */
function tempiDelMac(stato, codiciClassi) {
  return stato.giochi.risultati
    .filter((r) => r.anno === stato.anno.id && codiciClassi.includes(r.classe))
    .flatMap((r) => r.individuali.flatMap((i) => PROVE_TEMPO.filter((p) => i[p]?.tempo != null).map((prova) => ({
      id: `g|${r.anno}|${r.rilevazione}|${i.alunnoId}|${prova}`, anno: r.anno, classe: r.classe, rilevazione: r.rilevazione,
      alunnoId: i.alunnoId, prova, tempo: i[prova].tempo, penalita: i[prova].penalita ?? 0, updatedAt: null
    }))));
}

export function leggiPacchetto(testo) {
  let p;
  try {
    p = JSON.parse(testo);
  } catch {
    throw new Error('Il file non è leggibile.');
  }
  if (p?.formato !== FORMATO_PACCHETTO) throw new Error('Questo non è un pacchetto classe di Registro Motoria (.rmpack.json).');
  if (!Array.isArray(p.classi) || !Array.isArray(p.alunni) || !p.sottoObiettivi) throw new Error('Pacchetto incompleto.');
  return p;
}

export function creaFileVoti({ registrazioni, tempi = [], deviceId, ora = new Date() }) {
  return { formato: FORMATO_VOTI, versione: 2, creatoIl: ora.toISOString(), deviceId, registrazioni, tempi };
}

export function leggiFileVoti(testo) {
  let f;
  try {
    f = JSON.parse(testo);
  } catch {
    throw new Error('Il file non è leggibile.');
  }
  if (f?.formato !== FORMATO_VOTI || !Array.isArray(f.registrazioni)) throw new Error('Questo non è un file voti di Registro Motoria (.rmvoti.json).');
  for (const r of f.registrazioni) {
    if (!r.id || !r.alunnoId || !r.giornataId || !r.sottoObiettivo || !Array.isArray(r.livelli)) throw new Error('File voti danneggiato: registrazione incompleta.');
    if (r.livelli.some((l) => l != null && !(Number.isInteger(l) && l >= 5 && l <= 10))) throw new Error('File voti danneggiato: livello non valido.');
    if (r.stato != null && !['AS', 'NV', 'ES'].includes(r.stato)) throw new Error('File voti danneggiato: stato non valido.');
  }
  for (const t of f.tempi ?? []) {
    if (!t.alunnoId || !t.anno || !t.classe || !PROVE_TEMPO.includes(t.prova) || ![1, 2].includes(t.rilevazione)) throw new Error('File voti danneggiato: tempo dei Giochi incompleto.');
    if (t.tempo != null && !(Number.isFinite(t.tempo) && t.tempo > 0)) throw new Error('File voti danneggiato: tempo non valido.');
  }
  return { ...f, tempi: f.tempi ?? [] };
}

const stessoContenuto = (a, b) => CONTENUTO.every((k) => JSON.stringify(a[k] ?? null) === JSON.stringify(b[k] ?? null));
const vuota = (r) => !r.stato && !r.recuperataIl && !(r.livelli || []).some((l) => l != null);
const chiave = (r) => `${r.alunnoId}|${r.giornataId}|${r.sottoObiettivo}`;

/**
 * Confronta un file voti con lo stato: nuove (da aggiungere), uguali (ignorate), modifiche (da confermare),
 * sconosciute (alunno inesistente).
 */
export function analizzaImport(stato, fileVoti) {
  const perId = new Map(stato.registrazioni.map((r) => [r.id, r]));
  const perChiave = new Map(stato.registrazioni.map((r) => [chiave(r), r]));
  const alunni = new Set(stato.alunni.map((a) => a.id));
  const esito = { nuove: [], uguali: [], modifiche: [], sconosciute: [], tempi: analizzaTempi(stato, fileVoti.tempi ?? [], alunni) };
  for (const r of fileVoti.registrazioni) {
    if (!alunni.has(r.alunnoId)) {
      esito.sconosciute.push(r);
      continue;
    }
    const esistente = perId.get(r.id) ?? perChiave.get(chiave(r));
    if (!esistente) esito.nuove.push(r);
    else if (stessoContenuto(esistente, r)) esito.uguali.push(r);
    else if (vuota(esistente)) esito.nuove.push({ ...r, sostituisce: esistente.id });
    else esito.modifiche.push({ prima: esistente, dopo: r });
  }
  return esito;
}

/** Valore del tempo sul Mac per un tempo del file ({tempo, penalita} o null). */
function tempoSulMac(stato, t) {
  const i = trovaRisultato(stato, t.anno, t.classe, t.rilevazione)?.individuali.find((x) => x.alunnoId === t.alunnoId);
  return i?.[t.prova]?.tempo != null ? { tempo: i[t.prova].tempo, penalita: i[t.prova].penalita ?? 0 } : null;
}

function analizzaTempi(stato, tempi, alunni) {
  const esito = { nuovi: [], uguali: [], modifiche: [] };
  for (const t of tempi) {
    if (!alunni.has(t.alunnoId)) continue;
    const mac = tempoSulMac(stato, t);
    if (!mac) { if (t.tempo != null) esito.nuovi.push(t); } else if (mac.tempo === t.tempo && mac.penalita === (t.penalita ?? 0)) esito.uguali.push(t);
    else esito.modifiche.push({ prima: mac, dopo: t });
  }
  return esito;
}

function applicaTempi(stato, tempi) {
  return tempi.reduce((s, t) => aggiornaRisultato(s, { anno: t.anno, classe: t.classe, rilevazione: t.rilevazione },
    (r) => impostaIndividuale(r, t.alunnoId, { [t.prova]: { tempo: t.tempo, penalita: t.penalita ?? 0 } })), stato);
}

/** Applica l'import: aggiunge le nuove e le modifiche accettate (per id del file). */
export function applicaImport(stato, analisi, idModificheAccettate = []) {
  const accettate = new Set(idModificheAccettate);
  const daSostituire = new Map();
  for (const r of analisi.nuove) if (r.sostituisce) daSostituire.set(r.sostituisce, r);
  for (const m of analisi.modifiche) if (accettate.has(m.dopo.id)) daSostituire.set(m.prima.id, m.dopo);
  const pulisci = ({ sostituisce: _s, ...r }) => r;
  const aggiornate = stato.registrazioni.map((r) => (daSostituire.has(r.id) ? pulisci(daSostituire.get(r.id)) : r));
  const aggiunte = analisi.nuove.filter((r) => !r.sostituisce).map(pulisci);
  const tempi = [...(analisi.tempi?.nuovi ?? []), ...(analisi.tempi?.modifiche ?? []).filter((m) => accettate.has(m.dopo.id)).map((m) => m.dopo)];
  return applicaTempi({ ...stato, registrazioni: [...aggiornate, ...aggiunte] }, tempi);
}

/**
 * Import automatico di un file voti arrivato dall'iPad: applica subito solo le registrazioni nuove.
 * Le modifiche a voti già presenti restano da confermare a mano (nessun voto viene sovrascritto da solo).
 */
export function importaAutomatico(stato, fileVoti) {
  const analisi = analizzaImport(stato, fileVoti);
  const nuove = analisi.nuove.length + analisi.tempi.nuovi.length;
  return {
    stato: nuove ? applicaImport(stato, analisi, []) : stato,
    nuove,
    modifiche: analisi.modifiche.length + analisi.tempi.modifiche.length,
    sconosciute: analisi.sconosciute.length
  };
}
