// Riepilogo per classe e quadrimestre: medie, giudizi calcolati/definitivi, processo, avvisi, da riportare.
import { h, select, modale, prova } from '../dom.js';
import * as A from '../../dati/azioni.js';
import { riepilogoClasse, sottoObiettiviDi } from '../../dati/selettori.js';
import { intestazione, selettoreClasse, selettoreQuadrimestre, classeScelta, classeNucleo, GIUDIZI, LIVELLI } from './comuni.js';

const OB = [['A', 'Ob. A'], ['B', 'Ob. B'], ['TEC', 'Tecnologia'], ['CIV', 'Ed. civica']];
const fmt = (n) => (n == null ? '' : String(n).replace('.', ','));

export function vistaRiepilogo(ctx, { params }) {
  const stato = ctx.store.get();
  const cl = classeScelta(stato, params);
  const q = params.q || 'Q1';
  const sos = sottoObiettiviDi(stato, cl.livello);
  const righe = riepilogoClasse(stato, cl.codice, q);
  const os = stato.didattica.obiettiviScheda[String(cl.livello)];
  const agg = (fn) => prova(() => ctx.store.aggiorna(fn));

  return h('div',
    intestazione('Riepilogo e giudizi', selettoreClasse(stato, cl.codice), selettoreQuadrimestre(q)),
    h('div.scheda',
      h('p', h('strong', 'Ob. A · '), os[`${q}A`]),
      h('p', h('strong', 'Ob. B · '), os[`${q}B`]),
      h('p.tenue', 'Tocca un valore per vedere come è calcolato. Il giudizio definitivo (tuo) prevale sul calcolato. Le colonne verdi vanno nel documento di valutazione.')),
    righe.length === 0 ? h('div.vuoto', 'Nessun alunno in questa classe.') :
      h('div.tabella-scorri', { 'data-scroll': 'riepilogo' }, h('table',
        h('thead',
          h('tr', h('th.nome', { rowspan: 2 }, 'N° · Alunno'), h('th', { colspan: sos.length }, 'Medie per sotto-obiettivo'),
            OB.map(([k, n]) => h('th', { colspan: k === 'A' || k === 'B' ? 5 : 3 }, n)),
            h('th', { rowspan: 2 }, 'Rubrica di processo'), h('th', { rowspan: 2 }, 'Avvisi'),
            h('th', { colspan: 4 }, 'Da riportare')),
          h('tr', sos.map((s) => h(`th.${classeNucleo(s)}`, { title: s.etichetta }, s.codice)),
            OB.map(([k]) => (k === 'A' || k === 'B'
              ? ['n.', 'Media', 'Valore', 'Calcolato', 'Definitivo']
              : ['Media', 'Calcolato', 'Definitivo']).map((t) => h('th', t))),
            OB.map(([, n]) => h('th', n)))),
        h('tbody', righe.map(({ alunno: a, r }) => h(`tr${a.stato === 'Ritirato' ? '.ritirato' : a.stato === 'ES' ? '.es' : ''}`,
          h('td.nome', `${a.numero} · ${a.cognomeNome}`, a.op ? h('small', ' OP') : null),
          sos.map((s) => h('td.num', fmt(r.perSotto[s.codice]))),
          OB.map(([k]) => {
            const o = r.obiettivi[k];
            const spiega = () => modale(`${a.numero} · Ob. ${k} · ${q}`, h('p', o.spiegazione));
            const valoreCella = h('td.calc', o.valore == null ? '' : h('span.cliccabile', { role: 'button', tabindex: 0, onclick: spiega }, fmt(o.valore)));
            const definitivo = h('td', select([['', '—'], ...GIUDIZI.map((g) => [g, g])], o.definitivo, {
              'aria-label': `Giudizio definitivo ${k} alunno ${a.numero}`, class: 'input-giallo', 'data-focus': `def-${a.id}-${k}`,
              disabled: a.stato !== 'Attivo',
              onchange: (e) => agg((s) => A.impostaGiudizioDefinitivo(s, { alunnoId: a.id, quadrimestre: q, obiettivo: k, giudizio: e.target.value }))
            }));
            return k === 'A' || k === 'B'
              ? [h('td.num', o.n), h('td.num', fmt(o.media)), valoreCella, h('td.calc', o.calcolato), definitivo]
              : [valoreCella, h('td.calc', o.calcolato), definitivo];
          }),
          h('td', select([['', '—'], ...LIVELLI.map((l) => [l, l])], r.rubrica ?? '', {
            'aria-label': `Rubrica di processo alunno ${a.numero}`, class: 'input-giallo', 'data-focus': `rub-${a.id}`,
            disabled: a.stato !== 'Attivo',
            onchange: (e) => agg((s) => A.impostaRubrica(s, a.id, q, e.target.value === '' ? null : Number(e.target.value)))
          })),
          h('td.avviso-cella', r.avvisi.join(' ')),
          OB.map(([k]) => h('td.riporta', r.riporta[k] ?? ''))))))),
    h('p.tenue', `Rubrica di processo (dimensioni): ${stato.didattica.rubricaProcessoDimensioni.join(' · ')}.`));
}
