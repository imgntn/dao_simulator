import fs from 'fs';
import path from 'path';
import Link from 'next/link';

const ROOT_DIR = process.cwd();
const JAMES_SITE_URL = 'https://jamesbpollack.com';

type BriefSection = {
  id: string;
  title: string;
  question: string;
  whyItMatters: string;
  filePath: string;
  relatedPaperPath: string;
};

type PaperProfile = {
  id: 'paper' | 'paper_p1' | 'paper_p2' | 'paper_llm';
  label: string;
  description: string;
  directory: string;
  archivePrefix: string;
};

type ParsedBrief = {
  overview: string | null;
  takeaways: string[];
  notes: string[];
};

type CuratedBriefCopy = {
  summary: string;
  whatWeFound: string[];
  whatToDo: string[];
  evidence: string;
  confidence?: string;
};

const DECISION_BRIEF_SECTIONS: BriefSection[] = [
  {
    id: 'rq1',
    title: 'Participation Dynamics',
    question: 'How do we get more people to vote consistently?',
    whyItMatters: 'Healthy participation is the baseline for every other governance decision.',
    filePath: 'paper/plain-english/rq1-participation.md',
    relatedPaperPath: 'paper/rq1/main.pdf',
  },
  {
    id: 'rq2',
    title: 'Governance Capture Mitigation',
    question: 'How do we reduce whale control without freezing the DAO?',
    whyItMatters: 'Fairness and safety matter, but governance still has to ship decisions.',
    filePath: 'paper/plain-english/rq2-governance-capture.md',
    relatedPaperPath: 'paper/rq2/main.pdf',
  },
  {
    id: 'rq3',
    title: 'Proposal Pipeline Effects',
    question: 'How do we make proposals move faster without lowering quality?',
    whyItMatters: 'Slow governance burns momentum and increases operational risk.',
    filePath: 'paper/plain-english/rq3-proposal-pipeline.md',
    relatedPaperPath: 'paper/rq3/main.pdf',
  },
  {
    id: 'rq4',
    title: 'Treasury Resilience',
    question: 'How do we protect treasury health through volatility?',
    whyItMatters: 'Treasury policy drives long-term survival, growth, and strategic optionality.',
    filePath: 'paper/plain-english/rq4-treasury.md',
    relatedPaperPath: 'paper/rq4/main.pdf',
  },
  {
    id: 'rq5',
    title: 'Inter-DAO Cooperation',
    question: 'What kinds of cross-DAO coordination actually work?',
    whyItMatters: 'Ecosystem collaboration can unlock scale that single DAOs cannot reach alone.',
    filePath: 'paper/plain-english/rq5-cooperation.md',
    relatedPaperPath: 'paper/rq5/main.pdf',
  },
  {
    id: 'rq6',
    title: 'LLM Agent Reasoning',
    question: 'Where do LLMs help governance, and where do they add risk?',
    whyItMatters: 'AI governance is moving from theory to production, so evaluation quality is critical.',
    filePath: 'paper/plain-english/rq6-llm-agent-reasoning.md',
    relatedPaperPath: 'paper_llm/main.pdf',
  },
];

