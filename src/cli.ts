#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { join } from 'path';
import { readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { GitHubSearcher, RegistryManager } from './discovery/index.js';
import { BuoyRunner, RepoCache } from './execution/index.js';
import { JsonReporter, MarkdownReporter, PromptBuilder } from './reporting/index.js';
import { MIN_SCORE_THRESHOLD } from './types.js';
import type { TestRun } from './types.js';

const program = new Command();

// Common paths
const getReposDir = () => join(process.cwd(), 'repos');
const getResultsDir = () => join(process.cwd(), 'results');
const getRegistryPath = () => join(process.cwd(), 'registry', 'repos.json');

program
  .name('buoy-test')
  .description('Test harness for stress-testing Buoy against real-world design systems')
  .version('0.1.0');

// ============================================================================
// Discovery Commands
// ============================================================================

const discoverCmd = program.command('discover').description('Discover repos with design systems');

discoverCmd
  .command('search')
  .description('Search GitHub for repos with design system indicators')
  .option('--min-score <n>', 'Minimum score threshold', String(MIN_SCORE_THRESHOLD))
  .option('--min-stars <n>', 'Minimum star count', '50')
  .option('--max-results <n>', 'Maximum repos to find', '100')
  .action(async (options) => {
    const token = process.env['GITHUB_TOKEN'];
    if (!token) {
      console.error(chalk.red('Error: GITHUB_TOKEN environment variable required'));
      process.exit(1);
    }

    console.log(chalk.blue('Searching GitHub for repos with design systems...'));

    const searcher = new GitHubSearcher({
      token,
      minStars: parseInt(options.minStars, 10),
      maxResults: parseInt(options.maxResults, 10),
    });

    const repos = await searcher.searchForDesignSystemRepos();

    const minScore = parseInt(options.minScore, 10);
    const filtered = repos.filter((r) => r.score.total >= minScore);

    console.log(chalk.green(`\nFound ${filtered.length} repos (score >= ${minScore}):\n`));

    for (const repo of filtered.slice(0, 20)) {
      console.log(
        `  ${chalk.bold(repo.owner + '/' + repo.name)} ` +
          chalk.dim(`(score: ${repo.score.total}, stars: ${repo.stars})`)
      );
      console.log(
        `    Signals: ${[...repo.designSystemSignals, ...repo.activitySignals].join(', ')}`
      );
    }

    if (filtered.length > 20) {
      console.log(chalk.dim(`\n  ... and ${filtered.length - 20} more`));
    }

    // Save to registry
    const registry = new RegistryManager(getRegistryPath());
    const { added, updated } = await registry.addRepos(filtered);

    console.log(chalk.green(`\nRegistry updated: ${added} added, ${updated} updated`));
  });

discoverCmd
  .command('add <repo>')
  .description('Analyze and add a specific repo (format: owner/name)')
  .action(async (repo) => {
    const token = process.env['GITHUB_TOKEN'];
    if (!token) {
      console.error(chalk.red('Error: GITHUB_TOKEN environment variable required'));
      process.exit(1);
    }

    const [owner, name] = repo.split('/');
    if (!owner || !name) {
      console.error(chalk.red('Error: Invalid repo format. Use owner/name'));
      process.exit(1);
    }

    console.log(chalk.blue(`Analyzing ${owner}/${name}...`));

    const searcher = new GitHubSearcher({ token });
    const discovered = await searcher.analyzeRepo(owner, name);

    if (!discovered) {
      console.error(chalk.red('Failed to analyze repo'));
      process.exit(1);
    }

    console.log(chalk.green(`\nRepo: ${discovered.owner}/${discovered.name}`));
    console.log(`  Score: ${discovered.score.total}`);
    console.log(`  Design System: ${discovered.designSystemSignals.join(', ') || 'none'}`);
    console.log(`  Activity: ${discovered.activitySignals.join(', ') || 'none'}`);
    console.log(`  Stars: ${discovered.stars}`);

    if (discovered.score.total < MIN_SCORE_THRESHOLD) {
      console.log(
        chalk.yellow(`\nScore below threshold (${MIN_SCORE_THRESHOLD}), not adding to registry`)
      );
      return;
    }

    const registry = new RegistryManager(getRegistryPath());
    await registry.addRepos([discovered]);

    console.log(chalk.green('\nAdded to registry'));
  });

// ============================================================================
// Registry Commands
// ============================================================================

const registryCmd = program.command('registry').description('Manage the repo registry');

registryCmd
  .command('list')
  .description('List repos in registry')
  .option('--top <n>', 'Show top N repos', '20')
  .option('--signal <signal>', 'Filter by signal')
  .action(async (options) => {
    const registry = new RegistryManager(getRegistryPath());

    let repos;
    if (options.signal) {
      repos = await registry.getReposWithSignal(options.signal);
    } else {
      repos = await registry.getTopRepos(parseInt(options.top, 10));
    }

    if (repos.length === 0) {
      console.log(chalk.yellow('No repos in registry. Run `buoy-test discover search` first.'));
      return;
    }

    console.log(chalk.bold(`\nRegistry (${repos.length} repos):\n`));

    for (const repo of repos) {
      const tested = repo.lastTestedAt
        ? chalk.green('tested')
        : chalk.dim('not tested');

      console.log(
        `  ${chalk.bold(repo.owner + '/' + repo.name)} ` +
          chalk.dim(`score:${repo.score.total}`) +
          ` [${tested}]`
      );
    }
  });

registryCmd
  .command('stats')
  .description('Show registry statistics')
  .action(async () => {
    const registry = new RegistryManager(getRegistryPath());
    const stats = await registry.getStats();

    console.log(chalk.bold('\nRegistry Statistics:\n'));
    console.log(`  Total repos: ${stats.totalRepos}`);
    console.log(`  Tested repos: ${stats.testedRepos}`);
    console.log(`  Average score: ${stats.avgScore.toFixed(1)}`);
    console.log('\n  Signal counts:');

    for (const [signal, count] of Object.entries(stats.signalCounts)) {
      console.log(`    ${signal}: ${count}`);
    }
  });

registryCmd
  .command('remove <repo>')
  .description('Remove a repo from registry (format: owner/name or URL)')
  .action(async (repo) => {
    const registry = new RegistryManager(getRegistryPath());

    // Handle both owner/name and URL formats
    const url = repo.includes('github.com')
      ? repo
      : `https://github.com/${repo}`;

    const removed = await registry.removeRepo(url);

    if (removed) {
      console.log(chalk.green(`Removed ${repo} from registry`));
    } else {
      console.log(chalk.yellow(`Repo not found in registry`));
    }
  });

// ============================================================================
// Run Commands
// ============================================================================

const runCmd = program.command('run').description('Run Buoy tests on repos');

runCmd
  .command('single <repo>')
  .description('Test a single repo (format: owner/name)')
  .option('--buoy-path <path>', 'Path to Buoy CLI', 'buoy')
  .option('--timeout <ms>', 'Timeout per repo in ms', '300000')
  .action(async (repo, options) => {
    const [owner, name] = repo.split('/');
    if (!owner || !name) {
      console.error(chalk.red('Error: Invalid repo format. Use owner/name'));
      process.exit(1);
    }

    // Get repo from registry
    const registry = new RegistryManager(getRegistryPath());
    const repos = await registry.getAllRepos();
    const repoData = repos.find((r) => r.owner === owner && r.name === name);

    if (!repoData) {
      console.error(chalk.red(`Repo ${repo} not found in registry. Run 'buoy-test discover add ${repo}' first.`));
      process.exit(1);
    }

    console.log(chalk.blue(`\nTesting ${owner}/${name}...\n`));

    const runner = new BuoyRunner({
      reposDir: getReposDir(),
      resultsDir: getResultsDir(),
      buoyPath: options.buoyPath,
      timeoutMs: parseInt(options.timeout, 10),
    });

    const { testRun, outputPath } = await runner.runOnRepo(repoData);

    // Generate reports
    const jsonReporter = new JsonReporter({ resultsDir: getResultsDir() });
    const mdReporter = new MarkdownReporter({ resultsDir: getResultsDir() });
    const promptBuilder = new PromptBuilder({
      resultsDir: getResultsDir(),
      reposDir: getReposDir(),
    });

    await jsonReporter.saveReport(testRun);
    await mdReporter.saveReport(testRun);
    await promptBuilder.savePrompt(testRun);

    // Mark as tested in registry
    await registry.markTested(repoData.url);

    // Print summary
    console.log(chalk.green(`\nTest completed: ${testRun.status}`));
    console.log(`  Duration: ${((testRun.durationMs ?? 0) / 1000).toFixed(1)}s`);
    console.log(`  Components: ${testRun.buoyOutput?.scan?.components ?? 0}`);
    console.log(`  Tokens: ${testRun.buoyOutput?.scan?.tokens ?? 0}`);
    console.log(`  Drift signals: ${testRun.buoyOutput?.drift?.total ?? 0}`);
    console.log(`\nResults saved to: ${outputPath}`);
  });

runCmd
  .command('batch')
  .description('Test multiple repos from registry')
  .option('--top <n>', 'Test top N repos by score', '10')
  .option('--untested', 'Only test repos that haven\'t been tested')
  .option('--buoy-path <path>', 'Path to Buoy CLI', 'buoy')
  .option('--timeout <ms>', 'Timeout per repo in ms', '300000')
  .option('--concurrency <n>', 'Number of repos to test in parallel', '1')
  .action(async (options) => {
    const registry = new RegistryManager(getRegistryPath());

    let repos;
    if (options.untested) {
      repos = await registry.getUntestedRepos();
      repos = repos.slice(0, parseInt(options.top, 10));
    } else {
      repos = await registry.getTopRepos(parseInt(options.top, 10));
    }

    if (repos.length === 0) {
      console.log(chalk.yellow('No repos to test.'));
      return;
    }

    console.log(chalk.blue(`\nTesting ${repos.length} repos...\n`));

    const runner = new BuoyRunner({
      reposDir: getReposDir(),
      resultsDir: getResultsDir(),
      buoyPath: options.buoyPath,
      timeoutMs: parseInt(options.timeout, 10),
    });

    const jsonReporter = new JsonReporter({ resultsDir: getResultsDir() });
    const mdReporter = new MarkdownReporter({ resultsDir: getResultsDir() });
    const promptBuilder = new PromptBuilder({
      resultsDir: getResultsDir(),
      reposDir: getReposDir(),
    });

    const results = await runner.runOnRepos(repos, {
      concurrency: parseInt(options.concurrency, 10),
      onProgress: (completed, total) => {
        console.log(chalk.dim(`  Progress: ${completed}/${total}`));
      },
    });

    // Generate reports for each
    for (const { testRun } of results) {
      await jsonReporter.saveReport(testRun);
      await mdReporter.saveReport(testRun);
      await promptBuilder.savePrompt(testRun);
      await registry.markTested(testRun.repo.url);
    }

    // Summary
    const successful = results.filter((r) => r.testRun.status === 'completed').length;
    const failed = results.filter((r) => r.testRun.status === 'failed' || r.testRun.status === 'timeout').length;
    const totalDrift = results.reduce((sum, r) => sum + (r.testRun.buoyOutput?.drift?.total ?? 0), 0);

    console.log(chalk.green(`\nBatch complete:`));
    console.log(`  Successful: ${successful}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Total drift signals: ${totalDrift}`);
    console.log(`\nResults saved to: ${getResultsDir()}`);
  });

// ============================================================================
// Cache Commands
// ============================================================================

const cacheCmd = program.command('cache').description('Manage cloned repo cache');

cacheCmd
  .command('status')
  .description('Show cache statistics')
  .action(async () => {
    const cache = new RepoCache({ reposDir: getReposDir() });
    const stats = await cache.getStats();

    console.log(chalk.bold('\nCache Statistics:\n'));
    console.log(`  Total repos: ${stats.totalRepos}`);
    console.log(`  Total size: ${(stats.totalSizeBytes / 1024 / 1024).toFixed(1)} MB`);

    if (stats.oldestRepo) {
      console.log(`  Oldest: ${stats.oldestRepo.toISOString().split('T')[0]}`);
    }
    if (stats.newestRepo) {
      console.log(`  Newest: ${stats.newestRepo.toISOString().split('T')[0]}`);
    }
  });

cacheCmd
  .command('clean')
  .description('Clean cached repos')
  .option('--all', 'Remove all cached repos')
  .option('--older-than <days>', 'Remove repos older than N days', '7')
  .action(async (options) => {
    const cache = new RepoCache({
      reposDir: getReposDir(),
      maxAgeDays: parseInt(options.olderThan, 10),
    });

    let removed: number;
    if (options.all) {
      removed = await cache.cleanAll();
    } else {
      removed = await cache.cleanOld();
    }

    console.log(chalk.green(`Removed ${removed} repos from cache`));
  });

// ============================================================================
// Report Commands
// ============================================================================

program
  .command('aggregate')
  .description('Aggregate results across all tested repos')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const resultsDir = getResultsDir();

    if (!existsSync(resultsDir)) {
      console.log(chalk.yellow('No results found. Run some tests first.'));
      return;
    }

    // Collect all test runs
    const testRuns: TestRun[] = [];

    const owners = await readdir(resultsDir);
    for (const owner of owners) {
      const ownerPath = join(resultsDir, owner);
      try {
        const repos = await readdir(ownerPath);
        for (const repo of repos) {
          const testRunPath = join(ownerPath, repo, 'test-run.json');
          if (existsSync(testRunPath)) {
            const { readFile } = await import('fs/promises');
            const content = await readFile(testRunPath, 'utf-8');
            testRuns.push(JSON.parse(content));
          }
        }
      } catch {
        // Skip non-directories
      }
    }

    if (testRuns.length === 0) {
      console.log(chalk.yellow('No test results found.'));
      return;
    }

    const jsonReporter = new JsonReporter({ resultsDir });
    const mdReporter = new MarkdownReporter({ resultsDir });

    if (options.json) {
      const aggregate = jsonReporter.generateAggregateReport(testRuns);
      console.log(JSON.stringify(aggregate, null, 2));
    } else {
      const aggregate = jsonReporter.generateAggregateReport(testRuns);
      await jsonReporter.saveAggregateReport(testRuns);
      await mdReporter.saveAggregateReport(testRuns);

      console.log(chalk.bold('\nAggregate Results:\n'));
      console.log(`  Repos tested: ${aggregate.summary.totalRepos}`);
      console.log(`  Successful: ${aggregate.summary.successfulRuns}`);
      console.log(`  Failed: ${aggregate.summary.failedRuns}`);
      console.log(`  Total components: ${aggregate.summary.totalComponents}`);
      console.log(`  Total tokens: ${aggregate.summary.totalTokens}`);
      console.log(`  Total drift signals: ${aggregate.summary.totalDriftSignals}`);

      console.log('\n  Top drift types:');
      for (const { type, count, percentage } of aggregate.topDriftTypes.slice(0, 5)) {
        console.log(`    ${type}: ${count} (${percentage.toFixed(1)}%)`);
      }

      console.log(`\nReports saved to: ${resultsDir}`);
    }
  });

