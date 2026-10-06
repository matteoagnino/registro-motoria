// Verifica voti stile Argo: riga per alunno, colonna per giornata con i voti raggruppati.
import { h } from '../dom.js';
import { verificaVoti, giornateClasse } from '../../dati/selettori.js';
import { formattaBreve } from '../../pianificazione/date.js';
import { intestazione, selettoreClasse, classeScelta } from './comuni.js';

export function vistaVerifica(ctx, { params }) {
  const stato = ctx.store.get();
  const cl = classeScelta(stato, params);
  const giornate = giornateClasse(stato, cl.codice);
  const righe = verificaVoti(stato, cl.codice);
  return h('div',
    intestazione('Verifica voti', selettoreClasse(stato, cl.codice), h('button', { onclick: () => window.print() }, 'Stampa')),
    h('p.tenue', 'Come su Argo: serve a confrontare il registro con l\'agenda e il registro elettronico.'),
    righe.length === 0 ? h('div.vuoto', 'Nessun alunno.') :
      h('div.tabella-scorri', h('table',
        h('thead', h('tr', h('th.nome', 'N° · Alunno'), giornate.map((g) => h('th', g.id, h('br'), h('small', formattaBreve(g.data)))))),
        h('tbody', righe.map(({ alunno: a, celle }) => h(`tr${a.stato === 'Ritirato' ? '.ritirato' : ''}`,
          h('td.nome', `${a.numero} · ${a.cognomeNome}`),
          giornate.map((g) => h(`td${celle[g.id] === 'AS da recuperare' ? '.avviso-cella' : ''}`, celle[g.id] || ''))))))));
}
