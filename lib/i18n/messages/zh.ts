/**
 * Chinese Simplified (zh) Message Strings
 *
 * Full Simplified Chinese translation of all UI strings.
 * Format strings use {key} placeholders preserved as-is.
 */

import type { Messages } from '../types';

export const messages: Messages = {
  // ═══════════════════════════════════════════════════════════════════════════
  // COMMON
  // ═══════════════════════════════════════════════════════════════════════════
  common: {
    connected: '\u5df2\u8fde\u63a5',
    disconnected: '\u5df2\u65ad\u5f00',
    running: '\u8fd0\u884c\u4e2d',
    paused: '\u5df2\u6682\u505c',
    loading: '\u52a0\u8f7d\u4e2d...',
    error: '\u9519\u8bef',
    close: '\u5173\u95ed',
    cancel: '\u53d6\u6d88',
    confirm: '\u786e\u8ba4',
    save: '\u4fdd\u5b58',
    delete: '\u5220\u9664',
    edit: '\u7f16\u8f91',
    view: '\u67e5\u770b',
    back: '\u8fd4\u56de',
    next: '\u4e0b\u4e00\u6b65',
    done: '\u5b8c\u6210',
    skip: '\u8df3\u8fc7',
    retry: '\u91cd\u8bd5',
    live: '\u5b9e\u65f6',
    on: '\u5f00\u542f',
    off: '\u5173\u95ed',
    active: '\u6d3b\u8dc3',
    selected: '\u5df2\u9009\u62e9',
    pending: '\u5f85\u5904\u7406',
    completed: '\u5df2\u5b8c\u6210',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════════════════
  header: {
    apiDocs: 'API \u6587\u6863',
    speed: '\u901f\u5ea6\uff1a',
    speedDescription: '\u4eff\u771f\u901f\u5ea6\u500d\u7387\u3002\u6570\u503c\u8d8a\u9ad8\u8fd0\u884c\u8d8a\u5feb\u3002',
    step: '\u6b65\u9aa4\uff1a{step}',
    hotkeys: '\u5feb\u6377\u952e\uff1a\u7a7a\u683c\u5f00\u59cb/\u505c\u6b62\uff0cF \u5355\u6b65\uff0cR \u91cd\u7f6e\u3002',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════
  controls: {
    start: '\u5f00\u59cb\uff08\u7a7a\u683c\uff09',
    startCity: '\u542f\u52a8\u57ce\u5e02\uff08\u7a7a\u683c\uff09',
    stop: '\u505c\u6b62',
    stepButton: '\u5355\u6b65\uff08F\uff09',
    reset: '\u91cd\u7f6e\uff08R\uff09',
    singleDao: '\u5355\u4e2a DAO',
    daoCity: 'DAO \u57ce\u5e02',
    visualsLive: '\u53ef\u89c6\u5316\uff1a\u5b9e\u65f6',
    visualsPaused: '\u53ef\u89c6\u5316\uff1a\u5df2\u6682\u505c',
    quickJumpOn: '\u5feb\u901f\u8df3\u8f6c\uff1a\u5f00\u542f',
    quickJumpOff: '\u5feb\u901f\u8df3\u8f6c\uff1a\u5173\u95ed',
    sidebarOn: '\u4fa7\u8fb9\u680f\uff1a\u5f00\u542f',
    sidebarOff: '\u4fa7\u8fb9\u680f\uff1a\u5173\u95ed',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TABS
  // ═══════════════════════════════════════════════════════════════════════════
  tabs: {
    overview: '\u6982\u89c8',
    view3d: '3D \u89c6\u56fe',
    charts: '\u56fe\u8868',
    strategy: '\u7b56\u7565',
    reports: '\u62a5\u544a',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PANELS
  // ═══════════════════════════════════════════════════════════════════════════
  panels: {
    daoMap: 'DAO \u5730\u56fe',
    opsLog: '\u64cd\u4f5c\u65e5\u5fd7',
    tower: '\u5854\u697c',
    city: '\u57ce\u5e02',
    network: '\u7f51\u7edc',
    price: '\u4ef7\u683c',
    heatmap: '\u70ed\u529b\u56fe',
    geo: '\u5730\u7406',
    daoReport: 'DAO \u62a5\u544a',
    orgHistory: '\u7ec4\u7ec7\u5386\u53f2',
    runHistory: '\u8fd0\u884c\u5386\u53f2',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TUTORIAL
  // ═══════════════════════════════════════════════════════════════════════════
  tutorial: {
    title: '\u5feb\u901f\u5165\u95e8',
    stepOf: '\u7b2c {current} \u6b65\uff0c\u5171 {total} \u6b65',
    steps: [
      '\u9009\u62e9\u4e00\u4e2a\u7b56\u7565\u9884\u8bbe\u6216\u6bcf\u65e5/\u6bcf\u5468\u6311\u6218\u5f00\u59cb\u3002',
      '\u6309\u5f00\u59cb\uff08\u7a7a\u683c\uff09\u6d41\u5f0f\u8fd0\u884c\u4eff\u771f\uff1b\u7528\u5355\u6b65\uff08F\uff09\u624b\u52a8\u63a8\u8fdb\u3002',
      '\u5173\u6ce8\u9876\u90e8\u7684\u4efb\u52a1\uff1b\u5b8c\u6210\u5b83\u4eec\u5373\u53ef\u8d62\u5f97\u672c\u6b21\u8fd0\u884c\u3002',
      '\u5982\u9700\u8981\u53ef\u6682\u505c\u53ef\u89c6\u5316\uff1bDAO \u5730\u56fe + \u62a5\u544a\u53ef\u5feb\u901f\u4e86\u89e3\u5065\u5eb7\u72b6\u6001\u3002',
      '\u907f\u514d\u5931\u8d25\uff1a\u4fdd\u6301\u8d22\u5e93\u548c\u4ef7\u683c\u5065\u5eb7\uff0c\u6e05\u9664\u63d0\u6848\u79ef\u538b\u3002',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MISSIONS
  // ═══════════════════════════════════════════════════════════════════════════
  missions: {
    scenario: '\u573a\u666f',
    status: '\u72b6\u6001',
    overallProgress: '\u603b\u4f53\u8fdb\u5ea6',
    missionsProgress: '{completed}/{total} \u4efb\u52a1\uff08{percent}%\uff09',
    noMissions: '\u672a\u5b9a\u4e49\u4efb\u52a1',
    startWithObjectives: '\u542f\u52a8\u5e26\u76ee\u6807\u7684\u4eff\u771f',
    strengthenTreasury: '\u52a0\u5f3a\u8d22\u5e93',
    strengthenTreasuryDesc: '\u76ee\u6807\uff1a\u672c\u6b21\u8fd0\u884c\u8d22\u5e93\u4f59\u989d +20%\u3002',
    protectTreasury: '\u4fdd\u62a4\u8d22\u5e93',
    protectTreasuryDesc: '\u4fdd\u6301\u8d22\u5e93\u8212\u9002\u5730\u9ad8\u4e8e\u57fa\u7ebf\u3002',
    fundGrowth: '\u8d44\u52a9\u589e\u957f',
    fundGrowthDesc: '\u589e\u957f\u8d22\u5e93\u4ee5\u652f\u6301\u6269\u5f20\u3002',
    reduceBacklog: '\u51cf\u5c11\u79ef\u538b',
    reduceBacklogDesc: '\u5904\u7406\u81f3\u5c11 3 \u4e2a\u63d0\u6848\u3002',
    avoidGridlock: '\u907f\u514d\u50f5\u5c40',
    avoidGridlockDesc: '\u4fdd\u6301\u5f00\u653e\u63d0\u6848\u63a5\u8fd1\u57fa\u7ebf\u3002',
    shipInitiatives: '\u63a8\u52a8\u4e3e\u63aa',
    shipInitiativesDesc: '\u5904\u7406 3 \u4e2a\u4ee5\u4e0a\u4ee5\u589e\u957f\u4e3a\u91cd\u70b9\u7684\u63d0\u6848\u3002',
    maintainOperations: '\u7ef4\u6301\u8fd0\u8425',
    maintainOperationsDesc: '\u524d\u8fdb 100 \u6b65\u800c\u4e0d\u5931\u8d25\u3002',
    sustainGovernance: '\u7ef4\u6301\u6cbb\u7406',
    sustainGovernanceDesc: '\u518d\u7ef4\u6301\u8fd0\u8425 100 \u6b65\u3002',
    sustainGrowthRunway: '\u7ef4\u6301\u589e\u957f\u8dd1\u9053',
    sustainGrowthRunwayDesc: '\u518d\u524d\u8fdb 100 \u6b65\u3002',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STRATEGIES
  // ═══════════════════════════════════════════════════════════════════════════
  strategies: {
    playbooks: '\u7b56\u7565\u624b\u518c',
    baseline: '\u57fa\u7ebf',
    baselineDesc: '\u4f7f\u7528\u9ed8\u8ba4\u914d\u7f6e\u3002',
    riskOff: '\u4fdd\u5b88\u578b\u8d22\u5e93',
    riskOffDesc: '\u964d\u4f4e\u51b2\u51fb\u9891\u7387\uff0c\u7565\u5fae\u504f\u5411\u6295\u8d44\u8005/\u9a8c\u8bc1\u8005\u3002',
    growthMode: '\u589e\u957f\u6a21\u5f0f',
    growthModeDesc: '\u589e\u52a0\u5efa\u8bbe\u8005\u548c\u63d0\u6848\u521b\u5efa\u8005\uff0c\u5bb9\u5fcd\u66f4\u591a\u51b2\u51fb\u3002',
    validatorGovernance: '\u9a8c\u8bc1\u8005\u6cbb\u7406',
    validatorGovernanceDesc: '\u52a0\u5f3a\u9a8c\u8bc1\u8005\u96c6\u5408\u548c\u6cbb\u7406\u9608\u503c\u3002',
    communityFirst: '\u793e\u533a\u4f18\u5148',
    communityFirstDesc: '\u66f4\u5e7f\u6cdb\u7684\u88ab\u52a8\u6210\u5458\uff0c\u51cf\u5c11\u5bf9\u9a8c\u8bc1\u8005\u7684\u4f9d\u8d56\u3002',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRESETS
  // ═══════════════════════════════════════════════════════════════════════════
  presets: {
    title: '\u4eff\u771f\u9884\u8bbe',
    balanced: '\u5747\u8861',
    balancedDesc: '\u5f00\u53d1\u8005/\u6295\u8d44\u8005\u5747\u8861\u6df7\u5408\uff0c\u4e2d\u7b49\u51b2\u51fb',
    validatorFirst: '\u9a8c\u8bc1\u8005\u4f18\u5148',
    validatorFirstDesc: '\u66f4\u591a\u9a8c\u8bc1\u8005\u548c\u66f4\u4e25\u683c\u7684\u6cbb\u7406',
    growthPush: '\u589e\u957f\u63a8\u52a8',
    growthPushDesc: '\u66f4\u591a\u5f00\u53d1\u8005\u548c\u63d0\u6848\u521b\u5efa\u8005\uff0c\u8f7b\u5fae\u51b2\u51fb',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHALLENGES
  // ═══════════════════════════════════════════════════════════════════════════
  challenges: {
    title: '\u6311\u6218',
    startChallenge: '\u5f00\u59cb\u6311\u6218',
    daily: '\u6bcf\u65e5\u6311\u6218',
    dailyDesc: '\u5e26\u79cd\u5b50\u7684\u7a33\u5b9a\u51b2\u51fb\u8fd0\u884c\uff1b\u76ee\u6807\u5728 120 \u6b65\u5185\u8d22\u5e93 +30%\u3002',
    weekly: '\u6bcf\u5468\u6311\u6218',
    weeklyDesc: '\u9a8c\u8bc1\u8005\u4e3a\u4e3b\u7684\u6cbb\u7406\uff1b\u5728\u6700\u5c0f\u51b2\u51fb\u4e0b\u5b58\u6d3b 200 \u6b65\u3002',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORTS
  // ═══════════════════════════════════════════════════════════════════════════
  reports: {
    title: 'DAO \u4eff\u771f\u62a5\u544a',
    stepsCompleted: '\u5df2\u5b8c\u6210 {count} \u6b65',
    totalSteps: '\u603b\u6b65\u6570',
    currentPrice: '\u5f53\u524d\u4ef7\u683c',
    priceUp: '\u4e0a\u6da8 {percent}%',
    priceDown: '\u4e0b\u8dcc {percent}%',
    priceRange: '\u8303\u56f4\uff1a${min} - ${max}',
    treasury: '\u8d22\u5e93',
    members: '\u6210\u5458',
    activeProposals: '\u6d3b\u8dc3\u63d0\u6848',
    ofTotal: '\u5171 {total} \u4e2a',
    treasuryOverTime: '\u8d22\u5e93\u968f\u65f6\u95f4\u53d8\u5316',
    topTokenHolders: '\u6700\u5927\u4ee3\u5e01\u6301\u6709\u8005',
    mostInfluential: '\u6700\u5177\u5f71\u54cd\u529b\u7684\u6210\u5458',
    marketShocks: '\u5e02\u573a\u51b2\u51fb\uff08{count}\uff09',
    showLess: '\u6536\u8d77',
    showAll: '\u663e\u793a\u5168\u90e8\uff08{count}\uff09',
    noDataAvailable: '\u6ca1\u6709\u53ef\u7528\u7684\u4eff\u771f\u6570\u636e',
    runToGenerate: '\u8fd0\u884c\u4eff\u771f\u4ee5\u751f\u6210\u62a5\u544a',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ORG HISTORY
  // ═══════════════════════════════════════════════════════════════════════════
  orgHistory: {
    title: '\u7ec4\u7ec7\u5386\u53f2\u4e0e KPI',
    totalRuns: '\u603b\u8fd0\u884c\u6b21\u6570\uff1a{count}',
    totalStepsSimulated: '\u603b\u4eff\u771f\u6b65\u6570',
    peakTreasury: '\u8d22\u5e93\u5cf0\u503c',
    maxShocksInRun: '\u5355\u6b21\u8fd0\u884c\u6700\u5927\u51b2\u51fb\u6570',
    winRate: '\u80dc\u7387',
    milestones: '\u91cc\u7a0b\u7891',
    firstSimCompleted: '\u5b8c\u6210\u7b2c\u4e00\u6b21\u4eff\u771f\u3002',
    runAtLeastOne: '\u81f3\u5c11\u8fd0\u884c\u4e00\u6b21\u4eff\u771f\u3002',
    sustainedOperator: '\u6301\u7eed\u8fd0\u8425\u8005\uff1a\u603b\u6b65\u6570\u8d85\u8fc7 500\u3002',
    reach500Steps: '\u8fbe\u5230 500 \u603b\u4eff\u771f\u6b65\u6570\u3002',
    capitalized: '\u5df2\u8d44\u672c\u5316\uff1a\u8d22\u5e93\u5cf0\u503c\u8d85\u8fc7 10,000\u3002',
    growPeakTreasury: '\u5c06\u8d22\u5e93\u5cf0\u503c\u589e\u957f\u5230 10,000 \u4ee5\u4e0a\u3002',
    noHistory: '\u5c1a\u65e0\u7ec4\u7ec7\u5386\u53f2\u3002\u5b8c\u6210\u4e00\u6b21\u8fd0\u884c\u4ee5\u751f\u6210\u6307\u6807\u3002',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RUN HISTORY
  // ═══════════════════════════════════════════════════════════════════════════
  runHistorySection: {
    title: '\u8fd0\u884c\u5386\u53f2\uff08\u4f1a\u8bdd\uff09',
    lastRuns: '\u6700\u8fd1 {count} \u6b21\u8fd0\u884c',
    score: '\u5f97\u5206',
    steps: '\u6b65\u6570',
    outcomeWon: '\u76ee\u6807\u8fbe\u6210',
    outcomeLost: '\u8fd0\u884c\u7ed3\u675f',
    leaderboard: '\u6392\u884c\u699c\uff08\u4f1a\u8bdd\uff09',
    noRunsRecorded: '\u5c1a\u65e0\u8fd0\u884c\u8bb0\u5f55\u3002',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHARTS
  // ═══════════════════════════════════════════════════════════════════════════
  charts: {
    priceHistory: 'DAO \u4ee3\u5e01\u4ef7\u683c\u5386\u53f2',
    memberHeatmap: '\u6210\u5458\u5f97\u5206\uff1a\u58f0\u8a89 vs \u4ee3\u5e01\u4f59\u989d',
    memberHeatmapSubtitle: '\u5f97\u5206 = 50% \u58f0\u8a89 + 50% \u4ee3\u5e01\uff08\u5f52\u4e00\u5316\uff09',
    memberDistribution: '\u6309\u4f4d\u7f6e\u5206\u5e03\u7684\u6210\u5458',
    loadingData: '\u6b63\u5728\u52a0\u8f7d {type} \u6570\u636e...',
    noDataYet: '\u5c1a\u65e0 {type} \u6570\u636e',
    startToSee: '\u542f\u52a8\u4eff\u771f\u4ee5\u67e5\u770b{feature}',
    heatmapPaused: '\u70ed\u529b\u56fe\u5df2\u6682\u505c\u3002\u6062\u590d\u53ef\u89c6\u5316\u4ee5\u67e5\u770b\u6210\u5458\u70ed\u529b\u56fe\u3002',
    geoPaused: '\u5730\u7406\u56fe\u8868\u5df2\u6682\u505c\u3002\u6062\u590d\u53ef\u89c6\u5316\u4ee5\u67e5\u770b\u3002',
    dataPoints: '{count} \u4e2a\u6570\u636e\u70b9',
    currentLabel: '\u5f53\u524d\uff1a',
    rangeLabel: '\u8303\u56f4\uff1a',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW3D
  // ═══════════════════════════════════════════════════════════════════════════
  view3d: {
    hide3d: '\u9690\u85cf 3D',
    show3d: '\u663e\u793a 3D',
    hidden3dMessage: '3D \u53ef\u89c6\u5316\u5df2\u9690\u85cf\u4ee5\u4fdd\u6301\u7d27\u51d1\u5e03\u5c40\u3002',
    show3dView: '\u663e\u793a 3D \u89c6\u56fe',
    networkControls: '\u7f51\u7edc\u63a7\u5236',
    showLabels: '\u663e\u793a\u6807\u7b7e',
    interactiveControls: '\u4ea4\u4e92\u63a7\u5236',
    nodes: '\u8282\u70b9\uff1a{count}',
    edges: '\u8fb9\uff1a{count}',
    towerSnapshot: '\u5854\u697c\u5feb\u7167',
    proposals: '\u63d0\u6848',
    shocks: '\u51b2\u51fb',
    interDaoProposals: '\u8de8 DAO \u63d0\u6848',
    noInterDaoProposals: '\u5c1a\u65e0\u8de8 DAO \u63d0\u6848\u3002',
    startCitySimulation: '\u542f\u52a8\u57ce\u5e02\u4eff\u771f\u4ee5\u67e5\u770b\u53ef\u89c6\u5316',
    visualsPausedMessage: '\u53ef\u89c6\u5316\u5df2\u6682\u505c\u3002\u6062\u590d\u4ee5\u67e5\u770b 3D \u573a\u666f\u3002',
    startToPopulateTower: '\u542f\u52a8\u4eff\u771f\u4ee5\u586b\u5145\u5854\u697c\u3002',
    startToSeeNetwork: '\u542f\u52a8\u4eff\u771f\u4ee5\u67e5\u770b\u7f51\u7edc\u56fe\u3002',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DAO TOWER
  // ═══════════════════════════════════════════════════════════════════════════
  daoTower: {
    title: 'DAO \u5854\u697c',
    open3d: '\u6253\u5f00 3D',
    loading: '\u6b63\u5728\u5efa\u9020 DAO \u5854\u697c...',
    loadingHelp: '\u6b63\u5728\u5b89\u7f6e\u6240\u6709\u4eba',
    emptyMessage: '\u5854\u697c\u4e2d\u5c1a\u65e0\u6210\u5458',
    emptyHelp: '\u542f\u52a8\u4eff\u771f\u67e5\u770b\u6210\u5458\u5165\u4f4f\uff01',
    instructions: '\u62d6\u62fd\u65cb\u8f6c \u2022 \u6eda\u8f6e\u7f29\u653e \u2022 \u70b9\u51fb\u6210\u5458',
    membersAcrossFloors: '{members} \u4e2a\u6210\u5458\u5206\u5e03\u5728 {floors} \u5c42',
    floors: '\u697c\u5c42',
    floor0: '\u5927\u5385',
    floor1: '\u8d22\u5e93',
    floor2: '\u6cbb\u7406',
    floor3: '\u5f00\u53d1\u4e2d\u5fc3',
    floor4: '\u63d0\u6848',
    floor5: '\u4f11\u606f\u5ba4',
    activity: '\u6d3b\u52a8',
    floor: '\u697c\u5c42',
    reputation: '\u58f0\u8a89',
    tokens: '\u4ee3\u5e01',
    activityVoting: '\u6295\u7968\u4e2d',
    activityProposing: '\u63d0\u6848\u4e2d',
    activityDiscussing: '\u8ba8\u8bba\u4e2d',
    activityCoding: '\u7f16\u7a0b\u4e2d',
    activityReviewing: '\u5ba1\u67e5\u4e2d',
    activityResting: '\u4f11\u606f\u4e2d',
    activityTrading: '\u4ea4\u6613\u4e2d',
    activityChatting: '\u804a\u5929\u4e2d',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NETWORK GRAPH
  // ═══════════════════════════════════════════════════════════════════════════
  networkGraph: {
    title: 'DAO \u7f51\u7edc\u56fe',
    loading: '\u6b63\u5728\u52a0\u8f7d\u7f51\u7edc\u53ef\u89c6\u5316...',
    emptyMessage: '\u65e0\u7f51\u7edc\u6570\u636e\u53ef\u663e\u793a',
    emptyHelp: '\u542f\u52a8\u4eff\u771f\u4ee5\u67e5\u770b DAO \u7f51\u7edc',
    nodeStats: '\u7f51\u7edc\u7edf\u8ba1',
    daoMember: 'DAO \u6210\u5458',
    daoMemberDesc: '\u5177\u6709\u6295\u7968\u6743\u7684 DAO \u53c2\u4e0e\u8005',
    governanceProposal: '\u6cbb\u7406\u63d0\u6848',
    governanceProposalDesc: '\u6b63\u5728\u6295\u7968\u7684\u6cbb\u7406\u63d0\u6848',
    memberCluster: '\u6210\u5458\u96c6\u7fa4',
    memberClusterDesc: '\u4e00\u7ec4\u7c7b\u4f3c\u7c7b\u578b\u7684\u6210\u5458',
    membersLabel: '\u6210\u5458',
    proposalsLabel: '\u63d0\u6848',
    clustersLabel: '\u96c6\u7fa4',
    totalLabel: '\u603b\u8ba1',
    inLabel: '\u5165',
    outLabel: '\u51fa',
    connections: '\u8fde\u63a5',
    connectionTypes: '\u8fde\u63a5\u7c7b\u578b',
    tokenWeight: '\u4ee3\u5e01\u6743\u91cd',
    memberCount: '\u6210\u5458\u6570',
    voteWeight: '\u6295\u7968\u6743\u91cd',
    position: '\u4f4d\u7f6e',
    delegation: '\u59d4\u6258',
    representative: '\u4ee3\u8868',
    created: '\u5df2\u521b\u5efa',
    aggregated: '\u5df2\u805a\u5408',
    zoomIn: '\u653e\u5927',
    zoomOut: '\u7f29\u5c0f',
    resetView: '\u91cd\u7f6e\u89c6\u56fe',
    edgeTypes: '\u8fb9\u7c7b\u578b',
    nodeInfo: '{count} \u4e2a\u8282\u70b9\uff0c{edges} \u6761\u8fb9',
    showingOf: '\u663e\u793a {visible}/{total}',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DAO CITY
  // ═══════════════════════════════════════════════════════════════════════════
  daoCity: {
    title: 'DAO \u57ce\u5e02',
    subtitle: '\u591a DAO \u751f\u6001\u7cfb\u7edf',
    marketplace: '\u5168\u7403\u5e02\u573a',
    daos: 'DAO',
    totalMembers: '\u603b\u6210\u5458',
    activeLinks: '\u6d3b\u8dc3\u94fe\u63a5',
    connections: '\u8fde\u63a5',
    tokenBridge: '\u4ee3\u5e01\u6865',
    jointProposal: '\u8054\u5408\u63d0\u6848',
    memberTransfer: '\u6210\u5458\u8f6c\u79fb',
    emptyMessage: '\u65e0\u53ef\u7528\u7684 DAO \u57ce\u5e02\u6570\u636e',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TOKEN TRACKER
  // ═══════════════════════════════════════════════════════════════════════════
  tokenTracker: {
    daoToken: 'DAO \u4ee3\u5e01',
    marketCap: '\u5e02\u503c',
    high24h: '24\u5c0f\u65f6\u6700\u9ad8',
    low24h: '24\u5c0f\u65f6\u6700\u4f4e',
    holders: '\u6301\u6709\u8005\uff1a{count}',
    supply: '\u4f9b\u5e94\u91cf\uff1a{amount}K',
    fromStart: '\u4ece\u5f00\u59cb {change}',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TOKEN RANKING
  // ═══════════════════════════════════════════════════════════════════════════
  tokenRanking: {
    title: '\u4ee3\u5e01\u6392\u540d',
    subtitle: '\u5b9e\u65f6 DAO \u4ee3\u5e01\u4ef7\u683c',
    totalMarketCap: '\u603b\u5e02\u503c',
    volume24h: '24\u5c0f\u65f6\u6210\u4ea4\u91cf',
    rank: '#',
    token: '\u4ee3\u5e01',
    price: '\u4ef7\u683c',
    change24h: '24\u5c0f\u65f6',
    volume: '\u6210\u4ea4\u91cf',
    marketCap: '\u5e02\u503c',
    tokensTracked: '\u8ddf\u8e2a {count} \u4e2a\u4ee3\u5e01',
    noDataAvailable: '\u65e0\u53ef\u7528\u7684\u4ee3\u5e01\u6570\u636e',
    startCityToSee: '\u542f\u52a8\u57ce\u5e02\u4eff\u771f\u4ee5\u67e5\u770b\u6392\u540d',
    noRankings: '\u65e0\u53ef\u7528\u6392\u540d',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HEATMAP
  // ═══════════════════════════════════════════════════════════════════════════
  heatmap: {
    title: '\u6210\u5458\u5f97\u5206\uff1a\u58f0\u8a89 vs \u4ee3\u5e01\u4f59\u989d',
    subtitle: '\u5f97\u5206 = 50% \u58f0\u8a89 + 50% \u4ee3\u5e01\uff08\u5f52\u4e00\u5316\uff09',
    loading: '\u6b63\u5728\u52a0\u8f7d\u6210\u5458\u6570\u636e...',
    emptyMessage: '\u65e0\u6210\u5458\u53ef\u663e\u793a',
    emptyHelp: '\u542f\u52a8\u4eff\u771f\u4ee5\u67e5\u770b\u6210\u5458\u6570\u636e',
    colorLow: '\u4f4e',
    colorHigh: '\u9ad8',
    xAxis: '\u4ee3\u5e01\u4f59\u989d\uff08\u5f52\u4e00\u5316 0-100\uff09',
    yAxis: '\u58f0\u8a89\uff08\u5f52\u4e00\u5316 0-100\uff09',
    quadrantHighRepLowTokens: '\u9ad8\u58f0\u8a89/\u5c11\u4ee3\u5e01',
    quadrantHighInfluence: '\u9ad8\u5f71\u54cd\u529b',
    quadrantLowInfluence: '\u4f4e\u5f71\u54cd\u529b',
    quadrantLowRepHighTokens: '\u4f4e\u58f0\u8a89/\u591a\u4ee3\u5e01',
    membersCount: '{count} \u4e2a\u6210\u5458',
    avgScore: '\u5e73\u5747\u5f97\u5206\uff1a{value}',
    highInfluenceCount: '{count} \u4e2a\u9ad8\u5f71\u54cd\u529b',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHOROPLETH
  // ═══════════════════════════════════════════════════════════════════════════
  choropleth: {
    title: '\u6309\u4f4d\u7f6e\u5206\u5e03\u7684\u6210\u5458',
    loading: '\u6b63\u5728\u52a0\u8f7d\u4f4d\u7f6e\u6570\u636e...',
    emptyMessage: '\u65e0\u4f4d\u7f6e\u6570\u636e\u53ef\u663e\u793a',
    emptyHelp: '\u542f\u52a8\u4eff\u771f\u4ee5\u67e5\u770b\u6210\u5458\u5206\u5e03',
    clickForDetails: '\u70b9\u51fb\u67f1\u72b6\u56fe\u67e5\u770b\u8be6\u60c5',
    sampleMembers: '\u793a\u4f8b\u6210\u5458\uff1a',
    moreMembers: '\u8fd8\u6709 {count} \u4e2a',
    topLocation: '\u4e3b\u8981\u4f4d\u7f6e\uff1a{name}\uff08{percentage}%\uff09',
    locationsShown: '\u663e\u793a {count} \u4e2a\u4f4d\u7f6e',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STATES
  // ═══════════════════════════════════════════════════════════════════════════
  states: {
    waitingForData: '\u7b49\u5f85\u4eff\u771f\u6570\u636e',
    startSimulation: '\u542f\u52a8\u4eff\u771f\u4ee5\u67e5\u770b\u5b9e\u65f6\u53ef\u89c6\u5316',
    connectToWebSocket: '\u8fde\u63a5\u5230 WebSocket\uff1a{url}',
    noSimulationData: '\u65e0\u53ef\u7528\u7684\u4eff\u771f\u6570\u636e',
    mapPaused: '\u5730\u56fe\u5df2\u6682\u505c\u3002\u6062\u590d\u53ef\u89c6\u5316\u4ee5\u67e5\u770b DAO \u5730\u56fe\u3002',
    noOpsLogged: '\u5c1a\u65e0\u64cd\u4f5c\u8bb0\u5f55\u3002',
    visualsPaused: '\u53ef\u89c6\u5316\u5df2\u6682\u505c\u3002\u6062\u590d\u4ee5\u67e5\u770b{feature}\u3002',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OPS LOG
  // ═══════════════════════════════════════════════════════════════════════════
  opsLog: {
    title: '\u64cd\u4f5c\u65e5\u5fd7',
    recentEvents: '\u6700\u8fd1 {count} \u4e2a\u4e8b\u4ef6',
    opsSnapshot: '\u64cd\u4f5c\u5feb\u7167',
    priceAndTreasury: '\u4ef7\u683c {price}\uff0c\u8d22\u5e93 {treasury}',
    riskEvent: '\u98ce\u9669\u4e8b\u4ef6\uff1a\u5e02\u573a\u51b2\u51fb',
    marketShock: '\u5e02\u573a\u51b2\u51fb',
    upsideMove: '\u4e0a\u884c\u8fd0\u52a8',
    downsideMove: '\u4e0b\u884c\u8fd0\u52a8',
    severity: '\u4e25\u91cd\u7a0b\u5ea6 {value}',
    objectiveCompleted: '\u76ee\u6807\u5b8c\u6210',
    stepLabel: '\u6b65\u9aa4 {step}',
    event: '\u4e8b\u4ef6',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  notifications: {
    missionCompleted: '\u4efb\u52a1\u5b8c\u6210\uff1a{name}',
    marketShockAlert: '\u5e02\u573a\u51b2\u51fb\uff1a\u4e25\u91cd\u7a0b\u5ea6 {severity}\uff08\u6b65\u9aa4 {step}\uff09',
    celebrateMessage: '\u5e86\u795d\u80dc\u5229\u5e76\u4e3a\u51b2\u51fb\u505a\u51c6\u5907\uff1b\u6839\u636e\u9700\u8981\u8c03\u6574\u901f\u5ea6\u6216\u7b56\u7565\u3002',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SHORTCUTS
  // ═══════════════════════════════════════════════════════════════════════════
  shortcuts: {
    title: '\u952e\u76d8\u5feb\u6377\u952e',
    simulation: '\u4eff\u771f',
    startStop: '\u5f00\u59cb/\u505c\u6b62',
    step: '\u5355\u6b65',
    reset: '\u91cd\u7f6e',
    navigation: '\u5bfc\u822a\uff08Alt + \u952e\uff09',
    pressToToggle: '\u6309 ? \u5207\u6362\u6b64\u83dc\u5355',
    buttonLabel: '\u5feb\u6377\u952e',
    expandNav: '\u5c55\u5f00\u5bfc\u822a',
    collapseNav: '\u6536\u8d77\u5bfc\u822a',
    showShortcuts: '\u663e\u793a\u952e\u76d8\u5feb\u6377\u952e\uff08?\uff09',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RUN SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  runSummary: {
    title: '\u8fd0\u884c\u6458\u8981',
    runComplete: '\u8fd0\u884c\u5b8c\u6210',
    objectivesAchieved: '\u76ee\u6807\u8fbe\u6210',
    runEnded: '\u8fd0\u884c\u7ed3\u675f',
    treasuryInsolvency: '\u8fd0\u884c\u7ed3\u675f \u2013 \u8d22\u5e93\u7834\u4ea7',
    priceCollapse: '\u8fd0\u884c\u7ed3\u675f \u2013 \u4ee3\u5e01\u4ef7\u683c\u5d29\u6e83',
    governanceBacklog: '\u8fd0\u884c\u7ed3\u675f \u2013 \u6cbb\u7406\u79ef\u538b',
    timeline: '\u65f6\u95f4\u7ebf',
    retryPreset: '\u4f7f\u7528\u76f8\u540c\u9884\u8bbe\u91cd\u8bd5',
    score: '\u5f97\u5206',
    seed: '\u79cd\u5b50',
    preset: '\u9884\u8bbe',
    strategy: '\u7b56\u7565',
    outcome: '\u7ed3\u679c',
    defaultStrategy: '\u57fa\u7ebf',
    steps: '\u6b65\u6570',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════
  dashboard: {
    title: 'DAO \u6a21\u62df\u5668',
    subtitle: '\u5b9e\u65f6\u53bb\u4e2d\u5fc3\u5316\u6cbb\u7406\u53ef\u89c6\u5316',
    description: '\u901a\u8fc7\u60ca\u8273\u7684 3D \u7f51\u7edc\u56fe\u3001\u4ea4\u4e92\u5f0f\u56fe\u8868\u548c\u5168\u9762\u5206\u6790\uff0c\u4f53\u9a8c\u5206\u5e03\u5f0f\u51b3\u7b56\u7684\u7f8e\u3002',
    launchDashboard: '\u6253\u5f00\u4eea\u8868\u677f',
    feature3dLabel: '3D',
    feature3dTitle: '3D \u7f51\u7edc\u56fe',
    feature3dDesc: '\u4f7f\u7528 WebGL \u548c Three.js \u5728\u60ca\u8273\u7684 3D \u4e2d\u53ef\u89c6\u5316\u590d\u6742\u7684\u6cbb\u7406\u7f51\u7edc',
    featureLiveLabel: '\u5b9e\u65f6',
    featureLiveTitle: '\u5b9e\u65f6\u5206\u6790',
    featureLiveDesc: '\u901a\u8fc7 WebSocket \u5b9e\u65f6\u66f4\u65b0\u7684\u4ef7\u683c\u56fe\u8868\u3001\u70ed\u529b\u56fe\u548c\u7efc\u5408\u62a5\u544a',
    featureAgentsLabel: '\u667a\u80fd\u4f53',
    featureAgentsTitle: '\u57fa\u4e8e\u667a\u80fd\u4f53\u7684\u4eff\u771f',
    featureAgentsDesc: '\u89c2\u5bdf\u81ea\u4e3b\u667a\u80fd\u4f53\u4e92\u52a8\u3001\u6295\u7968\u5e76\u5851\u9020\u4f60\u7684 DAO \u7684\u672a\u6765',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════════════════
  footer: {
    brand: 'DAO \u6a21\u62df\u5668',
    stack: 'Next.js, Three.js, Recharts, Socket.IO',
    tagline: '\u7531\u6770\u51fa\u7684\u6280\u672f\u4eba\u5458\u548c\u827a\u672f\u5bb6\u7528\u613f\u666f\u6253\u9020',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ERRORS
  // ═══════════════════════════════════════════════════════════════════════════
  errors: {
    somethingWentWrong: '\u51fa\u4e86\u70b9\u95ee\u9898',
    unexpectedError: '\u53d1\u751f\u4e86\u610f\u5916\u9519\u8bef\u3002\u5f88\u62b1\u6b49\u7ed9\u60a8\u5e26\u6765\u4e0d\u4fbf\u3002',
    errorId: '\u9519\u8bef ID\uff1a',
    tryAgain: '\u91cd\u8bd5',
    goHome: '\u56de\u5230\u9996\u9875',
    persistsReport: '\u5982\u679c\u95ee\u9898\u6301\u7eed\u5b58\u5728\uff0c\u8bf7',
    reportIssue: '\u62a5\u544a\u95ee\u9898',
    pageNotFound: '\u9875\u9762\u672a\u627e\u5230',
    pageNotFoundDesc: '\u60a8\u8981\u67e5\u627e\u7684\u9875\u9762\u4e0d\u5b58\u5728\u6216\u5df2\u79fb\u52a8\u3002',
    openDashboard: '\u6253\u5f00\u4eea\u8868\u677f',
    visualization3dUnavailable: '3D \u53ef\u89c6\u5316\u4e0d\u53ef\u7528',
    webglError: '\u65e0\u6cd5\u6e32\u67d3 3D \u7f51\u7edc\u56fe\u3002\u8fd9\u53ef\u80fd\u662f\u7531\u4e8e\u60a8\u7684\u6d4f\u89c8\u5668\u6216\u663e\u5361\u7684 WebGL \u517c\u5bb9\u6027\u95ee\u9898\u3002',
    checkWebgl: '\u68c0\u67e5 WebGL \u652f\u6301',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING
  // ═══════════════════════════════════════════════════════════════════════════
  loadingStates: {
    loading: '\u52a0\u8f7d\u4e2d',
    pleaseWait: '\u8bf7\u7a0d\u5019...',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCESSIBILITY
  // ═══════════════════════════════════════════════════════════════════════════
  a11y: {
    skipToMain: '\u8df3\u5230\u4e3b\u8981\u5185\u5bb9',
    expandNavigation: '\u5c55\u5f00\u5bfc\u822a',
    collapseNavigation: '\u6536\u8d77\u5bfc\u822a',
    showKeyboardShortcuts: '\u663e\u793a\u952e\u76d8\u5feb\u6377\u952e\uff08?\uff09',
    simulationSpeedMultiplier: '\u4eff\u771f\u901f\u5ea6\u500d\u7387\u3002\u6570\u503c\u8d8a\u9ad8\u8fd0\u884c\u8d8a\u5feb\u3002',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════════════════
  metadata: {
    title: 'DAO \u6a21\u62df\u5668',
    titleTemplate: '%s | DAO \u6a21\u62df\u5668',
    description: '\u5b9e\u65f6\u53bb\u4e2d\u5fc3\u5316\u6cbb\u7406\u4eff\u771f\u4eea\u8868\u677f\u3002\u63a2\u7d22 DAO \u52a8\u6001\u3001\u667a\u80fd\u4f53\u884c\u4e3a\u548c\u6cbb\u7406\u673a\u5236\u3002',
    keywords: ['DAO', '\u4eff\u771f', '\u6cbb\u7406', '\u533a\u5757\u94fe', '\u53bb\u4e2d\u5fc3\u5316', '\u57fa\u4e8e\u667a\u80fd\u4f53\u7684\u5efa\u6a21'],
    author: 'DAO \u6a21\u62df\u5668\u56e2\u961f',
    ogTitle: 'DAO \u6a21\u62df\u5668',
    ogDescription: '\u5b9e\u65f6\u53bb\u4e2d\u5fc3\u5316\u6cbb\u7406\u4eff\u771f\u4eea\u8868\u677f',
    ogSiteName: 'DAO \u6a21\u62df\u5668',
    twitterTitle: 'DAO \u6a21\u62df\u5668',
    twitterDescription: '\u5b9e\u65f6\u53bb\u4e2d\u5fc3\u5316\u6cbb\u7406\u4eff\u771f\u4eea\u8868\u677f',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HOME
  // ═══════════════════════════════════════════════════════════════════════════
  home: {
    tagline: 'DAO \u7814\u7a76\uff0c\u4ed8\u8bf8\u884c\u52a8',
    heroTitle: 'DAO Simulator',
    heroDescription: '\u6765\u81ea 21 \u79cd\u5b9e\u9a8c\u914d\u7f6e\u7684 16,370 \u6b21\u4eff\u771f\u8fd0\u884c\u7684\u53ef\u64cd\u4f5c\u6cbb\u7406\u53d1\u73b0\u3002\u4ece\u4e0b\u65b9\u4efb\u610f\u7814\u7a76\u95ee\u9898\u5f00\u59cb\u3002',
    heroCta: '\u63a2\u7d22\u7814\u7a76',
    nav: '\u4e3b\u5bfc\u822a',
    consoleLink: '\u63a7\u5236\u53f0',
    researchHeading: '\u7814\u7a76',
    researchSubtitle: '\u6240\u6709\u7814\u7a76\u95ee\u9898\u7684\u51b3\u7b56\u7b80\u62a5',
    papersHeading: '\u8bba\u6587',
    papersSubtitle: '\u4e0b\u8f7d\u5b8c\u6574\u7814\u7a76\u8bba\u6587\u548c\u6863\u6848',
    methodologyHeading: '\u4e3a\u4ec0\u4e48\u8fd9\u9879\u5de5\u4f5c\u5f88\u91cd\u8981',
    advancedHeading: '\u9ad8\u7ea7\u90e8\u5206',
    advancedDesc: '\u539f\u59cb\u6307\u6807\u3001\u6e90\u6587\u4ef6\u548c\u5b8c\u6574\u7684\u6280\u672f\u5de5\u4ef6\u3002',
    whatWeFound: '\u7ed3\u679c\u663e\u793a',
    whatToDo: '\u5e94\u8be5\u600e\u4e48\u505a',
    whyItMatters: '\u4e3a\u4ec0\u4e48\u91cd\u8981\uff1a',
    evidenceLabel: '\u8bc1\u636e\u57fa\u7840',
    evidenceDesc: '\u6838\u5fc3\u6cbb\u7406\u8bba\u6587\u62a5\u544a\u4e86 21 \u79cd\u5b9e\u9a8c\u914d\u7f6e\u7684 16,370 \u6b21\u8fd0\u884c\u3002',
    briefsLabel: '\u51b3\u7b56\u7b80\u62a5',
    briefsCount: '\u4e2a\u7b80\u62a5\u6db5\u76d6\u53c2\u4e0e\u3001\u6355\u83b7\u3001\u8fd0\u8425\u3001\u8d22\u5e93\u3001\u534f\u8c03\u548c LLM \u6cbb\u7406\u3002',
    authorLabel: '\u4f5c\u8005',
    authorDesc: '\u7814\u7a76\u65b9\u5411\u548c\u7cfb\u7edf\u601d\u7ef4\u7531',
    confidenceNote: '\u7f6e\u4fe1\u5ea6\u8bf4\u660e\uff1a',
    briefLabel: '\u7b80\u62a5',
    openFullBrief: '\u6253\u5f00\u5b8c\u6574\u7b80\u62a5',
    sourceBriefMarkdown: '\u7b80\u62a5\u6e90 Markdown',
    relatedPaperPdf: '\u76f8\u5173\u8bba\u6587 PDF',
    currentPdf: '\u5f53\u524d PDF',
    currentTex: '\u5f53\u524d TeX',
    latestArchivedPdf: '\u6700\u65b0\u5f52\u6863 PDF',
    rawMetricTakeaways: '\u539f\u59cb\u6307\u6807\u8981\u70b9',
    methodNotes: '\u65b9\u6cd5\u8bf4\u660e',
    wordsCount: '\u5b57',
    briefSourceFiles: '\u7b80\u62a5\u6e90\u6587\u4ef6 + \u539f\u59cb\u6307\u6807',
    footerAttribution: 'DAO Simulator\uff0c\u4f5c\u8005',
    keyTerms: '\u5173\u952e\u672f\u8bed',
    footerConsole: '\u64cd\u4f5c\u5de5\u5177\u4ecd\u53ef\u5728\u4ed3\u5e93\u5185\u7684',
    podcastHeading: '\u542c\u542c\u7814\u7a76\u80cc\u540e\u7684\u6545\u4e8b',
    podcastDesc: 'James Pollack \u53c2\u52a0\u4e86 Green Pill \u64ad\u5ba2\uff0c\u63a2\u8ba8 DAO \u80fd\u5426\u7531 AI \u8fd0\u884c\u2014\u2014\u57fa\u4e8e\u667a\u80fd\u4f53\u6a21\u578b\u7684\u52a8\u6001\u3001\u94fe\u4e0a\u6cbb\u7406\u7684\u5b9e\u73b0\uff0c\u4ee5\u53ca\u6210\u4e3a\u672c\u5730\u56fe\u96c6\u7684\u7814\u7a76\u3002',
    podcastListen: '\u6536\u542c\u8282\u76ee',
    podcastApple: 'Apple Podcasts',
    podcastSpotify: 'Spotify',
    podcastYouTube: 'YouTube',
    podcastEpisode: 'Green Pill #123: AI DAO Simulator',
    digitalTwinsHeading: '\u6570\u5b57\u5b6a\u751f\uff1a14 \u4e2a\u771f\u5b9e DAO \u7684\u4eff\u771f\u6a21\u62df',
    digitalTwinsDesc: '\u6bcf\u6b21\u4eff\u771f\u90fd\u690d\u6839\u4e8e\u73b0\u5b9e\u3002\u6211\u4eec\u4e3a 14 \u4e2a\u4e3b\u8981 DAO \u6784\u5efa\u4e86\u6570\u5b57\u5b6a\u751f \u2014\u2014 \u6bcf\u4e2a\u90fd\u6839\u636e\u771f\u5b9e\u7684\u94fe\u4e0a\u6cbb\u7406\u6570\u636e\u3001Snapshot \u6295\u7968\u3001\u8bba\u575b\u6d3b\u52a8\u548c\u4ee3\u5e01\u4ef7\u683c\u8fdb\u884c\u6821\u51c6\u3002',
    digitalTwinsWhat: '\u6bcf\u4e2a\u5b6a\u751f\u6355\u6349\u4e86 DAO \u7684\u5b9e\u9645\u6cbb\u7406\u67b6\u6784\uff1a\u6cd5\u5b9a\u4eba\u6570\u9608\u503c\u3001\u6295\u7968\u671f\u9650\u3001\u63d0\u6848\u6d41\u7a0b\u3001\u8d22\u653f\u673a\u5236\u548c\u6210\u5458\u539f\u578b \u2014\u2014 \u4ece\u59d4\u6258\u4eba\u548c\u4ee3\u5e01\u6301\u6709\u8005\u5230\u5b89\u5168\u59d4\u5458\u4f1a\u3002',
    digitalTwinsHow: '\u4ece\u94fe\u4e0a\u6570\u636e\u7f16\u8bd1\u7684\u5386\u53f2\u6821\u51c6\u914d\u7f6e\u9a71\u52a8\u4ee3\u7406\u884c\u4e3a\u3001\u63d0\u6848\u9891\u7387\u3001\u53c2\u4e0e\u7387\u548c\u901a\u8fc7\u7387\u3002\u6240\u6709 14 \u4e2a DAO \u7684\u6821\u51c6\u5f97\u5206\u5e73\u5747\u4e3a 0.85\u3002',
    digitalTwinsWhy: '\u6570\u5b57\u5b6a\u751f\u8ba9\u7814\u7a76\u4eba\u5458\u80fd\u591f\u6d4b\u8bd5\u53cd\u4e8b\u5b9e\u6cbb\u7406\u53d8\u66f4 \u2014\u2014 \u201c\u5982\u679c Uniswap \u964d\u4f4e\u6cd5\u5b9a\u4eba\u6570\u4f1a\u600e\u6837\uff1f\u201d\u6216\u201c\u5982\u679c Optimism \u52a0\u5165\u672a\u6765\u4e3b\u4e49\u6cbb\u7406\u4f1a\u600e\u6837\uff1f\u201d \u2014\u2014 \u65e0\u9700\u62ff\u771f\u5b9e\u8d22\u5e93\u5192\u9669\u3002',
    digitalTwinsDaos: 'Uniswap, Compound, Aave, Arbitrum, Optimism, ENS, Lido, Gitcoin, MakerDAO, Curve, Nouns, Balancer, dYdX, SushiSwap',
    digitalTwinsCategories: 'DeFi\u3001Layer 2\u3001\u516c\u5171\u7269\u54c1\u3001\u8d28\u62bc\u3001\u501f\u8d37\u3001\u8eab\u4efd\u3001\u7a33\u5b9a\u5e01\u3001DEX',
    tapToExpand: '\u70b9\u51fb\u5c55\u5f00',
    noOutcomePoints: '\u672a\u627e\u5230\u6b64\u7b80\u62a5\u7684\u7ed3\u679c\u8981\u70b9\u3002',
    seeAlso: '\u53e6\u89c1:',
    consultingHeading: '\u4e0e\u6211\u5408\u4f5c',
    consultingDesc: '\u5bfb\u627e DAO \u6cbb\u7406\u8bbe\u8ba1\u3001\u57fa\u4e8e\u667a\u80fd\u4f53\u7684\u4eff\u771f\u6216\u53bb\u4e2d\u5fc3\u5316\u51b3\u7b56\u65b9\u9762\u7684\u4e13\u4e1a\u6307\u5bfc\uff1f\u6211\u63d0\u4f9b\u6cbb\u7406\u673a\u5236\u8bbe\u8ba1\u3001\u6821\u51c6\u7b56\u7565\u548c\u57fa\u4e8e\u4eff\u771f\u7684\u653f\u7b56\u5206\u6790\u54a8\u8be2\u670d\u52a1\u3002',
    consultingCta: '\u8054\u7cfb\u6211',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSOLE
  // ═══════════════════════════════════════════════════════════════════════════
  console: {
    heading: '\u5b9e\u9a8c\u7ba1\u7406',
    subtitle: 'DAO \u7814\u7a76\u63a7\u5236\u53f0',
    description: '\u7ba1\u7406\u5b9e\u9a8c\u8fd0\u884c\u3001\u67e5\u770b\u7ed3\u679c\u3001\u751f\u6210\u62a5\u544a\u548c\u66f4\u65b0\u8bba\u6587\u5de5\u4ef6\u3002\u6240\u6709\u64cd\u4f5c\u5728\u672c\u5730\u8fd0\u884c\uff0c\u65e5\u5fd7\u5199\u5165\u7ed3\u679c\u76ee\u5f55\u3002',
    latestAction: '\u6700\u65b0\u64cd\u4f5c\u5df2\u52a0\u5165\u961f\u5217',
    runExperiments: '\u8fd0\u884c\u5b9e\u9a8c',
    selectConfig: '\u9009\u62e9\u914d\u7f6e\u6587\u4ef6\u4ee5\u5f00\u59cb\u6216\u6062\u590d\u6279\u91cf\u8fd0\u884c\u3002',
    selectPlaceholder: '\u9009\u62e9\u914d\u7f6e',
    run: '\u8fd0\u884c',
    resume: '\u6062\u590d',
    resumeLabel: '\u6062\u590d\u914d\u7f6e',
    reports: '\u62a5\u544a',
    generateReport: '\u4ece\u73b0\u6709\u7ed3\u679c\u751f\u6210\u7814\u7a76\u7ea7\u8d28\u91cf\u62a5\u544a\u3002',
    generateReportBtn: '\u751f\u6210\u62a5\u544a',
    paperPipeline: '\u8bba\u6587\u6d41\u6c34\u7ebf',
    paperPipelineDesc: '\u4ece\u6700\u65b0\u7ed3\u679c\u66f4\u65b0\u5b66\u672f\u8bba\u6587\uff0c\u7f16\u8bd1 PDF\uff0c\u5e76\u5f52\u6863\u7248\u672c\u3002',
    updatePaper: '\u66f4\u65b0\u8bba\u6587',
    compileLabel: '\u7f16\u8bd1',
    archiveAll: '\u5168\u90e8\u5f52\u6863',
    experimentConfigs: '\u5b9e\u9a8c\u914d\u7f6e',
    resultsArchive: '\u7ed3\u679c\u5f52\u6863',
    noConfigs: '\u672a\u627e\u5230\u5b9e\u9a8c\u914d\u7f6e\u3002',
    noResults: '\u5728 ./results \u4e2d\u672a\u627e\u5230\u7ed3\u679c\u3002',
    configCount: '\u4e2a\u914d\u7f6e',
    resultCount: '\u4e2a\u7ed3\u679c\u96c6',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RESULTS
  // ═══════════════════════════════════════════════════════════════════════════
  results: {
    heading: '\u7ed3\u679c',
    status: '\u72b6\u6001',
    files: '\u6587\u4ef6',
    backToHome: '\u8fd4\u56de\u9996\u9875',
    backToConsole: '\u8fd4\u56de\u63a7\u5236\u53f0',
    previewTruncated: '\u9884\u89c8\u5df2\u622a\u65ad\uff0c\u622a\u65ad\u4f4d\u7f6e',
    noFiles: '\u672a\u627e\u5230\u6587\u4ef6\u3002',
    noStatus: '\u672a\u627e\u5230 status.json\u3002',
  },
};
