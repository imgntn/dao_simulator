import type { ReactNode } from 'react';
import {
  DECISION_BRIEF_SECTIONS,
  CURATED_BRIEF_COPY,
  PAPER_PROFILES,
  JAMES_SITE_URL,
  CALIBRATION_SCORES,
} from '@/lib/atlas/content';
import {
  readText,
  exists,
  artifactHref,
  findLatestFile,
  findLatestBundle,
  countWords,
  parseBriefMarkdown,
  sectionLabel,
} from '@/lib/atlas/parsers';
import { getMessages, isValidLocale, defaultLocale } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { PageShell } from '@/components/layout/PageShell';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { InfoCard } from '@/components/ui/InfoCard';
import { TableOfContents } from '@/components/atlas/TableOfContents';
import { BriefDetail } from '@/components/atlas/BriefDetail';
import { PaperCard } from '@/components/atlas/PaperCard';
import { generateResearchProjectJsonLd } from '@/lib/atlas/structured-data';
import { StickyNav } from '@/components/atlas/StickyNav';
import { CollapsibleBrief } from '@/components/atlas/CollapsibleBrief';
import { QuorumReachChart } from '@/components/atlas/infographics/QuorumReachChart';
import { WhaleInfluenceChart } from '@/components/atlas/infographics/WhaleInfluenceChart';
import { PipelineFlowChart } from '@/components/atlas/infographics/PipelineFlowChart';
import { TreasuryVolatilityChart } from '@/components/atlas/infographics/TreasuryVolatilityChart';
import { CooperationChart } from '@/components/atlas/infographics/CooperationChart';
import { LLMComparisonChart } from '@/components/atlas/infographics/LLMComparisonChart';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : defaultLocale;
  const m = getMessages(locale);
  // ---------------------------------------------------------------------------
  // Data preparation
  // ---------------------------------------------------------------------------
  const sections = DECISION_BRIEF_SECTIONS.map((section) => {
    const markdown = readText(section.filePath);
    const parsed = markdown
      ? parseBriefMarkdown(markdown)
      : { overview: null, takeaways: [], notes: [] };
    const curated = CURATED_BRIEF_COPY[section.id] ?? {
      summary: section.whyItMatters,
      whatWeFound: [{ headline: 'Details Available', detail: 'Detailed findings are available in the linked papers.' }],
      whatToDo: ['Review the full brief and apply recommendations to your governance context.'],
      evidence: 'Source paper available in Advanced section.',
    };

    return {
      ...section,
      markdown,
      words: markdown ? countWords(markdown) : 0,
      hasRelatedPaper: exists(section.relatedPaperPath),
      overview: parsed.overview ?? curated.summary,
      takeaways: parsed.takeaways,
      notes: parsed.notes,
      curated,
    };
  });

  const paperCards = PAPER_PROFILES.map((profile) => {
    const currentPdf = exists(`${profile.directory}/main.pdf`)
      ? `${profile.directory}/main.pdf`
      : null;
    const currentTex = exists(`${profile.directory}/main.tex`)
      ? `${profile.directory}/main.tex`
      : null;
    const latestArchiveName = findLatestFile(
      `${profile.directory}/archive`,
      new RegExp(`^${profile.archivePrefix}.*\\.pdf$`)
    );

    return {
      ...profile,
      currentPdf,
      currentTex,
      latestArchive: latestArchiveName
        ? `${profile.directory}/archive/${latestArchiveName}`
        : null,
    };
  });

  const latestBundle = findLatestBundle();
  const tocItems = sections.map((s) => ({
    id: s.id,
    label: sectionLabel(s.id),
    title: s.title,
  }));

  const infographics: Record<string, ReactNode> = {
    rq1: <QuorumReachChart />,
    rq2: <WhaleInfluenceChart />,
    rq3: <PipelineFlowChart />,
    rq4: <TreasuryVolatilityChart />,
    rq5: <CooperationChart />,
    rq6: <LLMComparisonChart />,
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <PageShell locale={locale}>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: generateResearchProjectJsonLd(locale) }}
      />

      <StickyNav sections={[
        { id: 'podcast', label: 'Podcast' },
        { id: 'digital-twins', label: 'Digital Twins' },
        { id: 'why', label: 'Why It Matters' },
        { id: 'charts', label: 'Charts' },
        { id: 'research', label: 'Research' },
        { id: 'papers', label: 'Papers' },
        { id: 'advanced', label: 'Advanced' },
      ]} />

      {/* ── Hero ── */}
      <header className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-7 shadow-[var(--shadow-header)] sm:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
          {/* Left: text content */}
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--accent-gold)]">
              {m.atlas?.tagline ?? 'DAO Research, Made Actionable'}
            </p>
            <h1 className="mt-3 max-w-4xl font-serif-display text-4xl leading-[1.08] text-[var(--text-heading)] sm:text-6xl">
              {m.atlas?.heroTitle ?? 'DAO Research Atlas'}
            </h1>
            <p className="mt-5 max-w-3xl text-[1.12rem] leading-relaxed text-[var(--text-body)] sm:text-[1.25rem]">
              {m.atlas?.heroDescription ??
                'Actionable governance findings from 16,370 simulation runs across 21 experiment configurations. Start with any research question below.'}
            </p>
            <p className="mt-3 max-w-3xl text-[1rem] leading-relaxed text-[var(--text-body-secondary)] sm:text-[1.08rem]">
              {m.atlas?.podcastDesc ??
                'James Pollack joined the Green Pill podcast to explore whether a DAO can be run by AI \u2014 the dynamics of agent-based models, what it looks like to put governance on-chain, and the research that became this atlas.'}
            </p>
          </div>

          {/* Right: hero chart + stat counters */}
          <div className="flex shrink-0 flex-col items-center gap-4 lg:w-[280px]">
            <div className="chart-gallery-item w-full rounded-2xl border border-[var(--border-subtle)] bg-white p-4">
              <QuorumReachChart />
            </div>
            <div className="grid w-full grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-[var(--surface-warm)] p-2">
                <p className="text-lg font-bold text-[var(--accent-teal)]">16,370</p>
                <p className="text-[0.6rem] uppercase tracking-wide text-[var(--text-muted)]">Runs</p>
              </div>
              <div className="rounded-xl bg-[var(--surface-warm)] p-2">
                <p className="text-lg font-bold text-[var(--accent-teal)]">14</p>
                <p className="text-[0.6rem] uppercase tracking-wide text-[var(--text-muted)]">DAOs</p>
              </div>
              <div className="rounded-xl bg-[var(--surface-warm)] p-2">
                <p className="text-lg font-bold text-[var(--accent-gold)]">6</p>
                <p className="text-[0.6rem] uppercase tracking-wide text-[var(--text-muted)]">Briefs</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <InfoCard label={m.atlas?.briefsLabel ?? 'Decision Briefs'}>
            {sections.length} {m.atlas?.briefsCount ?? 'briefs covering participation, capture, operations, treasury, coordination, and LLM governance.'}
          </InfoCard>
          <InfoCard label={m.atlas?.evidenceLabel ?? 'Evidence Base'}>
            {m.atlas?.evidenceDesc ?? 'Core governance paper reports 16,370 runs across 21 experiment configurations.'}
          </InfoCard>
          <InfoCard label={m.atlas?.authorLabel ?? 'Author'}>
            {m.atlas?.authorDesc ?? 'Research direction and systems thinking by'}{' '}
            <a
              href={JAMES_SITE_URL}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--accent-teal)] underline decoration-[var(--accent-teal)]/40 underline-offset-4 hover:text-[var(--accent-teal-hover)]"
            >
              James B. Pollack
            </a>
            .
          </InfoCard>
        </div>

        {/* Page table of contents */}
        <nav aria-label="Page sections" className="mt-8 flex flex-wrap gap-2">
          <a href="#podcast" className="rounded-full border border-[var(--border-default)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-body)] transition hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)]">
            {m.atlas?.podcastListen ?? 'Podcast'}
          </a>
          <a href="#digital-twins" className="rounded-full border border-[var(--border-default)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-body)] transition hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)]">
            Digital Twins
          </a>
          <a href="#why" className="rounded-full border border-[var(--border-default)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-body)] transition hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)]">
            Why This Matters
          </a>
          <a href="#charts" className="rounded-full border border-[var(--border-default)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-body)] transition hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)]">
            Charts
          </a>
          <a href="#research" className="rounded-full border border-[var(--border-default)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-body)] transition hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)]">
            Research
          </a>
          <a href="#papers" className="rounded-full border border-[var(--border-default)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-body)] transition hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)]">
            Papers
          </a>
          <a href="#advanced" className="rounded-full border border-[var(--border-default)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-body)] transition hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)]">
            Advanced
          </a>
        </nav>
      </header>

      {/* ── Podcast ── */}
      <section id="podcast" aria-labelledby="podcast-heading" className="mt-10 rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-7 sm:p-9">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-8">
          {/* Podcast icon */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-warm-deep)]">
            <svg className="h-8 w-8 text-[var(--accent-gold)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>
          </div>

          <div className="flex-1">
            <h2 id="podcast-heading" className="font-serif-display text-2xl text-[var(--text-heading)] sm:text-3xl">
              {m.atlas?.podcastHeading ?? 'Hear the Story Behind the Research'}
            </h2>
            <p className="mt-3 max-w-3xl text-[1.05rem] leading-relaxed text-[var(--text-body)] sm:text-[1.12rem]">
              {m.atlas?.podcastEpisode ?? 'Green Pill #123: AI DAO Simulator'}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="https://podcasts.apple.com/us/podcast/123-ai-dao-simulator-w-james-pollack/id1609313639?i=1000617149760"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--text-heading)] shadow-sm transition hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Zm3.436 14.58c-.18.3-.563.4-.862.22-.013-.007-1.484-.906-1.484-.906-.234-.144-.384-.394-.384-.663V9.5a.75.75 0 0 1 1.5 0v4.972l1.01.623a.64.64 0 0 1 .22.865v-.001ZM12 6.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
                </svg>
                {m.atlas?.podcastApple ?? 'Apple Podcasts'}
              </a>
              <a
                href="https://open.spotify.com/show/0l6aXWC94dd0RA3tkKfxjd"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--text-heading)] shadow-sm transition hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Zm4.586 14.424a.622.622 0 0 1-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.623.623 0 0 1-.277-1.215c3.81-.87 7.077-.496 9.713 1.115a.623.623 0 0 1 .206.857Zm1.224-2.719a.78.78 0 0 1-1.072.257c-2.687-1.652-6.786-2.13-9.965-1.166a.78.78 0 0 1-.452-1.493c3.632-1.102 8.147-.568 11.232 1.33a.78.78 0 0 1 .257 1.072Zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71a.935.935 0 0 1-.542-1.79c3.533-1.072 9.404-.865 13.115 1.338a.935.935 0 0 1-1.045 1.553l.09.06Z" />
                </svg>
                {m.atlas?.podcastSpotify ?? 'Spotify'}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Digital Twins ── */}
      <section id="digital-twins" aria-labelledby="digital-twins-heading" className="mt-10 rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-7 sm:p-9">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-8">
          {/* Icon */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-warm-deep)]">
            <svg className="h-8 w-8 text-[var(--accent-teal)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          </div>

          <div className="flex-1">
            <h2 id="digital-twins-heading" className="font-serif-display text-2xl text-[var(--text-heading)] sm:text-3xl">
              {m.atlas?.digitalTwinsHeading ?? 'Digital Twins: 14 Real DAOs, Simulated'}
            </h2>
            <p className="mt-3 max-w-3xl text-[1.05rem] leading-relaxed text-[var(--text-body)] sm:text-[1.12rem]">
              {m.atlas?.digitalTwinsDesc ?? 'Every simulation is grounded in reality. We built digital twins of 14 major DAOs \u2014 each one calibrated against real on-chain governance data, Snapshot votes, forum activity, and token prices.'}
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-teal)]">What</p>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-body-secondary)]">
                  {m.atlas?.digitalTwinsWhat ?? 'Each twin captures a DAO\u2019s actual governance stack: quorum thresholds, voting periods, proposal pipelines, treasury mechanics, and member archetypes.'}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-gold)]">How</p>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-body-secondary)]">
                  {m.atlas?.digitalTwinsHow ?? 'Historical calibration profiles compiled from on-chain data drive agent behavior, proposal frequency, participation rates, and pass rates. Calibration scores average 0.85 across all 14 DAOs.'}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-heading)]">Why</p>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-body-secondary)]">
                  {m.atlas?.digitalTwinsWhy ?? 'Digital twins let researchers test counterfactual governance changes without risking real treasuries.'}
                </p>
              </div>
            </div>

            {/* DAO logos / names grid */}
            <div className="mt-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-warm-deep)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                {m.atlas?.digitalTwinsCategories ?? 'DeFi, Layer 2, Public Goods, Staking, Lending, Identity, Stablecoin, DEX'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(m.atlas?.digitalTwinsDaos ?? 'Uniswap, Compound, Aave, Arbitrum, Optimism, ENS, Lido, Gitcoin, MakerDAO, Curve, Nouns, Balancer, dYdX, SushiSwap').split(', ').map((dao) => {
                  const score = CALIBRATION_SCORES[dao];
                  return (
                    <span
                      key={dao}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--text-heading)]"
                      title={score ? `Calibration score: ${score.toFixed(3)}` : undefined}
                    >
                      {dao}
                      {score != null && (
                        <span className={`rounded px-1 py-0.5 text-[0.65rem] font-bold ${
                          score >= 0.88 ? 'bg-[var(--accent-teal)]/15 text-[var(--accent-teal)]'
                            : score >= 0.85 ? 'bg-[var(--accent-gold)]/15 text-[var(--accent-gold)]'
                            : 'bg-[var(--border-subtle)] text-[var(--text-muted)]'
                        }`}>
                          {(score * 100).toFixed(0)}
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why This Work Is Important ── */}
      <section id="why" aria-labelledby="why-heading" className="mt-10 rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-7 sm:p-9">
        <h2 id="why-heading" className="font-serif-display text-2xl text-[var(--text-heading)] sm:text-3xl">
          {m.atlas?.methodologyHeading ?? 'Why This Work Is Important'}
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <a href="#rq1" className="group rounded-2xl border border-[var(--border-warm)] bg-[var(--surface-warm)] p-5 transition hover:border-[var(--accent-teal)] hover:shadow-md">
            <p className="font-serif-display text-3xl font-bold text-[var(--accent-teal)] sm:text-4xl">99%&rarr;0%</p>
            <p className="mt-2 text-sm font-semibold text-[var(--text-heading)] group-hover:text-[var(--accent-teal)]">Quorum Cliff</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-body-secondary)]">
              A 5-point quorum change swings proposal passage from near-certain to impossible. This research turns hidden cliffs into visible, testable choices.
            </p>
          </a>
          <a href="#rq2" className="group rounded-2xl border border-[var(--border-warm)] bg-[var(--surface-warm)] p-5 transition hover:border-[var(--accent-teal)] hover:shadow-md">
            <p className="font-serif-display text-3xl font-bold text-[var(--accent-teal)] sm:text-4xl">43%</p>
            <p className="mt-2 text-sm font-semibold text-[var(--text-heading)] group-hover:text-[var(--accent-teal)]">Whale Power Cut</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-body-secondary)]">
              Quadratic voting cut whale influence by 43% without slowing governance. The right mechanisms improve fairness and throughput at the same time.
            </p>
          </a>
          <a href="#rq4" className="group rounded-2xl border border-[var(--border-warm)] bg-[var(--surface-warm)] p-5 transition hover:border-[var(--accent-teal)] hover:shadow-md">
            <p className="font-serif-display text-3xl font-bold text-[var(--accent-gold)] sm:text-4xl">16,370</p>
            <p className="mt-2 text-sm font-semibold text-[var(--text-heading)] group-hover:text-[var(--accent-teal)]">Simulation Runs</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-body-secondary)]">
              Every finding links a specific policy lever to a measurable outcome, so teams can track what actually changes before deploying to production.
            </p>
          </a>
        </div>
      </section>

      {/* ── Chart Gallery ── */}
      <section id="charts" aria-labelledby="charts-heading" className="mt-12 space-y-6">
        <SectionHeading
          id="charts-heading"
          title="Results at a Glance"
          subtitle="Key findings from each research question — click any chart to jump to the full brief"
        />
        <div className="grid gap-5 sm:grid-cols-2">
          {sections.map((section) => {
            const chart = infographics[section.id];
            if (!chart) return null;
            const headline = section.curated.whatWeFound[0]?.headline;
            return (
              <a
                key={`gallery-${section.id}`}
                href={`#${section.id}`}
                className="chart-gallery-item group rounded-2xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-5 shadow-sm transition hover:border-[var(--accent-teal)] hover:shadow-md"
              >
                <div className="pointer-events-none">{chart}</div>
                <p className="mt-3 text-center text-sm font-semibold text-[var(--text-heading)] group-hover:text-[var(--accent-teal)]">
                  {sectionLabel(section.id)}: {section.title}
                </p>
                {headline && (
                  <p className="mt-1 text-center text-xs text-[var(--text-muted)]">
                    {headline}
                  </p>
                )}
              </a>
            );
          })}
        </div>
      </section>

      {/* ── Research ── */}
      <section id="research" aria-labelledby="research-heading" className="mt-12 space-y-6">
        <SectionHeading
          id="research-heading"
          title={m.atlas?.researchHeading ?? 'Research'}
          subtitle={m.atlas?.researchSubtitle ?? 'Decision briefs across all research questions'}
        />
        <TableOfContents items={tocItems} />

        <div className="grid gap-5">
          {sections.map((section, index) => (
            <CollapsibleBrief
              key={section.id}
              id={section.id}
              label={sectionLabel(section.id)}
              title={section.title}
            >
              <BriefDetail
                id={section.id}
                label={sectionLabel(section.id)}
                title={section.title}
                question={section.question}
                whyItMatters={section.whyItMatters}
                curated={section.curated}
                index={index}
                infographic={infographics[section.id]}
                locale={locale}
              />
            </CollapsibleBrief>
          ))}
        </div>
      </section>

      {/* ── Papers ── */}
      <section id="papers" aria-labelledby="papers-heading" className="mt-12 space-y-6">
        <SectionHeading
          id="papers-heading"
          title={m.atlas?.papersHeading ?? 'Papers'}
          subtitle={m.atlas?.papersSubtitle ?? 'Download full research papers and archives'}
        />

        <div className="grid gap-4 md:grid-cols-2">
          {paperCards.map((paper) => (
            <PaperCard
              key={paper.id}
              label={paper.label}
              description={paper.description}
              currentPdf={paper.currentPdf}
              currentTex={paper.currentTex}
              latestArchive={paper.latestArchive}
              locale={locale}
            />
          ))}
        </div>

        {latestBundle && (
          <div className="rounded-2xl border border-[var(--border-default)] bg-white p-4">
            <p className="text-sm text-[var(--text-muted)]">
              Latest consolidated bundle:{' '}
              <span className="font-semibold text-[var(--text-heading)]">{latestBundle}</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a className="hub-link" href={artifactHref(`archive/${latestBundle}/INDEX.md`)}>
                Bundle Index
              </a>
              <a className="hub-link" href={artifactHref(`archive/${latestBundle}/pdf/full.pdf`)}>
                Full PDF
              </a>
              <a className="hub-link" href={artifactHref(`archive/${latestBundle}/pdf/p1.pdf`)}>
                P1 PDF
              </a>
              <a className="hub-link" href={artifactHref(`archive/${latestBundle}/pdf/p2.pdf`)}>
                P2 PDF
              </a>
              <a className="hub-link" href={artifactHref(`archive/${latestBundle}/pdf/llm.pdf`)}>
                LLM PDF
              </a>
            </div>
          </div>
        )}
      </section>

      {/* ── Advanced ── */}
      <section id="advanced" aria-labelledby="advanced-heading" className="mt-12">
        <details className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-highlight)] p-6 sm:p-7">
          <summary className="cursor-pointer select-none font-serif-display text-xl text-[var(--text-heading)] sm:text-2xl">
            {m.atlas?.advancedHeading ?? 'Advanced Section'}
          </summary>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {m.atlas?.advancedDesc ?? 'Raw metrics, source files, and full technical artifacts.'}
          </p>

          <div className="mt-5 rounded-2xl border border-[var(--border-warm)] bg-white p-4">
            <h3 className="text-base font-semibold text-[var(--text-heading)]">
              {m.atlas?.briefSourceFiles ?? 'Brief Source Files + Raw Metrics'}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Each item includes the original brief markdown and full metric notes.
            </p>
            <div className="mt-4 grid gap-3">
              {sections.map((section) => (
                <article
                  key={`${section.id}-advanced`}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-warm-deep)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--text-heading)]">
                      {sectionLabel(section.id)} {section.title}
                    </p>
                    <span className="text-xs text-[var(--text-faint)]">
                      {section.words} {m.atlas?.wordsCount ?? 'words'}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a className="hub-link" href={artifactHref(section.filePath)}>
                      {m.atlas?.sourceBriefMarkdown ?? 'Source Brief Markdown'}
                    </a>
                    {section.hasRelatedPaper && (
                      <a className="hub-link" href={artifactHref(section.relatedPaperPath)}>
                        {m.atlas?.relatedPaperPdf ?? 'Related Paper PDF'}
                      </a>
                    )}
                  </div>
                  {section.takeaways.length > 0 && (
                    <details className="mt-3 rounded-lg border border-[var(--border-subtle)] bg-white p-3">
                      <summary className="cursor-pointer text-sm font-semibold text-[var(--text-heading)]">
                        {m.atlas?.rawMetricTakeaways ?? 'Raw Metric Takeaways'}
                      </summary>
                      <ul className="mt-2 space-y-1.5 text-sm text-[var(--text-body-secondary)]">
                        {section.takeaways.map((takeaway, i) => (
                          <li key={`${section.id}-raw-${i}`}>{takeaway}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {section.notes.length > 0 && (
                    <details className="mt-2 rounded-lg border border-[var(--border-subtle)] bg-white p-3">
                      <summary className="cursor-pointer text-sm font-semibold text-[var(--text-heading)]">
                        {m.atlas?.methodNotes ?? 'Method Notes'}
                      </summary>
                      <ul className="mt-2 space-y-1.5 text-sm text-[var(--text-body-secondary)]">
                        {section.notes.map((note, i) => (
                          <li key={`${section.id}-note-${i}`}>{note}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </article>
              ))}
            </div>
          </div>
        </details>
      </section>
    </PageShell>
  );
}
