// Modalità campo (iPad): scelta classe → giornata → registrazione rapida → export file voti.
import { h, avviso, conferma } from '../dom.js';
import { vai } from '../app.js';
import { leggiPacchetto } from '../../dati/scambio.js';
import {
  importaPacchetto, campoLivello, campoStato, campoRecupero, esportaVoti, nDaEsportare, trovaCampo,
  recuperiInSospeso, lezioniDiOggi, giornataDellaLezione, promemoriaExport
} from '../../dati/campo.js';
import { votoRegistrazione, giudizioVoto } from '../../calcolo/voti.js';
import { scegliFile, condividiOScarica, marcaTemporale } from '../../dati/archivio.js';
import { oggiISO, formatta, giornoSettimana, giorniTra } from '../../pianificazione/date.js';
import { icona } from '../icone.js';
import { vistaCronometro } from './cronometro.js';
import { vistaSincro, chiudiSincro } from './sincro.js';
import { evidenzia, evidenziaOvunque, vaiAllaScheda, seguiScorrimento, avanzaDopo, appenaCompletata, schedaFatta, pausaTraccia } from './alunnoAttivo.js';

const LIVELLI = [10, 9, 8, 7, 6, 5];
const GIUDIZI = ['Ottimo', 'Distinto', 'Buono', 'Discreto', 'Sufficiente', 'Non sufficiente'];
const PRESSIONE_LUNGA_MS = 450;
const ETICHETTE_STATO = { completo: 'registrato', incompleto: 'da completare', assente: 'assente', es: 'esonerato', vuoto: 'da registrare' };
/** Classe CSS dello stato: «vuoto» si chiama «da-fare» per non ereditare lo stile generale `.vuoto` (riquadro vuoto). */
const classeStato = (st) => (st === 'vuoto' ? 'da-fare' : st);
const MODO = {
  libero: 'Scelta libera: finito un alunno resti lì.',
  ordine: 'Finito un alunno passi al successivo.'
};

export function vistaCampo(ctx, rotta) {
  const c = ctx.campoStore.get();
  const [classe, giornataId] = rotta.resto;
  let corpo;
  if (rotta.vista !== 'sincro' && ctx.sincroCampo) chiudiSincro(ctx);
  if (rotta.vista === 'sincro') corpo = vistaSincro(ctx, testa, indietro);
  else if (!c.pacchetto || rotta.vista === 'home' || !rotta.vista) corpo = home(ctx);
  else if (rotta.vista === 'classe') corpo = sceltaGiornata(ctx, classe);
  else if (rotta.vista === 'registra') corpo = registra(ctx, classe, giornataId);
  else if (rotta.vista === 'esporta') corpo = esporta(ctx);
  else if (rotta.vista === 'giochi') corpo = vistaCronometro(ctx, classe, rotta.resto[1], rotta.resto[2], testa, indietro) ?? home(ctx);
  else corpo = home(ctx);
  return h('div.campo-app', corpo);
}

async function importa(ctx) {
  const f = await scegliFile('.json,.rmpack.json,application/json');
  if (!f) return;
  try {
    const p = leggiPacchetto(f.testo);
    const c = ctx.campoStore.get();
    if (nDaEsportare(c) && !(await conferma('Ci sono voti non esportati',
      `Hai ${nDaEsportare(c)} registrazioni non ancora esportate: restano sull'iPad anche con il nuovo pacchetto, ma esportale appena puoi.`, 'Importa comunque', false))) return;
    ctx.campoStore.aggiorna((s) => importaPacchetto(s, p));
    avviso(`Pacchetto importato: ${p.classi.length} classi, ${p.alunni.length} alunni`);
    vai('campo', 'home');
  } catch (e) {
    avviso(e.message, 'errore');
  }
}

function testa(titolo, sottotitolo, ...azioni) {
  const prima = azioni.filter((a) => a?.classList?.contains('indietro'));
  const dopo = azioni.filter((a) => !a?.classList?.contains('indietro'));
  return h('header.campo-testa', prima, h('div', h('h1', titolo), sottotitolo ? h('span.sottotitolo', sottotitolo) : null), h('div.spazio'), dopo);
}

const indietro = (href, testo) => h('a.bottone.grande.indietro', { href, 'aria-label': testo }, icona('indietro'), testo);

