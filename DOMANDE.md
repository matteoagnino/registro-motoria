# DOMANDE — dubbi di dominio e ipotesi adottate

Formato: domanda · ipotesi prudente adottata · dove si cambia. Rispondi pure qui sotto ogni voce.

- **D1 · GitHub non collegato.** `gh auth status` dice che il Mac non è autenticato su GitHub, quindi non
  posso creare il repository `matteoagnino/registro-motoria` né pubblicare su GitHub Pages.
  *Ipotesi*: tutto il lavoro resta in git locale; `npm run deploy` è pronto. *Azione per Matteo*:
  `gh auth login`, poi `gh repo create matteoagnino/registro-motoria --public --source . --push` e `npm run deploy`.
- **D2 · 5B Boncompagni, venerdì alternati.** Quale settimana è "Venerdì 1"?
  *Ipotesi*: la settimana del 14/09/2026 è "Venerdì 1", poi si alterna. Si cambia in Impostazioni → Calendario.
- **D3 · Settimana di Q1-G03 a Boncompagni** (nel seed è vuota). *Ipotesi*: stessa settimana di Manzoni
  (02/11/2026), la prima con la palestra di nuovo agibile. Si cambia in Calendario → giornata.
- **D4 · Progetto basket a Boncompagni**: date non ufficiali. *Ipotesi*: Q1-G02 resta "da pianificare" per le
  classi Boncompagni (con avviso) finché non inserisci le date in Calendario → Progetti.
- **D5 · Peso di una prova recuperata.** *Ipotesi*: vale la data della giornata di prova della classe (come
  nell'Excel), non la data del recupero.
- **D6 · Classifica Giochi.** *Ipotesi*: classifiche separate per le quarte e per le quinte (si propone una
  4ª e una 5ª); punti 8,7,…,1 (dall'8ª in giù 1) assegnati in ogni prova; classifica generale = somma dei punti;
  spareggio con il giudizio di fair play.
- **D7 · Correttivo disabilità Giochi.** *Ipotesi*: percentuale di riduzione del tempo (es. 30%), come nella
  formula dell'Excel `(tempo + penalità) × (1 − correttivo)`.
