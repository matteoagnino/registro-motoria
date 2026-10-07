import { test, expect } from '@playwright/test';
import ExcelJS from 'exceljs';
import { apri, aggiungiAlunni, livelli, sorvegliaRete, scaricaTesto, NOMI } from './aiuti.js';

test('M2: creo una classe di prova con 3 alunni finti', async ({ page }) => {
  const esterne = sorvegliaRete(page);
  await apri(page, '#/gestionale/classi');
  await page.getByRole('button', { name: 'Nuova classe…' }).click();
  await page.locator('input[name=codice]').fill('4ZZ');
  await page.getByRole('button', { name: 'Crea classe' }).click();
  await expect(page.getByRole('heading', { name: /4ZZ · classe 4ª/ })).toBeVisible();
  for (const n of NOMI) {
    await page.getByPlaceholder('Cognome Nome').fill(n);
    await page.getByRole('button', { name: 'Aggiungi', exact: true }).click();
  }
  const righe = page.locator('tbody tr');
  await expect(righe).toHaveCount(3);
  await expect(righe.nth(2).locator('td').first()).toHaveText('3');
  // Ritirato non cancella
  await page.getByLabel('Stato alunno 2').selectOption('Ritirato');
  await expect(righe).toHaveCount(3);
  await expect(page.getByLabel('Stato alunno 2')).toHaveValue('Ritirato');
  await expect(page.locator('.salvataggio')).toContainText('✓ salvato');
  await page.reload();
  await expect(page.getByLabel('Stato alunno 2')).toHaveValue('Ritirato');
  expect(esterne).toEqual([]);
});

test('M2: la modifica di un descrittore si riflette nelle rubriche', async ({ page }) => {
  await apri(page, '#/gestionale/impostazioni?sez=sotto&liv=4&so=1.1&ind=0');
  const area = page.getByLabel('Descrittore Ottimo indicatore 1');
  await area.fill('Descrittore modificato di prova');
  await area.blur();
  await apri(page, '#/gestionale/rubriche?liv=4&so=1.1');
  await expect(page.getByText('Descrittore modificato di prova')).toBeVisible();
});

