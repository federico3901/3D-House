import type { TenantData } from "@/lib/types";

/* The demo impresa. The brand is fictitious; the project is real: Grazioli 57, a residential conversion in Affori
   (Milano). Address, 15 apartments, 50–100 m² one- and two-bedroom layouts, heat pump, lift, two phases and the
   July 2027 handover of phase 2 come from Urbanfile (September 2026). Progress, units, dates of phase 1, photos and
   360° tours are illustrative, and every page says so. */

const SOURCE = {
  label: "Urbanfile, «Milano: Affori, cantieri attivi e fermi in zona» (settembre 2026)",
  url: "https://blog.urbanfile.org/2026/09/23/milano-affori-cantieri-attivi-e-fermi-in-zona-settembre-2026/",
};

const NOTE = {
  it: "Progetto reale usato come esempio. Indirizzo, numero di appartamenti, tagli, impianti e consegna della fase 2 vengono da fonti pubbliche; impresa, avanzamento, unità, date della fase 1, foto e tour 360° sono illustrativi.",
  en: "A real project used as an example. Address, number of apartments, layouts, building services and the phase 2 handover come from public sources; the builder, progress, units, phase 1 dates, photos and 360° tours are illustrative.",
};

const LOCATION = {
  address: "Via Don Bartolomeo Grazioli 57",
  district: "Affori",
  city: "Milano",
  lat: 45.50853,
  lng: 9.17022,
  approximate: true,
};

const FACTS = [
  { label: { it: "Appartamenti", en: "Apartments" }, value: { it: "15 in tutto", en: "15 in total" } },
  { label: { it: "Tagli", en: "Layouts" }, value: { it: "Bilocali e trilocali", en: "1- and 2-bedroom" } },
  { label: { it: "Superfici", en: "Sizes" }, value: { it: "50–100 m²", en: "50–100 m²" } },
  {
    label: { it: "Impianti", en: "Services" },
    value: { it: "Pompa di calore autonoma, climatizzazione", en: "Own heat pump, air conditioning" },
  },
  { label: { it: "Edificio", en: "Building" }, value: { it: "Piccola palazzina con ascensore", en: "Small block with lift" } },
];

const FEATURES = [
  { it: "Riscaldamento autonomo a pompa di calore", en: "Independent heat-pump heating" },
  { it: "Climatizzazione in ogni appartamento", en: "Air conditioning in every apartment" },
  { it: "Ascensore", en: "Lift" },
  { it: "Progettato sugli standard energetici attuali", en: "Designed to current energy standards" },
  { it: "Metro M3 Affori Centro e Dergano a meno di 1 km", en: "M3 metro (Affori Centro, Dergano) under 1 km away" },
];

