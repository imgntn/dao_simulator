/**
 * Calibration Validation with calibration_use_real_governance = true
 *
 * Usage: npx tsx scripts/run-validation-real-governance.ts
 */

import { BacktestRunner } from '../lib/research/backtest-runner';
import { CalibrationLoader } from '../lib/digital-twins/calibration-loader';
import { getGovernanceMapping } from '../lib/digital-twins/governance-mapping';

async function main() {
  const runner = new BacktestRunner();
  const availableIds = CalibrationLoader.getAvailableIds();
  const episodes = 3;
  const stepsPerEpisode = 720;
  const seed = 42;

  console.log('='.repeat(80));
  console.log('  Calibration Validation (calibration_use_real_governance = TRUE)');
  console.log('='.repeat(80));
  console.log(`  DAOs:     ${availableIds.join(', ')} (${availableIds.length} total)`);
  console.log(`  Episodes: ${episodes} per DAO`);
  console.log(`  Steps:    ${stepsPerEpisode} per episode`);
  console.log(`  Seed:     ${seed}`);
  console.log('='.repeat(80));
  console.log();

  const summary: Array<{
    dao_id: string;
    rule: string;
    score: number;
    ci95: string;
    propFreq: number;
    passRate: number;
    partic: number;
    price: number;
    votConc: number;
    forum: number;
    best: number;
    worst: number;
  }> = [];

  for (const daoId of availableIds) {
    console.log(`[${daoId}] Running ${episodes} episodes...`);
    const start = Date.now();
    try {
      const result = await runner.runBacktest({
        daoId,
        episodes,
        stepsPerEpisode,
        seed,
        oracleType: 'calibrated_gbm',
        forumEnabled: true,
        useRealGovernance: true,
      });

      const avg = result.averageReport;
      const ci = result.confidenceIntervals.overall_score;
      const mapping = getGovernanceMapping(daoId);
      const ruleName = mapping ? mapping.ruleName : 'majority';
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);

      summary.push({
        dao_id: daoId,
        rule: ruleName,
        score: avg.overall_score,
        ci95: `${ci.ci95Lower.toFixed(3)}-${ci.ci95Upper.toFixed(3)}`,
        propFreq: avg.metrics.proposal_frequency_error,
        passRate: avg.metrics.pass_rate_error,
        partic: avg.metrics.participation_rate_error,
        price: avg.metrics.price_trajectory_rmse,
        votConc: avg.metrics.voter_concentration_error,
        forum: avg.metrics.forum_activity_error,
        best: result.bestScore,
        worst: result.worstScore,
      });

      console.log(
        `[${daoId}] Score: ${avg.overall_score.toFixed(3)} ` +
        `(95% CI: ${ci.ci95Lower.toFixed(3)}-${ci.ci95Upper.toFixed(3)}, ` +
        `best=${result.bestScore.toFixed(3)}, worst=${result.worstScore.toFixed(3)}) ` +
        `[${elapsed}s]`
      );
    } catch (error: any) {
      console.error(`[${daoId}] FAILED:`, error.message || error);
    }
  }

  console.log();
  console.log('='.repeat(80));
  console.log('  SUMMARY (calibration_use_real_governance = TRUE)');
  console.log('='.repeat(80));
  console.log();

  console.log(
    'DAO'.padEnd(13) +
    'Rule'.padEnd(16) +
    'Score'.padEnd(7) +
    '95% CI'.padEnd(14) +
    'PropFrq'.padEnd(8) +
    'PassRt'.padEnd(8) +
    'Partic'.padEnd(8) +
    'Price'.padEnd(8) +
    'VotCnc'.padEnd(8) +
    'Forum'.padEnd(8) +
    'Best'.padEnd(7) +
    'Worst'
  );
  console.log('-'.repeat(113));

  summary.sort((a, b) => b.score - a.score);
  for (const r of summary) {
    console.log(
      r.dao_id.padEnd(13) +
      r.rule.padEnd(16) +
      r.score.toFixed(3).padEnd(7) +
      r.ci95.padEnd(14) +
      r.propFreq.toFixed(3).padEnd(8) +
      r.passRate.toFixed(3).padEnd(8) +
      r.partic.toFixed(3).padEnd(8) +
      r.price.toFixed(3).padEnd(8) +
      r.votConc.toFixed(3).padEnd(8) +
      r.forum.toFixed(3).padEnd(8) +
      r.best.toFixed(3).padEnd(7) +
      r.worst.toFixed(3)
    );
  }

  const avgScore = summary.length > 0
    ? summary.reduce((s, r) => s + r.score, 0) / summary.length
    : 0;
  console.log('-'.repeat(113));
  console.log(`Average score across ${summary.length} DAOs: ${avgScore.toFixed(3)}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
