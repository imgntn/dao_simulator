/**
 * Internationalization (i18n) Type Definitions
 *
 * Provides type-safe access to all UI strings in the application.
 * Organized by feature area for easy maintenance.
 */

/**
 * Format string parameters - defines the shape of interpolation values
 */
export interface FormatParams {
  [key: string]: string | number;
}

/**
 * Messages organized by feature area
 */
export interface Messages {
  // Common/shared strings used across the app
  common: {
    connected: string;
    disconnected: string;
    running: string;
    paused: string;
    loading: string;
    error: string;
    close: string;
    cancel: string;
    confirm: string;
    save: string;
    delete: string;
    edit: string;
    view: string;
    back: string;
    next: string;
    done: string;
    skip: string;
    retry: string;
    live: string;
    on: string;
    off: string;
    active: string;
    selected: string;
    pending: string;
    completed: string;
  };

  // Header/navigation strings
  header: {
    apiDocs: string;
    speed: string;
    speedDescription: string;
    step: string;
    hotkeys: string;
  };

  // Simulation controls
  controls: {
    start: string;
    startCity: string;
    stop: string;
    stepButton: string;
    reset: string;
    singleDao: string;
    daoCity: string;
    visualsLive: string;
    visualsPaused: string;
    quickJumpOn: string;
    quickJumpOff: string;
    sidebarOn: string;
    sidebarOff: string;
  };

  // Navigation tabs
  tabs: {
    overview: string;
    view3d: string;
    charts: string;
    strategy: string;
    reports: string;
  };

  // Sub-panel buttons within tabs
  panels: {
    // Overview tab
    daoMap: string;
    opsLog: string;
    // 3D View tab
    tower: string;
    city: string;
    network: string;
    // Charts tab
    price: string;
    heatmap: string;
    geo: string;
    // Reports tab
    daoReport: string;
    orgHistory: string;
    runHistory: string;
  };

  // Tutorial/onboarding
  tutorial: {
    title: string;
    stepOf: string;
    steps: string[];
  };

  // Missions/objectives
  missions: {
    scenario: string;
    status: string;
    overallProgress: string;
    missionsProgress: string;
    noMissions: string;
    startWithObjectives: string;
    // Mission titles
    strengthenTreasury: string;
    strengthenTreasuryDesc: string;
    protectTreasury: string;
    protectTreasuryDesc: string;
    fundGrowth: string;
    fundGrowthDesc: string;
    reduceBacklog: string;
    reduceBacklogDesc: string;
    avoidGridlock: string;
    avoidGridlockDesc: string;
    shipInitiatives: string;
    shipInitiativesDesc: string;
    maintainOperations: string;
    maintainOperationsDesc: string;
    sustainGovernance: string;
    sustainGovernanceDesc: string;
    sustainGrowthRunway: string;
    sustainGrowthRunwayDesc: string;
  };

  // Strategy playbooks
  strategies: {
    playbooks: string;
    // Strategy names and descriptions
    baseline: string;
    baselineDesc: string;
    riskOff: string;
    riskOffDesc: string;
    growthMode: string;
    growthModeDesc: string;
    validatorGovernance: string;
    validatorGovernanceDesc: string;
    communityFirst: string;
    communityFirstDesc: string;
  };

  // Simulation presets
  presets: {
    title: string;
    // Preset names and descriptions
    balanced: string;
    balancedDesc: string;
    validatorFirst: string;
    validatorFirstDesc: string;
    growthPush: string;
    growthPushDesc: string;
  };

  // Challenges
  challenges: {
    title: string;
    startChallenge: string;
    // Challenge names and descriptions
    daily: string;
    dailyDesc: string;
    weekly: string;
    weeklyDesc: string;
  };

  // Reports and stats
  reports: {
    title: string;
    stepsCompleted: string;
    totalSteps: string;
    currentPrice: string;
    priceUp: string;
    priceDown: string;
    priceRange: string;
    treasury: string;
    members: string;
    activeProposals: string;
    ofTotal: string;
    treasuryOverTime: string;
    topTokenHolders: string;
    mostInfluential: string;
    marketShocks: string;
    showLess: string;
    showAll: string;
    noDataAvailable: string;
    runToGenerate: string;
  };

  // Organization history/KPIs
  orgHistory: {
    title: string;
    totalRuns: string;
    totalStepsSimulated: string;
    peakTreasury: string;
    maxShocksInRun: string;
    winRate: string;
    milestones: string;
    firstSimCompleted: string;
    runAtLeastOne: string;
    sustainedOperator: string;
    reach500Steps: string;
    capitalized: string;
    growPeakTreasury: string;
    noHistory: string;
  };

