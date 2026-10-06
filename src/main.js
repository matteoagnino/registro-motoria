// Avvio: carica lo stato da IndexedDB (o dai seed al primo avvio) e monta l'interfaccia.
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
    if (el) el.textContent = ctx.descriviSalvataggio();
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
  if (erroreAvvio) {
    document.body.prepend(h('div.banner-errore', `Impossibile leggere il registro salvato: ${erroreAvvio.message}. Vai in Import/Export per ripristinare un backup.`));
  }
}

avvia();
