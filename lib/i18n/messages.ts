/**
 * Internationalization (i18n) Message Strings
 *
 * All user-facing text in the DAO Simulator application.
 * Organized by feature area for easy maintenance.
 *
 * Format strings use {key} placeholders:
 *   format(messages.tutorial.stepOf, { current: 1, total: 5 })
 *   → "Step 1 of 5"
 */

import type { Messages } from './types';

export const messages: Messages = {
  // ═══════════════════════════════════════════════════════════════════════════
  // COMMON - Shared strings used across the app
  // ═══════════════════════════════════════════════════════════════════════════
  common: {
    connected: 'Connected',
    disconnected: 'Disconnected',
    running: 'Running',
    paused: 'Paused',
    loading: 'Loading...',
    error: 'Error',
    close: 'Close',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    back: 'Back',
    next: 'Next',
    done: 'Done',
    skip: 'Skip',
    retry: 'Retry',
    live: 'Live',
    on: 'On',
    off: 'Off',
    active: 'Active',
    selected: 'Selected',
    pending: 'Pending',
    completed: 'Done',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER - Top navigation and status
  // ═══════════════════════════════════════════════════════════════════════════
  header: {
    apiDocs: 'API Docs',
    speed: 'Speed:',
    speedDescription: 'Simulation speed multiplier. Higher values run faster.',
    step: 'Step: {step}',
    hotkeys: 'Hotkeys: Space start/stop, F step, R reset.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTROLS - Simulation control buttons
  // ═══════════════════════════════════════════════════════════════════════════
  controls: {
    start: 'Start (Space)',
    startCity: 'Start City (Space)',
    stop: 'Stop',
    stepButton: 'Step (F)',
    reset: 'Reset (R)',
    singleDao: 'Single DAO',
    daoCity: 'DAO City',
    visualsLive: 'Visuals: Live',
    visualsPaused: 'Visuals: Paused',
    quickJumpOn: 'Quick jump: On',
    quickJumpOff: 'Quick jump: Off',
    sidebarOn: 'Sidebar: On',
    sidebarOff: 'Sidebar: Off',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TABS - Main navigation tabs
  // ═══════════════════════════════════════════════════════════════════════════
  tabs: {
    overview: 'Overview',
    view3d: '3D View',
    charts: 'Charts',
    strategy: 'Strategy',
    reports: 'Reports',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PANELS - Sub-panel buttons within tabs
  // ═══════════════════════════════════════════════════════════════════════════
  panels: {
    // Overview tab
    daoMap: 'DAO Map',
    opsLog: 'Ops Log',
    // 3D View tab
    tower: 'Tower',
    city: 'City',
    network: 'Network',
    // Charts tab
    price: 'Price',
    heatmap: 'Heatmap',
    geo: 'Geo',
    // Reports tab
    daoReport: 'DAO Report',
    orgHistory: 'Org History',
    runHistory: 'Run History',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TUTORIAL - Onboarding/quick start
  // ═══════════════════════════════════════════════════════════════════════════
  tutorial: {
    title: 'Quick start',
    stepOf: 'Step {current} of {total}',
    steps: [
      'Pick a strategy preset or a daily/weekly challenge to begin.',
      'Press Start (Space) to stream the sim; use Step (F) to advance manually.',
      'Watch missions at the top; finish them to win the run.',
      'Pause visuals if needed; DAO Map + Report show health at a glance.',
      'Avoid failures: keep treasury and price healthy, clear proposal backlog.',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MISSIONS - Objectives and goals
  // ═══════════════════════════════════════════════════════════════════════════
  missions: {
    scenario: 'Scenario',
    status: 'Status',
    overallProgress: 'Overall Progress',
    missionsProgress: '{completed} of {total} missions ({percent}%)',
    noMissions: 'No missions defined',
    startWithObjectives: 'Start a simulation with objectives',
    // Default missions
    strengthenTreasury: 'Strengthen Treasury',
    strengthenTreasuryDesc: 'Target +20% treasury balance this run.',
    protectTreasury: 'Protect Treasury',
    protectTreasuryDesc: 'Keep treasury comfortably above baseline.',
    fundGrowth: 'Fund Growth',
    fundGrowthDesc: 'Grow treasury to support expansion.',
    reduceBacklog: 'Reduce Backlog',
    reduceBacklogDesc: 'Process at least 3 proposals.',
    avoidGridlock: 'Avoid Gridlock',
    avoidGridlockDesc: 'Keep open proposals close to baseline.',
    shipInitiatives: 'Ship Initiatives',
    shipInitiativesDesc: 'Process 3+ proposals focused on growth.',
    maintainOperations: 'Maintain Operations',
    maintainOperationsDesc: 'Advance 100 steps without failing.',
    sustainGovernance: 'Sustain Governance',
    sustainGovernanceDesc: 'Maintain operations for another 100 steps.',
    sustainGrowthRunway: 'Sustain Growth Runway',
    sustainGrowthRunwayDesc: 'Advance 100 more steps.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STRATEGIES - Strategy playbooks
  // ═══════════════════════════════════════════════════════════════════════════
  strategies: {
    playbooks: 'Strategy Playbooks',
    baseline: 'Baseline',
    baselineDesc: 'Use the preset configuration as-is.',
    riskOff: 'Risk-Off Treasury',
    riskOffDesc: 'Lower shock frequency and slightly favor investors/validators.',
    growthMode: 'Growth Mode',
    growthModeDesc: 'Increase builders and proposal creators, tolerate more shocks.',
    validatorGovernance: 'Validator Governance',
    validatorGovernanceDesc: 'Strengthen validator set and governance thresholds.',
    communityFirst: 'Community-First',
    communityFirstDesc: 'Broader passive membership and lighter validator focus.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRESETS - Simulation presets
  // ═══════════════════════════════════════════════════════════════════════════
  presets: {
    title: 'Simulation Presets',
    balanced: 'Balanced',
    balancedDesc: 'Even mix of devs/investors with moderate shocks',
    validatorFirst: 'Validator-First',
    validatorFirstDesc: 'More validators and stricter governance',
    growthPush: 'Growth Push',
    growthPushDesc: 'More developers and proposal creators, light shocks',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHALLENGES - Daily/weekly challenges
  // ═══════════════════════════════════════════════════════════════════════════
  challenges: {
    title: 'Challenges',
    startChallenge: 'Start challenge',
    daily: 'Daily Challenge',
    dailyDesc: 'Seeded run with steady shocks; aim for +30% treasury in 120 steps.',
    weekly: 'Weekly Challenge',
    weeklyDesc: 'Validator-heavy governance; survive 200 steps with minimal shocks.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORTS - DAO Report tab
  // ═══════════════════════════════════════════════════════════════════════════
  reports: {
    title: 'DAO Simulation Report',
    stepsCompleted: '{count} steps completed',
    totalSteps: 'Total Steps',
    currentPrice: 'Current Price',
    priceUp: 'Up {percent}%',
    priceDown: 'Down {percent}%',
    priceRange: 'Range: ${min} - ${max}',
    treasury: 'Treasury',
    members: 'Members',
    activeProposals: 'Active Proposals',
    ofTotal: 'of {total} total',
    treasuryOverTime: 'Treasury Over Time',
    topTokenHolders: 'Top Token Holders',
    mostInfluential: 'Most Influential Members',
    marketShocks: 'Market Shocks ({count})',
    showLess: 'Show less',
    showAll: 'Show all {count}',
    noDataAvailable: 'No simulation data available',
    runToGenerate: 'Run a simulation to generate a report',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ORG HISTORY - Organization history and KPIs
  // ═══════════════════════════════════════════════════════════════════════════
  orgHistory: {
    title: 'Org History & KPIs',
    totalRuns: 'Total runs: {count}',
    totalStepsSimulated: 'Total steps simulated',
    peakTreasury: 'Peak treasury',
    maxShocksInRun: 'Max shocks in a run',
    winRate: 'Win rate',
    milestones: 'Milestones',
    firstSimCompleted: 'First simulation completed.',
    runAtLeastOne: 'Run at least one simulation.',
    sustainedOperator: 'Sustained operator: 500+ total steps.',
    reach500Steps: 'Reach 500 total simulated steps.',
    capitalized: 'Capitalized: treasury peaked above 10,000.',
    growPeakTreasury: 'Grow peak treasury above 10,000.',
    noHistory: 'No org history yet. Complete a run to populate metrics.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RUN HISTORY - Session run history
  // ═══════════════════════════════════════════════════════════════════════════
  runHistorySection: {
    title: 'Run History (session)',
    lastRuns: 'Last {count} runs',
    score: 'Score',
    steps: 'Steps',
    outcomeWon: 'Objectives met',
    outcomeLost: 'Run ended',
    leaderboard: 'Leaderboard (session)',
    noRunsRecorded: 'No runs recorded yet.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHARTS - Chart visualizations
  // ═══════════════════════════════════════════════════════════════════════════
  charts: {
    priceHistory: 'DAO Token Price History',
    memberHeatmap: 'Member Score: Reputation vs Token Balance',
    memberHeatmapSubtitle: 'Score = 50% Reputation + 50% Tokens (normalized)',
    memberDistribution: 'Member Distribution by Location',
    loadingData: 'Loading {type} data...',
    noDataYet: 'No {type} data available yet',
    startToSee: 'Start a simulation to see {feature}',
    heatmapPaused: 'Heatmaps are paused. Resume visuals to view the member heatmap.',
    geoPaused: 'Geographic charts are paused. Resume visuals to view them.',
    dataPoints: '{count} data points',
    currentLabel: 'Current:',
    rangeLabel: 'Range:',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW3D - 3D View tab
  // ═══════════════════════════════════════════════════════════════════════════
  view3d: {
    hide3d: 'Hide 3D',
    show3d: 'Show 3D',
    hidden3dMessage: '3D visuals are hidden to keep the layout compact.',
    show3dView: 'Show 3D View',
    networkControls: 'Network Controls',
    showLabels: 'Show labels',
    interactiveControls: 'Interactive controls',
    nodes: 'Nodes: {count}',
    edges: 'Edges: {count}',
    towerSnapshot: 'Tower Snapshot',
    proposals: 'Proposals',
    shocks: 'Shocks',
    interDaoProposals: 'Inter-DAO Proposals',
    noInterDaoProposals: 'No inter-DAO proposals yet.',
    startCitySimulation: 'Start the city simulation to see the visualization',
    visualsPausedMessage: 'Visuals paused. Resume to view 3D scenes.',
    startToPopulateTower: 'Start a simulation to populate the tower.',
    startToSeeNetwork: 'Start a simulation to see the network graph.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DAO TOWER - Tower visualization component
  // ═══════════════════════════════════════════════════════════════════════════
  daoTower: {
    title: 'DAO Tower',
    open3d: 'Open 3D',
    loading: 'Building the DAO tower...',
    loadingHelp: 'Getting everyone settled in',
    emptyMessage: 'No members in the tower yet',
    emptyHelp: 'Start a simulation to see members move in!',
    instructions: 'Drag to rotate \u2022 Scroll to zoom \u2022 Click members',
    membersAcrossFloors: '{members} members across {floors} floors',
    floors: 'Floors',
    // Floor names
    floor0: 'Lobby',
    floor1: 'Treasury',
    floor2: 'Governance',
    floor3: 'Dev Hub',
    floor4: 'Proposals',
    floor5: 'Lounge',
    // Member details
    activity: 'Activity',
    floor: 'Floor',
    reputation: 'Reputation',
    tokens: 'Tokens',
    // Activities
    activityVoting: 'voting',
    activityProposing: 'proposing',
    activityDiscussing: 'discussing',
    activityCoding: 'coding',
    activityReviewing: 'reviewing',
    activityResting: 'resting',
    activityTrading: 'trading',
    activityChatting: 'chatting',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NETWORK GRAPH - 3D network visualization
  // ═══════════════════════════════════════════════════════════════════════════
  networkGraph: {
    title: 'DAO Network Graph',
    loading: 'Loading network visualization...',
    emptyMessage: 'No network data to display',
    emptyHelp: 'Start a simulation to see the DAO network',
    nodeStats: 'Network Stats',
    // Node types
    daoMember: 'DAO Member',
    daoMemberDesc: 'A participant in the DAO with voting power',
    governanceProposal: 'Governance Proposal',
    governanceProposalDesc: 'A governance proposal being voted on',
    memberCluster: 'Member Cluster',
    memberClusterDesc: 'A group of similar member types',
    // Stats
    membersLabel: 'Members',
    proposalsLabel: 'Proposals',
    clustersLabel: 'Clusters',
    totalLabel: 'Total',
    inLabel: 'In',
    outLabel: 'Out',
    connections: 'Connections',
    connectionTypes: 'Connection Types',
    // Connection types
    tokenWeight: 'Token Weight',
    memberCount: 'Member Count',
    voteWeight: 'Vote Weight',
    position: 'Position',
    // Edge types
    delegation: 'Delegation',
    representative: 'Representative',
    created: 'Created',
    aggregated: 'Aggregated',
    // Controls
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    resetView: 'Reset view',
    edgeTypes: 'Edge Types',
    nodeInfo: '{count} nodes, {edges} edges',
    showingOf: 'showing {visible} of {total}',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DAO CITY - Multi-DAO city visualization
  // ═══════════════════════════════════════════════════════════════════════════
  daoCity: {
    title: 'DAO City',
    subtitle: 'Multi-DAO Ecosystem',
    marketplace: 'Global Marketplace',
    daos: 'DAOs',
    totalMembers: 'Total Members',
    activeLinks: 'Active Links',
    connections: 'Connections',
    tokenBridge: 'Token Bridge',
    jointProposal: 'Joint Proposal',
    memberTransfer: 'Member Transfer',
    emptyMessage: 'No DAO city data available',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TOKEN TRACKER - Live token stats
  // ═══════════════════════════════════════════════════════════════════════════
  tokenTracker: {
    daoToken: 'DAO Token',
    marketCap: 'Market Cap',
    high24h: '24h High',
    low24h: '24h Low',
    holders: 'Holders: {count}',
    supply: 'Supply: {amount}K',
    fromStart: '{change} from start',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TOKEN RANKING - Token leaderboard
  // ═══════════════════════════════════════════════════════════════════════════
  tokenRanking: {
    title: 'Token Rankings',
    subtitle: 'Real-time DAO token prices',
    totalMarketCap: 'TOTAL MARKET CAP',
    volume24h: '24H VOLUME',
    rank: '#',
    token: 'Token',
    price: 'Price',
    change24h: '24h',
    volume: 'Volume',
    marketCap: 'Market Cap',
    tokensTracked: '{count} tokens tracked',
    noDataAvailable: 'No token data available',
    startCityToSee: 'Start the city simulation to see rankings',
    noRankings: 'No rankings available',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HEATMAP - Member score heatmap
  // ═══════════════════════════════════════════════════════════════════════════
  heatmap: {
    title: 'Member Score: Reputation vs Token Balance',
    subtitle: 'Score = 50% Reputation + 50% Tokens (normalized)',
    loading: 'Loading member data...',
    emptyMessage: 'No members to display',
    emptyHelp: 'Start a simulation to see member data',
    colorLow: 'Low',
    colorHigh: 'High',
    xAxis: 'Token Balance (normalized 0-100)',
    yAxis: 'Reputation (normalized 0-100)',
    quadrantHighRepLowTokens: 'High Rep / Low Tokens',
    quadrantHighInfluence: 'High Influence',
    quadrantLowInfluence: 'Low Influence',
    quadrantLowRepHighTokens: 'Low Rep / High Tokens',
    membersCount: '{count} members',
    avgScore: 'Avg score: {value}',
    highInfluenceCount: '{count} high-influence',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHOROPLETH - Geographic distribution map
  // ═══════════════════════════════════════════════════════════════════════════
  choropleth: {
    title: 'Member Distribution by Location',
    loading: 'Loading location data...',
    emptyMessage: 'No location data to display',
    emptyHelp: 'Start a simulation to see member distribution',
    clickForDetails: 'Click bars to see details',
    sampleMembers: 'Sample members:',
    moreMembers: '+{count} more',
    topLocation: 'Top location: {name} ({percentage}%)',
    locationsShown: '{count} locations shown',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STATES - Empty, loading, and placeholder states
  // ═══════════════════════════════════════════════════════════════════════════
  states: {
    waitingForData: 'Waiting for Simulation Data',
    startSimulation: 'Start a simulation to see real-time visualizations',
    connectToWebSocket: 'Connect to WebSocket at {url}',
    noSimulationData: 'No simulation data available',
    mapPaused: 'Map is paused. Resume visuals to view the DAO map.',
    noOpsLogged: 'No operations logged yet.',
    visualsPaused: 'Visuals paused. Resume to view the {feature}.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OPS LOG - Operations log
  // ═══════════════════════════════════════════════════════════════════════════
  opsLog: {
    title: 'Operations Log',
    recentEvents: 'Most recent {count} events',
    opsSnapshot: 'Ops snapshot',
    priceAndTreasury: 'Price {price}, treasury {treasury}',
    riskEvent: 'Risk event: market shock',
    marketShock: 'market shock',
    upsideMove: 'upside move',
    downsideMove: 'downside move',
    severity: 'severity {value}',
    objectiveCompleted: 'Objective completed',
    stepLabel: 'Step {step}',
    event: 'Event',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS - Alerts and notifications
  // ═══════════════════════════════════════════════════════════════════════════
  notifications: {
    missionCompleted: 'Mission completed: {name}',
    marketShockAlert: 'Market shock: severity {severity} (step {step})',
    celebrateMessage: 'Celebrate wins and prepare for shocks; adjust speed or strategy as needed.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SHORTCUTS - Keyboard shortcuts modal
  // ═══════════════════════════════════════════════════════════════════════════
  shortcuts: {
    title: 'Keyboard Shortcuts',
    simulation: 'Simulation',
    startStop: 'Start/Stop',
    step: 'Step',
    reset: 'Reset',
    navigation: 'Navigation (Alt + Key)',
    pressToToggle: 'Press ? to toggle this menu',
    buttonLabel: 'Shortcuts',
    expandNav: 'Expand navigation',
    collapseNav: 'Collapse navigation',
    showShortcuts: 'Show keyboard shortcuts (?)',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RUN SUMMARY - Run summary modal
  // ═══════════════════════════════════════════════════════════════════════════
  runSummary: {
    title: 'Run Summary',
    runComplete: 'Run complete',
    objectivesAchieved: 'Objectives achieved',
    runEnded: 'Run ended',
    treasuryInsolvency: 'Run ended \u2013 treasury insolvent',
    priceCollapse: 'Run ended \u2013 token price collapse',
    governanceBacklog: 'Run ended \u2013 governance backlog',
    timeline: 'Timeline',
    retryPreset: 'Retry with same preset',
    score: 'Score',
    seed: 'Seed',
    preset: 'Preset',
    strategy: 'Strategy',
    outcome: 'Outcome',
    defaultStrategy: 'Baseline',
    steps: 'Steps',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HOME - Landing page
  // ═══════════════════════════════════════════════════════════════════════════
  home: {
    title: 'DAO Simulator',
    subtitle: 'Real-time decentralized governance visualization',
    description: 'Experience the beauty of distributed decision-making through stunning 3D network graphs, interactive charts, and comprehensive analytics.',
    launchDashboard: 'Launch Dashboard',
    // Feature cards
    feature3dLabel: '3D',
    feature3dTitle: '3D Network Graphs',
    feature3dDesc: 'Visualize complex governance networks in stunning 3D with WebGL and Three.js',
    featureLiveLabel: 'Live',
    featureLiveTitle: 'Real-time Analytics',
    featureLiveDesc: 'Live price charts, heatmaps, and comprehensive reports updated via WebSocket',
    featureAgentsLabel: 'Agents',
    featureAgentsTitle: 'Agent-Based Simulation',
    featureAgentsDesc: 'Watch autonomous agents interact, vote, and shape the future of your DAO',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FOOTER - Page footer
  // ═══════════════════════════════════════════════════════════════════════════
  footer: {
    brand: 'DAO Simulator',
    stack: 'Next.js, Three.js, Recharts, Socket.IO',
    tagline: 'Built with vision by incredible technologists and artists',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ERRORS - Error pages and messages
  // ═══════════════════════════════════════════════════════════════════════════
  errors: {
    somethingWentWrong: 'Something went wrong',
    unexpectedError: 'An unexpected error occurred. We apologize for the inconvenience.',
    errorId: 'Error ID:',
    tryAgain: 'Try again',
    goHome: 'Go home',
    persistsReport: 'If this problem persists, please',
    reportIssue: 'report an issue',
    pageNotFound: 'Page Not Found',
    pageNotFoundDesc: "The page you're looking for doesn't exist or has been moved.",
    openDashboard: 'Open Dashboard',
    // 3D error boundary
    visualization3dUnavailable: '3D Visualization Unavailable',
    webglError: 'The 3D network graph could not be rendered. This may be due to WebGL compatibility issues with your browser or graphics card.',
    checkWebgl: 'Check WebGL Support',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING - Loading states
  // ═══════════════════════════════════════════════════════════════════════════
  loadingStates: {
    loading: 'Loading',
    pleaseWait: 'Please wait...',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCESSIBILITY - Screen reader and a11y strings
  // ═══════════════════════════════════════════════════════════════════════════
  a11y: {
    skipToMain: 'Skip to main content',
    expandNavigation: 'Expand navigation',
    collapseNavigation: 'Collapse navigation',
    showKeyboardShortcuts: 'Show keyboard shortcuts (?)',
    simulationSpeedMultiplier: 'Simulation speed multiplier. Higher values run faster.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // METADATA - SEO and page metadata
  // ═══════════════════════════════════════════════════════════════════════════
  metadata: {
    title: 'DAO Simulator',
    titleTemplate: '%s | DAO Simulator',
    description: 'Real-time decentralized governance simulation dashboard. Explore DAO dynamics, agent behaviors, and governance mechanisms.',
    keywords: ['DAO', 'simulation', 'governance', 'blockchain', 'decentralized', 'agent-based modeling'],
    author: 'DAO Simulator Team',
    ogTitle: 'DAO Simulator',
    ogDescription: 'Real-time decentralized governance simulation dashboard',
    ogSiteName: 'DAO Simulator',
    twitterTitle: 'DAO Simulator',
    twitterDescription: 'Real-time decentralized governance simulation dashboard',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ATLAS - Research homepage
  // ═══════════════════════════════════════════════════════════════════════════
  atlas: {
    tagline: 'DAO Research, Made Actionable',
    heroTitle: 'DAO Research Atlas',
    heroDescription: 'Actionable governance findings from 16,370 simulation runs across 21 experiment configurations. Start with any research question below.',
    heroCta: 'Explore Research',
    nav: 'Main navigation',
    consoleLink: 'Console',
    researchHeading: 'Research',
    researchSubtitle: 'Decision briefs across all research questions',
    papersHeading: 'Papers',
    papersSubtitle: 'Download full research papers and archives',
    methodologyHeading: 'Why This Work Is Important',
    advancedHeading: 'Advanced Section',
    advancedDesc: 'Raw metrics, source files, and full technical artifacts.',
    whatWeFound: 'What Results Showed',
    whatToDo: 'What To Do',
    whyItMatters: 'Why this matters:',
    evidenceLabel: 'Evidence Base',
    evidenceDesc: 'Core governance paper reports 16,370 runs across 21 experiment configurations.',
    briefsLabel: 'Decision Briefs',
    briefsCount: 'briefs covering participation, capture, operations, treasury, coordination, and LLM governance.',
    authorLabel: 'Author',
    authorDesc: 'Research direction and systems thinking by',
    confidenceNote: 'Confidence note:',
    briefLabel: 'Brief',
    openFullBrief: 'Open full brief',
    sourceBriefMarkdown: 'Source Brief Markdown',
    relatedPaperPdf: 'Related Paper PDF',
    currentPdf: 'Current PDF',
    currentTex: 'Current TeX',
    latestArchivedPdf: 'Latest Archived PDF',
    rawMetricTakeaways: 'Raw Metric Takeaways',
    methodNotes: 'Method Notes',
    wordsCount: 'words',
    briefSourceFiles: 'Brief Source Files + Raw Metrics',
    footerAttribution: 'DAO Research Atlas by',
    keyTerms: 'Key Terms',
    footerConsole: 'Operational tools remain available in the in-repo',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSOLE - Experiment management
  // ═══════════════════════════════════════════════════════════════════════════
  console: {
    heading: 'Experiment Management',
    subtitle: 'DAO Research Console',
    description: 'Manage experiment runs, review results, generate reports, and update paper artifacts. All actions run locally and write logs to the results directory.',
    latestAction: 'Latest action queued',
    runExperiments: 'Run Experiments',
    selectConfig: 'Select a configuration file to start or resume a batch run.',
    selectPlaceholder: 'Select a config',
    run: 'Run',
    resume: 'Resume',
    resumeLabel: 'Resume Config',
    reports: 'Reports',
    generateReport: 'Generate research-quality reports from existing results.',
    generateReportBtn: 'Generate Report',
    paperPipeline: 'Paper Pipeline',
    paperPipelineDesc: 'Update the academic paper from the latest results, compile PDFs, and archive releases.',
    updatePaper: 'Update Paper',
    compileLabel: 'Compile',
    archiveAll: 'Archive All',
    experimentConfigs: 'Experiment Configs',
    resultsArchive: 'Results Archive',
    noConfigs: 'No experiment configs found.',
    noResults: 'No results found in ./results.',
    configCount: 'configs',
    resultCount: 'result sets',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RESULTS - Individual result viewer
  // ═══════════════════════════════════════════════════════════════════════════
  results: {
    heading: 'Results',
    status: 'Status',
    files: 'Files',
    backToAtlas: 'Back to atlas',
    backToConsole: 'Back to console',
    previewTruncated: 'Preview truncated at',
    noFiles: 'No files found.',
    noStatus: 'No status.json found.',
  },
};
