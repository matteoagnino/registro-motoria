// Shell dell'applicazione: router a hash, layout delle due modalità, ri-render sullo store.
import { h } from './dom.js';
import { icona } from './icone.js';

export const VISTE_GESTIONALE = [
  ['oggi', 'Settimana'],
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

/** Barra laterale compressa a icone: scelta salvata nel browser, altrimenti automatica sulle viste dense. */
function railAttiva(vista) {
  let scelta = null;
  try { scelta = localStorage.getItem('rm-rail'); } catch { /* storage non disponibile */ }
  if (scelta === '1') return true;
  if (scelta === '0') return false;
  return VISTE_DENSE.includes(vista);
}

function impostaRail(valore, ctx) {
  try { localStorage.setItem('rm-rail', valore ? '1' : '0'); } catch { /* storage non disponibile */ }
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
  const rail = railAttiva(vista);
  return h(`div.gestionale${rail ? '.rail' : ''}`,
    h('nav.menu', { 'aria-label': 'Sezioni del gestionale' },
      h('div.marchio', h('span.logo', { 'aria-hidden': 'true' }),
        h('div.marchio-testo', h('strong', 'Registro Motoria'), h('small', `${ctx.store.get().anno.id} · Pacinotti`))),
      h('ul', VISTE_GESTIONALE.map(([id, nome], i) => h('li', h('a', {
        href: `#/gestionale/${id}`, class: id === vista ? 'attivo' : '', 'aria-current': id === vista ? 'page' : null,
        title: nome, 'aria-label': nome
      }, h('i.indice', String(i + 1).padStart(2, '0')), icona(id), h('span.voce', nome))))),
      h('div.piede-menu',
        h('a.voce-campo', { href: '#/campo/home', title: 'Modalità campo (iPad)', 'aria-label': 'Modalità campo (iPad)' }, icona('campo'), h('span.voce', 'Modalità campo')),
        h('button.rail-toggle', {
          onclick: () => impostaRail(!rail, ctx), title: rail ? 'Espandi il menu' : 'Comprimi il menu',
          'aria-label': rail ? 'Espandi il menu' : 'Comprimi il menu'
        }, icona(rail ? 'espandi' : 'comprimi'), h('span.voce', 'Comprimi')),
        h('div.salvataggio', { role: 'status', title: ctx.descriviSalvataggio?.() ?? '' }, h('span.punto'), h('span.voce.salvataggio-testo', ctx.descriviSalvataggio?.() ?? '')))),
    h('main.contenuto', { id: 'contenuto' }, corpo));
}
