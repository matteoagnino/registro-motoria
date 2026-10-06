// Riepilogo per alunno e quadrimestre (SPEC §4.4–4.8), con spiegazione del calcolo.
import {
  votoRegistrazione, daRecuperare, pesoProva, mediaPonderata, valoreFinale,
  giudizioDaValore, giudizioVoto
} from './voti.js';

export const OBIETTIVI = ['A', 'B', 'TEC', 'CIV'];
export const MSG_ES = 'Esonerato: concordare con referente e dirigente';
export const MSG_POCHI = 'Pochi voti: valutazione alternativa (scritta/orale).';
export const MSG_OP = 'Riferito agli obiettivi personalizzati.';

/**
 * Voti di un alunno in un quadrimestre.
 * @param registrazioni registrazioni dell'alunno
 * @param dataGiornata (giornataId) => data ISO della prova per la classe
 * @param quadrimestreDi (giornataId) => 'Q1'|'Q2'
 */
export function vociVoto({ registrazioni, quadrimestre, dataGiornata, quadrimestreDi, metaISO, parametri }) {
  return registrazioni
    .filter((r) => quadrimestreDi(r.giornataId) === quadrimestre)
    .map((r) => {
      const data = dataGiornata(r.giornataId);
      return {
        giornataId: r.giornataId,
        sottoObiettivo: r.sottoObiettivo,
        data,
        voto: votoRegistrazione(r),
        peso: pesoProva(data, metaISO, parametri),
        daRecuperare: daRecuperare(r)
      };
    });
}

function giudizioFinale(calcolato, definitivo) {
  return definitivo || calcolato || '';
}

/**
 * Calcola il riepilogo di un alunno per un quadrimestre.
 * sottoObiettivi: definizioni del livello della classe (con concorre).
 * definitivi: { A: 'Buono', ... } (giudizi inseriti da Matteo)
 */
export function riepilogoAlunno({ alunno, quadrimestre, voci, sottoObiettivi, rubrica, definitivi = {}, impostazioni }) {
  const { parametri, soglie } = impostazioni;
  const concorreDi = new Map(sottoObiettivi.map((s) => [s.codice, s.concorre?.[quadrimestre] ?? '—']));
  const conVoto = voci.filter((v) => v.voto != null);

  const perSotto = {};
  for (const s of sottoObiettivi) {
    const vs = conVoto.filter((v) => v.sottoObiettivo === s.codice);
    perSotto[s.codice] = mediaPonderata(vs);
  }

  const obiettivi = {};
  for (const ob of OBIETTIVI) {
    const vs = conVoto.filter((v) => concorreDi.get(v.sottoObiettivo) === ob);
    const media = mediaPonderata(vs);
    const conProcesso = ob === 'A' || ob === 'B';
    const valore = conProcesso ? valoreFinale(media, rubrica, parametri) : media;
    const calcolato = giudizioDaValore(valore, soglie);
    obiettivi[ob] = {
      n: vs.length,
      media,
      valore,
      calcolato,
      definitivo: definitivi[ob] || '',
      voti: vs,
      spiegazione: spiega({ ob, vs, media, valore, rubrica: conProcesso ? rubrica : null, calcolato, parametri })
    };
  }

  const nDaRecuperare = new Set(voci.filter((v) => v.daRecuperare).map((v) => v.giornataId)).size;
  const esito = { perSotto, obiettivi, daRecuperare: nDaRecuperare, avvisi: [], riporta: {} };

  if (alunno.stato === 'ES') {
    esito.avvisi = [MSG_ES];
    for (const ob of OBIETTIVI) esito.riporta[ob] = 'ES';
    return esito;
  }
  if (alunno.stato === 'Ritirato') {
    esito.avvisi = ['Ritirato'];
    for (const ob of OBIETTIVI) esito.riporta[ob] = '';
    return esito;
  }
  if (obiettivi.A.n < parametri.min_voti_obiettivo || obiettivi.B.n < parametri.min_voti_obiettivo) {
    esito.avvisi.push(MSG_POCHI);
  }
  if (nDaRecuperare > 0) esito.avvisi.push(`Da recuperare: ${nDaRecuperare}.`);
  if (alunno.op) esito.avvisi.push(MSG_OP);
  for (const ob of OBIETTIVI) esito.riporta[ob] = giudizioFinale(obiettivi[ob].calcolato, obiettivi[ob].definitivo);
  return esito;
}

const fmt = (n) => (n == null ? '—' : String(n).replace('.', ','));

function spiega({ ob, vs, media, valore, rubrica, calcolato, parametri }) {
  if (vs.length === 0) return `Ob. ${ob}: nessun voto nel quadrimestre.`;
  const elenco = vs.map((v) => `${v.sottoObiettivo} (${v.giornataId}) ${v.voto}×${fmt(v.peso)}`).join(' + ');
  const sommaPesi = vs.reduce((a, v) => a + v.peso, 0);
  let s = `Media ponderata = (${elenco}) / ${fmt(sommaPesi)} = ${fmt(media)}`;
  if (rubrica != null && valore !== media) {
    s += ` · Valore = ${fmt(parametri.quota_prove)}×${fmt(media)} + ${fmt(parametri.quota_processo)}×${fmt(rubrica)} (processo) = ${fmt(valore)}`;
  }
  return `${s} → ${calcolato}`;
}

/** Spiegazione di un voto di prova (per il tocco su un voto). */
export function spiegaVoto(livelli, scala) {
  const validi = (livelli || []).filter((l) => typeof l === 'number');
  if (!validi.length) return 'Nessun indicatore compilato: nessun voto.';
  const somma = validi.reduce((a, b) => a + b, 0);
  const media = somma / validi.length;
  const voto = Math.round(media + 1e-9);
  return `(${validi.join(' + ')}) / ${validi.length} = ${fmt(Math.round(media * 100) / 100)} → ${voto} ${giudizioVoto(voto, scala)}`;
}
