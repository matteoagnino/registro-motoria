// Sincronizzazione diretta Mac ↔ iPad: due browser separati collegati via WebRTC sulla rete locale.
// I QR si «leggono» con il campo «Inserisci il codice a mano» (la fotocamera di prova non inquadra nulla).
import { test, expect, devices } from '@playwright/test';
import { apri, aggiungiAlunni, sorvegliaRete } from './aiuti.js';

async function inserisciCodice(page, codice) {
  await page.getByText('Problemi con la fotocamera? Inserisci il codice a mano').click();
  await page.getByLabel('Codice di collegamento').fill(codice);
  await page.getByRole('button', { name: 'Usa questo codice' }).click();
}

test('Mac e iPad si sincronizzano nei due sensi con due QR', async ({ browser }) => {
  const contestoMac = await browser.newContext({ ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, baseURL: 'http://localhost:4173/' });
  const contestoIpad = await browser.newContext({ ...devices['iPad (gen 7) landscape'], baseURL: 'http://localhost:4173/' });
  await contestoMac.grantPermissions(['camera']);
  await contestoIpad.grantPermissions(['camera']);
  const mac = await contestoMac.newPage();
  const ipad = await contestoIpad.newPage();
  const esterneMac = sorvegliaRete(mac);
  const esterneIpad = sorvegliaRete(ipad);

  await aggiungiAlunni(mac, '4BM');

  // 1ª sincronizzazione: iPad vuoto → riceve tutte le classi
  await apri(ipad, '#/campo/home');
  await expect(ipad.getByRole('heading', { name: 'Nessuna classe su questo iPad' })).toBeVisible();
  await ipad.getByRole('link', { name: 'Sincronizza con il Mac' }).click();
  await expect(ipad.getByRole('heading', { name: 'Inquadra il codice sul Mac' })).toBeVisible();

  await apri(mac, '#/gestionale/scambio');
  await mac.getByRole('button', { name: 'Sincronizza con l\'iPad' }).click();
  const qrMac = mac.locator('figure.qr');
  await expect(qrMac).toBeVisible({ timeout: 15000 });
  await expect(mac.getByRole('img', { name: 'Codice del Mac' })).toBeVisible();
  const codiceMac = await qrMac.getAttribute('data-codice');
  expect(codiceMac).toMatch(/^RM1~o~/);

  await inserisciCodice(ipad, codiceMac);
  const qrIpad = ipad.locator('figure.qr');
  await expect(qrIpad).toBeVisible({ timeout: 15000 });
  const codiceIpad = await qrIpad.getAttribute('data-codice');
  expect(codiceIpad).toMatch(/^RM1~a~/);

  await inserisciCodice(mac, codiceIpad);
  await expect(mac.getByRole('dialog')).toContainText('Sincronizzazione completata', { timeout: 30000 });
  await expect(ipad.getByText('Sincronizzazione completata')).toBeVisible({ timeout: 30000 });
  await expect(ipad.locator('.sincro')).toContainText('Ricevute dal Mac: 11 classi aggiornate');

  // l'iPad ora ha le classi: registra un voto
  await ipad.getByRole('link', { name: 'Torna alle classi' }).click();
  await ipad.getByRole('link', { name: /4BM/ }).click();
  await ipad.getByRole('link', { name: /Q1-G03/ }).click();
  for (const [i, l] of [[1, 8], [2, 7], [3, 8], [4, 7]]) await ipad.getByLabel(`1 1.1 I${i} livello ${l}`, { exact: true }).click();

  // 2ª sincronizzazione: il voto arriva sul Mac, all'iPad tornano solo le sue classi
  await mac.getByRole('dialog').getByRole('button', { name: 'Chiudi', exact: true }).last().click();
  await ipad.goto('/#/campo/home');
  await ipad.getByRole('link', { name: 'Sincronizza', exact: true }).click();
  await mac.getByRole('button', { name: 'Sincronizza con l\'iPad' }).click();
  await expect(qrMac).toBeVisible({ timeout: 15000 });
  await inserisciCodice(ipad, await qrMac.getAttribute('data-codice'));
  await expect(qrIpad).toBeVisible({ timeout: 15000 });
  await inserisciCodice(mac, await qrIpad.getAttribute('data-codice'));
  await expect(mac.getByRole('dialog')).toContainText('Dall\'iPad: 1 voti e tempi nuovi', { timeout: 30000 });
  await expect(ipad.locator('.sincro')).toContainText('Inviati al Mac: 1 voti e tempi (1 nuovi)', { timeout: 30000 });
  await expect(ipad.locator('.sincro')).toContainText('11 classi aggiornate');

  await apri(mac, '#/gestionale/registro?classe=4BM&g=Q1-G03');
  await expect(mac.getByLabel('1 1.1 I1', { exact: true })).toHaveValue('8');

  expect(esterneMac).toEqual([]);
  expect(esterneIpad).toEqual([]);
  await contestoMac.close();
  await contestoIpad.close();
});
