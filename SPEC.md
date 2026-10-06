# SPEC — Registro Motoria v1

Fonte di verità per layout e calcoli: i modelli Excel approvati in `riferimenti/`
(`Registro_Motoria_MODELLO_classe4.xlsx`, `..._classe5.xlsx`). Dati iniziali in `seed/`.

## 1. Contesto

- Docente: Matteo, specialista di Educazione motoria, I.C. Pacinotti (Torino), a.s. 2026/27.
- 11 classi: Manzoni 4A, 4B, 4C, 5A, 5B, 5C · Boncompagni 4A, 4B, 5A, 5B, 5C. Una lezione da 2 ore a
  settimana per classe (`seed/orario.json`). 5B Boncompagni: venerdì con due fasce alternate a settimane.
- Riferimenti didattici: Indicazioni Nazionali 2012/2018 (NON le NI 2025), programmazione annuale,
  curricolo d'istituto, Linee guida Ed. civica 2024, OM 3/2025 (giudizi sintetici: Ottimo, Distinto,
  Buono, Discreto, Sufficiente, Non sufficiente).
- Registro elettronico usato a scuola: Argo (voti in itinere inseriti a mano come giudizio per
  sotto-obiettivo; l'app NON si collega ad Argo).

## 2. Dispositivi e flusso dei dati

| Dispositivo | Modalità | Cosa fa |
|---|---|---|
| Mac (Chrome) | `#/gestionale` | Archivio completo, pianificazione, riepiloghi, giudizi, Giochi, impostazioni, export |
| iPad (Safari PWA) | `#/campo` | Solo registrazione voti in palestra, offline (rete scolastica assente in palestra) |

Flusso **a senso unico** (niente sincronizzazione bidirezionale, niente conflitti silenziosi):
1. **Mac → iPad · "Pacchetto classe"** (`.rmpack.json`): classi, alunni (con nomi), calendario delle
   giornate, sotto-obiettivi, indicatori, descrittori, codici stato. Generato dal gestionale, trasferito
   via AirDrop, importato dall'app campo (sostituisce il pacchetto precedente).
2. **iPad · registrazione**: per giornata e classe → per ogni alunno: stato (AS/NV/ES) e livelli 10–5
   degli indicatori; voto e giudizio calcolati e mostrati subito; descrittore del livello visibile al
   tocco. Salvataggio continuo in IndexedDB.
3. **iPad → Mac · "File voti"** (`.rmvoti.json`): registrazioni nuove/modificate dall'ultimo export.
   Ogni registrazione ha `id` univoco (UUID), `updatedAt`, `deviceId`. Import nel gestionale idempotente:
   stesso id + stesso contenuto = ignorato; stesso id + contenuto diverso = mostrato come "modifica" da
   accettare/rifiutare; backup automatico prima di ogni import.
4. **Archivio**: `registro-motoria-archivio.json` nella cartella scelta su Mac (consigliato: cartella
   del Drive d'istituto sincronizzata in locale). Backup datati automatici (ultimi 20).

Le schede di valutazione compilate sull'iPad (stile TIPPS) restano archiviate nello storico
dell'alunno nel gestionale.

## 3. Modello dati (sintesi)

- `AnnoScolastico` {id "2026/27", calendario (seed/calendario_2026-27.json), quadrimestri, parametri}
- `Classe` {codice "4AM", livello 4|5, sezione, plesso, lezioni settimanali[{giorno, inizio, fine, scenario}]}
- `Alunno` {id, classe, numero (fisso, ordine alfabetico; nuovi in coda), cognomeNome, stato Attivo|Ritirato|ES, OP bool, note}
- `ObiettivoPersonalizzato` {alunnoId, testo per ObA / ObB, adattamenti}
- `SottoObiettivo` {livello, codice "1.1"…"4.3", "TEC.1", "TEC.2", "CIV.1", "CIV.2", nucleo, etichetta,
  testo, concorre {Q1: A|B|TEC|CIV|—, Q2: …}, indicatori[4] {nome, cosaOsservo, descrittori[6]}}
- `ObiettivoScheda` {livello, quadrimestre, A|B, testo}
- `Giornata` (di prova) {id "Q1-G03", quadrimestre, descrizione, sottoObiettivi[≤4], per classe: data
  pianificata, stato (pianificata/svolta/slittata)}
- `Lezione` (calendario reale per classe) {classe, data, tipo: prova|recupero|normale|progetto|cuscinetto|libera|saltata, giornataId?, motivo?}
- `Registrazione` {id UUID, classe, alunnoId, giornataId, sottoObiettivo, livelli[4] (10–5|null),
  stato AS|NV|ES|null, recuperataIl, updatedAt, deviceId}
- `RubricaProcesso` {alunnoId, quadrimestre, valore 10–5}
- `GiudizioDefinitivo` {alunnoId, quadrimestre, obiettivo A|B|TEC|CIV, giudizio, commento}
- `GiochiRisultati` {anno, classe, rilevazione 1|2, individuali (supergym tempo+penalità, ostacoli,
  correttivo%), squadra (lancia, staffetta, spikeball per gruppo), fairPlay}
- `Impostazioni` {pesi, soglie, parametri, scala, scenario venerdì di riferimento, cartella archivio}

## 4. Regole di calcolo (vincolanti, test obbligatori)

1. **Voto di una prova (per sotto-obiettivo)** = media dei livelli degli indicatori compilati (1–4),
   arrotondata all'intero con ,50 per eccesso (7,49→7; 7,50→8; 9,6→10). Nessun indicatore → nessun voto.
2. **Giudizio di un voto** (per Argo): 10 Ottimo · 9 Distinto · 8 Buono · 7 Discreto · 6 Sufficiente · 5 Non sufficiente.
3. **Peso**: 1 se la data della prova è prima della metà del quadrimestre (Q1: 01/12/2026; Q2:
   29/03/2027), 1,5 dalla metà in poi. Tutto modificabile in Impostazioni.
4. **Obiettivo di scheda**: ogni sotto-obiettivo concorre all'obiettivo indicato in `concorre[Q]`
   (tabella modificabile; 2.1 conta solo nel 2°Q). Media ponderata di **tutti** i voti dei
   sotto-obiettivi collegati nel quadrimestre, arrotondata a 2 decimali (come l'Excel).
5. **Valore finale A/B** = 0,8 × media ponderata + 0,2 × rubrica di processo (se compilata; altrimenti
   100% media). TEC e CIV: solo media delle prove.
6. **Giudizio finale**: soglie su valore ≥ 9,5 Ottimo · ≥ 8,5 Distinto · ≥ 7,5 Buono · ≥ 6,5 Discreto ·
   ≥ 5,5 Sufficiente · altrimenti Non sufficiente. Il giudizio definitivo inserito da Matteo prevale.
7. **Stati**: AS = assente da recuperare (finché non c'è `recuperataIl` o un voto) · NV = non valutabile
   (non conta) · ES alunno = esonerato (nessun giudizio, avviso "concordare con referente e dirigente") ·
   OP = giudizio riferito agli obiettivi personalizzati · Ritirato = escluso.
8. **Avvisi**: meno di 2 voti su A o B nel quadrimestre → "Pochi voti: valutazione alternativa
   (scritta/orale)"; prove AS non recuperate.
9. **Regola di recupero**: lo stesso sotto-obiettivo non può comparire due volte nella stessa giornata
   né in due giornate della stessa classe a distanza < 9 giorni. Il pianificatore deve rispettarla e il
   calendario deve segnalarla.
10. **Test di riferimento** (dal modello Excel classe 4, alunno di esempio "Rossi"): G01 1.1 livelli
    8,8,7 → 8; G02 3.1 (8,9,8,8)→8 e 3.2 (8,8,9,8)→8; G03 1.1 (8,7,8,7)→8, 1.2 (7,7,8,7)→7, TEC.1
    (9,9,8,9)→9. Q1: Ob.A media 7,67 → Buono; Ob.B 8 → Buono; TEC 9 → Distinto. Con processo 8:
    A = 0,8×7,67+0,2×8 = 7,74 → Buono.

## 5. Pianificazione automatica (gestionale)

- Input: orario settimanale (11 classi; venerdì alternati per 5BB), calendario regionale con chiusure,
  vincoli (palestra Boncompagni inagibile fino al 31/10 → lezioni in aula; progetto basket 4 lezioni:
  Manzoni 5–30/10, Boncompagni da inserire), sequenza condivisa delle giornate (uguale per i due plessi).
- Regole: alternanza **prova → recupero → prova…**; **2 lezioni cuscinetto** a fine quadrimestre;
  **lezione libera** (attività scelta dai bambini) nell'ultima lezione prima delle vacanze di Natale e
  nell'ultima dell'anno; lezioni di progetto inserite come blocco che sospende la sequenza.
- **Lezione saltata** (gita, assenza docente, evento) registrata con motivo → la sequenza di quella
  classe slitta automaticamente alla lezione successiva; i cuscinetti assorbono gli slittamenti; se
  finiscono, il sistema avvisa e propone quale giornata sacrificare.
- Vista **settimanale condivisa** (tutte le classi, giorno per giorno) e vista per classe.
- Struttura di ogni lezione da 120': 15' accoglienza e trasferimento · 90' attività (ultimi 20' gioco a
  squadre) · 15' cambio, schede di autovalutazione, rientro.

## 6. Schermate del gestionale (Mac)

1. **Oggi / Settimana**: lezioni della settimana per classe, cosa si valuta, assenti da recuperare.
2. **Calendario**: sequenza giornate (con sotto-obiettivi, controllo regola), slittamenti, cuscinetti, eventi.
3. **Classi e alunni**: anagrafica, numeri fissi, stati, OP.
4. **Registro**: per classe e giornata, griglia alunni × sotto-obiettivi × indicatori (come il foglio
   Registro dell'Excel), con voto e giudizio; tocco sul livello → descrittore.
5. **Riepilogo**: per classe, 1°Q e 2°Q, medie per sotto-obiettivo, giudizi calcolati/definitivi,
   rubrica di processo, avvisi, colonna "da riportare"; spiegazione del calcolo al tocco.
6. **Verifica voti** (stile Argo): riga per alunno, colonna per giornata con i voti raggruppati.
7. **Rubriche**: consultazione per livello di classe e sotto-obiettivo.
8. **Giochi della Gioventù**: inserimento per classe e rilevazione, calcoli da schede tecniche
   (`seed/giochi_gioventu.json`), statistiche (media ufficiale, troncata, mediana, dev. std, confronto
   rilevazioni), classifica tra classi (per prova e generale, spareggio fair play), **database
   pluriennale** e proposta della 4ª e della 5ª da iscrivere.
9. **Import/Export**: pacchetto classe per iPad, import file voti, export Excel (riepilogo per
   documento di valutazione; registro per classe nel formato dei modelli), backup.
10. **Impostazioni**: tutto il contenuto didattico e i parametri, modificabili e versionati.

## 7. Modalità campo (iPad)

Schermata 1: scegli classe (oggi evidenziata dall'orario) → giornata (pre-selezionata).
Schermata 2: elenco alunni grande; per ogni alunno card con stato e, per ogni sotto-obiettivo del
giorno, 4 indicatori con pulsanti 10 9 8 7 6 5 (tocco lungo → descrittore), voto e giudizio calcolati.
Navigazione rapida tra alunni, indicatori rimasti vuoti evidenziati, contatore registrati/mancanti.
Schermata 3: export "File voti" (Condividi → AirDrop). Nessun dato lascia l'iPad senza un'azione di Matteo.

## 8. Fuori ambito v1

Collegamento con Argo; login/account; sincronizzazione automatica via cloud; generazione di documenti
Word (schede prova, schede alunni) — restano nel lavoro in Cowork.
