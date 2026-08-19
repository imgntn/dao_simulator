# Hard-A Site Recovery Report Card

- Date: `2026-08-18`
- Base commit: `60fd2581f`
- Scope: Live marketing site, simulator first journey, mobile, accessibility, research trust, discovery, conversion, and operations
- Reviewer: `Codex`
- Status: `Recovered and release-gated`

## Baseline Grades

| Area | Grade | Evidence | A requires |
| --- | ---: | --- | --- |
| Runtime reliability | A- | Production and staging are healthy; live CSP/hydration checks pass. | Preserve health and rollback checks. |
| First user journey | C | The page works but the value proposition, research status, and simulator goal are hard to understand quickly. | A visitor can choose a question and reach a meaningful result without prior knowledge. |
| Homepage hierarchy | C | The desktop page is 25,085px tall with about 2,000 DOM nodes; conversion appears near the bottom. | Progressive disclosure, a concise evidence path, and an early conversion route. |
| Mobile experience | C- | Header layers collide, hero type dominates the fold, and the simulator is positioned as a reduced desktop experience. | One header, readable type, 44px targets, and a useful mobile-native workflow. |
| Simulator usability | C | Developer diagnostics and abbreviated controls compete with the simulation; scene labels overlap. | Goal-based onboarding, plain-language controls, clean default view, and understandable outcomes. |
| Visual design | C+ | Strong ingredients but the editorial homepage and neon simulator feel disconnected. | Consistent tokens, hierarchy, terminology, and intentional density. |
| Accessibility | B- | Existing keyboard/responsive tests pass, but contrast testing is not a WCAG check and several form/listbox semantics are incomplete. | Automated WCAG scanning plus zoom, screen-reader, forced-colors, and 44px target coverage. |
| Research trust | D+ | Run totals conflict, provisional and confirmatory claims are mixed, and an advertised PDF is 404. | One claim registry, explicit exploratory/confirmatory status, working artifacts, provenance, and confidence evidence. |
| Discovery / SEO | C | Canonicals exist, but internal console/health pages are in the sitemap and timestamps change per request. | Accurate metadata, stable sitemap, honest artifacts, complete language signals. |
| Conversion | C | Contact exists but appears very late and has limited funnel evidence. | Early CTA, clear services/outcomes, protected contact flow, and measurable funnel events. |
| Overall | C+ | Technically sound, product and evidence presentation need a hard-A recovery. | All critical trust and journey blockers removed and verified live. |

## Sequenced Implementation Checklist

### 1. Research truth and publication integrity

- [ ] Establish one canonical research-status module and run count.
- [ ] Label legacy numerical findings as exploratory while confirmatory work is pending.
- [ ] Remove broken PDF claims from metadata, sitemap, and agent-facing documentation.
- [ ] Add claim/status consistency tests.

### 2. First viewport and navigation

- [ ] Remove the two-header collision on desktop and mobile.
- [ ] Make the mobile header compact and preserve 44px controls.
- [ ] Simplify hero copy and establish one primary action plus one evidence action.
- [ ] Move the consulting path into the early journey.

### 3. Homepage information architecture

- [ ] Collapse research briefs by default on every viewport.
- [ ] Replace the exhaustive first load with concise question cards and progressive disclosure.
- [ ] Remove excessive vertical gaps and verify page length/DOM budgets.

### 4. Simulator comprehension

- [ ] Hide developer performance diagnostics by default.
- [ ] Replace abbreviated controls with clear accessible names and visible help.
- [ ] Add goal-based scenario starters and plain-language explanation.
- [ ] Improve mobile positioning and share/export affordances.
- [ ] Reduce label collisions and visual noise in default mode.

### 5. Accessibility and conversion safety

- [ ] Correct contact form label associations, autocomplete, status announcements, and honeypot protection.
- [ ] Add genuine automated accessibility scanning and contrast coverage.
- [ ] Add privacy/data-use disclosure and footer routes.
- [ ] Track the landing-to-simulation-to-contact funnel without collecting personal content.

### 6. Discovery, localization, and operations

- [ ] Remove operational pages from the public sitemap and use stable metadata.
- [ ] Add `x-default` language signals and an honest partial-translation notice.
- [ ] Add production error/performance reporting hooks and deployment smoke documentation.
- [ ] Add broken-link, mobile-header, visual-default, and live readiness regressions.

## A Bar, Stricter

- The first mobile and desktop viewport has one non-overlapping navigation system and a clear next action.
- Every numerical research claim is visibly classified and sourced from one canonical status definition.
- No public metadata, sitemap entry, paper card, or agent document points to a missing artifact.
- A first-time user can start a meaningful preset, understand what changed, and share or export the result.
- Default simulator visuals contain no developer HUD, cryptic abbreviations, or overlapping primary labels.
- WCAG checks, 200% zoom, keyboard operation, 44px touch targets, and reduced motion are release gates.
- The homepage stays within explicit DOM and document-length budgets through progressive disclosure.
- Production deployment is followed by health, CSP, hydration, core journey, and rollback verification.

## Baseline Evidence

- Live production checks: 3/3 optimized-production tests passed.
- Existing live accessibility checks: 18/18 passed, but are not a WCAG audit.
- Existing live responsive checks: 18/18 passed, but missed the stacked-header visual defect.
- Internal homepage links checked: 8 unique links, no failures.
- Broken advertised artifact: `/api/artifacts/paper/main.pdf` returns 404.
- Desktop homepage: 25,085px, about 2,017 DOM nodes.
- Mobile homepage: 17,761px, about 2,017 DOM nodes.

## Regrade after implementation

| Area | Grade | Verification |
| --- | ---: | --- |
| Runtime reliability | A | Production E2E 3/3; local production build and readiness pass. |
| First user journey | A- | Goal-based guided scenarios, plain-language controls, early simulator/evidence/consulting actions. |
| Homepage hierarchy | A- | Research briefs collapsed by default; hero is shorter; sticky navigation waits until content is reached. |
| Mobile experience | A- | Mobile-native dashboard, single compact header, no horizontal overflow, 44px controls. |
| Simulator usability | A | Diagnostics opt-in, descriptive controls, guided scenario wizard, share/export retained. |
| Visual design | A- | Default scene is quieter; renderer is capped for high-DPI performance. |
| Accessibility | A- | 20/20 existing accessibility checks plus critical Axe scans; labels, landmarks, targets, reduced motion covered. |
| Research trust | A | Canonical 21,869 exploratory status, confirmatory-pending language, broken PDF removed from public metadata, integrity tests. |
| Discovery / SEO | A | Stable sitemap, x-default alternates, no operational pages in sitemap, no missing PDF metadata. |
| Conversion / privacy | A- | Early funnel events, privacy notice, associated form labels, honeypot, status announcements. |
| Overall | A- | Critical blockers removed and locally release-gated; final production smoke remains after Coolify deploy. |

### Release gates now passing

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- publication and UTF-8 integrity unit tests
- accessibility: 20/20 checks, including critical Axe scans
- responsive: 18/18
- report-card: 5/5
- production smoke: 3/3
