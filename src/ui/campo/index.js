// Modalità campo (iPad): scelta classe → giornata → registrazione rapida → export file voti.
import { h, avviso, conferma } from '../dom.js';
import { vai } from '../app.js';
import { leggiPacchetto } from '../../dati/scambio.js';
import { importaPacchetto, campoLivello, campoStato, esportaVoti, daEsportare, trovaCampo } from '../../dati/campo.js';
import { votoRegistrazione, giudizioVoto } from '../../calcolo/voti.js';
import { scegliFile, condividiOScarica, marcaTemporale } from '../../dati/archivio.js';
import { oggiISO, formatta, giornoSettimana, giorniTra } from '../../pianificazione/date.js';

const LIVELLI = [10, 9, 8, 7, 6, 5];
const GIUDIZI = ['Ottimo', 'Distinto', 'Buono', 'Discreto', 'Sufficiente', 'Non sufficiente'];
const PRESSIONE_LUNGA_MS = 450;

export function vistaCampo(ctx, rotta) {
  const c = ctx.campoStore.get();
  const [classe, giornataId] = rotta.resto;
  let corpo;
  if (!c.pacchetto || rotta.vista === 'home' || !rotta.vista) corpo = home(ctx);
  else if (rotta.vista === 'classe') corpo = sceltaGiornata(ctx, classe);
  else if (rotta.vista === 'registra') corpo = registra(ctx, classe, giornataId);
  else if (rotta.vista === 'esporta') corpo = esporta(ctx);
  else corpo = home(ctx);
  return h('div.campo-app', corpo);
}

async function importa(ctx) {
  const f = await scegliFile('.json,.rmpack.json,application/json');
  if (!f) return;
  try {
    const p = leggiPacchetto(f.testo);
    const c = ctx.campoStore.get();
    if (daEsportare(c).length && !(await conferma('Ci sono voti non esportati',
      `Hai ${daEsportare(c).length} registrazioni non ancora esportate: restano sull'iPad anche con il nuovo pacchetto, ma esportale appena puoi.`, 'Importa comunque', false))) return;
    ctx.campoStore.aggiorna((s) => importaPacchetto(s, p));
    avviso(`Pacchetto importato: ${p.classi.length} classi, ${p.alunni.length} alunni`);
    vai('campo', 'home');
  } catch (e) {
    avviso(e.message, 'errore');
  }
}

function testa(titolo, ...azioni) {
  return h('header.campo-testa', h('h1', titolo), h('div.spazio'), azioni);
}

function home(ctx) {
  const c = ctx.campoStore.get();
  if (!c.pacchetto) {
    return h('div',
      testa('Registro Motoria · Campo', h('a.bottone', { href: '#/gestionale/oggi' }, 'Gestionale')),
      h('div.scheda',
        h('h2', 'Nessun pacchetto classe'),
        h('p', 'Sul Mac: Import/Export → «Crea pacchetto classe», poi invialo a questo iPad con AirDrop (salvalo in File).'),
        h('button.primario.grande', { onclick: () => importa(ctx) }, 'Importa pacchetto classe')));
  }
  const oggi = oggiISO();
  const gs = giornoSettimana(oggi);
  const nDaEsportare = daEsportare(c).length;
  return h('div',
    testa('Scegli la classe',
      h('button.grande', { onclick: () => importa(ctx) }, 'Nuovo pacchetto'),
      h('a.bottone.grande.primario', { href: '#/campo/esporta' }, `Esporta voti${nDaEsportare ? ` (${nDaEsportare})` : ''}`)),
    h('p.tenue', `Pacchetto del ${new Date(c.pacchetto.creatoIl).toLocaleString('it-IT')} · ${c.pacchetto.anno}`),
    h('div.tessere', c.pacchetto.classi.map((cl) => {
      const diOggi = cl.lezioni.some((l) => l.giorno === gs);
      return h(`a.tessera${diOggi ? '.evidenza' : ''}`, { href: `#/campo/classe/${cl.codice}` },
        h('strong', cl.codice), h('span', `${cl.livello}ª · ${cl.plesso}`), diOggi ? h('span.ok-testo', '● lezione oggi') : null);
    })));
}

/** Giornata preselezionata: quella di oggi, altrimenti la più vicina nel tempo. */
export function giornataPreselezionata(giornate, oggi) {
  const datate = giornate.filter((g) => g.data);
  if (!datate.length) return giornate[0]?.id ?? null;
  return [...datate].sort((a, b) => Math.abs(giorniTra(oggi, a.data)) - Math.abs(giorniTra(oggi, b.data)))[0].id;
}

