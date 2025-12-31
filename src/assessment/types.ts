import { z } from 'zod';

// ============================================================================
// Missed Pattern - What Buoy should have caught
// ============================================================================

export const MissedPatternSchema = z.object({
  category: z.enum(['component', 'token', 'drift', 'source']),
  description: z.string(),
  evidence: z.object({
    file: z.string(),
    lineRange: z.tuple([z.number(), z.number()]).optional(),
    codeSnippet: z.string().optional(),
  }),
  suggestedDetection: z.string(),
  severity: z.enum(['high', 'medium', 'low']),
});

export type MissedPattern = z.infer<typeof MissedPatternSchema>;

// ============================================================================
// Buoy Improvement - Actionable suggestion
// ============================================================================

export const BuoyImprovementSchema = z.object({
  area: z.enum(['scanner', 'config', 'drift-rules', 'token-parser']),
  title: z.string(),
  description: z.string(),
  examples: z.array(z.string()),
  estimatedImpact: z.string(),
});

export type BuoyImprovement = z.infer<typeof BuoyImprovementSchema>;

// ============================================================================
// Assessment Result
// ============================================================================

export const AssessmentSchema = z.object({
  testRunId: z.string(),
  repoOwner: z.string(),
  repoName: z.string(),
  assessedAt: z.date(),
  mode: z.enum(['drift-review', 'coverage-analysis']),

  // Model info
  model: z.string(),
  tokensUsed: z.number().optional(),

  // Claude's full analysis
  analysis: z.string(),

  // Structured findings
  missedPatterns: z.array(MissedPatternSchema),
  improvements: z.array(BuoyImprovementSchema),

  // For drift-review mode
  annotations: z.array(z.object({
    signalId: z.string(),
    classification: z.enum(['true-positive', 'false-positive', 'needs-context']),
    reasoning: z.string(),
  })).optional(),

  // Summary stats
  summary: z.object({
    totalMissed: z.number(),
    missedByCategory: z.record(z.string(), z.number()),
    improvementAreas: z.array(z.string()),
  }),
});

export type Assessment = z.infer<typeof AssessmentSchema>;

// ============================================================================
// Context for Claude
// ============================================================================

export interface AssessmentContext {
  repo: {
    owner: string;
    name: string;
    description?: string;
    language?: string;
    designSystemSignals: string[];
  };

  buoyConfig: string | null;
  buoyOutput: {
    components: number;
    tokens: number;
    driftSignals: number;
  };

  repoStructure: string[];  // Top-level directory listing

  sampledFiles: Array<{
    path: string;
    content: string;
    reason: string;  // Why this file was sampled
  }>;
}
