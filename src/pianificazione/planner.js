// Motore di pianificazione (SPEC §5): dalla sequenza condivisa delle giornate alle lezioni reali per classe.
import { generaLezioni } from './lezioni.js';
import { aggiungiGiorni, lunediDi, inIntervallo, formatta } from './date.js';
import { violazioniRegola } from '../calcolo/regole.js';

export const TIPI_LEZIONE = ['prova', 'recupero', 'normale', 'progetto', 'cuscinetto', 'libera', 'saltata'];

/** Quadrimestri con data di inizio esplicita. */
export function quadrimestriConInizio(anno) {
  return anno.quadrimestri.map((q, i) => ({
    ...q,
    inizio: i === 0 ? anno.inizio : aggiungiGiorni(anno.quadrimestri[i - 1].fine, 1)
  }));
}

export function quadrimestreDiData(iso, anno) {
  return quadrimestriConInizio(anno).find((q) => inIntervallo(iso, q.inizio, q.fine))?.id ?? null;
}

const libera = (l) => l.tipo == null;

function marcaSaltate(lezioni, eventi) {
  return lezioni.map((l) => {
    const ev = eventi.find((e) => e.data === l.data);
    return ev ? { ...l, tipo: 'saltata', motivo: ev.motivo || 'lezione saltata', eventoId: ev.id } : { ...l };
  });
}

function marcaProgetti(lezioni, classe, progetti) {
  for (const p of progetti.filter((x) => x.plesso === classe.plesso && x.dal && x.al)) {
    const dentro = lezioni.filter((l) => libera(l) && inIntervallo(l.data, p.dal, p.al)).slice(0, p.nLezioni || 99);
    for (const l of dentro) {
      l.tipo = 'progetto';
      l.progettoId = p.id;
      l.motivo = p.nome;
    }
  }
}

function marcaLibere(lezioni, anno) {
  const natale = anno.chiusure.find((c) => /natale/i.test(c.motivo));
  const prima = natale ? lezioni.filter((l) => l.data < natale.dal && l.tipo !== 'saltata') : [];
  const ultimaNatale = prima[prima.length - 1];
  if (ultimaNatale && libera(ultimaNatale)) {
    ultimaNatale.tipo = 'libera';
    ultimaNatale.motivo = 'Attività scelta dai bambini (prima delle vacanze di Natale)';
  }
  const valide = lezioni.filter((l) => l.tipo !== 'saltata');
  const ultima = valide[valide.length - 1];
  if (ultima && libera(ultima)) {
    ultima.tipo = 'libera';
    ultima.motivo = "Attività scelta dai bambini (ultima lezione dell'anno)";
  }
}

function marcaCuscinetti(lezioni, quadrimestri, n) {
  for (const q of quadrimestri) {
    const nelQ = lezioni.filter((l) => libera(l) && inIntervallo(l.data, q.inizio, q.fine));
    for (const l of nelQ.slice(Math.max(0, nelQ.length - n))) {
      l.tipo = 'cuscinetto';
      l.quadrimestre = q.id;
    }
  }
}

/** Prossima lezione non saltata dopo l'indice i. */
function successiva(lezioni, i) {
  for (let j = i + 1; j < lezioni.length; j++) if (lezioni[j].tipo !== 'saltata') return j;
  return -1;
}

const disponibile = (l) => libera(l) || l.tipo === 'cuscinetto';

/**
 * Lezione di recupero: la successiva alla prova. Se quella è riservata a una prova successiva
 * (giornata rimasta al suo posto dopo uno slittamento), la prima lezione disponibile dopo.
 */
function indiceRecupero(lezioni, idx, riservate) {
  let j = successiva(lezioni, idx);
  if (j < 0 || !riservate.has(lezioni[j].data)) return j >= 0 && disponibile(lezioni[j]) ? j : -1;
  while (j >= 0 && (riservate.has(lezioni[j].data) || !disponibile(lezioni[j]))) j = successiva(lezioni, j);
  return j;
}

