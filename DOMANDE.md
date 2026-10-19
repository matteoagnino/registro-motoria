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
- **D6 · Classifica Giochi.** *Ipotesi*: classifiche separate per le quarte e per le quinte (si propone una
  4ª e una 5ª); punti 8,7,…,1 (dall'8ª in giù 1) assegnati in ogni prova; classifica generale = somma dei punti;
  spareggio con il giudizio di fair play.
- **D7 · Correttivo disabilità Giochi.** *Ipotesi*: percentuale di riduzione del tempo (es. 30%), come nella
  formula dell'Excel `(tempo + penalità) × (1 − correttivo)`.
