// Avvio: carica lo stato da IndexedDB (o dai seed al primo avvio) e monta l'interfaccia.
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import './ui/stile.css';
import { apriPersistenza } from './dati/persistenza.js';
import { creaStore } from './dati/store.js';
import { creaStatoIniziale } from './dati/seed.js';
import { migra, validaStato } from './dati/schema.js';
import { salvaInCartella } from './dati/archivio.js';
import { nuovoId } from './dati/id.js';
import { campoVuoto } from './dati/campo.js';
import { avviaApp } from './ui/app.js';
import { viste } from './ui/viste/index.js';
import { vistaCampo } from './ui/campo/index.js';
import { home } from './ui/viste/home.js';
import { h } from './ui/dom.js';

const RITARDO_ARCHIVIO_MS = 4000;

async function caricaStato(persistenza) {
  const salvato = await persistenza.leggi('stato');
  if (!salvato) {
    const deviceId = (await persistenza.leggi('deviceId')) || `mac-${nuovoId().slice(0, 8)}`;
    await persistenza.scrivi('deviceId', deviceId);
    return creaStatoIniziale(deviceId);
  }
  const s = migra(salvato);
  const errori = validaStato(s);
  if (errori.length) throw new Error(errori.join(' '));
  return s;
}

/** Un backup automatico al giorno nel browser (oltre a quelli prima di ogni import). */
async function backupGiornaliero(persistenza, stato) {
  const oggi = new Date().toISOString().slice(0, 10);
  if ((await persistenza.leggi('ultimoBackupGiornaliero')) === oggi) return;
  await persistenza.aggiungiBackup(stato, 'backup automatico giornaliero');
  await persistenza.scrivi('ultimoBackupGiornaliero', oggi);
}

const ORA_MS = 60 * 60 * 1000;

/** Avviso di nuova versione: l'aggiornamento parte solo quando Matteo tocca «Aggiorna ora». */
async function controllaAggiornamenti() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  if (!reg) return;
  const mostra = (sw) => {
    if (document.querySelector('.banner-aggiorna')) return;
    const banner = h('div.banner-aggiorna', { role: 'status' },
      h('span', h('b', 'Nuova versione disponibile.'), ' I dati sono già salvati.'),
      h('button.primario', {
        onclick: () => {
          navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
          sw.postMessage({ type: 'SKIP_WAITING' });
        }
      }, 'Aggiorna ora'),
      h('button', { onclick: () => banner.remove(), 'aria-label': 'Più tardi' }, 'Più tardi'));
    document.body.append(banner);
  };
  if (reg.waiting && navigator.serviceWorker.controller) mostra(reg.waiting);
  reg.addEventListener('updatefound', () => {
    const nuovo = reg.installing;
    nuovo?.addEventListener('statechange', () => {
      if (nuovo.state === 'installed' && navigator.serviceWorker.controller) mostra(nuovo);
    });
  });
  setInterval(() => reg.update().catch(() => {}), ORA_MS);
}

async function avvia() {
  const radice = document.getElementById('app');
  const persistenza = apriPersistenza();
  let stato;
  let erroreAvvio = null;
  try {
    stato = await caricaStato(persistenza);
  } catch (e) {
    erroreAvvio = e;
    stato = creaStatoIniziale();
  }
  const ctx = { persistenza, statoSalvataggio: 'ok', ultimoArchivio: null };
  let timerArchivio;
  const salvaArchivio = (s) => {
    clearTimeout(timerArchivio);
    timerArchivio = setTimeout(async () => {
      try {
        const dir = await persistenza.leggi('cartella');
        if (!dir || (await dir.queryPermission?.({ mode: 'readwrite' })) !== 'granted') return;
        await salvaInCartella(persistenza, s);
        ctx.ultimoArchivio = new Date();
      } catch (e) {
        console.warn('Archivio su cartella non salvato', e);
      }
    }, RITARDO_ARCHIVIO_MS);
  };
  ctx.store = creaStore(stato, {
    // Se il salvato era illeggibile non lo sovrascriviamo finché Matteo non ripristina qualcosa.
    salva: async (s) => {
      if (erroreAvvio) return;
      await persistenza.scrivi('stato', s);
      if (ctx.store.get() === s) ctx.statoSalvataggio = 'ok';
      aggiornaIndicatore();
      salvaArchivio(s);
    },
    ritardo: 0
  });
  ctx.sbloccaSalvataggio = () => { erroreAvvio = null; };
  const aggiornaIndicatore = () => {
    const el = document.querySelector('.salvataggio');
    if (!el) return;
    el.dataset.stato = ctx.statoSalvataggio;
    el.title = ctx.descriviSalvataggio();
    const testo = el.querySelector('.salvataggio-testo');
    if (testo) testo.textContent = ctx.descriviSalvataggio();
  };
  ctx.store.ascolta(() => { if (ctx.statoSalvataggio !== 'errore') ctx.statoSalvataggio = 'in corso'; });
  ctx.descriviSalvataggio = () => {
    if (erroreAvvio) return '⚠ registro salvato illeggibile: ripristina da Import/Export';
    if (ctx.statoSalvataggio === 'errore') return '⚠ salvataggio non riuscito';
    if (ctx.statoSalvataggio === 'in corso') return '… salvataggio in corso';
    return `✓ salvato sul dispositivo${ctx.ultimoArchivio ? ` · archivio ${ctx.ultimoArchivio.toLocaleTimeString('it-IT')}` : ''}`;
  };
  if (!erroreAvvio) {
    await persistenza.scrivi('stato', stato);
    backupGiornaliero(persistenza, stato).catch((e) => console.warn(e));
  }
  const deviceIdCampo = (await persistenza.leggi('deviceIdCampo')) || `ipad-${nuovoId().slice(0, 8)}`;
  await persistenza.scrivi('deviceIdCampo', deviceIdCampo);
  ctx.campoStore = creaStore((await persistenza.leggi('campo')) ?? campoVuoto(deviceIdCampo), {
    salva: (c) => persistenza.scrivi('campo', c),
    ritardo: 0
  });
  window.addEventListener('pagehide', () => { ctx.store.salvaOra(); ctx.campoStore.salvaOra(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { ctx.store.salvaOra(); ctx.campoStore.salvaOra(); }
  });
  avviaApp(radice, ctx, { viste, vistaCampo, home });
  ctx.campoStore.ascolta(() => ctx.ridisegna());
  controllaAggiornamenti().catch((e) => console.warn('Controllo aggiornamenti non riuscito', e));
  if (erroreAvvio) {
    document.body.prepend(h('div.banner-errore', `Impossibile leggere il registro salvato: ${erroreAvvio.message}. Vai in Import/Export per ripristinare un backup.`));
  }
}

avvia();
