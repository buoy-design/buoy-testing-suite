import type { AssessmentContext } from './types.js';

/**
 * Generate the coverage analysis prompt for Claude
 * Used when Buoy found few or no issues - the goal is to find what Buoy missed
 */
export function buildCoverageAnalysisPrompt(context: AssessmentContext): string {
  const lines: string[] = [];

  // System context
  lines.push(`# Buoy Coverage Analysis: ${context.repo.owner}/${context.repo.name}`);
  lines.push('');
  lines.push('## Your Task');
  lines.push('');
  lines.push('Buoy is a design drift detection tool. It scans codebases to find:');
  lines.push('- **Components**: React/Vue/etc components that are part of the design system');
  lines.push('- **Design Tokens**: Colors, spacing, typography, etc. defined as tokens');
  lines.push('- **Drift**: Places where code diverges from the design system (hardcoded values, inconsistencies)');
  lines.push('');
  lines.push('**Buoy found very little in this repository.** Your job is to find what Buoy MISSED.');
  lines.push('');
  lines.push('For each gap you find:');
  lines.push('1. Show the actual code that exists');
  lines.push('2. Explain why Buoy should have detected it');
  lines.push('3. Suggest how Buoy\'s detection could be improved');
  lines.push('');

  // Repository info
  lines.push('## Repository Information');
  lines.push('');
  lines.push(`- **Name**: ${context.repo.owner}/${context.repo.name}`);
  lines.push(`- **Description**: ${context.repo.description ?? 'No description'}`);
  lines.push(`- **Language**: ${context.repo.language ?? 'Unknown'}`);
  lines.push(`- **Design System Signals**: ${context.repo.designSystemSignals.join(', ') || 'None detected'}`);
  lines.push('');

  // Buoy results
  lines.push('## What Buoy Found');
  lines.push('');
  lines.push(`- Components detected: **${context.buoyOutput.components}**`);
  lines.push(`- Tokens detected: **${context.buoyOutput.tokens}**`);
  lines.push(`- Drift signals: **${context.buoyOutput.driftSignals}**`);
  lines.push('');

  // Buoy config
  if (context.buoyConfig) {
    lines.push('## Buoy Configuration Used');
    lines.push('');
    lines.push('```javascript');
    lines.push(context.buoyConfig);
    lines.push('```');
    lines.push('');
  }

  // Repo structure
  lines.push('## Repository Structure');
  lines.push('');
  lines.push('```');
  lines.push(context.repoStructure.join('\n'));
  lines.push('```');
  lines.push('');

  // Sampled files
  lines.push('## Sampled Files');
  lines.push('');
  for (const file of context.sampledFiles) {
    lines.push(`### ${file.path}`);
    lines.push(`*Reason for sampling: ${file.reason}*`);
    lines.push('');
    lines.push('```' + getFileExtension(file.path));
    lines.push(truncateContent(file.content, 150));
    lines.push('```');
    lines.push('');
  }

  // Analysis request
  lines.push('## Analysis Required');
  lines.push('');
  lines.push('Based on the files above, identify what Buoy missed. Focus on:');
  lines.push('');
  lines.push('### 1. Missed Components');
  lines.push('Are there React/UI components that Buoy should have detected but didn\'t?');
  lines.push('Look for component definitions, exports, prop types, etc.');
  lines.push('');
  lines.push('### 2. Missed Tokens');
  lines.push('Are there design tokens (colors, spacing, typography) that Buoy should have found?');
  lines.push('Look for theme definitions, CSS variables, token objects, etc.');
  lines.push('');
  lines.push('### 3. Missed Drift');
  lines.push('Are there hardcoded values that should be using design tokens?');
  lines.push('Look for magic numbers, hardcoded colors, inconsistent spacing, etc.');
  lines.push('');
  lines.push('### 4. Detection Improvements');
  lines.push('What specific improvements to Buoy would catch these issues?');
  lines.push('Consider: new patterns to detect, better heuristics, framework-specific handling.');
  lines.push('');

  // Output format
  lines.push('## Required Output Format');
  lines.push('');
  lines.push('Provide your analysis in natural language first, then end with a structured JSON block.');
  lines.push('');
  lines.push('Your response MUST end with a JSON block in exactly this format:');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify({
    missedPatterns: [
      {
        category: 'component | token | drift | source',
        description: 'What was missed',
        evidence: {
          file: 'path/to/file.tsx',
          lineRange: [10, 25],
          codeSnippet: 'const Button = ...',
        },
        suggestedDetection: 'How Buoy could catch this',
        severity: 'high | medium | low',
      },
    ],
    improvements: [
      {
        area: 'scanner | config | drift-rules | token-parser',
        title: 'Short title',
        description: 'Detailed description',
        examples: ['Example from this repo'],
        estimatedImpact: 'Would catch X components/tokens',
      },
    ],
    summary: {
      totalMissed: 0,
      missedByCategory: { component: 0, token: 0, drift: 0, source: 0 },
      improvementAreas: ['scanner', 'token-parser'],
    },
  }, null, 2));
  lines.push('```');
  lines.push('');
  lines.push('Be specific and actionable. Every finding should include actual code from the repo.');

  return lines.join('\n');
}

