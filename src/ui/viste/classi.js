// Classi e alunni: anagrafica, numeri fissi, stati, OP, obiettivi personalizzati.
import { h, select, campo, modale, conferma, prova, avviso } from '../dom.js';
import { conParametri } from '../app.js';
import * as A from '../../dati/azioni.js';
import { intestazione, selettoreClasse, classeScelta } from './comuni.js';

export function vistaClassi(ctx, { params }) {
  const stato = ctx.store.get();
  const cl = classeScelta(stato, params);
  const agg = (fn, msg) => prova(() => ctx.store.aggiorna(fn), msg);
  if (!cl) return h('div', intestazione('Classi e alunni'), bottoneNuovaClasse(ctx));
  const alunni = A.alunniDi(stato, cl.codice);

  return h('div',
    intestazione('Classi e alunni', selettoreClasse(stato, cl.codice), bottoneNuovaClasse(ctx)),
    h('div.scheda',
      h('h2', `${cl.codice} · classe ${cl.livello}ª · plesso ${cl.plesso}`),
      h('p.tenue', 'Lezioni: ', cl.lezioni.map((l) => `${l.giorno} ${l.inizio}–${l.fine}${l.scenario !== 'tutte' ? ` (${l.scenario})` : ''}`).join(' · ') || 'nessuna')),
    h('div.barra',
      h('form.riga', {
        onsubmit: (e) => {
          e.preventDefault();
          const nome = e.target.elements.nome.value;
          if (agg((s) => A.aggiungiAlunno(s, { classe: cl.codice, cognomeNome: nome }), 'Alunno aggiunto in coda')) e.target.reset();
        }
      },
      campo('Nuovo alunno (in coda)', h('input', { name: 'nome', placeholder: 'Cognome Nome', autocomplete: 'off', 'data-focus': 'nuovo-alunno' })),
      h('button.primario', { type: 'submit' }, 'Aggiungi')),
      h('button', { onclick: () => incollaElenco(ctx, cl.codice, alunni.length === 0) }, 'Incolla elenco…')),
    alunni.length === 0
      ? h('div.vuoto', 'Nessun alunno. Incolla l\'elenco della classe (uno per riga): verrà ordinato alfabeticamente e numerato.')
      : h('div.tabella-scorri', h('table',
        h('thead', h('tr', ['N°', 'Cognome e nome', 'Stato', 'OP', 'Note didattiche (no dati sanitari)', ''].map((t) => h('th', t)))),
        h('tbody', alunni.map((a) => h(`tr${a.stato === 'Ritirato' ? '.ritirato' : ''}`,
          h('td.num', a.numero),
          h('td', h('input', {
            value: a.cognomeNome, 'aria-label': `Nome alunno ${a.numero}`, 'data-focus': `nome-${a.id}`,
            onchange: (e) => agg((s) => A.modificaAlunno(s, a.id, { cognomeNome: e.target.value }))
          })),
          h('td', select(['Attivo', 'Ritirato', 'ES'], a.stato, {
            'aria-label': `Stato alunno ${a.numero}`, onchange: (e) => agg((s) => A.modificaAlunno(s, a.id, { stato: e.target.value }))
          })),
          h('td.num', h('input', {
            type: 'checkbox', checked: a.op, 'aria-label': `Obiettivi personalizzati alunno ${a.numero}`,
            onchange: (e) => agg((s) => A.modificaAlunno(s, a.id, { op: e.target.checked }))
          }), a.op ? h('button', { onclick: () => editorOP(ctx, a) }, 'Obiettivi…') : null),
          h('td', h('input', {
            value: a.note || '', style: { width: '100%' }, 'aria-label': `Note alunno ${a.numero}`,
            onchange: (e) => agg((s) => A.modificaAlunno(s, a.id, { note: e.target.value }))
          })),
          h('td', h('button.pericolo', { onclick: () => eliminaAlunno(ctx, a), title: 'Elimina definitivamente' }, 'Elimina'))))))),
    h('p.tenue', 'Il numero è il codice dell\'alunno per tutto l\'anno. Chi lascia la classe: Stato = Ritirato (non si cancella). ES = esonerato.'));
}

