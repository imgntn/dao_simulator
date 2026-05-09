# Simulator Report Cards

This folder versions qualitative health checks for the DAO simulator. Each report card should be committed with the code state it evaluates so changes in performance, UX, architecture, and documentation are traceable over time.

## How to Add a Report Card

1. Copy `TEMPLATE.md` to `YYYY-MM-DD-short-label.md`.
2. Record the commit under review with `git rev-parse --short HEAD`.
3. Grade each area using the same scale.
4. Keep notes concrete: what improved, what remains risky, and what should be checked next.
5. Update the index below.

## Grade Scale

| Grade | Meaning |
| --- | --- |
| A | Strong, measurable, and low-risk. |
| B | Solid, but with known limitations or polish debt. |
| C | Functional but visibly incomplete, fragile, or hard to reason about. |
| D | Present but unreliable or likely to block users. |
| F | Missing or broken. |

Use `+` and `-` when the area sits near a boundary.

## Index

| Date | Report | Commit | Summary |
| --- | --- | --- | --- |
| 2026-05-08 | [Sanctum Performance & UX Baseline](2026-05-08-sanctum-performance-ux.md) | `f11f274b3` | First versioned report card after Three.js renderer, demand rendering, hot-path cleanup, and timing HUD work. |
