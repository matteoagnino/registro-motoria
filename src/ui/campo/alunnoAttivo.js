// Alunno attivo nella registrazione in palestra: cerchio evidenziato nella barra in fondo,
// e nell'elenco laterale; segue lo scorrimento e l'ultimo tocco, passa da solo al prossimo alunno
// (tranne quando l'alunno si sceglie dall'elenco: in quel caso ci si muove liberamente).

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

/**
 * Evidenzia l'alunno `numero` in una barra (cerchi in fondo) o nell'elenco laterale.
 * Con `porta` scorre il contenitore per mostrarlo; l'elenco laterale resta fermo (lo scorre solo chi lo usa).
 */
export function evidenzia(contenitore, numero, { porta = true } = {}) {
  for (const el of contenitore.querySelectorAll('[data-numero]')) {
    const on = Number(el.dataset.numero) === numero;
    el.classList.toggle('corrente', on);
    if (on) el.setAttribute('aria-current', 'true');
    else el.removeAttribute('aria-current');
  }
  const el = contenitore.querySelector('.corrente');
  if (el && porta) requestAnimationFrame(() => portaInVista(contenitore, el));
}

/** Evidenzia l'alunno ovunque compaia: la barra in fondo lo porta in vista, l'elenco laterale no. */
export function evidenziaOvunque(numero) {
  for (const c of document.querySelectorAll('.nav-alunni.segui')) evidenzia(c, numero);
  for (const c of document.querySelectorAll('.elenco-classe')) evidenzia(c, numero, { porta: false });
}

/** Scorre solo il contenitore (mai la pagina) per mostrare l'elemento. */
function portaInVista(c, el) {
  const orizzontale = c.scrollWidth > c.clientWidth;
  const [inizio, lato, vista, pos] = orizzontale
    ? [el.offsetLeft, el.offsetWidth, c.clientWidth, c.scrollLeft]
    : [el.offsetTop, el.offsetHeight, c.clientHeight, c.scrollTop]; // contenitori posizionati (fixed/sticky)
  if (inizio >= pos + MARGINE_BARRA_PX && inizio + lato <= pos + vista - MARGINE_BARRA_PX) return;
  const meta = inizio - (vista - lato) / 2;
  c.scrollTo(orizzontale ? { left: meta, behavior: 'smooth' } : { top: meta, behavior: 'smooth' });
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
      if (!document.querySelector('.nav-alunni.segui') || Date.now() < pausaFino || !ctx.alunnoAttivo) return;
      const numero = alunnoInVista();
      if (numero == null || numero === ctx.alunnoAttivo.numero) return;
      ctx.alunnoAttivo = { ...ctx.alunnoAttivo, numero };
      evidenziaOvunque(numero);
    });
  }, { passive: true });
}

/**
 * Dopo una breve pausa (per vedere la conferma) passa al prossimo alunno da registrare,
 * se la scheda è ancora fatta (un «Annulla» nel frattempo blocca il passaggio).
 * Non scatta se l'alunno è stato scelto dall'elenco laterale (osservazione libera durante il gioco).
 */
export function avanzaDopo(ctx, chiave, numero, leggiStati) {
  if (ctx.alunnoAttivo?.libero) return;
  setTimeout(() => {
    if (ctx.alunnoAttivo?.chiave !== chiave || ctx.alunnoAttivo.libero) return;
    const stati = leggiStati();
    const mio = stati.find(([a]) => a.numero === numero);
    if (!mio || !schedaFatta(mio[1])) return;
    const prossimo = prossimoDaRegistrare(stati, numero);
    if (prossimo == null || !document.querySelector('.nav-alunni.segui')) return;
    ctx.alunnoAttivo = { chiave, numero: prossimo };
    evidenziaOvunque(prossimo);
    vaiAllaScheda(prossimo);
  }, ATTESA_AVANZA_MS);
}
