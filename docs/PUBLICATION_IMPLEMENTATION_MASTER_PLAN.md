# DAO Simulator Publication Implementation Master Plan

This is the authoritative, sequential implementation checklist for taking the DAO Simulator from its 2026-07-17 audited state to a reproducible publication, research interface, and arXiv-ready release. The supporting assessment is in `PUBLICATION_READINESS_AUDIT_2026-07-17.md`.

The order is mandatory unless a documented dependency requires otherwise. A phase gate must pass before expensive downstream work begins. External publication, repository release, artifact upload, and arXiv submission require James’s explicit final release confirmation.

## Phase 0 — Establish scope and preserve history

1. Choose the primary paper contribution.
2. Choose three to five primary research questions.
3. Separate confirmatory and exploratory research.
4. Define the smallest effect of practical interest for every primary outcome.
5. Freeze commit `5829bdbea511af349fef6aed168d03912ca9baf9` as the legacy baseline.
6. Inventory every existing result directory.
7. Archive the legacy paper campaign under an explicitly named immutable location.
8. Preserve a diagnostic snapshot of the corrupted/dummy artifacts.
9. Generate SHA-256 checksums for the legacy archive.
10. Mark old findings and manuscript artifacts as stale.
11. Remove dummy generation from production workflows.
12. Add tests that reject placeholder artifacts.
13. Classify code, data, calibration files, raw runs, LLM responses, and binaries by release and licensing constraints.
14. Adopt a project-wide definition of publication-ready.

**Gate:** The historical evidence is preserved, labeled, checksummed, and impossible to confuse with new research output.

## Phase 1 — Introduce immutable experiment campaigns

15. Define the versioned campaign directory layout.
16. Define immutable, human-readable campaign IDs.
17. Prohibit output into an existing completed campaign.
18. Require explicit resume for incomplete campaigns.
19. Require exact manifest equality before resume.
20. Write artifacts atomically.
21. Implement the campaign lifecycle: `created`, `validating`, `running`, `partial`, `failed`, `completed`, and `verified`.
22. Correct completion/failure status semantics.
23. Track expected, attempted, completed, skipped, and failed run counts separately.
24. Require exact run accounting before completion.
25. Index every raw run in the experiment manifest.
26. Detect stale, duplicate, missing, and unexpected raw files.
27. Add schema versions to every artifact.
28. Build an independent campaign-verification command.

**Gate:** A campaign is immutable, self-identifying, exactly accounted, and independently verifiable.

## Phase 2 — Replace weak provenance with strong provenance

29. Replace home-grown 32-bit hashes with SHA-256.
30. Canonicalize JSON before hashing.
31. Record the full Git commit SHA.
32. Record clean/dirty working-tree state.
33. Record a patch hash when dirty research execution is explicitly allowed.
34. Use one authoritative package/simulator version.
35. Record the lockfile SHA-256.
36. Record the resolved experiment configuration SHA-256.
37. Store the complete resolved configuration.
38. Hash calibration profiles and historical datasets.
39. Record Node, OS, architecture, CPU, cores, and memory.
40. Record worker count and execution flags.
41. Record the exact launch command.
42. Record timezone and relevant locale settings.
43. Record RNG algorithm and schema version.
44. Record exact LLM provider, model digest, quantization, prompt hash, sampling parameters, timeout, and retry policy.
45. Hash or store all LLM responses used in results.
46. Add provenance/resume rejection tests.

**Gate:** Every result can be traced to exact code, configuration, dependencies, inputs, environment, RNG, and model identity.

## Phase 3 — Make randomness and execution deterministic

47. Create an explicit injectable RNG interface.
48. Inject RNG instances into simulations and stochastic subsystems.
49. Remove silent research-mode fallback to `Math.random()`.
50. Derive stable child streams for agents, proposals, treasury, markets, shocks, forums, and governance.
51. Derive city streams by stable DAO ID.
52. Version the seed-derivation algorithm.
53. Define replicate seeds independently from conditions.
54. Store replicate and derived subsystem seeds.
55. Derive stable run IDs from experiment, condition, replicate, and provenance identity.
56. Add a nontrivial deterministic replay fixture.
57. Compare canonical final-state hashes across sequential replays.
58. Compare event-trace hashes across sequential replays.
59. Compare sequential and worker execution.
60. Compare uninterrupted and checkpoint/resume execution.
61. Test multiple worker counts.
62. Test city DAO permutation invariance.
63. Test configuration property-order invariance.
64. Preserve seed and run identity across retry.
65. Fail research execution when deterministic requirements are violated.

