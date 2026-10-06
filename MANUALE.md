# Manuale — Registro Motoria (versione grezza)

## 1. Avviare l'app sul Mac (senza internet e senza spese)
Finché GitHub Pages non è attivo (vedi DOMANDE D1) l'app si usa in locale:
```bash
cd ~/Desktop/WORKSPACE/registro-motoria
npm run build && npm run preview
```
Apri **Chrome** su `http://localhost:4173` → **Gestionale**. Chrome: menu ⋮ → «Installa Registro Motoria»
per averla come app nel Dock. Quando sarà su GitHub Pages basterà aprire l'indirizzo della pagina.

## 2. Installarla sull'iPad
Serve un indirizzo https (GitHub Pages): apri l'indirizzo in **Safari** → Condividi → **Aggiungi a Home**.
Apri l'app una volta con la rete: da quel momento funziona **offline** anche in palestra.
Scegli **Campo**.

## 3. Primo avvio sul Mac
1. **Classi e alunni** → per ogni classe «Incolla elenco…» (un alunno per riga): ordine alfabetico, numeri fissi.
   Nuovi alunni → in coda. Chi lascia → Stato «Ritirato» (non si cancella). OP → spunta e «Obiettivi…».
2. **Import/Export → Scegli cartella archivio**: consigliata la cartella del Drive d'istituto sincronizzata sul Mac.
   Da quel momento il file `registro-motoria-archivio.json` si aggiorna da solo (più copie datate in `backup/`).
3. **Impostazioni → Calendario**: controlla chiusure, ponti e la settimana «Venerdì 1» della 5B Boncompagni.
4. **Calendario**: aggiungi le giornate di prova (Q1-G04…) con al massimo 4 sotto-obiettivi per livello e,
   se serve, la settimana per plesso. La colonna «Controllo» segnala la regola dei 9 giorni.

## 4. Flusso AirDrop (Mac ↔ iPad)
1. Mac: **Import/Export → Crea pacchetto classe** → si scarica `pacchetto_….rmpack.json` → AirDrop all'iPad (salva in File).
2. iPad: **Campo → Importa pacchetto classe** → scegli il file.
3. In palestra: classe (quella di oggi è evidenziata) → giornata (preselezionata) → per ogni alunno tocca 10–5 su
   ogni indicatore. **Tocco lungo** su un numero = descrittore. Tocca di nuovo un numero scelto per toglierlo.
   AS/NV/ES in alto a destra. In basso i numeri degli alunni: verde = fatto, giallo = incompleto, rosso = assente.
4. A fine giornata: **Esporta** → «Esporta e condividi (AirDrop)» → al Mac.
5. Mac: **Import/Export → Importa file voti**. Lo stesso file reimportato non crea doppioni; se un voto è stato
   cambiato vedi «prima/dopo» e scegli se accettarlo. Prima di ogni import viene fatto un backup.

## 5. Fine quadrimestre
**Riepilogo**: rubrica di processo (gialla), avvisi, giudizio definitivo (tuo, prevale). Tocca un valore per vedere
il calcolo. **Verifica voti** per il confronto con Argo. **Import/Export → Excel** per il documento di valutazione.

## 6. Lezioni saltate, gite, progetti
**Calendario** → nella tabella delle lezioni della classe «Lezione saltata…» con il motivo: la sequenza della sola
classe slitta; i 2 cuscinetti di fine quadrimestre assorbono gli slittamenti, poi compare un avviso.
Le date del progetto basket Boncompagni si inseriscono in Calendario → Progetti.

## 7. Backup e ripristino
- Nel browser: uno al giorno + uno prima di ogni import/ripristino (ultimi 20) → Import/Export → «Ripristina».
- Su file: cartella archivio (automatico) o «Scarica archivio». Per spostarti su un altro Mac: «Carica archivio da file…».
- I file `.rmpack.json`, `.rmvoti.json`, archivi ed Excel contengono dati degli alunni: tienili solo nelle tue cartelle.

## 8. Giochi della Gioventù
**Giochi** → classe e rilevazione → tempi Super Gym (con calcolatore penalità «+»), ostacoli, prove di squadra per
gruppi, fair play. «Classifiche e proposta» mostra classifiche separate 4ª/5ª (punti 8…1) e la classe da iscrivere;
«Archivia nello storico» alimenta lo storico pluriennale.
