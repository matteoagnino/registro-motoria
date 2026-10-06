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

function assegnaProva(lezioni, idx, g, codici, conRecupero) {
  const l = lezioni[idx];
  l.tipo = 'prova';
  l.giornataId = g.id;
  l.sottoObiettivi = codici;
  if (!conRecupero) return;
  const j = successiva(lezioni, idx);
  if (j >= 0 && (libera(lezioni[j]) || lezioni[j].tipo === 'cuscinetto')) {
    lezioni[j].tipo = 'recupero';
    lezioni[j].recuperoDi = g.id;
  }
}

/**
 * Pianifica una classe.
 * @returns {lezioni, giornate: {id: {data, stato, motivo?}}, avvisi: string[]}
 */
export function pianificaClasse({ classe, anno, giornate, progetti = [], eventi = [], impostazioni = {} }) {
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

  for (const q of quadrimestri) {
    let cursore = 0;
    for (const g of giornate.filter((x) => x.quadrimestre === q.id)) {
      const codici = g.sottoObiettivi?.[livello] ?? [];
      if (g.progetto) {
        const delProgetto = lezioni.filter((l) => l.tipo === 'progetto' && progetti.find((p) => p.id === l.progettoId)?.codice === g.progetto);
        const l = delProgetto[delProgetto.length - 1];
        if (!l) {
          esito[g.id] = { data: null, stato: 'da pianificare' };
          avvisi.push(`${g.id}: progetto "${g.progetto}" senza date per ${classe.plesso}`);
          continue;
        }
        l.giornataId = g.id;
        l.sottoObiettivi = codici;
        esito[g.id] = { data: l.data, stato: 'pianificata' };
        piazzate.push({ giornataId: g.id, data: l.data, sottoObiettivi: codici });
        continue;
      }
      const ancora = g.ancora?.[classe.plesso] ? lunediDi(g.ancora[classe.plesso]) : null;
      const candidata = (usaCuscinetti) => lezioni.findIndex((l, i) =>
        i >= cursore &&
        (libera(l) || (usaCuscinetti && l.tipo === 'cuscinetto')) &&
        inIntervallo(l.data, q.inizio, q.fine) &&
        (!ancora || l.data >= ancora) &&
        violazioniRegola([...piazzate, { giornataId: g.id, data: l.data, sottoObiettivi: codici }], minGiorni).length === 0
      );
      let idx = candidata(false);
      if (idx < 0) {
        idx = candidata(true);
        if (idx >= 0) avvisi.push(`${g.id}: usata una lezione cuscinetto (${formatta(lezioni[idx].data)})`);
      }
      if (idx < 0) {
        esito[g.id] = { data: null, stato: 'non collocabile' };
        avvisi.push(`${g.id}: cuscinetti esauriti nel ${q.id} — valuta di sacrificare questa giornata o una precedente`);
        continue;
      }
      assegnaProva(lezioni, idx, g, codici, true);
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
    const piano = pianificaClasse({ ...base, classe, eventi });
    if (eventi.length) {
      const senza = pianificaClasse({ ...base, classe, eventi: [] });
      for (const [id, g] of Object.entries(piano.giornate)) {
        if (g.data && senza.giornate[id]?.data && g.data !== senza.giornate[id].data) g.stato = 'slittata';
      }
    }
    out[classe.codice] = piano;
  }
  return out;
}
