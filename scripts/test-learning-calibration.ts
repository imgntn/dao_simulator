/**
 * Test whether Q-learning degrades calibration accuracy.
 * Compares learning_enabled=false vs true for aave and compound.
 */
import { BacktestRunner } from '../lib/research/backtest-runner';

async function main() {
  const runner = new BacktestRunner();
  const episodes = 10;
  const steps = 360;

  for (const daoId of ['aave', 'compound']) {
    console.log(`\n=== ${daoId} ===`);

    // Baseline (no learning)
    const baseline = await runner.runBacktest({
      daoId, episodes, stepsPerEpisode: steps, seed: 42,
      oracleType: 'calibrated_gbm', forumEnabled: true,
    });

    // With learning
    // BacktestRunner hardcodes learning_enabled=false, so we need to patch
    const { DAOSimulation } = await import('../lib/engine/simulation');
    const { CalibrationLoader } = await import('../lib/digital-twins/calibration-loader');
    const { compareToHistorical, extractSimulationMetrics } = await import('../lib/research/accuracy-metrics');

    const profile = CalibrationLoader.load(daoId)!;
    const learningReports = [];

    for (let ep = 0; ep < episodes; ep++) {
      const calibratedSettings = CalibrationLoader.toSettings(profile);
      const sim = new DAOSimulation({
        seed: 42 + ep,
        calibration_dao_id: daoId,
        oracle_type: 'calibrated_gbm',
        forum_enabled: true,
        forum_influence_weight: 0.3,
        learning_enabled: true,
        ...calibratedSettings,
      });
      await sim.run(steps);
      const metrics = extractSimulationMetrics(sim.dataCollector, steps, sim.dao.proposals, sim.dao.members.length);
      const report = compareToHistorical(metrics, profile);
      learningReports.push(report);
    }

    const baselineAvg = baseline.averageReport.overall_score;
    const learningAvg = learningReports.reduce((s, r) => s + r.overall_score, 0) / learningReports.length;
    const delta = learningAvg - baselineAvg;

    console.log(`  Baseline (no learning): ${baselineAvg.toFixed(3)}`);
    console.log(`  With learning:          ${learningAvg.toFixed(3)}`);
    console.log(`  Delta:                  ${delta >= 0 ? '+' : ''}${delta.toFixed(3)} ${Math.abs(delta) > 0.05 ? '*** SIGNIFICANT ***' : '(within noise)'}`);
  }
}

main().catch(e => console.error(e));
