import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  canonicalJson,
  loadCampaign,
  renameAtomicWithRetry,
  sha256,
  sha256File,
  verifyCampaign,
  writeJsonAtomic,
  type CampaignArtifact,
  type CampaignManifest,
} from './campaign-manifest';
import {
  auditClaimRegistry,
  type ClaimRegistry,
  type QuantitativeClaim,
} from './claim-registry';
import {
  assertCalibrationValidationReport,
  type CalibrationValidationReport,
} from './calibration-validation-report';

export const PUBLICATION_BUNDLE_SCHEMA_VERSION = '1.2.0';

type JsonRecord = Record<string, unknown>;
export type PublicationBundleMode = 'publication' | 'supporting' | 'pipeline-smoke';

export interface PublicationFile {
  path: string;
  bytes: number;
  sha256: string;
  mediaType: string;
}

export interface PublicationBundleManifest {
  schemaVersion: string;
  campaignId: string;
  generatedAt: string;
  sourceCampaign: {
    identitySha256: string;
    manifestSha256: string;
    analysisPath: string;
    analysisSha256: string;
    claimsPath: string;
    claimsSha256: string;
    gitCommit: string;
    runCount: number;
  };
  scope: {
    mode: PublicationBundleMode;
    publicationRole: 'core-confirmatory' | 'supporting-exploratory' | 'validation';
    experimentIds: string[];
    claimIds: string[];
  };
  files: PublicationFile[];
}