function assegnaProva(lezioni, idx, g, codici, riservate) {
  const l = lezioni[idx];
  l.tipo = 'prova';
  l.giornataId = g.id;
  l.sottoObiettivi = codici;
  if (g.giochi) l.giochi = true;
  const j = indiceRecupero(lezioni, idx, riservate);
  if (j >= 0) {
    lezioni[j].tipo = 'recupero';
    lezioni[j].recuperoDi = g.id;
  }
}

/**
 * Cuscinetti esauriti: le giornate dei Giochi della Gioventù non si sacrificano mai (tutte le classi devono
 * avere le stesse rilevazioni); si propone l'ultima giornata già collocata che non è dei Giochi.
 */
function avvisoNonCollocabile(g, q, piazzate, giornate) {
  const giochi = new Set(giornate.filter((x) => x.giochi).map((x) => x.id));
  const sacrificabile = [...piazzate].reverse().find((p) => !giochi.has(p.giornataId) && quadrimestreGiornata(p.giornataId) === q.id);
  const proposta = sacrificabile ? `sacrifica ${sacrificabile.giornataId} (non dei Giochi)` : 'nessuna giornata sacrificabile prima di questa';
  return g.giochi
    ? `${g.id} (Giochi della Gioventù, da non sacrificare): cuscinetti esauriti nel ${q.id} — ${proposta} per farle posto`
    : `${g.id}: cuscinetti esauriti nel ${q.id} — valuta di sacrificare questa giornata oppure ${sacrificabile ? sacrificabile.giornataId : 'una precedente'} (non dei Giochi)`;
}

const quadrimestreGiornata = (id) => id.slice(0, 2);

/**
 * Pianifica una classe.
 * `riferimento` (giornataId → data del piano senza lezioni saltate): una prova non va mai prima della sua data
 * di riferimento e le date di riferimento restano riservate alle prove. Così una prova saltata prende il posto
 * del suo recupero e le giornate successive restano dove erano (la classe resta allineata alle altre);
 * solo se la regola dei giorni minimi lo impedisce la sequenza scala in avanti.
 * @returns {lezioni, giornate: {id: {data, stato, motivo?}}, avvisi: string[]}
 */
