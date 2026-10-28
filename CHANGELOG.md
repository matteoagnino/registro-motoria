# CHANGELOG

## 0.9.1 — recupero anche per gli infortunati (2026-10-28)
- Registro (Mac e iPad): per l'alunno infortunato (INF), come per l'assente, si segna il giorno in cui ha
  recuperato la prova («Recuperata il» sul Mac; «Recupera oggi» o un altro giorno sull'iPad). Fino ad allora
  i livelli sono bloccati e la prova è «da recuperare»; poi si registrano i livelli e il voto pesa alla data
  del recupero.

## 0.9.0 — infortunio, data di recupero, classi in ordine (2026-10-27)
- Registro (Mac e iPad): nuovo stato «INF» (Infortunio) tra chi è senza voto, con la durata: < 7 giorni
  (1 settimana), > 7, > 14, > 21, > 28 giorni oppure un periodo personalizzato (dal… al…). Nessun voto per
  quella prova; l'alunno conta come registrato e non finisce tra i «da recuperare». Compare in Verifica voti
  e nell'export Excel.
- Assenti: sull'iPad oltre a «Recupera oggi» si può scegliere il giorno del recupero; sul Mac la colonna si
  chiama «Recupero / durata» e il campo è etichettato «Recuperata il».
- Classi sempre in ordine: prima Boncompagni poi Manzoni, prima le quarte poi le quinte.
- Cambio classe con un tocco: sul Mac un bottone per classe (raggruppati per plesso) al posto dell'elenco a
  tendina; sull'iPad una striscia di classi in alto che porta alla stessa giornata dell'altra classe.

## 0.8.2 — settimana a griglia oraria (2026-10-21)
- Mac, Settimana: le lezioni sono disposte come in un orario scolastico, una riga per fascia oraria
  (orario a sinistra) e una colonna per giorno: le lezioni con lo stesso orario stanno sulla stessa riga.
  Giorni di chiusura tratteggiati, colonna di oggi evidenziata.

## 0.8.1 — elenco della classe fermo (2026-10-21)
- iPad: l'elenco della classe a lato non scorre più da solo quando cambia l'alunno attivo (i nomi restano
  fermi e leggibili); l'alunno attivo è solo evidenziato. L'elenco si scorre solo con il dito.

## 0.8.0 — sincronizzazione diretta Mac ↔ iPad (2026-10-20)
- Mac: Import/Export → «Sincronizza con l'iPad». iPad: «Sincronizza» nella schermata delle classi.
- Si inquadrano due QR (l'iPad legge quello del Mac, il Mac legge quello dell'iPad con la sua fotocamera):
  in un colpo solo i voti e i tempi dell'iPad arrivano sul Mac e le classi aggiornate tornano all'iPad.
- Collegamento diretto sulla stessa Wi-Fi, cifrato, senza Internet né server. Stesse regole dei file voti:
  backup prima di importare, i voti già presenti e cambiati restano da confermare («Rivedi le modifiche»).
- Se la rete non lo permette (spesso a scuola): hotspot del telefono, oppure i file voti come prima.
- Campo «Inserisci il codice a mano» se una fotocamera non è disponibile.
- iPad, registrazione voti: elenco della classe a lato (numero, nome, pallino di stato) per trovare subito
  un alunno preciso durante il gioco, quando le squadre non sono in ordine. Toccando un nome si va alla sua
  scheda e si passa in «scelta libera»: finito quell'alunno si resta lì invece di passare al successivo
  (toccando un cerchio della barra in fondo torna il passaggio automatico). Con l'iPad in verticale
  l'elenco si apre dal tasto «Elenco».
- Correzione: gli alunni ancora da registrare prendevano per errore lo stile dei riquadri vuoti (cerchi in
  fondo troppo grandi, nomi degli indicatori centrati nella scheda).

## 0.7.3 — correzione avviso cartella archivio (2026-10-19)
- Mac: l'avviso «Voti dall'iPad in pausa» si ripeteva a ogni controllo (ogni minuto e a ogni cambio di schermata)
  fino a riempire la pagina, e compariva senza il suo stile. Ora resta uno solo, in basso.

## 0.7.2 — alunno attivo in palestra (2026-10-19)
- iPad, registrazione voti: nella barra in fondo il cerchio dell'alunno a cui stai mettendo il voto è più grande,
  con un anello blu e il nome sotto; la barra scorre da sola per tenerlo in vista.
- L'alunno attivo segue lo scorrimento della pagina e passa all'alunno che tocchi.
- Finito un alunno (tutti i voti, oppure AS/NV/ES), la pagina passa da sola al prossimo ancora da registrare.

## 0.7.1 — nuova icona (2026-10-19)
- Icona «Slancio»: tre tratti in successione (arancio, verde, blu) su fondo chiaro, l'idea del movimento senza
  un singolo sport. SVG, PNG 192/512 (anche «maskable» per Android/Chrome) e icona 180 px per la schermata Home dell'iPad.

## 0.7.0 — regole Giochi decise, giudizi per Argo, iscrizione, avviso fine quadrimestre (2026-10-19)
- Giochi: punti 8…1 come nelle schede tecniche (scelta della scala tolta); spareggio su rispetto delle regole,
  comportamento e fair play.
- Riepilogo → «Giudizi per Argo»: giudizi da riportare in ordine di registro, con cosa controllare, e «Copia tabella».
- Giochi → Classifiche: Excel per l'iscrizione della classe proposta (colonne da completare con Argo).
- Settimana: nelle ultime due settimane del quadrimestre, alunni con pochi voti in A o B e lezioni rimaste.
- iPad: memoria protetta richiesta al browser e mostrata in «Esporta voti».

## 0.6.0 — cronometro dei Giochi sull'iPad (2026-10-19)
- Campo → classe → «Giochi: cronometro»: Super Gym School e Superiamo gli ostacoli, 1ª e 2ª rilevazione.
- VIA/STOP grandi, schermo sempre acceso durante la prova, conta-penalità con la tabella FGI 2025/26,
  «Salva e avanti» al prossimo alunno senza tempo, «Annulla».
- I tempi viaggiano nel file voti insieme ai voti: sul Mac entrano da soli nei Giochi (gli adattamenti restano),
  un tempo diverso da quello già presente va confermato.

## 0.5.0 — Argo, Giochi 2025/26, voti automatici e aiuti in palestra (2026-10-19)
- Import anagrafiche dall'Excel «Lista schede alunno» di Argo: anteprima, numeri di Argo per le classi vuote,
  nuovi in coda, ritirati segnati, nessun alunno cancellato, backup prima dell'import.
- Giochi secondo le schede 2025/26: riduzione del tempo ed esclusione dalla media per singola prova, circuito
  adattato, correttivo di classifica della classe (+0,5/+1), scala dei punti 8→1 o N→1.
- Voti dall'iPad al Mac in automatico: l'iPad salva il file nella cartella «voti-ipad», il Mac lo importa da solo
  (le modifiche a voti già presenti restano da confermare).
- iPad: banner «lezione di adesso» con recuperi in sospeso, anello di avanzamento e badge recuperi sulle classi,
  «Annulla» dopo ogni tocco, promemoria se ci sono voti non esportati da più di 24 ore.
- Mac: recuperi in sospeso e avanzamento delle prove nella Settimana, andamento dei voti nel Riepilogo.
- Schema dati v3 (correttivi Giochi per prova) con migrazione automatica.

## 0.4.0 — correzioni di calendario e recuperi (2026-10-19)
- 5B Boncompagni: «Venerdì 1» (10:30–12:30) dalla settimana del 19/10, ricostruito a ritroso; le settimane di
  vacanza intera non contano nell'alternanza.
- Prima settimana (14–18/09, orario ridotto) senza lezioni.
- Osservazione del progetto basket a Manzoni anticipata alla settimana del 19/10; la lezione di progetto
  successiva serve a recuperare gli assenti. Le giornate di progetto seguono la settimana indicata.
- Palestra Boncompagni inagibile fino a nuova comunicazione, con data modificabile dal Calendario.
- Prove recuperate: niente livelli a un assente senza data di recupero; «Recupera oggi» sull'iPad; peso e data
  dal giorno del recupero.
- Schema dati v2: migrazione automatica dei registri già salvati (solo dove i valori sono quelli iniziali).

## 0.3.0 — stile Apple (2026-10-12)
- Rivisto con la skill `apple-design` (emilkowalski/skills) e le Human Interface Guidelines di Apple.
- Font di sistema San Francisco (niente più font incorporati: app più leggera), titoli grandi con tracking negativo.
- Aspetto chiaro/scuro automatico dal sistema, su Mac e iPad.
- Barra laterale traslucida a gruppi (Didattica, Valutazione, Altro), nascondibile; barra strumenti traslucida.
- Livelli come capsule tinte con testo accessibile: tutte le combinazioni ≥ 4,5:1 (prima 2,4:1 sul livello 8).
- Risposta immediata alla pressione, finestre che si «materializzano», rispetto di riduci movimento / riduci trasparenza / aumenta contrasto.

## 0.2.0 — nuovo stile grafico (2026-10-07)
- Tema "pista tecnica" approvato da Matteo: gestionale scuro con griglia e accento arancio, font Archivo + IBM Plex Mono
  incorporati (offline), icone SVG, barra laterale comprimibile a icone (automatica su Registro/Riepilogo/Verifica).
- Registro compatto: livelli come blocchi colorati 10→5, fasce dei nuclei, legenda, contatori registrati/da recuperare.
- Riepilogo: medie colorate, giudizio unico «da riportare» cliccabile (definitivo marcato ✎ con il calcolato sotto),
  avvisi a icone, spiegazione del calcolo al clic sul valore.
- Modalità campo chiara ad alto contrasto: bottoni livello colorati, barra di avanzamento, navigazione alunni a colori.
- Stampa sempre chiara.
- Aggiornamenti: avviso «Nuova versione disponibile · Aggiorna ora» invece di restare bloccati sulla versione in cache.

## 0.1.0 — versione grezza (2026-10-06)
- M0: Vite + vitest + Playwright + ESLint; `.gitignore` anti-dati; `npm run privacy-check` + hook pre-commit.
- M1: motore di calcolo puro (voto prova, giudizi, pesi, medie ponderate, valore finale, soglie, stati, avvisi,
  regola 9 giorni) con il caso "Rossi" dei modelli Excel; IndexedDB, archivio JSON (File System Access + fallback),
  backup datati, schema versionato con migrazioni.
- M2: Classi e alunni (numeri fissi, Ritirato, ES, OP); Impostazioni di tutto il contenuto didattico.
- M3: pianificazione automatica 2026/27 (chiusure, venerdì alternati, basket, prova→recupero, cuscinetti,
  lezioni libere, lezioni saltate con slittamento); viste settimanale e per classe.
- M4: Registro con descrittori, Riepilogo con spiegazione del calcolo, Verifica voti stile Argo, export Excel.
- M5: modalità campo per iPad offline, pacchetto classe e file voti, import idempotente con conferma delle modifiche.
- M6: Giochi della Gioventù: tempi con penalità e correttivi, statistiche, classifiche 4ª/5ª, storico, proposta.
- M7: griglia di stampa A4 (nomi on/off), guida integrata, controlli di accessibilità di base, test zero rete.
- M8: e2e completi (7), backup/ripristino, `MANUALE.md`.
- Pubblicazione su GitHub Pages (2026-10-07): https://matteoagnino.github.io/registro-motoria/
