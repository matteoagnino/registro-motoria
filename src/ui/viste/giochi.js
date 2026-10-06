// Giochi della Gioventù: inserimento risultati, statistiche, classifiche, storico pluriennale.
import { h, select, modale, prova, avviso } from '../dom.js';
import { conParametri } from '../app.js';
import { alunniDi } from '../../dati/azioni.js';
import * as G from '../../giochi/giochi.js';
import { intestazione, selettoreClasse, classeScelta } from './comuni.js';

const NUM = (v) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')));
const fmt = (n) => (n == null ? '—' : String(n).replace('.', ','));

export function vistaGiochi(ctx, { params }) {
  const stato = ctx.store.get();
  const anno = params.anno || stato.anno.id;
  const ril = Number(params.ril || 1);
  const tab = params.tab || 'inserimento';
  const cl = classeScelta(stato, params);
  return h('div',
    intestazione('Giochi della Gioventù',
      h('input', { value: anno, size: 8, 'aria-label': 'Anno scolastico', onchange: (e) => conParametri({ anno: e.target.value }) }),
      select([['1', '1ª rilevazione'], ['2', '2ª rilevazione']], ril, { 'aria-label': 'Rilevazione', onchange: (e) => conParametri({ ril: e.target.value }) })),
    h('div.barra', [['inserimento', 'Inserimento per classe'], ['classifiche', 'Classifiche e proposta'], ['storico', 'Storico pluriennale']].map(([id, n]) =>
      h(`button${tab === id ? '.primario' : ''}`, { onclick: () => conParametri({ tab: id }) }, n))),
    tab === 'inserimento' ? inserimento(ctx, cl, anno, ril) : tab === 'classifiche' ? classifiche(ctx, anno, ril) : storico(ctx),
    h('p.tenue', 'Il tempo non è un voto. Correttivo % solo per alunni con disabilità, secondo la scheda tecnica (riduce il tempo registrato).'));
}

