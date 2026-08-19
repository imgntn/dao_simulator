export const RESEARCH_STATUS = {
  legacyExploratoryRuns: 21_869,
  legacyExploratoryRunsLabel: '21,869',
  calibratedDaoCount: 14,
  experimentConfigurationCount: 17,
  classification: 'Exploratory evidence',
  confirmatoryStatus: 'Confirmatory campaign pending',
  updatedAt: '2026-08-18',
} as const;

export const RESEARCH_STATUS_SUMMARY =
  'The numerical findings on this site come from the legacy exploratory campaign. ' +
  'They are useful for forming governance hypotheses, but they are not presented as ' +
  'confirmed causal or forecasting results. The frozen confirmatory campaign and claim ' +
  'registry are still being completed.';