/**
 * Generate drift review prompt for when Buoy did find issues
 */
export function buildDriftReviewPrompt(context: AssessmentContext, driftSignals: unknown[]): string {
  const lines: string[] = [];

  lines.push(`# Buoy Drift Review: ${context.repo.owner}/${context.repo.name}`);
  lines.push('');
  lines.push('## Your Task');
  lines.push('');
  lines.push('Buoy detected drift signals in this repository. Review each signal and classify it as:');
  lines.push('- **true-positive**: Correctly identified actual drift');
  lines.push('- **false-positive**: Flagged something that isn\'t actually a problem');
  lines.push('- **needs-context**: Cannot determine without more information');
  lines.push('');

  // Drift signals
  lines.push('## Drift Signals to Review');
  lines.push('');
  for (const signal of driftSignals.slice(0, 20)) {
    const s = signal as Record<string, unknown>;
    lines.push(`### Signal: ${s['id'] ?? 'unknown'}`);
    lines.push(`- **Type**: ${s['type'] ?? 'unknown'}`);
    lines.push(`- **Severity**: ${s['severity'] ?? 'info'}`);
    lines.push(`- **Message**: ${s['message'] ?? ''}`);
    const source = s['source'] as Record<string, unknown> | undefined;
    if (source?.['location']) {
      lines.push(`- **Location**: ${source['location']}`);
    }
    lines.push('');
  }

  // Context files
  lines.push('## Repository Context');
  lines.push('');
  for (const file of context.sampledFiles.slice(0, 5)) {
    lines.push(`### ${file.path}`);
    lines.push('```' + getFileExtension(file.path));
    lines.push(truncateContent(file.content, 100));
    lines.push('```');
    lines.push('');
  }

  // Output format
  lines.push('## Required Output Format');
  lines.push('');
  lines.push('Provide analysis, then end with JSON:');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify({
    annotations: [
      {
        signalId: 'signal-id',
        classification: 'true-positive | false-positive | needs-context',
        reasoning: 'Why this classification',
      },
    ],
    missedPatterns: [],
    improvements: [],
    summary: {
      totalMissed: 0,
      missedByCategory: {},
      improvementAreas: [],
    },
  }, null, 2));
  lines.push('```');

  return lines.join('\n');
}

/**
 * Get file extension for syntax highlighting
 */
function getFileExtension(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const mapping: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    json: 'json',
    css: 'css',
    md: 'markdown',
    mjs: 'javascript',
  };
  return mapping[ext] ?? ext;
}

/**
 * Truncate content to max lines
 */
function truncateContent(content: string, maxLines: number): string {
  const lines = content.split('\n');
  if (lines.length <= maxLines) return content;

  const half = Math.floor(maxLines / 2);
  const start = lines.slice(0, half).join('\n');
  const end = lines.slice(-half).join('\n');
  return `${start}\n\n// ... ${lines.length - maxLines} lines omitted ...\n\n${end}`;
}