const CURATED_BRIEF_COPY: Record<string, CuratedBriefCopy> = {
  rq1: {
    summary:
      'Governance stalls when quorum targets exceed real turnout capacity. In the core sweep, turnout stayed near 22-23%, but quorum reach collapsed once quorum moved past ~10-15%.',
    whatWeFound: [
      'At 5% quorum, 99.9% of proposals reached quorum. At 20%, only 25.4% reached quorum. At 40%+, quorum reach fell to 0%.',
      'Pass rate among proposals that did reach quorum stayed high (97.6-98.5%), showing the bottleneck was threshold reach, not voter disagreement.',
      'As DAO size scaled from 50 to 500 members, participation fell (26.1% to 21.9%) but pass rate rose (92.8% to 99.7%).',
    ],
    whatToDo: [
      'Set quorum from observed behavior, not aspiration. A practical rule from the paper is ~80% of natural turnout.',
      'Use low-to-moderate quorum first (often around 4-5% in tested baselines), then adjust from data.',
      'Track fatigue and retention alongside pass rate, and use delegation before raising quorum.',
    ],
    evidence: 'Core paper RQ1 + scale analysis (Experiments 01, 03, 08).',
  },
  rq2: {
    summary:
      'Capture resistance improved most when power-distribution rules changed directly, not when only rate limits were added.',
    whatWeFound: [
      'A quadratic threshold of 250 cut whale influence from 0.449 to 0.256, a 43% reduction.',
      'Capture risk dropped from 0.464 to 0.269 in strong mitigation settings, a 42% reduction.',
      'Throughput improved rather than collapsed: pass rate moved from 92.7% to 98.5%. Velocity penalties alone were weak (small effects).',
    ],
    whatToDo: [
      'Use a layered stack: quadratic base + delegation caps + 30-60 day velocity controls.',
      'Prioritize mechanisms that reshape power distribution over activity-only throttles.',
      'Evaluate capture resistance and governance throughput together before deployment.',
    ],
    evidence: 'Core paper RQ2 mitigation sweep (Experiment 04) and comparative analysis.',
  },
  rq3: {
    summary:
      'Proposal flow improves with moderate filtering and selective fast-tracking. Extreme settings are where quality or speed starts to break.',
    whatWeFound: [
      'In Experiment 05, raising temp-check pressure from 0.05 to 0.50 lifted pass rate from 96.4% to 98.5%.',
      'Fast-track with a 12-step minimum kept quorum reach above 99% while accelerating obvious-consensus proposals.',
      'Core runs showed 47-50 proposals per 720-step cycle with zero abandonment; companion RQ3 analysis still flags very short expiry windows as risky for complex work.',
    ],
    whatToDo: [
      'Use moderate thresholds (roughly 20-30% temp-check and ~70% fast-track as a starting point).',
      'Keep default expiry windows near 60 days, with longer windows for complex proposals.',
      'Monitor false negatives, abandonment, and time-to-decision as a single operating set.',
    ],
    evidence: 'Core paper RQ3 pipeline experiments (Experiment 05).',
  },
  rq4: {
    summary:
      'Treasury resilience came from explicit policy discipline: stabilization, reserve buffers, spending limits, and clear emergency triggers.',
    whatWeFound: [
      'Stabilization reduced treasury volatility by about 50%: from roughly 0.448-0.500 down to 0.235-0.271.',
      'Reserve buffers and spending caps improved downside protection; stabilized runs landed around $10,048-$13,147 final treasury in tested settings.',
      'Lower volatility came with modest growth tradeoffs, so treasury policy needs continuous tuning rather than one-time setup.',
    ],
    whatToDo: [
      'Set explicit reserves (typically 15-20% in companion guidance) and define breach triggers.',
      'Apply spending limits aligned to burn rate (often 2-5% per period) with explicit emergency overrides.',
      'Trigger top-up or freeze controls when reserves fall below policy thresholds (e.g., 50% of target buffer).',
    ],
    evidence: 'Core paper RQ4 treasury resilience results (Experiment 06).',
  },
  rq5: {
    summary:
      'Cross-DAO coordination worked, but it was fragile. Outcomes improved when fairness, structure, and partner complementarity were designed upfront.',
    whatWeFound: [
      'Inter-DAO success rate was 21.4-23.4% across cooperation topologies versus 0% in isolated mode.',
      'Specialized topology generated more inter-DAO activity (75.8 vs 50.3 proposals) and higher ecosystem treasury ($26,107 vs $24,071).',
      'Cross-DAO alignment stayed moderate (0.534-0.557), which explains why fairness design and coordination structure mattered.',
    ],
    whatToDo: [
      'Define fairness explicitly before launch: cost split, value split, and dispute path.',
      'Use coordinator/hub patterns for multi-party collaborations where negotiation overhead is high.',
      'Build overlap and trust through recurring joint work and shared participant channels.',
    ],
    evidence: 'Core paper RQ5 cooperation experiments (Experiment 07).',
  },
  rq6: {
    summary:
      'LLM-enabled governance showed an engagement-latency tradeoff. Hybrid mode was the strongest default in the current benchmark.',
    whatWeFound: [
      'Hybrid and all-LLM both reached 0.50 pass rate, while the rule-based baseline was 0.00 in this short-horizon setup.',
      'All-LLM posted higher participation and consistency (0.3115 participation, 0.7474 consistency) than hybrid (0.1863, 0.6625).',
      'Hybrid reduced average latency to 807.98 ms versus 1,380.76 ms in all-LLM, with stronger treasury outcome in this run set.',
    ],
    whatToDo: [
      'Use hybrid reasoning as default, then escalate to deeper LLM reasoning only where needed.',
      'Track latency budgets, consistency drift, and cache performance as first-class governance metrics.',
      'Increase run budgets beyond the current 8-run benchmark before turning directional findings into hard policy.',
    ],
    evidence: 'LLM profile paper results/discussion (current benchmark: 8 runs).',
    confidence: 'Directional confidence only: the LLM profile currently uses a smaller run set than core governance experiments.',
  },
};

