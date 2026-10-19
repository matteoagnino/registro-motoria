// Alunno attivo nella registrazione in palestra: cerchio evidenziato nella barra in fondo,
// segue lo scorrimento della pagina e l'ultimo tocco, passa da solo al prossimo alunno.

const FATTI = ['completo', 'assente', 'es'];
const ATTESA_AVANZA_MS = 600;
const PAUSA_TRACCIA_MS = 1000;
const MARGINE_BARRA_PX = 70;
const SOTTO_TESTA_PX = 24;

let pausaFino = 0;
let tracciaAttiva = false;

/** @param {string} stato */
export const schedaFatta = (stato) => FATTI.includes(stato);

/** Vero solo nel momento in cui la scheda passa da «da fare» a «fatta». */
export const appenaCompletata = (prima, dopo) => !schedaFatta(prima) && schedaFatta(dopo);

/**
 * Primo alunno dopo `numero` ancora da registrare; arrivati in fondo riparte dall'inizio.
 * @param {Array<[{numero:number}, string]>} stati
 * @returns {number|null}
 */
export function prossimoDaRegistrare(stati, numero) {
  const i = stati.findIndex(([a]) => a.numero === numero);
  const ordine = [...stati.slice(i + 1), ...stati.slice(0, Math.max(i, 0))];
  return ordine.find(([, st]) => !schedaFatta(st))?.[0].numero ?? null;
}

/** Evidenzia il cerchio dell'alunno `numero` e lo porta in vista nella barra. */
export function evidenzia(nav, numero) {
  for (const el of nav.children) {
    const on = Number(el.dataset.numero) === numero;
    el.classList.toggle('corrente', on);
    if (on) el.setAttribute('aria-current', 'true');
    else el.removeAttribute('aria-current');
  }
  const el = nav.querySelector('.corrente');
  if (el) requestAnimationFrame(() => centraInBarra(nav, el));
}

function centraInBarra(nav, el) {
  const sinistra = el.offsetLeft;
  const destra = sinistra + el.offsetWidth;
  if (sinistra >= nav.scrollLeft + MARGINE_BARRA_PX && destra <= nav.scrollLeft + nav.clientWidth - MARGINE_BARRA_PX) return;
  nav.scrollTo({ left: sinistra - (nav.clientWidth - el.offsetWidth) / 2, behavior: 'smooth' });
}

/** Per un attimo lo scorrimento non cambia l'alunno attivo (dopo un tocco o durante uno scorrimento automatico). */
export function pausaTraccia() {
  pausaFino = Date.now() + PAUSA_TRACCIA_MS;
}

/** Porta in vista la scheda dell'alunno senza che lo scorrimento cambi l'alunno attivo a metà strada. */
export function vaiAllaScheda(numero) {
  pausaTraccia();
  document.getElementById(`alunno-${numero}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Alunno della scheda che sta subito sotto l'intestazione; null in fondo alla pagina (l'ultimo tocco decide). */
function alunnoInVista() {
  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) return null;
  const linea = (document.querySelector('.campo-testa')?.getBoundingClientRect().bottom ?? 0) + SOTTO_TESTA_PX;
  const schede = [...document.querySelectorAll('.scheda-alunno')];
  const s = schede.find((el) => el.getBoundingClientRect().bottom > linea);
  return s ? Number(s.id.replace('alunno-', '')) : null;
}

/** Ascolta lo scorrimento (una volta sola per tutta l'app) e aggiorna l'alunno attivo della barra in vista. */
export function seguiScorrimento(ctx) {
  if (tracciaAttiva) return;
  tracciaAttiva = true;
  let richiesto = false;
  window.addEventListener('scroll', () => {
    if (richiesto) return;
    richiesto = true;
    requestAnimationFrame(() => {
      richiesto = false;
      const nav = document.querySelector('.nav-alunni.segui');
      if (!nav || Date.now() < pausaFino || !ctx.alunnoAttivo) return;
      const numero = alunnoInVista();
      if (numero == null || numero === ctx.alunnoAttivo.numero) return;
      ctx.alunnoAttivo = { ...ctx.alunnoAttivo, numero };
      evidenzia(nav, numero);
    });
  }, { passive: true });
}

/**
 * Dopo una breve pausa (per vedere la conferma) passa al prossimo alunno da registrare,
 * se la scheda è ancora fatta (un «Annulla» nel frattempo blocca il passaggio).
 */
export function avanzaDopo(ctx, chiave, numero, leggiStati) {
  setTimeout(() => {
    if (ctx.alunnoAttivo?.chiave !== chiave) return;
    const stati = leggiStati();
    const mio = stati.find(([a]) => a.numero === numero);
    if (!mio || !schedaFatta(mio[1])) return;
    const prossimo = prossimoDaRegistrare(stati, numero);
    const nav = document.querySelector('.nav-alunni.segui');
    if (prossimo == null || !nav) return;
    ctx.alunnoAttivo = { chiave, numero: prossimo };
    evidenzia(nav, prossimo);
    vaiAllaScheda(prossimo);
  }, ATTESA_AVANZA_MS);
}