function sceltaGiornata(ctx, codice) {
  const c = ctx.campoStore.get();
  const cl = c.pacchetto.classi.find((x) => x.codice === codice);
  if (!cl) return home(ctx);
  const pre = giornataPreselezionata(cl.giornate, oggiISO());
  return h('div',
    testa(`${cl.codice} · scegli la giornata`, h('a.bottone.grande', { href: '#/campo/home' }, '‹ Classi')),
    h('div.tessere', cl.giornate.map((g) => h(`a.tessera${g.id === pre ? '.evidenza' : ''}`, { href: `#/campo/registra/${cl.codice}/${g.id}` },
      h('strong', g.id), h('span', g.descrizione), h('span.tenue', g.data ? formatta(g.data, true) : 'data da fissare'),
      h('span', g.sottoObiettivi.join(' · '))))));
}

function statoScheda(c, alunno, g) {
  if (alunno.stato === 'ES') return 'es';
  const regs = g.sottoObiettivi.map((so) => trovaCampo(c, alunno.id, g.id, so));
  if (regs.some((r) => r?.stato === 'AS' && votoRegistrazione(r) == null)) return 'assente';
  if (regs.some((r) => r?.stato)) return 'completo';
  const conVoto = regs.filter((r) => votoRegistrazione(r) != null).length;
  if (conVoto === g.sottoObiettivi.length) return 'completo';
  return conVoto > 0 || regs.some((r) => r?.livelli?.some((l) => l != null)) ? 'incompleto' : 'vuoto';
}

