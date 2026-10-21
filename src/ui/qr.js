// QR per la sincronizzazione: disegno (SVG) e lettura con la fotocamera, tutto nel dispositivo.
import qrcode from 'qrcode-generator';
import jsQR from 'jsqr';
import { h } from './dom.js';

const SVG = 'http://www.w3.org/2000/svg';
const MARGINE = 4;
const INTERVALLO_LETTURA_MS = 150;
const LATO_ANALISI_PX = 640;

/** QR come SVG (sempre nero su bianco, anche in modalità scura, perché la fotocamera lo legga). */
export function disegnaQR(testo, etichetta) {
  const qr = qrcode(0, 'M');
  qr.addData(testo, 'Byte');
  qr.make();
  const n = qr.getModuleCount();
  const lato = n + MARGINE * 2;
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + MARGINE} ${r + MARGINE}h1v1h-1z`;
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${lato} ${lato}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', etichetta);
  svg.setAttribute('shape-rendering', 'crispEdges');
  const fondo = document.createElementNS(SVG, 'rect');
  fondo.setAttribute('width', lato);
  fondo.setAttribute('height', lato);
  fondo.setAttribute('fill', '#fff');
  const moduli = document.createElementNS(SVG, 'path');
  moduli.setAttribute('d', d);
  moduli.setAttribute('fill', '#000');
  svg.append(fondo, moduli);
  return h('figure.qr', { 'data-codice': testo }, svg);
}

/**
 * Lettore: anteprima della fotocamera e analisi dei fotogrammi finché trova un codice.
 * `onCodice` riceve il testo; se restituisce false la lettura continua (codice sbagliato).
 * Il flusso video resta disponibile finché non si chiama `ferma()`: con la fotocamera attiva
 * i browser rivelano gli indirizzi locali reali, utili per collegarsi sulle reti senza mDNS.
 */
export function lettoreQR({ fotocamera = 'environment', onCodice }) {
  const video = h('video', { playsinline: true, muted: true, autoplay: true, 'aria-label': 'Anteprima della fotocamera' });
  video.setAttribute('playsinline', '');
  const stato = h('p.tenue', 'Avvio della fotocamera…');
  const tela = document.createElement('canvas');
  let flusso = null;
  let timer = null;
  let inPausa = false;
  let finito = false;

  const consegna = async (testo) => {
    if (finito) return;
    inPausa = true;
    const esito = await onCodice(testo.trim());
    if (esito === false) inPausa = false; else ferma();
  };

  const analizza = () => {
    if (video.paused && flusso) video.play().catch(() => {}); // riprende se la schermata è stata ridisegnata
    if (inPausa || video.readyState < 2) return;
    const scala = Math.min(1, LATO_ANALISI_PX / Math.max(video.videoWidth, video.videoHeight));
    tela.width = Math.round(video.videoWidth * scala);
    tela.height = Math.round(video.videoHeight * scala);
    const g = tela.getContext('2d', { willReadFrequently: true });
    g.drawImage(video, 0, 0, tela.width, tela.height);
    const img = g.getImageData(0, 0, tela.width, tela.height);
    const trovato = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
    if (trovato?.data) consegna(trovato.data);
  };

  const pronto = (async () => {
    try {
      flusso = await navigator.mediaDevices.getUserMedia({ video: { facingMode: fotocamera }, audio: false });
      video.srcObject = flusso;
      await video.play().catch(() => {});
      stato.textContent = 'Inquadra il codice QR.';
      timer = setInterval(analizza, INTERVALLO_LETTURA_MS);
      return true;
    } catch {
      stato.textContent = 'Fotocamera non disponibile: inserisci il codice a mano qui sotto.';
      video.hidden = true;
      return false;
    }
  })();

  const manuale = h('textarea', { rows: 3, 'aria-label': 'Codice di collegamento', placeholder: 'RM1~…' });
  const el = h('div.lettore-qr', video, stato,
    h('details.codice-a-mano', h('summary', 'Problemi con la fotocamera? Inserisci il codice a mano'),
      manuale, h('button', { onclick: () => manuale.value.trim() && consegna(manuale.value) }, 'Usa questo codice')));

  /** Ferma l'analisi; con `ancheVideo` spegne anche la fotocamera. */
  function ferma(ancheVideo = false) {
    finito = true;
    clearInterval(timer);
    el.classList.add('letto');
    if (ancheVideo) spegni();
  }
  function spegni() {
    flusso?.getTracks().forEach((t) => t.stop());
    flusso = null;
  }
  return { el, pronto, ferma, spegni };
}
