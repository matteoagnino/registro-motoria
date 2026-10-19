// Ricezione automatica dei voti dall'iPad: controlla la cartella «voti-ipad» dentro la cartella archivio.
import { h, avviso } from './dom.js';
import { statoCartella, riattivaCartella, fileVotiInArrivo, archiviaFileVoti } from '../dati/archivio.js';
import { leggiFileVoti, importaAutomatico } from '../dati/scambio.js';
import { rivediFileVoti } from './viste/scambio.js';

const INTERVALLO_MS = 60 * 1000;

function banner(id, ...contenuto) {
  document.getElementById(id)?.remove();
  if (!contenuto.length) return;
  document.body.append(h(`div.banner-aggiorna#${id}`, { role: 'status' }, ...contenuto));
}

async function controlla(ctx) {
  if (ctx.ricezioneInCorso || document.visibilityState !== 'visible' || !location.hash.startsWith('#/gestionale')) return;
  ctx.ricezioneInCorso = true;
  try {
    const stato = await statoCartella(ctx.persistenza);
    banner('banner-cartella', ...(stato === 'permesso' ? [
      h('span', h('b', 'Voti dall\'iPad in pausa.'), ' Chrome chiede di riattivare la cartella archivio.'),
      h('button.primario', { onclick: async () => { if (await riattivaCartella(ctx.persistenza)) { banner('banner-cartella'); controlla(ctx); } } }, 'Riattiva cartella')
    ] : []));
    if (stato !== 'ok') return;
    const daConfermare = [];
    for (const f of await fileVotiInArrivo(ctx.persistenza)) {
      let file;
      try {
        file = leggiFileVoti(f.testo);
      } catch (e) {
        avviso(`«${f.nome}»: ${e.message}`, 'errore');
        continue;
      }
      const esito = importaAutomatico(ctx.store.get(), file);
      if (esito.nuove) {
        await ctx.persistenza.aggiungiBackup(ctx.store.get(), `prima di ricevere ${f.nome}`);
        ctx.store.aggiorna(() => importaAutomatico(ctx.store.get(), file).stato);
        avviso(`Arrivati dall'iPad ${esito.nuove} voti nuovi`);
      }
      if (esito.modifiche) daConfermare.push(f);
      else await archiviaFileVoti(ctx.persistenza, f.nome, f.testo);
    }
    banner('banner-arrivi', ...(daConfermare.length ? [
      h('span', h('b', 'Dall\'iPad: voti modificati da confermare'), ` (${daConfermare.length} file).`),
      h('button.primario', {
        onclick: () => {
          const f = daConfermare[0];
          rivediFileVoti(ctx, f.nome, f.testo, async () => { await archiviaFileVoti(ctx.persistenza, f.nome, f.testo); banner('banner-arrivi'); controlla(ctx); });
        }
      }, 'Rivedi')
    ] : []));
  } catch (e) {
    console.warn('Ricezione voti dall\'iPad non riuscita', e);
  } finally {
    ctx.ricezioneInCorso = false;
  }
}

/** Avvia i controlli: subito, quando la finestra torna visibile e ogni minuto. Solo dove si può scegliere una cartella (Chrome su Mac). */
export function avviaRicezioneVoti(ctx) {
  if (!('showDirectoryPicker' in window)) return;
  controlla(ctx);
  document.addEventListener('visibilitychange', () => controlla(ctx));
  window.addEventListener('hashchange', () => controlla(ctx));
  setInterval(() => controlla(ctx), INTERVALLO_MS);
}
