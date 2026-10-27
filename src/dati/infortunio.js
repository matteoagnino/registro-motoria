// Infortunio (stato INF della giornata): durata a scaglioni o periodo personalizzato. Nessun voto finché dura.

/** Stati possibili di un alunno in una giornata (chi è senza voto). */
export const STATI_GIORNATA = ['AS', 'NV', 'INF', 'ES'];

export const DURATE_INFORTUNIO = [
  ['fino7', '< 7 giorni (1 settimana)'],
  ['oltre7', '> 7 giorni'],
  ['oltre14', '> 14 giorni'],
  ['oltre21', '> 21 giorni'],
  ['oltre28', '> 28 giorni'],
  ['periodo', 'Periodo personalizzato']
];

const CODICI_DURATA = DURATE_INFORTUNIO.map(([k]) => k);
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Normalizza e controlla un infortunio ({durata, dal, al}); null = nessuna indicazione. */
export function validaInfortunio(inf) {
  if (inf == null) return null;
  if (!CODICI_DURATA.includes(inf.durata)) throw new Error('Durata dell\'infortunio non valida.');
  if (inf.durata !== 'periodo') return { durata: inf.durata, dal: null, al: null };
  const dal = inf.dal || null;
  const al = inf.al || null;
  if ((dal && !DATA_ISO.test(dal)) || (al && !DATA_ISO.test(al))) throw new Error('Data dell\'infortunio non valida.');
  if (dal && al && al < dal) throw new Error('Il periodo dell\'infortunio finisce prima di cominciare.');
  return { durata: 'periodo', dal, al };
}

const giorno = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Testo breve dell'infortunio: «> 14 giorni», «dal 03/11 al 20/11». */
export function descriviInfortunio(inf) {
  if (!inf?.durata) return 'durata da indicare';
  if (inf.durata !== 'periodo') return DURATE_INFORTUNIO.find(([k]) => k === inf.durata)[1];
  if (!inf.dal && !inf.al) return 'periodo da indicare';
  return [inf.dal ? `dal ${giorno(inf.dal)}` : '', inf.al ? `al ${giorno(inf.al)}` : ''].filter(Boolean).join(' ');
}
