# Buoy Improvement Roadmap

> Generated from comprehensive testing against real-world design system repositories

## Executive Summary

Buoy was tested against **4 major design system repositories**:
- **chakra-ui/chakra-ui** - Popular React component library
- **radix-ui/primitives** - Headless UI component primitives
- **shadcn-ui/ui** - Tailwind-based component registry
- **mantinedev/mantine** - Full-featured React component library

### Overall Findings

| Metric | Value |
|--------|-------|
| Total Missed Patterns | 25 |
| Repositories Tested | 4 |
| Component Detection Rate | 0% (0 components detected across all repos) |
| Token Detection Rate | Partial (found CSS tokens, missed TypeScript/JS tokens) |

### Missed Patterns by Category

| Category | Count | Percentage |
|----------|-------|------------|
| Component | 9 | 36% |
| Token | 6 | 24% |
| Source | 5 | 20% |
| Drift | 5 | 20% |

---

## Priority 1: Critical Scanner Improvements

These issues appeared in **all 4 repositories** and represent fundamental detection gaps.

### 1.1 Monorepo Structure Detection
**Frequency: 4/4 repos** | **Severity: High**

**Problem:** Buoy's default scanning patterns (`src/**/*.tsx`) fail to detect components in monorepo structures where code lives in `packages/*/src/`.

**Evidence:**
- **Radix UI**: Components in `packages/react/` completely missed
- **Chakra UI**: Components in `packages/react/src/components/` not found
- **Mantine**: Components in `packages/@mantine/core/src/components/` undetected
- **shadcn/ui**: Registry variants in `apps/v4/registry/` and `deprecated/www/registry/` missed

**Action Items:**
- [ ] Auto-detect monorepo patterns by scanning for `pnpm-workspace.yaml`, `lerna.json`, or `workspaces` in `package.json`
- [ ] When detected, automatically expand include patterns to cover `packages/*/src/**/*.tsx`
- [ ] Support `apps/*/` and `libs/*/` directory structures common in Nx workspaces
- [ ] Add `--workspace-aware` flag to enable smart monorepo detection

**Estimated Impact:** Would immediately detect 200+ components across tested repos

---

### 1.2 Modern React Component Pattern Detection
**Frequency: 4/4 repos** | **Severity: High**

**Problem:** Buoy only recognizes standard React component patterns but misses modern factory-based patterns.

**Evidence:**
```tsx
// Chakra UI - createRecipeContext pattern (MISSED)
const { withContext, PropsProvider } = createRecipeContext({ key: "button" })
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(...)

// Mantine - polymorphicFactory pattern (MISSED)
export const Button = polymorphicFactory<ButtonFactory>((_props, ref) => {...})

// shadcn/ui - cva pattern (MISSED)
const buttonVariants = cva("inline-flex items-center...", { variants: {...} })
```

**Action Items:**
- [ ] Add detection for `polymorphicFactory<T>()` pattern (Mantine)
- [ ] Add detection for `createRecipeContext()` and `createSlotRecipeContext()` patterns (Chakra)
- [ ] Add detection for `cva()` (class-variance-authority) patterns (shadcn/ui)
- [ ] Add detection for `withContext<T>()` and `withProvider<T>()` patterns
- [ ] Detect `React.forwardRef` with `displayName` assignments
- [ ] Create a component pattern registry that can be extended via config

**Estimated Impact:** Would catch 100+ components per repo using these patterns

---

### 1.3 Third-Party UI Primitive Wrapper Detection
**Frequency: 3/4 repos** | **Severity: High**

**Problem:** Design systems often wrap primitives from Radix, Ark UI, or other libraries. These wrappers are components but not detected.

**Evidence:**
```tsx
// Chakra UI wrapping Ark UI
export const Input = withContext<HTMLInputElement, InputProps>(ArkField.Input)

// Components importing from @ark-ui/react, @radix-ui/react-*
import * as DialogPrimitive from "@radix-ui/react-dialog"
```

