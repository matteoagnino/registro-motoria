// Sincronizzazione Mac ↔ iPad: cosa si scambiano i due dispositivi (logica pura, senza rete).
// 1. iPad → Mac «ciao»: classi presenti sull'iPad e voti/tempi non ancora esportati.
// 2. Mac → iPad «pacchetto»: il Mac importa come un file voti (le modifiche restano da confermare)
//    e risponde con il pacchetto delle stesse classi, già aggiornato.
// 3. iPad → Mac «fatto».
import { esportaVoti, importaPacchetto } from '../dati/campo.js';
import { creaPacchetto, leggiFileVoti, leggiPacchetto, importaAutomatico } from '../dati/scambio.js';

export const MSG = { CIAO: 'ciao', PACCHETTO: 'pacchetto', FATTO: 'fatto', ERRORE: 'errore' };

/** iPad: primo messaggio e stato dell'iPad da usare se il Mac conferma l'arrivo. */
export function preparaCiao(campo, ora = new Date()) {
  const { file, campo: esportato } = esportaVoti(campo, { ora });
  return {
    messaggio: { tipo: MSG.CIAO, deviceId: campo.deviceId, classi: campo.pacchetto?.classi.map((c) => c.codice) ?? [], voti: file },
    esportato
  };
}

/**
 * Mac: importa i voti arrivati e prepara il pacchetto di ritorno.
 * Classi del pacchetto: quelle già sull'iPad (se esistono ancora), altrimenti tutte.
 */
export function rispondiAlCiao(stato, ciao, ora = new Date()) {
  if (ciao?.tipo !== MSG.CIAO) throw new Error('Messaggio inatteso dall\'iPad.');
  const voti = leggiFileVoti(JSON.stringify(ciao.voti));
  const esito = importaAutomatico(stato, voti);
  const esistenti = esito.stato.classi.map((c) => c.codice);
  const richieste = (ciao.classi ?? []).filter((c) => esistenti.includes(c));
  const classi = richieste.length ? richieste : esistenti;
  return {
    stato: esito.stato,
    esito: { nuove: esito.nuove, modifiche: esito.modifiche, sconosciute: esito.sconosciute, classi: classi.length },
    voti,
    messaggio: { tipo: MSG.PACCHETTO, pacchetto: creaPacchetto(esito.stato, classi, ora), esito: { nuove: esito.nuove, modifiche: esito.modifiche } }
  };
}

/** iPad: applica il pacchetto arrivato al proprio stato già segnato come esportato. */
export function applicaPacchetto(esportato, risposta, ora = new Date()) {
  if (risposta?.tipo !== MSG.PACCHETTO) throw new Error('Messaggio inatteso dal Mac.');
  const pacchetto = leggiPacchetto(JSON.stringify(risposta.pacchetto));
  return { campo: importaPacchetto(esportato, pacchetto, ora), classi: pacchetto.classi.length, esito: risposta.esito };
}
