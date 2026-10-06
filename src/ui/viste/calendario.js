// Calendario: sequenza condivisa delle giornate, lezioni reali per classe, slittamenti, progetti.
import { h, select, campo, modale, prova, conferma, avviso } from '../dom.js';
import * as A from '../../dati/azioni.js';
import { piano, giornateClasse, violazioniClasse, sottoObiettiviDi } from '../../dati/selettori.js';
import { descriviViolazione } from '../../calcolo/regole.js';
import { formatta } from '../../pianificazione/date.js';
import { intestazione, selettoreClasse, classeScelta, etichettaTipo, chipSotto } from './comuni.js';

export function vistaCalendario(ctx, { params }) {
  const stato = ctx.store.get();
  const cl = classeScelta(stato, params);
  return h('div',
    intestazione('Calendario', selettoreClasse(stato, cl.codice)),
    sequenza(ctx, cl),
    progetti(ctx),
    lezioniClasse(ctx, cl));
}

function sequenza(ctx, cl) {
  const stato = ctx.store.get();
  const viol = violazioniClasse(stato, cl.codice);
  const gc = giornateClasse(stato, cl.codice);
  return h('div.scheda',
    h('div.intestazione', h('h2', 'Sequenza delle giornate di prova (uguale per i due plessi)'),
      h('div.barra',
        h('button.primario', { onclick: () => editorGiornata(ctx, { id: A.prossimoIdGiornata(stato, 'Q1'), sottoObiettivi: { 4: [], 5: [] }, ancora: {} }, true) }, '+ Giornata 1°Q'),
        h('button.primario', { onclick: () => editorGiornata(ctx, { id: A.prossimoIdGiornata(stato, 'Q2'), sottoObiettivi: { 4: [], 5: [] }, ancora: {} }, true) }, '+ Giornata 2°Q'))),
    h('div.tabella-scorri', h('table',
      h('thead', h('tr', ['Giornata', 'Descrizione', 'Sotto-ob. 4ª', 'Sotto-ob. 5ª', 'Settimana Manzoni', 'Settimana Boncompagni', `Data ${cl.codice}`, 'Controllo', ''].map((t) => h('th', t)))),
      h('tbody', gc.map((g) => {
        const v = viol.filter((x) => x.giornataId === g.id);
        return h('tr',
          h('td', h('strong', g.id), g.progetto ? h('div.tenue', `progetto ${g.progetto}`) : null),
          h('td', g.descrizione),
          h('td', (g.sottoObiettivi['4'] || []).map((c) => chipSotto(stato, 4, c))),
          h('td', (g.sottoObiettivi['5'] || []).map((c) => chipSotto(stato, 5, c))),
          h('td', g.ancora?.Manzoni ? formatta(g.ancora.Manzoni) : '—'),
          h('td', g.ancora?.Boncompagni ? formatta(g.ancora.Boncompagni) : '—'),
          h('td', g.data ? formatta(g.data, true) : h('span.avviso-cella', g.statoPiano), g.statoPiano === 'slittata' ? h('div.avviso-cella', 'slittata') : null),
          h('td', v.length ? v.map((x) => h('div.violazione', descriviViolazione(x))) : h('span.ok-testo', 'OK')),
          h('td', h('button', { onclick: () => editorGiornata(ctx, g, false) }, 'Modifica')));
      })))),
    h('p.tenue', 'La settimana indica il lunedì da cui la giornata può essere svolta: la data della classe si calcola dal giorno di lezione. La lezione successiva a ogni prova è di recupero.'));
}

function sceltaSotto(stato, livello, valori, nome) {
  const opz = [['', '—'], ...sottoObiettiviDi(stato, livello).map((s) => [s.codice, `${s.codice} ${s.etichetta}`])];
  return h('div.riga', [0, 1, 2, 3].map((i) => select(opz, valori[i] ?? '', { name: `${nome}${i}`, 'aria-label': `Sotto-obiettivo ${i + 1} classe ${livello}ª` })));
}