**Action Items:**
- [ ] Detect components that wrap imports from `@radix-ui/*`, `@ark-ui/*`, `@headlessui/*`
- [ ] Recognize re-export patterns with styled wrappers
- [ ] Track primitive dependencies in component metadata

**Estimated Impact:** Would identify primitive-based components and their relationships

---

### 1.4 Compound Component Detection
**Frequency: 2/4 repos** | **Severity: Medium**

**Problem:** Components with sub-components (Button.Group, Card.Section) are not recognized.

**Evidence:**
```tsx
// Mantine compound components
Button.classes = classes;
Button.displayName = '@mantine/core/Button';
Button.Group = ButtonGroup;
Button.GroupSection = ButtonGroupSection;
```

**Action Items:**
- [ ] Detect static property assignments creating compound component APIs
- [ ] Map relationships between parent and child components
- [ ] Include compound components in component inventory

**Estimated Impact:** Would identify 50+ sub-component relationships

---

## Priority 2: Token Parser Improvements

### 2.1 Token File Validation and Error Reporting
**Frequency: 3/4 repos** | **Severity: High**

**Problem:** When token files specified in config don't exist, Buoy fails silently with 0 tokens detected.

**Evidence:**
```javascript
// buoy.config.mjs - files may not exist at these paths
files: [
  'apps/www/public/r/theme/tokens.json',  // May not exist
  'packages/react/src/theme/index.ts'
]
```

**Action Items:**
- [ ] Validate token file paths exist before scanning
- [ ] Emit clear warning: `"Warning: Token file 'path/to/tokens.json' not found"`
- [ ] Provide suggestions for similar files that might be intended
- [ ] Add `--strict` mode that fails on missing token files

**Estimated Impact:** Would prevent silent failures and improve debugging

---

### 2.2 TypeScript Token Type Detection
**Frequency: 2/4 repos** | **Severity: Medium**

**Problem:** Design tokens defined as TypeScript types are not detected.

**Evidence:**
```typescript
// Mantine CSS variable types (MISSED)
export type ButtonCssVariables = {
  root:
    | '--button-justify'
    | '--button-height'
    | '--button-padding-x'
    | '--button-fz'
    | '--button-radius';
};
```

**Action Items:**
- [ ] Parse TypeScript union types for CSS custom property strings (`--*`)
- [ ] Detect `*CssVariables` type patterns
- [ ] Extract token names from type definitions

**Estimated Impact:** Would catch 50+ token definitions per repo

---

### 2.3 Semantic Tailwind Token Extraction
**Frequency: 1/4 repos** | **Severity: Medium**

**Problem:** Semantic design tokens in Tailwind class strings are not extracted.

**Evidence:**
```tsx
// shadcn/ui semantic tokens in classes (MISSED)
"bg-primary text-primary-foreground hover:bg-primary/90"
"bg-destructive text-destructive-foreground"
"border border-input bg-background"
```

**Action Items:**
- [ ] Parse Tailwind class strings for semantic token references
- [ ] Extract `bg-{token}`, `text-{token}`, `border-{token}` patterns
- [ ] Map semantic tokens to their CSS variable definitions
- [ ] Flag usage of non-semantic tokens (e.g., `bg-blue-500` vs `bg-primary`)

**Estimated Impact:** Would identify 100+ semantic token usages

---

### 2.4 Design Token Dependency Analysis
**Frequency: 1/4 repos** | **Severity: Low**

**Problem:** Tokens from npm dependencies are not analyzed.

**Evidence:**
```json
// Radix UI depends on color system package
"@radix-ui/colors": "^3.0.0"
```

**Action Items:**
- [ ] Detect design-related dependencies (`*colors*`, `*tokens*`, `*theme*`)
- [ ] Parse and extract token values from installed packages
- [ ] Include dependency tokens in analysis with proper attribution

**Estimated Impact:** Would catch hundreds of inherited tokens

---

## Priority 3: Configuration Improvements

### 3.1 Smart Default Patterns
**Frequency: 4/4 repos** | **Severity: High**

