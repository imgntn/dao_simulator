import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { messages as m } from '@/lib/i18n';

const ROOT_DIR = process.cwd();
const RESULTS_DIR = path.join(ROOT_DIR, 'results');
const MAX_FILE_BYTES = 200_000;

function listResultFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => {
      const ext = path.extname(name).toLowerCase();
      return ['.md', '.json', '.csv', '.txt', '.log'].includes(ext);
    })
    .sort();
}

async function readFilePreview(filePath: string): Promise<{ content: string; truncated: boolean }> {
  const stats = fs.statSync(filePath);
  if (stats.size > MAX_FILE_BYTES) {
    const stream = fs.createReadStream(filePath, { encoding: 'utf8', start: 0, end: MAX_FILE_BYTES });
    let content = '';
    for await (const chunk of stream) {
      content += chunk;
    }
    return { content, truncated: true };
  }

  return { content: fs.readFileSync(filePath, 'utf8'), truncated: false };
}

function getParam(value: string | string[] | undefined): string {
  if (!value) return '';
  return Array.isArray(value) ? value[0] ?? '' : value;
}

export default async function ResultPage({
  params,
  searchParams,
}: {
  params: { name: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const resultDir = path.join(RESULTS_DIR, params.name);
  if (!fs.existsSync(resultDir)) {
    notFound();
  }

  const files = listResultFiles(resultDir);
  const requestedFile = getParam(searchParams?.file);
  const safeFile = requestedFile ? path.basename(requestedFile) : '';
  const fileExists = safeFile && files.includes(safeFile);
  const selectedFile = fileExists ? safeFile : '';

  let preview: { content: string; truncated: boolean } | null = null;
  if (selectedFile) {
    const filePath = path.join(resultDir, selectedFile);
    preview = await readFilePreview(filePath);
  }

  let statusSummary: Record<string, string> = {};
  const statusPath = path.join(resultDir, 'status.json');
  if (fs.existsSync(statusPath)) {
    try {
      const status = JSON.parse(fs.readFileSync(statusPath, 'utf8')) as {
        state?: string;
        lastUpdate?: string;
        startTime?: string;
        progress?: {
          completedRuns?: number;
          totalRuns?: number;
          percentComplete?: number;
        };
      };
      statusSummary = {
        state: status.state ?? 'unknown',
        lastUpdate: status.lastUpdate ?? 'unknown',
        startTime: status.startTime ?? 'unknown',
        progress: typeof status.progress?.percentComplete === 'number'
          ? `${status.progress.percentComplete.toFixed(1)}% (${status.progress.completedRuns ?? 0}/${status.progress.totalRuns ?? 0})`
          : 'unknown',
      };
    } catch {
      statusSummary = { state: 'invalid status.json' };
    }
  }

  return (
    <PageShell variant="console">
      <header className="space-y-2">
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/" className="text-[var(--accent-gold)] hover:text-[var(--accent-teal)]">
            {m.results?.backToAtlas ?? 'Back to atlas'}
          </Link>
          <Link href="/console" className="text-[var(--accent-teal)] hover:text-[var(--accent-teal-hover)]">
            {m.results?.backToConsole ?? 'Back to console'}
          </Link>
        </div>
        <h1 className="text-3xl font-semibold text-[var(--text-heading)]">
          {m.results?.heading ?? 'Results'}: {params.name}
        </h1>
      </header>

      <section className="mt-8 rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-4">
        <h2 className="text-lg font-semibold text-[var(--text-heading)]">
          {m.results?.status ?? 'Status'}
        </h2>
        {Object.keys(statusSummary).length === 0 ? (
          <p className="text-sm text-[var(--text-faint)]">
            {m.results?.noStatus ?? 'No status.json found.'}
          </p>
        ) : (
          <dl className="mt-3 grid gap-2 text-sm text-[var(--text-body-secondary)]">
            {Object.entries(statusSummary).map(([key, value]) => (
              <div key={key} className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="w-32 text-[var(--text-faint)] uppercase text-xs tracking-wide">{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-4 space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text-heading)]">
          {m.results?.files ?? 'Files'}
        </h2>
        {files.length === 0 ? (
          <p className="text-sm text-[var(--text-faint)]">
            {m.results?.noFiles ?? 'No files found.'}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {files.map((file) => (
              <Link
                key={file}
                href={`/results/${params.name}?file=${encodeURIComponent(file)}`}
                className={`px-3 py-1.5 rounded-md text-xs border ${
                  selectedFile === file
                    ? 'border-[var(--accent-teal)] text-[var(--accent-teal)] bg-[var(--surface-highlight)]'
                    : 'border-[var(--border-strong)] text-[var(--text-body-secondary)] hover:border-[var(--accent-teal)]'
                }`}
              >
                {file}
              </Link>
            ))}
          </div>
        )}

        {selectedFile && preview && (
          <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-warm-deep)] p-4">
            <div className="flex items-center justify-between text-xs text-[var(--text-faint)] mb-3">
              <span>{selectedFile}</span>
              {preview.truncated && (
                <span>
                  {m.results?.previewTruncated ?? 'Preview truncated at'} {MAX_FILE_BYTES} bytes
                </span>
              )}
            </div>
            <pre className="whitespace-pre-wrap text-sm text-[var(--text-body-secondary)]">
              {preview.content}
            </pre>
          </div>
        )}
      </section>
    </PageShell>
  );
}
