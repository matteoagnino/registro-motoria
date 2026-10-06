// Aiuti comuni per i test e2e. Solo nomi palesemente finti.
import { expect } from '@playwright/test';

export const NOMI = ['Alunno Prova 01', 'Alunno Prova 02', 'Alunno Prova 03'];

/** Registra tutte le richieste e fallisce se qualcuna esce da localhost. */
export function sorvegliaRete(page) {
  const esterne = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (!['localhost', '127.0.0.1'].includes(u.hostname) && !['data:', 'blob:'].includes(u.protocol)) esterne.push(r.url());
  });
  return esterne;
}

export async function apri(page, hash) {
  await page.goto(`/${hash}`);
  await expect(page.locator('#app')).not.toContainText('Caricamento');
}

export async function aggiungiAlunni(page, classe, nomi = NOMI) {
  await apri(page, `#/gestionale/classi?classe=${classe}`);
  for (const n of nomi) {
    await page.getByPlaceholder('Cognome Nome').fill(n);
    await page.getByRole('button', { name: 'Aggiungi', exact: true }).click();
  }
  await expect(page.locator('tbody tr')).toHaveCount(nomi.length);
}

/** Imposta i livelli di un sotto-obiettivo nel registro del gestionale. */
export async function livelli(page, numero, so, valori) {
  for (let i = 0; i < valori.length; i++) {
    if (valori[i] == null) continue;
    await page.getByLabel(`${numero} ${so} I${i + 1}`, { exact: true }).selectOption(String(valori[i]));
  }
}

export async function scaricaTesto(download) {
  const stream = await download.createReadStream();
  const pezzi = [];
  for await (const p of stream) pezzi.push(p);
  return Buffer.concat(pezzi);
}