**Problem:** Default include/exclude patterns don't work for common design system structures.

**Action Items:**
- [ ] Add framework presets: `react`, `vue`, `angular`, `svelte`
- [ ] Include common paths by default:
  ```javascript
  {
    react: [
      'src/**/*.{tsx,jsx}',
      'packages/*/src/**/*.{tsx,jsx}',
      'components/**/*.{tsx,jsx}',
      'lib/**/*.{tsx,jsx}'
    ]
  }
  ```
- [ ] Auto-detect framework from `package.json` dependencies

**Estimated Impact:** Would work out-of-the-box for 80% of repos

---

### 3.2 Registry/Variant Directory Detection
**Frequency: 1/4 repos** | **Severity: Medium**

**Problem:** Component registry structures with multiple variants are not recognized.

**Evidence:**
```
shadcn/ui registry structure:
  deprecated/www/registry/default/ui/
  deprecated/www/registry/new-york/ui/
  apps/v4/registry/new-york-v4/ui/
```

**Action Items:**
- [ ] Detect `*/registry/*/` directory patterns
- [ ] Recognize UI variant naming (default, new-york, etc.)
- [ ] Include all variants in component scanning
- [ ] Support variant comparison in drift detection

**Estimated Impact:** Would catch all component variants automatically

---

### 3.3 Framework-Specific Component Patterns Configuration
**Frequency: 2/4 repos** | **Severity: Medium**

**Problem:** No way to configure detection of library-specific component patterns.

**Action Items:**
- [ ] Add `componentPatterns` config option:
  ```javascript
  {
    componentPatterns: [
      { name: 'mantine', pattern: 'polymorphicFactory<' },
      { name: 'chakra', pattern: 'createRecipeContext' },
      { name: 'cva', pattern: 'cva(' }
    ]
  }
  ```
- [ ] Allow custom regex patterns for component detection
- [ ] Support pattern presets (Mantine, Chakra, shadcn, Radix)

**Estimated Impact:** Would enable support for any component library pattern

---

## Priority 4: Drift Detection Improvements

### 4.1 Cross-Variant Consistency Checking
**Frequency: 2/4 repos** | **Severity: Medium**

**Problem:** Drift between component variants is not detected.

**Evidence:**
```tsx
// shadcn/ui button height drift
// Default: h-10 px-4 py-2
// New York: h-9 px-4 py-2

// Focus ring implementation drift
// V4: focus-visible:ring-[3px]
// Default: focus-visible:ring-2
// New York: focus-visible:ring-1
```

**Action Items:**
- [ ] Compare same-named components across variant directories
- [ ] Flag differences in sizing, spacing, and styling values
- [ ] Generate drift report showing variant inconsistencies
- [ ] Support intentional drift marking (some differences may be by design)

**Estimated Impact:** Would catch 10-20 drift instances per component library

---

### 4.2 Design Token Utility Function Detection
**Frequency: 2/4 repos** | **Severity: Medium**

**Problem:** Inconsistent usage of token utility functions vs hardcoded values not flagged.

**Evidence:**
```tsx
// Mantine - mixed usage patterns
'--card-padding': getSpacing(padding),  // Good - using utility
duration={150}                           // Bad - hardcoded value
size="calc(var(--button-height) / 1.8)" // Bad - magic number ratio
```

**Action Items:**
- [ ] Detect design token utility functions (`getSpacing`, `getRadius`, `getFontSize`)
- [ ] Flag hardcoded values that could use utilities
- [ ] Identify magic numbers in calculations
- [ ] Suggest token alternatives for hardcoded values

**Estimated Impact:** Would improve token adoption consistency

---

### 4.3 Example Code vs Production Code Analysis
**Frequency: 2/4 repos** | **Severity: Low**

**Problem:** Storybook stories excluded from drift analysis, but they show intended usage patterns.

**Evidence:**
```javascript
// Current config excludes stories entirely
exclude: ['**/*.test.*', '**/*.spec.*', '**/*.stories.*']
```

