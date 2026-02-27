import {
  DECISION_BRIEF_SECTIONS,
  CURATED_BRIEF_COPY,
  PAPER_PROFILES,
  JAMES_SITE_URL,
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
import { messages as m } from '@/lib/i18n';
import { PageShell } from '@/components/layout/PageShell';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { InfoCard } from '@/components/ui/InfoCard';
import { TableOfContents } from '@/components/atlas/TableOfContents';
import { BriefDetail } from '@/components/atlas/BriefDetail';
import { PaperCard } from '@/components/atlas/PaperCard';
import { generateResearchProjectJsonLd } from '@/lib/atlas/structured-data';

export default function Home() {
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
      whatWeFound: ['Detailed findings are available in the linked papers.'],
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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <PageShell>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: generateResearchProjectJsonLd() }}
      />

      {/* ── Hero ── */}
      <header className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-7 shadow-[var(--shadow-header)] sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--accent-gold)]">
          {m.atlas?.tagline ?? 'DAO Research, Made Actionable'}
        </p>
        <h1 className="mt-3 max-w-4xl font-serif-display text-3xl leading-[1.08] text-[var(--text-heading)] sm:text-5xl">
          {m.atlas?.heroTitle ?? 'DAO Research Atlas'}
        </h1>
        <p className="mt-5 max-w-3xl text-[1.04rem] leading-relaxed text-[var(--text-body)] sm:text-[1.15rem]">
          {m.atlas?.heroDescription ??
            'Actionable governance findings from 16,370 simulation runs across 21 experiment configurations. Start with any research question below.'}
        </p>

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

        <div className="mt-7">
          <a
            href="#research"
            className="rounded-full bg-[var(--accent-teal)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-button)] transition hover:bg-[var(--accent-teal-hover)]"
          >
            {m.atlas?.heroCta ?? 'Explore Research'}
          </a>
        </div>
      </header>

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
            <BriefDetail
              key={section.id}
              id={section.id}
              label={sectionLabel(section.id)}
              title={section.title}
              question={section.question}
              whyItMatters={section.whyItMatters}
              curated={section.curated}
              index={index}
            />
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

      {/* ── Methodology ── */}
      <section id="methodology" aria-labelledby="methodology-heading" className="mt-12 rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-7 sm:p-9">
        <h2 id="methodology-heading" className="font-serif-display text-2xl text-[var(--text-heading)] sm:text-3xl">
          {m.atlas?.methodologyHeading ?? 'Why This Work Is Important'}
        </h2>
        <ul className="mt-4 max-w-3xl space-y-3 text-[1.03rem] leading-relaxed text-[var(--text-body)] sm:text-[1.08rem]">
          <li>It turns governance conversations from guesswork into testable choices.</li>
          <li>It helps teams improve participation, execution speed, and trust at the same time.</li>
          <li>It connects policy decisions to real outcomes leaders can track over time.</li>
        </ul>
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