test('M4: i dati del modello Excel classe 4 danno gli stessi voti, medie e giudizi; export Excel valido', async ({ page }) => {
  const esterne = sorvegliaRete(page);
  await aggiungiAlunni(page, '4BM', ['Alunno Prova 01 (esempio)', 'Alunno Prova 02 (esempio)', 'Alunno Prova 03 (esempio)']);
  // 2 = OP, 3 = ES come nel modello
  await page.locator('tbody tr').nth(1).getByRole('checkbox').check();
  await page.getByLabel('Stato alunno 3').selectOption('ES');

  await apri(page, '#/gestionale/registro?classe=4BM&g=Q1-G01');
  await livelli(page, 1, '1.1', [8, 8, 7]);
  await livelli(page, 2, '1.1', [7, 7]);
  await expect(page.locator('tbody tr').first().locator('td.calc').first()).toHaveText('8');
  await expect(page.locator('tbody tr').first().locator('td.calc').nth(1)).toHaveText('Buono');

  await apri(page, '#/gestionale/registro?classe=4BM&g=Q1-G02');
  await livelli(page, 1, '3.1', [8, 9, 8, 8]);
  await livelli(page, 1, '3.2', [8, 8, 9, 8]);
  await livelli(page, 2, '3.1', [9, 9, 9, 8]);
  await livelli(page, 2, '3.2', [8, 8, 8, 8]);

  await apri(page, '#/gestionale/registro?classe=4BM&g=Q1-G03');
  await expect(page.getByText('lunedì 02/11/2026')).toBeVisible();
  await livelli(page, 1, '1.1', [8, 7, 8, 7]);
  await livelli(page, 1, '1.2', [7, 7, 8, 7]);
  await livelli(page, 1, 'TEC.1', [9, 9, 8, 9]);
  await page.getByLabel('Stato 2').selectOption('AS');
  const r1 = page.locator('tbody tr').first().locator('td.calc');
  await expect(r1).toHaveText(['8', 'Buono', '7', 'Discreto', '9', 'Distinto']);

  await apri(page, '#/gestionale/riepilogo?classe=4BM&q=Q1');
  const riga1 = page.locator('tbody tr').nth(0);
  const riga2 = page.locator('tbody tr').nth(1);
  const riga3 = page.locator('tbody tr').nth(2);
  await expect(riga1.locator('td.valore b')).toHaveText(['7,67', '8', '9', '—']);
  await expect(riga1.locator('td.finale .pill')).toHaveText(['Buono', 'Buono', 'Distinto', '—']);
  await expect(riga2.locator('td.valore b').first()).toHaveText('7');
  await expect(riga2.locator('td.finale .pill')).toHaveText(['Discreto', 'Distinto', '—', '—']);
  await expect(riga2.locator('td.avvisi')).toHaveAttribute('title', 'Pochi voti: valutazione alternativa (scritta/orale). Da recuperare: 1. Riferito agli obiettivi personalizzati.');
  await expect(riga3.locator('td.msg-riga')).toHaveText('Esonerato: concordare con referente e dirigente · da riportare: ES');

  // rubrica di processo 8 → A = 7,74
  await page.getByLabel('Rubrica di processo alunno 1').selectOption('8');
  await expect(riga1.locator('td.valore b').first()).toHaveText('7,74');
  await page.getByRole('button', { name: 'Calcolo A alunno 1' }).click();
  await expect(page.getByRole('dialog')).toContainText('0,8×7,67 + 0,2×8');
  await page.keyboard.press('Escape');

  // giudizio definitivo prevale (contrassegnato come tuo)
  await page.getByRole('button', { name: 'Giudizio A alunno 1' }).click();
  await page.getByRole('dialog').getByLabel('Giudizio definitivo').selectOption('Distinto');
  await page.getByRole('button', { name: 'Salva', exact: true }).click();
  await expect(riga1.locator('td.finale .pill').first()).toHaveText('Distinto✎');
  await expect(riga1.locator('td.finale').first()).toContainText('calc. Buono');

  await apri(page, '#/gestionale/verifica?classe=4BM');
  await expect(page.locator('tbody tr').first()).toContainText('1.1: 8 · 1.2: 7 · TEC.1: 9');
  await expect(page.locator('tbody tr').nth(1)).toContainText('AS da recuperare');

  // Export Excel
  await apri(page, '#/gestionale/scambio');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Excel della classe/ }).click()]);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await scaricaTesto(dl));
  expect(wb.worksheets.map((w) => w.name)).toEqual(['Riepilogo Q1', 'Riepilogo Q2', 'Registro', 'Verifica voti']);
  const ws = wb.getWorksheet('Riepilogo Q1');
  const intest = ws.getRow(3).values;
  const col = (nome) => intest.indexOf(nome);
  expect(ws.getRow(4).getCell(col('Ob. A media')).value).toBe(7.67);
  expect(ws.getRow(4).getCell(col('Ob. A valore')).value).toBe(7.74);
  expect(ws.getRow(4).getCell(col('DA RIPORTARE Ob. A')).value).toBe('Distinto');
  expect(ws.getRow(4).getCell(col('DA RIPORTARE Tecnologia')).value).toBe('Distinto');
  expect(esterne).toEqual([]);
});

test('M3: una lezione saltata fa slittare la sequenza della sola classe', async ({ page }) => {
  await apri(page, '#/gestionale/calendario?classe=4BM');
  const riga = page.locator('tr', { hasText: 'lunedì 02/11/2026' });
  await riga.getByRole('button', { name: 'Lezione saltata…' }).click();
  await page.getByRole('button', { name: 'Segna come saltata' }).click();
  await expect(page.locator('tr', { hasText: 'Q1-G03' }).first()).toContainText('09/11/2026');
  await expect(page.locator('tr', { hasText: 'lunedì 02/11/2026' })).toContainText('Uscita didattica');
  await apri(page, '#/gestionale/calendario?classe=4CM');
  await expect(page.locator('tr', { hasText: 'Q1-G03' }).first()).toContainText('02/11/2026');
});

test('M7: griglia di stampa e accessibilità di base', async ({ page }) => {
  await aggiungiAlunni(page, '5AM');
  await apri(page, '#/gestionale/registro?classe=5AM&g=Q1-G01&stampa=1');
  await expect(page.locator('table')).toContainText('Alunno Prova 02');
  await page.getByLabel('Mostra i nomi').uncheck();
  await expect(page.locator('table')).not.toContainText('Alunno Prova 02');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('nav.menu')).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  // controlli senza etichetta accessibile
  const senzaEtichetta = await page.evaluate(() => [...document.querySelectorAll('select, input, button, textarea')]
    .filter((el) => !(el.getAttribute('aria-label') || el.labels?.length || el.textContent.trim() || el.title)).length);
  expect(senzaEtichetta).toBe(0);
});
