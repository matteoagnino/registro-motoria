// Generazione delle lezioni reali di una classe dal calendario e dall'orario.
import { aggiungiGiorni, giornoSettimana, giorniTra, lunediDi, inIntervallo } from './date.js';

export function isChiuso(iso, chiusure) {
  return chiusure.some((c) => inIntervallo(iso, c.dal, c.al));
}

/** Scenario del venerdì alternato: settimane pari/dispari rispetto al lunedì di riferimento. */
export function scenarioSettimana(iso, rifVenerdi1, scenari) {
  if (!rifVenerdi1 || !scenari?.length) return scenari?.[0] ?? 'tutte';
  const settimane = Math.round(giorniTra(lunediDi(rifVenerdi1), lunediDi(iso)) / 7);
  return scenari[((settimane % scenari.length) + scenari.length) % scenari.length];
}

/**
 * Lezioni di una classe nell'anno: [{data, inizio, fine, scenario, aula, nota}]
 * Le lezioni con scenario diverso da 'tutte' valgono solo nelle settimane di quello scenario.
 */
export function generaLezioni(classe, anno, impostazioni = {}) {
  const out = [];
  const scenari = impostazioni.scenariVenerdi ?? ['Venerdì 1', 'Venerdì 2'];
  const rif = impostazioni.settimanaRifVenerdi1 || anno.inizio;
  for (let d = anno.inizio; d <= anno.fine; d = aggiungiGiorni(d, 1)) {
    if (isChiuso(d, anno.chiusure)) continue;
    const gs = giornoSettimana(d);
    const delGiorno = classe.lezioni.filter((l) => l.giorno === gs);
    if (!delGiorno.length) continue;
    const sc = scenarioSettimana(d, rif, scenari);
    const lez = delGiorno.find((l) => l.scenario === 'tutte' || l.scenario === sc);
    if (!lez) continue;
    const spazio = (anno.vincoli || []).find(
      (v) => v.tipo === 'spazio' && v.plesso === classe.plesso && inIntervallo(d, v.dal, v.al)
    );
    out.push({
      data: d,
      inizio: lez.inizio,
      fine: lez.fine,
      scenario: lez.scenario,
      aula: Boolean(spazio),
      nota: spazio?.nota ?? ''
    });
  }
  return out;
}
