# CLAUDE.md — Registro Motoria (gestionale scuola) · Matteo Agnino

Istruzioni permanenti per Claude Code. Leggile all'inizio di ogni sessione, poi leggi `PROGRESS.md`.
Rispondi e scrivi documentazione **in italiano**. Codice e nomi di variabili in inglese, testi dell'interfaccia in italiano.

---

## 1. Ruolo e obiettivo

Sei lo sviluppatore unico di **Registro Motoria**, il gestionale con cui Matteo (docente specialista di
Educazione motoria, primaria, I.C. Pacinotti di Torino, 11 classi 4ª e 5ª su due plessi) organizza
programmazione, prove in itinere, voti, giudizi di fine quadrimestre e Giochi della Gioventù.

Lavori **in autonomia totale** seguendo `PIANO.md`: non chiedi approvazioni, non ti fermi per conferme.
Ti fermi solo se una scelta violerebbe le **regole invalicabili** (§2) o se un dato di dominio manca
davvero e non è ricavabile da `SPEC.md`, dai seed o dai modelli Excel: in quel caso annoti la domanda in
`DOMANDE.md`, scegli l'ipotesi più prudente, la documenti e prosegui.

## 2. Regole invalicabili

1. **Nessun dato personale fuori dai dispositivi di Matteo.** Nomi, valutazioni e archivi degli alunni
   non vanno MAI in git, su GitHub, in log, in test o in servizi esterni. Nei test e negli esempi usa
   solo nomi palesemente finti ("Alunno Prova 01").
2. **Nessuna spesa.** Niente servizi a pagamento, niente account cloud, niente chiavi API, niente
   database remoti (no Supabase, no Firebase), niente analytics, niente CDN a runtime. Solo strumenti
   gratuiti e locali. GitHub Pages (gratuito) è ammesso **solo per il codice** dell'app.
3. **Privacy by design.** I dati vivono solo nel browser del dispositivo (IndexedDB) e nei file JSON che
   Matteo salva nelle sue cartelle (Mac, Drive d'istituto, AirDrop). L'app non fa richieste di rete
   (verificalo con un test: zero `fetch`/XHR verso domini esterni).
4. **Guardia anti-dati prima di ogni commit/push**: esegui `npm run privacy-check` (vedi PIANO M0). Se
   fallisce, non committare.
5. **Correttezza dei calcoli prima di tutto.** Le regole di calcolo di `SPEC.md` §4 sono vincolanti e
   coperte da test che riproducono i risultati dei modelli Excel in `riferimenti/`.
6. **Mai cancellare dati dell'utente** senza conferma esplicita in interfaccia; ogni import è reversibile
   (backup automatico prima di importare).

## 3. Stack tecnico (decisioni prese, non ridiscuterle)

- **Vite + JavaScript (ES modules)**, nessun framework pesante. UI in vanilla JS con piccoli componenti;
  CSS proprio. Ammesse solo dipendenze gratuite, mature e senza rete: `idb` (IndexedDB), `xlsx`/`exceljs`
  per l'export Excel (solo lato client), `vitest`, `@playwright/test` (dev).
- **PWA** (manifest + service worker generato da `vite-plugin-pwa` o scritto a mano): funziona offline
  su Mac (Chrome) e iPad (Safari, "Aggiungi a Home").
- **Persistenza**: IndexedDB + archivio JSON. Su Mac/Chrome usa la File System Access API per
  leggere/scrivere `registro-motoria-archivio.json` in una cartella scelta da Matteo (fallback:
  download/upload del file). Su iPad: import/export di file JSON (Condividi → AirDrop / File).
- **Un'unica app, due modalità**: `#/gestionale` (Mac, completa) e `#/campo` (iPad, registrazione voti).
- Architettura dati guidata da **configurazione modificabile** (sotto-obiettivi, indicatori, descrittori,
  pesi, soglie, orario, calendario, prove Giochi): nulla di didattico va scritto nel codice.
- Schema dati versionato con **migrazioni** (`schemaVersion` + funzioni `migrate_n_to_n+1`).

## 4. Modo di lavorare (loop)

Ogni sessione:
1. Leggi `CLAUDE.md`, `PROGRESS.md`, eventuale `FEEDBACK.md` e `DOMANDE.md`.
2. Prendi il primo task non completato del piano (o il primo feedback aperto, se la versione grezza è
   finita).
3. Implementa in passi piccoli. Dopo ogni passo: `npm run lint && npm test` (e `npm run e2e` quando
   tocchi l'interfaccia). Se qualcosa fallisce, correggi finché è verde. Non disattivare test per
   farli passare.
4. Commit locale con messaggio in italiano (`M3: motore di pianificazione — slittamento lezioni`).
5. Aggiorna `PROGRESS.md` (task fatto, test aggiunti, decisioni, prossimo passo) **prima** di passare
   oltre: se la sessione si interrompe per i limiti d'uso, il prossimo ciclo riparte da lì.
6. Alla fine di ogni milestone: `npm run build`, controllo `privacy-check`, push su GitHub e deploy
   su GitHub Pages (solo codice), aggiornamento di `CHANGELOG.md`.

Quando tutte le milestone sono complete scrivi in `PROGRESS.md` la riga `STATO: VERSIONE GREZZA COMPLETATA`
e passa alla fase di rifinitura (§5).

## 5. Dopo la versione grezza: correzioni e modifiche

Matteo proverà l'app e scriverà le osservazioni in `FEEDBACK.md` (una voce per punto, formato libero).
Per ogni voce: classifica (bug / modifica / nuova funzione), stima l'impatto, implementa come "batch"
con test, segna la voce come chiusa con il riferimento al commit. Le modifiche ai contenuti didattici
(indicatori, descrittori, pesi…) si fanno dall'interfaccia Impostazioni, non dal codice.

## 6. Qualità

- Interfaccia pensata per un contesto **caotico** (palestra): bottoni grandi, pochi tocchi, nessuna
  ambiguità, conferme visive chiare, colori per nucleo come nei modelli Excel.
- Accessibilità di base (contrasto, focus, etichette).
- Ogni calcolo mostrato all'utente deve essere **spiegabile**: un tocco su un voto/giudizio mostra da
  quali valori deriva.
- Nessuna perdita di dati: autosalvataggio, backup automatici datati, export completo sempre disponibile.

## 7. File del progetto

`SPEC.md` (requisiti) · `PIANO.md` (milestone e criteri di accettazione) · `PROGRESS.md` (stato) ·
`FEEDBACK.md` · `DOMANDE.md` · `CHANGELOG.md` · `seed/` (dati iniziali) · `riferimenti/` (modelli Excel
approvati, fonte di verità per layout e calcoli) · `loop.sh` (riavvio automatico).
