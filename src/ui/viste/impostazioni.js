// Impostazioni: parametri, soglie, calendario, obiettivi di scheda, sotto-obiettivi, indicatori e descrittori.
import { h, select, campo, prova } from '../dom.js';
import { conParametri } from '../app.js';
import * as A from '../../dati/azioni.js';
import { intestazione, GIUDIZI, classeNucleo } from './comuni.js';

const SEZIONI = [['parametri', 'Calcolo e pesi'], ['calendario', 'Calendario'], ['scheda', 'Obiettivi di scheda'], ['sotto', 'Sotto-obiettivi e rubriche'], ['giochi', 'Prove Giochi']];
const NUM = (v) => Number(String(v).replace(',', '.'));

export function vistaImpostazioni(ctx, { params }) {
  const sez = params.sez || 'parametri';
  return h('div',
    intestazione('Impostazioni'),
    h('div.barra', { role: 'tablist' }, SEZIONI.map(([id, nome]) => h(`button${id === sez ? '.primario' : ''}`, {
      role: 'tab', 'aria-selected': String(id === sez), onclick: () => conParametri({ sez: id })
    }, nome))),
    { parametri, calendario, scheda, sotto, giochi }[sez](ctx, params));
}

function agg(ctx, fn, msg = 'Salvato') {
  return prova(() => ctx.store.aggiorna(fn), msg);
}

function parametri(ctx) {
  const { parametri: p, soglie, scala } = ctx.store.get().impostazioni;
  const num = (chiave, etichetta, aiuto) => campo(etichetta, h('input.input-giallo', {
    type: 'number', step: '0.05', value: p[chiave], 'data-focus': `p-${chiave}`,
    onchange: (e) => agg(ctx, (s) => A.aggiornaParametri(s, { [chiave]: NUM(e.target.value) }))
  }), aiuto);
  return h('div.griglia-2',
    h('div.scheda', h('h2', 'Pesi e quote'),
      num('peso_prima_meta', 'Peso prove 1ª metà del quadrimestre'),
      num('peso_seconda_meta', 'Peso prove 2ª metà del quadrimestre'),
      num('quota_prove', 'Quota prove (A/B)', 'Valore finale = quota prove × media + quota processo × rubrica'),
      num('quota_processo', 'Quota rubrica di processo (A/B)'),
      num('min_voti_obiettivo', 'Minimo voti per obiettivo A/B', 'Sotto questa soglia: avviso «valutazione alternativa»'),
      num('giorni_minimi_ripetizione', 'Giorni minimi tra due prove dello stesso sotto-obiettivo')),
    h('div.scheda', h('h2', 'Soglie del giudizio finale'),
      h('table', h('thead', h('tr', h('th', 'Valore ≥'), h('th', 'Giudizio'))),
        h('tbody', [...soglie].sort((a, b) => b.min - a.min).map((s) => h('tr',
          h('td', h('input.input-giallo', {
            type: 'number', step: '0.1', value: s.min, 'aria-label': `Soglia ${s.giudizio}`,
            onchange: (e) => agg(ctx, (st) => A.aggiornaImpostazioni(st, {
              soglie: st.impostazioni.soglie.map((x) => (x.giudizio === s.giudizio ? { ...x, min: NUM(e.target.value) } : x))
            }))
          })),
          h('td', s.giudizio))))),
      h('h3', { style: { marginTop: '1rem' } }, 'Scala dei voti'),
      h('p', scala.map((s) => `${s.valore} ${s.giudizio}`).join(' · '))));
}

