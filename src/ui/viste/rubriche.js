// Consultazione rubriche per livello di classe e sotto-obiettivo.
import { h, select } from '../dom.js';
import { conParametri } from '../app.js';
import { sottoObiettiviDi } from '../../dati/selettori.js';
import { intestazione, GIUDIZI, LIVELLI, classeNucleo } from './comuni.js';

export function vistaRubriche(ctx, { params }) {
  const stato = ctx.store.get();
  const liv = params.liv || '4';
  const lista = sottoObiettiviDi(stato, liv);
  const scelto = params.so ? lista.filter((s) => s.codice === params.so) : lista;
  return h('div',
    intestazione('Rubriche',
      select([['4', 'Classi 4ª'], ['5', 'Classi 5ª']], liv, { 'aria-label': 'Livello', onchange: (e) => conParametri({ liv: e.target.value, so: '' }) }),
      select([['', 'Tutti i sotto-obiettivi'], ...lista.map((s) => [s.codice, `${s.codice} ${s.etichetta}`])], params.so || '', {
        'aria-label': 'Sotto-obiettivo', onchange: (e) => conParametri({ so: e.target.value })
      }),
      h('button', { onclick: () => window.print() }, 'Stampa')),
    h('p.tenue', 'Descrittori costruiti sui giudizi sintetici (Allegato A, OM 3/2025). Si modificano in Impostazioni → Sotto-obiettivi e rubriche.'),
    scelto.map((so) => h('div.scheda',
      h(`h2`, h(`span.chip.${classeNucleo(so)}`, so.codice), ` ${so.etichetta}`),
      h('p', so.testo),
      h('p.tenue', `Concorre: 1°Q → ${so.concorre.Q1} · 2°Q → ${so.concorre.Q2}`),
      h('div.tabella-scorri', h('table',
        h('thead', h('tr', h('th', 'Indicatore'), h('th', 'Cosa osservo'), GIUDIZI.map((g, i) => h('th', `${LIVELLI[i]} ${g}`)))),
        h('tbody', so.indicatori.map((ind, i) => h('tr',
          h('th', `I${i + 1} ${ind.nome}`), h('td', ind.cosaOsservo),
          GIUDIZI.map((g) => h('td', h('small', ind.descrittori[g] ?? '')))))))))));
}
