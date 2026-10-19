// Selettori: viste derivate dallo stato (piano, riepiloghi, verifica voti). Memo sul riferimento allo stato.
import { pianificaTutte, quadrimestriConInizio } from '../pianificazione/planner.js';
import { vociVoto, riepilogoAlunno } from '../calcolo/riepilogo.js';
import { votoRegistrazione, daRecuperare, giudizioVoto } from '../calcolo/voti.js';
import { violazioniRegola } from '../calcolo/regole.js';
import { alunniDi } from './azioni.js';

const memo = (fn) => {
  let ultimoArg;
  let ultimo;
  return (stato) => {
    if (stato !== ultimoArg) {
      ultimo = fn(stato);
      ultimoArg = stato;
    }
    return ultimo;
  };
};

// Il piano dipende solo da calendario, classi, giornate, progetti, eventi e impostazioni.
let pianoChiave = null;
let pianoValore = null;
export function piano(stato) {
  const chiave = [stato.anno, stato.classi, stato.giornate, stato.progetti, stato.eventi, stato.impostazioni];
  if (!pianoChiave || chiave.some((v, i) => v !== pianoChiave[i])) {
    pianoValore = pianificaTutte(stato);
    pianoChiave = chiave;
  }
  return pianoValore;
}

export const classe = (stato, codice) => stato.classi.find((c) => c.codice === codice);
export const giornata = (stato, id) => stato.giornate.find((g) => g.id === id);
export const sottoObiettiviDi = (stato, livello) => stato.didattica.sottoObiettivi[String(livello)] ?? [];
export const sottoObiettivo = (stato, livello, codice) => sottoObiettiviDi(stato, livello).find((s) => s.codice === codice);

export function dataGiornata(stato, codiceClasse, giornataId) {
  return piano(stato)[codiceClasse]?.giornate[giornataId]?.data ?? null;
}

export const quadrimestreDiGiornata = (stato, giornataId) => giornata(stato, giornataId)?.quadrimestre ?? giornataId?.slice(0, 2);

/** Registrazioni indicizzate per alunno. */
export const registrazioniPerAlunno = memo((stato) => {
  const m = new Map();
  for (const r of stato.registrazioni) {
    if (!m.has(r.alunnoId)) m.set(r.alunnoId, []);
    m.get(r.alunnoId).push(r);
  }
  return m;
});

export function riepilogoDi(stato, alunno, quadrimestre) {
  const cl = classe(stato, alunno.classe);
  const q = stato.anno.quadrimestri.find((x) => x.id === quadrimestre);
  const voci = vociVoto({
    registrazioni: registrazioniPerAlunno(stato).get(alunno.id) ?? [],
    quadrimestre,
    metaISO: q?.meta,
    parametri: stato.impostazioni.parametri,
    dataGiornata: (g) => dataGiornata(stato, alunno.classe, g),
    quadrimestreDi: (g) => quadrimestreDiGiornata(stato, g)
  });
  const rubrica = stato.rubricheProcesso.find((r) => r.alunnoId === alunno.id && r.quadrimestre === quadrimestre)?.valore ?? null;
  const definitivi = Object.fromEntries(
    stato.giudiziDefinitivi.filter((g) => g.alunnoId === alunno.id && g.quadrimestre === quadrimestre).map((g) => [g.obiettivo, g.giudizio])
  );
  return {
    ...riepilogoAlunno({ alunno, quadrimestre, voci, sottoObiettivi: sottoObiettiviDi(stato, cl.livello), rubrica, definitivi, impostazioni: stato.impostazioni }),
    rubrica
  };
}

export function riepilogoClasse(stato, codiceClasse, quadrimestre) {
  return alunniDi(stato, codiceClasse).map((a) => ({ alunno: a, r: riepilogoDi(stato, a, quadrimestre) }));
}

/** Giornate della classe in ordine con data pianificata e sotto-obiettivi del livello. */
export function giornateClasse(stato, codiceClasse) {
  const cl = classe(stato, codiceClasse);
  const p = piano(stato)[codiceClasse];
  return stato.giornate.map((g) => ({
    ...g,
    codici: g.sottoObiettivi?.[String(cl.livello)] ?? [],
    data: p?.giornate[g.id]?.data ?? null,
    statoPiano: p?.giornate[g.id]?.stato ?? 'da pianificare'
  }));
}

export function violazioniClasse(stato, codiceClasse) {
  const prove = giornateClasse(stato, codiceClasse).map((g) => ({ giornataId: g.id, data: g.data, sottoObiettivi: g.codici }));
  return violazioniRegola(prove, stato.impostazioni.parametri.giorni_minimi_ripetizione);
}

/** Verifica voti stile Argo: per alunno e giornata, "1.1: 8 · 1.2: 7" o "AS da recuperare". */
export function verificaVoti(stato, codiceClasse) {
  const giornate = giornateClasse(stato, codiceClasse);
  const perAlunno = registrazioniPerAlunno(stato);
  return alunniDi(stato, codiceClasse).map((a) => {
    const regs = perAlunno.get(a.id) ?? [];
    const celle = {};
    for (const g of giornate) {
      const rg = g.codici.map((c) => regs.find((r) => r.giornataId === g.id && r.sottoObiettivo === c)).filter(Boolean);
      if (rg.some(daRecuperare)) celle[g.id] = 'AS da recuperare';
      else if (rg.some((r) => r.stato === 'NV') && rg.every((r) => votoRegistrazione(r) == null)) celle[g.id] = 'NV';
      else {
        celle[g.id] = rg.filter((r) => votoRegistrazione(r) != null).map((r) => `${r.sottoObiettivo}: ${votoRegistrazione(r)}`).join(' · ');
      }
    }
    return { alunno: a, celle };
  });
}

/** Alunni attivi registrati in una giornata (voto in tutti i sotto-obiettivi o uno stato AS/NV/ES). */
export function avanzamentoGiornata(stato, codiceClasse, giornataId) {
  const cl = classe(stato, codiceClasse);
  const codici = giornata(stato, giornataId)?.sottoObiettivi?.[String(cl.livello)] ?? [];
  const attivi = alunniDi(stato, codiceClasse).filter((a) => a.stato === 'Attivo');
  const perAlunno = registrazioniPerAlunno(stato);
  const fatti = attivi.filter((a) => {
    const regs = codici.map((c) => (perAlunno.get(a.id) ?? []).find((r) => r.giornataId === giornataId && r.sottoObiettivo === c));
    return regs.some((r) => r?.stato) || (codici.length > 0 && regs.every((r) => votoRegistrazione(r) != null));
  }).length;
  return { fatti, totale: attivi.length };
}

/** Alunni con prove AS non recuperate, per classe. */
export function daRecuperareClasse(stato, codiceClasse) {
  const ids = new Set(alunniDi(stato, codiceClasse).map((a) => a.id));
  const out = new Map();
  for (const r of stato.registrazioni) {
    if (!ids.has(r.alunnoId) || !daRecuperare(r)) continue;
    if (!out.has(r.alunnoId)) out.set(r.alunnoId, new Set());
    out.get(r.alunnoId).add(r.giornataId);
  }
  return out;
}

export const giudizioDiVoto = (stato, voto) => giudizioVoto(voto, stato.impostazioni.scala);
export const quadrimestri = (stato) => quadrimestriConInizio(stato.anno);
