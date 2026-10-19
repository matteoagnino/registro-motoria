// Import anagrafiche dall'Excel «Lista schede alunno» di Argo (tutto nel browser, nessun dato esce dal dispositivo).
import { aggiungiAlunno, alunniDi, modificaAlunno } from './azioni.js';

// Una riga alunno: «   12      COGNOME NOME      [Iscritto dal 01-10-2026 | Ritirato il …]»
const RIGA = /^\s*(\d{1,3})\s+(\S.*?)(?:\s{3,}(\S.*?))?\s*$/;

/** «PROVA D'ESEMPIO UNO» → «Prova D'Esempio Uno». */
export function inMaiuscoletto(nome) {
  return nome.toLocaleLowerCase('it-IT').replace(/(^|[\s'’-])(\p{L})/gu, (_, sep, l) => sep + l.toLocaleUpperCase('it-IT'));
}

const normalizza = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Righe (array di celle) → alunni [{numero, cognomeNome, ritirato, nota}]. Ignora intestazioni e righe vuote. */
export function leggiRigheArgo(righe) {
  const out = [];
  for (const r of righe) {
    const m = RIGA.exec(String(r?.[0] ?? ''));
    if (!m) continue;
    const coda = m[3] ?? '';
    out.push({ numero: Number(m[1]), cognomeNome: inMaiuscoletto(m[2].replace(/\s+/g, ' ')), ritirato: /ritirat|trasferit/i.test(coda), nota: coda });
  }
  if (!out.length) throw new Error('Nel file non ho trovato alunni: serve l\'Excel «Lista schede alunno» scaricato da Argo.');
  return out;
}

/** Legge il file .xlsx di Argo (ArrayBuffer) e restituisce gli alunni. */
export async function leggiExcelArgo(buffer) {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer);
  } catch {
    throw new Error('Il file non è un Excel leggibile (.xlsx).');
  }
  const ws = wb.worksheets[0];
  const righe = [];
  ws?.eachRow((row) => righe.push([row.getCell(1).text]));
  return leggiRigheArgo(righe);
}

/** Confronta l'elenco Argo con la classe: nuovi, da ritirare, invariati, presenti solo nel registro. */
export function analizzaArgo(stato, classe, daArgo) {
  const attuali = alunniDi(stato, classe);
  const perNome = new Map(attuali.map((a) => [normalizza(a.cognomeNome), a]));
  const visti = new Set();
  const esito = { nuovi: [], ritirati: [], invariati: [], soloRegistro: [] };
  for (const x of daArgo) {
    const a = perNome.get(normalizza(x.cognomeNome));
    if (!a) {
      if (!x.ritirato) esito.nuovi.push(x);
      continue;
    }
    visti.add(a.id);
    if (x.ritirato && a.stato !== 'Ritirato') esito.ritirati.push(a);
    else esito.invariati.push(a);
  }
  esito.soloRegistro = attuali.filter((a) => !visti.has(a.id) && a.stato !== 'Ritirato');
  return esito;
}

/**
 * Applica l'import: classe vuota → numeri di Argo; altrimenti i nuovi vanno in coda (i numeri del registro non cambiano).
 * Nessun alunno viene cancellato: chi risulta ritirato in Argo passa a «Ritirato».
 */
export function applicaArgo(stato, classe, analisi) {
  const vuota = alunniDi(stato, classe).length === 0;
  let s = stato;
  for (const x of analisi.nuovi) {
    s = aggiungiAlunno(s, { classe, cognomeNome: x.cognomeNome });
    if (vuota) {
      const ultimo = s.alunni[s.alunni.length - 1];
      const libero = !s.alunni.some((a) => a.classe === classe && a.numero === x.numero);
      if (libero) s = { ...s, alunni: s.alunni.map((a) => (a.id === ultimo.id ? { ...a, numero: x.numero } : a)) };
    }
  }
  for (const a of analisi.ritirati) s = modificaAlunno(s, a.id, { stato: 'Ritirato' });
  return s;
}
