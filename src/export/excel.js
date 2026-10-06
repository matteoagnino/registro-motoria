// Export Excel lato client (exceljs): riepilogo per il documento di valutazione e registro della classe.
import { alunniDi } from '../dati/azioni.js';
import { riepilogoClasse, sottoObiettiviDi, giornateClasse, sottoObiettivo, verificaVoti, classe as trovaClasse } from '../dati/selettori.js';
import { votoRegistrazione, giudizioVoto } from '../calcolo/voti.js';
import { formatta } from '../pianificazione/date.js';

const COLORI_NUCLEO = { 1: 'FFC6E0B4', 2: 'FFF8CBAD', 3: 'FFBDD7EE', 4: 'FFFFE699', TEC: 'FFD9D2E9', CIV: 'FFD9D2E9' };
const BLU = 'FF1F4E79';
const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const bordo = { top: { style: 'thin', color: { argb: 'FFBFBFBF' } }, left: { style: 'thin', color: { argb: 'FFBFBFBF' } }, bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } }, right: { style: 'thin', color: { argb: 'FFBFBFBF' } } };

async function nuovoLibro() {
  const mod = await import('exceljs');
  const ExcelJS = mod.default ?? mod;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Registro Motoria';
  wb.created = new Date();
  return wb;
}

function titolo(ws, testo, colonne) {
  ws.mergeCells(1, 1, 1, Math.max(2, colonne));
  const c = ws.getCell(1, 1);
  c.value = testo;
  c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 13 };
  c.fill = fill(BLU);
}

function intestazioni(ws, riga, valori, colore = 'FFDDEBF7') {
  const r = ws.getRow(riga);
  valori.forEach((v, i) => {
    const c = r.getCell(i + 1);
    c.value = v;
    c.font = { bold: true };
    c.fill = fill(typeof colore === 'function' ? colore(i) : colore);
    c.border = bordo;
    c.alignment = { wrapText: true, vertical: 'middle' };
  });
}

function foglioRiepilogo(wb, stato, codice, q) {
  const cl = trovaClasse(stato, codice);
  const sos = sottoObiettiviDi(stato, cl.livello);
  const ws = wb.addWorksheet(`Riepilogo ${q}`, { views: [{ state: 'frozen', xSplit: 2, ySplit: 3 }] });
  const cols = ['N°', 'Alunno', 'Stato', 'OP', ...sos.map((s) => `${s.codice} ${s.etichetta}`),
    'Ob. A n. voti', 'Ob. A media', 'Ob. A valore', 'Ob. A calcolato', 'Ob. A definitivo',
    'Ob. B n. voti', 'Ob. B media', 'Ob. B valore', 'Ob. B calcolato', 'Ob. B definitivo',
    'TEC media', 'TEC calcolato', 'TEC definitivo', 'CIV media', 'CIV calcolato', 'CIV definitivo',
    'Rubrica di processo', 'Prove da recuperare', 'Avvisi',
    'DA RIPORTARE Ob. A', 'DA RIPORTARE Ob. B', 'DA RIPORTARE Tecnologia', 'DA RIPORTARE Ed. civica'];
  titolo(ws, `RIEPILOGO E GIUDIZI · ${codice} · classe ${cl.livello}ª · ${q === 'Q1' ? '1°' : '2°'} quadrimestre · a.s. ${stato.anno.id}`, cols.length);
  const os = stato.didattica.obiettiviScheda[String(cl.livello)];
  ws.getCell(2, 1).value = `Ob. A: ${os[`${q}A`]}   ·   Ob. B: ${os[`${q}B`]}`;
  intestazioni(ws, 3, cols, (i) => (i >= 4 && i < 4 + sos.length ? COLORI_NUCLEO[sos[i - 4].nucleo] : i >= cols.length - 4 ? 'FFC6EFCE' : 'FFDDEBF7'));
  riepilogoClasse(stato, codice, q).forEach(({ alunno: a, r }, k) => {
    const o = r.obiettivi;
    const riga = ws.getRow(4 + k);
    riga.values = [a.numero, a.cognomeNome, a.stato, a.op ? 'OP' : '', ...sos.map((s) => r.perSotto[s.codice] ?? ''),
      o.A.n, o.A.media ?? '', o.A.valore ?? '', o.A.calcolato, o.A.definitivo,
      o.B.n, o.B.media ?? '', o.B.valore ?? '', o.B.calcolato, o.B.definitivo,
      o.TEC.media ?? '', o.TEC.calcolato, o.TEC.definitivo, o.CIV.media ?? '', o.CIV.calcolato, o.CIV.definitivo,
      r.rubrica ?? '', r.daRecuperare, r.avvisi.join(' '),
      r.riporta.A, r.riporta.B, r.riporta.TEC, r.riporta.CIV];
    riga.eachCell((c) => { c.border = bordo; });
    for (let i = cols.length - 3; i <= cols.length; i++) riga.getCell(i).fill = fill('FFC6EFCE');
  });
  ws.getColumn(2).width = 28;
  ws.getColumn(cols.length - 4).width = 40;
  for (let i = 5; i <= cols.length; i++) if (i !== cols.length - 4 && i !== 2) ws.getColumn(i).width = 11;
}