function inserimento(ctx, cl, anno, ril) {
  const stato = ctx.store.get();
  const chiave = { anno, classe: cl.codice, rilevazione: ril };
  const ris = G.trovaRisultato(stato, anno, cl.codice, ril) ?? G.risultatoVuoto(anno, cl.codice, ril);
  const agg = (fn) => prova(() => ctx.store.aggiorna((s) => G.aggiornaRisultato(s, chiave, fn)));
  const stat = G.statisticheClasse(ris);
  const alunni = alunniDi(stato, cl.codice).filter((a) => a.stato !== 'Ritirato');
  const inp = (valore, onchange, label, step = '0.01') => h('input', { type: 'number', step, min: 0, value: valore ?? '', style: { width: '6rem' }, 'aria-label': label, onchange });
  return h('div',
    h('div.barra', selettoreClasse(stato, cl.codice)),
    alunni.length === 0 ? h('div.vuoto', 'Nessun alunno in questa classe.') : h('div.tabella-scorri', h('table',
      h('thead', h('tr', ['N°', 'Alunno', 'Correttivo %', 'Super Gym tempo (s)', 'Penalità (s)', 'Tempo gara', 'Ostacoli tempo (s)', 'Tempo gara'].map((t) => h('th', t)))),
      h('tbody', alunni.map((a) => {
        const i = ris.individuali.find((x) => x.alunnoId === a.id) ?? { correttivo: 0, supergym: {}, ostacoli: {} };
        return h('tr',
          h('td.num', a.numero), h('td', a.cognomeNome),
          h('td', inp(i.correttivo ? Math.round(i.correttivo * 100) : '', (e) => agg((r) => G.impostaIndividuale(r, a.id, { correttivo: (NUM(e.target.value) ?? 0) / 100 })), `Correttivo ${a.numero}`, '5')),
          h('td', inp(i.supergym?.tempo, (e) => agg((r) => G.impostaIndividuale(r, a.id, { supergym: { tempo: NUM(e.target.value) } })), `Super Gym ${a.numero}`)),
          h('td', inp(i.supergym?.penalita, (e) => agg((r) => G.impostaIndividuale(r, a.id, { supergym: { penalita: NUM(e.target.value) } })), `Penalità ${a.numero}`, '1'),
            h('button', { title: 'Calcola dalle penalità', onclick: () => calcolatorePenalita(ctx, (sec) => agg((r) => G.impostaIndividuale(r, a.id, { supergym: { penalita: sec } }))) }, '+')),
          h('td.calc', fmt(G.tempoGara(i.supergym?.tempo, i.supergym?.penalita, i.correttivo))),
          h('td', inp(i.ostacoli?.tempo, (e) => agg((r) => G.impostaIndividuale(r, a.id, { ostacoli: { tempo: NUM(e.target.value) } })), `Ostacoli ${a.numero}`)),
          h('td.calc', fmt(G.tempoGara(i.ostacoli?.tempo, 0, i.correttivo))));
      })))),
    h('div.griglia-2',
      h('div.scheda', h('h2', 'Statistiche di classe'),
        h('table', h('thead', h('tr', h('th', ''), h('th', 'Super Gym'), h('th', 'Ostacoli'))),
          h('tbody', [['n', 'Alunni con tempo'], ['media', 'Media di classe (ufficiale)'], ['troncata', 'Media troncata (senza migliore e peggiore)'],
            ['mediana', 'Mediana'], ['devStd', 'Deviazione standard'], ['migliore', 'Migliore'], ['peggiore', 'Peggiore']].map(([k, n]) =>
            h('tr', h('th', n), h('td.num', fmt(stat.supergym[k])), h('td.num', fmt(stat.ostacoli[k])))))),
        confronto(stato, anno, cl.codice, ril)),
      h('div.scheda', h('h2', 'Prove di squadra (totale classe = somma dei gruppi)'),
        h('table', h('thead', h('tr', h('th', 'Prova'), [1, 2, 3, 4, 5].map((n) => h('th', `Gr. ${n}`)), h('th', 'Totale'))),
          h('tbody', stato.giochi.prove.filter((p) => p.tipo === 'squadra_punti').map((p) => h('tr',
            h('th', p.nome),
            [0, 1, 2, 3, 4].map((k) => h('td', inp(ris.squadra[p.id]?.[k], (e) => agg((r) => G.impostaGruppo(r, p.id, k, NUM(e.target.value))), `${p.nome} gruppo ${k + 1}`, '0.25'))),
            h('td.calc', fmt(stat[p.id])))))),
        h('label.campo', h('span.etichetta', 'Fair play e partecipazione della classe (per lo spareggio, 1–10)'),
          inp(ris.fairPlay, (e) => agg((r) => ({ ...r, fairPlay: NUM(e.target.value) })), 'Fair play', '0.5')))));
}

function confronto(stato, anno, classe, ril) {
  const altra = G.trovaRisultato(stato, anno, classe, ril === 1 ? 2 : 1);
  const questa = G.trovaRisultato(stato, anno, classe, ril);
  if (!altra || !questa) return h('p.tenue', 'Confronto 1ª/2ª rilevazione: disponibile quando ci sono entrambe.');
  const [s1, s2] = ril === 1 ? [G.statisticheClasse(questa), G.statisticheClasse(altra)] : [G.statisticheClasse(altra), G.statisticheClasse(questa)];
  const diff = (a, b) => (a == null || b == null ? '—' : fmt(Math.round((a - b) * 100) / 100));
  return h('p', `Miglioramento medio (1ª − 2ª): Super Gym ${diff(s1.supergym.media, s2.supergym.media)} s · Ostacoli ${diff(s1.ostacoli.media, s2.ostacoli.media)} s`);
}

