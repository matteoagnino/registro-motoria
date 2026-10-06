# Registro Motoria

Gestionale offline (PWA) per Educazione motoria: programmazione, prove, voti, giudizi, Giochi della Gioventù.
Nessun server, nessun account: i dati restano nel browser e nei file dell'utente. Guida d'uso: `MANUALE.md`.

## Sviluppo
```bash
npm install
npm run dev          # sviluppo
npm test             # test unitari (vitest)
npm run e2e          # test end-to-end (Playwright, Chromium)
npm run lint
npm run privacy-check  # obbligatorio prima di ogni commit (hook pre-commit)
npm run deploy       # build + GitHub Pages (solo codice)
```
Struttura: `src/calcolo` (motore puro) · `src/pianificazione` · `src/dati` (store, archivio, scambio) ·
`src/giochi` · `src/export` · `src/ui` (gestionale e campo) · `seed/` · `riferimenti/` (modelli Excel con soli dati d'esempio).

Nota macOS: se il progetto sta in una cartella sincronizzata con iCloud, tieni `node_modules` fuori
(es. symlink verso `~/Library/Caches/registro-motoria-deps/node_modules`) per evitare blocchi in lettura.