export function generatePublicationArtifacts(
  campaignDir: string,
  outputDir: string,
  options: { mode?: PublicationBundleMode } = {},
): PublicationBundleManifest {
  const mode = options.mode ?? 'publication';
  const selectedPublicationRole = mode === 'publication'
    ? 'core-confirmatory'
    : mode === 'supporting'
      ? 'supporting-exploratory'
      : 'validation';
  const absoluteCampaignDir = path.resolve(campaignDir);
  const absoluteOutputDir = path.resolve(outputDir);
  if (absoluteOutputDir === absoluteCampaignDir
      || absoluteOutputDir.startsWith(`${absoluteCampaignDir}${path.sep}`)) {
    throw new Error('Publication output must be outside the immutable campaign directory');
  }

  const campaign = loadCampaign(absoluteCampaignDir);
  if (campaign.state !== 'verified') {
    throw new Error(`Publication requires a verified campaign; found state "${campaign.state}"`);
  }
  const verification = verifyCampaign(absoluteCampaignDir);
  if (!verification.valid) {
    throw new Error(`Campaign verification failed: ${verification.errors.join('; ')}`);
  }

  const analysisArtifact = requiredArtifact(campaign, 'campaign-analysis');
  const claimsArtifact = requiredArtifact(campaign, 'claim-registry');
  const analysisPath = containedPath(absoluteCampaignDir, analysisArtifact.path);
  const claimsPath = containedPath(absoluteCampaignDir, claimsArtifact.path);
  const analysis = readJsonRecord(analysisPath, 'analysis');
  const claims = readJson<ClaimRegistry>(claimsPath, 'claim registry');
  if (analysis.campaignId !== campaign.campaignId || claims.campaignId !== campaign.campaignId) {
    throw new Error('Publication source artifacts do not match the campaign ID');
  }

  const claimAudit = auditClaimRegistry(claims, {
    campaignId: campaign.campaignId,
    analysisPath: analysisArtifact.path,
    analysisSha256: analysisArtifact.sha256,
    runIds: new Set(campaign.runs.map(run => run.runId)),
  });
  if (claimAudit.length > 0) {
    throw new Error(`Claim registry audit failed: ${claimAudit.join('; ')}`);
  }

  const experiments = records(analysis.experiments)
    .filter(experiment => experiment.publicationRole === selectedPublicationRole)
    .sort((left, right) => String(left.experimentId).localeCompare(String(right.experimentId)));
  if (experiments.length === 0) {
    throw new Error(
      mode === 'publication'
        ? 'Verified campaign contains no core-confirmatory experiments'
        : mode === 'supporting'
          ? 'Verified campaign contains no supporting-exploratory experiments'
          : 'Verified campaign contains no validation experiments for pipeline smoke generation'
    );
  }
  const experimentIds = new Set(experiments.map(experiment => String(experiment.experimentId)));
  const selectedClaims = claims.claims
    .filter(claim => experimentIds.has(claim.experimentId))
    .sort((left, right) => left.id.localeCompare(right.id));
  if (selectedClaims.length === 0) {
    throw new Error(
      mode === 'publication'
        ? 'Core-confirmatory experiments produced no auditable claims'
        : mode === 'supporting'
          ? 'Supporting-exploratory experiments produced no auditable claims'
          : 'Validation experiments produced no auditable pipeline-smoke claims'
    );
  }
  const pairedEffects = records(analysis.pairedEffects)
    .filter(effect => experimentIds.has(String(effect.experimentId)));
  const factorialModels = records(analysis.factorialModels)
    .filter(model => experimentIds.has(String(model.experimentId)));
  const validationArtifact = campaign.artifacts.find(artifact => artifact.id === 'validation-report');
  const validationReport = validationArtifact
    ? readJsonRecord(
      containedPath(absoluteCampaignDir, validationArtifact.path),
      'validation report',
    )
    : null;
  const calibrationArtifact = campaign.artifacts.find(
    artifact => artifact.id === 'input:calibrationValidationReport'
  );
  let calibrationReport: CalibrationValidationReport | null = null;
  if (campaign.schemaVersion >= 4) {
    if (!calibrationArtifact) {
      throw new Error(
        'Schema-4 publication campaigns require an archived calibration validation report'
      );
    }
    const calibrationValue = readJson<unknown>(
      containedPath(absoluteCampaignDir, calibrationArtifact.path),
      'calibration validation report',
    );
    assertCalibrationValidationReport(calibrationValue, 14);
    calibrationReport = calibrationValue;
  }

  prepareOutputDirectory(absoluteOutputDir, campaign.campaignId);
  const outputs = new Map<string, { contents: string; mediaType: string }>();
  const smokeMarkdown = mode === 'pipeline-smoke'
    ? '# PIPELINE SMOKE ONLY — NOT SCIENTIFIC EVIDENCE\n\n'
    : '';
  const smokeTex = mode === 'pipeline-smoke'
    ? '% PIPELINE SMOKE ONLY — NOT SCIENTIFIC EVIDENCE\n'
    : '';
  if (mode === 'pipeline-smoke') {
    outputs.set('PIPELINE_SMOKE_ONLY.md', {
      contents: [
        '# Pipeline smoke only',
        '',
        'This bundle validates publication artifact generation and compilation.',
        'Its validation-role claims are not confirmatory findings and must not be cited as scientific evidence.',
        '',
      ].join('\n'),
      mediaType: 'text/markdown',
    });
    outputs.set('pipeline-smoke.tex', {
      contents: [
        '\\documentclass[11pt]{article}',
        '\\usepackage[margin=1in]{geometry}',
        '\\usepackage{booktabs}',
        '\\usepackage{longtable}',
        '\\usepackage{xcolor}',
        '\\begin{document}',
        '\\begin{center}',
        '\\fcolorbox{red}{red!8}{\\parbox{0.9\\linewidth}{\\centering\\bfseries\\color{red}',
        'PIPELINE SMOKE ONLY --- NOT SCIENTIFIC EVIDENCE}}',
        '\\end{center}',
        '\\section*{Methods}',
        '\\input{fragments/methods.tex}',
        '\\section*{Calibration}',
        '\\input{fragments/calibration.tex}',
        '\\section*{Results}',
        '\\input{fragments/results.tex}',
        '\\input{fragments/results-table.tex}',
        '\\clearpage',
        '\\section*{Reproducibility}',
        '\\input{fragments/reproducibility-table.tex}',
        '\\end{document}',
        '',
      ].join('\n'),
      mediaType: 'application/x-tex',
    });
  }
  outputs.set('tables/claims.csv', {
    contents: claimsCsv(selectedClaims),
    mediaType: 'text/csv',
  });
  outputs.set('claims.json', {
    contents: `${JSON.stringify({
      ...claims,
      claims: selectedClaims,
    }, null, 2)}\n`,
    mediaType: 'application/json',
  });
  outputs.set('tables/condition-descriptives.csv', {
    contents: conditionsCsv(experiments),
    mediaType: 'text/csv',
  });
  outputs.set('tables/paired-effects.csv', {
    contents: pairedEffectsCsv(pairedEffects),
    mediaType: 'text/csv',
  });
  outputs.set('tables/factorial-coefficients.csv', {
    contents: factorialCoefficientsCsv(factorialModels),
    mediaType: 'text/csv',
  });
  outputs.set('tables/power.csv', {
    contents: powerCsv(experiments),
    mediaType: 'text/csv',
  });
  if (validationReport) {
    outputs.set('tables/validation-gates.csv', {
      contents: validationGatesCsv(validationReport),
      mediaType: 'text/csv',
    });
  }
  if (calibrationReport) {
    outputs.set('tables/calibration-holdout.csv', {
      contents: calibrationHoldoutCsv(calibrationReport),
      mediaType: 'text/csv',
    });
    outputs.set('figures/calibration-holdout.svg', {
      contents: calibrationHoldoutSvg(calibrationReport),
      mediaType: 'image/svg+xml',
    });
    outputs.set('fragments/calibration.tex', {
      contents: smokeTex + calibrationTex(calibrationReport),
      mediaType: 'application/x-tex',
    });
  }
  outputs.set('figures/paired-effects.svg', {
    contents: pairedEffectsSvg(selectedClaims, mode),
    mediaType: 'image/svg+xml',
  });
  outputs.set('fragments/methods.tex', {
    contents: smokeTex + methodsTex(campaign, experiments, calibrationReport, mode),
    mediaType: 'application/x-tex',
  });
  outputs.set('fragments/results.tex', {
    contents: smokeTex + resultsTex(selectedClaims),
    mediaType: 'application/x-tex',
  });
  outputs.set('fragments/results-table.tex', {
    contents: smokeTex + claimsTableTex(selectedClaims),
    mediaType: 'application/x-tex',
  });
  outputs.set('fragments/reproducibility-table.tex', {
    contents: smokeTex + reproducibilityTableTex(campaign),
    mediaType: 'application/x-tex',
  });
  outputs.set('RESULTS.md', {
    contents: smokeMarkdown + resultsMarkdown(campaign, experiments, selectedClaims, mode),
    mediaType: 'text/markdown',
  });
  outputs.set('provenance.json', {
    contents: `${JSON.stringify({
      schemaVersion: PUBLICATION_BUNDLE_SCHEMA_VERSION,
      bundleMode: mode,
      campaignId: campaign.campaignId,
      campaignIdentitySha256: campaign.identitySha256,
      campaignManifestSha256: sha256File(path.join(absoluteCampaignDir, 'campaign-manifest.json')),
      analysis: { path: analysisArtifact.path, sha256: analysisArtifact.sha256 },
      claims: { path: claimsArtifact.path, sha256: claimsArtifact.sha256 },
      gitCommit: campaign.provenance.gitCommit,
      runIds: campaign.runs.map(run => run.runId).sort(),
      metricDefinitions: Object.fromEntries(
        selectedClaims.map(claim => [
          claim.outcome.metricId,
          claim.outcome.metricDefinitionVersion,
        ])
      ),
    }, null, 2)}\n`,
    mediaType: 'application/json',
  });

  for (const [relativePath, output] of outputs) {
    writeTextAtomic(path.join(absoluteOutputDir, relativePath), output.contents);
  }
  const files = [...outputs.entries()].map(([relativePath, output]) => {
    const absolutePath = path.join(absoluteOutputDir, relativePath);
    return {
      path: relativePath,
      bytes: fs.statSync(absolutePath).size,
      sha256: sha256File(absolutePath),
      mediaType: output.mediaType,
    };
  }).sort((left, right) => left.path.localeCompare(right.path));

  const bundle: PublicationBundleManifest = {
    schemaVersion: PUBLICATION_BUNDLE_SCHEMA_VERSION,
    campaignId: campaign.campaignId,
    generatedAt: campaign.updatedAt,
    sourceCampaign: {
      identitySha256: campaign.identitySha256,
      manifestSha256: sha256File(path.join(absoluteCampaignDir, 'campaign-manifest.json')),
      analysisPath: analysisArtifact.path,
      analysisSha256: analysisArtifact.sha256,
      claimsPath: claimsArtifact.path,
      claimsSha256: claimsArtifact.sha256,
      gitCommit: campaign.provenance.gitCommit,
      runCount: campaign.accounting.completed,
    },
    scope: {
      mode,
      publicationRole: selectedPublicationRole,
      experimentIds: [...experimentIds].sort(),
      claimIds: selectedClaims.map(claim => claim.id),
    },
    files,
  };
  writeJsonAtomic(path.join(absoluteOutputDir, 'publication-manifest.json'), bundle);
  return bundle;
}

