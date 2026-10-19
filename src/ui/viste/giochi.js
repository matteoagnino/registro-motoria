// Giochi della Gioventù: inserimento risultati, statistiche, classifiche, storico pluriennale.
import { h, select, modale, prova, avviso, campo as campoForm } from '../dom.js';
import { conParametri } from '../app.js';
import { alunniDi } from '../../dati/azioni.js';
import * as G from '../../giochi/giochi.js';
import { excelIscrizioneGiochi } from '../../export/excel.js';
import { scaricaBlob, marcaTemporale } from '../../dati/archivio.js';
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
    h('p.tenue', 'Il tempo non è un voto. Adattamenti e correttivi solo per alunni con disabilità, come nelle schede tecniche 2025/26: riduzione del tempo (FIDAL), esclusione del risultato dalla media nei casi più complessi, circuito adattato (FGI). Non scrivere diagnosi.'));
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
      h('thead', h('tr', ['N°', 'Alunno', 'Super Gym tempo (s)', 'Penalità (s)', 'Tempo gara', 'Ostacoli tempo (s)', 'Tempo gara', 'Adattamenti'].map((t) => h('th', t)))),
      h('tbody', alunni.map((a) => {
        const i = ris.individuali.find((x) => x.alunnoId === a.id) ?? { supergym: {}, ostacoli: {} };
        const set = (prova, campo) => (e) => agg((r) => G.impostaIndividuale(r, a.id, { [prova]: { [campo]: NUM(e.target.value) } }));
        return h('tr',
          h('td.num', a.numero), h('td', a.cognomeNome),
          h('td', inp(i.supergym?.tempo, set('supergym', 'tempo'), `Super Gym ${a.numero}`)),
          h('td', inp(i.supergym?.penalita, set('supergym', 'penalita'), `Penalità ${a.numero}`, '1'),
            h('button', { title: 'Calcola dalle penalità', onclick: () => calcolatorePenalita(ctx, (sec) => agg((r) => G.impostaIndividuale(r, a.id, { supergym: { penalita: sec } }))) }, '+')),
          h('td.calc', tempoMostrato(i, 'supergym')),
          h('td', inp(i.ostacoli?.tempo, set('ostacoli', 'tempo'), `Ostacoli ${a.numero}`)),
          h('td.calc', tempoMostrato(i, 'ostacoli')),
          h('td', h('button', { onclick: () => editorAdattamenti(ctx, chiave, a, i), 'aria-label': `Adattamenti ${a.numero}` }, riassuntoAdattamenti(i) || 'Nessuno')));
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
        h('h3', 'Correttivo di classifica (alunni con disabilità)'),
        h('p.tenue', 'Punti aggiunti alla classe nella classifica della singola prova (schede FIDAL: es. +0,5 o +1).'),
        h('div.riga', stato.giochi.prove.map((p) => h('label.campo', h('span.etichetta', p.nome),
          inp(ris.bonus?.[p.id], (e) => agg((r) => G.impostaBonus(r, p.id, NUM(e.target.value))), `Correttivo classifica ${p.nome}`, '0.5')))),
        h('label.campo', h('span.etichetta', 'Spareggio: rispetto delle regole, comportamento e fair play della classe (1–10)'),
          inp(ris.fairPlay, (e) => agg((r) => ({ ...r, fairPlay: NUM(e.target.value) })), 'Regole, comportamento e fair play', '0.5')))));
}

function tempoMostrato(i, prova) {
  if (i[prova]?.escluso) return h('span.tenue', 'escluso');
  return fmt(G.tempoAlunno(i, prova));
}

function riassuntoAdattamenti(i) {
  const parti = [];
  for (const [p, n] of [['supergym', 'SG'], ['ostacoli', 'Ost.']]) {
    const r = i[p] ?? {};
    if (r.escluso) parti.push(`${n} escluso`);
    else if (r.riduzione) parti.push(`${n} −${Math.round(r.riduzione * 100)}%`);
    if (p === 'supergym' && r.adattato) parti.push('circuito adattato');
  }
  return parti.join(' · ');
}