**Action Items:**
- [ ] Include stories in analysis but mark as "example usage"
- [ ] Use story patterns to understand intended token usage
- [ ] Compare production code against story examples
- [ ] Generate "example compliance" score

**Estimated Impact:** Would improve drift detection accuracy

---

### 4.4 Hardcoded Styling Value Detection
**Frequency: 2/4 repos** | **Severity: Low**

**Problem:** Hardcoded values in component props that should use design tokens.

**Evidence:**
```tsx
// Chakra UI - hardcoded props
<Box padding="6" borderWidth="1px" rounded="lg" />

// Should potentially be:
<Box padding={tokens.spacing[6]} borderWidth={tokens.border.width} />
```

**Action Items:**
- [ ] Detect hardcoded numeric values in styling props
- [ ] Detect hardcoded color values (hex, rgb, named)
- [ ] Suggest design token alternatives
- [ ] Configure acceptable hardcoded values (0, 100%, etc.)

**Estimated Impact:** Would identify token adoption gaps

---

## Priority 5: Source Detection Improvements

### 5.1 Storybook Configuration Parsing
**Frequency: 2/4 repos** | **Severity: Medium**

**Problem:** Dynamic Storybook configurations not properly parsed.

**Evidence:**
```typescript
// Mantine .storybook/main.ts - dynamic paths (MISSED)
function getStoryPaths(fileName = '*') {
  return getGlobPaths([
    getPath(`packages/@mantine/*/src/**/${fileName}.story.@(ts|tsx)`),
  ]);
}
```

**Action Items:**
- [ ] Parse Storybook `main.ts`/`main.js` config files
- [ ] Resolve dynamic story path generators
- [ ] Support glob patterns in story discovery

**Estimated Impact:** Would discover all Storybook stories

---

### 5.2 Internal Tooling Detection
**Frequency: 1/4 repos** | **Severity: Low**

**Problem:** Internal design system tooling and utilities not scanned.

**Evidence:**
```
radix-ui/primitives:
  internal/  - Contains design system build tools
```

**Action Items:**
- [ ] Scan `internal/`, `tools/`, `scripts/` directories
- [ ] Detect token generators and build configurations
- [ ] Identify design system infrastructure code

**Estimated Impact:** Would provide complete design system overview

---

## Implementation Roadmap

### Phase 1: Critical Fixes (Weeks 1-2)
1. Monorepo structure detection
2. Token file validation and error reporting
3. Smart default patterns

### Phase 2: Core Pattern Support (Weeks 3-4)
1. `polymorphicFactory` pattern detection
2. `createRecipeContext` pattern detection
3. `cva()` pattern detection
4. `forwardRef` with `displayName` detection

### Phase 3: Enhanced Detection (Weeks 5-6)
1. TypeScript CSS variable type detection
2. Third-party primitive wrapper detection
3. Compound component detection

### Phase 4: Drift Analysis (Weeks 7-8)
1. Cross-variant consistency checking
2. Token utility function detection
3. Hardcoded value flagging

### Phase 5: Polish (Weeks 9-10)
1. Semantic Tailwind token extraction
2. Storybook configuration parsing
3. Example code analysis

---

## Success Metrics

After implementing this roadmap, Buoy should achieve:

| Metric | Current | Target |
|--------|---------|--------|
| Component detection rate | 0% | >90% |
| Token detection rate | ~50% | >95% |
| Monorepo support | None | Full |
| Modern pattern coverage | None | 5+ patterns |
| Drift detection accuracy | Unknown | >80% |

---

## Appendix: Test Repositories

| Repository | Stars | Components | Patterns Used |
|------------|-------|------------|---------------|
| chakra-ui/chakra-ui | 38k+ | 50+ | createRecipeContext, Ark UI wrappers |
| radix-ui/primitives | 16k+ | 30+ | Standard React, TypeScript |
| shadcn-ui/ui | 75k+ | 40+ | cva, forwardRef, registry variants |
| mantinedev/mantine | 27k+ | 100+ | polymorphicFactory, compound components |
