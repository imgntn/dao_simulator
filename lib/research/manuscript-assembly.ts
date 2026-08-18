import * as fs from 'node:fs';
import * as path from 'node:path';
import sharp from 'sharp';
import {
  canonicalJson,
  sha256,
  sha256File,
  writeJsonAtomic,
} from './campaign-manifest';
import {
  publicationBundleIdentity,
  verifyPublicationBundle,
  type PublicationBundleManifest,
} from './publication-artifacts';
import type { ClaimRegistry, QuantitativeClaim } from './claim-registry';

export const MANUSCRIPT_PACKAGE_SCHEMA_VERSION = '1.0.0';

interface AssembleManuscriptOptions {
  coreBundleDir: string;
  supportingBundleDir: string;
  outputDir: string;
  referencesPath: string;
}

interface ManuscriptFile {
  path: string;
  bytes: number;
  sha256: string;
}

export interface ManuscriptPackageManifest {
  schemaVersion: string;
  generatedAt: string;
  sourceBundles: {
    core: {
      campaignId: string;
      bundleIdentitySha256: string;
      campaignIdentitySha256: string;
      runCount: number;
    };
    supporting: {
      campaignId: string;
      bundleIdentitySha256: string;
      campaignIdentitySha256: string;
      runCount: number;
    };
  };
  claimIds: string[];
  files: ManuscriptFile[];
  identitySha256: string;
}

const REQUIRED_BUNDLE_FILES = [
  'claims.json',
  'fragments/methods.tex',
  'fragments/results.tex',
  'fragments/results-table.tex',
  'fragments/reproducibility-table.tex',
] as const;

const FORBIDDEN_MANUSCRIPT_MARKERS = [
  '[PLACEHOLDER:',
  'STALE DRAFT',
  '\\placeholder',
  '\\autogen',
  '\\pl{',
  ['TO', 'DO'].join(''),
  ['FIX', 'ME'].join(''),
] as const;

export async function assembleManuscript(
  options: AssembleManuscriptOptions,
): Promise<ManuscriptPackageManifest> {
  const coreDir = path.resolve(options.coreBundleDir);
  const supportingDir = path.resolve(options.supportingBundleDir);
  const outputDir = path.resolve(options.outputDir);
  const referencesPath = path.resolve(options.referencesPath);
  assertEmptyOutput(outputDir);

  const core = loadBundle(coreDir, 'publication', 'core-confirmatory');
  const supporting = loadBundle(
    supportingDir,
    'supporting',
    'supporting-exploratory',
  );
  if (!fs.existsSync(referencesPath)) {
    throw new Error(`References file does not exist: ${referencesPath}`);
  }
  const coreClaims = loadClaims(coreDir, core);
  const supportingClaims = loadClaims(supportingDir, supporting);

  fs.mkdirSync(outputDir, { recursive: true });
  copyBundle(coreDir, path.join(outputDir, 'evidence', 'core'));
  copyBundle(supportingDir, path.join(outputDir, 'evidence', 'supporting'));
  fs.copyFileSync(referencesPath, path.join(outputDir, 'references.bib'));

  await renderFigure(
    path.join(coreDir, 'figures', 'paired-effects.svg'),
    path.join(outputDir, 'figures', 'core-paired-effects.png'),
  );
  await renderFigure(
    path.join(coreDir, 'figures', 'calibration-holdout.svg'),
    path.join(outputDir, 'figures', 'calibration-holdout.png'),
  );
  await renderFigure(
    path.join(supportingDir, 'figures', 'paired-effects.svg'),
    path.join(outputDir, 'figures', 'supporting-paired-effects.png'),
  );

  writeText(path.join(outputDir, 'main.tex'), mainTex());
  writeText(
    path.join(outputDir, 'sections', 'abstract.tex'),
    abstractTex(core, supporting, coreClaims, supportingClaims),
  );
  writeText(path.join(outputDir, 'sections', 'introduction.tex'), introductionTex());
  writeText(path.join(outputDir, 'sections', 'methods.tex'), methodsTex());
  writeText(
    path.join(outputDir, 'sections', 'discussion.tex'),
    discussionTex(coreClaims, supportingClaims),
  );
  writeText(path.join(outputDir, 'sections', 'limitations.tex'), limitationsTex());
  writeText(path.join(outputDir, 'sections', 'conclusion.tex'), conclusionTex());
  writeText(
    path.join(outputDir, 'README.md'),
    packageReadme(core, supporting),
  );

  assertNoForbiddenMarkers(outputDir);
  const files = listFiles(outputDir)
    .filter(file => file !== 'manuscript-manifest.json')
    .map(relativePath => {
      const absolutePath = path.join(outputDir, relativePath);
      return {
        path: relativePath,
        bytes: fs.statSync(absolutePath).size,
        sha256: sha256File(absolutePath),
      };
    });
  const identityPayload = {
    schemaVersion: MANUSCRIPT_PACKAGE_SCHEMA_VERSION,
    sourceBundles: {
      core: sourceBundleRecord(core),
      supporting: sourceBundleRecord(supporting),
    },
    claimIds: [...coreClaims.claims, ...supportingClaims.claims]
      .map(claim => claim.id)
      .sort(),
    files,
  };
  const manifest: ManuscriptPackageManifest = {
    ...identityPayload,
    generatedAt: [core.generatedAt, supporting.generatedAt].sort().at(-1)!,
    identitySha256: sha256(canonicalJson(identityPayload)),
  };
  writeJsonAtomic(path.join(outputDir, 'manuscript-manifest.json'), manifest);
  const errors = verifyManuscriptPackage(outputDir);
  if (errors.length > 0) {
    throw new Error(`Manuscript package verification failed: ${errors.join('; ')}`);
  }
  return manifest;
}

