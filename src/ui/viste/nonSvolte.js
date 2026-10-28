// Lezioni non svolte (gita, assenza del docente, altre attività): più classi e più giorni in una volta.
import { h, campo, modale, prova, avviso } from '../dom.js';
import * as A from '../../dati/azioni.js';
import { lezioniNelPeriodo } from '../../dati/selettori.js';
import { formatta, oggiISO } from '../../pianificazione/date.js';

const MOTIVI = {
  docente: { etichetta: 'Sono assente io', testo: 'Assenza docente', aiuto: 'Tutte le classi che hanno lezione in quei giorni.' },
  classi: { etichetta: 'Gita o attività di alcune classi', testo: 'Uscita didattica', aiuto: 'Scegli tu le classi.' }
};

/** Cosa succede alla sequenza se la lezione non si svolge. */
export function effettoSalto(l) {
  if (l.tipo === 'prova') return `prova ${l.giornataId}: slitta alla lezione successiva (al posto del recupero)`;
  if (l.tipo === 'recupero') return `recupero di ${l.recuperoDi}: si sposta alla prima lezione libera`;
  if (l.tipo === 'progetto') return `progetto${l.giornataId ? ` (${l.giornataId})` : ''}: la sequenza viene ricalcolata`;
  return 'si salta, non si sposta nulla';
}

/**
 * Finestra «Lezioni non svolte». `dal` e `classi` preimpostano periodo e classi
 * (dal Calendario di una classe: quella lezione).
 */
export function apriLezioniNonSvolte(ctx, { dal = oggiISO(), classi = null } = {}) {
  const inputDal = h('input', { type: 'date', value: dal, 'aria-label': 'Dal giorno' });
  const inputAl = h('input', { type: 'date', value: dal, 'aria-label': 'Al giorno' });
  const testo = h('input', { value: MOTIVI[classi ? 'classi' : 'docente'].testo, size: 32, 'aria-label': 'Motivo' });
  let tipo = classi ? 'classi' : 'docente';
  let scelte = new Set();
  const elenco = h('div.elenco-non-svolte', { 'aria-live': 'polite' });
  const chiave = (l) => `${l.classe}|${l.data}`;

  const disegna = (preselezione) => {
    const al = inputAl.value < inputDal.value ? inputDal.value : inputAl.value;
    const lezioni = inputDal.value ? lezioniNelPeriodo(ctx.store.get(), inputDal.value, al) : [];
    scelte = new Set(lezioni.filter(preselezione).map(chiave));
    elenco.replaceChildren(lezioni.length
      ? h('ul', lezioni.map((l) => h('li', h('label',
        h('input', {
          type: 'checkbox', checked: scelte.has(chiave(l)), 'aria-label': `${l.classe} ${l.data}`,
          onchange: (e) => (e.target.checked ? scelte.add(chiave(l)) : scelte.delete(chiave(l)))
        }),
        h('span.quando', `${formatta(l.data, true)} · ${l.inizio}`), h('strong', l.classe),
        h(`span.effetto${l.tipo === 'prova' ? '.prova' : ''}`, effettoSalto(l))))))
      : h('p.tenue', 'Nessuna lezione in questo periodo.'));
  };
  const preselezione = () => (l) => (tipo === 'docente' ? true : Boolean(classi?.includes(l.classe)));
  const cambiaTipo = (nuovo) => {
    tipo = nuovo;
    testo.value = MOTIVI[nuovo].testo;
    disegna(preselezione());
  };
  inputDal.addEventListener('change', () => {
    if (!inputAl.value || inputAl.value < inputDal.value) inputAl.value = inputDal.value;
    disegna(preselezione());
  });
  inputAl.addEventListener('change', () => disegna(preselezione()));

  const contenuto = h('div.non-svolte',
    h('div.riga', campo('Dal', inputDal), campo('Al (anche lo stesso giorno)', inputAl)),
    h('div.scelta-motivo', { role: 'radiogroup', 'aria-label': 'Perché' }, Object.entries(MOTIVI).map(([k, m]) => h('label',
      h('input', { type: 'radio', name: 'tipo-non-svolte', checked: k === tipo, onchange: () => cambiaTipo(k) }),
      h('span', h('b', m.etichetta), h('small.tenue', m.aiuto))))),
    campo('Motivo', testo),
    elenco,
    h('p.tenue', 'Regola: una lezione senza prova si salta e la programmazione prosegue. Una prova slitta alla lezione successiva della classe, al posto del recupero, così le prove seguenti restano allineate alle altre classi. Solo se la regola dei giorni minimi tra prove lo impedisce, la sequenza scala in avanti. Si annulla con «Ripristina» nel Calendario.'));
  disegna(preselezione());

  modale('Lezioni non svolte', contenuto, {
    largo: true,
    azioni: [{
      testo: 'Segna come non svolte', primario: true,
      azione: () => {
        const lezioni = [...scelte].map((k) => { const [classe, data] = k.split('|'); return { classe, data }; });
        const ok = prova(() => ctx.store.aggiorna((s) => A.segnaLezioniNonSvolte(s, lezioni, testo.value)));
        if (ok) avviso(`${lezioni.length} ${lezioni.length === 1 ? 'lezione segnata' : 'lezioni segnate'} come non svolte: sequenza ricalcolata`);
        return Boolean(ok);
      }
    }]
  });
}
