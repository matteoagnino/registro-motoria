// Versionamento dello schema dati e migrazioni (migrate_n_to_n+1).

export const SCHEMA_VERSION = 4;
export const FORMATO_ARCHIVIO = 'registro-motoria-archivio';

const RACCOLTE = ['alunni', 'giornate', 'progetti', 'eventi', 'registrazioni', 'rubricheProcesso', 'giudiziDefinitivi', 'lezioniSvolte'];

/** v0 → v1: archivi precedenti senza schemaVersion; aggiunge le raccolte mancanti. */
function migrate_0_to_1(s) {
  const out = { ...s, schemaVersion: 1 };
  for (const k of RACCOLTE) if (!Array.isArray(out[k])) out[k] = [];
  if (!out.obiettiviPersonalizzati) out.obiettiviPersonalizzati = {};
  out.registrazioni = out.registrazioni.map((r) => ({
    stato: null, recuperataIl: null, deviceId: 'sconosciuto', ...r,
    livelli: Array.isArray(r.livelli) ? r.livelli : [null, null, null, null]
  }));
  out.meta = { importLog: [], ...(out.meta || {}) };
  return out;
}

const PRIMA_SETTIMANA = { dal: '2026-09-14', al: '2026-09-18', motivo: 'Orario ridotto (fino alle 12:30): solo supporto alle classi, nessuna lezione' };

/**
 * v1 → v2 (correzioni di Matteo del 19/10/2026, solo se i valori sono ancora quelli iniziali):
 * 5B Boncompagni «Venerdì 1» = settimana del 19/10; prima settimana senza lezioni; palestra Boncompagni
 * inagibile fino a nuova comunicazione; osservazione basket Manzoni anticipata alla settimana del 19/10.
 */
function migrate_1_to_2(s) {
  const out = { ...s, schemaVersion: 2 };
  if (s.anno?.id !== '2026/27') return out;
  const chiusure = s.anno.chiusure ?? [];
  out.anno = {
    ...s.anno,
    chiusure: chiusure.some((c) => c.dal === PRIMA_SETTIMANA.dal) ? chiusure : [PRIMA_SETTIMANA, ...chiusure],
    vincoli: (s.anno.vincoli ?? []).map((v) => (v.tipo === 'spazio' && v.plesso === 'Boncompagni' && v.al === '2026-10-31'
      ? { ...v, al: s.anno.fine, nota: v.nota.replace('Palestra inagibile', 'Palestra inagibile fino a nuova comunicazione') } : v))
  };
  if (s.impostazioni && !s.impostazioni.settimanaRifVenerdi1) out.impostazioni = { ...s.impostazioni, settimanaRifVenerdi1: '2026-10-19' };
  out.giornate = (s.giornate ?? []).map((g) => (g.id === 'Q1-G02' && g.progetto === 'basket' && g.ancora?.Manzoni === '2026-10-26'
    ? { ...g, ancora: { ...g.ancora, Manzoni: '2026-10-19' } } : g));
  return out;
}

/** v2 → v3: Giochi, il correttivo % unico dell'alunno diventa la riduzione di ciascuna prova a tempo. */
function migrate_2_to_3(s) {
  const risultati = (s.giochi?.risultati ?? []).map((r) => ({
    bonus: {},
    ...r,
    individuali: (r.individuali ?? []).map(({ correttivo, ...i }) => (correttivo
      ? { ...i, supergym: { riduzione: correttivo, ...i.supergym }, ostacoli: { riduzione: correttivo, ...i.ostacoli } }
      : i))
  }));
  return { ...s, schemaVersion: 3, giochi: s.giochi ? { ...s.giochi, risultati } : s.giochi };
}

/** v3 → v4: agenda del docente, lezioni confermate come svolte ({classe, data}). */
function migrate_3_to_4(s) {
  return { ...s, schemaVersion: 4, lezioniSvolte: Array.isArray(s.lezioniSvolte) ? s.lezioniSvolte : [] };
}

export const MIGRAZIONI = { 0: migrate_0_to_1, 1: migrate_1_to_2, 2: migrate_2_to_3, 3: migrate_3_to_4 };

export function migra(stato) {
  let s = { ...stato };
  let v = Number.isInteger(s.schemaVersion) ? s.schemaVersion : 0;
  if (v > SCHEMA_VERSION) {
    throw new Error(`Archivio creato con una versione più recente dell'app (schema ${v}). Aggiorna l'app.`);
  }
  while (v < SCHEMA_VERSION) {
    const fn = MIGRAZIONI[v];
    if (!fn) throw new Error(`Migrazione mancante da schema ${v}`);
    s = fn(s);
    v = s.schemaVersion;
  }
  return s;
}

/** Controllo minimo di coerenza di uno stato (prima di accettarlo da file). */
export function validaStato(s) {
  const errori = [];
  if (!s || typeof s !== 'object') return ['Il file non contiene un registro valido.'];
  if (!s.anno?.inizio || !s.anno?.quadrimestri) errori.push('Manca il calendario dell\'anno scolastico.');
  if (!Array.isArray(s.classi)) errori.push('Manca l\'elenco delle classi.');
  if (!s.didattica?.sottoObiettivi) errori.push('Mancano i sotto-obiettivi.');
  for (const k of RACCOLTE) if (!Array.isArray(s[k])) errori.push(`Raccolta "${k}" non valida.`);
  return errori;
}

export function avvolgiArchivio(stato, ora = new Date()) {
  return { formato: FORMATO_ARCHIVIO, schemaVersion: SCHEMA_VERSION, salvatoIl: ora.toISOString(), stato };
}

/** Legge il testo di un archivio JSON, migra e valida. Lancia Error con messaggio leggibile. */
export function leggiArchivio(testo, base) {
  let obj;
  try {
    obj = JSON.parse(testo);
  } catch {
    throw new Error('Il file non è un JSON leggibile.');
  }
  if (obj?.formato !== FORMATO_ARCHIVIO) throw new Error('Il file non è un archivio di Registro Motoria.');
  const stato = migra({ ...(base || {}), ...obj.stato, schemaVersion: obj.stato?.schemaVersion ?? obj.schemaVersion ?? 0 });
  const errori = validaStato(stato);
  if (errori.length) throw new Error(errori.join(' '));
  return stato;
}
