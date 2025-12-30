import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { TestRun } from '../types.js';
import { JsonReporter } from './json-report.js';

export interface MarkdownReportOptions {
  resultsDir: string;
}

export class MarkdownReporter {
  private resultsDir: string;
  private jsonReporter: JsonReporter;

  constructor(options: MarkdownReportOptions) {
    this.resultsDir = options.resultsDir;
    this.jsonReporter = new JsonReporter(options);
  }

  /**
   * Generate Markdown report from test run
   */
  generateReport(testRun: TestRun): string {
    const report = this.jsonReporter.generateReport(testRun);
    const { repo } = testRun;

    const lines: string[] = [];

    // Header
    lines.push(`# Buoy Test: ${repo.owner}/${repo.name}`);
    lines.push('');
    lines.push(`**Score:** ${repo.score.total} | **Tested:** ${this.formatDate(report.testedAt)} | **Buoy:** ${testRun.buoyVersion}`);
    lines.push('');

    // Status
    if (testRun.status === 'completed') {
      lines.push('**Status:** Completed successfully');
    } else if (testRun.status === 'failed') {
      lines.push(`**Status:** Failed - ${testRun.error}`);
    } else if (testRun.status === 'timeout') {
      lines.push('**Status:** Timed out');
    }
    lines.push('');

    // Design System Sources
    lines.push('## Design System Sources');
    lines.push('');
    if (report.designSystemSources.length > 0) {
      for (const source of report.designSystemSources) {
        lines.push(`- ${this.formatSignal(source)}`);
      }
    } else {
      lines.push('No design system sources detected.');
    }
    lines.push('');

    // Scan Results
    lines.push('## Scan Results');
    lines.push('');
    lines.push('| Type | Found | Coverage |');
    lines.push('|------|-------|----------|');
    lines.push(`| Components | ${report.scan.components} | ${this.formatCoverage(report.scan.coverage['components'])} |`);
    lines.push(`| Tokens | ${report.scan.tokens} | ${this.formatCoverage(report.scan.coverage['tokens'])} |`);
    lines.push('');

    // Drift Signals
    lines.push('## Drift Signals');
    lines.push('');

    if (report.drift.total === 0) {
      lines.push('No drift signals detected.');
    } else {
      // By severity
      const critical = report.drift.bySeverity['critical'] ?? 0;
      const warning = report.drift.bySeverity['warning'] ?? 0;
      const info = report.drift.bySeverity['info'] ?? 0;

      lines.push(`- **${critical}** critical`);
      lines.push(`- **${warning}** warning`);
      lines.push(`- **${info}** info`);
      lines.push('');

      // By type
      lines.push('### By Type');
      lines.push('');
      lines.push('| Type | Count |');
      lines.push('|------|-------|');

      const sortedTypes = Object.entries(report.drift.byType)
        .sort((a, b) => b[1] - a[1]);

      for (const [type, count] of sortedTypes) {
        lines.push(`| ${type} | ${count} |`);
      }
      lines.push('');

      // Top Issues (if we have signal details)
      if (testRun.buoyOutput?.drift?.signals && testRun.buoyOutput.drift.signals.length > 0) {
        lines.push('### Top Issues');
        lines.push('');

        const topSignals = testRun.buoyOutput.drift.signals.slice(0, 10);

        for (let i = 0; i < topSignals.length; i++) {
          const signal = topSignals[i] as Record<string, unknown>;
          const type = signal['type'] ?? 'unknown';
          const location = (signal['source'] as Record<string, unknown>)?.['location'] ?? 'unknown';
          const message = signal['message'] ?? '';

          lines.push(`${i + 1}. \`${type}\` in \`${location}\``);
          if (message) {
            lines.push(`   ${message}`);
          }
        }
        lines.push('');
      }
    }

    // Metadata
    lines.push('---');
    lines.push('');
    lines.push('## Metadata');
    lines.push('');
    lines.push(`- **Repository:** [${repo.owner}/${repo.name}](${repo.url})`);
    lines.push(`- **Stars:** ${repo.stars}`);
    lines.push(`- **Default Branch:** ${repo.defaultBranch}`);
    lines.push(`- **Language:** ${repo.language ?? 'Unknown'}`);
    lines.push(`- **Duration:** ${testRun.durationMs ? `${(testRun.durationMs / 1000).toFixed(1)}s` : 'N/A'}`);
    lines.push(`- **Config Generated:** ${testRun.configGenerated ? 'Yes' : 'No'}`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Save report to file
   */
  async saveReport(testRun: TestRun): Promise<string> {
    const markdown = this.generateReport(testRun);
    const { owner, name } = testRun.repo;

    const reportDir = join(this.resultsDir, owner, name);
    await mkdir(reportDir, { recursive: true });

    const reportPath = join(reportDir, 'report.md');
    await writeFile(reportPath, markdown);

    return reportPath;
  }

  /**
   * Generate aggregate Markdown report
   */
  generateAggregateReport(testRuns: TestRun[]): string {
    const aggregate = this.jsonReporter.generateAggregateReport(testRuns);
    const lines: string[] = [];

    lines.push('# Buoy Testing Suite - Aggregate Report');
    lines.push('');
    lines.push(`**Generated:** ${this.formatDate(aggregate.generatedAt)}`);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Total Repos | ${aggregate.summary.totalRepos} |`);
    lines.push(`| Successful Runs | ${aggregate.summary.successfulRuns} |`);
    lines.push(`| Failed Runs | ${aggregate.summary.failedRuns} |`);
    lines.push(`| Total Components | ${aggregate.summary.totalComponents} |`);
    lines.push(`| Total Tokens | ${aggregate.summary.totalTokens} |`);
    lines.push(`| Total Drift Signals | ${aggregate.summary.totalDriftSignals} |`);
    lines.push('');

    // Drift by Severity
    lines.push('## Drift by Severity');
    lines.push('');
    lines.push('| Severity | Count |');
    lines.push('|----------|-------|');
    for (const [severity, count] of Object.entries(aggregate.driftBySeverity)) {
      lines.push(`| ${severity} | ${count} |`);
    }
    lines.push('');

    // Top Drift Types
    lines.push('## Top Drift Types');
    lines.push('');
    lines.push('| Type | Count | % |');
    lines.push('|------|-------|---|');
    for (const { type, count, percentage } of aggregate.topDriftTypes) {
      lines.push(`| ${type} | ${count} | ${percentage.toFixed(1)}% |`);
    }
    lines.push('');

    // Top Repos by Drift
    lines.push('## Repos with Most Drift');
    lines.push('');
    lines.push('| Repository | Drift Signals |');
    lines.push('|------------|---------------|');
    for (const { repo, driftCount } of aggregate.topReposByDrift) {
      lines.push(`| ${repo} | ${driftCount} |`);
    }
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Save aggregate report
   */
  async saveAggregateReport(testRuns: TestRun[]): Promise<string> {
    const markdown = this.generateAggregateReport(testRuns);

    const reportPath = join(this.resultsDir, 'aggregate.md');
    await writeFile(reportPath, markdown);

    return reportPath;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0] ?? '';
  }

  private formatSignal(signal: string): string {
    const labels: Record<string, string> = {
      storybook: 'Storybook',
      'design-tokens': 'Design Tokens',
      'ui-package': 'UI Package',
      'figma-config': 'Figma Config',
      'css-variables': 'CSS Variables',
      'tailwind-theme': 'Tailwind Theme',
    };
    return labels[signal] ?? signal;
  }

  private formatCoverage(coverage: number | undefined): string {
    if (coverage === undefined) return 'N/A';
    return `${(coverage * 100).toFixed(0)}%`;
  }
}
