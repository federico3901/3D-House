# Cantiere Live

Sito web pronto per le imprese edili: cantieri in corso con avanzamento per fase, diario dei lavori, case realizzate, appartamenti disponibili e tour virtuali 360°, in italiano e in inglese. Lo stesso codice serve qualsiasi impresa: si cambiano i dati e il brand, non il codice.

La demo usa un'impresa fittizia (**Demo Costruzioni**) e un progetto reale nel milanese: **Grazioli 57**, conversione residenziale ad Affori (Milano). È una piccola palazzina con 15 appartamenti, bilocali e trilocali tra 50 e 100 m², pompa di calore autonoma e ascensore. La fase 1 è consegnata, la fase 2 è in corso con consegna a luglio 2027. Fonte: [Urbanfile, settembre 2026](https://blog.urbanfile.org/2026/09/23/milano-affori-cantieri-attivi-e-fermi-in-zona-settembre-2026/). Avanzamento, unità, piantina e modello 3D, date della fase 1, foto e tour sono illustrativi, e il sito lo dichiara in ogni pagina.

## Cosa c'è

| Pagina | Contenuto |
| --- | --- |
| Home `/it/`, `/en/` | Hero con il cantiere "dal vivo" (avanzamento, fase in corso, ultimo aggiornamento), cantieri in corso, case realizzate, contatti |
| Progetti `/it/projects/` | Elenco filtrabile per stato |
| Progetto `/it/projects/<slug>/` | Galleria foto, cartello di cantiere, scheda, cronoprogramma (Gantt) con la linea di oggi, diario di cantiere, tour 360°, tabella appartamenti con disponibilità, prezzo ed esposizione, calcolatore di costi d'acquisto e mutuo, servizi a piedi sulla mappa della zona, fonti, contatti e prenotazione delle visite |
| Appartamento `/it/projects/<slug>/units/<id>/` | Scheda stampabile su un foglio A4: pianta quotata con nord e scala, stanze con superfici, esposizione e ore di sole, imposte e spese stimate, servizi vicini, caratteristiche e contatti |
| Edificio 3D `/it/projects/<slug>/3d/` | Modello 3D generato dalla piantina, con l'intestazione e lo stile del sito. I piani si separano con lo slider dell'esploso; un piano scelto si isola, un appartamento scelto mostra contorno, stanze con superfici, prezzo, esposizione, "Chiedi info" e la sua scheda. Viste 3/4, pianta e fronte, quote, nomi delle stanze, freccia del nord e modalità **Sole**: percorso del sole nel giorno scelto (21 dicembre, 21 marzo, 21 giugno), ora per ora, con le facciate illuminate. `…/3d/#B1` apre direttamente un appartamento |
| Tour `/it/projects/<slug>/tour/` | Tour 360° a schermo intero: trascinamento, zoom (rotella, pizzico, tastiera), rotazione automatica, punti cliccabili tra gli ambienti |
| Area impresa `/it/admin/` | L'impresa aggiorna l'avanzamento delle fasi, pubblica voci di diario con foto, cambia lo stato degli appartamenti, le date e lo stato del progetto, aggiunge tour esterni (Matterport, Kuula…) e personalizza il brand (nome, sigla, colore, slogan, contatti). Le modifiche compaiono subito sul sito, anche nelle altre schede aperte |

Per chi compra:

- **Costi e mutuo**: per l'appartamento scelto, IVA (4% prima casa, 10% altrimenti), imposte fisse di registro, ipotecaria e catastale, bolli, notaio, imposta sostitutiva e spese del mutuo, rata, interessi, detrazione del primo anno e reddito consigliato. Regole in `src/lib/purchase.ts`.
- **Sole ed esposizione**: dalla piantina e dall'orientamento dell'edificio (`facing`, in gradi), i lati con finestre di ogni appartamento e le ore di sole potenziali al solstizio d'inverno, all'equinozio e al solstizio d'estate (`src/lib/sun.ts`, `src/lib/exposure.ts`), senza le ombre dei vicini.
- **Servizi a piedi**: metro, treni, tram e bus, spesa, scuole, farmacie, parchi e sport con i minuti a piedi lungo strade e marciapiedi, calcolati da OpenStreetMap.
- **Prenota una visita**: in cantiere (solo per i cantieri in corso), in ufficio o in videochiamata, sui giorni e gli orari impostati dall'impresa, con il file `.ics` per il calendario.

Nella demo l'area impresa salva i dati nel browser (`localStorage`): chi la prova vede le proprie modifiche, gli altri visitatori no. Il pulsante "Ripristina la demo" torna ai dati originali, "Copia i dati (JSON)" esporta la configurazione.

## Avvio

```bash
npm install
npm run dev              # sviluppo, http://localhost:3000/it/
npm run build            # sito statico in out/, da caricare su qualsiasi hosting (prima crea le immagini AVIF: npm run images)
npm run build:portable   # copia in portable/ che funziona anche da un sotto-percorso qualsiasi (anteprime, condivisioni)
npm run lint && npm run typecheck
node scripts/e2e.mjs            # test end-to-end su out/ (Chromium)
node scripts/e2e.mjs portable   # gli stessi test su portable/, servito da un sotto-percorso
```

