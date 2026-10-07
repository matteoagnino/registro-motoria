// Registro per classe e giornata: alunni × sotto-obiettivi × indicatori, voto e giudizio calcolati.
import { h, select, modale, prova } from '../dom.js';
import { conParametri } from '../app.js';
import * as A from '../../dati/azioni.js';
import { giornateClasse, sottoObiettivo, giudizioDiVoto } from '../../dati/selettori.js';
import { votoRegistrazione, pesoProva, daRecuperare } from '../../calcolo/voti.js';
import { spiegaVoto } from '../../calcolo/riepilogo.js';
import { formatta } from '../../pianificazione/date.js';
import { icona } from '../icone.js';
import {
  intestazione, selettoreClasse, classeScelta, apriRubrica, LIVELLI, GIUDIZI, classeNucleo, contatore, legendaLivelli
} from './comuni.js';

const NOMI_Q = { Q1: '1° quadrimestre', Q2: '2° quadrimestre' };
const pesoTesto = (p) => String(p).replace('.', ',');

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
    h('button', { onclick: () => conParametri({ stampa: params.stampa ? '' : '1' }) }, icona('stampa'), params.stampa ? 'Torna al registro' : 'Griglia da stampare')
  ];
  if (!g) return h('div', intestazione('Registro', ...controlli), h('div.vuoto', 'Nessuna giornata in sequenza: aggiungila dal Calendario.'));
  const alunni = A.alunniDi(stato, cl.codice);
  const testa = (extra = []) => intestazione({
    titolo: g.descrizione || '(senza descrizione)',
    occhiello: g.id,
    briciole: ['Registro', `${cl.codice} · ${cl.plesso}`, NOMI_Q[g.quadrimestre] ?? g.quadrimestre],
    meta: [g.data ? formatta(g.data, true) : `Data: ${g.statoPiano}`,
      `Peso ${pesoTesto(pesoProva(g.data, stato.anno.quadrimestri.find((x) => x.id === g.quadrimestre)?.meta, stato.impostazioni.parametri))}`,
      `${g.codici.length} sotto-obiettivi`]
  }, ...extra, ...controlli);
  if (!g.codici.length) return h('div', testa(), h('div.vuoto', `La giornata ${g.id} non ha sotto-obiettivi per le classi ${cl.livello}ª.`));
  if (params.stampa) return h('div', testa(), grigliaStampa(stato, cl, g, alunni, params.nomi !== '0'));

  const q = stato.anno.quadrimestri.find((x) => x.id === g.quadrimestre);
  const peso = pesoProva(g.data, q?.meta, stato.impostazioni.parametri);
  const sos = g.codici.map((c) => sottoObiettivo(stato, cl.livello, c)).filter(Boolean);
  const valutabili = alunni.filter((a) => a.stato === 'Attivo');
  const regsDi = (a) => sos.map((so) => A.trovaRegistrazione(stato, a.id, g.id, so.codice));
  const fatti = valutabili.filter((a) => {
    const r = regsDi(a);
    return r.some((x) => x?.stato) || r.every((x) => votoRegistrazione(x) != null);
  }).length;
  const daRec = valutabili.filter((a) => regsDi(a).some(daRecuperare)).length;

  return h('div',
    testa([contatore(`${fatti}/${valutabili.length}`, 'registrati', 'acc'), contatore(daRec, 'da recuperare', daRec ? 'male' : '')]),
    h('div.riga-info',
      ctx.descrittoreRegistro
        ? h('p.descrittore', { role: 'status' }, h('span.etichetta-desc', 'Descrittore'), h('span', ctx.descrittoreRegistro))
        : h('p.descrittore', h('span.etichetta-desc', 'Descrittore'), h('span.tenue', 'Scegli un livello per leggerne il descrittore · tocca il nome di un indicatore per la rubrica completa.')),
      legendaLivelli()),
    alunni.length === 0 ? h('div.vuoto', 'Nessun alunno in questa classe: aggiungili da Classi e alunni.') :
      h('div.tabella-scorri', { 'data-scroll': 'registro' }, h('table.tab-registro',
        h('thead',
          h('tr', h('th.num', { rowspan: 2 }, 'N°'), h('th.nome', { rowspan: 2 }, 'Alunno'), h('th', { rowspan: 2 }, 'Stato'), h('th', { rowspan: 2 }, 'Recup.'),
            sos.map((so) => h(`th.fascia.${classeNucleo(so)}.fine-so`, { colspan: 6 },
              h('span.codice', so.codice), so.etichetta,
              h('small', `→ Ob. ${so.concorre[g.quadrimestre]} · peso ${pesoTesto(peso)}`)))),
          h('tr', sos.map((so) => [
            ...so.indicatori.map((ind, i) => h(`th.ind.sotto-fascia.${classeNucleo(so)}`, h('span.cliccabile', {
              role: 'button', tabindex: 0, title: `${ind.nome} — ${ind.cosaOsservo}`,
              onclick: () => apriRubrica(stato, cl.livello, so.codice, i),
              onkeydown: (e) => e.key === 'Enter' && apriRubrica(stato, cl.livello, so.codice, i)
            }, h('i', `I${i + 1}`), ind.nome))),
            h(`th.sotto-fascia.${classeNucleo(so)}`, 'Voto'), h(`th.sotto-fascia.fine-so.${classeNucleo(so)}`, 'Giudizio')]))),
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
    h('td.num', String(a.numero).padStart(2, '0')),
    h('td.nome', a.cognomeNome, a.op ? h('span.op', 'OP') : null, a.stato !== 'Attivo' ? h('span.op', a.stato) : null),
    h('td', select([['', '—'], ['AS', 'AS'], ['NV', 'NV'], ['ES', 'ES']], statoGiorno, {
      class: 'sel-stato', 'data-v': statoGiorno, 'aria-label': `Stato ${a.numero}`, 'data-focus': `st-${a.id}`, disabled: escluso,
      title: 'AS assente · NV non valutabile · ES esonerato',
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
          return h('td.lv', select([['', '·'], ...LIVELLI.map((l) => [l, l])], v, {
            class: 'sel-livello', 'data-l': v === '' ? null : v, disabled: escluso,
            'aria-label': `${a.numero} ${so.codice} I${i + 1}`, 'data-focus': `l-${a.id}-${so.codice}-${i}`,
            title: `${so.codice} I${i + 1} ${ind.nome}`,
            onchange: (e) => {
              const val = e.target.value === '' ? null : Number(e.target.value);
              const giud = val == null ? null : GIUDIZI[LIVELLI.indexOf(val)];
              ctx.descrittoreRegistro = val == null ? null : `${so.codice} · I${i + 1} ${ind.nome} · ${val} ${giud} — ${ind.descrittori[giud]}`;
              agg((s) => A.impostaLivello(s, { ...base, sottoObiettivo: so.codice, indice: i, valore: val }));
            }
          }));
        }),
        h('td.calc.voto', { 'data-l': voto ?? null }, voto == null ? '' : h('span.cliccabile', {
          role: 'button', tabindex: 0, title: 'Come è calcolato',
          onclick: () => modale(`Voto ${so.codice} · n. ${a.numero}`, h('p', spiegaVoto(r.livelli, stato.impostazioni.scala)))
        }, voto)),
        h('td.calc.giudizio.fine-so', giudizioDiVoto(stato, voto))
      ];
    }));
}