function editorAdattamenti(ctx, chiave, alunno, i) {
  const form = h('form',
    [['supergym', 'Super Gym School (FGI)'], ['ostacoli', 'Superiamo gli ostacoli (FIDAL)']].map(([p, nome]) => h('fieldset',
      h('legend', nome),
      h('div.riga',
        campoForm('Riduzione del tempo %', h('input', { type: 'number', name: `${p}_rid`, min: 0, max: 90, step: 5, value: i[p]?.riduzione ? Math.round(i[p].riduzione * 100) : '' })),
        h('label', h('input', { type: 'checkbox', name: `${p}_escl`, checked: Boolean(i[p]?.escluso) }), ' Escludi il risultato dalla media'),
        p === 'supergym' ? h('label', h('input', { type: 'checkbox', name: 'supergym_adatt', checked: Boolean(i.supergym?.adattato) }), ' Circuito adattato') : null))),
    campoForm('Nota (motivo del correttivo, senza diagnosi)', h('input', { name: 'nota', value: i.nota || '', size: 50 })));
  modale(`Adattamenti · n. ${alunno.numero}`, form, {
    azioni: [{
      testo: 'Salva', primario: true,
      azione: () => {
        const f = form.elements;
        const rid = (p) => (NUM(f[`${p}_rid`].value) ?? 0) / 100;
        if ([rid('supergym'), rid('ostacoli')].some((x) => x < 0 || x > 0.9)) { avviso('Riduzione tra 0 e 90%', 'errore'); return false; }
        return Boolean(prova(() => ctx.store.aggiorna((s) => G.aggiornaRisultato(s, chiave, (r) => G.impostaIndividuale(r, alunno.id, {
          supergym: { riduzione: rid('supergym'), escluso: f.supergym_escl.checked, adattato: f.supergym_adatt.checked },
          ostacoli: { riduzione: rid('ostacoli'), escluso: f.ostacoli_escl.checked },
          nota: f.nota.value.trim()
        }))), 'Adattamenti salvati'));
      }
    }]
  });
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
    h('div.barra',
      h('button', {
      onclick: () => {
        ctx.store.aggiorna((s) => G.archiviaStorico(s, anno, ril));
        avviso('Statistiche archiviate nello storico pluriennale');
      }
    }, `Archivia ${anno} · ${ril}ª rilevazione nello storico`)),
    [4, 5].map((liv) => h('div.scheda',
      h('h2', `Classi ${liv}ª`, cl[liv].proposta ? h('span.chip.n-1', { style: { marginLeft: '.6rem' } }, `Proposta da iscrivere: ${cl[liv].proposta}`) : null),
      cl[liv].proposta ? h('button', { onclick: () => scaricaIscrizione(stato, cl[liv].proposta) }, `Elenco per l'iscrizione della ${cl[liv].proposta} (Excel)`) : null,
      cl[liv].generale.length === 0 ? h('p.tenue', 'Nessun risultato inserito.') : h('div.griglia-2',
        h('div', h('h3', 'Classifica generale'), h('table',
          h('thead', h('tr', ['Pos.', 'Classe', 'Punti', 'Regole e fair play'].map((t) => h('th', t)))),
          h('tbody', cl[liv].generale.map((g) => h('tr', h('td.num', g.posizione), h('td', g.classe), h('td.num', fmt(g.punti)),
            h('td.num', fmt(g.fairPlay), g.spareggioFairPlay ? h('small', ' (spareggio)') : null)))))),
        h('div', h('h3', 'Per prova (punti 8…1, scheda FIDAL)'), prove.map((p) => h('div',
          h('strong', p.nome),
          h('table', h('tbody', (cl[liv].perProva[p.id] || []).map((r) => h('tr',
            h('td.num', r.posizione), h('td', r.classe), h('td.num', fmt(r.valore)), h('td.num', `${fmt(r.punti)} pt`, r.bonus ? h('small', ` (+${fmt(r.bonus)})`) : null))))))))))));
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

async function scaricaIscrizione(stato, classe) {
  try {
    const buf = await excelIscrizioneGiochi(stato, classe);
    scaricaBlob(`iscrizione-giochi_${classe}_${marcaTemporale()}.xlsx`, new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  } catch (e) {
    avviso(`Export non riuscito: ${e.message}`, 'errore');
  }
}
