// Collegamento diretto Mac ↔ iPad sulla rete locale (WebRTC, canale dati cifrato DTLS).
// UNICO punto dell'app che usa la rete: nessun server STUN/TURN, nessun dominio esterno
// (`iceServers: []`, verificato da privacy-check). I codici di collegamento passano solo dai QR.
import { comprimi, espandi } from './segnale.js';
import { aPezzi, Ricomponi } from './pezzi.js';

const CONFIGURAZIONE = { iceServers: [] };
const ATTESA_INDIRIZZI_MS = 3000;
const ATTESA_COLLEGAMENTO_MS = 20000;
const BUFFER_MAX = 1024 * 1024;
export const NON_SI_VEDONO = 'Mac e iPad non si vedono su questa rete (le reti della scuola spesso lo impediscono). '
  + 'Prova collegandoli entrambi all\'hotspot del telefono, oppure usa i file voti.';

/** Attende la fine della raccolta degli indirizzi locali (niente invio a pezzi: tutto finisce nel QR). */
function raccolta(pc) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((ok) => {
    const fine = () => { pc.removeEventListener('icegatheringstatechange', controlla); clearTimeout(t); ok(); };
    const controlla = () => pc.iceGatheringState === 'complete' && fine();
    const t = setTimeout(fine, ATTESA_INDIRIZZI_MS);
    pc.addEventListener('icegatheringstatechange', controlla);
  });
}

/** Mac: crea l'offerta da mostrare nel QR. */
export async function creaOfferta() {
  const pc = new RTCPeerConnection(CONFIGURAZIONE);
  const canale = pc.createDataChannel('registro', { ordered: true });
  await pc.setLocalDescription(await pc.createOffer());
  await raccolta(pc);
  return { pc, canale: Promise.resolve(canale), codice: comprimi(pc.localDescription.sdp, 'offer') };
}

/** iPad: dal codice del Mac crea la risposta da mostrare nel QR. */
export async function rispondiAllOfferta(codice) {
  const { tipo, sdp } = espandi(codice);
  if (tipo !== 'offer') throw new Error('Questo è il codice dell\'iPad: inquadra quello mostrato sul Mac.');
  const pc = new RTCPeerConnection(CONFIGURAZIONE);
  const canale = new Promise((ok) => { pc.ondatachannel = (e) => ok(e.channel); });
  await pc.setRemoteDescription({ type: 'offer', sdp });
  await pc.setLocalDescription(await pc.createAnswer());
  await raccolta(pc);
  return { pc, canale, codice: comprimi(pc.localDescription.sdp, 'answer') };
}

/** Mac: completa il collegamento con il codice dell'iPad. */
export async function completa(pc, codice) {
  const { tipo, sdp } = espandi(codice);
  if (tipo !== 'answer') throw new Error('Questo è il codice del Mac: inquadra quello mostrato sull\'iPad.');
  await pc.setRemoteDescription({ type: 'answer', sdp });
}

/** Attende che il canale sia aperto; errore chiaro se i due dispositivi non si raggiungono. */
export async function aperto(pc, promessaCanale, ms = ATTESA_COLLEGAMENTO_MS) {
  return new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error(NON_SI_VEDONO)), ms);
    pc.addEventListener('connectionstatechange', () => {
      if (pc.connectionState === 'failed') { clearTimeout(t); ko(new Error(NON_SI_VEDONO)); }
    });
    promessaCanale.then((canale) => {
      const pronto = () => { clearTimeout(t); ok(new Messaggero(canale)); };
      if (canale.readyState === 'open') pronto();
      else canale.addEventListener('open', pronto, { once: true });
    });
  });
}

/** Invio e ricezione di messaggi JSON sul canale, a pezzi e senza riempire il buffer. */
export class Messaggero {
  #canale;
  #ricomponi = new Ricomponi();
  #arrivati = [];
  #inAttesa = [];
  #chiuso = false;

  constructor(canale) {
    this.#canale = canale;
    canale.bufferedAmountLowThreshold = BUFFER_MAX / 4;
    canale.addEventListener('message', (e) => {
      const msg = this.#ricomponi.aggiungi(e.data);
      if (!msg) return;
      const chi = this.#inAttesa.shift();
      if (chi) chi.ok(msg); else this.#arrivati.push(msg);
    });
    canale.addEventListener('close', () => {
      this.#chiuso = true;
      for (const chi of this.#inAttesa.splice(0)) chi.ko(new Error('Collegamento interrotto.'));
    });
  }

  async invia(msg) {
    for (const pezzo of aPezzi(msg)) {
      if (this.#canale.bufferedAmount > BUFFER_MAX) {
        await new Promise((ok) => this.#canale.addEventListener('bufferedamountlow', ok, { once: true }));
      }
      this.#canale.send(pezzo);
    }
  }

  /** Prossimo messaggio completo (entro `ms`). */
  ricevi(ms = 60000) {
    if (this.#arrivati.length) return Promise.resolve(this.#arrivati.shift());
    if (this.#chiuso) return Promise.reject(new Error('Collegamento interrotto.'));
    return new Promise((ok, ko) => {
      const chi = { ok, ko };
      this.#inAttesa.push(chi);
      setTimeout(() => {
        const i = this.#inAttesa.indexOf(chi);
        if (i >= 0) { this.#inAttesa.splice(i, 1); ko(new Error('L\'altro dispositivo non risponde.')); }
      }, ms);
    });
  }
}

/** Chiude collegamento e canale senza errori se sono già chiusi. */
export function chiudi(pc) {
  try { pc?.close(); } catch { /* già chiuso */ }
}
