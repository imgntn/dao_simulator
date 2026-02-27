/**
 * Spanish (es) Message Strings
 *
 * Full Spanish translation of all UI strings.
 * Format strings use {key} placeholders preserved as-is.
 */

import type { Messages } from '../types';

export const messages: Messages = {
  // ═══════════════════════════════════════════════════════════════════════════
  // COMMON
  // ═══════════════════════════════════════════════════════════════════════════
  common: {
    connected: 'Conectado',
    disconnected: 'Desconectado',
    running: 'En ejecuci\u00f3n',
    paused: 'Pausado',
    loading: 'Cargando...',
    error: 'Error',
    close: 'Cerrar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    save: 'Guardar',
    delete: 'Eliminar',
    edit: 'Editar',
    view: 'Ver',
    back: 'Atr\u00e1s',
    next: 'Siguiente',
    done: 'Listo',
    skip: 'Omitir',
    retry: 'Reintentar',
    live: 'En vivo',
    on: 'Activado',
    off: 'Desactivado',
    active: 'Activo',
    selected: 'Seleccionado',
    pending: 'Pendiente',
    completed: 'Completado',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════════════════
  header: {
    apiDocs: 'Documentaci\u00f3n API',
    speed: 'Velocidad:',
    speedDescription: 'Multiplicador de velocidad de simulaci\u00f3n. Valores m\u00e1s altos ejecutan m\u00e1s r\u00e1pido.',
    step: 'Paso: {step}',
    hotkeys: 'Atajos: Espacio iniciar/detener, F paso, R reiniciar.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════
  controls: {
    start: 'Iniciar (Espacio)',
    startCity: 'Iniciar Ciudad (Espacio)',
    stop: 'Detener',
    stepButton: 'Paso (F)',
    reset: 'Reiniciar (R)',
    singleDao: 'DAO Individual',
    daoCity: 'Ciudad DAO',
    visualsLive: 'Visuales: En vivo',
    visualsPaused: 'Visuales: Pausados',
    quickJumpOn: 'Salto r\u00e1pido: Activado',
    quickJumpOff: 'Salto r\u00e1pido: Desactivado',
    sidebarOn: 'Barra lateral: Activada',
    sidebarOff: 'Barra lateral: Desactivada',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TABS
  // ═══════════════════════════════════════════════════════════════════════════
  tabs: {
    overview: 'Resumen',
    view3d: 'Vista 3D',
    charts: 'Gr\u00e1ficos',
    strategy: 'Estrategia',
    reports: 'Informes',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PANELS
  // ═══════════════════════════════════════════════════════════════════════════
  panels: {
    daoMap: 'Mapa DAO',
    opsLog: 'Registro de operaciones',
    tower: 'Torre',
    city: 'Ciudad',
    network: 'Red',
    price: 'Precio',
    heatmap: 'Mapa de calor',
    geo: 'Geograf\u00eda',
    daoReport: 'Informe DAO',
    orgHistory: 'Historial org.',
    runHistory: 'Historial de ejecuciones',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TUTORIAL
  // ═══════════════════════════════════════════════════════════════════════════
  tutorial: {
    title: 'Inicio r\u00e1pido',
    stepOf: 'Paso {current} de {total}',
    steps: [
      'Elige un preset de estrategia o un desaf\u00edo diario/semanal para comenzar.',
      'Presiona Iniciar (Espacio) para transmitir la simulaci\u00f3n; usa Paso (F) para avanzar manualmente.',
      'Observa las misiones en la parte superior; compl\u00e9talas para ganar la ejecuci\u00f3n.',
      'Pausa los visuales si es necesario; Mapa DAO + Informe muestran el estado de un vistazo.',
      'Evita fallos: mant\u00e9n la tesorer\u00eda y el precio saludables, despeja las propuestas pendientes.',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MISSIONS
  // ═══════════════════════════════════════════════════════════════════════════
  missions: {
    scenario: 'Escenario',
    status: 'Estado',
    overallProgress: 'Progreso general',
    missionsProgress: '{completed} de {total} misiones ({percent}%)',
    noMissions: 'No hay misiones definidas',
    startWithObjectives: 'Inicia una simulaci\u00f3n con objetivos',
    strengthenTreasury: 'Fortalecer tesorer\u00eda',
    strengthenTreasuryDesc: 'Objetivo: +20% de balance de tesorer\u00eda en esta ejecuci\u00f3n.',
    protectTreasury: 'Proteger tesorer\u00eda',
    protectTreasuryDesc: 'Mantener la tesorer\u00eda c\u00f3modamente por encima de la l\u00ednea base.',
    fundGrowth: 'Financiar crecimiento',
    fundGrowthDesc: 'Hacer crecer la tesorer\u00eda para apoyar la expansi\u00f3n.',
    reduceBacklog: 'Reducir atrasos',
    reduceBacklogDesc: 'Procesar al menos 3 propuestas.',
    avoidGridlock: 'Evitar bloqueo',
    avoidGridlockDesc: 'Mantener propuestas abiertas cerca de la l\u00ednea base.',
    shipInitiatives: 'Impulsar iniciativas',
    shipInitiativesDesc: 'Procesar m\u00e1s de 3 propuestas enfocadas en crecimiento.',
    maintainOperations: 'Mantener operaciones',
    maintainOperationsDesc: 'Avanzar 100 pasos sin fallar.',
    sustainGovernance: 'Sostener gobernanza',
    sustainGovernanceDesc: 'Mantener operaciones durante otros 100 pasos.',
    sustainGrowthRunway: 'Sostener pista de crecimiento',
    sustainGrowthRunwayDesc: 'Avanzar 100 pasos m\u00e1s.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STRATEGIES
  // ═══════════════════════════════════════════════════════════════════════════
  strategies: {
    playbooks: 'Manuales de estrategia',
    baseline: 'L\u00ednea base',
    baselineDesc: 'Usar la configuraci\u00f3n preestablecida tal cual.',
    riskOff: 'Tesorer\u00eda conservadora',
    riskOffDesc: 'Menor frecuencia de impactos y ligera preferencia por inversores/validadores.',
    growthMode: 'Modo crecimiento',
    growthModeDesc: 'M\u00e1s constructores y creadores de propuestas, tolerar m\u00e1s impactos.',
    validatorGovernance: 'Gobernanza de validadores',
    validatorGovernanceDesc: 'Fortalecer el conjunto de validadores y umbrales de gobernanza.',
    communityFirst: 'Comunidad primero',
    communityFirstDesc: 'Membres\u00eda pasiva m\u00e1s amplia y menor enfoque en validadores.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRESETS
  // ═══════════════════════════════════════════════════════════════════════════
  presets: {
    title: 'Presets de simulaci\u00f3n',
    balanced: 'Equilibrado',
    balancedDesc: 'Mezcla equilibrada de desarrolladores/inversores con impactos moderados',
    validatorFirst: 'Validadores primero',
    validatorFirstDesc: 'M\u00e1s validadores y gobernanza m\u00e1s estricta',
    growthPush: 'Impulso de crecimiento',
    growthPushDesc: 'M\u00e1s desarrolladores y creadores de propuestas, impactos leves',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHALLENGES
  // ═══════════════════════════════════════════════════════════════════════════
  challenges: {
    title: 'Desaf\u00edos',
    startChallenge: 'Iniciar desaf\u00edo',
    daily: 'Desaf\u00edo diario',
    dailyDesc: 'Ejecuci\u00f3n con semilla e impactos constantes; apunta a +30% de tesorer\u00eda en 120 pasos.',
    weekly: 'Desaf\u00edo semanal',
    weeklyDesc: 'Gobernanza con muchos validadores; sobrevive 200 pasos con impactos m\u00ednimos.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORTS
  // ═══════════════════════════════════════════════════════════════════════════
  reports: {
    title: 'Informe de simulaci\u00f3n DAO',
    stepsCompleted: '{count} pasos completados',
    totalSteps: 'Pasos totales',
    currentPrice: 'Precio actual',
    priceUp: 'Subi\u00f3 {percent}%',
    priceDown: 'Baj\u00f3 {percent}%',
    priceRange: 'Rango: ${min} - ${max}',
    treasury: 'Tesorer\u00eda',
    members: 'Miembros',
    activeProposals: 'Propuestas activas',
    ofTotal: 'de {total} en total',
    treasuryOverTime: 'Tesorer\u00eda a lo largo del tiempo',
    topTokenHolders: 'Principales poseedores de tokens',
    mostInfluential: 'Miembros m\u00e1s influyentes',
    marketShocks: 'Impactos del mercado ({count})',
    showLess: 'Mostrar menos',
    showAll: 'Mostrar todos ({count})',
    noDataAvailable: 'No hay datos de simulaci\u00f3n disponibles',
    runToGenerate: 'Ejecuta una simulaci\u00f3n para generar un informe',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ORG HISTORY
  // ═══════════════════════════════════════════════════════════════════════════
  orgHistory: {
    title: 'Historial de la org. y KPIs',
    totalRuns: 'Ejecuciones totales: {count}',
    totalStepsSimulated: 'Pasos simulados totales',
    peakTreasury: 'Tesorer\u00eda m\u00e1xima',
    maxShocksInRun: 'M\u00e1x. impactos en una ejecuci\u00f3n',
    winRate: 'Tasa de \u00e9xito',
    milestones: 'Hitos',
    firstSimCompleted: 'Primera simulaci\u00f3n completada.',
    runAtLeastOne: 'Ejecuta al menos una simulaci\u00f3n.',
    sustainedOperator: 'Operador sostenido: m\u00e1s de 500 pasos totales.',
    reach500Steps: 'Alcanza 500 pasos simulados totales.',
    capitalized: 'Capitalizado: tesorer\u00eda super\u00f3 los 10,000.',
    growPeakTreasury: 'Haz crecer la tesorer\u00eda m\u00e1xima por encima de 10,000.',
    noHistory: 'A\u00fan no hay historial. Completa una ejecuci\u00f3n para generar m\u00e9tricas.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RUN HISTORY
  // ═══════════════════════════════════════════════════════════════════════════
  runHistorySection: {
    title: 'Historial de ejecuciones (sesi\u00f3n)',
    lastRuns: '\u00daltimas {count} ejecuciones',
    score: 'Puntuaci\u00f3n',
    steps: 'Pasos',
    outcomeWon: 'Objetivos cumplidos',
    outcomeLost: 'Ejecuci\u00f3n terminada',
    leaderboard: 'Tabla de l\u00edderes (sesi\u00f3n)',
    noRunsRecorded: 'A\u00fan no hay ejecuciones registradas.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHARTS
  // ═══════════════════════════════════════════════════════════════════════════
  charts: {
    priceHistory: 'Historial de precios del token DAO',
    memberHeatmap: 'Puntuaci\u00f3n de miembros: Reputaci\u00f3n vs Balance de tokens',
    memberHeatmapSubtitle: 'Puntuaci\u00f3n = 50% Reputaci\u00f3n + 50% Tokens (normalizado)',
    memberDistribution: 'Distribuci\u00f3n de miembros por ubicaci\u00f3n',
    loadingData: 'Cargando datos de {type}...',
    noDataYet: 'A\u00fan no hay datos de {type} disponibles',
    startToSee: 'Inicia una simulaci\u00f3n para ver {feature}',
    heatmapPaused: 'Mapas de calor pausados. Reanuda los visuales para ver el mapa de calor de miembros.',
    geoPaused: 'Gr\u00e1ficos geogr\u00e1ficos pausados. Reanuda los visuales para verlos.',
    dataPoints: '{count} puntos de datos',
    currentLabel: 'Actual:',
    rangeLabel: 'Rango:',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW3D
  // ═══════════════════════════════════════════════════════════════════════════
  view3d: {
    hide3d: 'Ocultar 3D',
    show3d: 'Mostrar 3D',
    hidden3dMessage: 'Los visuales 3D est\u00e1n ocultos para mantener un dise\u00f1o compacto.',
    show3dView: 'Mostrar vista 3D',
    networkControls: 'Controles de red',
    showLabels: 'Mostrar etiquetas',
    interactiveControls: 'Controles interactivos',
    nodes: 'Nodos: {count}',
    edges: 'Aristas: {count}',
    towerSnapshot: 'Instant\u00e1nea de la torre',
    proposals: 'Propuestas',
    shocks: 'Impactos',
    interDaoProposals: 'Propuestas inter-DAO',
    noInterDaoProposals: 'A\u00fan no hay propuestas inter-DAO.',
    startCitySimulation: 'Inicia la simulaci\u00f3n de ciudad para ver la visualizaci\u00f3n',
    visualsPausedMessage: 'Visuales pausados. Reanuda para ver escenas 3D.',
    startToPopulateTower: 'Inicia una simulaci\u00f3n para llenar la torre.',
    startToSeeNetwork: 'Inicia una simulaci\u00f3n para ver el grafo de red.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DAO TOWER
  // ═══════════════════════════════════════════════════════════════════════════
  daoTower: {
    title: 'Torre DAO',
    open3d: 'Abrir 3D',
    loading: 'Construyendo la torre DAO...',
    loadingHelp: 'Acomodando a todos',
    emptyMessage: 'A\u00fan no hay miembros en la torre',
    emptyHelp: '\u00a1Inicia una simulaci\u00f3n para ver a los miembros mudarse!',
    instructions: 'Arrastra para rotar \u2022 Desplaza para zoom \u2022 Haz clic en miembros',
    membersAcrossFloors: '{members} miembros en {floors} pisos',
    floors: 'Pisos',
    floor0: 'Vest\u00edbulo',
    floor1: 'Tesorer\u00eda',
    floor2: 'Gobernanza',
    floor3: 'Centro de desarrollo',
    floor4: 'Propuestas',
    floor5: 'Sal\u00f3n',
    activity: 'Actividad',
    floor: 'Piso',
    reputation: 'Reputaci\u00f3n',
    tokens: 'Tokens',
    activityVoting: 'votando',
    activityProposing: 'proponiendo',
    activityDiscussing: 'discutiendo',
    activityCoding: 'programando',
    activityReviewing: 'revisando',
    activityResting: 'descansando',
    activityTrading: 'comerciando',
    activityChatting: 'conversando',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NETWORK GRAPH
  // ═══════════════════════════════════════════════════════════════════════════
  networkGraph: {
    title: 'Grafo de red DAO',
    loading: 'Cargando visualizaci\u00f3n de red...',
    emptyMessage: 'No hay datos de red para mostrar',
    emptyHelp: 'Inicia una simulaci\u00f3n para ver la red DAO',
    nodeStats: 'Estad\u00edsticas de la red',
    daoMember: 'Miembro DAO',
    daoMemberDesc: 'Un participante en la DAO con poder de voto',
    governanceProposal: 'Propuesta de gobernanza',
    governanceProposalDesc: 'Una propuesta de gobernanza en votaci\u00f3n',
    memberCluster: 'Cl\u00faster de miembros',
    memberClusterDesc: 'Un grupo de tipos de miembros similares',
    membersLabel: 'Miembros',
    proposalsLabel: 'Propuestas',
    clustersLabel: 'Cl\u00fasteres',
    totalLabel: 'Total',
    inLabel: 'Entrada',
    outLabel: 'Salida',
    connections: 'Conexiones',
    connectionTypes: 'Tipos de conexi\u00f3n',
    tokenWeight: 'Peso de tokens',
    memberCount: 'Cantidad de miembros',
    voteWeight: 'Peso de voto',
    position: 'Posici\u00f3n',
    delegation: 'Delegaci\u00f3n',
    representative: 'Representante',
    created: 'Creada',
    aggregated: 'Agregada',
    zoomIn: 'Acercar',
    zoomOut: 'Alejar',
    resetView: 'Restablecer vista',
    edgeTypes: 'Tipos de arista',
    nodeInfo: '{count} nodos, {edges} aristas',
    showingOf: 'mostrando {visible} de {total}',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DAO CITY
  // ═══════════════════════════════════════════════════════════════════════════
  daoCity: {
    title: 'Ciudad DAO',
    subtitle: 'Ecosistema multi-DAO',
    marketplace: 'Mercado global',
    daos: 'DAOs',
    totalMembers: 'Miembros totales',
    activeLinks: 'Enlaces activos',
    connections: 'Conexiones',
    tokenBridge: 'Puente de tokens',
    jointProposal: 'Propuesta conjunta',
    memberTransfer: 'Transferencia de miembros',
    emptyMessage: 'No hay datos de ciudad DAO disponibles',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TOKEN TRACKER
  // ═══════════════════════════════════════════════════════════════════════════
  tokenTracker: {
    daoToken: 'Token DAO',
    marketCap: 'Capitalizaci\u00f3n de mercado',
    high24h: 'M\u00e1ximo 24h',
    low24h: 'M\u00ednimo 24h',
    holders: 'Poseedores: {count}',
    supply: 'Oferta: {amount}K',
    fromStart: '{change} desde el inicio',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TOKEN RANKING
  // ═══════════════════════════════════════════════════════════════════════════
  tokenRanking: {
    title: 'Rankings de tokens',
    subtitle: 'Precios de tokens DAO en tiempo real',
    totalMarketCap: 'CAPITALIZACI\u00d3N TOTAL',
    volume24h: 'VOLUMEN 24H',
    rank: '#',
    token: 'Token',
    price: 'Precio',
    change24h: '24h',
    volume: 'Volumen',
    marketCap: 'Cap. de mercado',
    tokensTracked: '{count} tokens rastreados',
    noDataAvailable: 'No hay datos de tokens disponibles',
    startCityToSee: 'Inicia la simulaci\u00f3n de ciudad para ver rankings',
    noRankings: 'No hay rankings disponibles',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HEATMAP
  // ═══════════════════════════════════════════════════════════════════════════
  heatmap: {
    title: 'Puntuaci\u00f3n de miembros: Reputaci\u00f3n vs Balance de tokens',
    subtitle: 'Puntuaci\u00f3n = 50% Reputaci\u00f3n + 50% Tokens (normalizado)',
    loading: 'Cargando datos de miembros...',
    emptyMessage: 'No hay miembros para mostrar',
    emptyHelp: 'Inicia una simulaci\u00f3n para ver datos de miembros',
    colorLow: 'Bajo',
    colorHigh: 'Alto',
    xAxis: 'Balance de tokens (normalizado 0-100)',
    yAxis: 'Reputaci\u00f3n (normalizada 0-100)',
    quadrantHighRepLowTokens: 'Alta rep. / Pocos tokens',
    quadrantHighInfluence: 'Alta influencia',
    quadrantLowInfluence: 'Baja influencia',
    quadrantLowRepHighTokens: 'Baja rep. / Muchos tokens',
    membersCount: '{count} miembros',
    avgScore: 'Puntuaci\u00f3n promedio: {value}',
    highInfluenceCount: '{count} de alta influencia',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHOROPLETH
  // ═══════════════════════════════════════════════════════════════════════════
  choropleth: {
    title: 'Distribuci\u00f3n de miembros por ubicaci\u00f3n',
    loading: 'Cargando datos de ubicaci\u00f3n...',
    emptyMessage: 'No hay datos de ubicaci\u00f3n para mostrar',
    emptyHelp: 'Inicia una simulaci\u00f3n para ver la distribuci\u00f3n de miembros',
    clickForDetails: 'Haz clic en las barras para ver detalles',
    sampleMembers: 'Miembros de ejemplo:',
    moreMembers: '+{count} m\u00e1s',
    topLocation: 'Ubicaci\u00f3n principal: {name} ({percentage}%)',
    locationsShown: '{count} ubicaciones mostradas',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STATES
  // ═══════════════════════════════════════════════════════════════════════════
  states: {
    waitingForData: 'Esperando datos de simulaci\u00f3n',
    startSimulation: 'Inicia una simulaci\u00f3n para ver visualizaciones en tiempo real',
    connectToWebSocket: 'Conectar a WebSocket en {url}',
    noSimulationData: 'No hay datos de simulaci\u00f3n disponibles',
    mapPaused: 'Mapa pausado. Reanuda los visuales para ver el mapa DAO.',
    noOpsLogged: 'A\u00fan no se han registrado operaciones.',
    visualsPaused: 'Visuales pausados. Reanuda para ver {feature}.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OPS LOG
  // ═══════════════════════════════════════════════════════════════════════════
  opsLog: {
    title: 'Registro de operaciones',
    recentEvents: '\u00daltimos {count} eventos',
    opsSnapshot: 'Instant\u00e1nea de operaciones',
    priceAndTreasury: 'Precio {price}, tesorer\u00eda {treasury}',
    riskEvent: 'Evento de riesgo: impacto de mercado',
    marketShock: 'impacto de mercado',
    upsideMove: 'movimiento al alza',
    downsideMove: 'movimiento a la baja',
    severity: 'severidad {value}',
    objectiveCompleted: 'Objetivo completado',
    stepLabel: 'Paso {step}',
    event: 'Evento',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  notifications: {
    missionCompleted: 'Misi\u00f3n completada: {name}',
    marketShockAlert: 'Impacto de mercado: severidad {severity} (paso {step})',
    celebrateMessage: 'Celebra los logros y prep\u00e1rate para los impactos; ajusta la velocidad o estrategia seg\u00fan sea necesario.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SHORTCUTS
  // ═══════════════════════════════════════════════════════════════════════════
  shortcuts: {
    title: 'Atajos de teclado',
    simulation: 'Simulaci\u00f3n',
    startStop: 'Iniciar/Detener',
    step: 'Paso',
    reset: 'Reiniciar',
    navigation: 'Navegaci\u00f3n (Alt + tecla)',
    pressToToggle: 'Presiona ? para alternar este men\u00fa',
    buttonLabel: 'Atajos',
    expandNav: 'Expandir navegaci\u00f3n',
    collapseNav: 'Contraer navegaci\u00f3n',
    showShortcuts: 'Mostrar atajos de teclado (?)',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RUN SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  runSummary: {
    title: 'Resumen de ejecuci\u00f3n',
    runComplete: 'Ejecuci\u00f3n completada',
    objectivesAchieved: 'Objetivos alcanzados',
    runEnded: 'Ejecuci\u00f3n finalizada',
    treasuryInsolvency: 'Ejecuci\u00f3n finalizada \u2013 tesorer\u00eda insolvente',
    priceCollapse: 'Ejecuci\u00f3n finalizada \u2013 colapso del precio del token',
    governanceBacklog: 'Ejecuci\u00f3n finalizada \u2013 acumulaci\u00f3n de gobernanza',
    timeline: 'L\u00ednea de tiempo',
    retryPreset: 'Reintentar con el mismo preset',
    score: 'Puntuaci\u00f3n',
    seed: 'Semilla',
    preset: 'Preset',
    strategy: 'Estrategia',
    outcome: 'Resultado',
    defaultStrategy: 'L\u00ednea base',
    steps: 'Pasos',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HOME
  // ═══════════════════════════════════════════════════════════════════════════
  home: {
    title: 'Simulador DAO',
    subtitle: 'Visualizaci\u00f3n de gobernanza descentralizada en tiempo real',
    description: 'Experimenta la belleza de la toma de decisiones distribuida a trav\u00e9s de impresionantes grafos de red 3D, gr\u00e1ficos interactivos y an\u00e1lisis completos.',
    launchDashboard: 'Abrir panel',
    feature3dLabel: '3D',
    feature3dTitle: 'Grafos de red 3D',
    feature3dDesc: 'Visualiza redes complejas de gobernanza en impresionante 3D con WebGL y Three.js',
    featureLiveLabel: 'En vivo',
    featureLiveTitle: 'An\u00e1lisis en tiempo real',
    featureLiveDesc: 'Gr\u00e1ficos de precios en vivo, mapas de calor e informes actualizados por WebSocket',
    featureAgentsLabel: 'Agentes',
    featureAgentsTitle: 'Simulaci\u00f3n basada en agentes',
    featureAgentsDesc: 'Observa agentes aut\u00f3nomos interactuar, votar y dar forma al futuro de tu DAO',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════════════════
  footer: {
    brand: 'Simulador DAO',
    stack: 'Next.js, Three.js, Recharts, Socket.IO',
    tagline: 'Construido con visi\u00f3n por incre\u00edbles tecn\u00f3logos y artistas',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ERRORS
  // ═══════════════════════════════════════════════════════════════════════════
  errors: {
    somethingWentWrong: 'Algo sali\u00f3 mal',
    unexpectedError: 'Ocurri\u00f3 un error inesperado. Disculpa las molestias.',
    errorId: 'ID del error:',
    tryAgain: 'Intentar de nuevo',
    goHome: 'Ir al inicio',
    persistsReport: 'Si el problema persiste, por favor',
    reportIssue: 'reporta un problema',
    pageNotFound: 'P\u00e1gina no encontrada',
    pageNotFoundDesc: 'La p\u00e1gina que buscas no existe o fue movida.',
    openDashboard: 'Abrir panel',
    visualization3dUnavailable: 'Visualizaci\u00f3n 3D no disponible',
    webglError: 'No se pudo renderizar el grafo de red 3D. Esto puede deberse a problemas de compatibilidad con WebGL en tu navegador o tarjeta gr\u00e1fica.',
    checkWebgl: 'Verificar soporte WebGL',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING
  // ═══════════════════════════════════════════════════════════════════════════
  loadingStates: {
    loading: 'Cargando',
    pleaseWait: 'Por favor espera...',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCESSIBILITY
  // ═══════════════════════════════════════════════════════════════════════════
  a11y: {
    skipToMain: 'Saltar al contenido principal',
    expandNavigation: 'Expandir navegaci\u00f3n',
    collapseNavigation: 'Contraer navegaci\u00f3n',
    showKeyboardShortcuts: 'Mostrar atajos de teclado (?)',
    simulationSpeedMultiplier: 'Multiplicador de velocidad de simulaci\u00f3n. Valores m\u00e1s altos ejecutan m\u00e1s r\u00e1pido.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════════════════
  metadata: {
    title: 'Simulador DAO',
    titleTemplate: '%s | Simulador DAO',
    description: 'Panel de simulaci\u00f3n de gobernanza descentralizada en tiempo real. Explora din\u00e1micas DAO, comportamientos de agentes y mecanismos de gobernanza.',
    keywords: ['DAO', 'simulaci\u00f3n', 'gobernanza', 'blockchain', 'descentralizado', 'modelado basado en agentes'],
    author: 'Equipo del Simulador DAO',
    ogTitle: 'Simulador DAO',
    ogDescription: 'Panel de simulaci\u00f3n de gobernanza descentralizada en tiempo real',
    ogSiteName: 'Simulador DAO',
    twitterTitle: 'Simulador DAO',
    twitterDescription: 'Panel de simulaci\u00f3n de gobernanza descentralizada en tiempo real',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ATLAS
  // ═══════════════════════════════════════════════════════════════════════════
  atlas: {
    tagline: 'Investigaci\u00f3n DAO, hecha accionable',
    heroTitle: 'Atlas de investigaci\u00f3n DAO',
    heroDescription: 'Hallazgos de gobernanza accionables de 16,370 ejecuciones de simulaci\u00f3n en 21 configuraciones experimentales. Comienza con cualquier pregunta de investigaci\u00f3n a continuaci\u00f3n.',
    heroCta: 'Explorar investigaci\u00f3n',
    nav: 'Navegaci\u00f3n principal',
    consoleLink: 'Consola',
    researchHeading: 'Investigaci\u00f3n',
    researchSubtitle: 'Informes de decisi\u00f3n para todas las preguntas de investigaci\u00f3n',
    papersHeading: 'Art\u00edculos',
    papersSubtitle: 'Descarga art\u00edculos de investigaci\u00f3n completos y archivos',
    methodologyHeading: 'Por qu\u00e9 este trabajo es importante',
    advancedHeading: 'Secci\u00f3n avanzada',
    advancedDesc: 'M\u00e9tricas sin procesar, archivos fuente y artefactos t\u00e9cnicos completos.',
    whatWeFound: 'Lo que mostraron los resultados',
    whatToDo: 'Qu\u00e9 hacer',
    whyItMatters: 'Por qu\u00e9 es importante:',
    evidenceLabel: 'Base de evidencia',
    evidenceDesc: 'El art\u00edculo principal de gobernanza reporta 16,370 ejecuciones en 21 configuraciones experimentales.',
    briefsLabel: 'Informes de decisi\u00f3n',
    briefsCount: 'informes que cubren participaci\u00f3n, captura, operaciones, tesorer\u00eda, coordinaci\u00f3n y gobernanza LLM.',
    authorLabel: 'Autor',
    authorDesc: 'Direcci\u00f3n de investigaci\u00f3n y pensamiento sist\u00e9mico por',
    confidenceNote: 'Nota de confianza:',
    briefLabel: 'Informe',
    openFullBrief: 'Abrir informe completo',
    sourceBriefMarkdown: 'Markdown fuente del informe',
    relatedPaperPdf: 'PDF del art\u00edculo relacionado',
    currentPdf: 'PDF actual',
    currentTex: 'TeX actual',
    latestArchivedPdf: '\u00daltimo PDF archivado',
    rawMetricTakeaways: 'Conclusiones de m\u00e9tricas sin procesar',
    methodNotes: 'Notas metodol\u00f3gicas',
    wordsCount: 'palabras',
    briefSourceFiles: 'Archivos fuente de informes + M\u00e9tricas sin procesar',
    footerAttribution: 'Atlas de investigaci\u00f3n DAO por',
    keyTerms: 'T\u00e9rminos clave',
    footerConsole: 'Las herramientas operativas siguen disponibles en la',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSOLE
  // ═══════════════════════════════════════════════════════════════════════════
  console: {
    heading: 'Gesti\u00f3n de experimentos',
    subtitle: 'Consola de investigaci\u00f3n DAO',
    description: 'Gestiona ejecuciones de experimentos, revisa resultados, genera informes y actualiza artefactos del art\u00edculo. Todas las acciones se ejecutan localmente y escriben registros en el directorio de resultados.',
    latestAction: '\u00daltima acci\u00f3n en cola',
    runExperiments: 'Ejecutar experimentos',
    selectConfig: 'Selecciona un archivo de configuraci\u00f3n para iniciar o reanudar una ejecuci\u00f3n por lotes.',
    selectPlaceholder: 'Selecciona una configuraci\u00f3n',
    run: 'Ejecutar',
    resume: 'Reanudar',
    resumeLabel: 'Configuraci\u00f3n a reanudar',
    reports: 'Informes',
    generateReport: 'Genera informes de calidad investigativa a partir de resultados existentes.',
    generateReportBtn: 'Generar informe',
    paperPipeline: 'Pipeline de art\u00edculos',
    paperPipelineDesc: 'Actualiza el art\u00edculo acad\u00e9mico con los \u00faltimos resultados, compila PDFs y archiva versiones.',
    updatePaper: 'Actualizar art\u00edculo',
    compileLabel: 'Compilar',
    archiveAll: 'Archivar todo',
    experimentConfigs: 'Configuraciones de experimentos',
    resultsArchive: 'Archivo de resultados',
    noConfigs: 'No se encontraron configuraciones de experimentos.',
    noResults: 'No se encontraron resultados en ./results.',
    configCount: 'configuraciones',
    resultCount: 'conjuntos de resultados',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RESULTS
  // ═══════════════════════════════════════════════════════════════════════════
  results: {
    heading: 'Resultados',
    status: 'Estado',
    files: 'Archivos',
    backToAtlas: 'Volver al atlas',
    backToConsole: 'Volver a la consola',
    previewTruncated: 'Vista previa truncada en',
    noFiles: 'No se encontraron archivos.',
    noStatus: 'No se encontr\u00f3 status.json.',
  },
};
