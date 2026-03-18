/**
 * Server-side path utilities.
 *
 * These helpers construct file-system paths at runtime in a way that
 * prevents Turbopack from statically tracing them.  Without this
 * indirection Turbopack emits "The file pattern … matches N files"
 * warnings for every `path.join(process.cwd(), ...)` it discovers.
 *
 * The trick: access `process` via `globalThis` and `path` via a
 * local alias so the bundler's static analyser cannot follow the
 * data flow to a concrete directory.
 */

// Indirect references defeat Turbopack's static path tracing.
const _process = globalThis['process' as keyof typeof globalThis] as NodeJS.Process;
const _path = ((globalThis as any).__nodeRequire ?? require)('path') as typeof import('path');

let _root: string | undefined;

export function projectRoot(): string {
  if (!_root) _root = _process.cwd();
  return _root;
}

export function projectPath(...segments: string[]): string {
  return _path.join(projectRoot(), ...segments);
}

export function projectResolve(...segments: string[]): string {
  return _path.resolve(projectRoot(), ...segments);
}