  // Run history
  runHistorySection: {
    title: string;
    lastRuns: string;
    score: string;
    steps: string;
    outcomeWon: string;
    outcomeLost: string;
    leaderboard: string;
    noRunsRecorded: string;
  };

  // Charts and visualizations
  charts: {
    priceHistory: string;
    memberHeatmap: string;
    memberHeatmapSubtitle: string;
    memberDistribution: string;
    loadingData: string;
    noDataYet: string;
    startToSee: string;
    heatmapPaused: string;
    geoPaused: string;
    dataPoints: string;
    currentLabel: string;
    rangeLabel: string;
  };

  // 3D View tab
  view3d: {
    hide3d: string;
    show3d: string;
    hidden3dMessage: string;
    show3dView: string;
    networkControls: string;
    showLabels: string;
    interactiveControls: string;
    nodes: string;
    edges: string;
    towerSnapshot: string;
    proposals: string;
    shocks: string;
    interDaoProposals: string;
    noInterDaoProposals: string;
    startCitySimulation: string;
    visualsPausedMessage: string;
    startToPopulateTower: string;
    startToSeeNetwork: string;
  };

  // DAO Tower component
  daoTower: {
    title: string;
    open3d: string;
    loading: string;
    loadingHelp: string;
    emptyMessage: string;
    emptyHelp: string;
    instructions: string;
    membersAcrossFloors: string;
    floors: string;
    // Floor names
    floor0: string;
    floor1: string;
    floor2: string;
    floor3: string;
    floor4: string;
    floor5: string;
    // Member details
    activity: string;
    floor: string;
    reputation: string;
    tokens: string;
    // Activities
    activityVoting: string;
    activityProposing: string;
    activityDiscussing: string;
    activityCoding: string;
    activityReviewing: string;
    activityResting: string;
    activityTrading: string;
    activityChatting: string;
  };

  // Network graph component
  networkGraph: {
    title: string;
    loading: string;
    emptyMessage: string;
    emptyHelp: string;
    nodeStats: string;
    // Node types
    daoMember: string;
    daoMemberDesc: string;
    governanceProposal: string;
    governanceProposalDesc: string;
    memberCluster: string;
    memberClusterDesc: string;
    // Stats
    membersLabel: string;
    proposalsLabel: string;
    clustersLabel: string;
    totalLabel: string;
    inLabel: string;
    outLabel: string;
    connections: string;
    connectionTypes: string;
    // Connection types
    tokenWeight: string;
    memberCount: string;
    voteWeight: string;
    position: string;
    // Edge types
    delegation: string;
    representative: string;
    created: string;
    aggregated: string;
    // Controls
    zoomIn: string;
    zoomOut: string;
    resetView: string;
    edgeTypes: string;
    nodeInfo: string;
    showingOf: string;
  };

  // DAO City component
  daoCity: {
    title: string;
    subtitle: string;
    marketplace: string;
    daos: string;
    totalMembers: string;
    activeLinks: string;
    connections: string;
    tokenBridge: string;
    jointProposal: string;
    memberTransfer: string;
    emptyMessage: string;
  };

  // Token tracker component
  tokenTracker: {
    daoToken: string;
    marketCap: string;
    high24h: string;
    low24h: string;
    holders: string;
    supply: string;
    fromStart: string;
  };

  // Token ranking board
  tokenRanking: {
    title: string;
    subtitle: string;
    totalMarketCap: string;
    volume24h: string;
    rank: string;
    token: string;
    price: string;
    change24h: string;
    volume: string;
    marketCap: string;
    tokensTracked: string;
    noDataAvailable: string;
    startCityToSee: string;
    noRankings: string;
  };

  // Member heatmap
  heatmap: {
    title: string;
    subtitle: string;
    loading: string;
    emptyMessage: string;
    emptyHelp: string;
    colorLow: string;
    colorHigh: string;
    xAxis: string;
    yAxis: string;
    quadrantHighRepLowTokens: string;
    quadrantHighInfluence: string;
    quadrantLowInfluence: string;
    quadrantLowRepHighTokens: string;
    membersCount: string;
    avgScore: string;
    highInfluenceCount: string;
  };

  // Choropleth/geographic map
  choropleth: {
    title: string;
    loading: string;
    emptyMessage: string;
    emptyHelp: string;
    clickForDetails: string;
    sampleMembers: string;
    moreMembers: string;
    topLocation: string;
    locationsShown: string;
  };

  // Empty/loading states
  states: {
    waitingForData: string;
    startSimulation: string;
    connectToWebSocket: string;
    noSimulationData: string;
    mapPaused: string;
    noOpsLogged: string;
    visualsPaused: string;
  };

