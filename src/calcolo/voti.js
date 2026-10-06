// Motore di calcolo puro (SPEC §4). Nessun accesso a DOM o storage.

const EPS = 1e-9;

/** Arrotondamento "da ,50 per eccesso" (come ROUND di Excel su valori positivi). */
export function arrotonda(x, decimali = 0) {
  if (x == null || Number.isNaN(x)) return null;
  const f = 10 ** decimali;
  const r = Math.sign(x) * Math.round(Math.abs(x) * f + EPS) / f;
  return Object.is(r, -0) ? 0 : r;
}

const isLivello = (v) => typeof v === 'number' && Number.isFinite(v);

/** §4.1 Voto di una prova = media degli indicatori compilati, arrotondata all'intero. */
export function votoProva(livelli) {
  const validi = (livelli || []).filter(isLivello);
  if (validi.length === 0) return null;
  return arrotonda(validi.reduce((a, b) => a + b, 0) / validi.length, 0);
}

/** §4.2 Giudizio di un voto intero (scala 10–5). */
export function giudizioVoto(voto, scala) {
  if (voto == null) return '';
  const voce = scala.find((s) => s.valore === voto);
  return voce ? voce.giudizio : '';
}

/** §4.6 Giudizio da un valore decimale tramite soglie (≥ min). */
export function giudizioDaValore(valore, soglie) {
  if (valore == null) return '';
  const ordinate = [...soglie].sort((a, b) => a.min - b.min);
  let esito = ordinate[0]?.giudizio ?? '';
  for (const s of ordinate) if (valore >= s.min - EPS) esito = s.giudizio;
  return esito;
}

/** §4.3 Peso della prova in base alla data rispetto alla metà del quadrimestre. */
export function pesoProva(dataISO, metaISO, parametri) {
  if (!dataISO || !metaISO) return parametri.peso_prima_meta;
  return dataISO >= metaISO ? parametri.peso_seconda_meta : parametri.peso_prima_meta;
}

/** Media ponderata di [{voto, peso}] arrotondata a 2 decimali; null se vuota. */
export function mediaPonderata(voci) {
  const valide = voci.filter((v) => v.voto != null && v.peso > 0);
  const sommaPesi = valide.reduce((a, v) => a + v.peso, 0);
  if (sommaPesi === 0) return null;
  return arrotonda(valide.reduce((a, v) => a + v.voto * v.peso, 0) / sommaPesi, 2);
}

/** §4.5 Valore finale A/B: quota prove × media + quota processo × rubrica (se presente). */
export function valoreFinale(media, rubrica, parametri) {
  if (media == null) return null;
  if (!isLivello(rubrica)) return media;
  return arrotonda(parametri.quota_prove * media + parametri.quota_processo * rubrica, 2);
}

/** Restituisce il voto di una registrazione, o null (AS non recuperato, NV, vuota). */
export function votoRegistrazione(reg) {
  if (!reg || reg.stato === 'NV') return null;
  return votoProva(reg.livelli);
}

/** Registrazione assente ancora da recuperare. */
export function daRecuperare(reg) {
  return reg?.stato === 'AS' && !reg.recuperataIl && votoProva(reg.livelli) == null;
}
