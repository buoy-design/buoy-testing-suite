import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { TestRun, TestReport } from '../types.js';

export interface JsonReportOptions {
  resultsDir: string;
}

export class JsonReporter {
  private resultsDir: string;

  constructor(options: JsonReportOptions) {
    this.resultsDir = options.resultsDir;
  }

  /**
   * Generate JSON report from test run
   */
  generateReport(testRun: TestRun): TestReport {
    const { repo, buoyOutput } = testRun;

    return {
      repo: {
        url: repo.url,
        name: repo.name,
        owner: repo.owner,
      },
      score: repo.score.total,
      testedAt: testRun.completedAt ?? new Date(),
      buoyVersion: testRun.buoyVersion,

      designSystemSources: repo.designSystemSignals,

      scan: {
        components: buoyOutput?.scan?.components ?? 0,
        tokens: buoyOutput?.scan?.tokens ?? 0,
        coverage: buoyOutput?.status?.coverage ?? {},
      },

      drift: {
        total: buoyOutput?.drift?.total ?? 0,
        byType: buoyOutput?.drift?.byType ?? {},
        bySeverity: buoyOutput?.drift?.bySeverity ?? {},
      },
    };
  }

  /**
   * Save report to file
   */
  async saveReport(testRun: TestRun): Promise<string> {
    const report = this.generateReport(testRun);
    const { owner, name } = testRun.repo;

    const reportDir = join(this.resultsDir, owner, name);
    await mkdir(reportDir, { recursive: true });

    const reportPath = join(reportDir, 'report.json');
    await writeFile(reportPath, JSON.stringify(report, null, 2));

    return reportPath;
  }

  /**
   * Generate aggregate report from multiple test runs
   */
  generateAggregateReport(testRuns: TestRun[]): {
    summary: {
      totalRepos: number;
      successfulRuns: number;
      failedRuns: number;
      totalComponents: number;
      totalTokens: number;
      totalDriftSignals: number;
    };
    driftByType: Record<string, number>;
    driftBySeverity: Record<string, number>;
    topReposByDrift: Array<{ repo: string; driftCount: number }>;
    topDriftTypes: Array<{ type: string; count: number; percentage: number }>;
    generatedAt: Date;
  } {
    const successfulRuns = testRuns.filter((r) => r.status === 'completed');
    const failedRuns = testRuns.filter((r) => r.status === 'failed' || r.status === 'timeout');

    let totalComponents = 0;
    let totalTokens = 0;
    let totalDriftSignals = 0;
    const driftByType: Record<string, number> = {};
    const driftBySeverity: Record<string, number> = {};
    const reposDrift: Array<{ repo: string; driftCount: number }> = [];

    for (const run of successfulRuns) {
      const { buoyOutput, repo } = run;

      totalComponents += buoyOutput?.scan?.components ?? 0;
      totalTokens += buoyOutput?.scan?.tokens ?? 0;

      const driftCount = buoyOutput?.drift?.total ?? 0;
      totalDriftSignals += driftCount;

      reposDrift.push({
        repo: `${repo.owner}/${repo.name}`,
        driftCount,
      });

      // Aggregate by type
      for (const [type, count] of Object.entries(buoyOutput?.drift?.byType ?? {})) {
        driftByType[type] = (driftByType[type] ?? 0) + count;
      }

      // Aggregate by severity
      for (const [severity, count] of Object.entries(buoyOutput?.drift?.bySeverity ?? {})) {
        driftBySeverity[severity] = (driftBySeverity[severity] ?? 0) + count;
      }
    }

    // Top repos by drift
    const topReposByDrift = reposDrift
      .sort((a, b) => b.driftCount - a.driftCount)
      .slice(0, 10);

    // Top drift types
    const sortedTypes = Object.entries(driftByType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const topDriftTypes = sortedTypes.map(([type, count]) => ({
      type,
      count,
      percentage: totalDriftSignals > 0 ? (count / totalDriftSignals) * 100 : 0,
    }));

    return {
      summary: {
        totalRepos: testRuns.length,
        successfulRuns: successfulRuns.length,
        failedRuns: failedRuns.length,
        totalComponents,
        totalTokens,
        totalDriftSignals,
      },
      driftByType,
      driftBySeverity,
      topReposByDrift,
      topDriftTypes,
      generatedAt: new Date(),
    };
  }

  /**
   * Save aggregate report
   */
  async saveAggregateReport(testRuns: TestRun[]): Promise<string> {
    const report = this.generateAggregateReport(testRuns);

    const reportPath = join(this.resultsDir, 'aggregate.json');
    await writeFile(reportPath, JSON.stringify(report, null, 2));

    return reportPath;
  }
}
