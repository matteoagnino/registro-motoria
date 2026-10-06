// M5: modalità campo (viewport iPad, offline) e scambio file con il gestionale.
import { test, expect } from '@playwright/test';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apri, aggiungiAlunni, sorvegliaRete, scaricaTesto } from './aiuti.js';

const cartella = mkdtempSync(join(tmpdir(), 'rm-e2e-'));

async function scarica(page, azione, nome) {
  const [dl] = await Promise.all([page.waitForEvent('download'), azione()]);
  const percorso = join(cartella, nome);
  writeFileSync(percorso, await scaricaTesto(dl));
  return percorso;
}

async function scegliFile(page, azione, percorso) {
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), azione()]);
  await fc.setFiles(percorso);
}

async function tocca(page, numero, so, ind, livello) {
  await page.getByLabel(`${numero} ${so} I${ind} livello ${livello}`, { exact: true }).click();
}

test('pacchetto → registrazione offline → file voti → import idempotente e modifiche', async ({ page, context }) => {
  const esterne = sorvegliaRete(page);
  await aggiungiAlunni(page, '4BM');

  // Mac: pacchetto classe
  await apri(page, '#/gestionale/scambio');
  const pacchetto = await scarica(page, () => page.getByRole('button', { name: 'Crea pacchetto classe' }).click(), 'test.rmpack.json');

  // iPad: offline (dopo che il service worker ha messo in cache l'app)
  await apri(page, '#/campo/home');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Registro Motoria · Campo' })).toBeVisible();
  await scegliFile(page, () => page.getByRole('button', { name: 'Importa pacchetto classe' }).click(), pacchetto);
  await expect(page.getByRole('heading', { name: 'Scegli la classe' })).toBeVisible();
  await page.getByRole('link', { name: /4BM/ }).click();
  await page.getByRole('link', { name: /Q1-G03/ }).click();
  await expect(page.locator('.contatore')).toHaveText('Registrati 0/3 · mancano 3');

  for (const [i, l] of [[1, 8], [2, 7], [3, 8], [4, 7]]) await tocca(page, 1, '1.1', i, l);
  for (const [i, l] of [[1, 7], [2, 7], [3, 8], [4, 7]]) await tocca(page, 1, '1.2', i, l);
  for (const [i, l] of [[1, 9], [2, 9], [3, 8], [4, 9]]) await tocca(page, 1, 'TEC.1', i, l);
  await expect(page.getByLabel('Voto 1.1').first()).toHaveText('8 Buono');
  await expect(page.getByLabel('Voto 1.2').first()).toHaveText('7 Discreto');
  // descrittore con tocco lungo
  const b = page.getByLabel('1 1.1 I1 livello 8', { exact: true });
  await b.hover();
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  await expect(page.locator('.descrittore')).toContainText('8 Buono:');
  await expect(b).toHaveAttribute('aria-pressed', 'true');

  for (const so of ['1.1', '1.2', 'TEC.1']) await tocca(page, 2, so, 1, 10);
  await page.locator('#alunno-3').getByRole('button', { name: 'AS' }).click();
  await expect(page.locator('.contatore')).toHaveText('Registrati 3/3 · mancano 0');
  // bottoni grandi per la palestra
  const box = await b.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);

  await page.getByRole('link', { name: 'Esporta' }).click();
  const voti1 = await scarica(page, () => page.getByRole('button', { name: 'Esporta e condividi (AirDrop)' }).click(), 'v1.rmvoti.json');
  await context.setOffline(false);

  // Mac: import
  await apri(page, '#/gestionale/scambio');
  await scegliFile(page, () => page.getByRole('button', { name: 'Importa file voti…' }).click(), voti1);
  await expect(page.getByRole('dialog')).toContainText('9 registrazioni nuove');
  await page.getByRole('button', { name: 'Importa', exact: true }).click();
  await apri(page, '#/gestionale/verifica?classe=4BM');
  await expect(page.locator('tbody tr').nth(0)).toContainText('1.1: 8 · 1.2: 7 · TEC.1: 9');
  await expect(page.locator('tbody tr').nth(1)).toContainText('1.1: 10 · 1.2: 10 · TEC.1: 10');
  await expect(page.locator('tbody tr').nth(2)).toContainText('AS da recuperare');

  // stesso file: nessun duplicato
  await apri(page, '#/gestionale/scambio');
  await scegliFile(page, () => page.getByRole('button', { name: 'Importa file voti…' }).click(), voti1);
  await expect(page.getByRole('dialog')).toContainText('0 registrazioni nuove');
  await expect(page.getByRole('dialog')).toContainText('9 già presenti e identiche');
  await page.getByRole('button', { name: 'Importa', exact: true }).click();

  // modifica successiva sull'iPad → segnalata come modifica
  await apri(page, '#/campo/registra/4BM/Q1-G03');
  await tocca(page, 1, '1.1', 1, 10);
  await apri(page, '#/campo/esporta');
  await expect(page.getByText('1 registrazioni')).toBeVisible();
  const voti2 = await scarica(page, () => page.getByRole('button', { name: 'Esporta e condividi (AirDrop)' }).click(), 'v2.rmvoti.json');
  await apri(page, '#/gestionale/scambio');
  await scegliFile(page, () => page.getByRole('button', { name: 'Importa file voti…' }).click(), voti2);
  await expect(page.getByRole('dialog')).toContainText('1 modifiche da confermare');
  await expect(page.getByRole('dialog').locator('tbody tr')).toContainText('[8 7 8 7]');
  await expect(page.getByRole('dialog').locator('tbody tr')).toContainText('[10 7 8 7]');
  await page.getByRole('button', { name: 'Importa', exact: true }).click();
  await apri(page, '#/gestionale/registro?classe=4BM&g=Q1-G03');
  await expect(page.getByLabel('1 1.1 I1', { exact: true })).toHaveValue('10');
  expect(esterne).toEqual([]);
});