**Gate:** Equivalent executions produce equivalent scientific outputs regardless of scheduling, worker count, checkpointing, or DAO ordering.

## Phase 4 — Establish a formal metric registry

66. Create one authoritative, versioned metric registry.
67. Give every metric a stable ID and version.
68. Document its scientific construct.
69. Document its exact formula.
70. Document units and time basis.
71. Document numerator and denominator.
72. Document its observational level.
73. Document missing-data behavior.
74. Document valid range and edge cases.
75. Document required state snapshots.
76. Document aggregation rules.
77. Document normative interpretation limits.
78. Link paper outcomes and UI labels to registry entries.

## Phase 5 — Correct the high-risk metrics

79. Store proposal-time eligible-voter snapshots.
80. Store proposal-time eligible voting-power snapshots.
81. Store proposal-time governance rules and thresholds.
82. Calculate turnout from proposal-time voting-power snapshots.
83. Calculate quorum from proposal-time rules and voting power.
84. Preserve historical denominators across token-supply changes.
85. Implement actual delegation concentration/HHI.
86. Rename the existing top-decile voter-share measure accurately.
87. Implement longitudinal wealth mobility.
88. Rename `1 - Gini` as an equality index if retained.
89. Audit governance activity index construction.
90. Audit time-to-decision units and resolution behavior.
91. Audit pass-rate denominators.
92. Audit treasury-resilience metrics for yield and horizon dependence.
93. Audit voter concentration for eligibility and inactivity.
94. Reject non-finite values at extraction.
95. Reject non-finite values at aggregation and export.
96. Add hand-calculated golden proposal fixtures.
97. Add longitudinal metric fixtures.
98. Version corrected metrics.
99. Publish an old-to-new metric migration map.

**Gate:** Every primary metric measures its declared construct and passes a hand-calculated fixture.

## Phase 6 — Define time and economic accounting

100. Define the meaning of one simulation step.
101. Express time-dependent rates in the common unit.
102. Convert annualized rates programmatically.
103. Make protocol yield configurable.
104. Make default yield empirically justified or zero.
105. Track token and treasury flows in a ledger.
106. Record source, destination, asset, amount, event, and step for every ledger entry.
107. Reconcile token supply after each step in validation mode.
108. Reconcile treasury balances after each step in validation mode.
109. Account for minting, burning, staking, locks, rewards, fees, transfers, and external flows.
110. Classify synthetic revenue as endogenous, exogenous, or intervention.
111. Add zero, calibrated, low, and high yield conditions.
112. Add time-horizon sensitivity tests.
113. Define burn-in periods and observation rules.

## Phase 7 — Rebuild the validation suite

114. Make a missing regression baseline fail.
115. Store regression baselines with provenance and schema versions.
116. Require reproducibility cases to create meaningful activity.
117. Compare state and event hashes.
118. Test every adjacent point in monotonic sequences.
119. Use statistical trend tests where exact monotonicity is inappropriate.
120. Rewrite proposal-scaling validation with matched seeds and uncertainty.
121. Specify zero-voting behavior for specialized agents.
122. Test general and specialized agent voting separately.
123. Rewrite homogeneous-voting validation with paired replicates and tolerance.
124. Replace treasury non-negativity with ledger conservation.
125. Add conservation tests for every monetary subsystem.
126. Use matched seeds for governance comparisons.
127. Test governance differentiation with estimates and uncertainty.
128. Add a null intervention test.
129. Add a known strong intervention test.
130. Add invalid-configuration tests.
131. Add zero/one-member, zero-token, zero-treasury, and extreme-concentration cases.
132. Add proposal-snapshot mutation tests.
133. Add city ordering tests.
134. Add sequential/parallel equivalence.
135. Use unique validation output directories.
136. Make validation reports name the exact established property.
137. Print intervals and tolerances in failures.
138. Return nonzero status for every failed gate.
139. Require full validation before research execution.

**Gate:** Validation is meaningful, non-vacuous, deterministic, and entirely passing.

## Phase 8 — Repair calibration and historical-data methodology