function calcolatorePenalita(ctx, applica) {
  const pen = ctx.store.get().giochi.penalitaSupergym;
  const conteggi = pen.map(() => 0);
  const totale = h('strong', '0 s');
  const aggiorna = () => { totale.textContent = `${pen.reduce((a, p, i) => a + p.secondi * conteggi[i], 0)} s`; };
  modale('Penalità Super Gym', h('div',
    h('table', h('tbody', pen.map((p, i) => h('tr', h('td', p.stazione), h('td', p.errore), h('td', `+${p.secondi}`),
      h('td', h('input', { type: 'number', min: 0, value: 0, style: { width: '4rem' }, 'aria-label': `${p.stazione} ${p.errore}`, oninput: (e) => { conteggi[i] = Number(e.target.value) || 0; aggiorna(); } })))))),
    h('p', 'Totale: ', totale)), {
    largo: true,
    azioni: [{ testo: 'Usa questo totale', primario: true, azione: () => applica(pen.reduce((a, p, i) => a + p.secondi * conteggi[i], 0)) }]
  });
}

function classifiche(ctx, anno, ril) {
  const stato = ctx.store.get();
  const cl = G.classificheAnno(stato, anno, ril);
  const prove = stato.giochi.prove;
  return h('div',
    h('div.barra', h('button', {
      onclick: () => {
        ctx.store.aggiorna((s) => G.archiviaStorico(s, anno, ril));
        avviso('Statistiche archiviate nello storico pluriennale');
      }
    }, `Archivia ${anno} · ${ril}ª rilevazione nello storico`)),
    [4, 5].map((liv) => h('div.scheda',
      h('h2', `Classi ${liv}ª`, cl[liv].proposta ? h('span.chip.n-1', { style: { marginLeft: '.6rem' } }, `Proposta da iscrivere: ${cl[liv].proposta}`) : null),
      cl[liv].generale.length === 0 ? h('p.tenue', 'Nessun risultato inserito.') : h('div.griglia-2',
        h('div', h('h3', 'Classifica generale'), h('table',
          h('thead', h('tr', ['Pos.', 'Classe', 'Punti', 'Fair play'].map((t) => h('th', t)))),
          h('tbody', cl[liv].generale.map((g) => h('tr', h('td.num', g.posizione), h('td', g.classe), h('td.num', g.punti),
            h('td.num', fmt(g.fairPlay), g.spareggioFairPlay ? h('small', ' (spareggio)') : null)))))),
        h('div', h('h3', 'Per prova (punti 8…1)'), prove.map((p) => h('div',
          h('strong', p.nome),
          h('table', h('tbody', (cl[liv].perProva[p.id] || []).map((r) => h('tr',
            h('td.num', r.posizione), h('td', r.classe), h('td.num', fmt(r.valore)), h('td.num', `${r.punti} pt`))))))))))));
}

function storico(ctx) {
  const righe = [...ctx.store.get().giochi.storico].sort((a, b) => b.anno.localeCompare(a.anno) || a.livello - b.livello || a.classe.localeCompare(b.classe));
  if (!righe.length) return h('div.vuoto', 'Lo storico si riempie con «Archivia nello storico» dalle classifiche.');
  return h('div.tabella-scorri', h('table',
    h('thead', h('tr', ['Anno', 'Ril.', 'Classe', 'Plesso', 'n', 'Super Gym media', 'troncata', 'Ostacoli media', 'troncata', 'Lancia', 'Staffetta', 'Spikeball'].map((t) => h('th', t)))),
    h('tbody', righe.map((r) => h('tr', h('td', r.anno), h('td.num', r.rilevazione), h('td', r.classe), h('td', r.plesso), h('td.num', r.n),
      h('td.num', fmt(r.supergymMedia)), h('td.num', fmt(r.supergymTroncata)), h('td.num', fmt(r.ostacoliMedia)), h('td.num', fmt(r.ostacoliTroncata)),
      h('td.num', fmt(r.lancia)), h('td.num', fmt(r.staffetta)), h('td.num', fmt(r.spikeball)))))));
}
