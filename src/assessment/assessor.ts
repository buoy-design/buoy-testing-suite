import Anthropic from '@anthropic-ai/sdk';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { TestRun } from '../types.js';
import type { Assessment, MissedPattern, BuoyImprovement } from './types.js';
import { ContextBuilder } from './context.js';
import { buildCoverageAnalysisPrompt, buildDriftReviewPrompt } from './prompts.js';

export interface AssessorOptions {
  reposDir: string;
  resultsDir: string;
  model?: string;
  maxTokens?: number;
}

export interface AssessResult {
  assessment: Assessment;
  outputPath: string;
  tokensUsed: number;
}

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 8000;

export class Assessor {
  private client: Anthropic;
  private contextBuilder: ContextBuilder;
  private resultsDir: string;
  private model: string;
  private maxTokens: number;

  constructor(options: AssessorOptions) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable required');
    }

    this.client = new Anthropic({ apiKey });
    this.contextBuilder = new ContextBuilder({ reposDir: options.reposDir });
    this.resultsDir = options.resultsDir;
    this.model = options.model ?? DEFAULT_MODEL;
    this.maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  }

  /**
   * Assess a single test run
   */
  async assessTestRun(testRun: TestRun): Promise<AssessResult> {
    const { repo, buoyOutput } = testRun;
    const hasDriftSignals = (buoyOutput?.drift?.total ?? 0) > 0;

    // Build context
    const context = await this.contextBuilder.buildContext(testRun);

    // Choose prompt based on what Buoy found
    const prompt = hasDriftSignals
      ? buildDriftReviewPrompt(context, buoyOutput?.drift?.signals ?? [])
      : buildCoverageAnalysisPrompt(context);

    // Call Claude
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract response text
    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    // Parse structured findings from response
    const { missedPatterns, improvements, annotations, summary } = this.parseResponse(responseText);

    // Build assessment
    const assessment: Assessment = {
      testRunId: testRun.id,
      repoOwner: repo.owner,
      repoName: repo.name,
      assessedAt: new Date(),
      mode: hasDriftSignals ? 'drift-review' : 'coverage-analysis',
      model: this.model,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      analysis: responseText,
      missedPatterns,
      improvements,
      annotations,
      summary,
    };

    // Save assessment
    const outputPath = await this.saveAssessment(repo.owner, repo.name, assessment);

    return {
      assessment,
      outputPath,
      tokensUsed: assessment.tokensUsed ?? 0,
    };
  }

  /**
   * Assess multiple test runs
   */
  async assessBatch(
    testRuns: TestRun[],
    options: {
      onProgress?: (completed: number, total: number) => void;
      skipExisting?: boolean;
    } = {}
  ): Promise<AssessResult[]> {
    const results: AssessResult[] = [];

    for (let i = 0; i < testRuns.length; i++) {
      const testRun = testRuns[i]!;

      // Skip if already assessed
      if (options.skipExisting) {
        const existingPath = join(
          this.resultsDir,
          testRun.repo.owner,
          testRun.repo.name,
          'assessment.json'
        );
        if (existsSync(existingPath)) {
          console.log(`Skipping ${testRun.repo.owner}/${testRun.repo.name} (already assessed)`);
          continue;
        }
      }

      try {
        const result = await this.assessTestRun(testRun);
        results.push(result);
      } catch (error) {
        console.error(`Failed to assess ${testRun.repo.owner}/${testRun.repo.name}:`, error);
      }

      options.onProgress?.(i + 1, testRuns.length);
    }

    return results;
  }

  /**
   * Parse Claude's response to extract structured findings
   */
  private parseResponse(response: string): {
    missedPatterns: MissedPattern[];
    improvements: BuoyImprovement[];
    annotations?: Assessment['annotations'];
    summary: Assessment['summary'];
  } {
    // Find JSON block at the end
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```\s*$/);

    if (!jsonMatch) {
      console.warn('No JSON block found in response, using defaults');
      return {
        missedPatterns: [],
        improvements: [],
        summary: {
          totalMissed: 0,
          missedByCategory: {},
          improvementAreas: [],
        },
      };
    }

    try {
      const parsed = JSON.parse(jsonMatch[1] ?? '{}');

      return {
        missedPatterns: this.validateMissedPatterns(parsed.missedPatterns ?? []),
        improvements: this.validateImprovements(parsed.improvements ?? []),
        annotations: parsed.annotations,
        summary: parsed.summary ?? {
          totalMissed: parsed.missedPatterns?.length ?? 0,
          missedByCategory: this.countByCategory(parsed.missedPatterns ?? []),
          improvementAreas: (parsed.improvements ?? []).map((i: BuoyImprovement) => i.area),
        },
      };
    } catch (error) {
      console.warn('Failed to parse JSON block:', error);
      return {
        missedPatterns: [],
        improvements: [],
        summary: {
          totalMissed: 0,
          missedByCategory: {},
          improvementAreas: [],
        },
      };
    }
  }

  /**
   * Validate and clean missed patterns
   */
  private validateMissedPatterns(patterns: unknown[]): MissedPattern[] {
    const valid: MissedPattern[] = [];

    for (const p of patterns) {
      if (!p || typeof p !== 'object') continue;
      const pattern = p as Record<string, unknown>;

      const category = pattern['category'];
      if (!['component', 'token', 'drift', 'source'].includes(category as string)) continue;

      valid.push({
        category: category as MissedPattern['category'],
        description: String(pattern['description'] ?? ''),
        evidence: {
          file: String((pattern['evidence'] as Record<string, unknown>)?.['file'] ?? ''),
          lineRange: (pattern['evidence'] as Record<string, unknown>)?.['lineRange'] as [number, number] | undefined,
          codeSnippet: (pattern['evidence'] as Record<string, unknown>)?.['codeSnippet'] as string | undefined,
        },
        suggestedDetection: String(pattern['suggestedDetection'] ?? ''),
        severity: (['high', 'medium', 'low'].includes(pattern['severity'] as string)
          ? pattern['severity']
          : 'medium') as MissedPattern['severity'],
      });
    }

    return valid;
  }

  /**
   * Validate and clean improvements
   */
  private validateImprovements(improvements: unknown[]): BuoyImprovement[] {
    const valid: BuoyImprovement[] = [];

    for (const i of improvements) {
      if (!i || typeof i !== 'object') continue;
      const imp = i as Record<string, unknown>;

      const area = imp['area'];
      if (!['scanner', 'config', 'drift-rules', 'token-parser'].includes(area as string)) continue;

      valid.push({
        area: area as BuoyImprovement['area'],
        title: String(imp['title'] ?? ''),
        description: String(imp['description'] ?? ''),
        examples: Array.isArray(imp['examples']) ? imp['examples'].map(String) : [],
        estimatedImpact: String(imp['estimatedImpact'] ?? ''),
      });
    }

    return valid;
  }

  /**
   * Count patterns by category
   */
  private countByCategory(patterns: MissedPattern[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const p of patterns) {
      counts[p.category] = (counts[p.category] ?? 0) + 1;
    }
    return counts;
  }

  /**
   * Save assessment to file
   */
  private async saveAssessment(owner: string, name: string, assessment: Assessment): Promise<string> {
    const dir = join(this.resultsDir, owner, name);
    await mkdir(dir, { recursive: true });

    const outputPath = join(dir, 'assessment.json');
    await writeFile(outputPath, JSON.stringify(assessment, null, 2));

    // Also save just the analysis as markdown for easy reading
    const mdPath = join(dir, 'assessment.md');
    await writeFile(mdPath, assessment.analysis);

    return outputPath;
  }

  /**
   * Load existing assessment
   */
  async loadAssessment(owner: string, name: string): Promise<Assessment | null> {
    const path = join(this.resultsDir, owner, name, 'assessment.json');

    if (!existsSync(path)) {
      return null;
    }

    try {
      const content = await readFile(path, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Generate dry-run preview (returns prompt without calling API)
   */
  async dryRun(testRun: TestRun): Promise<string> {
    const context = await this.contextBuilder.buildContext(testRun);
    const hasDriftSignals = (testRun.buoyOutput?.drift?.total ?? 0) > 0;

    return hasDriftSignals
      ? buildDriftReviewPrompt(context, testRun.buoyOutput?.drift?.signals ?? [])
      : buildCoverageAnalysisPrompt(context);
  }
}