export function verifyPublicationBundle(outputDir: string): string[] {
  const errors: string[] = [];
  const manifestPath = path.join(outputDir, 'publication-manifest.json');
  if (!fs.existsSync(manifestPath)) return ['Missing publication-manifest.json'];
  let manifest: PublicationBundleManifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as PublicationBundleManifest;
  } catch {
    return ['Invalid publication-manifest.json'];
  }
  if (manifest.schemaVersion !== PUBLICATION_BUNDLE_SCHEMA_VERSION) {
    errors.push(`Unsupported publication bundle schema: ${manifest.schemaVersion}`);
  }
  if (
    manifest.scope?.mode !== 'publication'
    && manifest.scope?.mode !== 'supporting'
    && manifest.scope?.mode !== 'pipeline-smoke'
  ) {
    errors.push(`Unsupported publication bundle mode: ${String(manifest.scope?.mode)}`);
  }
  if (
    manifest.scope?.mode === 'supporting'
    && manifest.scope.publicationRole !== 'supporting-exploratory'
  ) {
    errors.push('Supporting bundle does not have supporting-exploratory scope');
  }
  if (
    manifest.scope?.mode === 'publication'
    && manifest.scope.publicationRole !== 'core-confirmatory'
  ) {
    errors.push('Publication bundle does not have core-confirmatory scope');
  }
  if (
    manifest.scope?.mode === 'pipeline-smoke'
    && manifest.scope.publicationRole !== 'validation'
  ) {
    errors.push('Pipeline-smoke bundle does not have validation scope');
  }
  const seen = new Set<string>();
  for (const file of manifest.files ?? []) {
    if (seen.has(file.path)) errors.push(`Duplicate publication file: ${file.path}`);
    seen.add(file.path);
    const absolutePath = containedPath(path.resolve(outputDir), file.path);
    if (!fs.existsSync(absolutePath)) {
      errors.push(`Missing publication file: ${file.path}`);
      continue;
    }
    if (fs.statSync(absolutePath).size !== file.bytes) {
      errors.push(`Publication file size mismatch: ${file.path}`);
    }
    if (sha256File(absolutePath) !== file.sha256) {
      errors.push(`Publication file hash mismatch: ${file.path}`);
    }
  }
  return errors;
}

