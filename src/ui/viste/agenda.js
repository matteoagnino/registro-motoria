// Agenda del docente: le lezioni della settimana da confermare; assenze del docente, della classe o di entrambi.
import { h, prova, avviso } from '../dom.js';
import { conParametri } from '../app.js';
import * as A from '../../dati/azioni.js';
import { lezioniNelPeriodo, lezioniDaConfermare } from '../../dati/selettori.js';
import { lunediDi, aggiungiGiorni, oggiISO, formatta } from '../../pianificazione/date.js';
import { intestazione, etichettaTipo } from './comuni.js';
import { settimanaIniziale } from './oggi.js';
import { apriLezioniNonSvolte, effettoSalto } from './nonSvolte.js';

const ASSENZE = ['docente', 'classe', 'entrambi'];

export function vistaAgenda(ctx, { params }) {
  const stato = ctx.store.get();
  const oggi = oggiISO();
  const lun = params.settimana ? lunediDi(params.settimana) : settimanaIniziale(stato);
  const ven = aggiungiGiorni(lun, 4);
  const lezioni = lezioniNelPeriodo(stato, lun, ven, { conSaltate: true });
  const daConfermareSettimana = lezioni.filter((l) => l.data <= oggi && A.esitoLezione(stato, l.classe, l.data) == null);
  const arretrate = lezioniDaConfermare(stato, oggi).filter((l) => l.data < lun);
  const agg = (fn, msg) => prova(() => ctx.store.aggiorna(fn), msg);

  return h('div',
    intestazione({
      titolo: `Agenda · settimana dal ${formatta(lun).slice(0, 5)}`,
      occhiello: stato.anno.id,
      briciole: ['Agenda', 'Le mie lezioni'],
      meta: ['Conferma le lezioni svolte; se manchi tu, la classe o entrambi, segnalo qui: la programmazione si aggiorna da sola.']
    },
    h('button', { onclick: () => conParametri({ settimana: aggiungiGiorni(lun, -7) }), 'aria-label': 'Settimana precedente' }, '‹ Precedente'),
    h('button', { onclick: () => conParametri({ settimana: settimanaIniziale(stato) }) }, 'Questa settimana'),
    h('button', { onclick: () => conParametri({ settimana: aggiungiGiorni(lun, 7) }), 'aria-label': 'Settimana successiva' }, 'Successiva ›'),
    h('button', { onclick: () => apriLezioniNonSvolte(ctx, { dal: lun < oggi && oggi <= ven ? oggi : lun }) }, 'Assenza di più giorni…')),
    arretrate.length ? h('div.scheda.attenzione', { role: 'status' },
      h('strong', `${arretrate.length} lezioni delle settimane passate da confermare`), ' · ',
      h('a', { href: `#/gestionale/agenda?settimana=${lunediDi(arretrate[0].data)}` }, `vai alla settimana del ${formatta(lunediDi(arretrate[0].data)).slice(0, 5)}`),
      ' · ',
      h('button', {
        onclick: () => agg((s) => A.confermaLezioni(s, arretrate), `${arretrate.length} lezioni passate confermate come svolte`)
      }, 'Conferma tutte come svolte')) : null,
    h('div.barra-agenda',
      h('button.primario', {
        disabled: !daConfermareSettimana.length,
        onclick: () => agg((s) => A.confermaLezioni(s, daConfermareSettimana),
          `${daConfermareSettimana.length} lezioni confermate come svolte`)
      }, daConfermareSettimana.length ? `Conferma le ${daConfermareSettimana.length} lezioni svolte fino a oggi` : 'Nessuna lezione da confermare'),
      h('span.tenue', 'Le lezioni future si confermano dal giorno stesso; le assenze si possono segnare anche in anticipo.')),
    [0, 1, 2, 3, 4].map((i) => giorno(ctx, aggiungiGiorni(lun, i), lezioni, oggi, agg)));
}

function giorno(ctx, d, lezioni, oggi, agg) {
  const stato = ctx.store.get();
  const delGiorno = lezioni.filter((l) => l.data === d);
  const chiusura = stato.anno.chiusure.find((c) => d >= c.dal && d <= c.al);
  const tutteAssenteIo = delGiorno.length && delGiorno.every((l) => A.esitoLezione(stato, l.classe, l.data) === 'docente');
  return h(`section.scheda.giorno-agenda${d === oggi ? '.oggi' : ''}`, { 'aria-label': formatta(d, true) },
    h('div.intestazione',
      h('h2', formatta(d, true), d === oggi ? h('span.badge-oggi', 'oggi') : null),
      delGiorno.length && !tutteAssenteIo ? h('button', {
        onclick: () => agg((s) => delGiorno.reduce((x, l) => A.impostaEsitoLezione(x, { classe: l.classe, data: l.data, esito: 'docente' }), s),
          'Assenza segnata per tutte le lezioni del giorno')
      }, 'Sono assente tutto il giorno') : null),
    chiusura ? h('p.tenue', `Scuola chiusa: ${chiusura.motivo}`) : null,
    !chiusura && !delGiorno.length ? h('p.tenue', 'Nessuna lezione.') : null,
    delGiorno.length ? h('ul.lezioni-agenda', delGiorno.map((l) => rigaLezione(ctx, l, oggi, agg))) : null);
}

function rigaLezione(ctx, l, oggi, agg) {
  const stato = ctx.store.get();
  const esito = A.esitoLezione(stato, l.classe, l.data);
  const evento = stato.eventi.find((e) => e.classe === l.classe && e.data === l.data);
  const imposta = (nuovo) => {
    const valore = esito === nuovo ? null : nuovo;
    agg((s) => A.impostaEsitoLezione(s, { classe: l.classe, data: l.data, esito: valore }));
    if (valore && valore !== 'svolta') avviso(`${l.classe}: lezione non svolta, programmazione aggiornata`);
  };
  const futura = l.data > oggi;
  const assente = ASSENZE.includes(esito) || esito === 'saltata';
  return h(`li.esito-${esito ?? 'da-confermare'}`,
    h('div.dove', h('span.ora', `${l.inizio}–${l.fine}`), h('strong', l.classe), h('small.tenue', l.plesso)),
    h('div.cosa',
      assente ? h('b', 'Non svolta')
        : [etichettaTipo(l.tipo), l.giornataId ? h('strong', ` ${l.giornataId}`) : null, l.recuperoDi ? ` recupero di ${l.recuperoDi}` : '',
          l.giochi ? h('span.badge-giochi', 'Giochi') : null,
          esito == null && (l.tipo === 'prova' || l.tipo === 'recupero') ? h('small.tenue.se-manca', `Se non si svolge: ${effettoSalto(l)}`) : null],
      assente && evento ? h('input.motivo', {
        value: evento.motivo, 'aria-label': `Motivo ${l.classe} ${l.data}`, 'data-focus': `motivo-${l.classe}-${l.data}`,
        onchange: (e) => agg((s) => A.impostaEsitoLezione(s, { classe: l.classe, data: l.data, esito: evento.chi ?? 'classe', motivo: e.target.value }))
      }) : null),
    h('div.esiti', { role: 'group', 'aria-label': `Esito ${l.classe} ${l.data}` },
      Object.entries(A.ESITI_LEZIONE).map(([k, testo]) => h(`button${esito === k ? '.attivo' : ''}.esito-${k}`, {
        type: 'button', 'aria-pressed': String(esito === k), disabled: k === 'svolta' && futura,
        title: k === 'svolta' && futura ? 'Si conferma dal giorno della lezione' : testo,
        onclick: () => imposta(k)
      }, testo))));
}
