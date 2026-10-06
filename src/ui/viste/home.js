import { h } from '../dom.js';

export function home() {
  return h('div.home',
    h('h1', 'Registro Motoria'),
    h('p', 'Educazione motoria · I.C. Pacinotti · a.s. 2026/27'),
    h('p.tenue', 'I dati restano solo su questo dispositivo e nei file che salvi tu.'),
    h('div.scelte',
      h('a', { href: '#/gestionale/oggi' }, 'Gestionale', h('small', 'Mac · archivio, calendario, riepiloghi, giudizi')),
      h('a', { href: '#/campo/home' }, 'Campo', h('small', 'iPad · registrazione voti in palestra, offline'))));
}