function requiredArtifact(campaign: CampaignManifest, id: string): CampaignArtifact {
  const artifact = campaign.artifacts.find(candidate => candidate.id === id);
  if (!artifact) throw new Error(`Campaign is missing required artifact "${id}"`);
  return artifact;
}

function prepareOutputDirectory(outputDir: string, campaignId: string): void {
  const manifestPath = path.join(outputDir, 'publication-manifest.json');
  if (fs.existsSync(outputDir) && !fs.existsSync(manifestPath)) {
    const entries = fs.readdirSync(outputDir);
    if (entries.length > 0) {
      throw new Error('Publication output directory is non-empty and has no bundle manifest');
    }
  }
  if (fs.existsSync(manifestPath)) {
    const previous = readJson<PublicationBundleManifest>(manifestPath, 'publication manifest');
    if (previous.campaignId !== campaignId) {
      throw new Error('Publication output belongs to a different campaign');
    }
    for (const file of previous.files) {
      const absolutePath = containedPath(path.resolve(outputDir), file.path);
      if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
    }
    fs.unlinkSync(manifestPath);
  }
  fs.mkdirSync(outputDir, { recursive: true });
}

function claimsCsv(claims: QuantitativeClaim[]): string {
  const rows = claims.map(claim => [
    claim.id,
    claim.experimentId,
    claim.researchQuestionIds.join(';'),
    claim.status,
    claim.outcome.metricId,
    claim.estimand.conditionA,
    claim.estimand.conditionB,
    claim.estimand.nPairs,
    claim.estimate.value,
    claim.estimate.confidenceInterval.lower,
    claim.estimate.confidenceInterval.upper,
    claim.estimate.adjustedPValue,
    claim.estimate.correctionMethod,
    claim.estimate.effectSizeCohensDz,
    claim.source.analysisSha256,
    claim.source.runIds.join(';'),
  ]);
  return csv([
    'claim_id', 'experiment_id', 'research_question_ids', 'status', 'metric_id',
    'condition_a', 'condition_b', 'paired_n', 'estimate', 'ci95_lower', 'ci95_upper',
    'adjusted_p', 'correction', 'cohens_dz', 'analysis_sha256', 'source_run_ids',
  ], rows);
}

