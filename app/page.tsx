import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ROOT_DIR = process.cwd();
const JAMES_SITE_URL = 'https://jamesbpollack.com';

type PlainEnglishSection = {
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

const PLAIN_ENGLISH_SECTIONS: PlainEnglishSection[] = [
  {
    id: 'rq1',
    title: 'Participation Dynamics',
    question: 'How do we get more people to vote consistently?',
    whyItMatters: 'Healthy participation is the baseline for every other governance decision.',
    filePath: 'paper/plain-english/rq1-participation.md',
    relatedPaperPath: 'paper_p1/main.pdf',
  },
  {
    id: 'rq2',
    title: 'Governance Capture Mitigation',
    question: 'How do we reduce whale control without freezing the DAO?',
    whyItMatters: 'Fairness and safety matter, but governance still has to ship decisions.',
    filePath: 'paper/plain-english/rq2-governance-capture.md',
    relatedPaperPath: 'paper_p1/main.pdf',
  },
  {
    id: 'rq3',
    title: 'Proposal Pipeline Effects',
    question: 'How do we make proposals move faster without lowering quality?',
    whyItMatters: 'Slow governance burns momentum and increases operational risk.',
    filePath: 'paper/plain-english/rq3-proposal-pipeline.md',
    relatedPaperPath: 'paper_p2/main.pdf',
  },
  {
    id: 'rq4',
    title: 'Treasury Resilience',
    question: 'How do we protect treasury health through volatility?',
    whyItMatters: 'Treasury policy drives long-term survival, growth, and strategic optionality.',
    filePath: 'paper/plain-english/rq4-treasury.md',
    relatedPaperPath: 'paper_p2/main.pdf',
  },
  {
    id: 'rq5',
    title: 'Inter-DAO Cooperation',
    question: 'What kinds of cross-DAO coordination actually work?',
    whyItMatters: 'Ecosystem collaboration can unlock scale that single DAOs cannot reach alone.',
    filePath: 'paper/plain-english/rq5-cooperation.md',
    relatedPaperPath: 'paper_p2/main.pdf',
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

export default function Home() {
  const executiveOverview = readText('paper/plain-english/00-main-paper.md');
  const sections = PLAIN_ENGLISH_SECTIONS.map((section) => {
    const markdown = readText(section.filePath);
    return {
      ...section,
      markdown,
      words: markdown ? countWords(markdown) : 0,
      hasRelatedPaper: exists(section.relatedPaperPath),
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
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#8f6f42]">DAO Research, Made Readable</p>
          <h1 className="mt-3 max-w-4xl font-serif-display text-3xl leading-[1.08] text-[#1d1a14] sm:text-5xl">
            Plain-English Research Hub For DAO Governance
          </h1>
          <p className="mt-5 max-w-3xl text-[1.04rem] leading-relaxed text-[#3f5163] sm:text-[1.15rem]">
            This site is designed for operators, founders, policy teams, and investors who want clear answers without
            digging through technical jargon. Start with the plain-English summaries, then open full papers only if you
            want the underlying technical depth.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#e7dbc8] bg-[#fff9ef] p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8d6f46]">Executive Focus</p>
              <p className="mt-2 text-sm leading-relaxed text-[#45586b]">What changes improve governance quality and execution speed in the real world.</p>
            </div>
            <div className="rounded-2xl border border-[#e7dbc8] bg-[#fff9ef] p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8d6f46]">Why It Matters</p>
              <p className="mt-2 text-sm leading-relaxed text-[#45586b]">Governance is now business-critical infrastructure, not just community process.</p>
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
            <a href="#summaries" className="rounded-full bg-[#1f7a8c] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(31,122,140,0.22)] transition hover:bg-[#166877]">Read Plain-English Summaries</a>
            <a href={JAMES_SITE_URL} target="_blank" rel="noreferrer" className="rounded-full border border-[#cdbda8] bg-white px-5 py-2.5 text-sm font-semibold text-[#304457] transition hover:border-[#a88a64]">Visit JamesBPollack.com</a>
            <Link href="/console" className="rounded-full border border-[#d6cab8] bg-[#f8f2e8] px-5 py-2.5 text-sm font-semibold text-[#4e5f71] transition hover:bg-[#efe6d6]">
              Open Operations Console
            </Link>
          </div>
        </header>

        <section className="mt-9 rounded-3xl border border-[#d9ccb8] bg-white/88 p-7 sm:p-9">
          <h2 className="font-serif-display text-2xl text-[#1f1b14] sm:text-3xl">Executive Summary</h2>
          <p className="mt-4 max-w-3xl text-[1.03rem] leading-relaxed text-[#425466] sm:text-[1.1rem]">
            The research asks a practical question: what governance configurations actually work when DAOs face scale,
            concentration risk, operational bottlenecks, treasury stress, and AI-driven decision-making?
          </p>
          <p className="mt-3 max-w-3xl text-[1.03rem] leading-relaxed text-[#425466] sm:text-[1.1rem]">
            The plain-English papers below translate simulation evidence into strategy-level guidance. They are meant to
            support clearer board conversations, policy design, and implementation priorities.
          </p>
          <p className="mt-3 max-w-3xl text-[1.03rem] leading-relaxed text-[#425466] sm:text-[1.1rem]">
            If you want to discuss applications to your own governance context, see{' '}
            <a href={JAMES_SITE_URL} target="_blank" rel="noreferrer" className="text-[#1f7a8c] underline decoration-[#1f7a8c]/40 underline-offset-4 hover:text-[#165f6d]">
              jamesbpollack.com
            </a>
            .
          </p>

          {executiveOverview && (
            <div className="markdown-surface mt-7 rounded-2xl border border-[#eadfcd] bg-[#fffaf2] p-5 sm:p-7">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{executiveOverview}</ReactMarkdown>
            </div>
          )}
        </section>

        <section id="summaries" className="mt-12 space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-serif-display text-2xl text-[#1f1b14] sm:text-3xl">Plain-English Summaries</h2>
            <p className="text-sm text-[#607284]">Primary reading path: {sections.length} summaries</p>
          </div>

          <div className="grid gap-5">
            {sections.map((section, index) => (
              <article
                key={section.id}
                className="animate-rise rounded-3xl border border-[#d9ccb9] bg-white/92 p-6 shadow-[0_14px_34px_rgba(38,33,25,0.08)] sm:p-8"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#8b6a3e]">
                  {section.id.toUpperCase()} Summary
                </p>
                <h3 className="mt-2 max-w-3xl text-2xl font-semibold leading-tight text-[#1f2934] sm:text-[1.95rem]">{section.title}</h3>
                <p className="mt-4 max-w-3xl text-[1.04rem] font-medium leading-relaxed text-[#2b5064] sm:text-[1.1rem]">{section.question}</p>
                <p className="mt-2 max-w-3xl text-[1.02rem] leading-relaxed text-[#495d70] sm:text-[1.08rem]">{section.whyItMatters}</p>

                <div className="mt-5 flex flex-wrap gap-2.5">
                  <a className="hub-link" href={artifactHref(section.filePath)}>Open Markdown File</a>
                  {section.hasRelatedPaper && <a className="hub-link" href={artifactHref(section.relatedPaperPath)}>Open Related Paper PDF</a>}
                  <a className="hub-link" href={JAMES_SITE_URL} target="_blank" rel="noreferrer">Connect via JamesBPollack.com</a>
                  <span className="rounded-full border border-[#dbcdb8] bg-[#faf4e8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.11em] text-[#7c6341]">
                    {section.words} words
                  </span>
                </div>

                <div className="markdown-surface mt-6 rounded-2xl border border-[#eadfcd] bg-[#fffbf5] p-5 sm:p-7">
                  {section.markdown ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.markdown}</ReactMarkdown>
                  ) : (
                    <p>Summary file not found at `{section.filePath}`.</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-3xl border border-[#d9ccb8] bg-white/88 p-7 sm:p-9">
          <h2 className="font-serif-display text-2xl text-[#1f1b14] sm:text-3xl">Why This Work Is Important</h2>
          <ul className="mt-4 max-w-3xl space-y-3 text-[1.03rem] leading-relaxed text-[#435567] sm:text-[1.08rem]">
            <li>It turns governance from opinion-driven debate into evidence-informed decision design.</li>
            <li>It helps teams balance participation, speed, fairness, and resilience instead of optimizing one metric in isolation.</li>
            <li>It creates a practical bridge between policy choices and measurable operational outcomes.</li>
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
          <details className="rounded-3xl border border-[#d8ccb9] bg-[#fcf7ee] p-6 sm:p-7">
            <summary className="cursor-pointer select-none font-serif-display text-xl text-[#1f1b14] sm:text-2xl">
              Technical Appendix (Optional)
            </summary>
            <p className="mt-3 text-sm text-[#5f7080]">Use this only when you want full technical artifacts and source materials.</p>

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