function home(ctx) {
  const c = ctx.campoStore.get();
  if (!c.pacchetto) {
    return h('div',
      testa('Registro Motoria · Campo', 'Registrazione voti in palestra · funziona offline', h('a.bottone.grande', { href: '#/gestionale/oggi' }, 'Gestionale')),
      h('div.campo-corpo', h('div.scheda',
        h('h2', 'Nessuna classe su questo iPad'),
        h('p', 'Con Mac e iPad sulla stessa Wi-Fi: sul Mac Import/Export → «Sincronizza con l\'iPad», poi qui «Sincronizza con il Mac».'),
        h('div.barra',
          h('a.bottone.primario.grande', { href: '#/campo/sincro' }, 'Sincronizza con il Mac'),
          h('button.grande', { onclick: () => importa(ctx) }, 'Importa pacchetto classe')),
        h('p.tenue', 'In alternativa: sul Mac «Crea pacchetto classe», invialo con AirDrop e importalo qui.'))));
  }
  const oggi = oggiISO();
  const gs = giornoSettimana(oggi);
  const nEsp = nDaEsportare(c);
  return h('div',
    testa('Scegli la classe', `Pacchetto del ${new Date(c.pacchetto.creatoIl).toLocaleString('it-IT')} · ${c.pacchetto.anno}`,
      h('button.grande', { onclick: () => importa(ctx) }, 'Nuovo pacchetto'),
      h('a.bottone.grande', { href: '#/campo/sincro' }, 'Sincronizza'),
      h('a.bottone.grande.primario', { href: '#/campo/esporta' }, icona('esporta'), `Esporta voti${nEsp ? ` (${nEsp})` : ''}`)),
    h('div.campo-corpo',
      bannerPromemoria(c),
      bannerAdesso(c, oggi),
      h('div.tessere', c.pacchetto.classi.map((cl) => {
        const diOggi = cl.calendario ? cl.calendario.some((l) => l.data === oggi) : cl.lezioni.some((l) => l.giorno === gs);
        const rec = recuperiInSospeso(c, cl.codice).length;
        const pre = cl.giornate.find((g) => g.id === giornataPreselezionata(cl.giornate, oggi));
        const pct = pre ? avanzamento(c, cl, pre) : 0;
        return h(`a.tessera${diOggi ? '.evidenza' : ''}`, { href: `#/campo/classe/${cl.codice}` },
          h('div.riga', h('strong', cl.codice), h('span.spazio'),
            pre ? h('span.anello', { style: `--p: ${pct}`, title: `${pre.id}: ${pct}% registrati` }, h('span', `${pct}%`)) : null),
          h('span', `${cl.livello}ª · ${cl.plesso}`),
          diOggi ? h('span.ok-testo', '● lezione oggi') : null,
          rec ? h('span', h('span.badge-rec', rec), ' da recuperare') : null);
      }))));
}

function bannerPromemoria(c) {
  const p = promemoriaExport(c);
  if (!p) return null;
  return h('div.banner-campo.attenzione', { role: 'status' },
    h('span', h('b', `${p.n} registrazioni non ancora esportate`), ` (la prima del ${new Date(p.dal).toLocaleString('it-IT')}). Esportale per averle sul Mac.`),
    h('span.spazio'), h('a.bottone.grande.primario', { href: '#/campo/esporta' }, 'Esporta ora'));
}

function bannerAdesso(c, oggi) {
  const ora = new Date().toTimeString().slice(0, 5);
  const lezioni = lezioniDiOggi(c.pacchetto, oggi, ora);
  const l = lezioni.find((x) => x.adesso) ?? lezioni.find((x) => x.inizio > ora);
  if (!l) return null;
  const gId = giornataDellaLezione(l);
  const rec = recuperiInSospeso(c, l.classe);
  const tipo = l.giornataId ? `Prova ${l.giornataId}` : l.recuperoDi ? `Recupero di ${l.recuperoDi}` : 'Lezione';
  return h('div.banner-campo.adesso',
    h('div', h('div.tenue', l.adesso ? 'Adesso' : 'Prossima lezione'), h('strong', `${l.classe} · ${l.inizio}–${l.fine} · ${tipo}`),
      rec.length ? h('div', 'Da recuperare: ', rec.map((x) => `n. ${x.alunno.numero} (${x.giornataId})`).join(', ')) : null),
    h('span.spazio'),
    gId ? h('a.bottone.grande.primario', { href: `#/campo/registra/${l.classe}/${gId}` }, 'Apri registro') : h('a.bottone.grande', { href: `#/campo/classe/${l.classe}` }, 'Apri classe'));
}

