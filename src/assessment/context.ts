import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { glob } from 'glob';
import type { TestRun } from '../types.js';
import type { AssessmentContext } from './types.js';

export interface ContextBuilderOptions {
  reposDir: string;
  maxFiles: number;
  maxFileSize: number;
  maxTotalSize: number;
}

const DEFAULT_OPTIONS: ContextBuilderOptions = {
  reposDir: './repos',
  maxFiles: 15,
  maxFileSize: 15000,    // 15KB per file
  maxTotalSize: 100000,  // 100KB total
};

export class ContextBuilder {
  private options: ContextBuilderOptions;

  constructor(options: Partial<ContextBuilderOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Build context for Claude assessment
   */
  async buildContext(testRun: TestRun): Promise<AssessmentContext> {
    const { repo, buoyOutput } = testRun;
    const repoPath = join(this.options.reposDir, repo.owner, repo.name);

    // Get repo structure
    const repoStructure = await this.getRepoStructure(repoPath);

    // Read Buoy config if it exists
    const buoyConfig = await this.readBuoyConfig(repoPath);

    // Sample files based on design system signals
    const sampledFiles = await this.sampleFiles(repoPath, repo.designSystemSignals, repoStructure);

    return {
      repo: {
        owner: repo.owner,
        name: repo.name,
        description: repo.description,
        language: repo.language,
        designSystemSignals: repo.designSystemSignals,
      },
      buoyConfig,
      buoyOutput: {
        components: buoyOutput?.scan?.components ?? 0,
        tokens: buoyOutput?.scan?.tokens ?? 0,
        driftSignals: buoyOutput?.drift?.total ?? 0,
      },
      repoStructure,
      sampledFiles,
    };
  }

  /**
   * Get top-level repo structure
   */
  private async getRepoStructure(repoPath: string): Promise<string[]> {
    if (!existsSync(repoPath)) return [];

    const entries = await readdir(repoPath, { withFileTypes: true });
    const structure: string[] = [];

    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.storybook') continue;

      if (entry.isDirectory()) {
        structure.push(`${entry.name}/`);
        // Go one level deeper for key directories
        const subPath = join(repoPath, entry.name);
        if (['src', 'packages', 'apps', 'components', 'lib'].includes(entry.name)) {
          try {
            const subEntries = await readdir(subPath, { withFileTypes: true });
            for (const sub of subEntries.slice(0, 10)) {
              if (sub.name.startsWith('.')) continue;
              structure.push(`  ${entry.name}/${sub.name}${sub.isDirectory() ? '/' : ''}`);
            }
          } catch { /* ignore */ }
        }
      } else {
        structure.push(entry.name);
      }
    }

    return structure;
  }

  /**
   * Read Buoy config
   */
  private async readBuoyConfig(repoPath: string): Promise<string | null> {
    const configPaths = [
      'buoy.config.mjs',
      'buoy.config.js',
      'buoy.config.ts',
      '.buoyrc.json',
    ];

    for (const configPath of configPaths) {
      const fullPath = join(repoPath, configPath);
      if (existsSync(fullPath)) {
        try {
          return await readFile(fullPath, 'utf-8');
        } catch {
          return null;
        }
      }
    }

    return null;
  }

  /**
   * Sample files based on design system signals
   */
  private async sampleFiles(
    repoPath: string,
    signals: string[],
    _structure: string[]
  ): Promise<AssessmentContext['sampledFiles']> {
    const files: AssessmentContext['sampledFiles'] = [];
    let totalSize = 0;

    // Define sampling strategies based on signals
    const strategies: Array<{
      condition: boolean;
      patterns: string[];
      reason: string;
    }> = [
      // Storybook - look for stories and component files
      {
        condition: signals.includes('storybook'),
        patterns: [
          '**/*.stories.tsx',
          '**/*.stories.ts',
          '.storybook/main.ts',
          '.storybook/main.js',
        ],
        reason: 'Storybook component',
      },
      // Design tokens
      {
        condition: signals.includes('design-tokens'),
        patterns: [
          '**/tokens.json',
          '**/tokens/*.json',
          '**/design-tokens/**/*.json',
          '**/theme.ts',
          '**/theme.js',
        ],
        reason: 'Design tokens',
      },
      // UI package
      {
        condition: signals.includes('ui-package'),
        patterns: [
          'packages/ui/src/**/*.tsx',
          'packages/design-system/src/**/*.tsx',
          'packages/components/src/**/*.tsx',
        ],
        reason: 'UI package component',
      },
      // Tailwind theme
      {
        condition: signals.includes('tailwind-theme'),
        patterns: [
          'tailwind.config.js',
          'tailwind.config.ts',
          '**/tailwind.config.js',
        ],
        reason: 'Tailwind config',
      },
      // CSS variables
      {
        condition: signals.includes('css-variables'),
        patterns: [
          '**/variables.css',
          '**/theme.css',
          '**/globals.css',
          '**/tokens.css',
        ],
        reason: 'CSS variables',
      },
      // Fallback - always sample some components
      {
        condition: true,
        patterns: [
          'src/components/**/*.tsx',
          'src/ui/**/*.tsx',
          'components/**/*.tsx',
          'lib/**/*.tsx',
          'app/components/**/*.tsx',
          '**/Button.tsx',
          '**/Input.tsx',
          '**/Card.tsx',
        ],
        reason: 'Component file',
      },
      // Package.json for context
      {
        condition: true,
        patterns: ['package.json'],
        reason: 'Package manifest',
      },
      // README for design system docs
      {
        condition: true,
        patterns: ['README.md', 'docs/README.md'],
        reason: 'Documentation',
      },
    ];

    for (const strategy of strategies) {
      if (!strategy.condition) continue;
      if (files.length >= this.options.maxFiles) break;
      if (totalSize >= this.options.maxTotalSize) break;

      for (const pattern of strategy.patterns) {
        if (files.length >= this.options.maxFiles) break;

        try {
          const matches = await glob(pattern, {
            cwd: repoPath,
            nodir: true,
            ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/*.test.*', '**/*.spec.*'],
          });

          for (const match of matches.slice(0, 3)) {  // Max 3 per pattern
            if (files.length >= this.options.maxFiles) break;
            if (files.some(f => f.path === match)) continue;  // Skip duplicates

            const fullPath = join(repoPath, match);

            try {
              const fileStat = await stat(fullPath);
              if (fileStat.size > this.options.maxFileSize) continue;
              if (totalSize + fileStat.size > this.options.maxTotalSize) continue;

              const content = await readFile(fullPath, 'utf-8');
              files.push({
                path: match,
                content,
                reason: strategy.reason,
              });
              totalSize += fileStat.size;
            } catch {
              // Skip unreadable files
            }
          }
        } catch {
          // Pattern didn't match anything
        }
      }
    }

    return files;
  }
}
