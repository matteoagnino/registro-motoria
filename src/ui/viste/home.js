import { h } from '../dom.js';
import { icona } from '../icone.js';

export function home() {
  return h('div.home',
    h('span.logo', { 'aria-hidden': 'true' }),
    h('div.briciole', 'Educazione motoria', h('i', '/'), 'I.C. Pacinotti', h('i', '/'), 'a.s. 2026/27'),
    h('h1', 'Registro Motoria'),
    h('p.tenue', 'I dati restano solo su questo dispositivo e nei file che salvi tu. Nessun account, nessuna rete.'),
    h('div.scelte',
      h('a', { href: '#/gestionale/oggi' }, icona('registro'), 'Gestionale', h('small', 'Mac · archivio, calendario, riepiloghi, giudizi, Giochi')),
      h('a', { href: '#/campo/home' }, icona('campo'), 'Campo', h('small', 'iPad · registrazione voti in palestra, offline'))));
}
