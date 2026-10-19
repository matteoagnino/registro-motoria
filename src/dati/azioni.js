// Azioni sui dati: funzioni pure (stato, …) → nuovo stato. Nessuna mutazione.
import { nuovoId } from './id.js';

const ora = () => new Date().toISOString();
const confronto = (a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' });

// ---------- Classi e alunni ----------

export function aggiungiClasse(stato, classe) {
  if (!classe.codice?.trim()) throw new Error('Il codice della classe è obbligatorio.');
  if (stato.classi.some((c) => c.codice === classe.codice)) throw new Error(`La classe ${classe.codice} esiste già.`);
  if (![4, 5].includes(Number(classe.livello))) throw new Error('Il livello deve essere 4 o 5.');
  return {
    ...stato,
    classi: [...stato.classi, { lezioni: [], sezione: '', plesso: 'Manzoni', ...classe, livello: Number(classe.livello) }]
  };
}

export function modificaClasse(stato, codice, patch) {
  return { ...stato, classi: stato.classi.map((c) => (c.codice === codice ? { ...c, ...patch, codice } : c)) };
}

export const alunniDi = (stato, classe) =>
  stato.alunni.filter((a) => a.classe === classe).sort((a, b) => a.numero - b.numero);

function validaNome(nome) {
  const n = (nome || '').trim().replace(/\s+/g, ' ');
  if (!n) throw new Error('Il nome dell\'alunno è obbligatorio.');
  if (n.length > 80) throw new Error('Nome troppo lungo.');
  return n;
}

/** Nuovo alunno in coda (primo numero libero dopo l'ultimo). */
export function aggiungiAlunno(stato, { classe, cognomeNome, op = false, note = '' }) {
  if (!stato.classi.some((c) => c.codice === classe)) throw new Error('Classe inesistente.');
  const numero = Math.max(0, ...alunniDi(stato, classe).map((a) => a.numero)) + 1;
  const alunno = { id: nuovoId(), classe, numero, cognomeNome: validaNome(cognomeNome), stato: 'Attivo', op: Boolean(op), note };
  return { ...stato, alunni: [...stato.alunni, alunno] };
}

/** Elenco iniziale: se la classe è vuota ordina alfabeticamente, altrimenti accoda nell'ordine dato. */
export function importaElencoAlunni(stato, classe, nomi) {
  const puliti = nomi.map((n) => n.trim()).filter(Boolean).map(validaNome);
  const vuota = alunniDi(stato, classe).length === 0;
  const ordinati = vuota ? [...puliti].sort(confronto) : puliti;
  return ordinati.reduce((s, cognomeNome) => aggiungiAlunno(s, { classe, cognomeNome }), stato);
}

export function modificaAlunno(stato, id, patch) {
  const { numero: _n, id: _i, classe: _c, ...ammessi } = patch;
  if ('cognomeNome' in ammessi) ammessi.cognomeNome = validaNome(ammessi.cognomeNome);
  if ('stato' in ammessi && !['Attivo', 'Ritirato', 'ES'].includes(ammessi.stato)) throw new Error('Stato non valido.');
  return { ...stato, alunni: stato.alunni.map((a) => (a.id === id ? { ...a, ...ammessi } : a)) };
}

/** Eliminazione definitiva (solo dopo conferma esplicita in interfaccia). */
export function eliminaAlunno(stato, id) {
  return {
    ...stato,
    alunni: stato.alunni.filter((a) => a.id !== id),
    registrazioni: stato.registrazioni.filter((r) => r.alunnoId !== id),
    rubricheProcesso: stato.rubricheProcesso.filter((r) => r.alunnoId !== id),
    giudiziDefinitivi: stato.giudiziDefinitivi.filter((r) => r.alunnoId !== id)
  };
}

export function impostaObiettiviPersonalizzati(stato, alunnoId, testi) {
  return { ...stato, obiettiviPersonalizzati: { ...stato.obiettiviPersonalizzati, [alunnoId]: { A: '', B: '', adattamenti: '', ...testi } } };
}

// ---------- Registrazioni ----------

const chiaveReg = (r) => `${r.alunnoId}|${r.giornataId}|${r.sottoObiettivo}`;

export function trovaRegistrazione(stato, alunnoId, giornataId, sottoObiettivo) {
  return stato.registrazioni.find((r) => r.alunnoId === alunnoId && r.giornataId === giornataId && r.sottoObiettivo === sottoObiettivo);
}

function upsertRegistrazione(stato, base, modifica, deviceId) {
  const esistente = trovaRegistrazione(stato, base.alunnoId, base.giornataId, base.sottoObiettivo);
  const prima = esistente ?? { id: nuovoId(), ...base, livelli: [null, null, null, null], stato: null, recuperataIl: null };
  const dopo = { ...modifica(prima), updatedAt: ora(), deviceId: deviceId || stato.meta?.deviceId || 'gestionale' };
  const registrazioni = esistente
    ? stato.registrazioni.map((r) => (chiaveReg(r) === chiaveReg(dopo) ? dopo : r))
    : [...stato.registrazioni, dopo];
  return { ...stato, registrazioni };
}

const validaLivello = (v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 5 || n > 10) throw new Error('Livello non valido (10–5).');
  return n;
};