const PAPER_PROFILES: PaperProfile[] = [
  {
    id: 'paper',
    label: 'Core Governance Paper',
    description: 'Full synthesis across the complete research program.',
    directory: 'paper',
    archivePrefix: 'dao-governance-paper',
  },
  {
    id: 'paper_p1',
    label: 'Part I: Participation + Capture',
    description: 'Focus on fairness, participation quality, and anti-capture design.',
    directory: 'paper_p1',
    archivePrefix: 'dao-governance-paper_p1',
  },
  {
    id: 'paper_p2',
    label: 'Part II: Operations + Treasury',
    description: 'Focus on proposal flow, treasury resilience, and inter-DAO outcomes.',
    directory: 'paper_p2',
    archivePrefix: 'dao-governance-paper_p2',
  },
  {
    id: 'paper_llm',
    label: 'LLM Governance Paper',
    description: 'Dedicated analysis of LLM and hybrid governance modes.',
    directory: 'paper_llm',
    archivePrefix: 'dao-governance-paper_llm',
  },
];

function toPath(relativePath: string): string {
  return path.join(ROOT_DIR, ...relativePath.split('/'));
}

function readText(relativePath: string): string | null {
  const absolute = toPath(relativePath);
  if (!fs.existsSync(absolute)) return null;
  return fs.readFileSync(absolute, 'utf8');
}

function exists(relativePath: string): boolean {
  return fs.existsSync(toPath(relativePath));
}

function artifactHref(relativePath: string): string {
  return `/api/artifacts/${relativePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`;
}

function findLatestFile(relativeDir: string, matcher: RegExp): string | null {
  const absolute = toPath(relativeDir);
  if (!fs.existsSync(absolute)) return null;

  return (
    fs
      .readdirSync(absolute, { withFileTypes: true })
      .filter((entry) => entry.isFile() && matcher.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a))[0] ?? null
  );
}

function findLatestBundle(): string | null {
  const absolute = toPath('archive');
  if (!fs.existsSync(absolute)) return null;
  return (
    fs
      .readdirSync(absolute, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('paper-consolidated-'))
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a))[0] ?? null
  );
}

function countWords(markdown: string): number {
  return markdown.replace(/#|\*|_|`|\[|\]|\(|\)/g, ' ').split(/\s+/).filter(Boolean).length;
}

function collapseSection(lines: string[]): string {
  return lines.join('\n').trim();
}

function stripMarkdownInline(source: string): string {
  return source
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractListItems(sectionMarkdown: string): string[] {
  return sectionMarkdown
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, ''))
    .map(stripMarkdownInline)
    .filter(Boolean);
}

