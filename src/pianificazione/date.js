// Utility date in formato ISO 'YYYY-MM-DD' (fuso UTC per evitare problemi di ora legale).

export const GIORNI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
export const GIORNI_LUNGHI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const MS_GIORNO = 86400000;

export const toDate = (iso) => new Date(`${iso}T00:00:00Z`);
export const toISO = (d) => d.toISOString().slice(0, 10);

export function aggiungiGiorni(iso, n) {
  return toISO(new Date(toDate(iso).getTime() + n * MS_GIORNO));
}

export function giorniTra(a, b) {
  return Math.round((toDate(b) - toDate(a)) / MS_GIORNO);
}

export const giornoSettimana = (iso) => GIORNI[toDate(iso).getUTCDay()];

/** Lunedì della settimana che contiene la data. */
export function lunediDi(iso) {
  const dow = toDate(iso).getUTCDay();
  return aggiungiGiorni(iso, dow === 0 ? -6 : 1 - dow);
}

export function formatta(iso, conGiorno = false) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  const base = `${d}/${m}/${y}`;
  return conGiorno ? `${GIORNI_LUNGHI[toDate(iso).getUTCDay()]} ${base}` : base;
}

export const formattaBreve = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '—');

export function oggiISO(now = new Date()) {
  const z = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}

export function inIntervallo(iso, dal, al) {
  return (!dal || iso >= dal) && (!al || iso <= al);
}