/** Imposta il livello (10–5 o null) di un indicatore. */
export function impostaLivello(stato, { classe, alunnoId, giornataId, sottoObiettivo, indice, valore, deviceId }) {
  const v = validaLivello(valore);
  return upsertRegistrazione(stato, { classe, alunnoId, giornataId, sottoObiettivo }, (r) => {
    const livelli = [...r.livelli];
    livelli[indice] = v;
    return { ...r, livelli };
  }, deviceId);
}

/** Stato dell'alunno nella giornata (AS/NV/ES/null), applicato a tutti i sotto-obiettivi del giorno. */
export function impostaStatoGiornata(stato, { classe, alunnoId, giornataId, sottoObiettivi, valore, deviceId }) {
  if (valore != null && !['AS', 'NV', 'ES'].includes(valore)) throw new Error('Stato non valido.');
  return sottoObiettivi.reduce(
    (s, so) => upsertRegistrazione(s, { classe, alunnoId, giornataId, sottoObiettivo: so }, (r) => ({ ...r, stato: valore }), deviceId),
    stato
  );
}

export function impostaRecupero(stato, { classe, alunnoId, giornataId, sottoObiettivi, data, deviceId }) {
  return sottoObiettivi.reduce(
    (s, so) => upsertRegistrazione(s, { classe, alunnoId, giornataId, sottoObiettivo: so }, (r) => ({ ...r, recuperataIl: data || null }), deviceId),
    stato
  );
}

// ---------- Valutazione finale ----------

export function impostaRubrica(stato, alunnoId, quadrimestre, valore) {
  const v = validaLivello(valore);
  const altre = stato.rubricheProcesso.filter((r) => !(r.alunnoId === alunnoId && r.quadrimestre === quadrimestre));
  return { ...stato, rubricheProcesso: v == null ? altre : [...altre, { alunnoId, quadrimestre, valore: v }] };
}

export function impostaGiudizioDefinitivo(stato, { alunnoId, quadrimestre, obiettivo, giudizio, commento }) {
  const altri = stato.giudiziDefinitivi.filter((g) => !(g.alunnoId === alunnoId && g.quadrimestre === quadrimestre && g.obiettivo === obiettivo));
  const vuoto = !giudizio && !commento;
  return { ...stato, giudiziDefinitivi: vuoto ? altri : [...altri, { alunnoId, quadrimestre, obiettivo, giudizio: giudizio || '', commento: commento || '' }] };
}

// ---------- Calendario ----------

export function aggiungiEvento(stato, { classe, data, motivo }) {
  if (!classe || !/^\d{4}-\d{2}-\d{2}$/.test(data || '')) throw new Error('Classe e data sono obbligatorie.');
  if (stato.eventi.some((e) => e.classe === classe && e.data === data)) throw new Error('Lezione già segnata come saltata.');
  return { ...stato, eventi: [...stato.eventi, { id: nuovoId(), classe, data, motivo: (motivo || 'Lezione saltata').trim() }] };
}

