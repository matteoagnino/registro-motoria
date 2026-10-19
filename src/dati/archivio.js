// Archivio JSON su disco: File System Access API (Chrome su Mac) con fallback download/upload.
import { avvolgiArchivio, leggiArchivio } from './schema.js';
import { MAX_BACKUP } from './persistenza.js';

export const NOME_ARCHIVIO = 'registro-motoria-archivio.json';

export const serializzaArchivio = (stato, ora) => JSON.stringify(avvolgiArchivio(stato, ora), null, 1);
export const deserializzaArchivio = (testo, base) => leggiArchivio(testo, base);

export const supportaCartella = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window;

export function marcaTemporale(ora = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${ora.getFullYear()}-${p(ora.getMonth() + 1)}-${p(ora.getDate())}_${p(ora.getHours())}${p(ora.getMinutes())}${p(ora.getSeconds())}`;
}

async function verificaPermesso(handle) {
  const opts = { mode: 'readwrite' };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  return (await handle.requestPermission(opts)) === 'granted';
}

export async function scegliCartella(persistenza) {
  const handle = await window.showDirectoryPicker({ id: 'registro-motoria', mode: 'readwrite' });
  await persistenza.scrivi('cartella', handle);
  return handle;
}

async function scriviFile(dir, nome, testo) {
  const fh = await dir.getFileHandle(nome, { create: true });
  const w = await fh.createWritable();
  await w.write(testo);
  await w.close();
}

/** Salva l'archivio nella cartella scelta + copia datata in backup/ (ultime 20). */
export async function salvaInCartella(persistenza, stato) {
  const dir = await persistenza.leggi('cartella');
  if (!dir) throw new Error('Nessuna cartella archivio scelta.');
  if (!(await verificaPermesso(dir))) throw new Error('Permesso di scrittura sulla cartella negato.');
  const testo = serializzaArchivio(stato);
  await scriviFile(dir, NOME_ARCHIVIO, testo);
  const bdir = await dir.getDirectoryHandle('backup', { create: true });
  await scriviFile(bdir, `registro-motoria-archivio_${marcaTemporale()}.json`, testo);
  const nomi = [];
  for await (const [nome] of bdir.entries()) if (nome.endsWith('.json')) nomi.push(nome);
  nomi.sort();
  for (const n of nomi.slice(0, Math.max(0, nomi.length - MAX_BACKUP))) await bdir.removeEntry(n);
  return dir.name;
}

export async function leggiDaCartella(persistenza) {
  const dir = await persistenza.leggi('cartella');
  if (!dir || !(await verificaPermesso(dir))) return null;
  try {
    const fh = await dir.getFileHandle(NOME_ARCHIVIO);
    return await (await fh.getFile()).text();
  } catch {
    return null;
  }
}

// ---------- Voti in arrivo dall'iPad (sottocartella della cartella archivio) ----------

export const CARTELLA_VOTI = 'voti-ipad';
const CARTELLA_IMPORTATI = 'importati';

/** Stato della cartella archivio senza chiedere nulla: 'nessuna' | 'permesso' (serve un clic) | 'ok'. */
export async function statoCartella(persistenza) {
  const dir = await persistenza.leggi('cartella');
  if (!dir) return 'nessuna';
  return (await dir.queryPermission?.({ mode: 'readwrite' })) === 'granted' ? 'ok' : 'permesso';
}

/** Riattiva il permesso sulla cartella (da chiamare dopo un clic). */
export async function riattivaCartella(persistenza) {
  const dir = await persistenza.leggi('cartella');
  return Boolean(dir) && verificaPermesso(dir);
}

/** File voti presenti nella cartella «voti-ipad» (esclusi quelli già importati). */
export async function fileVotiInArrivo(persistenza) {
  if ((await statoCartella(persistenza)) !== 'ok') return [];
  const dir = await (await persistenza.leggi('cartella')).getDirectoryHandle(CARTELLA_VOTI, { create: true });
  const out = [];
  for await (const [nome, handle] of dir.entries()) {
    if (handle.kind === 'file' && nome.endsWith('.json')) out.push({ nome, testo: await (await handle.getFile()).text() });
  }
  return out.sort((a, b) => a.nome.localeCompare(b.nome));
}

/** Sposta un file voti già importato in «voti-ipad/importati». */
export async function archiviaFileVoti(persistenza, nome, testo) {
  const dir = await (await persistenza.leggi('cartella')).getDirectoryHandle(CARTELLA_VOTI, { create: true });
  await scriviFile(await dir.getDirectoryHandle(CARTELLA_IMPORTATI, { create: true }), nome, testo);
  await dir.removeEntry(nome);
}

/** Fallback universale: scarica un file di testo. */
export function scaricaTesto(nome, testo, tipo = 'application/json') {
  const url = URL.createObjectURL(new Blob([testo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function scaricaBlob(nome, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Condivisione (iPad: Condividi → AirDrop/File) con fallback al download. */
export async function condividiOScarica(nome, testo) {
  const file = typeof File !== 'undefined' ? new File([testo], nome, { type: 'application/json' }) : null;
  if (file && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: nome });
      return 'condiviso';
    } catch (e) {
      if (e?.name === 'AbortError') return 'annullato';
    }
  }
  scaricaTesto(nome, testo);
  return 'scaricato';
}

export function scegliFile(accept = '.json,application/json', binario = false) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.addEventListener('change', async () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      resolve(binario ? { nome: f.name, buffer: await f.arrayBuffer() } : { nome: f.name, testo: await f.text() });
    });
    input.click();
  });
}