/** Percentuale di alunni registrati (o assenti/esonerati) in una giornata. */
function avanzamento(c, cl, g) {
  const alunni = c.pacchetto.alunni.filter((a) => a.classe === cl.codice && a.stato !== 'Ritirato');
  if (!alunni.length) return 0;
  const fatti = alunni.filter((a) => ['completo', 'assente', 'es'].includes(statoScheda(c, a, g))).length;
  return Math.round((fatti / alunni.length) * 100);
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
  const rec = recuperiInSospeso(c, codice);
  return h('div',
    testa(`${cl.codice} · scegli la giornata`, 'La giornata più vicina a oggi è evidenziata', indietro('#/campo/home', 'Classi'),
      h('a.bottone.grande', { href: `#/campo/giochi/${cl.codice}/supergym/1` }, 'Giochi: cronometro')),
    rec.length ? h('div.campo-corpo', h('div.banner-campo.attenzione',
      h('div', h('b', 'Da recuperare'), h('div', rec.map((x) => h('a.bottone', {
        href: `#/campo/registra/${codice}/${x.giornataId}`, style: { margin: '6px 8px 0 0' }
      }, `n. ${x.alunno.numero} ${x.alunno.cognomeNome} · ${x.giornataId}`)))))) : null,
    h('div.campo-corpo', h('div.tessere', cl.giornate.map((g) => h(`a.tessera${g.id === pre ? '.evidenza' : ''}`, { href: `#/campo/registra/${cl.codice}/${g.id}` },
      h('strong', g.id), h('span', g.descrizione), h('span.tenue', g.data ? formatta(g.data, true) : 'data da fissare'),
      h('span', g.sottoObiettivi.join(' · ')))))));
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
  const leggiStati = () => alunni.map((a) => [a, statoScheda(ctx.campoStore.get(), a, g)]);
  const stati = leggiStati();
  const fatti = stati.filter(([, s]) => schedaFatta(s)).length;
  const chiave = `${cl.codice}/${g.id}`;
  if (ctx.alunnoAttivo?.chiave !== chiave) {
    ctx.alunnoAttivo = { chiave, numero: alunni[0]?.numero ?? null, libero: false };
    ctx.elencoAperto = false;
  }
  seguiScorrimento(ctx);
  const attivo = { chiave, leggiStati };
  return h('div',
    testa(`${cl.codice} · ${g.id}`, `${g.descrizione}${g.data ? ` · ${formatta(g.data, true)}` : ''}`,
      indietro(`#/campo/classe/${cl.codice}`, 'Giornate'),
      h('div.progresso', h('div.traccia', h('span', { style: { width: `${alunni.length ? Math.round((fatti / alunni.length) * 100) : 0}%` } })),
        h('span.contatore', { 'aria-live': 'polite' }, `Registrati ${fatti}/${alunni.length} · mancano ${alunni.length - fatti}`)),
      h('button.grande.apri-elenco', {
        'aria-expanded': String(Boolean(ctx.elencoAperto)),
        onclick: () => { ctx.elencoAperto = !ctx.elencoAperto; ctx.ridisegna(); }
      }, 'Elenco'),
      h('a.bottone.grande.primario', { href: '#/campo/esporta' }, 'Esporta')),
    h(`div.registra-layout${ctx.elencoAperto ? '.elenco-aperto' : ''}`,
      elencoClasse(ctx, stati),
      h('div.campo-corpo', stati.map(([a, st]) => schedaAlunno(ctx, cl, g, sos, a, st, attivo)))),
    barraAlunni(ctx, stati));
}

/**
 * Elenco della classe a lato: per trovare un alunno preciso durante il gioco (squadre non in ordine).
 * Scegliere da qui attiva il «movimento libero»: finito un alunno non si passa da soli al successivo.
 */
function elencoClasse(ctx, stati) {
  const elenco = h('aside.elenco-classe', { 'aria-label': 'Elenco della classe', 'data-scroll': 'elenco-classe' },
    h('p.modo', { 'aria-live': 'polite' }, ctx.alunnoAttivo.libero ? MODO.libero : MODO.ordine),
    h('ol', stati.map(([a, st]) => h('li', h(`button.${classeStato(st)}`, {
      dataset: { numero: a.numero }, 'aria-label': `${a.numero} ${a.cognomeNome}, ${ETICHETTE_STATO[st]}`,
      onclick: () => {
        ctx.alunnoAttivo = { ...ctx.alunnoAttivo, numero: a.numero, libero: true };
        scriviModo(true);
        evidenziaOvunque(a.numero);
        vaiAllaScheda(a.numero);
        if (ctx.elencoAperto) { ctx.elencoAperto = false; elenco.parentElement?.classList.remove('elenco-aperto'); }
      }
    }, h('span.numero', a.numero), h('span.nome', a.cognomeNome), h('span.pallino'))))));
  evidenzia(elenco, ctx.alunnoAttivo.numero, { porta: false }); // elenco fermo: niente scorrimento automatico
  return elenco;
}

