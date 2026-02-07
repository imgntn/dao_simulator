#!/bin/bash
# Compile all RQ papers

set -e

PAPER_DIR="$(cd "$(dirname "$0")" && pwd)"

for rq in rq1 rq2 rq3 rq4 rq5; do
    echo "=========================================="
    echo "Compiling $rq..."
    echo "=========================================="
    cd "$PAPER_DIR/$rq"

    # Run pdflatex -> bibtex -> pdflatex -> pdflatex
    pdflatex -interaction=nonstopmode main.tex || true
    bibtex main || true
    pdflatex -interaction=nonstopmode main.tex || true
    pdflatex -interaction=nonstopmode main.tex || true

    echo "$rq complete: main.pdf"
    echo ""
done

echo "=========================================="
echo "All papers compiled!"
echo "=========================================="
ls -la "$PAPER_DIR"/rq*/main.pdf 2>/dev/null || echo "Check individual directories for PDFs"
