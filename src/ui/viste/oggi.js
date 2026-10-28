// Settimana condivisa: tutte le classi, giorno per giorno, con cosa si valuta e chi deve recuperare.
import { h } from '../dom.js';
import { conParametri } from '../app.js';
import { piano, daRecuperareClasse, giornata, avanzamentoGiornata, allertaPochiVoti, allertaGiochi } from '../../dati/selettori.js';
import { alunniDi } from '../../dati/azioni.js';
import { lunediDi, aggiungiGiorni, oggiISO, formatta, GIORNI_LUNGHI, toDate } from '../../pianificazione/date.js';
import { intestazione, etichettaTipo, chipSotto } from './comuni.js';
import { apriLezioniNonSvolte } from './nonSvolte.js';

export function settimanaIniziale(stato, oggi = oggiISO()) {
  const d = oggi < stato.anno.inizio ? stato.anno.inizio : oggi > stato.anno.fine ? stato.anno.fine : oggi;
  return lunediDi(d);
}

export function vistaOggi(ctx, { params }) {
  const stato = ctx.store.get();
  const lun = params.settimana ? lunediDi(params.settimana) : settimanaIniziale(stato);
  const p = piano(stato);
  const oggi = oggiISO();
  const giorni = [0, 1, 2, 3, 4].map((i) => aggiungiGiorni(lun, i));

  return h('div',
    intestazione({
      titolo: `Settimana dal ${formatta(lun).slice(0, 5)}`,
      occhiello: stato.anno.id,
      briciole: ['Settimana', 'Tutte le classi'],
      meta: ['Lezione 120\': 15\' accoglienza · 90\' attività (ultimi 20\' gioco a squadre) · 15\' cambio e rientro']
    },
      h('button', { onclick: () => conParametri({ settimana: aggiungiGiorni(lun, -7) }), 'aria-label': 'Settimana precedente' }, '‹ Precedente'),
      h('button', { onclick: () => conParametri({ settimana: settimanaIniziale(stato) }) }, 'Questa settimana'),
      h('button', { onclick: () => conParametri({ settimana: aggiungiGiorni(lun, 7) }), 'aria-label': 'Settimana successiva' }, 'Successiva ›'),
      h('input', { type: 'date', value: lun, 'aria-label': 'Vai alla settimana', onchange: (e) => e.target.value && conParametri({ settimana: e.target.value }) }),
      h('button', { onclick: () => apriLezioniNonSvolte(ctx, { dal: giorni.includes(oggi) ? oggi : lun }) }, 'Lezioni non svolte…')),
    pannelloGiochi(stato, oggi),
    pannelloPochiVoti(stato, oggi),
    pannelloRecuperi(stato),
    griglia(stato, p, giorni, oggi));
}

/** Fasce orarie distinte della settimana (stesso inizio e fine = stessa fascia), in ordine di orario. */
export function fasceOrarie(lezioni) {
  const minuti = (hhmm) => { const [o, m] = hhmm.split(':').map(Number); return o * 60 + m; };
  const chiavi = [...new Set(lezioni.map((l) => `${l.inizio}–${l.fine}`))];
  return chiavi.map((k) => {
    const [inizio, fine] = k.split('–');
    return { chiave: k, inizio, fine };
  }).sort((a, b) => minuti(a.inizio) - minuti(b.inizio) || minuti(a.fine) - minuti(b.fine));
}

/** Orario settimanale: una riga per fascia oraria, una colonna per giorno; stesso orario = stessa riga. */
function griglia(stato, p, giorni, oggi) {
  const perGiorno = giorni.map((d) => ({
    d,
    chiusura: stato.anno.chiusure.find((c) => d >= c.dal && d <= c.al),
    lezioni: stato.classi.map((c) => ({ c, l: p[c.codice]?.lezioni.find((x) => x.data === d) })).filter((x) => x.l)
  }));
  const fasce = fasceOrarie(perGiorno.flatMap((g) => g.lezioni.map((x) => x.l)));
  const classiGiorno = (g) => `${g.d === oggi ? '.oggi' : ''}${g.chiusura ? '.chiuso' : ''}`;
  return h('div.settimana-scorri', h('section.settimana-orario', { 'aria-label': 'Orario della settimana' },
    h('div.angolo', 'Orario'),
    perGiorno.map((g) => h(`div.testa-giorno${classiGiorno(g)}`,
      h('h3', GIORNI_LUNGHI[toDate(g.d).getUTCDay()].slice(0, 3), h('small', formatta(g.d).slice(0, 5))),
      g.chiusura ? h('p.tenue', `Chiuso: ${g.chiusura.motivo}`) : null,
      !g.lezioni.length && !g.chiusura ? h('p.tenue', 'Nessuna lezione') : null)),
    fasce.map((f) => [
      h('div.fascia', { 'aria-label': `Fascia ${f.inizio}–${f.fine}` }, h('strong', f.inizio), h('span', f.fine)),
      perGiorno.map((g) => h(`div.cella-fascia${classiGiorno(g)}`, { 'data-fascia': f.chiave },
        g.lezioni.filter(({ l }) => `${l.inizio}–${l.fine}` === f.chiave).map(({ c, l }) => schedaLezione(stato, c, l))))
    ])));
}

