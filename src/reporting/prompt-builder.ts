import { writeFile, mkdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { simpleGit, DefaultLogFields } from 'simple-git';
import type { TestRun } from '../types.js';

export interface PromptBuilderOptions {
  resultsDir: string;
  reposDir: string;
  maxFilesPerSignal?: number;
  maxFileSize?: number;
}

export interface PromptContext {
  testRun: TestRun;
  affectedFiles: Array<{
    path: string;
    content: string;
    relatedSignals: string[];
  }>;
  gitHistory: Array<{
    file: string;
    commits: Array<{
      hash: string;
      author: string;
      date: string;
      message: string;
    }>;
  }>;
}

export class PromptBuilder {
  private resultsDir: string;
  private reposDir: string;
  private maxFilesPerSignal: number;
  private maxFileSize: number;

  constructor(options: PromptBuilderOptions) {
    this.resultsDir = options.resultsDir;
    this.reposDir = options.reposDir;
    this.maxFilesPerSignal = options.maxFilesPerSignal ?? 3;
    this.maxFileSize = options.maxFileSize ?? 10000; // 10KB
  }

  /**
   * Build full context for Claude analysis
   */
  async buildContext(testRun: TestRun): Promise<PromptContext> {
    const { repo, buoyOutput } = testRun;
    const repoPath = join(this.reposDir, repo.owner, repo.name);

    // Collect affected files from drift signals
    const affectedFiles = await this.collectAffectedFiles(repoPath, buoyOutput?.drift?.signals ?? []);

    // Get git history for affected files
    const gitHistory = await this.collectGitHistory(repoPath, affectedFiles);

    return {
      testRun,
      affectedFiles,
      gitHistory,
    };
  }

  /**
   * Generate Claude-ready prompt
   */
  async generatePrompt(testRun: TestRun): Promise<string> {
    const context = await this.buildContext(testRun);
    const { repo, buoyOutput } = testRun;

    const lines: string[] = [];

    // Introduction
    lines.push(`I ran Buoy (a design drift detection tool) on the open source repository **${repo.owner}/${repo.name}**.`);
    lines.push('');
    lines.push('Please analyze the results and help me understand:');
    lines.push('1. Are these drift signals accurate or false positives?');
    lines.push('2. What patterns did Buoy miss that it should have caught?');
    lines.push('3. How can we improve Buoy\'s detection for this type of codebase?');
    lines.push('');

    // Repository Context
    lines.push('<repository_context>');
    lines.push(`URL: ${repo.url}`);
    lines.push(`Stars: ${repo.stars}`);
    lines.push(`Language: ${repo.language ?? 'Unknown'}`);
    lines.push(`Design System Signals: ${repo.designSystemSignals.join(', ')}`);
    lines.push(`Score: ${repo.score.total}`);
    lines.push('</repository_context>');
    lines.push('');

    // Scan Results
    lines.push('<scan_results>');
    lines.push(`Components detected: ${buoyOutput?.scan?.components ?? 0}`);
    lines.push(`Tokens detected: ${buoyOutput?.scan?.tokens ?? 0}`);
    lines.push(`Sources scanned: ${buoyOutput?.scan?.sources?.join(', ') ?? 'N/A'}`);
    lines.push('</scan_results>');
    lines.push('');

    // Drift Signals
    lines.push('<drift_signals>');
    if (!buoyOutput?.drift?.signals || buoyOutput.drift.signals.length === 0) {
      lines.push('No drift signals detected.');
    } else {
      lines.push(`Total: ${buoyOutput.drift.total}`);
      lines.push('');
      lines.push('By type:');
      for (const [type, count] of Object.entries(buoyOutput.drift.byType ?? {})) {
        lines.push(`  - ${type}: ${count}`);
      }
      lines.push('');
      lines.push('Top signals:');
      const topSignals = buoyOutput.drift.signals.slice(0, 15);
      for (const signal of topSignals) {
        const s = signal as Record<string, unknown>;
        lines.push('');
        lines.push(`  Signal ID: ${s['id'] ?? 'unknown'}`);
        lines.push(`  Type: ${s['type'] ?? 'unknown'}`);
        lines.push(`  Severity: ${s['severity'] ?? 'info'}`);
        lines.push(`  Message: ${s['message'] ?? ''}`);
        const source = s['source'] as Record<string, unknown> | undefined;
        if (source) {
          lines.push(`  Location: ${source['location'] ?? 'unknown'}`);
        }
        const details = s['details'] as Record<string, unknown> | undefined;
        if (details) {
          if (details['expected']) lines.push(`  Expected: ${JSON.stringify(details['expected'])}`);
          if (details['actual']) lines.push(`  Actual: ${JSON.stringify(details['actual'])}`);
        }
      }
    }
    lines.push('</drift_signals>');
    lines.push('');

    // Affected Files
    if (context.affectedFiles.length > 0) {
      lines.push('<affected_files>');
      for (const file of context.affectedFiles) {
        lines.push('');
        lines.push(`## ${file.path}`);
        lines.push(`Related signals: ${file.relatedSignals.join(', ')}`);
        lines.push('');
        lines.push('```');
        lines.push(this.truncateContent(file.content));
        lines.push('```');
      }
      lines.push('</affected_files>');
      lines.push('');
    }

    // Git History
    if (context.gitHistory.length > 0) {
      lines.push('<git_history>');
      for (const fileHistory of context.gitHistory) {
        lines.push('');
        lines.push(`## ${fileHistory.file}`);
        for (const commit of fileHistory.commits.slice(0, 5)) {
          lines.push(`  - ${commit.hash.slice(0, 7)} | ${commit.date} | ${commit.author}`);
          lines.push(`    ${commit.message.split('\n')[0]}`);
        }
      }
      lines.push('</git_history>');
      lines.push('');
    }

    // Questions for Analysis
    lines.push('<questions>');
    lines.push('');
    lines.push('## Accuracy Assessment');
    lines.push('For each drift signal above, classify it as:');
    lines.push('- **True Positive**: Correctly identified actual drift');
    lines.push('- **False Positive**: Flagged something that isn\'t actually a problem');
    lines.push('- **Needs Context**: Cannot determine without more information');
    lines.push('');
    lines.push('## Coverage Gaps');
    lines.push('Looking at the codebase, what drift patterns exist that Buoy didn\'t detect?');
    lines.push('Consider:');
    lines.push('- Hardcoded values that should use design tokens');
    lines.push('- Inconsistent naming patterns');
    lines.push('- Deprecated patterns still in use');
    lines.push('- Components that diverge from design system');
    lines.push('');
    lines.push('## Improvement Suggestions');
    lines.push('What specific improvements would make Buoy more effective for this type of codebase?');
    lines.push('Consider:');
    lines.push('- New drift types to detect');
    lines.push('- Better heuristics for existing detections');
    lines.push('- Framework-specific patterns to recognize');
    lines.push('- False positive reduction strategies');
    lines.push('</questions>');

    return lines.join('\n');
  }

  /**
   * Save prompt to file
   */
  async savePrompt(testRun: TestRun): Promise<string> {
    const prompt = await this.generatePrompt(testRun);
    const { owner, name } = testRun.repo;

    const promptDir = join(this.resultsDir, owner, name);
    await mkdir(promptDir, { recursive: true });

    const promptPath = join(promptDir, 'prompt.md');
    await writeFile(promptPath, prompt);

    return promptPath;
  }

  /**
   * Collect files affected by drift signals
   */
  private async collectAffectedFiles(
    repoPath: string,
    signals: unknown[]
  ): Promise<PromptContext['affectedFiles']> {
    const fileMap = new Map<string, Set<string>>();

    // Group signals by file
    for (const signal of signals) {
      const s = signal as Record<string, unknown>;
      const source = s['source'] as Record<string, unknown> | undefined;
      if (!source) continue;

      const location = String(source['location'] ?? '');
      const filePath = location.split(':')[0];
      if (!filePath) continue;

      const signalId = String(s['id'] ?? s['type'] ?? 'unknown');

      if (!fileMap.has(filePath)) {
        fileMap.set(filePath, new Set());
      }
      fileMap.get(filePath)!.add(signalId);
    }

    // Read file contents (limited)
    const affectedFiles: PromptContext['affectedFiles'] = [];
    let filesRead = 0;

    for (const [filePath, signalIds] of fileMap.entries()) {
      if (filesRead >= this.maxFilesPerSignal * 3) break;

      const fullPath = join(repoPath, filePath);
      if (!existsSync(fullPath)) continue;

      try {
        const fileStat = await stat(fullPath);
        if (fileStat.size > this.maxFileSize) continue;

        const content = await readFile(fullPath, 'utf-8');
        affectedFiles.push({
          path: filePath,
          content,
          relatedSignals: Array.from(signalIds),
        });
        filesRead++;
      } catch {
        // Skip files we can't read
      }
    }

    return affectedFiles;
  }

  /**
   * Collect git history for affected files
   */
  private async collectGitHistory(
    repoPath: string,
    affectedFiles: PromptContext['affectedFiles']
  ): Promise<PromptContext['gitHistory']> {
    if (!existsSync(repoPath)) return [];

    const git = simpleGit(repoPath);
    const history: PromptContext['gitHistory'] = [];

    for (const file of affectedFiles.slice(0, 5)) {
      try {
        const log = await git.log({
          file: file.path,
          maxCount: 10,
        });

        history.push({
          file: file.path,
          commits: log.all.map((c: DefaultLogFields) => ({
            hash: c.hash,
            author: c.author_name,
            date: c.date.split('T')[0] ?? c.date,
            message: c.message,
          })),
        });
      } catch {
        // Skip files without history
      }
    }

    return history;
  }

  /**
   * Truncate content for prompt
   */
  private truncateContent(content: string): string {
    const maxLines = 100;
    const lines = content.split('\n');

    if (lines.length <= maxLines) {
      return content;
    }

    const half = Math.floor(maxLines / 2);
    const start = lines.slice(0, half).join('\n');
    const end = lines.slice(-half).join('\n');

    return `${start}\n\n... [${lines.length - maxLines} lines truncated] ...\n\n${end}`;
  }

  /**
   * Generate a summary prompt for multiple repos
   */
  async generateSummaryPrompt(testRuns: TestRun[]): Promise<string> {
    const lines: string[] = [];

    lines.push('# Buoy Testing Suite - Summary Analysis');
    lines.push('');
    lines.push(`I tested Buoy on ${testRuns.length} open source repositories with design systems.`);
    lines.push('');
    lines.push('Please analyze the aggregate results and help me understand:');
    lines.push('1. What are the most common drift patterns across these codebases?');
    lines.push('2. Which drift types have the highest false positive rates?');
    lines.push('3. What improvements would have the highest impact?');
    lines.push('');

    // Aggregate stats
    let totalComponents = 0;
    let totalTokens = 0;
    let totalDrift = 0;
    const driftByType: Record<string, number> = {};

    for (const run of testRuns) {
      totalComponents += run.buoyOutput?.scan?.components ?? 0;
      totalTokens += run.buoyOutput?.scan?.tokens ?? 0;
      totalDrift += run.buoyOutput?.drift?.total ?? 0;

      for (const [type, count] of Object.entries(run.buoyOutput?.drift?.byType ?? {})) {
        driftByType[type] = (driftByType[type] ?? 0) + count;
      }
    }

    lines.push('<aggregate_results>');
    lines.push(`Repos tested: ${testRuns.length}`);
    lines.push(`Total components: ${totalComponents}`);
    lines.push(`Total tokens: ${totalTokens}`);
    lines.push(`Total drift signals: ${totalDrift}`);
    lines.push('');
    lines.push('Drift by type:');
    const sortedTypes = Object.entries(driftByType).sort((a, b) => b[1] - a[1]);
    for (const [type, count] of sortedTypes) {
      const pct = totalDrift > 0 ? ((count / totalDrift) * 100).toFixed(1) : '0';
      lines.push(`  - ${type}: ${count} (${pct}%)`);
    }
    lines.push('</aggregate_results>');
    lines.push('');

    // Per-repo summary
    lines.push('<per_repo_summary>');
    for (const run of testRuns) {
      const { repo, buoyOutput } = run;
      lines.push(`- ${repo.owner}/${repo.name}: ${buoyOutput?.drift?.total ?? 0} drift signals, ${buoyOutput?.scan?.components ?? 0} components`);
    }
    lines.push('</per_repo_summary>');
    lines.push('');

    lines.push('For detailed per-repo analysis, see the individual prompt.md files.');

    return lines.join('\n');
  }
}