function registra(ctx, codice, giornataId) {
  const c = ctx.campoStore.get();
  const cl = c.pacchetto.classi.find((x) => x.codice === codice);
  const g = cl?.giornate.find((x) => x.id === giornataId);
  if (!cl || !g) return home(ctx);
  const alunni = c.pacchetto.alunni.filter((a) => a.classe === codice && a.stato !== 'Ritirato').sort((a, b) => a.numero - b.numero);
  const sos = g.sottoObiettivi.map((cod) => c.pacchetto.sottoObiettivi[String(cl.livello)].find((s) => s.codice === cod)).filter(Boolean);
  const stati = alunni.map((a) => [a, statoScheda(c, a, g)]);
  const fatti = stati.filter(([, s]) => s === 'completo' || s === 'assente' || s === 'es').length;
  return h('div',
    testa(`${cl.codice} · ${g.id}`,
      h('span.contatore', { 'aria-live': 'polite' }, `Registrati ${fatti}/${alunni.length} · mancano ${alunni.length - fatti}`),
      h('a.bottone.grande', { href: `#/campo/classe/${cl.codice}` }, '‹ Giornate'),
      h('a.bottone.grande.primario', { href: '#/campo/esporta' }, 'Esporta')),
    h('p', h('strong', g.descrizione), ` · ${g.data ? formatta(g.data, true) : ''}`),
    stati.map(([a, st]) => schedaAlunno(ctx, cl, g, sos, a, st)),
    h('nav.nav-alunni', { 'aria-label': 'Vai all\'alunno' }, stati.map(([a, st]) => h(`a.${st}`, {
      href: `#alunno-${a.numero}`, title: a.cognomeNome,
      onclick: (e) => { e.preventDefault(); document.getElementById(`alunno-${a.numero}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }, a.numero))));
}

function schedaAlunno(ctx, cl, g, sos, a, st) {
  const c = ctx.campoStore.get();
  const base = { classe: cl.codice, alunnoId: a.id, giornataId: g.id };
  const regs = sos.map((so) => trovaCampo(c, a.id, g.id, so.codice));
  const statoGiorno = regs.find((r) => r?.stato)?.stato ?? null;
  if (a.stato === 'ES') {
    return h('section.scheda-alunno', { id: `alunno-${a.numero}` }, h('h2', h('span.numero', a.numero), a.cognomeNome, h('small', ' · esonerato')));
  }
  const setStato = (v) => ctx.campoStore.aggiorna((s) => campoStato(s, { ...base, sottoObiettivi: g.sottoObiettivi, valore: statoGiorno === v ? null : v }));
  return h(`section.scheda-alunno.${st}`, { id: `alunno-${a.numero}` },
    h('h2', h('span.numero', a.numero), h('span', a.cognomeNome, a.op ? h('small', ' (OP)') : null),
      h('div.stati', ['AS', 'NV', 'ES'].map((v) => h(`button${statoGiorno === v ? '.attivo' : ''}`, {
        onclick: () => setStato(v), 'aria-pressed': String(statoGiorno === v), title: c.pacchetto.codiciStato?.[v] ?? v
      }, v)))),
    statoGiorno && statoGiorno !== 'AS' ? null : sos.map((so, k) => {
      const r = regs[k];
      const voto = votoRegistrazione(r);
      const parziale = r?.livelli?.some((l) => l != null);
      return h(`div.so-campo.n-${so.nucleo}`,
        h('div.titolo-so', h('span', `${so.codice} ${so.etichetta}`),
          h('span.voto-badge', { 'aria-label': `Voto ${so.codice}` }, voto == null ? '—' : `${voto} ${giudizioVoto(voto, c.pacchetto.scala)}`)),
        so.indicatori.map((ind, i) => {
          const val = r?.livelli?.[i] ?? null;
          const chiaveDesc = `${a.id}|${so.codice}|${i}`;
          const mostra = ctx.descrittoreCampo?.chiave === chiaveDesc;
          return h('div', h(`div.indicatore-riga${parziale && val == null ? '.mancante' : ''}`,
            h('span.nome-ind', `I${i + 1} ${ind.nome}`),
            h('div.livelli', LIVELLI.map((l) => bottoneLivello(ctx, l, val === l, () => {
              ctx.campoStore.aggiorna((s) => campoLivello(s, { ...base, sottoObiettivo: so.codice, indice: i, valore: val === l ? null : l }));
            }, () => {
              ctx.descrittoreCampo = mostra && ctx.descrittoreCampo.livello === l ? null : { chiave: chiaveDesc, livello: l };
              ctx.ridisegna();
            }, `${a.numero} ${so.codice} I${i + 1} livello ${l}`)))),
          mostra ? h('div.descrittore', { role: 'status' }, `${ctx.descrittoreCampo.livello} ${GIUDIZI[LIVELLI.indexOf(ctx.descrittoreCampo.livello)]}: `,
            ind.descrittori[GIUDIZI[LIVELLI.indexOf(ctx.descrittoreCampo.livello)]]) : null);
        }));
    }));
}

/** Pulsante livello: tocco = imposta/toglie; tocco lungo = mostra il descrittore. */
function bottoneLivello(ctx, livello, scelto, onTocco, onLungo, etichetta) {
  let timer = null;
  let lungo = false;
  const b = h(`button${scelto ? '.scelto' : ''}`, {
    'data-l': livello, 'aria-pressed': String(scelto), 'aria-label': etichetta,
    onpointerdown: () => { lungo = false; timer = setTimeout(() => { lungo = true; onLungo(); }, PRESSIONE_LUNGA_MS); },
    onpointerup: () => clearTimeout(timer),
    onpointerleave: () => clearTimeout(timer),
    oncontextmenu: (e) => e.preventDefault(),
    onclick: () => { if (!lungo) onTocco(); lungo = false; }
  }, livello);
  return b;
}

function esporta(ctx) {
  const c = ctx.campoStore.get();
  const nuove = daEsportare(c);
  const tutte = daEsportare(c, true);
  const fai = async (tutteLeModifiche) => {
    const { file, campo } = esportaVoti(c, { tutte: tutteLeModifiche });
    if (!file.registrazioni.length) return avviso('Niente da esportare', 'errore');
    const esito = await condividiOScarica(`voti_${c.deviceId}_${marcaTemporale()}.rmvoti.json`, JSON.stringify(file));
    if (esito === 'annullato') return avviso('Esportazione annullata', 'errore');
    ctx.campoStore.aggiorna(() => campo);
    avviso(`File voti esportato (${file.registrazioni.length} registrazioni)`);
  };
  return h('div',
    testa('Esporta file voti', h('a.bottone.grande', { href: '#/campo/home' }, '‹ Classi')),
    h('div.scheda',
      h('p', h('strong', `${nuove.length} registrazioni`), ' nuove o modificate dall\'ultimo export',
        c.ultimoExport ? ` (${new Date(c.ultimoExport).toLocaleString('it-IT')})` : '', '.'),
      h('button.primario.grande', { onclick: () => fai(false), disabled: !nuove.length }, 'Esporta e condividi (AirDrop)'),
      h('p.tenue', { style: { marginTop: '1rem' } }, `Hai perso un file? Puoi riesportare tutte le ${tutte.length} registrazioni fatte su questo iPad: sul Mac i doppioni vengono ignorati.`),
      h('button.grande', { onclick: () => fai(true), disabled: !tutte.length }, 'Riesporta tutto')),
    h('p.tenue', 'Nessun dato lascia l\'iPad senza questa tua azione.'));
}
