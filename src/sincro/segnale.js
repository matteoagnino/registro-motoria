// Segnale WebRTC nel QR: dalla descrizione SDP si tengono solo credenziali ICE, impronta DTLS,
// ruolo e indirizzi UDP locali; dall'altra parte si ricostruisce una SDP minima per un canale dati.
// Nessun server: i due dispositivi si scambiano questi codici inquadrandoli a vicenda.

const VERSIONE = 'RM1';
const SEP = '~';
const TIPI = { offer: 'o', answer: 'a' };
const RUOLI = { actpass: 'x', active: 'a', passive: 'p' };
const PRIORITA_BASE = 2122260223;

const riga = (sdp, chiave) => sdp.split(/\r?\n/).find((r) => r.startsWith(`a=${chiave}:`))?.slice(chiave.length + 3).trim() ?? null;
const inverti = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k]));

const esaABase64 = (esa) => btoa(String.fromCharCode(...esa.split(':').map((x) => parseInt(x, 16))));
const base64AEsa = (b) => [...atob(b)].map((c) => c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')).join(':');

/** Indirizzi UDP «host» della SDP, come «indirizzo_porta». */
function indirizzi(sdp) {
  return sdp.split(/\r?\n/).filter((r) => r.startsWith('a=candidate:')).map((r) => r.split(' '))
    .filter((p) => p[2]?.toLowerCase() === 'udp' && p[7] === 'host')
    .map((p) => `${p[4]}_${p[5]}`);
}

/**
 * @param {string} sdp descrizione locale completa (dopo la raccolta degli indirizzi)
 * @param {'offer'|'answer'} tipo
 * @returns {string} codice da mettere nel QR
 */
export function comprimi(sdp, tipo) {
  const ufrag = riga(sdp, 'ice-ufrag');
  const pwd = riga(sdp, 'ice-pwd');
  const [algoritmo, impronta] = (riga(sdp, 'fingerprint') ?? '').split(' ');
  const ruolo = RUOLI[riga(sdp, 'setup')];
  const cand = indirizzi(sdp);
  if (!ufrag || !pwd || !impronta || !ruolo) throw new Error('Descrizione del collegamento incompleta.');
  if (!cand.length) throw new Error('Nessuna rete disponibile: controlla che il Wi-Fi sia acceso.');
  return [VERSIONE, TIPI[tipo], ufrag, pwd, `${algoritmo}:${esaABase64(impronta)}`, ruolo, cand.join(',')].join(SEP);
}

/**
 * @param {string} codice letto dal QR
 * @returns {{tipo: 'offer'|'answer', sdp: string}}
 */
export function espandi(codice) {
  const parti = String(codice).trim().split(SEP);
  if (parti[0] !== VERSIONE) throw new Error('Questo QR non è un codice di Registro Motoria.');
  if (parti.length !== 7) throw new Error('Codice incompleto: inquadra di nuovo il QR.');
  const [, t, ufrag, pwd, fp, r, cand] = parti;
  const tipo = inverti(TIPI)[t];
  const setup = inverti(RUOLI)[r];
  const [algoritmo, b64] = fp.split(':');
  if (!tipo || !setup || !b64) throw new Error('Codice non valido: inquadra di nuovo il QR.');
  const candidati = cand.split(',').filter(Boolean).map((c, i) => {
    const k = c.lastIndexOf('_');
    return `a=candidate:${i + 1} 1 udp ${PRIORITA_BASE - i} ${c.slice(0, k)} ${c.slice(k + 1)} typ host`;
  });
  const sdp = [
    'v=0', 'o=- 1 2 IN IP4 127.0.0.1', 's=-', 't=0 0', 'a=group:BUNDLE 0', 'a=msid-semantic: WMS',
    'm=application 9 UDP/DTLS/SCTP webrtc-datachannel', 'c=IN IP4 0.0.0.0',
    ...candidati, 'a=end-of-candidates',
    `a=ice-ufrag:${ufrag}`, `a=ice-pwd:${pwd}`,
    `a=fingerprint:${algoritmo} ${base64AEsa(b64)}`, `a=setup:${setup}`,
    'a=mid:0', 'a=sctp-port:5000', 'a=max-message-size:262144', ''
  ].join('\r\n');
  return { tipo, sdp };
}