  // Operations log
  opsLog: {
    title: string;
    recentEvents: string;
    opsSnapshot: string;
    priceAndTreasury: string;
    riskEvent: string;
    marketShock: string;
    upsideMove: string;
    downsideMove: string;
    severity: string;
    objectiveCompleted: string;
    stepLabel: string;
    event: string;
  };

  // Notifications/alerts
  notifications: {
    missionCompleted: string;
    marketShockAlert: string;
    celebrateMessage: string;
  };

  // Keyboard shortcuts modal
  shortcuts: {
    title: string;
    simulation: string;
    startStop: string;
    step: string;
    reset: string;
    navigation: string;
    pressToToggle: string;
    buttonLabel: string;
    expandNav: string;
    collapseNav: string;
    showShortcuts: string;
  };

  // Run summary modal
  runSummary: {
    title: string;
    runComplete: string;
    objectivesAchieved: string;
    runEnded: string;
    treasuryInsolvency: string;
    priceCollapse: string;
    governanceBacklog: string;
    timeline: string;
    retryPreset: string;
    score: string;
    seed: string;
    preset: string;
    strategy: string;
    outcome: string;
    defaultStrategy: string;
    steps: string;
  };

  // Home page
  home: {
    title: string;
    subtitle: string;
    description: string;
    launchDashboard: string;
    // Feature cards
    feature3dLabel: string;
    feature3dTitle: string;
    feature3dDesc: string;
    featureLiveLabel: string;
    featureLiveTitle: string;
    featureLiveDesc: string;
    featureAgentsLabel: string;
    featureAgentsTitle: string;
    featureAgentsDesc: string;
  };

  // Footer
  footer: {
    brand: string;
    stack: string;
    tagline: string;
  };

  // Error pages
  errors: {
    somethingWentWrong: string;
    unexpectedError: string;
    errorId: string;
    tryAgain: string;
    goHome: string;
    persistsReport: string;
    reportIssue: string;
    pageNotFound: string;
    pageNotFoundDesc: string;
    openDashboard: string;
    // 3D error boundary
    visualization3dUnavailable: string;
    webglError: string;
    checkWebgl: string;
  };

  // Loading states
  loadingStates: {
    loading: string;
    pleaseWait: string;
  };

  // Accessibility
  a11y: {
    skipToMain: string;
    expandNavigation: string;
    collapseNavigation: string;
    showKeyboardShortcuts: string;
    simulationSpeedMultiplier: string;
  };

  // Metadata/SEO
  metadata: {
    title: string;
    titleTemplate: string;
    description: string;
    keywords: string[];
    author: string;
    ogTitle: string;
    ogDescription: string;
    ogSiteName: string;
    twitterTitle: string;
    twitterDescription: string;
  };

  // Atlas (research homepage)
  atlas: {
    tagline: string;
    heroTitle: string;
    heroDescription: string;
    heroCta: string;
    nav: string;
    consoleLink: string;
    researchHeading: string;
    researchSubtitle: string;
    papersHeading: string;
    papersSubtitle: string;
    methodologyHeading: string;
    advancedHeading: string;
    advancedDesc: string;
    whatWeFound: string;
    whatToDo: string;
    whyItMatters: string;
    evidenceLabel: string;
    evidenceDesc: string;
    briefsLabel: string;
    briefsCount: string;
    authorLabel: string;
    authorDesc: string;
    confidenceNote: string;
    briefLabel: string;
    openFullBrief: string;
    sourceBriefMarkdown: string;
    relatedPaperPdf: string;
    currentPdf: string;
    currentTex: string;
    latestArchivedPdf: string;
    rawMetricTakeaways: string;
    methodNotes: string;
    wordsCount: string;
    briefSourceFiles: string;
    footerAttribution: string;
    keyTerms: string;
    footerConsole: string;
    podcastHeading: string;
    podcastDesc: string;
    podcastListen: string;
    podcastApple: string;
    podcastSpotify: string;
    podcastEpisode: string;
  };

  // Console (experiment management)
  console: {
    heading: string;
    subtitle: string;
    description: string;
    latestAction: string;
    runExperiments: string;
    selectConfig: string;
    selectPlaceholder: string;
    run: string;
    resume: string;
    resumeLabel: string;
    reports: string;
    generateReport: string;
    generateReportBtn: string;
    paperPipeline: string;
    paperPipelineDesc: string;
    updatePaper: string;
    compileLabel: string;
    archiveAll: string;
    experimentConfigs: string;
    resultsArchive: string;
    noConfigs: string;
    noResults: string;
    configCount: string;
    resultCount: string;
  };

  // Results (individual result viewer)
  results: {
    heading: string;
    status: string;
    files: string;
    backToAtlas: string;
    backToConsole: string;
    previewTruncated: string;
    noFiles: string;
    noStatus: string;
  };
}
