// Guida rapida integrata.
import { h } from '../dom.js';
import { intestazione } from './comuni.js';

const PASSI = [
  ['Primo avvio (Mac)', [
    'Classi e alunni: per ogni classe «Incolla elenco…» (un alunno per riga). I numeri restano fissi tutto l\'anno.',
    'Import/Export → «Scegli cartella archivio»: consigliata la cartella del Drive d\'istituto sincronizzata sul Mac. L\'archivio si salva lì da solo, con copie datate in backup/.',
    'Impostazioni → Calendario: controlla chiusure e settimana «Venerdì 1» della 5B Boncompagni.'
  ]],
  ['Ogni settimana', [
    'Settimana: vedi per ogni classe che tipo di lezione è (prova, recupero, progetto, cuscinetto, libera) e chi deve recuperare.',
    'Calendario: aggiungi le giornate di prova (max 4 sotto-obiettivi) e segna le lezioni saltate (gita, assenza): la sequenza della sola classe slitta da sola.'
  ]],
  ['In palestra (iPad)', [
    'Sul Mac: Import/Export → «Pacchetto classe per iPad» → AirDrop all\'iPad.',
    'Sull\'iPad (app aggiunta a Home da Safari): Campo → Importa pacchetto. Scegli classe e giornata, poi tocca i livelli 10–5 per ogni indicatore (tocco lungo = descrittore).',
    'A fine giornata: «Esporta file voti» → Condividi → AirDrop al Mac. Nessun dato lascia l\'iPad senza una tua azione.',
    'Sul Mac: Import/Export → «Importa file voti». Reimportare lo stesso file non crea doppioni; le modifiche ti vengono mostrate da accettare.'
  ]],
  ['Fine quadrimestre', [
    'Riepilogo: compila la rubrica di processo; controlla avvisi (pochi voti, prove da recuperare, ES, OP); il giudizio definitivo è tuo e prevale.',
    'Verifica voti: confronta con Argo. Import/Export → Excel del riepilogo per il documento di valutazione.'
  ]],
  ['Sicurezza dei dati', [
    'I dati stanno solo nel browser di questo dispositivo e nei file che salvi tu. L\'app non usa internet.',
    'Backup: uno automatico al giorno nel browser, uno prima di ogni import, e le copie datate nella cartella archivio.',
    'Se cambi Mac o browser: apri l\'archivio JSON da Import/Export.'
  ]]
];

export function vistaGuida() {
  return h('div',
    intestazione('Guida rapida'),
    PASSI.map(([titolo, voci]) => h('div.scheda', h('h2', titolo), h('ol', voci.map((v) => h('li', v))))),
    h('div.scheda', h('h2', 'Come si calcola'),
      h('ul',
        h('li', 'Voto di una prova = media degli indicatori compilati, arrotondata all\'intero (da ,50 per eccesso).'),
        h('li', 'Peso 1 prima della metà del quadrimestre, 1,5 dalla metà in poi.'),
        h('li', 'Ob. A/B = media ponderata dei voti dei sotto-obiettivi collegati; con rubrica di processo: 80% prove + 20% processo.'),
        h('li', 'Soglie: ≥ 9,5 Ottimo · ≥ 8,5 Distinto · ≥ 7,5 Buono · ≥ 6,5 Discreto · ≥ 5,5 Sufficiente.'),
        h('li', 'Regola di recupero: lo stesso sotto-obiettivo non si valuta due volte nella giornata né a meno di 9 giorni.'))));
}