function parseBriefMarkdown(markdown: string): ParsedBrief {
  const sections: Record<string, string[]> = {};
  let currentHeading: string | null = null;

  for (const rawLine of markdown.replace(/\r\n/g, '\n').split('\n')) {
    const headingMatch = rawLine.match(/^##\s+(.*)$/);
    if (headingMatch) {
      currentHeading = headingMatch[1].trim().toLowerCase();
      sections[currentHeading] = sections[currentHeading] ?? [];
      continue;
    }

    if (currentHeading) {
      sections[currentHeading].push(rawLine);
    }
  }

  const overviewRaw = collapseSection(
    sections['the plain english version'] ?? sections['executive overview'] ?? []
  );
  const takeawaysRaw = collapseSection(sections['key takeaways'] ?? []);
  const notesRaw = collapseSection(sections['notes'] ?? []);

  return {
    overview: overviewRaw ? stripMarkdownInline(overviewRaw) : null,
    takeaways: extractListItems(takeawaysRaw),
    notes: extractListItems(notesRaw),
  };
}

function sectionLabel(id: string): string {
  return id.toUpperCase();
}

export default function Home() {
  const sections = DECISION_BRIEF_SECTIONS.map((section) => {
    const markdown = readText(section.filePath);
    const parsed = markdown ? parseBriefMarkdown(markdown) : { overview: null, takeaways: [], notes: [] };
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
    const currentPdf = exists(`${profile.directory}/main.pdf`) ? `${profile.directory}/main.pdf` : null;
    const currentTex = exists(`${profile.directory}/main.tex`) ? `${profile.directory}/main.tex` : null;
    const latestArchiveName = findLatestFile(
      `${profile.directory}/archive`,
      new RegExp(`^${profile.archivePrefix}.*\\.pdf$`)
    );

    return {
      ...profile,
      currentPdf,
      currentTex,
      latestArchive: latestArchiveName ? `${profile.directory}/archive/${latestArchiveName}` : null,
    };
  });

  const latestBundle = findLatestBundle();

  return (
    <div className="relative min-h-screen overflow-hidden text-[#1d2935]">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_10%_12%,rgba(244,201,122,0.33),transparent_38%),radial-gradient(circle_at_88%_18%,rgba(87,153,167,0.24),transparent_44%),linear-gradient(180deg,#fffef9_0%,#f5efe2_52%,#ebe4d6_100%)]" />
      <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        <header className="rounded-3xl border border-[#d8cab4] bg-white/90 p-7 shadow-[0_24px_70px_rgba(52,45,33,0.1)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#8f6f42]">DAO Research, Made Actionable</p>
          <h1 className="mt-3 max-w-4xl font-serif-display text-3xl leading-[1.08] text-[#1d1a14] sm:text-5xl">
            DAO Governance Outcomes Hub
          </h1>
          <p className="mt-5 max-w-3xl text-[1.04rem] leading-relaxed text-[#3f5163] sm:text-[1.15rem]">
            This site explains what the DAO simulations found in a clear, practical way. Start with the outcome
            snapshot, then open the full brief for any topic you care about.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#e7dbc8] bg-[#fff9ef] p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8d6f46]">What You Get</p>
              <p className="mt-2 text-sm leading-relaxed text-[#45586b]">Clear outcomes by topic, with less jargon and faster answers.</p>
            </div>
            <div className="rounded-2xl border border-[#e7dbc8] bg-[#fff9ef] p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8d6f46]">Why It Matters</p>
              <p className="mt-2 text-sm leading-relaxed text-[#45586b]">Governance choices affect speed, trust, and long-term resilience.</p>
            </div>
            <div className="rounded-2xl border border-[#e7dbc8] bg-[#fff9ef] p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8d6f46]">Built By</p>
              <p className="mt-2 text-sm leading-relaxed text-[#45586b]">
                Research direction and systems thinking by{' '}
                <a href={JAMES_SITE_URL} target="_blank" rel="noreferrer" className="text-[#1f7a8c] underline decoration-[#1f7a8c]/40 underline-offset-4 hover:text-[#165f6d]">
                  James B. Pollack
                </a>
                .
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#outcomes" className="rounded-full bg-[#1f7a8c] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(31,122,140,0.22)] transition hover:bg-[#166877]">Jump To Outcomes</a>
            <a href="#briefs" className="rounded-full border border-[#d6cab8] bg-[#f8f2e8] px-5 py-2.5 text-sm font-semibold text-[#4e5f71] transition hover:bg-[#efe6d6]">
              Read Decision Briefs
            </a>
            <a href={JAMES_SITE_URL} target="_blank" rel="noreferrer" className="rounded-full border border-[#cdbda8] bg-white px-5 py-2.5 text-sm font-semibold text-[#304457] transition hover:border-[#a88a64]">Visit JamesBPollack.com</a>
            <Link href="/console" className="rounded-full border border-[#d6cab8] bg-white px-5 py-2.5 text-sm font-semibold text-[#4e5f71] transition hover:bg-[#f6efe4]">
              Open Operations Console
            </Link>
          </div>
        </header>

        <section className="mt-9 rounded-3xl border border-[#d9ccb8] bg-white/88 p-7 sm:p-9">
          <h2 className="font-serif-display text-2xl text-[#1f1b14] sm:text-3xl">Start Here</h2>
          <p className="mt-4 max-w-3xl text-[1.03rem] leading-relaxed text-[#425466] sm:text-[1.1rem]">
            The core question is simple: which governance choices help DAOs work better in real life?
          </p>
          <p className="mt-3 max-w-3xl text-[1.03rem] leading-relaxed text-[#425466] sm:text-[1.1rem]">
            This page is written from the paper findings directly: the full governance study, RQ-specific papers, and
            the LLM governance profile.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#e8dbc7] bg-[#fff9ee] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c6040]">Decision Briefs</p>
              <p className="mt-2 text-sm text-[#4b6072]">{sections.length} briefs across participation, capture, operations, treasury, coordination, and LLM governance.</p>
            </div>
            <div className="rounded-2xl border border-[#e8dbc7] bg-[#fff9ee] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c6040]">Evidence Base</p>
              <p className="mt-2 text-sm text-[#4b6072]">Core governance paper reports 16,370 runs across 21 experiment configurations.</p>
            </div>
            <div className="rounded-2xl border border-[#e8dbc7] bg-[#fff9ee] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c6040]">Reading Path</p>
              <p className="mt-2 text-sm text-[#4b6072]">Snapshot first, action guidance second, Advanced section for raw metrics and source text.</p>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-[1.03rem] leading-relaxed text-[#425466] sm:text-[1.1rem]">
            If you want to discuss applications to your own governance context, see{' '}
            <a href={JAMES_SITE_URL} target="_blank" rel="noreferrer" className="text-[#1f7a8c] underline decoration-[#1f7a8c]/40 underline-offset-4 hover:text-[#165f6d]">
              jamesbpollack.com
            </a>
            .
          </p>
        </section>

        <section id="outcomes" className="mt-12 space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-serif-display text-2xl text-[#1f1b14] sm:text-3xl">Outcome Snapshot</h2>
            <p className="text-sm text-[#607284]">Fast scan across all questions</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {sections.map((section, index) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-full border border-[#d8c8b0] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.11em] text-[#405468] transition hover:border-[#b49567] hover:bg-[#fff4e4]"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {sectionLabel(section.id)} {section.title}
              </a>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sections.map((section, index) => (
              <article
                key={`${section.id}-snapshot`}
                className="animate-rise rounded-3xl border border-[#d9ccb9] bg-white/92 p-5 shadow-[0_14px_34px_rgba(38,33,25,0.08)]"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#8b6a3e]">
                  {sectionLabel(section.id)}
                </p>
                <h3 className="mt-2 text-lg font-semibold leading-tight text-[#1f2934]">{section.title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-[#2b5064]">{section.question}</p>
                <p className="mt-3 text-sm leading-relaxed text-[#496072]">{section.curated.summary}</p>
                <ul className="mt-3 space-y-2 text-sm text-[#44596c]">
                  {(section.curated.whatWeFound.length > 0
                    ? section.curated.whatWeFound.slice(0, 2)
                    : ['Open brief for outcome details.']).map((item, itemIndex) => (
                    <li key={`${section.id}-takeaway-${itemIndex}`} className="rounded-xl border border-[#e5d8c5] bg-[#fff9ef] px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
                <a href={`#${section.id}`} className="mt-4 inline-flex text-sm font-semibold text-[#1f7a8c] underline underline-offset-4">
                  Open full brief
                </a>
              </article>
            ))}
          </div>
        </section>

        <section id="briefs" className="mt-12 space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-serif-display text-2xl text-[#1f1b14] sm:text-3xl">Decision Briefs</h2>
            <p className="text-sm text-[#607284]">Mainstream view first. Raw metrics and source files are in Advanced.</p>
          </div>
          <div className="grid gap-5">
            {sections.map((section, index) => (
              <article
                key={section.id}
                id={section.id}
                className="animate-rise rounded-3xl border border-[#d9ccb9] bg-white/92 p-6 shadow-[0_14px_34px_rgba(38,33,25,0.08)] sm:p-8"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#8b6a3e]">
                      {sectionLabel(section.id)} Brief
                    </p>
                    <h3 className="mt-2 max-w-3xl text-2xl font-semibold leading-tight text-[#1f2934] sm:text-[1.95rem]">
                      {section.title}
                    </h3>
                    <p className="mt-4 max-w-3xl text-[1.04rem] font-medium leading-relaxed text-[#2b5064] sm:text-[1.1rem]">
                      {section.question}
                    </p>
                    <p className="mt-3 max-w-3xl text-[1.02rem] leading-relaxed text-[#495d70] sm:text-[1.08rem]">
                      {section.curated.summary}
                    </p>
                    <p className="mt-4 text-sm text-[#5c7083]">{section.curated.evidence}</p>
                    {section.curated.confidence && (
                      <p className="mt-2 rounded-lg border border-[#e8dcc8] bg-[#fff8ee] px-3 py-2 text-sm text-[#5a6d7d]">
                        <span className="font-semibold text-[#3d5568]">Confidence note:</span> {section.curated.confidence}
                      </p>
                    )}
                  </div>

                  <aside className="rounded-2xl border border-[#e5d7c2] bg-[#fff9ef] p-4 sm:p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[#7b5f3d]">What Results Showed</p>
                    {section.curated.whatWeFound.length > 0 ? (
                      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[#41566a]">
                        {section.curated.whatWeFound.map((takeaway, takeawayIndex) => (
                          <li key={`${section.id}-full-takeaway-${takeawayIndex}`} className="rounded-xl border border-[#eadcc8] bg-white px-3 py-2">
                            {takeaway}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-[#5e6f7d]">No extracted outcome points found for this brief.</p>
                    )}
                  </aside>
                </div>

                <p className="mt-5 max-w-3xl text-[1.01rem] leading-relaxed text-[#496072]">
                  <span className="font-semibold text-[#2f495d]">Why this matters:</span> {section.whyItMatters}
                </p>
                <div className="mt-4 rounded-2xl border border-[#e8dcc9] bg-[#fffbf4] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a5f3f]">What To Do</p>
                  <ul className="mt-2 space-y-2 text-sm leading-relaxed text-[#42586b]">
                    {section.curated.whatToDo.map((action, actionIndex) => (
                      <li key={`${section.id}-action-${actionIndex}`}>{action}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-3xl border border-[#d9ccb8] bg-white/88 p-7 sm:p-9">
          <h2 className="font-serif-display text-2xl text-[#1f1b14] sm:text-3xl">Why This Work Is Important</h2>
          <ul className="mt-4 max-w-3xl space-y-3 text-[1.03rem] leading-relaxed text-[#435567] sm:text-[1.08rem]">
            <li>It turns governance conversations from guesswork into testable choices.</li>
            <li>It helps teams improve participation, execution speed, and trust at the same time.</li>
            <li>It connects policy decisions to real outcomes leaders can track over time.</li>
          </ul>
          <p className="mt-4 max-w-3xl text-[1.03rem] leading-relaxed text-[#435567] sm:text-[1.08rem]">
            More writing and applied governance work is available at{' '}
            <a href={JAMES_SITE_URL} target="_blank" rel="noreferrer" className="text-[#1f7a8c] underline decoration-[#1f7a8c]/40 underline-offset-4 hover:text-[#165f6d]">
              jamesbpollack.com
            </a>
            .
          </p>
        </section>

        <section className="mt-12">
          <details id="advanced" className="rounded-3xl border border-[#d8ccb9] bg-[#fcf7ee] p-6 sm:p-7">
            <summary className="cursor-pointer select-none font-serif-display text-xl text-[#1f1b14] sm:text-2xl">
              Advanced Section
            </summary>
            <p className="mt-3 text-sm text-[#5f7080]">
              Use this section for raw metrics, source files, and full technical artifacts.
            </p>
            <p className="mt-2 text-sm text-[#5f7080]">
              Note: companion papers are living documents. The full synthesis paper and RQ papers currently contain the most complete numerical findings.
            </p>

            <div className="mt-5 rounded-2xl border border-[#dfd3c1] bg-white p-4">
              <h3 className="text-base font-semibold text-[#1f2b38]">Brief Source Files + Raw Metrics</h3>
              <p className="mt-1 text-sm text-[#5e6e7d]">Each item includes the original brief markdown and full metric notes.</p>
              <div className="mt-4 grid gap-3">
                {sections.map((section) => (
                  <article key={`${section.id}-advanced`} className="rounded-xl border border-[#e8dccb] bg-[#fffcf7] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#2a4154]">{sectionLabel(section.id)} {section.title}</p>
                      <span className="text-xs text-[#6a7d8f]">{section.words} words</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a className="hub-link" href={artifactHref(section.filePath)}>Source Brief Markdown</a>
                      {section.hasRelatedPaper && (
                        <a className="hub-link" href={artifactHref(section.relatedPaperPath)}>Related Paper PDF</a>
                      )}
                    </div>
                    {section.takeaways.length > 0 && (
                      <details className="mt-3 rounded-lg border border-[#eadfcd] bg-white p-3">
                        <summary className="cursor-pointer text-sm font-semibold text-[#30475a]">Raw Metric Takeaways</summary>
                        <ul className="mt-2 space-y-1.5 text-sm text-[#526678]">
                          {section.takeaways.map((takeaway, takeawayIndex) => (
                            <li key={`${section.id}-raw-${takeawayIndex}`}>{takeaway}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                    {section.notes.length > 0 && (
                      <details className="mt-2 rounded-lg border border-[#eadfcd] bg-white p-3">
                        <summary className="cursor-pointer text-sm font-semibold text-[#30475a]">Method Notes</summary>
                        <ul className="mt-2 space-y-1.5 text-sm text-[#526678]">
                          {section.notes.map((note, noteIndex) => (
                            <li key={`${section.id}-advanced-note-${noteIndex}`}>{note}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {paperCards.map((paper) => (
                <article key={paper.id} className="rounded-2xl border border-[#dfd3c1] bg-white p-4">
                  <h3 className="text-lg font-semibold text-[#1f2b38]">{paper.label}</h3>
                  <p className="mt-1 text-sm text-[#5e6e7d]">{paper.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {paper.currentPdf && <a className="hub-link" href={artifactHref(paper.currentPdf)}>Current PDF</a>}
                    {paper.currentTex && <a className="hub-link" href={artifactHref(paper.currentTex)}>Current TeX</a>}
                    {paper.latestArchive && <a className="hub-link" href={artifactHref(paper.latestArchive)}>Latest Archived PDF</a>}
                  </div>
                </article>
              ))}
            </div>

            {latestBundle && (
              <div className="mt-5 rounded-2xl border border-[#dfd3c1] bg-white p-4">
                <p className="text-sm text-[#5c6c7c]">
                  Latest consolidated bundle: <span className="font-semibold text-[#263342]">{latestBundle}</span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a className="hub-link" href={artifactHref(`archive/${latestBundle}/INDEX.md`)}>Bundle Index</a>
                  <a className="hub-link" href={artifactHref(`archive/${latestBundle}/pdf/full.pdf`)}>Full PDF</a>
                  <a className="hub-link" href={artifactHref(`archive/${latestBundle}/pdf/p1.pdf`)}>P1 PDF</a>
                  <a className="hub-link" href={artifactHref(`archive/${latestBundle}/pdf/p2.pdf`)}>P2 PDF</a>
                  <a className="hub-link" href={artifactHref(`archive/${latestBundle}/pdf/llm.pdf`)}>LLM PDF</a>
                </div>
              </div>
            )}
          </details>
        </section>

        <footer className="mt-14 border-t border-[#d8ccb8] pt-7 text-sm leading-relaxed text-[#5f7387]">
          <p>
            DAO Research Atlas by{' '}
            <a href={JAMES_SITE_URL} target="_blank" rel="noreferrer" className="text-[#1f7a8c] underline decoration-[#1f7a8c]/40 underline-offset-4 hover:text-[#165f6d]">
              James B. Pollack
            </a>
            .
          </p>
          <p className="mt-1">Operational tools remain available in the in-repo <Link className="underline underline-offset-4" href="/console">console</Link>.</p>
        </footer>
      </div>
    </div>
  );
}