function scriviModo(libero) {
  const p = document.querySelector('.elenco-classe .modo');
  if (p) p.textContent = libero ? MODO.libero : MODO.ordine;
}

function barraAlunni(ctx, stati) {
  const nav = h('nav.nav-alunni.segui', { 'aria-label': 'Vai all\'alunno', 'data-scroll': 'nav-alunni' }, stati.map(([a, st]) => h(`a.${classeStato(st)}`, {
    href: `#alunno-${a.numero}`, title: a.cognomeNome, dataset: { numero: a.numero, nome: a.cognomeNome },
    onclick: (e) => {
      e.preventDefault();
      ctx.alunnoAttivo = { ...ctx.alunnoAttivo, numero: a.numero, libero: false };
      scriviModo(false);
      evidenziaOvunque(a.numero);
      vaiAllaScheda(a.numero);
    }
  }, a.numero)));
  evidenzia(nav, ctx.alunnoAttivo.numero);
  return nav;
}

function schedaAlunno(ctx, cl, g, sos, a, st, attivo) {
  const c = ctx.campoStore.get();
  const base = { classe: cl.codice, alunnoId: a.id, giornataId: g.id };
  const regs = sos.map((so) => trovaCampo(c, a.id, g.id, so.codice));
  const statoGiorno = regs.find((r) => r?.stato)?.stato ?? null;
  if (a.stato === 'ES') {
    return h('section.scheda-alunno', { id: `alunno-${a.numero}` }, h('h2', h('span.numero', a.numero), a.cognomeNome, h('small.tenue', ' · esonerato')));
  }
  const conAnnulla = (fn, msg) => {
    const prima = ctx.campoStore.get();
    // tocco su una scheda: diventa l'alunno attivo; resta «libero» se ci si era arrivati dall'elenco
    const libero = Boolean(ctx.alunnoAttivo?.libero);
    ctx.alunnoAttivo = { chiave: attivo.chiave, numero: a.numero, libero };
    pausaTraccia();
    ctx.campoStore.aggiorna(fn);
    if (appenaCompletata(st, statoScheda(ctx.campoStore.get(), a, g))) avanzaDopo(ctx, attivo.chiave, a.numero, attivo.leggiStati);
    avviso(msg, 'ok', { testo: 'Annulla', fn: () => ctx.campoStore.sostituisci(prima) });
  };
  const setStato = (v) => conAnnulla((s) => campoStato(s, { ...base, sottoObiettivi: g.sottoObiettivi, valore: statoGiorno === v ? null : v }),
    `n. ${a.numero}: ${statoGiorno === v ? 'stato tolto' : v}`);
  const recuperata = regs.find((r) => r?.recuperataIl)?.recuperataIl ?? null;
  const setRecupero = (data) => conAnnulla((s) => campoRecupero(s, { ...base, sottoObiettivi: g.sottoObiettivi, data }),
    `n. ${a.numero}: ${data ? 'recupero oggi' : 'recupero annullato'}`);
  return h(`section.scheda-alunno.${classeStato(st)}`, { id: `alunno-${a.numero}` },
    h('h2', h('span.numero', a.numero), h('span', a.cognomeNome, a.op ? h('small', ' (OP)') : null),
      h('div.stati', ['AS', 'NV', 'ES'].map((v) => h(`button${statoGiorno === v ? '.attivo' : ''}`, {
        onclick: () => setStato(v), 'aria-pressed': String(statoGiorno === v), title: c.pacchetto.codiciStato?.[v] ?? v
      }, v)))),
    statoGiorno === 'AS' ? h('div.recupero-campo',
      recuperata
        ? [h('span', `Prova recuperata il ${formatta(recuperata, true)}`), h('button', { onclick: () => setRecupero(null) }, 'Annulla recupero')]
        : [h('span.tenue', 'Assente: il voto si registra il giorno in cui recupera la prova.'),
          h('button.primario.grande', { onclick: () => setRecupero(oggiISO()) }, 'Recupera oggi')]) : null,
    (statoGiorno && statoGiorno !== 'AS') || (statoGiorno === 'AS' && !recuperata) ? null : sos.map((so, k) => {
      const r = regs[k];
      const voto = votoRegistrazione(r);
      const parziale = r?.livelli?.some((l) => l != null);
      return h(`div.so-campo.n-${so.nucleo}`,
        h('div.titolo-so', h('span.codice', so.codice), h('span', so.etichetta),
          h('span.voto-badge', { 'aria-label': `Voto ${so.codice}`, 'data-l': voto ?? null },
            voto == null ? h('b', '—') : [h('b', voto), ' ', giudizioVoto(voto, c.pacchetto.scala)])),
        so.indicatori.map((ind, i) => {
          const val = r?.livelli?.[i] ?? null;
          const chiaveDesc = `${a.id}|${so.codice}|${i}`;
          const mostra = ctx.descrittoreCampo?.chiave === chiaveDesc;
          return h('div', h(`div.indicatore-riga${parziale && val == null ? '.mancante' : ''}`,
            h('span.nome-ind', h('i', `I${i + 1}`), ind.nome),
            h('div.livelli', LIVELLI.map((l) => bottoneLivello(ctx, l, val === l, () => {
              conAnnulla((s) => campoLivello(s, { ...base, sottoObiettivo: so.codice, indice: i, valore: val === l ? null : l }),
                `n. ${a.numero} ${so.codice} I${i + 1}: ${val === l ? 'tolto' : l}`);
            }, () => {
              ctx.descrittoreCampo = mostra && ctx.descrittoreCampo.livello === l ? null : { chiave: chiaveDesc, livello: l };
              ctx.ridisegna();
            }, `${a.numero} ${so.codice} I${i + 1} livello ${l}`)))),
          mostra ? h('div.descrittore', { role: 'status' }, h('b', `${ctx.descrittoreCampo.livello} ${GIUDIZI[LIVELLI.indexOf(ctx.descrittoreCampo.livello)]}: `),
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
  const nuove = nDaEsportare(c);
  const tutte = nDaEsportare(c, true);
  const fai = async (tutteLeModifiche) => {
    const { file, campo } = esportaVoti(c, { tutte: tutteLeModifiche });
    const n = file.registrazioni.length + file.tempi.length;
    if (!n) return avviso('Niente da esportare', 'errore');
    const esito = await condividiOScarica(`voti_${c.deviceId}_${marcaTemporale()}.rmvoti.json`, JSON.stringify(file));
    if (esito === 'annullato') return avviso('Esportazione annullata', 'errore');
    ctx.campoStore.aggiorna(() => campo);
    avviso(`File voti esportato (${file.registrazioni.length} voti, ${file.tempi.length} tempi dei Giochi)`);
  };
  return h('div',
    testa('Esporta file voti', 'Condividi → Salva su File (cartella «voti-ipad») oppure AirDrop', indietro('#/campo/home', 'Classi')),
    h('div.campo-corpo', h('div.scheda',
      h('p', h('strong', `${nuove} registrazioni`), ' (voti e tempi dei Giochi) nuove o modificate dall\'ultimo export',
        c.ultimoExport ? ` (${new Date(c.ultimoExport).toLocaleString('it-IT')})` : '', '.'),
      h('button.primario.grande', { onclick: () => fai(false), disabled: !nuove }, 'Esporta e condividi (AirDrop)'),
      h('p', h('b', 'Per farli arrivare da soli sul Mac: '), 'nel menu Condividi scegli «Salva su File» e la cartella «voti-ipad» dentro la cartella archivio (iCloud Drive o Drive). L\'iPad ricorda l\'ultima cartella usata; il gestionale sul Mac li importa da solo.'),
      h('p.tenue', { style: { marginTop: '1rem' } }, `Hai perso un file? Puoi riesportare tutte le ${tutte} registrazioni fatte su questo iPad: sul Mac i doppioni vengono ignorati.`),
      h('button.grande', { onclick: () => fai(true), disabled: !tutte }, 'Riesporta tutto')),
    h('div.scheda', h('h2', 'Sicurezza dei dati sull\'iPad'),
      ctx.memoriaProtetta
        ? h('p.ok-testo', '✓ Memoria protetta: l\'iPad non cancella da solo i dati di Registro Motoria.')
        : h('p', h('b', 'Memoria non protetta. '), 'Safari potrebbe cancellare i dati se l\'app non si usa per qualche settimana. Usa l\'app aggiunta alla schermata Home (Condividi → Aggiungi a Home) ed esporta i voti dopo ogni lezione: una volta sul Mac sono al sicuro.')),
    h('p.tenue', 'Nessun dato lascia l\'iPad senza questa tua azione.')));
}
