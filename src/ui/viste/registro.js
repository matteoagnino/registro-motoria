// Registro per classe e giornata: alunni × sotto-obiettivi × indicatori, voto e giudizio calcolati.
import { h, select, modale, prova } from '../dom.js';
import { conParametri } from '../app.js';
import * as A from '../../dati/azioni.js';
import { giornateClasse, sottoObiettivo, giudizioDiVoto } from '../../dati/selettori.js';
import { votoRegistrazione, pesoProva, daRecuperare } from '../../calcolo/voti.js';
import { spiegaVoto } from '../../calcolo/riepilogo.js';
import { formatta } from '../../pianificazione/date.js';
import { intestazione, selettoreClasse, classeScelta, apriRubrica, LIVELLI, GIUDIZI, classeNucleo } from './comuni.js';

export function vistaRegistro(ctx, { params }) {
  const stato = ctx.store.get();
  const cl = classeScelta(stato, params);
  const giornate = giornateClasse(stato, cl.codice);
  const g = giornate.find((x) => x.id === params.g) ?? giornate.find((x) => x.data) ?? giornate[0];
  const controlli = [
    selettoreClasse(stato, cl.codice),
    select(giornate.map((x) => [x.id, `${x.id} · ${x.data ? formatta(x.data) : x.statoPiano}`]), g?.id, {
      'aria-label': 'Giornata', 'data-focus': 'sel-g', onchange: (e) => conParametri({ g: e.target.value })
    }),
    h('button', { onclick: () => conParametri({ stampa: params.stampa ? '' : '1' }) }, params.stampa ? 'Torna al registro' : 'Griglia da stampare')
  ];
  if (!g) return h('div', intestazione('Registro', ...controlli), h('div.vuoto', 'Nessuna giornata in sequenza: aggiungila dal Calendario.'));
  const alunni = A.alunniDi(stato, cl.codice);
  if (!g.codici.length) return h('div', intestazione('Registro', ...controlli), h('div.vuoto', `La giornata ${g.id} non ha sotto-obiettivi per le classi ${cl.livello}ª.`));
  if (params.stampa) return h('div', intestazione('Registro', ...controlli), grigliaStampa(stato, cl, g, alunni, params.nomi !== '0'));

  const q = stato.anno.quadrimestri.find((x) => x.id === g.quadrimestre);
  const peso = pesoProva(g.data, q?.meta, stato.impostazioni.parametri);
  const sos = g.codici.map((c) => sottoObiettivo(stato, cl.livello, c)).filter(Boolean);

  return h('div',
    intestazione('Registro', ...controlli),
    h('div.scheda',
      h('h2', `${g.id} · ${g.descrizione || '(senza descrizione)'}`),
      h('p', g.data ? formatta(g.data, true) : `Data: ${g.statoPiano}`, ` · ${cl.codice} · peso ${String(peso).replace('.', ',')}`),
      ctx.descrittoreRegistro ? h('div.descrittore', { role: 'status' }, ctx.descrittoreRegistro) : h('p.tenue', 'Scegli un livello: qui comparirà il descrittore. Tocca il nome di un indicatore per la rubrica completa.')),
    alunni.length === 0 ? h('div.vuoto', 'Nessun alunno in questa classe: aggiungili da Classi e alunni.') :
      h('div.tabella-scorri', { 'data-scroll': 'registro' }, h('table',
        h('thead',
          h('tr', h('th.nome', { rowspan: 2 }, 'N° · Alunno'), h('th', { rowspan: 2 }, 'Stato'), h('th', { rowspan: 2 }, 'Recuperata il'),
            sos.map((so) => h(`th.${classeNucleo(so)}`, { colspan: 6 }, `${so.codice} ${so.etichetta}`, h('br'),
              h('small', `concorre a Ob. ${so.concorre[g.quadrimestre]} · peso ${String(peso).replace('.', ',')}`)))),
          h('tr', sos.map((so) => [
            ...so.indicatori.map((ind, i) => h(`th.${classeNucleo(so)}`, h('span.cliccabile', {
              role: 'button', tabindex: 0, title: ind.cosaOsservo,
              onclick: () => apriRubrica(stato, cl.livello, so.codice, i),
              onkeydown: (e) => e.key === 'Enter' && apriRubrica(stato, cl.livello, so.codice, i)
            }, `I${i + 1} ${ind.nome}`))),
            h('th', 'Voto'), h('th', 'Giudizio (Argo)')]))),
        h('tbody', alunni.map((a) => rigaAlunno(ctx, cl, g, sos, a))))));
}