// ============================================================================
// Assess Commands (requires @buoy-design/agents)
// ============================================================================

program
  .command('assess <repo>')
  .description('Run full agent assessment on a tested repo')
  .action(async (repo) => {
    const [owner, name] = repo.split('/');
    if (!owner || !name) {
      console.error(chalk.red('Error: Invalid repo format. Use owner/name'));
      process.exit(1);
    }

    const testRunPath = join(getResultsDir(), owner, name, 'test-run.json');

    if (!existsSync(testRunPath)) {
      console.error(chalk.red(`No test results for ${repo}. Run 'buoy-test run single ${repo}' first.`));
      process.exit(1);
    }

    console.log(chalk.blue(`Assessing ${repo}...`));
    console.log(chalk.yellow('\nAgent assessment requires @buoy-design/agents package.'));
    console.log(chalk.yellow('Once agents are built, this will run:'));
    console.log('  - CodebaseReviewAgent');
    console.log('  - HistoryReviewAgent');
    console.log('  - AcceptanceAgent');
    console.log('\nFor now, use the generated prompt.md file with Claude directly.');

    const promptPath = join(getResultsDir(), owner, name, 'prompt.md');
    if (existsSync(promptPath)) {
      console.log(chalk.green(`\nPrompt file: ${promptPath}`));
    }
  });

program.parse();
