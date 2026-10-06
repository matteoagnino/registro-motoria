// M8: backup e ripristino dell'archivio.
import { test, expect } from '@playwright/test';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apri, aggiungiAlunni, scaricaTesto } from './aiuti.js';

test('scarico l\'archivio, modifico, ricarico l\'archivio: torna com\'era (con backup del precedente)', async ({ page }) => {
  await aggiungiAlunni(page, '5CM', ['Alunno Prova 01', 'Alunno Prova 02']);
  await apri(page, '#/gestionale/scambio');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Scarica archivio (.json)' }).click()]);
  const file = join(mkdtempSync(join(tmpdir(), 'rm-arch-')), 'test-archivio.json');
  writeFileSync(file, await scaricaTesto(dl));

  await apri(page, '#/gestionale/classi?classe=5CM');
  await page.getByPlaceholder('Cognome Nome').fill('Alunno Prova 03');
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(3);

  await apri(page, '#/gestionale/scambio');
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Carica archivio da file…' }).click()]);
  await fc.setFiles(file);
  await expect(page.getByRole('dialog')).toContainText('2 alunni');
  await page.getByRole('button', { name: 'Sostituisci' }).click();
  await apri(page, '#/gestionale/classi?classe=5CM');
  await expect(page.locator('tbody tr')).toHaveCount(2);

  // il registro precedente (3 alunni) è tra i backup e si può ripristinare
  await apri(page, '#/gestionale/scambio');
  const riga = page.locator('tr', { hasText: 'prima di caricare' }).first();
  await riga.getByRole('button', { name: 'Ripristina' }).click();
  await page.getByRole('button', { name: 'Sostituisci' }).click();
  await apri(page, '#/gestionale/classi?classe=5CM');
  await expect(page.locator('tbody tr')).toHaveCount(3);
});