function conditionsCsv(experiments: JsonRecord[]): string {
  const rows = experiments.flatMap(experiment =>
    records(experiment.conditions).map(condition => [
      experiment.experimentId,
      condition.condition,
      condition.label,
      canonicalJson(asRecord(condition.factors)),
      condition.n,
      condition.mean,
      condition.standardDeviation,
      condition.median,
      condition.q1,
      condition.q3,
      condition.minimum,
      condition.maximum,
      condition.uniqueValueCount,
    ])
  );
  return csv([
    'experiment_id', 'condition_id', 'label', 'factors_json', 'n', 'mean',
    'standard_deviation', 'median', 'q1', 'q3', 'minimum', 'maximum',
    'unique_value_count',
  ], rows);
}

function pairedEffectsCsv(effects: JsonRecord[]): string {
  return csv([
    'experiment_id', 'outcome', 'condition_a', 'condition_b', 'paired_n',
    'mean_difference', 'ci95_lower', 'ci95_upper', 'adjusted_p',
    'correction', 'cohens_dz', 'practically_important', 'practically_equivalent',
  ], effects.map(effect => {
    const interval = asRecord(effect.confidenceInterval);
    return [
      effect.experimentId, effect.outcome, effect.conditionA, effect.conditionB,
      effect.nPairs, effect.meanDifference, interval.lower, interval.upper,
      effect.adjustedPValue, effect.correctionMethod, effect.cohensDz,
      effect.practicallyImportant, effect.practicallyEquivalent,
    ];
  }));
}

function factorialCoefficientsCsv(models: JsonRecord[]): string {
  const rows = models.flatMap(model => records(model.coefficients).map(coefficient => {
    const interval = asRecord(coefficient.robustConfidenceInterval);
    return [
      model.experimentId, model.outcome, model.n, coefficient.term,
      coefficient.estimate, coefficient.robustStandardError, interval.lower,
      interval.upper, coefficient.adjustedPValue, coefficient.correctionMethod,
      model.rSquared, model.adjustedRSquared,
    ];
  }));
  return csv([
    'experiment_id', 'outcome', 'n', 'term', 'estimate', 'hc3_standard_error',
    'hc3_ci95_lower', 'hc3_ci95_upper', 'adjusted_p', 'correction',
    'r_squared', 'adjusted_r_squared',
  ], rows);
}

function powerCsv(experiments: JsonRecord[]): string {
  const rows = experiments.flatMap(experiment => {
    const pilotPower = asRecord(experiment.pilotPower);
    return records(pilotPower.contrasts).map(contrast => {
      const simulation = asRecord(contrast.simulationPower);
      return [
        experiment.experimentId, contrast.conditionA, contrast.conditionB,
        contrast.pilotPairs, contrast.requiredPairs, simulation.requiredPairs,
        simulation.estimatedPower, pilotPower.recommendedPairs,
      ];
    });
  });
  return csv([
    'experiment_id', 'condition_a', 'condition_b', 'pilot_pairs',
    'analytic_required_pairs', 'simulation_required_pairs',
    'simulation_estimated_power', 'recommended_pairs',
  ], rows);
}

function methodsTex(
  campaign: CampaignManifest,
  experiments: JsonRecord[],
  calibrationReport: CalibrationValidationReport | null,
  mode: PublicationBundleMode,
): string {
  const ids = experiments
    .map(experiment => latexBreakableIdentifier(String(experiment.experimentId)))
    .join(', ');
  const experimentScope = mode === 'publication'
    ? 'The core-confirmatory experiment identifiers were'
    : mode === 'supporting'
      ? 'The supporting-exploratory experiment identifiers were'
      : 'The validation-only pipeline-smoke experiment identifiers were';
  return [
    '% Generated from a verified immutable campaign. Do not edit by hand.',
    '\\noindent\\textbf{Computational provenance.}\\par',
    `\\noindent Campaign: \\texttt{${latexBreakableIdentifier(campaign.campaignId)}}.\\par`,
    `\\noindent Git commit: \\texttt{${latexBreakableHash(campaign.provenance.gitCommit)}}.\\par`,
    `\\noindent The campaign contains ${campaign.accounting.completed} completed runs with zero failed runs and passed byte-level SHA-256 verification. ${experimentScope} ${ids}. Paired contrasts used common replicate seeds, bootstrap confidence intervals, the declared multiplicity correction, and preregistered practical-equivalence margins. Factorial models used categorical reference coding with declared two-way interactions and HC3 heteroskedasticity-robust uncertainty.${calibrationReport ? ` Calibration was evaluated chronologically on held-out periods for ${calibrationReport.daoCount} DAOs and compared with historical-persistence and uncalibrated simulation null models.` : ''}`,
    '',
  ].join('\n');
}