export function pianificaClasse({ classe, anno, giornate, progetti = [], eventi = [], impostazioni = {}, riferimento = {} }) {
  const minGiorni = impostazioni.giorniMinimi ?? 9;
  const nCuscinetti = impostazioni.cuscinetti ?? 2;
  const quadrimestri = quadrimestriConInizio(anno);
  const lezioni = marcaSaltate(generaLezioni(classe, anno, impostazioni), eventi.filter((e) => e.classe === classe.codice));
  marcaProgetti(lezioni, classe, progetti);
  marcaLibere(lezioni, anno);
  marcaCuscinetti(lezioni, quadrimestri, nCuscinetti);

  const esito = {};
  const avvisi = [];
  const piazzate = [];
  const livello = String(classe.livello);
  const saltate = new Set(lezioni.filter((l) => l.tipo === 'saltata').map((l) => l.data));
  let riservate = new Set(Object.values(riferimento).filter((d) => d && !saltate.has(d)));

  for (const q of quadrimestri) {
    let cursore = 0;
    for (const g of giornate.filter((x) => x.quadrimestre === q.id)) {
      const codici = g.sottoObiettivi?.[livello] ?? [];
      if (g.progetto) {
        const delProgetto = lezioni.filter((l) => l.tipo === 'progetto' && progetti.find((p) => p.id === l.progettoId)?.codice === g.progetto);
        // Settimana indicata → prima lezione di progetto da quel lunedì (le successive servono da recupero); altrimenti l'ultima.
        const settimana = g.ancora?.[classe.plesso] ? lunediDi(g.ancora[classe.plesso]) : null;
        const k = settimana ? delProgetto.findIndex((x) => x.data >= settimana) : delProgetto.length - 1;
        const l = delProgetto[k];
        if (!l) {
          esito[g.id] = { data: null, stato: 'da pianificare' };
          avvisi.push(`${g.id}: progetto "${g.progetto}" senza date per ${classe.plesso}`);
          continue;
        }
        for (const r of delProgetto.slice(k + 1)) r.recuperoDi = g.id;
        l.giornataId = g.id;
        l.sottoObiettivi = codici;
        if (g.giochi) l.giochi = true;
        esito[g.id] = { data: l.data, stato: 'pianificata' };
        piazzate.push({ giornataId: g.id, data: l.data, sottoObiettivi: codici });
        continue;
      }
      const ancora = g.ancora?.[classe.plesso] ? lunediDi(g.ancora[classe.plesso]) : null;
      const rif = riferimento[g.id];
      const candidata = (usaCuscinetti) => lezioni.findIndex((l, i) =>
        i >= cursore &&
        (libera(l) || (usaCuscinetti && l.tipo === 'cuscinetto')) &&
        inIntervallo(l.data, q.inizio, q.fine) &&
        (!ancora || l.data >= ancora) &&
        (!rif || l.data >= rif) &&
        (l.data === rif || !riservate.has(l.data)) &&
        violazioniRegola([...piazzate, { giornataId: g.id, data: l.data, sottoObiettivi: codici }], minGiorni).length === 0
      );
      let idx = candidata(false);
      if (idx < 0) {
        idx = candidata(true);
        if (idx >= 0) avvisi.push(`${g.id}: usata una lezione cuscinetto (${formatta(lezioni[idx].data)})`);
      }
      if (idx < 0) {
        esito[g.id] = { data: null, stato: 'non collocabile' };
        avvisi.push(avvisoNonCollocabile(g, q, piazzate, giornate));
        continue;
      }
      // Spostata non per una lezione saltata ma dalla regola dei giorni minimi: da qui la sequenza scala in avanti.
      if (rif && lezioni[idx].data !== rif && !saltate.has(rif)) riservate = new Set();
      assegnaProva(lezioni, idx, g, codici, riservate);
      esito[g.id] = { data: lezioni[idx].data, stato: 'pianificata' };
      piazzate.push({ giornataId: g.id, data: lezioni[idx].data, sottoObiettivi: codici });
      cursore = idx + 1;
    }
  }
  for (const l of lezioni) if (libera(l)) l.tipo = 'normale';
  return { lezioni, giornate: esito, avvisi, violazioni: violazioniRegola(piazzate, minGiorni) };
}

/** Pianifica tutte le classi; segna come "slittata" una giornata spostata da lezioni saltate. */
export function pianificaTutte(stato) {
  const out = {};
  const base = {
    anno: stato.anno, giornate: stato.giornate, progetti: stato.progetti,
    impostazioni: {
      giorniMinimi: stato.impostazioni.parametri.giorni_minimi_ripetizione,
      cuscinetti: stato.impostazioni.cuscinetti,
      settimanaRifVenerdi1: stato.impostazioni.settimanaRifVenerdi1,
      scenariVenerdi: stato.impostazioni.scenariVenerdi
    }
  };
  for (const classe of stato.classi) {
    const eventi = stato.eventi.filter((e) => e.classe === classe.codice);
    if (!eventi.length) {
      out[classe.codice] = pianificaClasse({ ...base, classe });
      continue;
    }
    const senza = pianificaClasse({ ...base, classe, eventi: [] });
    const riferimento = Object.fromEntries(Object.entries(senza.giornate).map(([id, g]) => [id, g.data]));
    const piano = pianificaClasse({ ...base, classe, eventi, riferimento });
    for (const [id, g] of Object.entries(piano.giornate)) {
      if (g.data && senza.giornate[id]?.data && g.data !== senza.giornate[id].data) g.stato = 'slittata';
    }
    out[classe.codice] = piano;
  }
  return out;
}
