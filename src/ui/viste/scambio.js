// Import/Export: archivio, backup, pacchetto classe per iPad, import file voti, export Excel.
import { h, select, modale, conferma, avviso } from '../dom.js';
import {
  supportaCartella, scegliCartella, salvaInCartella, leggiDaCartella, serializzaArchivio, deserializzaArchivio,
  scaricaTesto, scaricaBlob, scegliFile, marcaTemporale, NOME_ARCHIVIO
} from '../../dati/archivio.js';
import { creaPacchetto, leggiFileVoti, analizzaImport, applicaImport } from '../../dati/scambio.js';
import { excelClasse, excelRiepiloghi } from '../../export/excel.js';
import { alunniDi } from '../../dati/azioni.js';
import { intestazione } from './comuni.js';

export function vistaScambio(ctx) {
  const stato = ctx.store.get();
  return h('div',
    intestazione('Import / Export'),
    h('div.griglia-2',
      sezioneArchivio(ctx),
      sezioneIpad(ctx, stato),
      sezioneExcel(ctx, stato),
      sezioneBackup(ctx)));
}

function sezioneArchivio(ctx) {
  const box = h('div.scheda', h('h2', 'Archivio del registro'),
    h('p', 'Il registro si salva da solo nel browser. Per sicurezza tienine una copia in una cartella tua (consigliata: cartella del Drive d\'istituto sincronizzata sul Mac).'));
  if (supportaCartella()) {
    const info = h('p.tenue', 'Cartella: verifica…');
    ctx.persistenza.leggi('cartella').then((d) => { info.textContent = d ? `Cartella scelta: «${d.name}» (salvataggio automatico + copie datate in backup/)` : 'Nessuna cartella scelta.'; });
    box.append(info, h('div.barra',
      h('button.primario', {
        onclick: async () => {
          try {
            await scegliCartella(ctx.persistenza);
            const nome = await salvaInCartella(ctx.persistenza, ctx.store.get());
            ctx.ultimoArchivio = new Date();
            avviso(`Archivio salvato in «${nome}»`);
            ctx.ridisegna();
          } catch (e) {
            if (e?.name !== 'AbortError') avviso(e.message, 'errore');
          }
        }
      }, 'Scegli cartella archivio…'),
      h('button', {
        onclick: async () => {
          try {
            const nome = await salvaInCartella(ctx.persistenza, ctx.store.get());
            ctx.ultimoArchivio = new Date();
            avviso(`Archivio salvato in «${nome}»`);
          } catch (e) { avviso(e.message, 'errore'); }
        }
      }, 'Salva ora nella cartella'),
      h('button', {
        onclick: async () => {
          const testo = await leggiDaCartella(ctx.persistenza);
          if (!testo) return avviso('Nessun archivio trovato nella cartella.', 'errore');
          await ripristina(ctx, testo, 'archivio della cartella');
        }
      }, 'Apri archivio dalla cartella')));
  } else {
    box.append(h('p.tenue', 'Questo browser non permette di scegliere una cartella: usa Scarica/Carica.'));
  }
  box.append(h('div.barra',
    h('button', { onclick: () => scaricaTesto(`registro-motoria-archivio_${marcaTemporale()}.json`, serializzaArchivio(ctx.store.get())) }, 'Scarica archivio (.json)'),
    h('button', {
      onclick: async () => {
        const f = await scegliFile();
        if (f) await ripristina(ctx, f.testo, f.nome);
      }
    }, 'Carica archivio da file…')));
  return box;
}

async function ripristina(ctx, testo, origine) {
  let nuovo;
  try {
    nuovo = deserializzaArchivio(testo);
  } catch (e) {
    return avviso(e.message, 'errore');
  }
  const ok = await conferma('Sostituire il registro?',
    `Il registro attuale verrà sostituito con «${origine}» (${nuovo.alunni.length} alunni, ${nuovo.registrazioni.length} registrazioni). Prima viene creato un backup automatico.`,
    'Sostituisci');
  if (!ok) return;
  await ctx.persistenza.aggiungiBackup(ctx.store.get(), `prima di caricare ${origine}`);
  ctx.sbloccaSalvataggio?.();
  ctx.store.sostituisci(nuovo);
  avviso('Registro caricato (backup del precedente creato)');
}

function sezioneIpad(ctx, stato) {
  const scelte = new Set(stato.classi.map((c) => c.codice));
  return h('div.scheda', h('h2', 'iPad: pacchetto classe e file voti'),
    h('h3', '1 · Pacchetto classe (Mac → iPad)'),
    h('p.tenue', 'Contiene nomi, giornate, rubriche e voti già registrati delle classi scelte. Mandalo all\'iPad con AirDrop e importalo in modalità Campo.'),
    h('div', stato.classi.map((c) => h('label', { style: { marginRight: '.8rem', display: 'inline-block' } },
      h('input', { type: 'checkbox', checked: true, onchange: (e) => (e.target.checked ? scelte.add(c.codice) : scelte.delete(c.codice)) }), ` ${c.codice}`))),
    h('button.primario', {
      onclick: () => {
        if (!scelte.size) return avviso('Scegli almeno una classe', 'errore');
        const pacchetto = creaPacchetto(ctx.store.get(), [...scelte]);
        scaricaTesto(`pacchetto_${marcaTemporale()}.rmpack.json`, JSON.stringify(pacchetto));
        avviso('Pacchetto creato: invialo all\'iPad con AirDrop');
      }
    }, 'Crea pacchetto classe'),
    h('h3', { style: { marginTop: '1rem' } }, '2 · File voti (iPad → Mac)'),
    h('p.tenue', 'Reimportare lo stesso file non crea doppioni. Le registrazioni già presenti con valori diversi ti vengono mostrate da accettare o rifiutare. Prima di importare viene fatto un backup.'),
    h('button.primario', { onclick: () => importaVoti(ctx) }, 'Importa file voti…'));
}