## Multi-impresa: come si rivende

Ogni impresa è una cartella in `src/tenants/<id>/`:

- `index.ts`: brand (nome, sigla del logo, colore, slogan, contatti) e progetti (fasi con peso e avanzamento, diario, appartamenti, tour, fonti), tutti i testi in italiano e inglese. Il modello dati è in `src/lib/types.ts`.
- `maps/*.json`: la zona di ogni progetto dai dati OpenStreetMap: la mappa (un SVG in `public/media/maps/`) e i servizi vicini (trasporti, spesa, scuole, salute, parchi, sport) con i minuti a piedi, calcolati sul percorso più breve lungo strade e marciapiedi:
  ```bash
  node scripts/build-map.mjs --center lat,lng --radius 1100 --id <progetto> --json src/tenants/<id>/maps/<progetto>.json [--label "Via …"]
  ```
- `plans/*.ts`: la piantina di ogni edificio, da cui nasce il modello 3D (vedi sotto). Un progetto la collega con `building: "<id>"`; le fasi dello stesso edificio condividono la stessa piantina.
- le foto e i panorami 360° (equirettangolari 2:1) in `public/media/`.

Si registra l'impresa in `src/tenants/index.ts` e si fa la build con `TENANT=<id> npm run build`: una build, un sito statico, un dominio. Il colore del brand guida bottoni, barre di avanzamento ed evidenziazioni, e il testo sopra il colore passa da scuro a chiaro in automatico.

## Piantina e modello 3D

La piantina è un file di dati (`BuildingPlan` in `src/lib/types.ts`), in metri: `x` lungo la facciata su strada, `y` verso il retro. Per ogni piano:

- le **stanze** di ogni appartamento (`unitId` uguale a quello della tabella appartamenti) e delle parti comuni, come poligoni con lati orizzontali o verticali, tipo `soggiorno`, `camera`, `bagno`, `balcone`, `terrazzo`, `giardino`, `scala`, `ascensore`…;
- le **aperture**: porte, finestre, portefinestre e varchi, indicate dal loro centro su un muro e dalla larghezza;
- per la copertura, `roof: true` e gli **ingombri** (pompe di calore, extracorsa dell'ascensore, torrino scala).

Le pareti si generano da sole dai contorni delle stanze: 30 cm verso l'esterno, 22 cm tra appartamenti o verso le parti comuni, 10 cm tra stanze dello stesso appartamento, con le aperture ritagliate (architrave sopra le porte, davanzale sotto le finestre). Il disegno aggiunge da solo l'apertura delle porte, i vetri delle finestre, le rampe delle scale, i parapetti di balconi e terrazzi e il contorno di ogni appartamento. Le superfici delle stanze si calcolano dai poligoni. Un editor visuale della piantina è il passo successivo; per ora la si scrive come la piantina di esempio, `src/tenants/demo/plans/grazioli-57.ts`.

## Struttura

```
src/app/[locale]/(site)/        home, progetti, progetto, scheda appartamento, area impresa (con header e footer)
src/app/[locale]/(immersive)/   tour a schermo intero, edificio 3D
src/app/(gate)/                 "/" → lingua del browser
src/components/tour/            visore 360° (three.js) e controlli
src/components/building3d/      modello 3D: dalla piantina alla geometria (plan.ts), motore three.js (engine.ts), console (Building3D.tsx), anteprima SVG
src/components/project/         galleria, cronoprogramma, diario, appartamenti, costi e mutuo, scheda e pianta dell'appartamento
src/components/home/            contatti e prenotazione delle visite
src/components/admin/           area impresa
src/components/map/             mappa SVG da OpenStreetMap con i servizi, senza servizi esterni
src/lib/purchase.ts, sun.ts     costi d'acquisto e mutuo; posizione del sole ed esposizione
src/i18n/dictionaries.ts        testi dell'interfaccia IT/EN
src/lib/store.ts                dati sul client: originali o modificati dall'area impresa
scripts/                        mappa e servizi, immagini AVIF, build portabile, test end-to-end
```

## Prossimi passi per la versione commerciale

- Database e account per l'area impresa, con le modifiche pubblicate per tutti i visitatori (oggi restano nel browser).
- Caricamento di foto e panorami dall'area impresa, invece della scelta tra quelli già presenti.
- Editor visuale della piantina nell'area impresa, e importazione da DXF o PDF dei disegni di progetto.
- Invio reale del modulo contatti e delle richieste di visita (email, calendario o CRM dell'impresa).
- Più imprese su un solo deploy, scelte in base al dominio, invece di una build per impresa.
- Notifiche ai clienti a ogni nuovo aggiornamento del diario.

Crediti delle immagini: `public/media/CREDITS.md`.
