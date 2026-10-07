// Riepilogo per classe e quadrimestre: medie, valore finale, giudizio da riportare (definitivo prevale), processo, avvisi.
import { h, select, modale, campo, prova, avviso } from '../dom.js';
import * as A from '../../dati/azioni.js';
import { riepilogoClasse, sottoObiettiviDi } from '../../dati/selettori.js';
import { MSG_POCHI, MSG_OP, MSG_ES } from '../../calcolo/riepilogo.js';
import {
  intestazione, selettoreClasse, selettoreQuadrimestre, classeScelta, classeNucleo, GIUDIZI, LIVELLI, contatore
} from './comuni.js';

const OB = [['A', 'Ob. A'], ['B', 'Ob. B'], ['TEC', 'Tecnologia'], ['CIV', 'Ed. civica']];
const fmt = (n) => (n == null ? '' : String(n).replace('.', ','));
const livelloDi = (giudizio) => {
  const i = GIUDIZI.indexOf(giudizio);
  return i < 0 ? null : LIVELLI[i];
};
const livelloValore = (v) => (v == null ? null : v >= 9.5 ? 10 : v >= 8.5 ? 9 : v >= 7.5 ? 8 : v >= 6.5 ? 7 : v >= 5.5 ? 6 : 5);

export function vistaRiepilogo(ctx, { params }) {
  const stato = ctx.store.get();
  const cl = classeScelta(stato, params);
  const q = params.q || 'Q1';
  const sos = sottoObiettiviDi(stato, cl.livello);
  const righe = riepilogoClasse(stato, cl.codice, q);
  const os = stato.didattica.obiettiviScheda[String(cl.livello)];
  const attivi = righe.filter(({ alunno }) => alunno.stato === 'Attivo');
  const conAvvisi = attivi.filter(({ r }) => r.avvisi.some((x) => x !== MSG_OP)).length;
  const senzaProcesso = attivi.filter(({ r }) => r.rubrica == null).length;

  return h('div',
    intestazione({
      titolo: 'Riepilogo e giudizi',
      occhiello: q === 'Q1' ? '1° quadrimestre' : '2° quadrimestre',
      briciole: ['Riepilogo', `${cl.codice} · ${cl.plesso}`],
      meta: [`${attivi.length} valutati su ${righe.length}`, `Metà Q: ${fmtData(stato.anno.quadrimestri.find((x) => x.id === q)?.meta)}`,
        `${Math.round(stato.impostazioni.parametri.quota_prove * 100)}% prove + ${Math.round(stato.impostazioni.parametri.quota_processo * 100)}% processo`]
    }, contatore(conAvvisi, 'avvisi', conAvvisi ? 'male' : ''), contatore(senzaProcesso, 'senza processo', 'acc'),
    selettoreClasse(stato, cl.codice), selettoreQuadrimestre(q)),
    h('div.riga-info',
      h('p.descrittore', h('span.etichetta-desc', 'Obiettivi'), h('span', h('b', 'A · '), os[`${q}A`], h('br'), h('b', 'B · '), os[`${q}B`])),
      h('div.legenda', h('span', h('span.icone-avvisi', h('span.av-pochi', '▲')), 'pochi voti'), h('span', h('span.icone-avvisi', h('span.av-rec', '⟲')), 'da recuperare'),
        h('span', h('span.icone-avvisi', h('span.av-op', 'OP')), 'ob. personalizzati'), h('span', h('span.pill.mio', { style: { minWidth: '0', padding: '2px 6px' } }, '✎'), 'giudizio tuo'))),
    righe.length === 0 ? h('div.vuoto', 'Nessun alunno in questa classe.') :
      h('div.tabella-scorri', { 'data-scroll': 'riepilogo' }, h('table.tab-riepilogo',
        h('thead',
          h('tr', h('th.num', { rowspan: 2 }, 'N°'), h('th.nome', { rowspan: 2 }, 'Alunno'),
            h('th.gruppo.g-medie.fine-gruppo', { colspan: sos.length }, 'Medie per sotto-obiettivo'),
            h('th.gruppo.fine-gruppo', { colspan: 3 }, 'Ob. A'), h('th.gruppo.fine-gruppo', { colspan: 3 }, 'Ob. B'),
            h('th.gruppo.g-tec.fine-gruppo', { colspan: 2 }, 'Tecnologia'), h('th.gruppo.g-tec.fine-gruppo', { colspan: 2 }, 'Ed. civica'),
            h('th', { rowspan: 2 }, 'Proc.'), h('th', { rowspan: 2 }, 'Avvisi')),
          h('tr', sos.map((s, i) => h(`th.mh.${classeNucleo(s)}${i === sos.length - 1 ? '.fine-gruppo' : ''}`, { title: `${s.codice} ${s.etichetta}` }, s.codice)),
            OB.map(([k]) => (k === 'A' || k === 'B'
              ? [h('th', 'n'), h('th', 'Valore'), h('th.fine-gruppo', 'Da riportare')]
              : [h('th', 'Valore'), h('th.fine-gruppo', 'Da riportare')])))),
        h('tbody', righe.map(({ alunno, r }) => riga(ctx, q, sos, alunno, r))))));
}

function fmtData(iso) {
  return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '—';
}