const demo: TenantData = {
  version: 1,
  id: "demo",
  brand: {
    name: "Demo Costruzioni",
    monogram: "DC",
    tagline: {
      it: "Costruiamo e ristrutturiamo case a Milano. Ogni cantiere si segue online, fase per fase.",
      en: "We build and convert homes in Milan. Follow every site online, phase by phase.",
    },
    color: "#F2B200",
    city: "Milano",
    email: "info@democostruzioni.example",
    phone: "+39 02 0000 0000",
    address: "Via Esempio 1, 20158 Milano",
    vat: "P.IVA 00000000000",
    foundedYear: 2004,
  },
  notice: {
    it: "Sito dimostrativo: l'impresa è fittizia, il progetto Grazioli 57 è reale. Avanzamento, unità e immagini sono illustrativi.",
    en: "Demo site: the builder is fictitious, the Grazioli 57 project is real. Progress, units and images are illustrative.",
  },
  projects: [
    {
      slug: "grazioli-57-fase-2",
      name: "Grazioli 57",
      subtitle: { it: "Fase 2 · piani bassi", en: "Phase 2 · lower floors" },
      status: "construction",
      location: LOCATION,
      cover: {
        src: "/media/fase2-struttura.jpg",
        alt: { it: "Struttura in cemento armato in costruzione", en: "Reinforced concrete frame under construction" },
      },
      gallery: [
        {
          src: "/media/fase2-struttura.jpg",
          alt: { it: "Struttura in cemento armato in costruzione", en: "Reinforced concrete frame under construction" },
        },
        { src: "/media/diario-tramezze.jpg", alt: { it: "Tramezze in blocchi al primo piano", en: "Block partitions on the first floor" } },
        { src: "/media/diario-impianti.jpg", alt: { it: "Posa degli impianti elettrici", en: "Electrical installation" } },
        { src: "/media/diario-solaio.jpg", alt: { it: "Armature del solaio", en: "Slab reinforcement" } },
        { src: "/media/diario-massetti.jpg", alt: { it: "Serramenti nuovi al piano terra", en: "New windows on the ground floor" } },
      ],
      summary: {
        it: "Conversione residenziale ad Affori: 15 appartamenti in una piccola palazzina con ascensore. La prima fase è consegnata, la seconda è in corso sui piani bassi.",
        en: "A residential conversion in Affori: 15 apartments in a small block with a lift. Phase 1 is handed over; phase 2 is under way on the lower floors.",
      },
      description: {
        it: "Grazioli 57 trasforma un edificio di circa trent'anni in una piccola palazzina residenziale. I 15 appartamenti, bilocali e trilocali tra 50 e 100 m², hanno riscaldamento autonomo a pompa di calore e climatizzazione. I lavori procedono in due fasi: i piani alti sono già abitati, quelli bassi saranno consegnati a luglio 2027.",
        en: "Grazioli 57 turns a building from about thirty years ago into a small residential block. Its 15 one- and two-bedroom apartments, between 50 and 100 m², have their own heat pump and air conditioning. Work runs in two phases: the upper floors are already lived in, the lower floors will be handed over in July 2027.",
      },
      facts: [...FACTS, { label: { it: "Consegna fase 2", en: "Phase 2 handover" }, value: { it: "Luglio 2027", en: "July 2027" } }],
      features: FEATURES,
      start: "2026-02",
      delivery: "2027-07",
      phases: [
        {
          id: "allestimento",
          name: { it: "Allestimento e demolizioni interne", en: "Site set-up and strip-out" },
          progress: 100,
          weight: 10,
          start: "2026-02",
          end: "2026-04",
        },
        {
          id: "strutture",
          name: { it: "Consolidamenti strutturali", en: "Structural reinforcement" },
          progress: 100,
          weight: 15,
          start: "2026-04",
          end: "2026-07",
        },
        {
          id: "tramezze",
          name: { it: "Tramezze e massetti", en: "Partitions and screeds" },
          progress: 75,
          weight: 15,
          start: "2026-07",
          end: "2026-11",
        },
        {
          id: "impianti",
          name: { it: "Impianti: pompa di calore, elettrico, idraulico", en: "Services: heat pump, electrics, plumbing" },
          progress: 50,
          weight: 20,
          start: "2026-08",
          end: "2027-02",
        },
        {
          id: "serramenti",
          name: { it: "Serramenti e facciata", en: "Windows and façade" },
          progress: 20,
          weight: 15,
          start: "2026-10",
          end: "2027-03",
        },
        {
          id: "finiture",
          name: { it: "Finiture interne", en: "Interior finishes" },
          progress: 0,
          weight: 15,
          start: "2027-02",
          end: "2027-06",
        },
        {
          id: "consegna",
          name: { it: "Collaudi e consegna", en: "Inspections and handover" },
          progress: 0,
          weight: 10,
          start: "2027-06",
          end: "2027-07",
        },
      ],
      updates: [
        {
          id: "u6",
          date: "2026-10-14",
          phaseId: "serramenti",
          title: { it: "Primi serramenti al piano terra", en: "First windows in on the ground floor" },
          body: {
            it: "Posati i serramenti dei due appartamenti sul lato strada. Sui fronti interni si chiude entro novembre.",
            en: "Windows are in for the two street-side apartments. The courtyard side will be closed by November.",
          },
          image: "/media/diario-massetti.jpg",
        },
        {
          id: "u5",
          date: "2026-09-22",
          phaseId: "impianti",
          title: { it: "Impianti: dorsali e predisposizioni", en: "Services: risers and first fix" },
          body: {
            it: "Completate le dorsali elettriche del primo piano e le predisposizioni per le pompe di calore autonome.",
            en: "First-floor electrical risers are done, and the connections for each apartment's heat pump are in place.",
          },
          image: "/media/diario-impianti.jpg",
        },
        {
          id: "u4",
          date: "2026-07-28",
          phaseId: "tramezze",
          title: { it: "Tramezze in blocchi al primo piano", en: "Block partitions on the first floor" },
          body: {
            it: "Le nuove divisioni interne seguono le planimetrie definitive: tre appartamenti al primo piano.",
            en: "The new internal walls follow the final plans: three apartments on the first floor.",
          },
          image: "/media/diario-tramezze.jpg",
        },
        {
          id: "u3",
          date: "2026-06-30",
          phaseId: "strutture",
          title: { it: "Consolidamenti completati", en: "Structural reinforcement complete" },
          body: {
            it: "Rinforzati solai e pilastri dei piani bassi. Il collaudo statico delle opere è fissato a luglio.",
            en: "Lower-floor slabs and columns are reinforced. The structural inspection is booked for July.",
          },
          image: "/media/diario-solaio.jpg",
        },
        {
          id: "u2",
          date: "2026-04-10",
          phaseId: "allestimento",
          title: { it: "Demolizioni interne terminate", en: "Strip-out finished" },
          body: {
            it: "Rimossi tramezzi, pavimenti e vecchi impianti dei piani bassi. Le parti comuni restano accessibili ai residenti della fase 1.",
            en: "Old partitions, floors and services are out of the lower floors. Shared areas stay open to phase 1 residents.",
          },
          image: "/media/diario-squadra.jpg",
        },
        {
          id: "u1",
          date: "2026-02-16",
          phaseId: "allestimento",
          title: { it: "Cantiere aperto", en: "Site opened" },
          body: {
            it: "Recinzione, cartello di cantiere e baracche installati. Inizia la fase 2 sui piani bassi.",
            en: "Hoarding, site board and cabins are up. Phase 2 starts on the lower floors.",
          },
          image: "/media/progetto-tavole.jpg",
        },
      ],
      units: [
        { id: "A1", name: "A1", floor: 0, rooms: 2, bathrooms: 1, area: 52, outdoor: { kind: "garden", area: 35 }, status: "sold", price: null },
        { id: "A2", name: "A2", floor: 0, rooms: 3, bathrooms: 2, area: 86, outdoor: { kind: "garden", area: 60 }, status: "reserved", price: null },
        { id: "A3", name: "A3", floor: 0, rooms: 2, bathrooms: 1, area: 55, outdoor: { kind: "garden", area: 30 }, status: "available", price: null },
        { id: "B1", name: "B1", floor: 1, rooms: 3, bathrooms: 2, area: 98, outdoor: { kind: "balcony", area: 12 }, status: "available", price: null },
        { id: "B2", name: "B2", floor: 1, rooms: 2, bathrooms: 1, area: 60, outdoor: { kind: "balcony", area: 8 }, status: "sold", price: null },
        { id: "B3", name: "B3", floor: 1, rooms: 3, bathrooms: 2, area: 92, outdoor: { kind: "balcony", area: 10 }, status: "available", price: null },
      ],
      tours: [
        {
          id: "cantiere",
          kind: "panorama",
          title: { it: "Cantiere, ottobre 2026", en: "Building site, October 2026" },
          scenes: [
            {
              id: "openspace",
              title: { it: "Primo piano, al grezzo", en: "First floor, shell" },
              image: "/media/pano/cantiere-openspace.jpg",
              thumb: "/media/pano/thumb-cantiere-openspace.jpg",
              startX: 0.47,
              hotspots: [
                { x: 0.47, y: 0.56, target: "soggiorno", label: { it: "Vai al soggiorno B1", en: "Go to the B1 living room" } },
              ],
            },
            {
              id: "soggiorno",
              title: { it: "Soggiorno B1, intonaci", en: "B1 living room, plastering" },
              image: "/media/pano/cantiere-soggiorno.jpg",
              thumb: "/media/pano/thumb-cantiere-soggiorno.jpg",
              startX: 0.55,
              hotspots: [
                { x: 0.155, y: 0.58, target: "openspace", label: { it: "Torna al pianerottolo", en: "Back to the landing" } },
              ],
            },
          ],
        },
      ],
      map: "grazioli-57",
      sources: [SOURCE],
      note: NOTE,
    },
    {
      slug: "grazioli-57-fase-1",
      name: "Grazioli 57",
      subtitle: { it: "Fase 1 · piani alti", en: "Phase 1 · upper floors" },
      status: "completed",
      location: LOCATION,
      cover: {
        src: "/media/fase1-facciata.jpg",
        alt: { it: "Facciata con balconi", en: "Façade with balconies" },
      },
      gallery: [
        { src: "/media/int-soggiorno-cucina.jpg", alt: { it: "Soggiorno con cucina a vista", en: "Living room with open kitchen" } },
        { src: "/media/int-living.jpg", alt: { it: "Zona giorno", en: "Living area" } },
        { src: "/media/int-cucina.jpg", alt: { it: "Cucina", en: "Kitchen" } },
        { src: "/media/int-soggiorno.jpg", alt: { it: "Soggiorno", en: "Living room" } },
        { src: "/media/fase1-facciata.jpg", alt: { it: "Facciata con balconi", en: "Façade with balconies" } },
      ],
      summary: {
        it: "I nove appartamenti dei piani alti di Grazioli 57, già consegnati e abitati. Visitali con il tour 360°.",
        en: "The nine upper-floor apartments of Grazioli 57, handed over and lived in. Visit them in the 360° tour.",
      },
      description: {
        it: "La prima fase di Grazioli 57 ha convertito i piani alti dell'edificio in nove appartamenti, bilocali e trilocali con riscaldamento autonomo a pompa di calore e climatizzazione. Il tour 360° mostra un appartamento tipo, finito e arredato.",
        en: "Phase 1 of Grazioli 57 turned the upper floors into nine one- and two-bedroom apartments, each with its own heat pump and air conditioning. The 360° tour walks through a finished, furnished sample apartment.",
      },
      facts: [...FACTS, { label: { it: "Stato", en: "Status" }, value: { it: "Consegnato e abitato", en: "Handed over, lived in" } }],
      features: FEATURES,
      start: "2024-09",
      delivery: "2025-12",
      phases: [
        { id: "allestimento", name: { it: "Allestimento e demolizioni interne", en: "Site set-up and strip-out" }, progress: 100, weight: 10, start: "2024-09", end: "2024-11" },
        { id: "strutture", name: { it: "Consolidamenti strutturali", en: "Structural reinforcement" }, progress: 100, weight: 15, start: "2024-11", end: "2025-02" },
        { id: "tramezze", name: { it: "Tramezze e massetti", en: "Partitions and screeds" }, progress: 100, weight: 15, start: "2025-02", end: "2025-05" },
        { id: "impianti", name: { it: "Impianti: pompa di calore, elettrico, idraulico", en: "Services: heat pump, electrics, plumbing" }, progress: 100, weight: 20, start: "2025-03", end: "2025-08" },
        { id: "serramenti", name: { it: "Serramenti e facciata", en: "Windows and façade" }, progress: 100, weight: 15, start: "2025-06", end: "2025-09" },
        { id: "finiture", name: { it: "Finiture interne", en: "Interior finishes" }, progress: 100, weight: 15, start: "2025-08", end: "2025-11" },
        { id: "consegna", name: { it: "Collaudi e consegna", en: "Inspections and handover" }, progress: 100, weight: 10, start: "2025-11", end: "2025-12" },
      ],
      updates: [
        {
          id: "f1",
          date: "2025-12-15",
          phaseId: "consegna",
          title: { it: "Consegnate le chiavi dei piani alti", en: "Keys handed over for the upper floors" },
          body: {
            it: "Tutti e nove gli appartamenti della fase 1 sono consegnati. Grazie alle famiglie che ci hanno seguito in cantiere.",
            en: "All nine phase 1 apartments are handed over. Thanks to the families who followed the site with us.",
          },
          image: "/media/int-soggiorno-cucina.jpg",
        },
        {
          id: "f2",
          date: "2025-11-20",
          phaseId: "consegna",
          title: { it: "Collaudi superati", en: "Inspections passed" },
          body: {
            it: "Collaudati impianti, ascensore e parti comuni. Agibilità richiesta.",
            en: "Services, lift and shared areas passed inspection. Occupancy certificate requested.",
          },
          image: "/media/fase1-facciata.jpg",
        },
      ],
      units: [
        { id: "C1", name: "C1", floor: 2, rooms: 2, bathrooms: 1, area: 50, outdoor: { kind: "balcony", area: 6 }, status: "sold", price: null },
        { id: "C2", name: "C2", floor: 2, rooms: 3, bathrooms: 2, area: 88, outdoor: { kind: "balcony", area: 10 }, status: "sold", price: null },
        { id: "C3", name: "C3", floor: 2, rooms: 2, bathrooms: 1, area: 54, status: "sold", price: null },
        { id: "D1", name: "D1", floor: 3, rooms: 2, bathrooms: 1, area: 50, outdoor: { kind: "balcony", area: 6 }, status: "sold", price: null },
        { id: "D2", name: "D2", floor: 3, rooms: 3, bathrooms: 2, area: 90, outdoor: { kind: "balcony", area: 10 }, status: "sold", price: null },
        { id: "D3", name: "D3", floor: 3, rooms: 2, bathrooms: 1, area: 56, status: "sold", price: null },
        { id: "E1", name: "E1", floor: 4, rooms: 2, bathrooms: 1, area: 52, outdoor: { kind: "terrace", area: 50 }, status: "sold", price: null },
        { id: "E2", name: "E2", floor: 4, rooms: 3, bathrooms: 2, area: 100, outdoor: { kind: "terrace", area: 40 }, status: "sold", price: null },
        { id: "E3", name: "E3", floor: 4, rooms: 2, bathrooms: 1, area: 58, outdoor: { kind: "balcony", area: 8 }, status: "sold", price: null },
      ],
      tours: [
        {
          id: "appartamento",
          kind: "panorama",
          title: { it: "Appartamento tipo, trilocale", en: "Sample two-bedroom apartment" },
          scenes: [
            {
              id: "living",
              title: { it: "Soggiorno e cucina", en: "Living room and kitchen" },
              image: "/media/pano/app-soggiorno.jpg",
              thumb: "/media/pano/thumb-app-soggiorno.jpg",
              startX: 0.5,
              hotspots: [
                { x: 0.06, y: 0.52, target: "camera", label: { it: "Camera", en: "Bedroom" } },
                { x: 0.4, y: 0.52, target: "bagno", label: { it: "Bagno", en: "Bathroom" } },
              ],
            },
            {
              id: "camera",
              title: { it: "Camera matrimoniale", en: "Main bedroom" },
              image: "/media/pano/app-camera.jpg",
              thumb: "/media/pano/thumb-app-camera.jpg",
              startX: 0.6,
              hotspots: [{ x: 0.055, y: 0.56, target: "living", label: { it: "Soggiorno", en: "Living room" } }],
            },
            {
              id: "bagno",
              title: { it: "Bagno", en: "Bathroom" },
              image: "/media/pano/app-bagno.jpg",
              thumb: "/media/pano/thumb-app-bagno.jpg",
              startX: 0.5,
              hotspots: [{ x: 0.855, y: 0.6, target: "living", label: { it: "Soggiorno", en: "Living room" } }],
            },
          ],
        },
      ],
      map: "grazioli-57",
      sources: [SOURCE],
      note: NOTE,
    },
  ],
};

export default demo;
