// Componenti condivisi tra le viste del gestionale.
import { h, select, modale } from '../dom.js';
import { conParametri } from '../app.js';
import { sottoObiettivo } from '../../dati/selettori.js';
import { formatta } from '../../pianificazione/date.js';

export const NOMI_TIPO = {
  prova: 'Prova', recupero: 'Recupero', normale: 'Lezione', progetto: 'Progetto', cuscinetto: 'Cuscinetto',
  libera: 'Libera', saltata: 'Saltata'
};
export const LIVELLI = [10, 9, 8, 7, 6, 5];
export const GIUDIZI = ['Ottimo', 'Distinto', 'Buono', 'Discreto', 'Sufficiente', 'Non sufficiente'];

export const classeNucleo = (so) => `n-${so?.nucleo ?? ''}`;

export function chipSotto(stato, livello, codice, attrs = {}) {
  const so = sottoObiettivo(stato, livello, codice);
  return h(`span.chip.${classeNucleo(so)}`, { title: so ? `${so.codice} ${so.etichetta}` : codice, ...attrs }, codice);
}

export function etichettaTipo(tipo) {
  return h(`span.etichetta-tipo.t-${tipo}`, NOMI_TIPO[tipo] ?? tipo);
}

/** Selettore di classe che aggiorna il parametro ?classe= della rotta. */
export function selettoreClasse(stato, valore, { conTutte = false, param = 'classe' } = {}) {
  const opz = stato.classi.map((c) => [c.codice, `${c.codice} · ${c.livello}ª ${c.plesso}`]);
  return select(conTutte ? [['', 'Tutte le classi'], ...opz] : opz, valore, {
    'aria-label': 'Classe', 'data-focus': `sel-${param}`, onchange: (e) => conParametri({ [param]: e.target.value })
  });
}

export function selettoreQuadrimestre(valore) {
  return select([['Q1', '1° quadrimestre'], ['Q2', '2° quadrimestre']], valore, {
    'aria-label': 'Quadrimestre', 'data-focus': 'sel-q', onchange: (e) => conParametri({ q: e.target.value })
  });
}

export function classeScelta(stato, params) {
  return stato.classi.find((c) => c.codice === params.classe) ?? stato.classi[0];
}

/** Modale con la rubrica di un sotto-obiettivo (o di un singolo indicatore). */
export function apriRubrica(stato, livello, codice, indice = null, evidenzia = null) {
  const so = sottoObiettivo(stato, livello, codice);
  if (!so) return;
  const indicatori = indice == null ? so.indicatori.map((ind, i) => [ind, i]) : [[so.indicatori[indice], indice]];
  modale(`${so.codice} ${so.etichetta} · classe ${livello}ª`, h('div',
    h('p.tenue', so.testo),
    indicatori.map(([ind, i]) => h('div.scheda',
      h('h3', `I${i + 1} · ${ind.nome}`),
      h('p', h('em', 'Cosa osservo: '), ind.cosaOsservo),
      h('table', h('tbody', GIUDIZI.map((g, k) => h('tr', { class: evidenzia === LIVELLI[k] ? 'n-4' : '' },
        h('th', `${LIVELLI[k]} ${g}`), h('td', ind.descrittori[g] ?? '')))))))), { largo: true });
}

/**
 * Testata delle viste. Primo argomento: titolo (stringa) oppure { titolo, occhiello, briciole[], meta[] }.
 */
export function intestazione(def, ...controlli) {
  const d = typeof def === 'string' ? { titolo: def } : def;
  return h('header.testata',
    h('div',
      d.briciole?.length ? h('div.briciole', d.briciole.flatMap((b, i) => (i ? [h('i', '/'), b] : [b]))) : null,
      h('div.titolo-riga', d.occhiello ? h('span.occhiello', d.occhiello) : null, h('h1', d.titolo)),
      d.meta?.length ? h('div.meta', d.meta.filter(Boolean).map((m) => h('span', m))) : null),
    controlli.length ? h('div.controlli', controlli) : null);
}

export function contatore(valore, etichetta, tipo = '') {
  return h(`div.contatore-chip${tipo ? `.${tipo}` : ''}`, h('b', valore), h('small', etichetta));
}

export function legendaLivelli() {
  return h('div.legenda', { 'aria-label': 'Legenda dei livelli' },
    LIVELLI.map((l, i) => h('span', h('b', { 'data-l': l }, l), GIUDIZI[i])));
}

export const dataBreve = (iso) => formatta(iso);
