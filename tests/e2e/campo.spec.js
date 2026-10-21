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
  const corrente = page.locator('.nav-alunni [aria-current="true"]');
  await expect(corrente).toHaveText('1');
  // i cerchi degli alunni ancora da registrare restano piccoli (44 px), senza lo stile dei riquadri vuoti
  expect((await page.locator('.nav-alunni a').nth(1).boundingBox()).width).toBeLessThan(50);
  await expect(page.locator('#alunno-2')).toHaveClass(/da-fare/);

  for (const [i, l] of [[1, 8], [2, 7], [3, 8], [4, 7]]) await tocca(page, 1, '1.1', i, l);
  for (const [i, l] of [[1, 7], [2, 7], [3, 8], [4, 7]]) await tocca(page, 1, '1.2', i, l);
  for (const [i, l] of [[1, 9], [2, 9], [3, 8], [4, 9]]) await tocca(page, 1, 'TEC.1', i, l);
  await expect(page.getByLabel('Voto 1.1').first()).toHaveText('8 Buono');
  await expect(page.getByLabel('Voto 1.2').first()).toHaveText('7 Discreto');
  // completato il n. 1 si passa da soli al n. 2: cerchio più grande con il nome sotto
  await expect(corrente).toHaveText('2');
  await expect(corrente).toHaveAttribute('data-nome', /Alunno Prova/);
  expect((await corrente.boundingBox()).width).toBeGreaterThan((await page.locator('.nav-alunni a').first().boundingBox()).width);
  // descrittore con tocco lungo
  const b = page.getByLabel('1 1.1 I1 livello 8', { exact: true });
  await b.hover();
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  await expect(page.locator('.descrittore')).toContainText('8 Buono:');
  await expect(b).toHaveAttribute('aria-pressed', 'true');

  // il tocco su un alunno lo rende attivo
  await tocca(page, 3, '1.1', 1, 9);
  await expect(corrente).toHaveText('3');
  await tocca(page, 3, '1.1', 1, 9);
  for (const so of ['1.1', '1.2', 'TEC.1']) await tocca(page, 2, so, 1, 10);
  await page.locator('#alunno-3').getByRole('button', { name: 'AS' }).click();
  await expect(page.locator('.contatore')).toHaveText('Registrati 3/3 · mancano 0');
  await expect(page.locator('#alunno-3 .livelli')).toHaveCount(0);
  await expect(page.locator('#alunno-3').getByRole('button', { name: 'Recupera oggi' })).toBeVisible();
  // elenco della classe a lato: si sceglie un alunno preciso e si resta lì (movimento libero)
  const elenco = page.getByRole('complementary', { name: 'Elenco della classe' });
  await expect(elenco.getByRole('button')).toHaveCount(3);
  await expect(elenco.getByRole('button', { name: /^3 Alunno Prova 03, assente/ })).toBeVisible();
  await elenco.getByRole('button', { name: /^1 Alunno Prova 01/ }).click();
  await expect(corrente).toHaveText('1');
  await expect(elenco.locator('[aria-current="true"]')).toContainText('Alunno Prova 01');
  await expect(elenco).toContainText('Scelta libera');
  // bottoni grandi per la palestra
  const box = await b.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);

  await page.getByRole('link', { name: 'Esporta' }).click();
  const voti1 = await scarica(page, () => page.getByRole('button', { name: 'Esporta e condividi (AirDrop)' }).click(), 'v1.rmvoti.json');
  await context.setOffline(false);

  // Mac: import
  await apri(page, '#/gestionale/scambio');
  await scegliFile(page, () => page.getByRole('button', { name: 'Importa file voti a mano…' }).click(), voti1);
  await expect(page.getByRole('dialog')).toContainText('9 registrazioni nuove');
  await page.getByRole('button', { name: 'Importa', exact: true }).click();
  await apri(page, '#/gestionale/verifica?classe=4BM');
  await expect(page.locator('tbody tr').nth(0)).toContainText('1.1: 8 · 1.2: 7 · TEC.1: 9');
  await expect(page.locator('tbody tr').nth(1)).toContainText('1.1: 10 · 1.2: 10 · TEC.1: 10');
  await expect(page.locator('tbody tr').nth(2)).toContainText('AS da recuperare');

  // stesso file: nessun duplicato
  await apri(page, '#/gestionale/scambio');
  await scegliFile(page, () => page.getByRole('button', { name: 'Importa file voti a mano…' }).click(), voti1);
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
  await scegliFile(page, () => page.getByRole('button', { name: 'Importa file voti a mano…' }).click(), voti2);
  await expect(page.getByRole('dialog')).toContainText('1 modifiche da confermare');
  await expect(page.getByRole('dialog').locator('tbody tr')).toContainText('[8 7 8 7]');
  await expect(page.getByRole('dialog').locator('tbody tr')).toContainText('[10 7 8 7]');
  await page.getByRole('button', { name: 'Importa', exact: true }).click();
  await apri(page, '#/gestionale/registro?classe=4BM&g=Q1-G03');
  await expect(page.getByLabel('1 1.1 I1', { exact: true })).toHaveValue('10');

  // recupero dell'assente sull'iPad: il voto si registra nel giorno del recupero
  await apri(page, '#/campo/registra/4BM/Q1-G03');
  await page.locator('#alunno-3').getByRole('button', { name: 'Recupera oggi' }).click();
  await expect(page.locator('#alunno-3')).toContainText('Prova recuperata il');
  await tocca(page, 3, '1.1', 1, 9);
  await expect(page.getByLabel('3 1.1 I1 livello 9', { exact: true })).toHaveAttribute('aria-pressed', 'true');
  // «Annulla» dopo un tocco sbagliato
  await tocca(page, 3, '1.1', 2, 5);
  await page.locator('#toast').getByRole('button', { name: 'Annulla' }).click();
  await expect(page.getByLabel('3 1.1 I2 livello 5', { exact: true })).toHaveAttribute('aria-pressed', 'false');

  // Cronometro Giochi: VIA/STOP, una penalità, salvataggio, export e arrivo sul Mac
  await apri(page, '#/campo/giochi/4BM/supergym/1');
  await expect(page.locator('#crono-display')).toHaveText('00:00,00');
  await page.getByRole('button', { name: 'Via' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.locator('#crono-display')).not.toHaveText('00:00,00');
  await page.getByRole('button', { name: 'Aggiungi 1 Catena umana Rottura della presa tra i compagni (ogni volta)' }).click();
  await expect(page.locator('.penalita h3')).toContainText('+5 s');
  await page.getByRole('button', { name: 'SALVA E AVANTI' }).click();
  await expect(page.getByRole('link', { name: 'Alunno 1' })).toHaveClass(/completo/);
  await apri(page, '#/campo/esporta');
  const voti3 = await scarica(page, () => page.getByRole('button', { name: 'Esporta e condividi (AirDrop)' }).click(), 'v3.rmvoti.json');
  await apri(page, '#/gestionale/scambio');
  await scegliFile(page, () => page.getByRole('button', { name: 'Importa file voti a mano…' }).click(), voti3);
  await expect(page.getByRole('dialog')).toContainText('Giochi: 1 tempi nuovi');
  await page.getByRole('button', { name: 'Importa', exact: true }).click();
  await apri(page, '#/gestionale/giochi?classe=4BM');
  await expect(page.getByLabel('Penalità 1')).toHaveValue('5');
  expect(Number(await page.getByLabel('Super Gym 1').inputValue())).toBeGreaterThan(0.3);
  expect(esterne).toEqual([]);
});
