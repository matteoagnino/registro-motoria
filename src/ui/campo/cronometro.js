// Cronometro dei Giochi sull'iPad: Super Gym (tempo + penalità) e Superiamo gli ostacoli, salvati per alunno.
import { h, avviso } from '../dom.js';
import { campoTempo, trovaTempo } from '../../dati/campo.js';
import { tempoGara } from '../../giochi/giochi.js';

const PROVE = { supergym: 'Super Gym School', ostacoli: 'Superiamo gli ostacoli' };

// Stato del cronometro fuori dallo store: non si salva finché non tocchi «Salva».
const crono = { chiave: null, inizio: null, trascorsoMs: 0, conteggi: {}, wakeLock: null, raf: null };

const secondi = () => (crono.trascorsoMs + (crono.inizio != null ? performance.now() - crono.inizio : 0)) / 1000;
const mostra = (s) => {
  const cent = Math.floor(s * 100 + 1e-6);
  const m = Math.floor(cent / 6000);
  const resto = cent % 6000;
  return `${String(m).padStart(2, '0')}:${String(Math.floor(resto / 100)).padStart(2, '0')},${String(resto % 100).padStart(2, '0')}`;
};
const fmt = (n) => (Number.isFinite(n) ? n.toFixed(2) : String(n)).replace('.', ',');

function azzera(chiave) {
  ferma();
  Object.assign(crono, { chiave, inizio: null, trascorsoMs: 0, conteggi: {} });
}

function aggiornaDisplay() {
  const el = document.getElementById('crono-display');
  if (el) el.textContent = mostra(secondi());
  if (crono.inizio != null) crono.raf = requestAnimationFrame(aggiornaDisplay);
}

async function avvia() {
  crono.inizio = performance.now();
  aggiornaDisplay();
  crono.wakeLock = await navigator.wakeLock?.request('screen').catch(() => null); // lo schermo non si spegne durante la prova
}

function ferma() {
  if (crono.inizio != null) crono.trascorsoMs += performance.now() - crono.inizio;
  crono.inizio = null;
  cancelAnimationFrame(crono.raf);
  crono.wakeLock?.release?.().catch(() => {});
  crono.wakeLock = null;
}

const totalePenalita = (pen) => pen.reduce((a, p, i) => a + p.secondi * (crono.conteggi[i] ?? 0), 0);

export function vistaCronometro(ctx, codice, prova = 'supergym', ril = '1', testa, indietro) {
  const c = ctx.campoStore.get();
  const cl = c.pacchetto.classi.find((x) => x.codice === codice);
  if (!cl) return null;
  const rilevazione = Number(ril) === 2 ? 2 : 1;
  const anno = c.pacchetto.giochi?.anno ?? c.pacchetto.anno;
  const pen = c.pacchetto.giochi?.penalita ?? [];
  const alunni = c.pacchetto.alunni.filter((a) => a.classe === codice && a.stato !== 'Ritirato' && a.stato !== 'ES').sort((a, b) => a.numero - b.numero);
  const chiaveDi = (a) => ({ anno, rilevazione, alunnoId: a.id, prova });
  const salvato = (a) => trovaTempo(c, chiaveDi(a));
  const scelto = alunni.find((a) => a.id === ctx.cronoAlunno) ?? alunni.find((a) => salvato(a)?.tempo == null) ?? alunni[0];
  const chiave = scelto ? `${codice}|${prova}|${rilevazione}|${scelto.id}` : null;
  if (crono.chiave !== chiave) azzera(chiave);
  const link = (p, r) => `#/campo/giochi/${codice}/${p}/${r}`;
  const fatti = alunni.filter((a) => salvato(a)?.tempo != null).length;

  return h('div',
    testa(`${codice} · ${PROVE[prova]}`, `${rilevazione}ª rilevazione · ${anno} · tempi ${fatti}/${alunni.length}`,
      indietro(`#/campo/classe/${codice}`, 'Giornate'),
      ...Object.entries(PROVE).map(([p, n]) => h(`a.bottone.grande${p === prova ? '.primario' : ''}`, { href: link(p, rilevazione), 'aria-current': p === prova ? 'page' : null }, n)),
      ...[1, 2].map((r) => h(`a.bottone.grande${r === rilevazione ? '.primario' : ''}`, { href: link(prova, r) }, `${r}ª ril.`))),
    !scelto ? h('div.campo-corpo', h('div.vuoto', 'Nessun alunno in questa classe.')) :
      h('div.campo-corpo', pannello(ctx, { cl, scelto, prova, pen, salvato: salvato(scelto), chiave: chiaveDi(scelto), alunni, salvatoDi: salvato })),
    h('nav.nav-alunni', { 'aria-label': 'Scegli l\'alunno' }, alunni.map((a) => h(`a${salvato(a)?.tempo != null ? '.completo' : ''}${a.id === scelto?.id ? '.attivo' : ''}`, {
      href: '#', title: a.cognomeNome, 'aria-label': `Alunno ${a.numero}`,
      onclick: (e) => { e.preventDefault(); if (crono.inizio == null) { ctx.cronoAlunno = a.id; ctx.ridisegna(); } }
    }, a.numero))));
}