function rigaAlunno(ctx, cl, g, sos, a) {
  const stato = ctx.store.get();
  const regs = sos.map((so) => A.trovaRegistrazione(stato, a.id, g.id, so.codice));
  const statoGiorno = regs.find((r) => r?.stato)?.stato ?? '';
  const recuperata = regs.find((r) => r?.recuperataIl)?.recuperataIl ?? '';
  const base = { classe: cl.codice, alunnoId: a.id, giornataId: g.id };
  const agg = (fn) => prova(() => ctx.store.aggiorna(fn));
  const escluso = a.stato === 'Ritirato' || a.stato === 'ES';
  return h(`tr${a.stato === 'Ritirato' ? '.ritirato' : a.stato === 'ES' ? '.es' : ''}`,
    h('td.nome', `${a.numero} · ${a.cognomeNome}`, a.op ? h('small', ' (OP)') : null, a.stato !== 'Attivo' ? h('small', ` ${a.stato}`) : null),
    h('td', select([['', '—'], ['AS', 'AS assente'], ['NV', 'NV non valut.'], ['ES', 'ES esonerato']], statoGiorno, {
      'aria-label': `Stato ${a.numero}`, 'data-focus': `st-${a.id}`, disabled: escluso,
      onchange: (e) => agg((s) => A.impostaStatoGiornata(s, { ...base, sottoObiettivi: g.codici, valore: e.target.value || null }))
    })),
    h('td', statoGiorno === 'AS' ? h('input', {
      type: 'date', value: recuperata, 'aria-label': `Recuperata il ${a.numero}`,
      class: regs.some(daRecuperare) ? 'input-giallo' : '',
      onchange: (e) => agg((s) => A.impostaRecupero(s, { ...base, sottoObiettivi: g.codici, data: e.target.value }))
    }) : ''),
    sos.map((so, k) => {
      const r = regs[k];
      const voto = votoRegistrazione(r);
      return [
        ...so.indicatori.map((ind, i) => {
          const v = r?.livelli?.[i] ?? '';
          return h('td.num', select([['', ''], ...LIVELLI.map((l) => [l, l])], v, {
            class: `sel-livello${v === '' ? ' vuoto-ind' : ''}`, disabled: escluso,
            'aria-label': `${a.numero} ${so.codice} I${i + 1}`, 'data-focus': `l-${a.id}-${so.codice}-${i}`,
            onchange: (e) => {
              const val = e.target.value === '' ? null : Number(e.target.value);
              ctx.descrittoreRegistro = val == null ? null
                : `${so.codice} I${i + 1} ${ind.nome} · ${val} ${GIUDIZI[LIVELLI.indexOf(val)]}: ${ind.descrittori[GIUDIZI[LIVELLI.indexOf(val)]]}`;
              agg((s) => A.impostaLivello(s, { ...base, sottoObiettivo: so.codice, indice: i, valore: val }));
            }
          }));
        }),
        h('td.calc', voto == null ? '' : h('span.cliccabile', {
          role: 'button', tabindex: 0,
          onclick: () => modale(`Voto ${so.codice} · n. ${a.numero}`, h('p', spiegaVoto(r.livelli, stato.impostazioni.scala)))
        }, voto)),
        h('td.calc', giudizioDiVoto(stato, voto))
      ];
    }));
}

/** Griglia cartacea di riserva per la giornata (nomi visibili o solo numeri). */
function grigliaStampa(stato, cl, g, alunni, conNomi) {
  const sos = g.codici.map((c) => sottoObiettivo(stato, cl.livello, c)).filter(Boolean);
  return h('div',
    h('div.barra.no-stampa',
      h('label', h('input', { type: 'checkbox', checked: conNomi, onchange: (e) => conParametri({ nomi: e.target.checked ? '1' : '0' }) }), ' Mostra i nomi'),
      h('button.primario', { onclick: () => window.print() }, 'Stampa (A4 orizzontale)')),
    h('h2', `${cl.codice} · ${g.id} · ${g.descrizione} · ${g.data ? formatta(g.data, true) : ''}`),
    h('p', 'Livelli: 10 Ottimo · 9 Distinto · 8 Buono · 7 Discreto · 6 Sufficiente · 5 Non sufficiente · Stato: AS assente · NV non valutabile'),
    h('table',
      h('thead',
        h('tr', h('th', { rowspan: 2 }, 'N°'), conNomi ? h('th', { rowspan: 2 }, 'Alunno') : null, h('th', { rowspan: 2 }, 'Stato'),
          sos.map((so) => h(`th.${classeNucleo(so)}`, { colspan: 4 }, `${so.codice} ${so.etichetta}`))),
        h('tr', sos.map((so) => so.indicatori.map((ind, i) => h(`th.${classeNucleo(so)}`, `I${i + 1} ${ind.nome}`))))),
      h('tbody', alunni.filter((a) => a.stato !== 'Ritirato').map((a) => h('tr',
        h('td.num', a.numero), conNomi ? h('td', a.cognomeNome) : null, h('td.cella-stampa', a.stato === 'ES' ? 'ES' : ''),
        sos.map(() => [0, 1, 2, 3].map(() => h('td.cella-stampa', ''))))))));
}