function bottoneNuovaClasse(ctx) {
  return h('button', {
    onclick: () => {
      const form = h('form',
        campo('Codice', h('input', { name: 'codice', placeholder: 'es. 4AM', required: true })),
        campo('Livello', select([4, 5], 4, { name: 'livello' })),
        campo('Plesso', select(['Manzoni', 'Boncompagni'], 'Manzoni', { name: 'plesso' })),
        campo('Giorno di lezione', select([['lun', 'lunedì'], ['mar', 'martedì'], ['mer', 'mercoledì'], ['gio', 'giovedì'], ['ven', 'venerdì']], 'lun', { name: 'giorno' })),
        h('div.riga', campo('Inizio', h('input', { name: 'inizio', type: 'time', value: '08:30' })), campo('Fine', h('input', { name: 'fine', type: 'time', value: '10:30' }))));
      modale('Nuova classe', form, {
        azioni: [{
          testo: 'Crea classe', primario: true, azione: () => {
            const f = form.elements;
            const codice = f.codice.value.trim().toUpperCase();
            const ok = prova(() => ctx.store.aggiorna((s) => A.aggiungiClasse(s, {
              codice, livello: Number(f.livello.value), plesso: f.plesso.value, sezione: codice.charAt(1),
              lezioni: [{ giorno: f.giorno.value, inizio: f.inizio.value, fine: f.fine.value, scenario: 'tutte' }]
            })), 'Classe creata');
            if (!ok) return false;
            conParametri({ classe: codice });
            return true;
          }
        }]
      });
    }
  }, 'Nuova classe…');
}

function incollaElenco(ctx, classe, vuota) {
  const ta = h('textarea', { rows: 14, placeholder: 'Un alunno per riga (Cognome Nome)', 'aria-label': 'Elenco alunni' });
  modale(`Elenco alunni ${classe}`, h('div', ta, h('p.tenue', vuota
    ? 'La classe è vuota: i nomi saranno ordinati alfabeticamente e numerati da 1.'
    : 'La classe ha già alunni: i nuovi saranno aggiunti in coda nell\'ordine incollato.')), {
    azioni: [{
      testo: 'Aggiungi', primario: true,
      azione: () => Boolean(prova(() => ctx.store.aggiorna((s) => A.importaElencoAlunni(s, classe, ta.value.split('\n'))), 'Elenco aggiunto'))
    }]
  });
}

function editorOP(ctx, alunno) {
  const op = ctx.store.get().obiettiviPersonalizzati[alunno.id] ?? {};
  const form = h('form',
    campo('Obiettivo personalizzato → A', h('textarea', { name: 'A', value: op.A || '' })),
    campo('Obiettivo personalizzato → B', h('textarea', { name: 'B', value: op.B || '' })),
    campo('Adattamenti', h('textarea', { name: 'adattamenti', value: op.adattamenti || '' })));
  modale(`Obiettivi personalizzati · n. ${alunno.numero}`, form, {
    azioni: [{
      testo: 'Salva', primario: true,
      azione: () => {
        const f = form.elements;
        ctx.store.aggiorna((s) => A.impostaObiettiviPersonalizzati(s, alunno.id, { A: f.A.value, B: f.B.value, adattamenti: f.adattamenti.value }));
        avviso('Obiettivi personalizzati salvati');
      }
    }]
  });
}

async function eliminaAlunno(ctx, alunno) {
  const ok = await conferma('Eliminare definitivamente?',
    `L'alunno n. ${alunno.numero} e TUTTI i suoi voti verranno cancellati. Se ha lasciato la classe usa invece lo stato "Ritirato". Prima verrà fatto un backup.`,
    'Elimina definitivamente');
  if (!ok) return;
  await ctx.persistenza.aggiungiBackup(ctx.store.get(), `prima di eliminare alunno n. ${alunno.numero} (${alunno.classe})`);
  ctx.store.aggiorna((s) => A.eliminaAlunno(s, alunno.id));
  avviso('Alunno eliminato (backup creato)');
}
