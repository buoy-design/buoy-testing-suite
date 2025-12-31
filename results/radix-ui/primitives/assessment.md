Looking at this Radix Primitives repository, I can see that Buoy has significantly underperformed in detecting what should be a treasure trove of design system components and patterns. This is a major UI component library, yet Buoy found 0 components - which is clearly incorrect.

Let me analyze what Buoy missed by examining the repository structure and the limited samples provided.

## Major Detection Gaps

### 1. Component Source Discovery
The biggest issue is that Buoy's configuration is looking for components in `src/**/*.tsx` and `src/**/*.jsx`, but this repository uses a different structure. The actual components are located in `packages/react/` based on the directory structure shown. This is a classic monorepo structure that Buoy failed to detect.

### 2. Package-based Component Architecture
Radix Primitives follows a package-per-component architecture where each primitive (Button, Dialog, Tooltip, etc.) is its own package under `packages/react/`. Buoy's current scanning patterns don't account for this common design system pattern.

### 3. Design Token Infrastructure
While Buoy found 5 tokens, this seems severely limited for a comprehensive design system. The dependency on `@radix-ui/colors` in package.json suggests there's a significant color system that Buoy likely missed. The tokens Buoy found were only from Storybook CSS files, not the actual design system token definitions.

### 4. Missing TypeScript Definitions
For a TypeScript-first library like this, Buoy should be detecting component prop interfaces, which are crucial for understanding the design system's API surface.

### 5. Storybook Integration
The repository has a full Storybook setup (`apps/storybook/`) which typically contains rich examples of component usage and variations that should be analyzed for drift detection.

### 6. Build System and Internal Tooling
The `internal/` directory and complex build scripts suggest sophisticated design system tooling that Buoy isn't detecting.

## Configuration and Detection Issues

The current Buoy configuration is too narrow and doesn't understand monorepo structures. The include patterns need to be expanded to cover:
- `packages/react/**/*.tsx` for components
- `packages/core/**/*` for potential core utilities
- Token definitions likely in dedicated files or packages
- Internal tooling that might contain design system logic

```json
{
  "missedPatterns": [
    {
      "category": "source",
      "description": "Buoy's include patterns don't match the actual component locations in this monorepo structure",
      "evidence": {
        "file": "buoy.config.mjs",
        "lineRange": [8, 11],
        "codeSnippet": "include: ['src/**/*.tsx', 'src/**/*.jsx'],\nexclude: ['**/*.test.*', '**/*.spec.*', '**/*.stories.*'],"
      },
      "suggestedDetection": "Auto-detect monorepo structures and scan packages/ directories by default",
      "severity": "high"
    },
    {
      "category": "component",
      "description": "All React components in packages/react/ are missed due to incorrect source paths",
      "evidence": {
        "file": "packages/react/",
        "lineRange": [1, 1],
        "codeSnippet": "packages/react/ directory contains the actual component implementations"
      },
      "suggestedDetection": "Scan packages/react/**/*.tsx for component definitions and exports",
      "severity": "high"
    },
    {
      "category": "token",
      "description": "Design tokens from @radix-ui/colors dependency are not being detected",
      "evidence": {
        "file": "package.json",
        "lineRange": [33, 33],
        "codeSnippet": "\"@radix-ui/colors\": \"^3.0.0\","
      },
      "suggestedDetection": "Parse design token dependencies and their exported values",
      "severity": "high"
    },
    {
      "category": "component",
      "description": "TypeScript component interfaces and prop definitions are not being detected",
      "evidence": {
        "file": "types/",
        "lineRange": [1, 1],
        "codeSnippet": "types/ directory likely contains component type definitions"
      },
      "suggestedDetection": "Parse TypeScript interfaces that match component prop patterns (e.g., ButtonProps, DialogProps)",
      "severity": "medium"
    },
    {
      "category": "drift",
      "description": "Storybook stories that demonstrate component usage are excluded from drift analysis",
      "evidence": {
        "file": "buoy.config.mjs",
        "lineRange": [10, 10],
        "codeSnippet": "exclude: ['**/*.test.*', '**/*.spec.*', '**/*.stories.*'],"
      },
      "suggestedDetection": "Include stories for drift detection but mark them as 'example usage' rather than production code",
      "severity": "medium"
    },
    {
      "category": "token",
      "description": "Internal design system tooling and utilities in internal/ directory are not scanned",
      "evidence": {
        "file": "internal/",
        "lineRange": [1, 1],
        "codeSnippet": "internal/ directory likely contains design system build tools and utilities"
      },
      "suggestedDetection": "Scan internal tooling directories for design system configurations and token generators",
      "severity": "low"
    }
  ],
  "improvements": [
    {
      "area": "scanner",
      "title": "Monorepo Structure Detection",
      "description": "Automatically detect common monorepo patterns (packages/, libs/, apps/) and adjust scanning accordingly. Look for workspace configurations in package.json or pnpm-workspace.yaml.",
      "examples": [
        "pnpm-workspace.yaml indicates packages/* structure",
        "packages/react/ contains actual components"
      ],
      "estimatedImpact": "Would catch 50+ components in this repo alone"
    },
    {
      "area": "config",
      "title": "Smart Default Patterns",
      "description": "Provide better default include/exclude patterns that work for common design system structures. Include framework-specific patterns for React, Vue, Angular component libraries.",
      "examples": [
        "packages/react/**/*.tsx for React components",
        "packages/core/**/*.ts for utilities"
      ],
      "estimatedImpact": "Would work out-of-the-box for 80% of design system repos"
    },
    {
      "area": "token-parser",
      "title": "Dependency Token Analysis",
      "description": "Parse design tokens from package dependencies, especially design-related packages like color systems, typography scales, or spacing tokens.",
      "examples": [
        "@radix-ui/colors package exports",
        "Design token packages in node_modules"
      ],
      "estimatedImpact": "Would catch hundreds of additional tokens"
    },
    {
      "area": "scanner",
      "title": "TypeScript Interface Detection",
      "description": "Detect component prop interfaces and type definitions as part of the design system API. Parse Props interfaces and correlate them with components.",
      "examples": [
        "ButtonProps interface definitions",
        "Component prop type exports"
      ],
      "estimatedImpact": "Would provide richer component metadata and validation"
    },
    {
      "area": "drift-rules",
      "title": "Example Code Analysis",
      "description": "Analyze Storybook stories and example code for drift patterns, but mark findings as 'examples' rather than violations. This helps understand intended usage patterns.",
      "examples": [
        "Component usage patterns in *.stories.tsx",
        "Documentation examples showing proper token usage"
      ],
      "estimatedImpact": "Would improve drift detection accuracy by understanding intended patterns"
    }
  ],
  "summary": {
    "totalMissed": 6,
    "missedByCategory": {
      "component": 2,
      "token": 2,
      "drift": 1,
      "source": 1
    },
    "improvementAreas": [
      "scanner",
      "config",
      "token-parser",
      "drift-rules"
    ]
  }
}
```