function validationGatesCsv(report: JsonRecord): string {
  const rows = records(report.validations).map(validation => [
    validation.name,
    validation.passed,
    Array.isArray(validation.checks) ? validation.checks.length : 0,
  ]);
  return csv(['validation', 'passed', 'check_count'], rows);
}

function calibrationHoldoutCsv(report: CalibrationValidationReport): string {
  return csv([
    'dao_id',
    'calibrated_score',
    'persistence_score',
    'uncalibrated_score',
    'skill_vs_persistence',
    'skill_vs_uncalibrated',
    'ci95',
  ], report.results.map(result => [
    result.dao_id,
    result.overall_score,
    result.persistence_score,
    result.uncalibrated_score,
    result.skill_vs_persistence,
    result.skill_vs_uncalibrated,
    result.ci95,
  ]));
}

function calibrationTex(report: CalibrationValidationReport): string {
  const persistenceWins = report.results.filter(result => result.skill_vs_persistence > 0).length;
  const uncalibratedWins = report.results.filter(
    result => result.skill_vs_uncalibrated !== null && result.skill_vs_uncalibrated > 0
  ).length;
  return [
    '% Generated from the archived temporal-holdout calibration report.',
    `\\paragraph{Held-out calibration.} Across ${report.daoCount} DAOs, the mean held-out similarity score was ${formatNumber(report.averageScore)}. The calibrated simulator exceeded the historical-persistence comparator for ${persistenceWins}/${report.daoCount} DAOs and the uncalibrated simulator for ${uncalibratedWins}/${report.daoCount} DAOs. These comparisons diagnose model skill under the declared metric weights; they do not establish real-world causal validity.`,
    '',
  ].join('\n');
}

function reproducibilityTableTex(campaign: CampaignManifest): string {
  const inputRows = Object.entries(campaign.provenance.inputHashes)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, hash]) =>
      `${latexBreakableIdentifier(id)} & \\texttt{${latexBreakableHash(hash)}} \\\\`
    );
  return [
    '% Generated from the verified campaign manifest.',
    '\\begingroup',
    '\\setlength{\\tabcolsep}{3pt}',
    '\\begin{longtable}{@{}p{0.28\\linewidth}p{0.68\\linewidth}@{}}',
    '\\toprule',
    'Artifact & SHA-256 \\\\',
    '\\midrule',
    '\\endfirsthead',
    '\\toprule',
    'Artifact & SHA-256 \\\\',
    '\\midrule',
    '\\endhead',
    `Campaign identity & \\texttt{${latexBreakableHash(campaign.identitySha256)}} \\\\`,
    `Dependency lock & \\texttt{${latexBreakableHash(campaign.provenance.lockfileSha256)}} \\\\`,
    `Resolved configuration & \\texttt{${latexBreakableHash(campaign.provenance.configSha256)}} \\\\`,
    ...inputRows,
    '\\bottomrule',
    '\\end{longtable}',
    '\\endgroup',
    '',
  ].join('\n');
}

function calibrationHoldoutSvg(report: CalibrationValidationReport): string {
  const width = 960;
  const rowHeight = 30;
  const height = 80 + report.results.length * rowHeight;
  const rows = [...report.results].sort((left, right) =>
    left.dao_id.localeCompare(right.dao_id)
  );
  const x = (value: number) => 260 + Math.max(0, Math.min(1, value)) * 620;
  const body = rows.map((result, index) => {
    const y = 48 + index * rowHeight;
    const uncalibrated = result.uncalibrated_score;
    return [
      `<text x="18" y="${y + 4}" font-size="12" font-family="sans-serif">${xml(result.dao_id)}</text>`,
      `<line x1="260" x2="880" y1="${y}" y2="${y}" stroke="#e5e7eb"/>`,
      `<circle cx="${x(result.persistence_score)}" cy="${y}" r="4" fill="#6b7280"><title>Persistence ${result.persistence_score.toFixed(3)}</title></circle>`,
      uncalibrated === null
        ? ''
        : `<rect x="${x(uncalibrated) - 4}" y="${y - 4}" width="8" height="8" fill="#d97706"><title>Uncalibrated ${uncalibrated.toFixed(3)}</title></rect>`,
      `<path d="M ${x(result.overall_score)} ${y - 6} l 6 11 h -12 z" fill="#047857"><title>Calibrated ${result.overall_score.toFixed(3)}</title></path>`,
    ].join('');
  }).join('');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">`,
    '<title id="title">Temporal holdout calibration and null-model scores by DAO</title>',
    '<desc id="desc">Triangles show calibrated similarity, circles show historical persistence, and squares show uncalibrated simulation scores. Higher is better.</desc>',
    '<rect width="100%" height="100%" fill="white"/>',
    body,
    `<text x="570" y="${height - 12}" text-anchor="middle" font-size="12" font-family="sans-serif">Held-out similarity score (higher is better)</text>`,
    '</svg>',
    '',
  ].join('\n');
}