function schedaLezione(stato, c, l) {
  const g = l.giornataId ? giornata(stato, l.giornataId) : null;
  const daRec = daRecuperareClasse(stato, c.codice);
  const nomi = alunniDi(stato, c.codice).filter((a) => daRec.has(a.id));
  return h(`div.lezione.t-${l.tipo}`,
    h('div.riga', h('strong', c.codice), h('small', `${l.inizio}–${l.fine}`), etichettaTipo(l.tipo)),
    l.aula ? h('div.avviso-cella', 'In aula (palestra inagibile)') : null,
    g ? h('div', h('a', { href: `#/gestionale/registro?classe=${c.codice}&g=${g.id}` }, `${g.id} · ${g.descrizione}`), avanzamento(stato, c, g)) : null,
    l.sottoObiettivi?.length ? h('div', l.sottoObiettivi.map((cod) => chipSotto(stato, c.livello, cod))) : null,
    l.tipo === 'recupero' && l.recuperoDi ? h('div', `Recupero di ${l.recuperoDi}`) : null,
    l.motivo && l.tipo !== 'prova' ? h('div.tenue', l.motivo) : null,
    nomi.length && ['recupero', 'normale', 'cuscinetto'].includes(l.tipo)
      ? h('div.avviso-cella', `Da recuperare: ${nomi.map((a) => `${a.numero} ${a.cognomeNome}`).join(', ')}`)
      : null);
}

function avanzamento(stato, c, g) {
  const { fatti, totale } = avanzamentoGiornata(stato, c.codice, g.id);
  if (!totale) return null;
  const pct = Math.round((fatti / totale) * 100);
  return h('span.anello', { style: `--p: ${pct}`, title: `Registrati ${fatti}/${totale}`, 'aria-label': `Registrati ${fatti} su ${totale}` }, h('span', `${pct}%`));
}

/** Recuperi in sospeso di tutte le classi, con collegamento al registro della giornata. */
function pannelloRecuperi(stato) {
  const voci = stato.classi.flatMap((c) => {
    const daRec = daRecuperareClasse(stato, c.codice);
    return alunniDi(stato, c.codice).filter((a) => daRec.has(a.id))
      .flatMap((a) => [...daRec.get(a.id)].map((gId) => ({ c, a, gId })));
  });
  if (!voci.length) return null;
  return h('details.scheda',
    h('summary', h('strong', 'Recuperi in sospeso '), h('span.badge-rec', voci.length)),
    h('ul', voci.map(({ c, a, gId }) => h('li',
      h('a', { href: `#/gestionale/registro?classe=${c.codice}&g=${gId}` }, `${c.codice} · n. ${a.numero} ${a.cognomeNome} · ${gId}`)))));
}

/** Avviso di fine quadrimestre: chi ha ancora pochi voti e quante lezioni restano per rimediare. */
/** Giochi della Gioventù: classi rimaste indietro rispetto alle altre su una giornata dei Giochi. */
function pannelloGiochi(stato, oggi) {
  const allerte = allertaGiochi(stato, oggi);
  if (!allerte.length) return null;
  const quando = (m) => (m.data ? `prevista il ${formatta(m.data)}` : m.stato);
  return h('details.scheda.attenzione', { open: true },
    h('summary', h('strong', 'Giochi della Gioventù: '), 'classi rimaste indietro'),
    h('ul', allerte.map((a) => h('li',
      h('b', `${a.giornata.id} ${a.giornata.descrizione}`), ` — già svolta da ${a.svolte.join(', ')}; manca a `,
      a.mancanti.map((m, i) => [i ? ', ' : '', h('a', { href: `#/gestionale/calendario?classe=${m.classe}` }, h('b', m.classe)), ` (${quando(m)})`])))),
    h('p.tenue', 'Tutte le classi devono avere le stesse rilevazioni e le stesse opportunità per i Giochi: recupera queste giornate prima di altre prove.'));
}

function pannelloPochiVoti(stato, oggi) {
  const a = allertaPochiVoti(stato, oggi);
  if (!a?.classi.length) return null;
  const n = a.classi.reduce((t, c) => t + c.alunni.length, 0);
  return h('details.scheda.attenzione', { open: true },
    h('summary', h('strong', `Fine del ${a.quadrimestre === 'Q1' ? '1°' : '2°'} quadrimestre tra ${a.giorni} giorni (${formatta(a.fine)}): `),
      `${n} alunni con meno di ${a.min} voti in A o B`),
    h('ul', a.classi.map((c) => h('li',
      h('a', { href: `#/gestionale/riepilogo?classe=${c.classe}&q=${a.quadrimestre}` }, h('b', c.classe)),
      ` (${c.lezioniRimaste} lezioni rimaste): `,
      c.alunni.map((x) => `n. ${x.numero} ${x.cognomeNome} (A ${x.nA}, B ${x.nB})`).join(' · ')))),
    h('p.tenue', 'Usa le lezioni rimaste per i recuperi, oppure prevedi una valutazione alternativa (scritta/orale).'));
}
