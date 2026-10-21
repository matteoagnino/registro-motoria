// iPad: «Sincronizza con il Mac». Inquadra il QR del Mac, mostra il proprio, poi invia i voti
// e riceve le classi aggiornate. La schermata resta la stessa anche se l'app si ridisegna.
import { h, avviso } from '../dom.js';
import { disegnaQR, lettoreQR } from '../qr.js';
import { rispondiAllOfferta, aperto, chiudi } from '../../sincro/connessione.js';
import { preparaCiao, applicaPacchetto, MSG } from '../../sincro/protocollo.js';

const CHIUSURA_RITARDATA_MS = 1500;

export function vistaSincro(ctx, testa, indietro) {
  if (!ctx.sincroCampo) ctx.sincroCampo = avvia(ctx, testa, indietro);
  return ctx.sincroCampo.el;
}

/** Da chiamare quando si lascia la schermata: spegne fotocamera e collegamento. */
export function chiudiSincro(ctx) {
  ctx.sincroCampo?.chiudi();
  ctx.sincroCampo = null;
}

function avvia(ctx, testa, indietro) {
  const corpo = h('div.campo-corpo');
  const el = h('div', testa('Sincronizza con il Mac', 'Mac e iPad sulla stessa rete Wi-Fi', indietro('#/campo/home', 'Classi')), corpo);
  let pc = null;
  const mostra = (...contenuto) => corpo.replaceChildren(h('div.scheda.sincro', ...contenuto));

  const scambia = async (codice) => {
    let collegamento;
    try {
      collegamento = await rispondiAllOfferta(codice);
    } catch (e) {
      avviso(e.message, 'errore');
      return false;
    }
    pc = collegamento.pc;
    mostra(h('h2', 'Ora gira l\'iPad verso la fotocamera del Mac'),
      disegnaQR(collegamento.codice, 'Codice dell\'iPad'),
      h('p.tenue', 'Il Mac legge questo codice e si collega da solo.'));
    try {
      const m = await aperto(pc, collegamento.canale);
      mostra(h('h2', 'Collegati'), h('p', 'Invio i voti al Mac…'));
      const { messaggio, esportato } = preparaCiao(ctx.campoStore.get());
      await m.invia(messaggio);
      const risposta = await m.ricevi();
      let fine;
      try {
        fine = applicaPacchetto(esportato, risposta);
      } catch (e) {
        await m.invia({ tipo: MSG.ERRORE, messaggio: e.message });
        throw e;
      }
      ctx.campoStore.aggiorna(() => fine.campo);
      await m.invia({ tipo: MSG.FATTO });
      const inviati = messaggio.voti.registrazioni.length + messaggio.voti.tempi.length;
      mostra(h('h2.ok-testo', '✓ Sincronizzazione completata'),
        h('ul',
          h('li', `Inviati al Mac: ${inviati} voti e tempi (${fine.esito?.nuove ?? 0} nuovi)`),
          fine.esito?.modifiche ? h('li', `${fine.esito.modifiche} voti cambiati: confermali sul Mac`) : null,
          h('li', `Ricevute dal Mac: ${fine.classi} ${fine.classi === 1 ? 'classe aggiornata' : 'classi aggiornate'}`)),
        h('a.bottone.grande.primario', { href: '#/campo/home' }, 'Torna alle classi'));
    } catch (e) {
      mostra(h('h2', 'Sincronizzazione non riuscita'), h('p.violazione', e.message),
        h('p.tenue', 'I voti restano sull\'iPad. Puoi riprovare o usare «Esporta voti».'),
        h('button.primario.grande', { onclick: () => { chiudiSincro(ctx); ctx.ridisegna(); } }, 'Riprova'));
    } finally {
      lettore.spegni();
      setTimeout(() => chiudi(pc), CHIUSURA_RITARDATA_MS);
    }
    return true;
  };

  const lettore = lettoreQR({ fotocamera: 'environment', onCodice: scambia });
  mostra(h('h2', 'Inquadra il codice sul Mac'),
    h('p', 'Sul Mac: Import/Export → «Sincronizza con l\'iPad».'),
    lettore.el);
  return { el, chiudi: () => { lettore.spegni(); chiudi(pc); } };
}