function pannello(ctx, { cl, scelto, prova, pen, salvato, chiave, alunni, salvatoDi }) {
  const inCorso = crono.inizio != null;
  const fermo = !inCorso && crono.trascorsoMs > 0;
  const tot = prova === 'supergym' ? totalePenalita(pen) : 0;
  const t = Math.floor(secondi() * 100 + 1e-6) / 100;
  const toggle = async () => { if (crono.inizio == null) await avvia(); else ferma(); ctx.ridisegna(); };
  const salva = () => {
    const prima = ctx.campoStore.get();
    try {
      ctx.campoStore.aggiorna((s) => campoTempo(s, { ...chiave, classe: cl.codice, tempo: t, penalita: tot }));
    } catch (e) {
      return avviso(e.message, 'errore');
    }
    avviso(`n. ${scelto.numero}: ${fmt(t)} s${tot ? ` + ${tot}` : ''} salvato`, 'ok', { testo: 'Annulla', fn: () => ctx.campoStore.sostituisci(prima) });
    const dopo = ctx.campoStore.get();
    const prossimo = alunni.find((a) => a.numero > scelto.numero && trovaTempo(dopo, { ...chiave, alunnoId: a.id })?.tempo == null);
    ctx.cronoAlunno = prossimo?.id ?? scelto.id;
    azzera(null);
    ctx.ridisegna();
  };
  return h('section.scheda-alunno.cronometro',
    h('h2', h('span.numero', scelto.numero), h('span', scelto.cognomeNome, scelto.op ? h('small', ' (OP)') : null)),
    salvato?.tempo != null ? h('p.tenue', { style: { padding: '0 18px' } },
      `Già salvato: ${fmt(salvato.tempo)} s${salvato.penalita ? ` + ${salvato.penalita} s di penalità` : ''}. Un nuovo tempo lo sostituisce.`) : null,
    h('div#crono-display', { 'aria-live': 'off', role: 'timer', 'aria-label': 'Tempo' }, mostra(secondi())),
    fermo
      ? h('div.crono-esito',
        h('div.crono-totale', `Tempo ${fmt(t)} s`, prova === 'supergym' ? ` + ${tot} s = ${fmt(tempoGara(t, tot))} s` : ''),
        h('button.crono-via.salva', { onclick: salva }, 'SALVA E AVANTI'),
        h('div.riga',
          h('button.grande', { onclick: toggle }, 'Riparti (continua il tempo)'),
          h('button.grande', { onclick: () => { azzera(null); ctx.ridisegna(); } }, 'Azzera')))
      : h(`button.crono-via${inCorso ? '.stop' : ''}`, { onclick: toggle, 'aria-label': inCorso ? 'Stop' : 'Via' }, inCorso ? 'STOP' : 'VIA'),
    prova === 'supergym' && pen.length ? h('div.penalita',
      h('h3', 'Penalità ', h('strong', `+${tot} s`)),
      h('div.griglia-pen', pen.map((p, i) => h('div.pen',
        h('span.pen-nome', h('b', p.stazione.split(' ')[0]), ` ${p.errore}`),
        h('span.pen-azioni',
          h('button', { 'aria-label': `Togli ${p.stazione} ${p.errore}`, disabled: !crono.conteggi[i], onclick: () => { crono.conteggi[i] = Math.max(0, (crono.conteggi[i] ?? 0) - 1); ctx.ridisegna(); } }, '−'),
          h('span.pen-n', crono.conteggi[i] ?? 0),
          h('button.primario', { 'aria-label': `Aggiungi ${p.stazione} ${p.errore}`, onclick: () => { crono.conteggi[i] = (crono.conteggi[i] ?? 0) + 1; ctx.ridisegna(); } }, `+${p.secondi}″`)))))) : null,
    alunni.length && !fermo && !inCorso ? h('p.tenue', { style: { padding: '0 18px 12px' } },
      `Tocca VIA alla partenza e STOP all'arrivo. ${alunni.filter((a) => salvatoDi(a)?.tempo != null).length} tempi salvati su ${alunni.length}.`) : null);
}
