@echo off
REM Compile all RQ papers (Windows)

setlocal enabledelayedexpansion

set PAPER_DIR=%~dp0

for %%r in (rq1 rq2 rq3 rq4 rq5) do (
    echo ==========================================
    echo Compiling %%r...
    echo ==========================================
    cd /d "%PAPER_DIR%\%%r"

    pdflatex -interaction=nonstopmode main.tex
    bibtex main
    pdflatex -interaction=nonstopmode main.tex
    pdflatex -interaction=nonstopmode main.tex

    echo %%r complete
    echo.
)

echo ==========================================
echo All papers compiled!
echo ==========================================
cd /d "%PAPER_DIR%"
dir /b rq*\main.pdf 2>nul

endlocal