function foglioRegistro(wb, stato, codice) {
  const cl = trovaClasse(stato, codice);
  const ws = wb.addWorksheet('Registro');
  const alunni = alunniDi(stato, codice);
  titolo(ws, `REGISTRO DELLE PROVE · ${codice}`, 26);
  ws.getCell(2, 1).value = 'Livelli: 10 Ottimo · 9 Distinto · 8 Buono · 7 Discreto · 6 Sufficiente · 5 Non sufficiente   ·   Stato: AS assente · NV non valutabile · ES esonerato';
  let riga = 4;
  for (const g of giornateClasse(stato, codice).filter((x) => x.codici.length)) {
    const sos = g.codici.map((c) => sottoObiettivo(stato, cl.livello, c)).filter(Boolean);
    ws.mergeCells(riga, 1, riga, 4 + sos.length * 6);
    const t = ws.getCell(riga, 1);
    t.value = `${g.id}   ·   ${g.descrizione}   ·   ${g.data ? formatta(g.data, true) : 'data da fissare'}`;
    t.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    t.fill = fill(BLU);
    riga++;
    const h1 = ['N°', 'Alunno', 'Stato', 'Recuperata il'];
    const h2 = ['', '', '', ''];
    for (const so of sos) {
      h1.push(`${so.codice} ${so.etichetta}`, '', '', '', '', '');
      h2.push(...so.indicatori.map((i) => i.nome), 'VOTO', 'GIUDIZIO (Argo)');
    }
    intestazioni(ws, riga, h1, (i) => (i < 4 ? 'FFF2F2F2' : COLORI_NUCLEO[sos[Math.floor((i - 4) / 6)].nucleo]));
    intestazioni(ws, riga + 1, h2, (i) => (i < 4 ? 'FFF2F2F2' : COLORI_NUCLEO[sos[Math.floor((i - 4) / 6)].nucleo]));
    riga += 2;
    for (const a of alunni) {
      const regs = sos.map((so) => stato.registrazioni.find((r) => r.alunnoId === a.id && r.giornataId === g.id && r.sottoObiettivo === so.codice));
      const valori = [a.numero, a.cognomeNome, regs.find((r) => r?.stato)?.stato ?? '', regs.find((r) => r?.recuperataIl)?.recuperataIl ?? ''];
      for (const r of regs) {
        const v = votoRegistrazione(r);
        valori.push(...[0, 1, 2, 3].map((i) => r?.livelli?.[i] ?? ''), v ?? '', giudizioVoto(v, stato.impostazioni.scala));
      }
      ws.getRow(riga).values = valori;
      ws.getRow(riga).eachCell((c) => { c.border = bordo; });
      riga++;
    }
    riga++;
  }
  ws.getColumn(2).width = 28;
}

function foglioVerifica(wb, stato, codice) {
  const ws = wb.addWorksheet('Verifica voti');
  const giornate = giornateClasse(stato, codice);
  titolo(ws, `VERIFICA VOTI · ${codice} · una riga per alunno, una colonna per giornata (come su Argo)`, giornate.length + 2);
  intestazioni(ws, 3, ['N°', 'Alunno', ...giornate.map((g) => `${g.id}\n${g.data ? formatta(g.data).slice(0, 5) : '—'}`)]);
  verificaVoti(stato, codice).forEach(({ alunno: a, celle }, k) => {
    ws.getRow(4 + k).values = [a.numero, a.cognomeNome, ...giornate.map((g) => celle[g.id] || '')];
  });
  ws.getColumn(2).width = 28;
  for (let i = 3; i <= giornate.length + 2; i++) ws.getColumn(i).width = 22;
}

/** Excel completo di una classe: Riepilogo 1°Q e 2°Q, Registro, Verifica voti. */
export async function excelClasse(stato, codice) {
  const wb = await nuovoLibro();
  foglioRiepilogo(wb, stato, codice, 'Q1');
  foglioRiepilogo(wb, stato, codice, 'Q2');
  foglioRegistro(wb, stato, codice);
  foglioVerifica(wb, stato, codice);
  return wb.xlsx.writeBuffer();
}

/** Excel dei riepiloghi di tutte le classi per un quadrimestre (documento di valutazione). */
export async function excelRiepiloghi(stato, q) {
  const wb = await nuovoLibro();
  for (const c of stato.classi) {
    if (!alunniDi(stato, c.codice).length) continue;
    foglioRiepilogo(wb, stato, c.codice, q);
    wb.getWorksheet(`Riepilogo ${q}`).name = `${c.codice} ${q}`;
  }
  if (!wb.worksheets.length) wb.addWorksheet('Vuoto').getCell(1, 1).value = 'Nessun alunno inserito.';
  return wb.xlsx.writeBuffer();
}