function editorGiornata(ctx, g, nuova) {
  const stato = ctx.store.get();
  const form = h('form',
    campo('Codice', h('input', { name: 'id', value: g.id, readOnly: !nuova })),
    campo('Descrizione della prova', h('input', { name: 'descrizione', value: g.descrizione || '', size: 50 })),
    campo('Sotto-obiettivi classi 4ª (max 4)', sceltaSotto(stato, 4, g.sottoObiettivi['4'] || [], 's4_')),
    campo('Sotto-obiettivi classi 5ª (max 4)', sceltaSotto(stato, 5, g.sottoObiettivi['5'] || [], 's5_')),
    h('div.riga',
      campo('Settimana Manzoni (lunedì)', h('input', { type: 'date', name: 'aM', value: g.ancora?.Manzoni || '' })),
      campo('Settimana Boncompagni (lunedì)', h('input', { type: 'date', name: 'aB', value: g.ancora?.Boncompagni || '' }))),
    campo('Collegata a un progetto', select([['', 'No'], ...[...new Set(stato.progetti.map((p) => p.codice))].map((c) => [c, c])], g.progetto || '', { name: 'progetto' }),
      'Le giornate di progetto cadono nell\'ultima lezione del progetto e non richiedono una lezione di recupero.'));
  const leggi = () => {
    const f = form.elements;
    const lista = (p) => [0, 1, 2, 3].map((i) => f[`${p}${i}`].value).filter(Boolean);
    return {
      ...g, id: f.id.value.trim(), descrizione: f.descrizione.value.trim(),
      sottoObiettivi: { 4: lista('s4_'), 5: lista('s5_') },
      ancora: { Manzoni: f.aM.value || null, Boncompagni: f.aB.value || null },
      progetto: f.progetto.value || null
    };
  };
  const azioni = [{ testo: 'Salva giornata', primario: true, azione: () => Boolean(prova(() => ctx.store.aggiorna((s) => A.salvaGiornata(s, leggi())), 'Giornata salvata')) }];
  if (!nuova) {
    azioni.push({
      testo: 'Elimina', pericolo: true,
      azione: async () => {
        if (!(await conferma('Eliminare la giornata?', `La giornata ${g.id} verrà tolta dalla sequenza.`, 'Elimina'))) return false;
        return Boolean(prova(() => ctx.store.aggiorna((s) => A.eliminaGiornata(s, g.id)), 'Giornata eliminata'));
      }
    });
  }
  modale(nuova ? 'Nuova giornata di prova' : `Giornata ${g.id}`, form, { azioni, largo: true });
}

function progetti(ctx) {
  const stato = ctx.store.get();
  const agg = (p, patch) => prova(() => ctx.store.aggiorna((s) => A.salvaProgetto(s, { ...p, ...patch })), 'Progetto aggiornato');
  return h('details.scheda',
    h('summary', h('strong', 'Progetti (sospendono la sequenza)')),
    h('table', h('thead', h('tr', ['Progetto', 'Plesso', 'Dal', 'Al', 'N. lezioni', 'Note'].map((t) => h('th', t)))),
      h('tbody', stato.progetti.map((p) => h('tr',
        h('td', p.nome), h('td', p.plesso),
        h('td', h('input', { type: 'date', value: p.dal || '', onchange: (e) => agg(p, { dal: e.target.value || null }) })),
        h('td', h('input', { type: 'date', value: p.al || '', onchange: (e) => agg(p, { al: e.target.value || null }) })),
        h('td', h('input', { type: 'number', min: 1, max: 10, value: p.nLezioni, style: { width: '4rem' }, onchange: (e) => agg(p, { nLezioni: Number(e.target.value) }) })),
        h('td.tenue', p.nota || ''))))));
}

function lezioniClasse(ctx, cl) {
  const stato = ctx.store.get();
  const p = piano(stato)[cl.codice];
  return h('div.scheda',
    h('h2', `Lezioni di ${cl.codice}`),
    p.avvisi.length ? h('ul', p.avvisi.map((a) => h('li.avviso-cella', a))) : null,
    h('div.tabella-scorri', { 'data-scroll': 'lezioni' }, h('table',
      h('thead', h('tr', ['Data', 'Orario', 'Tipo', 'Giornata / note', 'Sotto-obiettivi', ''].map((t) => h('th', t)))),
      h('tbody', p.lezioni.map((l) => h(`tr.t-${l.tipo}`,
        h('td', formatta(l.data, true)),
        h('td', `${l.inizio}–${l.fine}${l.scenario !== 'tutte' ? ` · ${l.scenario}` : ''}`),
        h('td', etichettaTipo(l.tipo)),
        h('td', l.giornataId ? h('strong', l.giornataId) : null, l.recuperoDi ? ` recupero di ${l.recuperoDi}` : '',
          l.motivo ? h('div.tenue', l.motivo) : null, l.aula ? h('div.tenue', 'in aula') : null),
        h('td', (l.sottoObiettivi || []).map((c) => chipSotto(stato, cl.livello, c))),
        h('td', l.tipo === 'saltata'
          ? h('button', { onclick: () => ctx.store.aggiorna((s) => A.rimuoviEvento(s, l.eventoId)) }, 'Ripristina')
          : h('button', { onclick: () => segnaSaltata(ctx, cl.codice, l.data) }, 'Lezione saltata…'))))))));
}

function segnaSaltata(ctx, classe, data) {
  const motivo = h('input', { value: 'Uscita didattica', size: 40, 'aria-label': 'Motivo' });
  modale(`Lezione saltata · ${classe} · ${formatta(data, true)}`, h('div',
    campo('Motivo (gita, assenza docente, evento…)', motivo),
    h('p.tenue', 'La sequenza di questa classe slitta alla lezione successiva; i cuscinetti assorbono lo slittamento.')), {
    azioni: [{
      testo: 'Segna come saltata', primario: true,
      azione: () => {
        const ok = prova(() => ctx.store.aggiorna((s) => A.aggiungiEvento(s, { classe, data, motivo: motivo.value })));
        if (ok) avviso('Lezione segnata come saltata: sequenza ricalcolata');
        return Boolean(ok);
      }
    }]
  });
}