export const rimuoviEvento = (stato, id) => ({ ...stato, eventi: stato.eventi.filter((e) => e.id !== id) });

export function salvaGiornata(stato, giornata) {
  if (!/^Q[12]-G\d{2}$/.test(giornata.id)) throw new Error('Codice giornata non valido (es. Q1-G04).');
  for (const liv of ['4', '5']) {
    const codici = giornata.sottoObiettivi?.[liv] ?? [];
    if (codici.length > 4) throw new Error('Al massimo 4 sotto-obiettivi per giornata.');
    if (new Set(codici).size !== codici.length) throw new Error('Lo stesso sotto-obiettivo non può comparire due volte nella giornata.');
  }
  const g = { ancora: {}, progetto: null, descrizione: '', ...giornata, quadrimestre: giornata.id.slice(0, 2) };
  const esiste = stato.giornate.some((x) => x.id === g.id);
  const giornate = esiste ? stato.giornate.map((x) => (x.id === g.id ? g : x)) : [...stato.giornate, g];
  return { ...stato, giornate: [...giornate].sort((a, b) => a.id.localeCompare(b.id)) };
}

export function eliminaGiornata(stato, id) {
  if (stato.registrazioni.some((r) => r.giornataId === id)) throw new Error('La giornata ha già voti registrati: non si può eliminare.');
  return { ...stato, giornate: stato.giornate.filter((g) => g.id !== id) };
}

export function prossimoIdGiornata(stato, quadrimestre) {
  const n = stato.giornate.filter((g) => g.quadrimestre === quadrimestre).map((g) => Number(g.id.slice(4)));
  return `${quadrimestre}-G${String(Math.max(0, ...n) + 1).padStart(2, '0')}`;
}

export function salvaProgetto(stato, progetto) {
  const p = { nLezioni: 4, codice: 'basket', ...progetto };
  const esiste = stato.progetti.some((x) => x.id === p.id);
  return { ...stato, progetti: esiste ? stato.progetti.map((x) => (x.id === p.id ? p : x)) : [...stato.progetti, { ...p, id: p.id || nuovoId() }] };
}

/** Modifica un vincolo di spazio (es. palestra inagibile) per indice. */
export function aggiornaVincolo(stato, indice, patch) {
  const vincoli = (stato.anno.vincoli ?? []).map((v, i) => (i === indice ? { ...v, ...patch } : v));
  return { ...stato, anno: { ...stato.anno, vincoli } };
}

// ---------- Impostazioni e didattica ----------

export function aggiornaImpostazioni(stato, patch) {
  return { ...stato, impostazioni: { ...stato.impostazioni, ...patch } };
}

export function aggiornaParametri(stato, patch) {
  for (const [k, v] of Object.entries(patch)) if (typeof v !== 'number' || Number.isNaN(v)) throw new Error(`Valore non valido per ${k}.`);
  return aggiornaImpostazioni(stato, { parametri: { ...stato.impostazioni.parametri, ...patch } });
}

export function aggiornaSottoObiettivo(stato, livello, codice, patch) {
  const lista = stato.didattica.sottoObiettivi[livello].map((s) => (s.codice === codice ? { ...s, ...patch, codice } : s));
  return { ...stato, didattica: { ...stato.didattica, sottoObiettivi: { ...stato.didattica.sottoObiettivi, [livello]: lista } } };
}

export function aggiornaIndicatore(stato, livello, codice, indice, patch) {
  const so = stato.didattica.sottoObiettivi[livello].find((s) => s.codice === codice);
  const indicatori = so.indicatori.map((ind, i) => (i === indice ? { ...ind, ...patch, descrittori: { ...ind.descrittori, ...(patch.descrittori || {}) } } : ind));
  return aggiornaSottoObiettivo(stato, livello, codice, { indicatori });
}

export function aggiornaObiettivoScheda(stato, livello, chiave, testo) {
  const os = stato.didattica.obiettiviScheda;
  return { ...stato, didattica: { ...stato.didattica, obiettiviScheda: { ...os, [livello]: { ...os[livello], [chiave]: testo } } } };
}