140. Create a source ledger for every historical data point.
141. Record source, retrieval date, license, period, and transformation.
142. Preserve immutable raw snapshots where licensing permits.
143. Hash raw and transformed data separately.
144. Make transformations deterministic and scripted.
145. Eliminate undocumented hand-edited derived values.
146. Separate fitted parameters from validation outcomes.
147. Create dated training and held-out periods per DAO.
148. Prevent held-out observations from entering calibration.
149. Add held-out DAO or leave-one-DAO-out evaluation where feasible.
150. Define simple null models.
151. Compare calibrated simulations with null models.
152. Report performance separately per DAO.
153. Report uncertainty for calibration scores.
154. Report metric-level rather than only composite performance.
155. Document composite-score weights.
156. Run score-weight sensitivity.
157. Report out-of-range simulated values.
158. Define criteria before calling a value reasonable.
159. Remove the fake full-experiment replay fallback.
160. Rerun, rederive from verified current artifacts, or mark an experiment unevaluated.
161. Version calibration profiles and fitted parameters.
162. Include calibration hashes in downstream manifests.
163. Expand calibration smoke beyond two DAOs.
164. Run full 14-DAO validation after the methodology repairs.

**Gate:** Calibration performance is source-grounded, uncertainty-aware, and demonstrated out of sample.

## Phase 9 — Repair run counting and experiment configuration

165. Use runner condition enumeration as the authoritative run counter.
166. Count city scenarios correctly.
167. Count Cartesian grids correctly.
168. Count zipped sweeps and reject unequal lengths.
169. Exclude non-experiment files from discovery.
170. Reject duplicate experiment IDs and output directories.
171. Generate a machine-readable experiment catalog.
172. Record purpose, hypothesis, conditions, outcomes, replicates, and expected runtime.
173. Compare expected count with generated tasks before execution.
174. Compare tasks with completed artifacts afterward.
175. Test every paper sweep shape.

## Phase 10 — Upgrade statistical design and analysis

176. Freeze a written analysis plan before the full campaign.
177. Define the experimental unit.
178. Define each primary estimand.
179. Use common replicate seeds across conditions.
180. Analyze paired differences.
181. Preserve replicate seed as a blocking variable.
182. Use factorial models for factorial experiments.
183. Estimate interaction effects directly.
184. Use hierarchical models when pooling DAOs.
185. Treat DAO as a grouping factor.
186. Predefine multiple-comparison families.
187. Apply a correction appropriate to each family.
188. Gate post-hoc comparisons appropriately.
189. Report effect estimates with p-values.
190. Report confidence or credible intervals.
191. Report raw and paired-difference distributions.
192. Report failed, missing, retried, and excluded runs.
193. Treat non-finite results as failures.
194. Add robust alternatives for skew/heavy tails.
195. Check model assumptions and influential observations.
196. Use bootstrap intervals when appropriate.
197. Define practical-equivalence intervals.
198. Separate statistical from practical importance.
199. Base power on pilot variance and practical effects.
200. Use simulation-based power for complex designs.
201. Freeze confirmatory analyses after campaign start.
202. Record exploratory deviations.
203. Reproduce all tables and figures from immutable raw artifacts.

## Phase 11 — Redesign the experiment catalog

204. Review all paper configurations against the chosen research questions.
205. Remove experiments that do not support the central paper.
206. Move nonessential studies into an exploratory/future catalog.
207. Identify duplicate and obsolete configurations.
208. Normalize IDs, names, output paths, metrics, and horizons.
209. Create one academic baseline.
210. Create one calibrated realistic baseline per selected DAO.
211. Create matched null-agent and homogeneous-agent controls.
212. Create a matched-seed governance-mechanism comparison.
213. Create a capture-mitigation factorial design.
214. Create quorum/participation response surfaces.
215. Create a proposal-pipeline intervention design.
216. Create treasury resilience with explicit yield ablations.
217. Create declared black-swan shock scenarios.
218. Create city studies only after order invariance passes.
219. Create learning-agent ablations.
220. Create forum/social-influence ablations.
221. Create delegation ablations.
222. Create market-feedback ablations.
223. Create horizon and burn-in sensitivity studies.
224. Create calibration-uncertainty sensitivity studies.
225. Create matched LLM and non-LLM controls.
226. Keep LLM findings secondary unless exact reproducibility is solved.
227. Declare one primary outcome per major experiment where possible.
228. Limit secondary outcomes to justified measures.
229. Label the rest exploratory.
230. Generate 5–10 paired-replicate pilot configurations.
231. Generate final configurations only after pilot power analysis.

## Phase 12 — Restore automated engineering gates

232. Restore CI or an equivalent documented automated gate.
233. Run formatting, lint, TypeScript, and unit tests on every change.
234. Run deterministic fixtures in CI.
235. Run metric golden tests in CI.
236. Run manifest schema/hash tests in CI.
237. Run sequential/worker equivalence in CI.
238. Run checkpoint/resume equivalence in CI.
239. Run a small city permutation test in CI.
240. Run validation smoke in CI.
241. Compile paper sources without the full campaign.
242. Ensure paper generation rejects stale, dummy, incomplete, or mismatched artifacts.
243. Keep long jobs out of ordinary pull-request CI.
244. Add a manual release-candidate validation workflow.
245. Upload validation reports and small diagnostic artifacts.
246. Hide Windows background helper windows.
247. Ensure cancellation terminates child processes.

