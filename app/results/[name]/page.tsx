import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { notFound } from 'next/navigation';

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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <header className="space-y-2">
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/" className="text-amber-300 hover:text-amber-200">Back to narrative hub</Link>
            <Link href="/console" className="text-blue-400 hover:text-blue-300">Back to operations console</Link>
          </div>
          <h1 className="text-3xl font-semibold">Results: {params.name}</h1>
          <p className="text-sm text-slate-400">Directory: results/{params.name}</p>
        </header>

        <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="text-lg font-semibold">Status</h2>
          {Object.keys(statusSummary).length === 0 ? (
            <p className="text-sm text-slate-500">No status.json found.</p>
          ) : (
            <dl className="mt-3 grid gap-2 text-sm text-slate-300">
              {Object.entries(statusSummary).map(([key, value]) => (
                <div key={key} className="flex flex-col sm:flex-row sm:gap-2">
                  <dt className="w-32 text-slate-500 uppercase text-xs tracking-wide">{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-4">
          <h2 className="text-lg font-semibold">Files</h2>
          {files.length === 0 ? (
            <p className="text-sm text-slate-500">No files found.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {files.map((file) => (
                <Link
                  key={file}
                  href={`/results/${params.name}?file=${encodeURIComponent(file)}`}
                  className={`px-3 py-1.5 rounded-md text-xs border ${
                    selectedFile === file
                      ? 'border-blue-500 text-blue-200 bg-blue-500/10'
                      : 'border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {file}
                </Link>
              ))}
            </div>
          )}

          {selectedFile && preview && (
            <div className="rounded-md border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                <span>{selectedFile}</span>
                {preview.truncated && <span>Preview truncated at {MAX_FILE_BYTES} bytes</span>}
              </div>
              <pre className="whitespace-pre-wrap text-sm text-slate-200">{preview.content}</pre>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
