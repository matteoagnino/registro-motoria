// Shell dell'applicazione: router a hash, layout delle due modalità, ri-render sullo store.
import { h } from './dom.js';
import { icona } from './icone.js';
import { lezioniDaConfermare } from '../dati/selettori.js';
import { oggiISO } from '../pianificazione/date.js';

export const VISTE_GESTIONALE = [
  ['oggi', 'Settimana'],
  ['agenda', 'Agenda'],
  ['calendario', 'Calendario'],
  ['classi', 'Classi e alunni'],
  ['registro', 'Registro'],
  ['riepilogo', 'Riepilogo'],
  ['verifica', 'Verifica voti'],
  ['rubriche', 'Rubriche'],
  ['giochi', 'Giochi'],
  ['scambio', 'Import/Export'],
  ['impostazioni', 'Impostazioni'],
  ['guida', 'Guida']
];

export function leggiRotta(hash = location.hash) {
  const [percorso, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const [modo = '', vista = '', ...resto] = percorso.split('/').filter(Boolean);
  return { modo, vista, resto, params: Object.fromEntries(new URLSearchParams(query)) };
}

export function vai(modo, vista, params = {}) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString();
  location.hash = `#/${modo}/${vista}${q ? `?${q}` : ''}`;
}

/** Aggiorna i parametri della rotta corrente senza cambiare vista. */
export function conParametri(patch) {
  const r = leggiRotta();
  vai(r.modo, r.vista, { ...r.params, ...patch });
}

function preservaFocus(radice, render) {
  const attivo = document.activeElement;
  const chiave = attivo?.dataset?.focus;
  const scroll = [...radice.querySelectorAll('[data-scroll]')].map((el) => [el.dataset.scroll, el.scrollLeft, el.scrollTop]);
  const y = window.scrollY;
  render();
  for (const [k, l, t] of scroll) {
    const el = radice.querySelector(`[data-scroll="${k}"]`);
    if (el) { el.scrollLeft = l; el.scrollTop = t; }
  }
  window.scrollTo(0, y);
  if (chiave) radice.querySelector(`[data-focus="${CSS.escape(chiave)}"]`)?.focus();
}

export function avviaApp(radice, ctx, { viste, vistaCampo, home }) {
  const render = () => {
    const r = leggiRotta();
    preservaFocus(radice, () => {
      radice.replaceChildren();
      if (r.modo === 'campo') {
        document.body.dataset.modo = 'campo';
        radice.append(vistaCampo(ctx, r));
        return;
      }
      if (r.modo !== 'gestionale') {
        document.body.dataset.modo = 'home';
        radice.append(home(ctx));
        return;
      }
      document.body.dataset.modo = 'gestionale';
      const vista = viste[r.vista] ? r.vista : 'oggi';
      radice.append(layoutGestionale(ctx, vista, () => viste[vista](ctx, r)));
    });
  };
  window.addEventListener('hashchange', render);
  ctx.ridisegna = render;
  ctx.store.ascolta((_s, info) => {
    if (info?.erroreSalvataggio) ctx.statoSalvataggio = 'errore';
    render();
  });
  render();
}

const VISTE_DENSE = ['registro', 'riepilogo', 'verifica'];
const GRUPPI = [
  ['Didattica', ['oggi', 'agenda', 'calendario', 'classi']],
  ['Valutazione', ['registro', 'riepilogo', 'verifica', 'rubriche']],
  ['Altro', ['giochi']],
  ['', ['scambio', 'impostazioni', 'guida']]
];
const NOMI_VISTE = Object.fromEntries(VISTE_GESTIONALE);

/** Numero di lezioni passate ancora da confermare nell'agenda (nel menu). */
function contaDaConfermare(stato) {
  const n = lezioniDaConfermare(stato, oggiISO()).length;
  return n ? h('span.conta.da-confermare', { title: `${n} lezioni da confermare` }, n) : null;
}
const LARGHEZZA_AMPIA = 1560;

/** Barra laterale nascosta: scelta salvata nel browser, altrimenti automatica sulle viste dense in finestre non ampie. */
function sidebarNascosta(vista) {
  let scelta = null;
  try { scelta = localStorage.getItem('rm-sidebar-nascosta'); } catch { /* storage non disponibile */ }
  if (scelta === '1') return true;
  if (scelta === '0') return false;
  return VISTE_DENSE.includes(vista) && window.innerWidth < LARGHEZZA_AMPIA;
}

function impostaSidebar(nascosta, ctx) {
  try { localStorage.setItem('rm-sidebar-nascosta', nascosta ? '1' : '0'); } catch { /* storage non disponibile */ }
  ctx.ridisegna();
}

function layoutGestionale(ctx, vista, contenuto) {
  let corpo;
  try {
    corpo = contenuto();
  } catch (e) {
    console.error(e);
    corpo = h('div.errore-vista', h('h2', 'Qualcosa non ha funzionato in questa schermata'), h('p', e.message),
      h('p', 'I dati sono al sicuro. Prova a ricaricare la pagina o a tornare alla Settimana.'));
  }
  const nascosta = sidebarNascosta(vista);
  const stato = ctx.store.get();
  return h(`div.gestionale${nascosta ? '.senza-sidebar' : ''}`,
    h('nav.menu', { 'aria-label': 'Sezioni del gestionale', 'aria-hidden': nascosta ? 'true' : null, inert: nascosta || null },
      h('div.marchio', h('strong', 'Registro Motoria'), h('small', `${stato.anno.id} · I.C. Pacinotti`)),
      GRUPPI.map(([titolo, voci]) => h('div.gruppo-menu',
        titolo ? h('h6', titolo) : h('div.separatore-menu'),
        h('ul', voci.map((id) => h('li', h('a', {
          href: `#/gestionale/${id}`, class: id === vista ? 'attivo' : '', 'aria-current': id === vista ? 'page' : null
        }, icona(id), h('span', NOMI_VISTE[id]), id === 'classi' ? h('span.conta', stato.classi.length) : null,
          id === 'agenda' ? contaDaConfermare(stato) : null)))))),
      h('div.gruppo-menu', h('h6', 'iPad'), h('ul', h('li', h('a', { href: '#/campo/home' }, icona('campo'), h('span', 'Modalità campo')))))),
    h('div.area',
      h('header.toolbar',
        h('button.icona-sola', {
          onclick: () => impostaSidebar(!nascosta, ctx), title: nascosta ? 'Mostra la barra laterale' : 'Nascondi la barra laterale',
          'aria-label': nascosta ? 'Mostra la barra laterale' : 'Nascondi la barra laterale', 'aria-expanded': String(!nascosta)
        }, icona('sidebar')),
        h('div.toolbar-titolo', NOMI_VISTE[vista]),
        h('div.spazio'),
        h('div.salvataggio', { role: 'status', title: ctx.descriviSalvataggio?.() ?? '' }, h('span.punto'), h('span.salvataggio-testo', ctx.descriviSalvataggio?.() ?? ''))),
      h('main.contenuto', { id: 'contenuto' }, corpo)));
}
