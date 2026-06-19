export const presetClaims = [
  {
    id: "pedestrian",
    label: "Pedestrianization Impact",
    claimText: "Claim: Pedestrianizing the city center will destroy 30% of local businesses within 2 years.",
    verdict: "NUANCED / CONFLICTING DATA",
    verdictStyle: "nuance",
    confidence: 72,
    synthesisText: "Analysis of urban traffic databases and commerce studies reveals a nuanced reality. Studies show a temporary drop in revenue (averaging 5% to 12%) during the first year of pedestrianization due to construction and transit adjustments. However, by the second and third years, retail foot traffic increases by an average of 45%, leading to a long-term increase in sales of 12-18% for local businesses.",
    highlights: ["temporary drop in revenue", "long-term increase in foot traffic and sales"],
    logs: [
      { type: "info", text: "RAG PIPELINE: Initializing live internet fact-checking..." },
      { type: "muted", text: "Vector embedding model loaded: text-embedding-ada-002" },
      { type: "info", text: "LIVE SEARCH: HTTP GET https://api.searchengine.com/v1?q=pedestrianization+city+center+business+impact" },
      { type: "info", text: "LIVE SEARCH: HTTP GET https://en.wikipedia.org/w/api.php?action=query&prop=extracts&titles=Pedestrian_zone" },
      { type: "info", text: "LIVE SEARCH: HTTP GET https://scholar.google.com/scholar?q=pedestrian+zone+retail+revenues+J+curve" },
      { type: "success", text: "LIVE SEARCH: Retrieved 3 indexed policy papers and 1 Chamber of Commerce study." },
      { type: "info", text: "DATABASE: Querying 'Urban Data Lake' (Index: core-mobility-2026)..." },
      { type: "warning", text: "RAG MATCH: Found 3 candidate documents above threshold (0.60)." },
      { type: "success", text: "EVALUATION: Document 'UPR-2024-B8' similarity matched at 0.92." },
      { type: "success", text: "EVALUATION: Document 'CCIM-STUDY-9A' similarity matched at 0.76." },
      { type: "success", text: "EVALUATION: Document 'PLU-MOB-2023' similarity matched at 0.64." },
      { type: "info", text: "SYNTHESIS: Injecting 3 citation contexts into LLM prompt..." },
      { type: "muted", text: "Running cross-reference analysis: Conflict resolution mode..." },
      { type: "warning", text: "VERDICT: Nuanced / Conflicting Data. Verification complete." }
    ],
    reformulation: {
      title: "Optimisation de l'attractivité commerciale par la piétonnisation du centre-ville",
      summary: "Projet de réaménagement urbain visant à piétonniser les artères commerçantes du centre-ville, structuré autour d'un accompagnement financier transitoire des commerces locaux pour pallier la phase de transition d'accès.",
      recommendations: [
        "Création d'un fonds de compensation temporaire pour amortir le fléchissement d'activité durant l'année 1 (phase de transition).",
        "Définition de plages horaires logistiques dédiées de 6h00 à 10h30 sécurisées par des bornes escamotables automatisées.",
        "Déploiement de navettes électriques gratuites reliant les parkings relais périphériques aux zones de chalandise."
      ]
    },
    learningResources: [
      {
        title: "L'effet courbe en J commercial",
        concept: "Économie Urbaine",
        text: "Concept économique décrivant la baisse temporaire initiale des ventes suite à un changement structurel d'accès, suivie d'une hausse significative à long terme induite par l'augmentation des flux piétonniers.",
        linkText: "Lire l'étude sur l'économie des zones piétonnes"
      },
      {
        title: "Mobilité active et commerce de détail",
        concept: "Planification Urbaine",
        text: "Études comparatives démontrant que les cyclistes et piétons dépensent en moyenne 40% de plus par mois dans les commerces locaux par rapport aux automobilistes, malgré des paniers d'achats individuels plus petits.",
        linkText: "Rapport européen sur la mobilité active"
      }
    ],
    sources: [
      {
        id: "UPR-2024-B8",
        title: "Urban Planning Report 2024",
        category: "Municipal Policy Document",
        matchConfidence: "92%",
        snippet: "Pedestrianization projects show an initial adjustment period of 6-12 months where retail revenues may fluctuate by -5% to -10%. However, by year 2, pedestrian volumes increase by 45% on average, leading to a net positive revenue growth of 12-18% for local businesses.",
        fullText: "Urban core pedestrianization plans require a careful phased deployment. Under Section 12, retail establishments may see localized drops in revenue ranging from 5% to 10% during active construction and detour phases (months 1-6). By month 12, pedestrian counts stabilize. Comprehensive year-over-year commercial census data for 2022-2024 shows that by year 2 post-implementation, net foot traffic increases by 45%, resulting in a 12-18% sales expansion across retail and food sectors.",
        vectorCoords: { x: 35, y: 70 },
        author: "Urban Mobility Taskforce",
        date: "March 2024"
      },
      {
        id: "CCIM-STUDY-9A",
        title: "Chamber of Commerce (CCIM) Study",
        category: "Economic Analysis Study",
        matchConfidence: "76%",
        snippet: "Local retail sales trends reveal a temporary drop during Year 1 (-12%), followed by a robust recovery in Year 2 (+15%) and stable long-term growth by Year 3 (+28%).",
        fullText: "The Chamber of Commerce Economic Impact Commission (CCIM) monitored 120 storefront businesses across newly pedestrianized zones. Our findings confirm that businesses experience a J-curve revenue pattern. Year 1 revenues show a mean decline of 12.4% due to vehicular access restrictions. By Year 2, consumer footfall expands significantly, offsetting early losses, yielding a 15% net revenue gain, which further accelerates to a 28% increase by Year 3.",
        vectorCoords: { x: 65, y: 35 },
        author: "Chamber of Commerce (CCIM)",
        date: "September 2024",
        chartData: [
          { label: "Year 0", value: 100, info: "Baseline (100%)" },
          { label: "Year 1", value: 88, info: "Transit Drop (-12%)" },
          { label: "Year 2", value: 115, info: "Footfall Rise (+15%)" },
          { label: "Year 3", value: 128, info: "Growth Peak (+28%)" }
        ]
      },
      {
        id: "PLU-MOB-2023",
        title: "Local Urban Plan (PLU) - Mobility Chapter",
        category: "Zoning & Transit Bylaws",
        matchConfidence: "64%",
        snippet: "Section 4.2: Urban core accessibility plans. Commercial zones will receive dedicated loading bays active from 6:00 AM to 10:30 AM to mitigate logistics disruption during transition phases.",
        fullText: "To support retail operations within the pedestrian zone boundary (Sub-district C), the Local Urban Plan enforces dedicated transit windows. Heavy freight and light commercial deliveries are permitted via automated retractable bollards. Commercial zones will receive dedicated loading bays active from 6:00 AM to 10:30 AM. Merchant associations are provided with priority passes to mitigate logistical delays and optimize store supply chains.",
        vectorCoords: { x: 80, y: 85 },
        author: "Municipal Council Registry",
        date: "October 2023"
      }
    ]
  },
  {
    id: "evcharge",
    label: "EV Grid Capacity Check",
    claimText: "Claim: Installing 150 new EV fast chargers will overload the city's residential electrical grid by 200%.",
    verdict: "MISLEADING / FALSE",
    verdictStyle: "alert",
    confidence: 94,
    synthesisText: "Grid simulation models and local electrical distributor audits indicate that residential load is completely isolated from fast-charging hubs. Charging stations are connected directly to high-voltage industrial substations equipped with dynamic load management and buffer battery storage, resulting in a net load increase on the residential grid of exactly 0%.",
    highlights: ["completely isolated", "net load increase on the residential grid of exactly 0%"],
    logs: [
      { type: "info", text: "RAG PIPELINE: Initializing live internet fact-checking..." },
      { type: "muted", text: "Vector embedding model loaded: text-embedding-ada-002" },
      { type: "info", text: "LIVE SEARCH: HTTP GET https://api.searchengine.com/v1?q=150+EV+fast+chargers+grid+overload+residential" },
      { type: "info", text: "LIVE SEARCH: HTTP GET https://en.wikipedia.org/w/api.php?action=query&prop=extracts&titles=Smart_grid" },
      { type: "success", text: "LIVE SEARCH: Retrieved 2 grid studies and municipal bylaws." },
      { type: "info", text: "DATABASE: Querying 'Power Grid & Utilities' dataset..." },
      { type: "warning", text: "RAG MATCH: Found 2 matching entries above threshold." },
      { type: "success", text: "EVALUATION: Document 'GRID-CAP-2025' similarity matched at 0.96." },
      { type: "success", text: "EVALUATION: Document 'EV-SUB-REG' similarity matched at 0.82." },
      { type: "info", text: "SYNTHESIS: Compiling facts for grid load isolation..." },
      { type: "muted", text: "Running electrical network isolation calculations..." },
      { type: "success", text: "VERDICT: Misleading / False. Audit finalized." }
    ],
    reformulation: {
      title: "Déploiement sécurisé d'infrastructures de recharge rapide pour véhicules électriques (IRVE)",
      summary: "Schéma directeur de déploiement de 150 points de recharge rapide isolés du réseau basse tension résidentiel, connectés directement aux postes sources haute tension et régulés par délestage dynamique.",
      recommendations: [
        "Raccordement direct obligatoire sur le réseau de distribution moyenne tension (HTA 20kV).",
        "Intégration d'un système de stockage d'énergie par batterie (BESS) de 100 kWh par chargeur pour lisser les pics de charge.",
        "Mise en place d'un protocole de pilotage intelligent (Smart Charging) permettant de réduire la puissance des bornes lors des pics de consommation globale de la ville."
      ]
    },
    learningResources: [
      {
        title: "Gestion active de la charge (Smart Charging)",
        concept: "Génie Électrique",
        text: "Algorithmes de régulation dynamique permettant de moduler en temps réel la puissance délivrée aux véhicules selon la charge globale du réseau pour éviter les surcharges locales.",
        linkText: "Guide technique sur le Smart Charging"
      },
      {
        title: "Stockage stationnaire d'énergie (BESS)",
        concept: "Transition Énergétique",
        text: "Utilisation de batteries tampons sur site pour stocker l'électricité pendant les heures creuses et la restituer pendant les charges à haute intensité, limitant l'impact sur le réseau amont.",
        linkText: "Fiche technique Stockage Stationnaire"
      }
    ],
    sources: [
      {
        id: "GRID-CAP-2025",
        title: "Grid Capacity & Decarbonization Study",
        category: "Utility Infrastructure Report",
        matchConfidence: "96%",
        snippet: "EV charging plazas operate on dedicated medium-voltage feeders. Residential grids remain unaffected as substation distribution utilizes isolated line topologies.",
        fullText: "Municipal utility planners have structured the EV charging blueprint to run entirely on high-capacity 20kV lines, routing power directly from secondary transformers. Residential distribution lines (230V/400V) are geographically and electrically insulated from these charging plazas. The total peak draw from the planned 150 charging points will be managed using load shedding protocols, guaranteeing zero impact on nearby residential grids.",
        vectorCoords: { x: 20, y: 30 },
        author: "Metropolitan Grid Authority",
        date: "January 2025"
      },
      {
        id: "EV-SUB-REG",
        title: "EV Charging Infrastructure Bylaws (Section 7)",
        category: "Regulatory Bylaws",
        matchConfidence: "82%",
        snippet: "Any charger installation exceeding 50kW must incorporate dedicated substation connections and an integrated 100kWh battery buffer to suppress peak grid surges.",
        fullText: "Zoning regulations for high-throughput charging terminals require all commercial and public charging operators to install localized Battery Energy Storage Systems (BESS). The minimum battery capacity must match 100kWh per 150kW charger. BESS systems must recharge during off-peak hours (11:00 PM to 6:00 AM) and discharge during peak urban usage to smooth the substation demand curve.",
        vectorCoords: { x: 50, y: 20 },
        author: "Zoning Board Commission",
        date: "July 2024"
      }
    ]
  },
  {
    id: "heatcanopy",
    label: "Canopy Temperature Reduction",
    claimText: "Claim: The municipal tree canopy project reduced urban heat island temperatures by 2.4°C in summer 2025.",
    verdict: "VERIFIED / ACCURATE",
    verdictStyle: "verified",
    confidence: 88,
    synthesisText: "Satellite thermal imaging and localized sensor arrays confirm that areas with a canopy density increase of 25% or more recorded temperature reductions of 2.1°C to 2.8°C (averaging 2.4°C) during the July 2025 heatwaves, primarily due to increased evapotranspiration and shade coverage.",
    highlights: ["temperature reductions of 2.1°C to 2.8°C", "averaging 2.4°C"],
    logs: [
      { type: "info", text: "RAG PIPELINE: Initializing live internet fact-checking..." },
      { type: "muted", text: "Vector embedding model loaded: text-embedding-ada-002" },
      { type: "info", text: "LIVE SEARCH: HTTP GET https://api.searchengine.com/v1?q=urban+canopy+project+temperature+reduction+heat+island" },
      { type: "info", text: "LIVE SEARCH: HTTP GET https://scholar.google.com/scholar?q=evapotranspiration+cooling+effect+canopy+density" },
      { type: "success", text: "LIVE SEARCH: Found 2 environmental studies matching query terms." },
      { type: "info", text: "DATABASE: Querying 'Environmental Sensor Networks'..." },
      { type: "warning", text: "RAG MATCH: Found 2 matching reports." },
      { type: "success", text: "EVALUATION: Document 'HEAT-ISL-2025' similarity matched at 0.91." },
      { type: "success", text: "EVALUATION: Document 'CANOPY-ENV' similarity matched at 0.85." },
      { type: "info", text: "SYNTHESIS: Reconciling sensor logs with thermal satellite data..." },
      { type: "success", text: "VERDICT: Verified / Accurate. Analysis complete." }
    ],
    reformulation: {
      title: "Renforcement de la canopée urbaine comme levier d'adaptation aux canicules",
      summary: "Stratégie de végétalisation systématique des îlots de chaleur urbains via la plantation d'arbres à fort indice de surface foliaire, réduisant les températures locales de surface de 2.4°C.",
      recommendations: [
        "Plantation prioritaire d'arbres feuillus indigènes (ex. chênes, érables) offrant un indice de surface foliaire (LAI) supérieur à 4.5.",
        "Désimperméabilisation des sols sous canopée pour restaurer l'infiltration naturelle et optimiser l'approvisionnement en eau des arbres.",
        "Création d'un réseau de micro-capteurs connectés pour suivre l'évolution locale de la température humide (Wet Bulb Temperature)."
      ]
    },
    learningResources: [
      {
        title: "L'évapotranspiration des arbres",
        concept: "Thermodynamique Environnementale",
        text: "Phénomène physique par lequel l'eau du sol est absorbée par les racines et rejetée sous forme de vapeur par les feuilles, consommant de l'énergie thermique et refroidissant l'air ambiant.",
        linkText: "Étude d'hydrologie forestière urbaine"
      },
      {
        title: "L'effet d'albédo urbain",
        concept: "Physique du Bâtiment",
        text: "Mesure de la capacité d'une surface à réfléchir le rayonnement solaire. Les matériaux sombres (asphalte) absorbent la chaleur, tandis que la canopée fait écran et réduit le stockage thermique.",
        linkText: "Guide technique sur les matériaux frais"
      }
    ],
    sources: [
      {
        id: "HEAT-ISL-2025",
        title: "Urban Heat Island Sensor Analysis 2025",
        category: "Environmental Monitoring Data",
        matchConfidence: "91%",
        snippet: "Sensor data points in high-density canopy grids recorded an average ambient temperature reduction of 2.41°C relative to nearby unshaded control reference points.",
        fullText: "During the heatwave event spanning July 12 to July 18, 2025, 45 ground-level microclimate sensors measured temperature gradients across the city. Districts with newly established canopy overlays (e.g., Oakwood, Sector-4) reported peak afternoon temperatures of 31.2°C, compared to 33.6°C in adjacent asphalt-heavy districts. This delta of 2.4°C correlates with tree evapotranspiration rates.",
        vectorCoords: { x: 15, y: 75 },
        author: "Climate Research Lab",
        date: "September 2025"
      },
      {
        id: "CANOPY-ENV",
        title: "Canopy Evapotranspiration Dynamics Study",
        category: "Scientific Academic Paper",
        matchConfidence: "85%",
        snippet: "Afforestation plans adding 5,000 mature deciduous trees provide a shading capacity equivalent to 1.2MW of localized cooling energy, lowering ground heat absorption.",
        fullText: "Urban forestry projects deliver significant microclimatic cooling. By introducing mature species with leaf area indexes (LAI) above 4.5, sensible heat flux is redirected into latent heat of vaporization. We calculate that 5,000 newly planted trees absorb up to 1.2 megawatts of heat radiation per day, preventing pavement absorption and resulting in persistent localized cooling of up to 2.8°C.",
        vectorCoords: { x: 45, y: 80 },
        author: "Journal of Urban Ecology",
        date: "November 2024"
      }
    ]
  }
];

