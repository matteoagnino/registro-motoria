# DOMANDE — dubbi di dominio e ipotesi adottate

Formato: domanda · ipotesi prudente adottata · dove si cambia. Rispondi pure qui sotto ogni voce.

- ~~**D1 · GitHub non collegato.**~~ **Risolta il 2026-10-07**: login fatto, repository creato, Pages attivo su https://matteoagnino.github.io/registro-motoria/. `gh auth status` dice che il Mac non è autenticato su GitHub, quindi non
  posso creare il repository `matteoagnino/registro-motoria` né pubblicare su GitHub Pages.
  *Ipotesi*: tutto il lavoro resta in git locale; `npm run deploy` è pronto. *Azione per Matteo*:
  `gh auth login`, poi `gh repo create matteoagnino/registro-motoria --public --source . --push` e `npm run deploy`.
- ~~**D2 · 5B Boncompagni, venerdì alternati.**~~ **Risolta il 2026-10-19**: la settimana del 19/10/2026 è
  «Venerdì 1» (10:30–12:30); l'alternanza è ricostruita da lì in avanti e a ritroso. La prima settimana
  (14–18/09, orario ridotto fino alle 12:30) non ha lezioni: solo supporto alle classi.
  *Ipotesi residua (D2-bis)*: le settimane di vacanza intera (lun–ven chiusi, es. 28/12–01/01) **non contano**
  nell'alternanza, che riprende da dove si era fermata (venerdì 08/01/2027 = «Venerdì 1»). Se a gennaio la
  fascia non torna, dimmelo: si cambia la settimana di riferimento in Impostazioni.
- ~~**D3 · Settimana di Q1-G03 a Boncompagni.**~~ **Risolta il 2026-10-19**: finito il basket a Manzoni i due
  plessi seguono lo stesso programma (stessa settimana di Manzoni). La palestra di Boncompagni resta inagibile
  «fino a nuova comunicazione»: le lezioni restano segnate «in aula». Quando riapre, metti la data in
  Calendario → Progetti e palestre non agibili → «Fino al».
- **D4 · Progetto basket a Boncompagni**: date non ancora comunicate → **stand-by**. Q1-G02 resta «da
  pianificare» per le classi Boncompagni finché non inserisci le date in Calendario → Progetti.
- ~~**D5 · Prova recuperata.**~~ **Risolta il 2026-10-19**: il voto si registra il giorno in cui l'alunno
  sostiene davvero la prova. Un alunno AS non può avere livelli finché non c'è la data del recupero
  (Mac: colonna «Recup.»; iPad: bottone «Recupera oggi»); peso e data della prova seguono il giorno del recupero.
- **D6 · Classifica Giochi** — ricerca del 19/10/2026 in `reports/Regole Giochi della Gioventù primaria.md`.
  Per la primaria non c'è un regolamento nazionale completo; le schede 2026/27 non sono ancora pubbliche.
  Da decidere:
  1. Scala dei punti per prova: 8, 7, … 1 (FIDAL 2025/26) oppure N, N−1, … (scheda punteggi 2024/25)? Con 11
     classi danno risultati diversi.
  2. Atletica: una sola voce in classifica o tre prove separate?
  3. Classifica d'istituto con 4ª e 5ª separate (come la provinciale di Torino 2025/26) o insieme?
  4. Assenti: la media dei tempi si divide per i presenti o per tutti gli iscritti?
  5. Spareggio: prova supplementare tra le classi a pari punti? Il fair play è un premio a parte, non uno spareggio.
  *Ipotesi attuale*: 4ª e 5ª separate, scala 8→1, somma dei punti, media sui presenti.
- **D7 · Correttivo disabilità Giochi.** L'unica indicazione ufficiale (FIDAL) dà solo esempi: tempo −30%/−50%,
  oppure +0,5/+1 punto nella prova, oppure esclusione del risultato nei casi complessi. Non dice chi decide né
  quando. La formula `(tempo + penalità) × (1 − correttivo)` è una tua scelta, non una norma.
  Da decidere: tipo e valore del correttivo, alunno per alunno e prova per prova; il tempo di un circuito
  adattato (FGI) entra nella media della classe? *Proposta*: correttivo configurabile per alunno e prova, con
  motivazione obbligatoria e **senza diagnosi** nel registro. Conviene chiedere all'UST se per la fase
  provinciale esiste un criterio concordato con il CIP.