function riga(ctx, q, sos, a, r) {
  const classi = a.stato === 'Ritirato' ? '.ritirato' : a.stato === 'ES' ? '.es' : '';
  const testa = [
    h('td.num', String(a.numero).padStart(2, '0')),
    h('td.nome', a.cognomeNome, a.op ? h('span.op', 'OP') : null, a.stato !== 'Attivo' ? h('span.op', a.stato) : null),
    sos.map((s, i) => {
      const v = a.stato === 'Attivo' ? r.perSotto[s.codice] : null;
      return h(`td.media${i === sos.length - 1 ? '.fine-gruppo' : ''}`, { 'data-l': livelloValore(v) }, fmt(v));
    })
  ];
  if (a.stato !== 'Attivo') {
    const msg = a.stato === 'ES' ? `${MSG_ES} · da riportare: ES` : 'Ritirato · escluso dai calcoli';
    return h(`tr${classi}`, testa, h('td.msg-riga', { colspan: 12 }, msg));
  }
  return h('tr', testa,
    OB.map(([k]) => {
      const o = r.obiettivi[k];
      const conN = k === 'A' || k === 'B';
      return [
        conN ? h(`td.nvoti${o.n < ctx.store.get().impostazioni.parametri.min_voti_obiettivo ? '.pochi' : ''}`, o.n) : null,
        h('td.valore', { 'data-l': livelloValore(o.valore) }, o.valore == null ? h('b', '—') : h('span.cliccabile', {
          role: 'button', tabindex: 0, title: 'Come è calcolato', 'aria-label': `Calcolo ${k} alunno ${a.numero}`,
          onclick: () => modale(`${String(a.numero).padStart(2, '0')} · ${OB.find((x) => x[0] === k)[1]} · ${q}`, h('p', o.spiegazione))
        }, h('b', fmt(o.valore)), conN && o.valore !== o.media ? h('small', fmt(o.media)) : null)),
        cellaFinale(ctx, q, a, k, o)
      ];
    }),
    h('td', select([['', '—'], ...LIVELLI.map((l) => [l, l])], r.rubrica ?? '', {
      class: 'sel-processo', 'data-v': r.rubrica ?? '', 'aria-label': `Rubrica di processo alunno ${a.numero}`, 'data-focus': `rub-${a.id}`,
      title: `Rubrica di processo: ${ctx.store.get().didattica.rubricaProcessoDimensioni.join(' · ')}`,
      onchange: (e) => prova(() => ctx.store.aggiorna((s) => A.impostaRubrica(s, a.id, q, e.target.value === '' ? null : Number(e.target.value))))
    })),
    cellaAvvisi(r));
}

function cellaFinale(ctx, q, a, k, o) {
  const finale = o.definitivo || o.calcolato;
  const mio = Boolean(o.definitivo);
  const etichetta = `Giudizio ${k} alunno ${a.numero}`;
  return h('td.finale.fine-gruppo',
    h(`button.pill${mio ? '.mio' : ''}${finale ? '' : '.vuota'}`, {
      'data-l': livelloDi(finale), 'aria-label': etichetta, title: mio ? `Definitivo (tuo). Calcolato: ${o.calcolato || '—'}` : 'Calcolato · clicca per inserire il definitivo',
      onclick: () => editorGiudizio(ctx, q, a, k, o)
    }, finale || '—', mio ? h('i', '✎') : null),
    mio && o.calcolato !== o.definitivo ? h('small', `calc. ${o.calcolato || '—'}`) : null);
}

function cellaAvvisi(r) {
  const icone = [];
  if (r.avvisi.includes(MSG_POCHI)) icone.push(h('span.av-pochi', '▲'));
  if (r.daRecuperare) icone.push(h('span.av-rec', '⟲'));
  if (r.avvisi.includes(MSG_OP)) icone.push(h('span.av-op', 'OP'));
  const testo = r.avvisi.join(' ');
  return h('td.avvisi', { title: testo, 'aria-label': testo || 'Nessun avviso' }, h('span.icone-avvisi', icone));
}

function editorGiudizio(ctx, q, a, k, o) {
  const giudizi = ctx.store.get().giudiziDefinitivi;
  const esistente = giudizi.find((g) => g.alunnoId === a.id && g.quadrimestre === q && g.obiettivo === k);
  const sel = select([['', `— usa il calcolato (${o.calcolato || 'nessuno'})`], ...GIUDIZI.map((g) => [g, g])], o.definitivo, { 'aria-label': 'Giudizio definitivo' });
  const commento = h('textarea', { rows: 3, value: esistente?.commento ?? '', 'aria-label': 'Commento' });
  modale(`${String(a.numero).padStart(2, '0')} · ${a.cognomeNome} · ${OB.find((x) => x[0] === k)[1]} · ${q}`, h('div',
    h('p.descrittore', h('span.etichetta-desc', 'Calcolo'), h('span', o.spiegazione)),
    campo('Giudizio definitivo (prevale sul calcolato)', sel),
    campo('Commento del docente', commento)), {
    azioni: [{
      testo: 'Salva', primario: true,
      azione: () => {
        const ok = prova(() => ctx.store.aggiorna((s) => A.impostaGiudizioDefinitivo(s, {
          alunnoId: a.id, quadrimestre: q, obiettivo: k, giudizio: sel.value, commento: commento.value
        })));
        if (ok) avviso(sel.value ? `Giudizio definitivo: ${sel.value}` : 'Si usa il giudizio calcolato');
        return Boolean(ok);
      }
    }]
  });
}