function resultsTex(claims: QuantitativeClaim[]): string {
  return [
    '% Generated from claims.json. Do not edit numerical statements by hand.',
    ...claims.map(claim => [
      `\\paragraph{${latex(claim.id)} (${latex(claim.researchQuestionIds.join(', '))}).}`,
      `${latex(claim.text)} ${latex(claim.interpretation)}`,
    ].join(' ')),
    '',
  ].join('\n\n');
}

function claimsTableTex(claims: QuantitativeClaim[]): string {
  const rows = claims.map(claim => [
    latexBreakableIdentifier(claim.id),
    latexBreakableIdentifier(claim.outcome.metricId),
    formatNumber(claim.estimate.value),
    `[${formatNumber(claim.estimate.confidenceInterval.lower)}, ${formatNumber(claim.estimate.confidenceInterval.upper)}]`,
    formatP(claim.estimate.adjustedPValue),
    latexBreakableIdentifier(claim.status),
  ].join(' & ') + ' \\\\');
  return [
    '% Generated from claims.json. Do not edit by hand.',
    '\\begingroup',
    '\\setlength{\\tabcolsep}{3pt}',
    '\\begin{longtable}{@{}p{0.10\\linewidth}p{0.18\\linewidth}p{0.10\\linewidth}p{0.18\\linewidth}p{0.10\\linewidth}p{0.22\\linewidth}@{}}',
    '\\toprule',
    'Claim & Outcome & Estimate & 95\\% CI & Adjusted $p$ & Status \\\\',
    '\\midrule',
    '\\endfirsthead',
    '\\toprule',
    'Claim & Outcome & Estimate & 95\\% CI & Adjusted $p$ & Status \\\\',
    '\\midrule',
    '\\endhead',
    ...rows,
    '\\bottomrule',
    '\\end{longtable}',
    '\\endgroup',
    '',
  ].join('\n');
}

function resultsMarkdown(
  campaign: CampaignManifest,
  experiments: JsonRecord[],
  claims: QuantitativeClaim[],
  mode: PublicationBundleMode,
): string {
  const heading = mode === 'publication'
    ? 'Core-confirmatory experiments'
    : mode === 'supporting'
      ? 'Supporting-exploratory robustness experiments'
      : 'Validation experiments';
  return [
    '# Verified Campaign Results',
    '',
    `Campaign: \`${campaign.campaignId}\``,
    '',
    `Git commit: \`${campaign.provenance.gitCommit}\``,
    '',
    `Runs: ${campaign.accounting.completed}/${campaign.accounting.expected}; failures: ${campaign.accounting.failed}.`,
    '',
    `## ${heading}`,
    '',
    ...experiments.map(experiment =>
      `- \`${String(experiment.experimentId)}\`: ${String(experiment.hypothesis)}`
    ),
    '',
    '## Auditable claims',
    '',
    ...claims.map(claim =>
      `- **${claim.id} — ${claim.status}.** ${claim.text} ${claim.interpretation}`
    ),
    '',
    'All statements above are model-conditional simulation findings. They are not direct causal estimates of real-world DAO behavior.',
    '',
  ].join('\n');
}