export function verifyManuscriptPackage(outputDirValue: string): string[] {
  const outputDir = path.resolve(outputDirValue);
  const manifestPath = path.join(outputDir, 'manuscript-manifest.json');
  if (!fs.existsSync(manifestPath)) return ['Missing manuscript-manifest.json'];
  let manifest: ManuscriptPackageManifest;
  try {
    manifest = JSON.parse(
      fs.readFileSync(manifestPath, 'utf8'),
    ) as ManuscriptPackageManifest;
  } catch {
    return ['Invalid manuscript-manifest.json'];
  }
  const errors: string[] = [];
  if (manifest.schemaVersion !== MANUSCRIPT_PACKAGE_SCHEMA_VERSION) {
    errors.push(`Unsupported manuscript schema: ${manifest.schemaVersion}`);
  }
  const seen = new Set<string>();
  for (const file of manifest.files ?? []) {
    if (seen.has(file.path)) errors.push(`Duplicate manuscript file: ${file.path}`);
    seen.add(file.path);
    const absolutePath = containedPath(outputDir, file.path);
    if (!fs.existsSync(absolutePath)) {
      errors.push(`Missing manuscript file: ${file.path}`);
      continue;
    }
    if (fs.statSync(absolutePath).size !== file.bytes) {
      errors.push(`Manuscript file size mismatch: ${file.path}`);
    }
    if (sha256File(absolutePath) !== file.sha256) {
      errors.push(`Manuscript file hash mismatch: ${file.path}`);
    }
  }
  const actualFiles = listFiles(outputDir)
    .filter(file => file !== 'manuscript-manifest.json');
  const expectedFiles = new Set((manifest.files ?? []).map(file => file.path));
  for (const file of actualFiles) {
    if (!expectedFiles.has(file)) errors.push(`Unindexed manuscript file: ${file}`);
  }
  const identityPayload = {
    schemaVersion: manifest.schemaVersion,
    sourceBundles: manifest.sourceBundles,
    claimIds: manifest.claimIds,
    files: manifest.files,
  };
  if (sha256(canonicalJson(identityPayload)) !== manifest.identitySha256) {
    errors.push('Manuscript package identity mismatch');
  }
  try {
    assertNoForbiddenMarkers(outputDir);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return errors;
}

function loadBundle(
  bundleDir: string,
  mode: 'publication' | 'supporting',
  role: 'core-confirmatory' | 'supporting-exploratory',
): PublicationBundleManifest {
  const errors = verifyPublicationBundle(bundleDir);
  if (errors.length > 0) {
    throw new Error(`Invalid ${mode} bundle: ${errors.join('; ')}`);
  }
  const manifest = JSON.parse(
    fs.readFileSync(path.join(bundleDir, 'publication-manifest.json'), 'utf8'),
  ) as PublicationBundleManifest;
  if (manifest.scope.mode !== mode || manifest.scope.publicationRole !== role) {
    throw new Error(
      `Expected ${mode}/${role} bundle, found `
      + `${manifest.scope.mode}/${manifest.scope.publicationRole}`,
    );
  }
  for (const file of REQUIRED_BUNDLE_FILES) {
    if (!manifest.files.some(candidate => candidate.path === file)) {
      throw new Error(`${mode} bundle is missing required file: ${file}`);
    }
  }
  return manifest;
}

function loadClaims(
  bundleDir: string,
  manifest: PublicationBundleManifest,
): ClaimRegistry {
  const registry = JSON.parse(
    fs.readFileSync(path.join(bundleDir, 'claims.json'), 'utf8'),
  ) as ClaimRegistry;
  const expected = new Set(manifest.scope.claimIds);
  const actual = new Set(registry.claims.map(claim => claim.id));
  if (
    expected.size !== actual.size
    || [...expected].some(claimId => !actual.has(claimId))
  ) {
    throw new Error(`Bundled claim set differs from ${manifest.campaignId} manifest scope`);
  }
  return registry;
}

function sourceBundleRecord(manifest: PublicationBundleManifest) {
  return {
    campaignId: manifest.campaignId,
    bundleIdentitySha256: publicationBundleIdentity(manifest),
    campaignIdentitySha256: manifest.sourceCampaign.identitySha256,
    runCount: manifest.sourceCampaign.runCount,
  };
}

function copyBundle(sourceDir: string, destinationDir: string): void {
  fs.cpSync(sourceDir, destinationDir, {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
}

async function renderFigure(sourcePath: string, destinationPath: string): Promise<void> {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Publication figure is missing: ${sourcePath}`);
  }
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  await sharp(sourcePath, { density: 180 })
    .flatten({ background: '#ffffff' })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(destinationPath);
}

function abstractTex(
  core: PublicationBundleManifest,
  supporting: PublicationBundleManifest,
  coreRegistry: ClaimRegistry,
  supportingRegistry: ClaimRegistry,
): string {
  const coreCounts = statusCounts(coreRegistry.claims);
  const supportingCounts = statusCounts(supportingRegistry.claims);
  const headlines = oneClaimPerExperiment(coreRegistry.claims, 4)
    .map(claim => latexText(claim.text));
  return [
    'Decentralized autonomous organization (DAO) mechanism choices are difficult to compare from observational records because deployed rules, communities, and market conditions co-vary.',
    `We present a reproducible multi-agent counterfactual workflow and evaluate predeclared governance questions using ${core.sourceCampaign.runCount} core simulation runs plus ${supporting.sourceCampaign.runCount} supporting robustness runs.`,
    `The core registry contains ${coreRegistry.claims.length} audited contrast${coreRegistry.claims.length === 1 ? '' : 's'}: ${coreCounts.important} practically important, ${coreCounts.equivalent} equivalent within a declared margin, and ${coreCounts.inconclusive} inconclusive.`,
    ...headlines,
    `The supporting registry contains ${supportingRegistry.claims.length} contrast${supportingRegistry.claims.length === 1 ? '' : 's'} (${supportingCounts.important} practically important, ${supportingCounts.equivalent} equivalent, and ${supportingCounts.inconclusive} inconclusive).`,
    'Temporal holdout calibration is reported per DAO against historical-persistence and uncalibrated-simulation comparators.',
    'All conclusions are model-conditional comparative findings, not direct causal estimates of deployed DAO behavior.',
    '',
  ].join(' ');
}

function oneClaimPerExperiment(
  claims: QuantitativeClaim[],
  limit: number,
): QuantitativeClaim[] {
  const rank = (claim: QuantitativeClaim) =>
    claim.status === 'supported-practically-important'
      ? 0
      : claim.status === 'equivalent-within-declared-margin'
        ? 1
        : 2;
  const ordered = [...claims].sort(
    (left, right) => rank(left) - rank(right) || left.id.localeCompare(right.id),
  );
  const seen = new Set<string>();
  return ordered.filter(claim => {
    if (seen.has(claim.experimentId)) return false;
    seen.add(claim.experimentId);
    return true;
  }).slice(0, limit);
}

function statusCounts(claims: QuantitativeClaim[]) {
  return {
    important: claims.filter(
      claim => claim.status === 'supported-practically-important',
    ).length,
    equivalent: claims.filter(
      claim => claim.status === 'equivalent-within-declared-margin',
    ).length,
    inconclusive: claims.filter(claim =>
      claim.status !== 'supported-practically-important'
      && claim.status !== 'equivalent-within-declared-margin'
    ).length,
  };
}

function mainTex(): string {
  return String.raw`\documentclass[11pt]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage{lmodern}
\usepackage[margin=1in]{geometry}
\usepackage{microtype}
\usepackage{graphicx}
\usepackage{booktabs}
\usepackage{longtable}
\usepackage{enumitem}
\usepackage{natbib}
\usepackage[hidelinks]{hyperref}
\title{Model-Conditional Counterfactual Analysis of DAO Governance Mechanisms\\
\large A Reproducible Multi-Agent Simulation Study}
\author{James Pollack\\Independent Researcher\\\texttt{james@jamesbpollack.com}}
\date{}
\begin{document}
\maketitle
\begin{abstract}
\input{sections/abstract}
\end{abstract}
\noindent\textbf{Keywords:} decentralized autonomous organizations; agent-based modeling; governance; mechanism design; reproducibility
\section{Introduction}
\input{sections/introduction}
\section{Methods}
\input{sections/methods}
\section{Core confirmatory results}
\input{evidence/core/fragments/results}
\input{evidence/core/fragments/results-table}
\begin{figure}[htbp]
\centering
\includegraphics[width=\linewidth]{figures/core-paired-effects.png}
\caption{Core paired effects and 95\% confidence intervals generated from the verified claim registry.}
\label{fig:core-effects}
\end{figure}
\section{Supporting robustness studies}
\input{evidence/supporting/fragments/methods}
\input{evidence/supporting/fragments/results}
\input{evidence/supporting/fragments/results-table}
\begin{figure}[htbp]
\centering
\includegraphics[width=\linewidth]{figures/supporting-paired-effects.png}
\caption{Supporting-exploratory robustness effects. These estimates do not replace the core endpoints.}
\label{fig:supporting-effects}
\end{figure}
\section{Held-out calibration}
\input{evidence/core/fragments/calibration}
\begin{figure}[htbp]
\centering
\includegraphics[width=\linewidth]{figures/calibration-holdout.png}
\caption{Per-DAO temporal-holdout similarity for calibrated, persistence, and uncalibrated comparators.}
\label{fig:calibration}
\end{figure}
\section{Discussion}
\input{sections/discussion}
\section{Limitations}
\input{sections/limitations}
\section{Conclusion}
\input{sections/conclusion}
\section*{Data and code availability}
The release package contains frozen configurations, metric definitions, verified manifests, checksummed derived artifacts, and reproduction commands. Restricted historical source material is described by a source ledger and derivation instructions rather than redistributed without confirmed rights.
\bibliographystyle{plainnat}
\bibliography{references}
\appendix
\section{Core reproducibility manifest}
\input{evidence/core/fragments/reproducibility-table}
\section{Supporting-study reproducibility manifest}
\input{evidence/supporting/fragments/reproducibility-table}
\end{document}
`;
}

function introductionTex(): string {
  return String.raw`DAO governance rules determine who can propose, vote, delegate, and deploy shared resources. Observational comparisons of deployed DAOs cannot by themselves isolate mechanism effects because governance rules are selected rather than randomized and evolve with community and market conditions. Agent-based simulation can complement observation by holding a model and random seed block fixed while changing a declared mechanism, but only if the model, estimand, uncertainty, and provenance are explicit.

This study contributes a deterministic campaign and analysis workflow for model-conditional DAO governance comparisons. Four predeclared mechanism families address quorum and participation, capture mitigation, proposal-pipeline design, and treasury resilience. Separate supporting studies examine horizon, protocol-yield, learning-agent, forum-layer, and delegation-depth assumptions. Every numerical statement in the results is generated from an immutable run index and an audited claim registry.

The contribution is methodological and comparative. The simulator is not treated as a universal predictor of DAO behavior. Historical conditioning is evaluated on a chronological holdout and compared with simple null models; heterogeneous or negative cases are retained. This framing follows the broader use of agent-based computational economics for controlled generative experiments \citep{tesfatsion2006handbook} and connects to work on computational social choice and governance mechanism design \citep{brandt2016handbook,nisan2007algorithmic}.`;
}

function methodsTex(): string {
  return String.raw`\subsection{Simulation clock and economic assumptions}
One simulation step represents one hour: 24 steps are one day and 8,760 steps are a 365-day year. Declared annual treasury yields are converted to per-step compound rates using that time basis. Proposal durations, recovery times, horizons, and rate metrics use the same clock.

\subsection{Experimental design}
Conditions within an experiment use common random numbers: replicate index $i$ receives the same fixed seed in every condition. Paired contrasts therefore estimate within-seed differences. The campaign generator records the exact resolved configuration, condition identity, replicate index, seed, code commit, dependency lock, validation input, calibration input, runtime, and content hash for every run. Factorial studies use categorical reference coding, declared interactions, HC3 robust uncertainty, and the registered comparison correction.

\subsection{Decision rules}
Practical importance and equivalence are evaluated against margins frozen in the experiment metadata. A contrast is called practically important only when its full confidence interval lies beyond the margin on one side. It is called equivalent only when its full interval lies inside the margin. Other outcomes are reported as inconclusive even when a point estimate or unadjusted test appears favorable. Multiplicity correction is applied within each declared comparison family.

\subsection{Calibration and interpretation}
Historically conditioned DAO profiles use chronological training and holdout periods. Held-out similarity is reported per DAO against historical persistence and an uncalibrated simulator. These diagnostics assess generative fidelity under declared metrics; they do not validate individual agent psychology or identify real-world causal effects.

\subsection{Artifact custody}
Campaign directories are append-only during execution and verified before use. Independent finalization reanalyzes the source campaign in a fresh process, creates a read-only copy, reanalyzes that copy, and compares scientific and publication-bundle identities. The manuscript consumes only those verified bundles.`;
}

function discussionTex(
  coreClaims: ClaimRegistry,
  supportingClaims: ClaimRegistry,
): string {
  const core = statusCounts(coreClaims.claims);
  const supporting = statusCounts(supportingClaims.claims);
  return [
    `The core evidence contains ${core.important} practically important, ${core.equivalent} equivalent, and ${core.inconclusive} inconclusive registered contrasts.`,
    `The supporting studies contain ${supporting.important} practically important, ${supporting.equivalent} equivalent, and ${supporting.inconclusive} inconclusive contrasts.`,
    'This classification prevents statistical detectability from being presented as substantive importance and prevents an uncertain null estimate from being presented as equivalence.',
    '',
    'Mechanism recommendations should therefore be read as comparisons within the frozen simulator and population assumptions. A result that is stable across the supporting studies is less dependent on those particular assumptions, but it still does not establish transportability to a deployed DAO. Conversely, an inconclusive or assumption-sensitive result is retained as a boundary on what this model can support.',
    '',
    'The per-DAO holdout comparison further limits the scope of inference. Calibration skill is heterogeneous, so the appropriate claim is that the framework supports auditable mechanistic and generative experiments—not that it forecasts every DAO better than simple baselines.',
    '',
  ].join('\n');
}

function limitationsTex(): string {
  return String.raw`The results inherit the simulator's behavioral rules, population construction, proposal process, market oracle, and parameter ranges. Agent archetypes are computational abstractions rather than empirically identified human types. Common random numbers improve precision for modeled counterfactuals but do not remove model misspecification.

Historical governance and forum observations are incomplete proxies for off-chain coordination. Temporal holdout evaluation reduces leakage but does not eliminate selection bias, measurement error, regime change, or dependence among DAO observations. Aggregate similarity scores depend on the registered metric weights, and negative per-DAO comparisons are part of the result.

The factorial models estimate effects over the frozen design region and should not be extrapolated beyond it. Finite horizons can suppress slow feedback, while learning and deliberation mechanisms remain simplified. Supporting studies diagnose several of these choices but cannot exhaust the model space.

No LLM-agent result is included in the confirmatory evidence. LLM execution would introduce provider availability, model-version, decoding, and cache provenance requirements and is therefore reserved for a separately labeled exploratory campaign when a frozen provider is available.

Finally, simulation comparisons do not justify claims that a mechanism will cause the same effect in a deployed DAO. External validation requires prospective or quasi-experimental evidence and careful attention to implementation details, strategic adaptation, and community context.`;
}

function conclusionTex(): string {
  return String.raw`This work provides a publication-oriented workflow for DAO governance simulation in which designs are frozen before final runs, raw outputs are immutable and checksummed, statistical decisions use declared practical margins, negative cases remain visible, and manuscript values are generated from audited claims. The resulting evidence supports transparent model-conditional comparison of governance mechanisms while making the limits of calibration and external validity explicit.

The broader contribution is a reproducible bridge between interactive mechanism exploration and defensible computational evidence. The same frozen analysis artifacts drive the paper and the Evidence workbench, allowing readers to move from a claim to its estimand, uncertainty, condition definitions, seeds, source runs, and hashes.`;
}

function packageReadme(
  core: PublicationBundleManifest,
  supporting: PublicationBundleManifest,
): string {
  return [
    '# Verified manuscript source package',
    '',
    `Core campaign: \`${core.campaignId}\``,
    '',
    `Supporting campaign: \`${supporting.campaignId}\``,
    '',
    'The manuscript is assembled from verified publication bundles. Numerical text in the abstract, results, tables, and figures is generated from bundled claim registries.',
    '',
    'Compile from this directory with:',
    '',
    '```bash',
    'pdflatex -interaction=nonstopmode main.tex',
    'bibtex main',
    'pdflatex -interaction=nonstopmode main.tex',
    'pdflatex -interaction=nonstopmode main.tex',
    '```',
    '',
  ].join('\n');
}

function latexText(value: string): string {
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

function assertNoForbiddenMarkers(outputDir: string): void {
  for (const relativePath of listFiles(outputDir)) {
    if (!/\.(?:tex|md|json|csv|bib)$/i.test(relativePath)) continue;
    const contents = fs.readFileSync(path.join(outputDir, relativePath), 'utf8');
    const marker = FORBIDDEN_MANUSCRIPT_MARKERS.find(value => contents.includes(value));
    if (marker) {
      throw new Error(`Forbidden manuscript marker "${marker}" in ${relativePath}`);
    }
  }
}

function assertEmptyOutput(outputDir: string): void {
  if (fs.existsSync(outputDir) && fs.readdirSync(outputDir).length > 0) {
    throw new Error(`Manuscript output directory is not empty: ${outputDir}`);
  }
}

function writeText(filePath: string, contents: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents.endsWith('\n') ? contents : `${contents}\n`, 'utf8');
}

function listFiles(root: string): string[] {
  const output: string[] = [];
  const pending = [root];
  while (pending.length > 0) {
    const directory = pending.pop()!;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) pending.push(absolutePath);
      else if (entry.isFile()) output.push(path.relative(root, absolutePath).replaceAll(path.sep, '/'));
    }
  }
  return output.sort((left, right) => left.localeCompare(right));
}

function containedPath(root: string, relativePath: string): string {
  const absolutePath = path.resolve(root, relativePath);
  if (!absolutePath.startsWith(`${path.resolve(root)}${path.sep}`)) {
    throw new Error(`Manuscript path escapes package: ${relativePath}`);
  }
  return absolutePath;
}
