// Mac: «Sincronizza con l'iPad». Il Mac mostra il suo QR, l'iPad lo inquadra e mostra il proprio,
// che il Mac legge con la fotocamera. Poi i voti arrivano e il pacchetto aggiornato riparte.
import { h, modale, avviso } from './dom.js';
import { disegnaQR, lettoreQR } from './qr.js';
import { creaOfferta, completa, aperto, chiudi } from '../sincro/connessione.js';
import { rispondiAlCiao, MSG } from '../sincro/protocollo.js';
import { rivediFileVoti } from './viste/scambio.js';

export function sincronizzaConIpad(ctx) {
  const corpo = h('div.sincro', h('p', 'Preparo il collegamento… Se Chrome chiede di usare la fotocamera, consenti: serve a leggere il codice dell\'iPad.'));
  let pc = null;
  let lettore = null;
  let chiusa = false;
  modale('Sincronizza con l\'iPad', corpo, { largo: true });
  const sfondo = corpo.closest('.modale-sfondo');
  const pulisci = () => { chiusa = true; lettore?.spegni(); chiudi(pc); };
  new MutationObserver((_, obs) => { if (!sfondo.isConnected) { obs.disconnect(); pulisci(); } }).observe(document.body, { childList: true });

  const mostra = (...contenuto) => { if (!chiusa) corpo.replaceChildren(...contenuto); };
  const errore = (e) => mostra(
    h('p.violazione', e.message),
    h('p.tenue', 'Puoi sempre usare i file voti: sull\'iPad «Esporta voti» → cartella «voti-ipad».'),
    h('button.primario', { onclick: () => { pulisci(); corpo.closest('.modale-sfondo')?.remove(); sincronizzaConIpad(ctx); } }, 'Riprova'));

  const scambia = async (codice) => {
    if (!pc) return false;
    try {
      await completa(pc, codice);
    } catch (e) {
      avviso(e.message, 'errore');
      return false;
    }
    mostra(h('p', h('b', 'Collegamento in corso…'), ' tieni l\'iPad acceso con la schermata aperta.'));
    try {
      const m = await aperto(pc, canale);
      mostra(h('p', h('b', 'Collegati.'), ' Ricevo i voti dall\'iPad…'));
      const ciao = await m.ricevi();
      await ctx.persistenza.aggiungiBackup(ctx.store.get(), 'prima della sincronizzazione con l\'iPad');
      const r = rispondiAlCiao(ctx.store.get(), ciao);
      ctx.store.aggiorna(() => r.stato);
      mostra(h('p', h('b', 'Voti ricevuti.'), ' Invio all\'iPad le classi aggiornate…'));
      await m.invia(r.messaggio);
      const fine = await m.ricevi();
      if (fine.tipo === MSG.ERRORE) throw new Error(`L'iPad segnala: ${fine.messaggio}`);
      riepilogo(ctx, mostra, r);
    } catch (e) {
      errore(e);
    } finally {
      lettore.spegni();
    }
    return true;
  };

  let canale = null;
  lettore = lettoreQR({ fotocamera: 'user', onCodice: scambia });
  // La fotocamera parte prima dell'offerta: con il suo permesso il browser usa gli indirizzi locali reali.
  lettore.pronto
    .then(() => creaOfferta())
    .then((o) => {
      if (chiusa) return chiudi(o.pc);
      ({ pc, canale } = o);
      mostra(h('div.sincro-passi',
        h('div', h('h3', '1 · Sull\'iPad'), h('p', 'Campo → «Sincronizza con il Mac», poi inquadra questo codice.'), disegnaQR(o.codice, 'Codice del Mac')),
        h('div', h('h3', '2 · Qui sul Mac'), h('p', 'Mostra alla fotocamera del Mac il codice che compare sull\'iPad.'), lettore.el)),
      h('p.tenue', 'Mac e iPad devono essere sulla stessa rete Wi-Fi. I dati passano direttamente tra i due, cifrati, senza Internet.'));
    })
    .catch(errore);
}

function riepilogo(ctx, mostra, r) {
  const { nuove, modifiche, sconosciute, classi } = r.esito;
  mostra(
    h('p.ok-testo', h('b', '✓ Sincronizzazione completata.')),
    h('ul',
      h('li', `Dall'iPad: ${nuove} voti e tempi nuovi`),
      modifiche ? h('li', h('b', `${modifiche} voti cambiati da confermare`)) : null,
      sconosciute ? h('li.violazione', `${sconosciute} di alunni non presenti nel registro (non importati)`) : null,
      h('li', `All'iPad: ${classi} ${classi === 1 ? 'classe aggiornata' : 'classi aggiornate'}`)),
    modifiche ? h('button.primario', { onclick: () => rivediFileVoti(ctx, 'iPad (sincronizzazione)', JSON.stringify(r.voti)) }, 'Rivedi le modifiche') : null);
  avviso(`Sincronizzato con l'iPad: ${nuove} nuovi`);
}