function pairedEffectsSvg(
  claims: QuantitativeClaim[],
  mode: PublicationBundleMode,
): string {
  const width = 960;
  const rowHeight = 34;
  const height = Math.max(160, 90 + claims.length * rowHeight);
  const values = claims.flatMap(claim => [
    claim.estimate.confidenceInterval.lower,
    claim.estimate.confidenceInterval.upper,
    0,
  ]);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const x = (value: number) => 360 + ((value - minimum) / (maximum - minimum || 1)) * 540;
  const rows = claims.map((claim, index) => {
    const y = 58 + index * rowHeight;
    const color = claim.status === 'supported-practically-important'
      ? '#047857'
      : claim.status === 'equivalent-within-declared-margin'
        ? '#2563eb'
        : claim.status === 'statistically-detectable-below-practical-threshold'
          ? '#b45309'
          : '#6b7280';
    return [
      `<text x="18" y="${y + 4}" font-size="12" font-family="sans-serif">${xml(claim.id)} · ${xml(claim.outcome.metricId)}</text>`,
      `<line x1="${x(claim.estimate.confidenceInterval.lower)}" x2="${x(claim.estimate.confidenceInterval.upper)}" y1="${y}" y2="${y}" stroke="${color}" stroke-width="2"/>`,
      `<circle cx="${x(claim.estimate.value)}" cy="${y}" r="4" fill="${color}"/>`,
    ].join('');
  }).join('');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">`,
    `<title id="title">${mode === 'publication' ? 'Core-confirmatory' : mode === 'supporting' ? 'Supporting-exploratory' : 'Validation'} paired effects</title>`,
    '<desc id="desc">Point estimates and 95 percent confidence intervals from the verified campaign claim registry. Supporting-exploratory effects are robustness evidence, not confirmatory tests.</desc>',
    '<rect width="100%" height="100%" fill="white"/>',
    `<line x1="${x(0)}" x2="${x(0)}" y1="30" y2="${height - 45}" stroke="#111827" stroke-dasharray="4 3" opacity="0.5"/>`,
    rows,
    `<text x="630" y="${height - 15}" text-anchor="middle" font-size="12" font-family="sans-serif">Paired mean difference</text>`,
    '</svg>',
    '',
  ].join('\n');
}

function csv(headers: string[], rows: unknown[][]): string {
  return [
    headers.map(csvValue).join(','),
    ...rows.map(row => row.map(csvValue).join(',')),
    '',
  ].join('\n');
}

function csvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function formatNumber(value: number): string {
  if (value !== 0 && Math.abs(value) < 0.001) return value.toExponential(2);
  return value.toFixed(3);
}

function formatP(value: number): string {
  return value < 0.001 ? '<0.001' : value.toFixed(3);
}

function latex(value: string): string {
  const escapes: Record<string, string> = {
    '\\': '\\textbackslash{}',
    '&': '\\&',
    '%': '\\%',
    '$': '\\$',
    '#': '\\#',
    _: '\\_',
    '{': '\\{',
    '}': '\\}',
    '~': '\\textasciitilde{}',
    '^': '\\textasciicircum{}',
  };
  return value.replace(/[\\&%$#_{}~^]/g, character => escapes[character]);
}

function latexBreakableIdentifier(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1\uE000$2')
    .split(/([-_:/.]|\uE000)/)
    .flatMap(part => /^[-_:/.]$/.test(part)
      ? [`${latex(part)}\\allowbreak{}`]
      : part === '\uE000'
        ? ['\\allowbreak{}']
        : part.match(/.{1,16}/g)?.map(chunk => `${latex(chunk)}\\allowbreak{}`) ?? [])
    .join('')
    .replace(/\\allowbreak\{\}$/, '');
}

function latexBreakableHash(value: string): string {
  return (value
    .match(/.{1,8}/g)
    ?.map(chunk => `${latex(chunk)}\\allowbreak{}`)
    .join('') ?? '')
    .replace(/\\allowbreak\{\}$/, '');
}

function xml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function writeTextAtomic(filePath: string, contents: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, contents, 'utf8');
  renameAtomicWithRetry(temporary, filePath);
}

function containedPath(root: string, relativePath: string): string {
  const absolute = path.resolve(root, relativePath);
  if (!absolute.startsWith(`${path.resolve(root)}${path.sep}`)) {
    throw new Error(`Path escapes publication boundary: ${relativePath}`);
  }
  return absolute;
}

function readJson<T>(filePath: string, label: string): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch (error) {
    throw new Error(`Invalid ${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function readJsonRecord(filePath: string, label: string): JsonRecord {
  const value = readJson<unknown>(filePath, label);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid ${label}: expected a JSON object`);
  }
  return value as JsonRecord;
}

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is JsonRecord =>
      item !== null && typeof item === 'object' && !Array.isArray(item)
    )
    : [];
}

function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

export function publicationBundleIdentity(manifest: PublicationBundleManifest): string {
  return sha256(canonicalJson(manifest));
}