## Phase 13 — Execute the pilot campaign

248. Create a clean release-candidate commit.
249. Require a clean working tree.
250. Run complete correctness and validation gates.
251. Generate and verify the campaign manifest before execution.
252. Run the narrowed P1 pilot with matched seed blocks.
253. Begin with 5–10 replicates per condition.
254. Monitor runtime, memory, disk, failures, and workers.
255. Verify exact run accounting.
256. Verify all raw-run hashes.
257. Inspect raw metric distributions.
258. Inspect paired-effect distributions.
259. Check ceiling, floor, and zero inflation.
260. Check primary-outcome variation.
261. Check assumption dominance.
262. Run yield, horizon, and agent-ablation pilots early.
263. Compare calibrated and null models.
264. Calculate final sample-size requirements.
265. Document every pilot-driven design change.
266. Freeze final configurations.
267. Tag the final release candidate.

**Gate:** The pilot demonstrates valid metrics, stable execution, useful variation, adequate power, and affordable final execution.

## Phase 14 — Build the visualization foundation

268. Fix UTF-8/mojibake in source and generated reports.
269. Add encoding regression tests.
270. Fix simulation data-loading error states.
271. Add retry and diagnostics for load failures.
272. Create explicit `Explore` and `Evidence` modes.
273. Keep Sanctum as the primary Explore experience.
274. Reduce default Sanctum panel count.
275. Put advanced tools in an analysis drawer.
276. Create a guided first-run path.
277. Preserve inspection, event drill-down, comparison, and branching.
278. Display simulation time units.
279. Display metric definitions and units.
280. Label single-run observations explicitly.
281. Avoid implying inference from one trajectory.
282. Add accessible color and non-color encodings.
283. Verify keyboard and screen-reader behavior.
284. Test Canvas and Three.js fallbacks.
285. Visually verify desktop and mobile layouts.
286. Add snapshot, render, and memory performance budgets.
287. Test loading, error, empty, active, completed, and failed UI states.

## Phase 15 — Build the Evidence workbench

288. Use immutable campaign manifests as its source of truth.
289. Build a campaign browser.
290. Display validation status.
291. Display commit/config/data/dependency/model hashes.
292. Display expected/completed/failed/missing/excluded counts.
293. Build condition/configuration comparison.
294. Show exact configuration diffs.
295. Add raw-dot and violin/box views.
296. Add paired-effect plots.
297. Add cross-DAO forest plots.
298. Add time-series uncertainty bands.
299. Add event annotations.
300. Add factorial response and interaction plots.
301. Add seed-level drill-down.
302. Add DAO-level drill-down.
303. Add justified agent/network drill-down.
304. Show corrected significance and effect size together.
305. Show practical-equivalence thresholds.
306. Show model diagnostics and caveats.
307. Link labels to the metric registry.
308. Link result views to source runs and manifests.
309. Implement claim cards linking claims, analyses, figures, and artifacts.
310. Export a research report bundle.
311. Share one tested analysis library between UI and paper generation.
312. Do not independently recompute scientific results in UI components.

## Phase 16 — Execute the final experiment campaign

313. Estimate storage, runtime, and model costs from the pilot.
314. Reserve sufficient storage.
315. Create the final immutable campaign.
316. Verify release commit and clean tree.
317. Verify input and calibration hashes.
318. Run correctness gates again.
319. Run full calibration and held-out validation.
320. Stop if calibration execution, provenance, source separation, uncertainty, or null-comparison gates fail; if predictive skill is heterogeneous, continue only under a documented mechanistic/generative claim restriction with all negative cases retained.
321. Run non-LLM primary experiments first.
322. Use the frozen paired seed schedule.
323. Monitor failures without modifying completed artifacts.
324. Retry only transient infrastructure failures.
325. Distinguish scientific failures from infrastructure failures.
326. Retain failed-run diagnostics.
327. Document every exclusion decision.
328. Run robustness and ablations.
329. Run exploratory studies after confirmatory studies.
330. Run LLM studies last.
331. Freeze LLM caches and provenance.
332. Finalize experiments only after count/hash verification.
333. Finalize the campaign only after every required experiment verifies.
334. Create a second read-only campaign copy.
335. Run the independent verifier against the copy.
336. Reproduce headline statistics from raw runs in a fresh process.
337. Compare regenerated hashes.