function calendario(ctx) {
  const st = ctx.store.get();
  const { anno, impostazioni } = st;
  const aggQ = (i, chiave, v) => agg(ctx, (s) => ({ ...s, anno: { ...s.anno, quadrimestri: s.anno.quadrimestri.map((q, k) => (k === i ? { ...q, [chiave]: v } : q)) } }));
  const aggChiusura = (i, patch) => agg(ctx, (s) => ({ ...s, anno: { ...s.anno, chiusure: s.anno.chiusure.map((c, k) => (k === i ? { ...c, ...patch } : c)) } }));
  return h('div.griglia-2',
    h('div.scheda', h('h2', 'Anno scolastico ', anno.id),
      h('div.riga',
        campo('Inizio lezioni', h('input', { type: 'date', value: anno.inizio, onchange: (e) => agg(ctx, (s) => ({ ...s, anno: { ...s.anno, inizio: e.target.value } })) })),
        campo('Fine lezioni', h('input', { type: 'date', value: anno.fine, onchange: (e) => agg(ctx, (s) => ({ ...s, anno: { ...s.anno, fine: e.target.value } })) }))),
      anno.quadrimestri.map((q, i) => h('div.riga',
        h('strong', q.id),
        campo('Metà (peso 2ª metà da)', h('input', { type: 'date', value: q.meta, onchange: (e) => aggQ(i, 'meta', e.target.value) })),
        campo('Fine', h('input', { type: 'date', value: q.fine, onchange: (e) => aggQ(i, 'fine', e.target.value) })))),
      campo('Lezioni cuscinetto a fine quadrimestre', h('input', {
        type: 'number', min: 0, max: 6, value: impostazioni.cuscinetti,
        onchange: (e) => agg(ctx, (s) => A.aggiornaImpostazioni(s, { cuscinetti: Math.max(0, Math.round(NUM(e.target.value))) }))
      })),
      campo('Settimana di riferimento per «Venerdì 1» (5B Boncompagni)', h('input', {
        type: 'date', value: impostazioni.settimanaRifVenerdi1 || '',
        onchange: (e) => agg(ctx, (s) => A.aggiornaImpostazioni(s, { settimanaRifVenerdi1: e.target.value }))
      }), 'Qualsiasi giorno della settimana in cui vale la fascia «Venerdì 1». Vuoto = settimana di inizio lezioni.')),
    h('div.scheda', h('h2', 'Chiusure (calendario regionale e d\'istituto)'),
      h('table', h('thead', h('tr', h('th', 'Dal'), h('th', 'Al'), h('th', 'Motivo'), h('th', ''))),
        h('tbody', anno.chiusure.map((c, i) => h('tr',
          h('td', h('input', { type: 'date', value: c.dal, onchange: (e) => aggChiusura(i, { dal: e.target.value }) })),
          h('td', h('input', { type: 'date', value: c.al, onchange: (e) => aggChiusura(i, { al: e.target.value }) })),
          h('td', h('input', { value: c.motivo, onchange: (e) => aggChiusura(i, { motivo: e.target.value }) })),
          h('td', h('button', { onclick: () => agg(ctx, (s) => ({ ...s, anno: { ...s.anno, chiusure: s.anno.chiusure.filter((_, k) => k !== i) } })) }, 'Rimuovi')))))),
      h('button', {
        onclick: () => agg(ctx, (s) => ({ ...s, anno: { ...s.anno, chiusure: [...s.anno.chiusure, { dal: s.anno.inizio, al: s.anno.inizio, motivo: 'Ponte / chiusura' }] } }))
      }, '+ Aggiungi chiusura')));
}

function scheda(ctx) {
  const os = ctx.store.get().didattica.obiettiviScheda;
  return h('div.griglia-2', ['4', '5'].map((liv) => h('div.scheda', h('h2', `Classe ${liv}ª`),
    ['Q1A', 'Q1B', 'Q2A', 'Q2B'].map((k) => campo(`${k.slice(0, 2)} · Ob. ${k.slice(2)}`, h('textarea', {
      value: os[liv][k], rows: 3, onchange: (e) => agg(ctx, (s) => A.aggiornaObiettivoScheda(s, liv, k, e.target.value))
    }))))));
}

