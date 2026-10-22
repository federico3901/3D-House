# Cantiere Live

Sito web pronto per le imprese edili: cantieri in corso con avanzamento per fase, diario dei lavori, case realizzate, appartamenti disponibili e tour virtuali 360°, in italiano e in inglese. Lo stesso codice serve qualsiasi impresa: si cambiano i dati e il brand, non il codice.

La demo usa un'impresa fittizia (**Demo Costruzioni**) e un progetto reale nel milanese: **Grazioli 57**, conversione residenziale ad Affori (Milano). È una piccola palazzina con 15 appartamenti, bilocali e trilocali tra 50 e 100 m², pompa di calore autonoma e ascensore. La fase 1 è consegnata, la fase 2 è in corso con consegna a luglio 2027. Fonte: [Urbanfile, settembre 2026](https://blog.urbanfile.org/2026/09/23/milano-affori-cantieri-attivi-e-fermi-in-zona-settembre-2026/). Avanzamento, unità, date della fase 1, foto e tour sono illustrativi, e il sito lo dichiara in ogni pagina.

## Cosa c'è

| Pagina | Contenuto |
| --- | --- |
| Home `/it/`, `/en/` | Hero con il cantiere "dal vivo" (avanzamento, fase in corso, ultimo aggiornamento), cantieri in corso, case realizzate, contatti |
| Progetti `/it/projects/` | Elenco filtrabile per stato |
| Progetto `/it/projects/<slug>/` | Galleria foto, cartello di cantiere, scheda, cronoprogramma (Gantt) con la linea di oggi, diario di cantiere, tour 360°, tabella appartamenti con disponibilità, mappa della zona, fonti, modulo contatti precompilato |
| Tour `/it/projects/<slug>/tour/` | Tour 360° a schermo intero: trascinamento, zoom (rotella, pizzico, tastiera), rotazione automatica, punti cliccabili tra gli ambienti |
| Area impresa `/it/admin/` | L'impresa aggiorna l'avanzamento delle fasi, pubblica voci di diario con foto, cambia lo stato degli appartamenti, le date e lo stato del progetto, aggiunge tour esterni (Matterport, Kuula…) e personalizza il brand (nome, sigla, colore, slogan, contatti). Le modifiche compaiono subito sul sito, anche nelle altre schede aperte |

Nella demo l'area impresa salva i dati nel browser (`localStorage`): chi la prova vede le proprie modifiche, gli altri visitatori no. Il pulsante "Ripristina la demo" torna ai dati originali, "Copia i dati (JSON)" esporta la configurazione.

## Avvio

```bash
npm install
npm run dev              # sviluppo, http://localhost:3000/it/
npm run build            # sito statico in out/, da caricare su qualsiasi hosting
npm run build:portable   # copia in portable/ che funziona anche da un sotto-percorso qualsiasi (anteprime, condivisioni)
npm run lint && npm run typecheck
node scripts/e2e.mjs            # test end-to-end su out/ (Chromium)
node scripts/e2e.mjs portable   # gli stessi test su portable/, servito da un sotto-percorso
```

## Multi-impresa: come si rivende

Ogni impresa è una cartella in `src/tenants/<id>/`:

- `index.ts`: brand (nome, sigla del logo, colore, slogan, contatti) e progetti (fasi con peso e avanzamento, diario, appartamenti, tour, fonti), tutti i testi in italiano e inglese. Il modello dati è in `src/lib/types.ts`.
- `maps/*.json`: la mappa della zona di ogni progetto, disegnata dai dati OpenStreetMap:
  ```bash
  node scripts/build-map.mjs --bbox minLon,minLat,maxLon,maxLat --pin lat,lng --out src/tenants/<id>/maps/<progetto>.json
  ```
- le foto e i panorami 360° (equirettangolari 2:1) in `public/media/`.

Si registra l'impresa in `src/tenants/index.ts` e si fa la build con `TENANT=<id> npm run build`: una build, un sito statico, un dominio. Il colore del brand guida bottoni, barre di avanzamento ed evidenziazioni, e il testo sopra il colore passa da scuro a chiaro in automatico.

## Struttura

```
src/app/[locale]/(site)/        home, progetti, progetto, area impresa (con header e footer)
src/app/[locale]/(immersive)/   tour a schermo intero
src/app/(gate)/                 "/" → lingua del browser
src/components/tour/            visore 360° (three.js) e controlli
src/components/project/         galleria, cronoprogramma, diario, appartamenti
src/components/admin/           area impresa
src/components/map/             mappa SVG da OpenStreetMap, senza servizi esterni
src/i18n/dictionaries.ts        testi dell'interfaccia IT/EN
src/lib/store.ts                dati sul client: originali o modificati dall'area impresa
scripts/                        mappa, build portabile, test end-to-end
```

## Prossimi passi per la versione commerciale

- Database e account per l'area impresa, con le modifiche pubblicate per tutti i visitatori (oggi restano nel browser).
- Caricamento di foto e panorami dall'area impresa, invece della scelta tra quelli già presenti.
- Invio reale del modulo contatti (email o CRM dell'impresa).
- Più imprese su un solo deploy, scelte in base al dominio, invece di una build per impresa.
- Planimetrie degli appartamenti e notifiche ai clienti a ogni nuovo aggiornamento del diario.

Crediti delle immagini: `public/media/CREDITS.md`.