/** Griglia cartacea di riserva per la giornata (nomi visibili o solo numeri). */
function grigliaStampa(stato, cl, g, alunni, conNomi) {
  const sos = g.codici.map((c) => sottoObiettivo(stato, cl.livello, c)).filter(Boolean);
  return h('div',
    h('div.barra.no-stampa',
      h('label', h('input', { type: 'checkbox', checked: conNomi, onchange: (e) => conParametri({ nomi: e.target.checked ? '1' : '0' }) }), ' Mostra i nomi'),
      h('button.primario', { onclick: () => window.print() }, icona('stampa'), 'Stampa (A4 orizzontale)')),
    h('p.tenue', 'Livelli: 10 Ottimo · 9 Distinto · 8 Buono · 7 Discreto · 6 Sufficiente · 5 Non sufficiente · Stato: AS assente · NV non valutabile'),
    h('div.tabella-scorri', h('table',
      h('thead',
        h('tr', h('th', { rowspan: 2 }, 'N°'), conNomi ? h('th', { rowspan: 2 }, 'Alunno') : null, h('th', { rowspan: 2 }, 'Stato'),
          sos.map((so) => h(`th.fascia.${classeNucleo(so)}`, { colspan: 4 }, h('span.codice', so.codice), so.etichetta))),
        h('tr', sos.map((so) => so.indicatori.map((ind, i) => h('th', `I${i + 1} ${ind.nome}`))))),
      h('tbody', alunni.filter((a) => a.stato !== 'Ritirato').map((a) => h('tr',
        h('td.num', a.numero), conNomi ? h('td', a.cognomeNome) : null, h('td.cella-stampa', a.stato === 'ES' ? 'ES' : ''),
        sos.map(() => [0, 1, 2, 3].map(() => h('td.cella-stampa', '')))))))));
}
