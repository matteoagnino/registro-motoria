// Costruzione dello stato iniziale dai file seed (nessun dato personale).
import didattica from '../../seed/didattica.json';
import calendario from '../../seed/calendario_2026-27.json';
import orario from '../../seed/orario.json';
import giochi from '../../seed/giochi_gioventu.json';
import { SCHEMA_VERSION } from './schema.js';

const mapIndicatore = (i) => ({
  nome: i.nome,
  cosaOsservo: i.cosa_osservo,
  descrittori: { ...i.descrittori }
});

const mapSotto = (s) => ({
  codice: s.codice,
  nucleo: s.nucleo,
  etichetta: s.etichetta,
  testo: s.testo,
  concorre: { ...s.concorre },
  indicatori: s.indicatori.map(mapIndicatore)
});

function giornateIniziali() {
  return calendario.giornate_note_Q1.map((g) => {
    const progetto = /basket/i.test(g.descrizione) ? 'basket' : null;
    return {
      id: g.giornata,
      quadrimestre: g.giornata.slice(0, 2),
      descrizione: g.descrizione,
      sottoObiettivi: { 4: [...g.sotto_obiettivi['4']], 5: [...g.sotto_obiettivi['5']] },
      // Ipotesi prudente (DOMANDE.md D3): dove manca la settimana di Boncompagni si usa quella di Manzoni.
      ancora: {
        Manzoni: g.settimana_Manzoni,
        Boncompagni: g.settimana_Boncompagni ?? (progetto ? null : g.settimana_Manzoni)
      },
      progetto
    };
  });
}

function progettiIniziali() {
  return calendario.vincoli
    .filter((v) => v.tipo === 'progetto')
    .map((v) => ({
      id: `basket-${v.plesso}`,
      codice: 'basket',
      nome: 'Progetto basket',
      plesso: v.plesso,
      dal: v.dal,
      al: v.al,
      nLezioni: 4,
      nota: v.nota
    }));
}

export function creaStatoIniziale(deviceId = 'gestionale') {
  return {
    schemaVersion: SCHEMA_VERSION,
    anno: {
      id: calendario.anno,
      inizio: calendario.inizio_lezioni,
      fine: calendario.fine_lezioni,
      quadrimestri: calendario.quadrimestri.map((q) => ({ ...q })),
      chiusure: calendario.chiusure.map((c) => ({ ...c })),
      vincoli: calendario.vincoli.filter((v) => v.tipo === 'spazio').map((v) => ({ ...v })),
      regole: { ...calendario.regole_sequenza }
    },
    impostazioni: {
      scala: didattica.scala.map((s) => ({ ...s })),
      soglie: didattica.soglie.map((s) => ({ ...s })),
      parametri: { ...didattica.parametri },
      qualificatori: { ...didattica.qualificatori_livelli },
      cuscinetti: calendario.regole_sequenza.cuscinetto_fine_quadrimestre,
      scenariVenerdi: [...orario.venerdi_alternati.scenari],
      settimanaRifVenerdi1: /^\d{4}-\d{2}-\d{2}$/.test(orario.venerdi_alternati.settimana_riferimento_venerdi1)
        ? orario.venerdi_alternati.settimana_riferimento_venerdi1 : '',
      cartellaArchivio: ''
    },
    didattica: {
      obiettiviScheda: JSON.parse(JSON.stringify(didattica.obiettivi_scheda)),
      sottoObiettivi: {
        4: didattica.sotto_obiettivi['4'].map(mapSotto),
        5: didattica.sotto_obiettivi['5'].map(mapSotto)
      },
      rubricaProcessoDimensioni: [...didattica.rubrica_processo_dimensioni],
      codiciStato: { ...didattica.codici_stato }
    },
    classi: orario.classi.map((c) => ({ ...c, lezioni: c.lezioni.map((l) => ({ ...l })) })),
    alunni: [],
    obiettiviPersonalizzati: {},
    giornate: giornateIniziali(),
    progetti: progettiIniziali(),
    eventi: [],
    lezioniSvolte: [],
    registrazioni: [],
    rubricheProcesso: [],
    giudiziDefinitivi: [],
    giochi: {
      prove: giochi.prove.map((p) => ({ ...p })),
      penalitaSupergym: giochi.penalita_supergym.map((p) => ({ ...p })),
      regole: {
        classificaGenerale: giochi.classifica_generale,
        correttivi: giochi.correttivi_disabilita,
        spareggio: giochi.spareggio
      },
      risultati: [],
      storico: []
    },
    meta: { deviceId, creatoIl: new Date().toISOString(), importLog: [] }
  };
}
