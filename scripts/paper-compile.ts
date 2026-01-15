/**
 * Paper Compile Script
 * Compiles the LaTeX paper to PDF using Tectonic
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const ROOT_DIR = process.cwd();
const PAPER_DIR = path.join(ROOT_DIR, 'paper');
const TECTONIC_PATH = path.join(ROOT_DIR, 'tools', 'tectonic.exe');

function checkTectonic(): boolean {
  if (!fs.existsSync(TECTONIC_PATH)) {
    console.error('Tectonic not found at:', TECTONIC_PATH);
    console.error('Run the setup script to download Tectonic.');
    return false;
  }
  return true;
}

function compile(): void {
  console.log('=== Compiling Paper ===\n');

  if (!checkTectonic()) {
    process.exit(1);
  }

  const mainTex = path.join(PAPER_DIR, 'main.tex');
  if (!fs.existsSync(mainTex)) {
    console.error('main.tex not found at:', mainTex);
    process.exit(1);
  }

  try {
    // Run tectonic from the paper directory so it can find includes
    execSync(`"${TECTONIC_PATH}" -X compile main.tex`, {
      cwd: PAPER_DIR,
      stdio: 'inherit',
    });

    const pdfPath = path.join(PAPER_DIR, 'main.pdf');
    if (fs.existsSync(pdfPath)) {
      const stats = fs.statSync(pdfPath);
      const sizeKB = Math.round(stats.size / 1024);
      console.log(`\n✓ PDF generated: paper/main.pdf (${sizeKB}KB)`);
    }
  } catch (error) {
    console.error('\nCompilation failed');
    process.exit(1);
  }
}

// Run archive first if --archive flag
if (process.argv.includes('--archive')) {
  console.log('Running archive first...\n');
  try {
    execSync('npm run paper:archive', { cwd: ROOT_DIR, stdio: 'inherit' });
  } catch {
    // Archive failure is non-fatal
  }
}

compile();