function sotto(ctx, params) {
  const st = ctx.store.get();
  const liv = params.liv || '4';
  const lista = st.didattica.sottoObiettivi[liv];
  const cod = params.so || lista[0].codice;
  const so = lista.find((s) => s.codice === cod) ?? lista[0];
  const conc = ['A', 'B', 'TEC', 'CIV', '—'];
  return h('div',
    h('div.barra',
      select([['4', 'Classe 4ª'], ['5', 'Classe 5ª']], liv, { onchange: (e) => conParametri({ liv: e.target.value, so: '' }), 'aria-label': 'Livello' }),
      lista.map((s) => h(`button.${classeNucleo(s)}${s.codice === so.codice ? '.primario' : ''}`, { onclick: () => conParametri({ so: s.codice }) }, s.codice))),
    h('div.scheda',
      h('h2', `${so.codice} · nucleo ${so.nucleo}`),
      h('div.riga',
        campo('Etichetta', h('input', { value: so.etichetta, size: 34, onchange: (e) => agg(ctx, (s) => A.aggiornaSottoObiettivo(s, liv, so.codice, { etichetta: e.target.value })) })),
        campo('Concorre nel 1°Q a', select(conc, so.concorre.Q1, { onchange: (e) => agg(ctx, (s) => A.aggiornaSottoObiettivo(s, liv, so.codice, { concorre: { ...so.concorre, Q1: e.target.value } })) })),
        campo('Concorre nel 2°Q a', select(conc, so.concorre.Q2, { onchange: (e) => agg(ctx, (s) => A.aggiornaSottoObiettivo(s, liv, so.codice, { concorre: { ...so.concorre, Q2: e.target.value } })) }))),
      campo('Testo del sotto-obiettivo', h('textarea', { value: so.testo, rows: 2, onchange: (e) => agg(ctx, (s) => A.aggiornaSottoObiettivo(s, liv, so.codice, { testo: e.target.value })) }))),
    so.indicatori.map((ind, i) => h('details.scheda', { open: params.ind === String(i) || null },
      h('summary', h('strong', `I${i + 1} · ${ind.nome}`)),
      h('div.riga',
        campo('Nome indicatore', h('input', { value: ind.nome, size: 34, onchange: (e) => agg(ctx, (s) => A.aggiornaIndicatore(s, liv, so.codice, i, { nome: e.target.value })) })),
        h('div.spazio')),
      campo('Cosa osservo', h('textarea', { value: ind.cosaOsservo, rows: 2, onchange: (e) => agg(ctx, (s) => A.aggiornaIndicatore(s, liv, so.codice, i, { cosaOsservo: e.target.value })) })),
      GIUDIZI.map((g) => campo(`Descrittore · ${g}`, h('textarea', {
        value: ind.descrittori[g] ?? '', rows: 2, 'aria-label': `Descrittore ${g} indicatore ${i + 1}`,
        onchange: (e) => agg(ctx, (s) => A.aggiornaIndicatore(s, liv, so.codice, i, { descrittori: { [g]: e.target.value } }), 'Descrittore aggiornato')
      }))))));
}

function giochi(ctx) {
  const g = ctx.store.get().giochi;
  const aggProva = (id, patch) => agg(ctx, (s) => ({ ...s, giochi: { ...s.giochi, prove: s.giochi.prove.map((p) => (p.id === id ? { ...p, ...patch } : p)) } }));
  const aggPen = (i, patch) => agg(ctx, (s) => ({ ...s, giochi: { ...s.giochi, penalitaSupergym: s.giochi.penalitaSupergym.map((p, k) => (k === i ? { ...p, ...patch } : p)) } }));
  return h('div',
    h('div.scheda', h('h2', 'Prove (schede tecniche)'),
      h('table', h('thead', h('tr', ['Prova', 'Federazione', 'Tipo', 'Calcolo'].map((t) => h('th', t)))),
        h('tbody', g.prove.map((p) => h('tr',
          h('td', h('input', { value: p.nome, onchange: (e) => aggProva(p.id, { nome: e.target.value }) })),
          h('td', p.federazione),
          h('td', select([['individuale_tempo', 'Individuale a tempo'], ['squadra_punti', 'Squadra a punti']], p.tipo, { onchange: (e) => aggProva(p.id, { tipo: e.target.value }) })),
          h('td', h('textarea', { value: p.calcolo, rows: 2, onchange: (e) => aggProva(p.id, { calcolo: e.target.value }) }))))))),
    h('div.scheda', h('h2', 'Penalità Super Gym (secondi)'),
      h('table', h('thead', h('tr', ['Stazione', 'Errore', 'Secondi'].map((t) => h('th', t)))),
        h('tbody', g.penalitaSupergym.map((p, i) => h('tr',
          h('td', p.stazione), h('td', p.errore),
          h('td', h('input', { type: 'number', value: p.secondi, style: { width: '5rem' }, onchange: (e) => aggPen(i, { secondi: NUM(e.target.value) }) })))))),
      h('p.tenue', 'Le modifiche valgono per i calcoli successivi e vengono salvate automaticamente.')));
}