## Phase 17 — Generate tables, figures, and claims

338. Create a structured claim registry.
339. Give every quantitative claim a stable ID.
340. Record estimand, analysis, campaign, metric version, and source artifact.
341. Generate tables from verified outputs.
342. Generate figures from verified outputs.
343. Never copy numerical values manually into LaTeX.
344. Embed campaign/analysis IDs in figure and table metadata.
345. Include sample sizes and failure counts.
346. Include effect sizes and uncertainty.
347. Label confirmatory and exploratory results.
348. Create major-assumption sensitivity figures.
349. Create calibration/holdout figures.
350. Create null-model comparisons.
351. Create a reproducibility appendix table.
352. Verify manuscript numbers against the registry.
353. Fail paper generation when a claim lacks a verified artifact.

## Phase 18 — Rewrite the manuscript

354. Rewrite the abstract after results freeze.
355. Focus the introduction on the selected contribution.
356. State research questions and hypotheses.
357. Describe agents without overstating realism.
358. Define simulation time.
359. Document economic assumptions.
360. Document proposal snapshots and governance semantics.
361. Document paired-seed design.
362. Document factorial/hierarchical models.
363. Document comparison families.
364. Document practical effects and power decisions.
365. Separate calibration and held-out data.
366. Report per-DAO calibration.
367. Report null-model performance.
368. Present primary outcomes first.
369. Report negative and null findings.
370. Report failures and exclusions.
371. Report robustness to assumptions.
372. Use causal language only where justified.
373. State model-conditional interpretation.
374. Rewrite limitations accurately.
375. Discuss external validity and misspecification.
376. Discuss LLM nondeterminism and availability.
377. Replace placeholder hashes with real SHA-256 values.
378. Generate counts and horizons automatically.
379. Make release statements match reality.
380. Update and verify references.
381. Compile from a clean environment.
382. Render and inspect every page.
383. Verify grayscale/print legibility.

## Phase 19 — Reproduction package and external review

384. Write a clean-clone reproduction guide.
385. Document hardware and runtimes.
386. Provide a reviewer-scale quick profile.
387. Provide the full archival profile.
388. Lock the environment with a container or equivalent.
389. Document validation, experiment, analysis, figure, and compilation commands.
390. Test the guide in isolation.
391. Independently reproduce at least one headline result.
392. Record every undocumented failure or assumption.
393. Repair and repeat until clean.
394. Red-team the strongest claims.
395. Attempt to falsify them with alternative specifications.
396. Run justified robustness checks.
397. Weaken or condition conclusions when required.
398. Freeze code, data, artifacts, and manuscript together.

## Phase 20 — Public release and arXiv preparation

399. Choose the public repository structure.
400. Remove secrets, private paths, credentials, and proprietary inputs.
401. Scan Git history and artifacts for secrets.
402. Confirm software licensing.
403. Confirm data redistribution rights.
404. Publish derivation instructions for restricted inputs.
405. Publish the metric registry.
406. Publish frozen experiment configurations.
407. Publish the verified campaign manifest.
408. Publish raw runs or deposit them in durable storage.
409. Publish checksummed tables and figures.
410. Create a DOI-backed archive where possible.
411. Tag the publication release.
412. Verify manuscript repository links.
413. Build the minimal arXiv source package.
414. Compile it without local paths.
415. Verify it has no ignored local dependencies.
416. Verify title, author, email, abstract, categories, and license.
417. Run the final claim-registry audit.
418. Run the final artifact-hash audit.
419. Obtain explicit final release confirmation, then submit.
420. Preserve the submitted version and arXiv identifier.
421. Keep future development separate from the frozen release.

## Full-campaign stop/go criteria

The full campaign may begin only when corrected metrics have golden tests; token and treasury ledgers reconcile; nontrivial replay, sequential/parallel/resume, and city-order tests pass; validation is entirely meaningful and green; calibration executes on held-out data with uncertainty and explicit null-model comparisons; any heterogeneous or negative predictive skill narrows the paper to a documented mechanistic/generative claim rather than being hidden; run counts and manifests verify exactly; pilot variance supports the design; and the release candidate is frozen and clean.

## Submission stop/go criteria

Submission may begin only when every manuscript number is generated from a verified campaign, every claim has a registry entry, tables and figures regenerate from raw artifacts, a clean environment reproduces headline results, code/data/configuration/manuscript versions are frozen together, release rights are confirmed, and James has explicitly approved the external release.