async function importaVoti(ctx) {
  const f = await scegliFile('.json,.rmvoti.json,application/json');
  if (!f) return;
  let file;
  try {
    file = leggiFileVoti(f.testo);
  } catch (e) {
    return avviso(e.message, 'errore');
  }
  const stato = ctx.store.get();
  const an = analizzaImport(stato, file);
  const nomeAlunno = (id) => {
    const a = stato.alunni.find((x) => x.id === id);
    return a ? `${a.classe} n. ${a.numero} ${a.cognomeNome}` : id;
  };
  const accettate = new Set(an.modifiche.map((m) => m.dopo.id));
  const desc = (r) => `${r.stato ? `${r.stato} ` : ''}[${r.livelli.map((l) => l ?? '–').join(' ')}]${r.recuperataIl ? ` rec. ${r.recuperataIl}` : ''}`;
  modale(`Importa «${f.nome}»`, h('div',
    h('ul',
      h('li', `${an.nuove.length} registrazioni nuove`),
      h('li', `${an.uguali.length} già presenti e identiche (ignorate)`),
      h('li', `${an.modifiche.length} modifiche da confermare`),
      an.sconosciute.length ? h('li.violazione', `${an.sconosciute.length} di alunni non presenti nel registro (non importate)`) : null),
    an.modifiche.length ? h('table',
      h('thead', h('tr', ['Accetta', 'Alunno', 'Giornata', 'Sotto-ob.', 'Prima', 'Dopo (iPad)'].map((t) => h('th', t)))),
      h('tbody', an.modifiche.map((m) => h('tr',
        h('td', h('input', { type: 'checkbox', checked: true, 'aria-label': 'Accetta modifica', onchange: (e) => (e.target.checked ? accettate.add(m.dopo.id) : accettate.delete(m.dopo.id)) })),
        h('td', nomeAlunno(m.dopo.alunnoId)), h('td', m.dopo.giornataId), h('td', m.dopo.sottoObiettivo),
        h('td', desc(m.prima)), h('td', desc(m.dopo)))))) : null), {
    largo: true,
    azioni: [{
      testo: 'Importa', primario: true,
      azione: async () => {
        await ctx.persistenza.aggiungiBackup(ctx.store.get(), `prima di importare ${f.nome}`);
        ctx.store.aggiorna((s) => applicaImport(s, an, [...accettate]));
        avviso(`Import completato: ${an.nuove.length} nuove, ${accettate.size} modifiche accettate`);
      }
    }]
  });
}

function sezioneExcel(ctx, stato) {
  const classi = stato.classi.filter((c) => alunniDi(stato, c.codice).length);
  const selC = select(classi.length ? classi.map((c) => c.codice) : [['', 'nessuna classe con alunni']], classi[0]?.codice, { 'aria-label': 'Classe da esportare' });
  const selQ = select([['Q1', '1° quadrimestre'], ['Q2', '2° quadrimestre']], 'Q1', { 'aria-label': 'Quadrimestre' });
  const scarica = async (fn, nome) => {
    try {
      const buf = await fn();
      scaricaBlob(nome, new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    } catch (e) {
      console.error(e);
      avviso(`Export non riuscito: ${e.message}`, 'errore');
    }
  };
  return h('div.scheda', h('h2', 'Export Excel'),
    h('p.tenue', 'I file Excel contengono nomi e giudizi: salvali solo nelle tue cartelle.'),
    h('div.barra', selC, h('button', {
      disabled: !classi.length,
      onclick: () => scarica(() => excelClasse(ctx.store.get(), selC.value), `registro_${selC.value}_${marcaTemporale()}.xlsx`)
    }, 'Excel della classe (riepiloghi, registro, verifica)')),
    h('div.barra', selQ, h('button', {
      onclick: () => scarica(() => excelRiepiloghi(ctx.store.get(), selQ.value), `riepiloghi_${selQ.value}_${marcaTemporale()}.xlsx`)
    }, 'Riepiloghi di tutte le classi (documento di valutazione)')));
}

function sezioneBackup(ctx) {
  const lista = h('div', h('p.tenue', 'Caricamento…'));
  ctx.persistenza.elencoBackup().then((b) => {
    lista.replaceChildren(b.length ? h('table', h('tbody', b.map((x) => h('tr',
      h('td', new Date(x.creatoIl).toLocaleString('it-IT')), h('td', x.motivo),
      h('td', h('button', {
        onclick: async () => {
          const s = await ctx.persistenza.leggiBackup(x.id);
          await ripristina(ctx, serializzaArchivio(s), `backup del ${new Date(x.creatoIl).toLocaleString('it-IT')}`);
        }
      }, 'Ripristina')))))) : h('p.tenue', 'Nessun backup ancora.'));
  });
  return h('div.scheda', h('h2', 'Backup nel browser (ultimi 20)'),
    h('p.tenue', `Uno al giorno e uno prima di ogni import o ripristino. Le copie nella cartella archivio si chiamano ${NOME_ARCHIVIO.replace('.json', '_data.json')}.`),
    h('button', { onclick: async () => { await ctx.persistenza.aggiungiBackup(ctx.store.get(), 'backup manuale'); avviso('Backup creato'); ctx.ridisegna(); } }, 'Crea backup adesso'),
    lista);
}