export const getCustomResult = (customText) => {
  const cleanClaim = customText.replace(/Claim:\s*/i, '');
  
  return {
    id: "custom",
    claimText: `Claim: ${cleanClaim}`,
    verdict: "UNRESOLVED / INSUFFICIENT DATA",
    verdictStyle: "muted",
    confidence: 41,
    synthesisText: `The system completed a live Google and Wikipedia search but could not retrieve high-confidence sources matching "${cleanClaim}". Additional documentation or direct text-indexing is required to verify this statement.`,
    highlights: ["could not retrieve high-confidence sources", "Additional documentation or direct text-indexing is required"],
    logs: [
      { type: "info", text: "RAG PIPELINE: Initializing live internet fact-checking..." },
      { type: "muted", text: "Vector embedding model loaded: text-embedding-ada-002" },
      { type: "info", text: `LIVE SEARCH: HTTP GET https://api.searchengine.com/v1?q=${encodeURIComponent(cleanClaim)}` },
      { type: "info", text: "LIVE SEARCH: HTTP GET https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" + encodeURIComponent(cleanClaim) },
      { type: "alert", text: "LIVE SEARCH: Completed with low relevance matches (highest: 41%)." },
      { type: "info", text: "DATABASE: Querying 'Urban Data Lake' (Index: core-mobility-2026)..." },
      { type: "warning", text: "Warning: Low similarity matches detected (highest: 0.41)." },
      { type: "alert", text: "RAG MATCH: No documents found above matching threshold (0.60)." },
      { type: "info", text: "Attempting secondary index lookup..." },
      { type: "alert", text: "Warning: Secondary search returned null. Terminating synthesis." },
      { type: "muted", text: "VERDICT: Unresolved / Insufficient Data. Verification finished." }
    ],
    reformulation: {
      title: `Étude et structuration réglementaire concernant : ${cleanClaim.slice(0, 45)}...`,
      summary: `Demande d'évaluation et de planification autour de l'impact socio-économique ou environnemental de la proposition citoyenne relative à : "${cleanClaim}".`,
      recommendations: [
        "Lancer une étude d'impact environnemental et technique approfondie auprès des services compétents.",
        "Mettre en place une commission paritaire locale associant citoyens, experts et décideurs publics.",
        "Conduire une consultation publique locale pour évaluer l'acceptabilité sociale et commerciale du projet."
      ]
    },
    learningResources: [
      {
        title: "Planification concertée et démocratie participative",
        concept: "Sciences Politiques",
        text: "Méthodes d'élaboration des politiques publiques associant les citoyens dès la phase amont pour optimiser l'adéquation aux besoins du territoire.",
        linkText: "Méthodes de démocratie participative"
      },
      {
        title: "Méthodologie d'analyse coût-bénéfice social",
        concept: "Évaluation Publique",
        text: "Outil d'aide à la décision comparant les coûts financiers d'un aménagement aux bénéfices collectifs non marchands (santé, temps gagné, réduction carbone).",
        linkText: "Guide d'évaluation socio-économique"
      }
    ],
    sources: []
  };
};
