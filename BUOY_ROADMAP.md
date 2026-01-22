# Buoy Improvement Roadmap

> Generated from comprehensive testing against real-world design system repositories
>
> **Last Updated:** January 2025

## Executive Summary

Buoy was tested against **4 major design system repositories**:
- **chakra-ui/chakra-ui** - Popular React component library
- **radix-ui/primitives** - Headless UI component primitives
- **shadcn-ui/ui** - Tailwind-based component registry
- **mantinedev/mantine** - Full-featured React component library

### Implementation Progress

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Critical Fixes | ✅ Complete | 100% |
| Phase 2: Core Pattern Support | ✅ Complete | 100% |
| Phase 3: Enhanced Detection | 🟡 Partial | 66% |
| Phase 4: Drift Analysis | ❌ Not Started | 0% |
| Phase 5: Polish | 🟡 Partial | 33% |

### Current Metrics

| Metric | Initial | Current | Target |
|--------|---------|---------|--------|
| Component detection rate | 0% | ~70% | >90% |
| Token detection rate | ~50% | ~80% | >95% |
| Monorepo support | None | ✅ Full | Full |
| Modern pattern coverage | None | ✅ 5+ patterns | 5+ patterns |
| Drift detection accuracy | Unknown | ~50% | >80% |

---

## Priority 1: Critical Scanner Improvements

### 1.1 Monorepo Structure Detection ✅ COMPLETE
**Frequency: 4/4 repos** | **Severity: High**

**Problem:** Buoy's default scanning patterns (`src/**/*.tsx`) fail to detect components in monorepo structures where code lives in `packages/*/src/`.

**Implementation:** `MONOREPO_PATTERNS` constant in `packages/scanners/src/base/scanner.ts`

```typescript
export const MONOREPO_PATTERNS = [
  "packages/*/src/**",
  "packages/*/*/src/**",
  "apps/*/src/**",
  "libs/*/src/**",
  "tools/*/src/**",
  "examples/*/src/**",
  "website/src/**",
  "docs/src/**",
  "sandbox/*/src/**",
];
```

**Action Items:**
- [x] Support `packages/*/src/**/*.tsx` patterns
- [x] Support `apps/*/` and `libs/*/` directory structures common in Nx workspaces
- [x] Support nested patterns like `packages/*/*/src/**`
- [ ] Auto-detect monorepo patterns by scanning for `pnpm-workspace.yaml`, `lerna.json`, or `workspaces` in `package.json`
- [ ] Add `--workspace-aware` flag to enable smart monorepo detection

---

### 1.2 Modern React Component Pattern Detection ✅ COMPLETE
**Frequency: 4/4 repos** | **Severity: High**

**Problem:** Buoy only recognizes standard React component patterns but misses modern factory-based patterns.

**Implementation:** `packages/scanners/src/git/react-scanner.ts` - `isReactComponentExpression()`

**Action Items:**
- [x] Add detection for `polymorphicFactory<T>()` pattern (Mantine)
- [x] Add detection for `createRecipeContext()` and `createSlotRecipeContext()` patterns (Chakra)
- [x] Add detection for `cva()` (class-variance-authority) patterns (shadcn/ui)
- [x] Add detection for `withContext<T>()` and `withProvider<T>()` patterns
- [x] Detect `React.forwardRef` with `displayName` assignments
- [x] Detect `factory<T>()` pattern
- [ ] Create a component pattern registry that can be extended via config

---

### 1.3 Third-Party UI Primitive Wrapper Detection ❌ TODO
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

---

### 1.4 Compound Component Detection ✅ COMPLETE
**Frequency: 2/4 repos** | **Severity: Medium**

**Problem:** Components with sub-components (Button.Group, Card.Section) are not recognized.

**Implementation:** `packages/scanners/src/git/react-scanner.ts` - Full compound component support

**Action Items:**
- [x] Detect static property assignments creating compound component APIs
- [x] Map relationships between parent and child components
- [x] Include compound components in component inventory
- [x] Support `Object.assign(Component, { Sub })` pattern
- [x] Support namespace export patterns
- [x] Tag components with `compound-component` and `compound-component-namespace`

---

## Priority 2: Token Parser Improvements

### 2.1 Token File Validation and Error Reporting 🟡 PARTIAL
**Frequency: 3/4 repos** | **Severity: High**

**Problem:** When token files specified in config don't exist, Buoy fails silently with 0 tokens detected.

**Action Items:**
- [ ] Validate token file paths exist before scanning
- [ ] Emit clear warning: `"Warning: Token file 'path/to/tokens.json' not found"`
- [ ] Provide suggestions for similar files that might be intended
- [ ] Add `--strict` mode that fails on missing token files

---

### 2.2 TypeScript Token Type Detection ✅ COMPLETE
**Frequency: 2/4 repos** | **Severity: Medium**

**Problem:** Design tokens defined as TypeScript types are not detected.

**Implementation:** `packages/scanners/src/git/token-scanner.ts` - TypeScript union type parsing

**Action Items:**
- [x] Parse TypeScript union types for CSS custom property strings (`--*`)
- [x] Detect `*CssVariables` type patterns
- [x] Extract token names from type definitions
- [x] Support `TypeScriptTokenSource` metadata

---

### 2.3 Semantic Tailwind Token Extraction ✅ COMPLETE
**Frequency: 1/4 repos** | **Severity: Medium**

**Problem:** Semantic design tokens in Tailwind class strings are not extracted.

**Implementation:** `packages/scanners/src/tailwind/arbitrary-detector.ts`

**Action Items:**
- [x] Parse Tailwind class strings for semantic token references
- [x] Extract `bg-{token}`, `text-{token}`, `border-{token}` patterns
- [x] Support Tailwind v4 CSS variable syntax: `w-(--button-width)`
- [x] Support bracket syntax: `w-[var(--button-width)]`
- [ ] Map semantic tokens to their CSS variable definitions
- [ ] Flag usage of non-semantic tokens (e.g., `bg-blue-500` vs `bg-primary`)

---

### 2.4 Design Token Dependency Analysis ❌ TODO
**Frequency: 1/4 repos** | **Severity: Low**

**Problem:** Tokens from npm dependencies are not analyzed.

**Action Items:**
- [ ] Detect design-related dependencies (`*colors*`, `*tokens*`, `*theme*`)
- [ ] Parse and extract token values from installed packages
- [ ] Include dependency tokens in analysis with proper attribution

---

## Priority 3: Configuration Improvements

### 3.1 Smart Default Patterns 🟡 PARTIAL
**Frequency: 4/4 repos** | **Severity: High**

**Problem:** Default include/exclude patterns don't work for common design system structures.

**Action Items:**
- [x] Include monorepo paths by default via `MONOREPO_PATTERNS`
- [ ] Add framework presets: `react`, `vue`, `angular`, `svelte`
- [ ] Auto-detect framework from `package.json` dependencies

---

### 3.2 Registry/Variant Directory Detection ❌ TODO
**Frequency: 1/4 repos** | **Severity: Medium**

**Problem:** Component registry structures with multiple variants are not recognized.

**Action Items:**
- [ ] Detect `*/registry/*/` directory patterns
- [ ] Recognize UI variant naming (default, new-york, etc.)
- [ ] Include all variants in component scanning
- [ ] Support variant comparison in drift detection

---

### 3.3 Framework-Specific Component Patterns Configuration ❌ TODO
**Frequency: 2/4 repos** | **Severity: Medium**

**Problem:** No way to configure detection of library-specific component patterns.

**Action Items:**
- [ ] Add `componentPatterns` config option
- [ ] Allow custom regex patterns for component detection
- [ ] Support pattern presets (Mantine, Chakra, shadcn, Radix)

---

## Priority 4: Drift Detection Improvements ❌ NOT STARTED

### 4.1 Cross-Variant Consistency Checking
**Frequency: 2/4 repos** | **Severity: Medium**

**Action Items:**
- [ ] Compare same-named components across variant directories
- [ ] Flag differences in sizing, spacing, and styling values
- [ ] Generate drift report showing variant inconsistencies
- [ ] Support intentional drift marking (some differences may be by design)

---

### 4.2 Design Token Utility Function Detection
**Frequency: 2/4 repos** | **Severity: Medium**

**Action Items:**
- [ ] Detect design token utility functions (`getSpacing`, `getRadius`, `getFontSize`)
- [ ] Flag hardcoded values that could use utilities
- [ ] Identify magic numbers in calculations
- [ ] Suggest token alternatives for hardcoded values

---

### 4.3 Example Code vs Production Code Analysis
**Frequency: 2/4 repos** | **Severity: Low**

**Action Items:**
- [ ] Include stories in analysis but mark as "example usage"
- [ ] Use story patterns to understand intended token usage
- [ ] Compare production code against story examples
- [ ] Generate "example compliance" score

---

### 4.4 Hardcoded Styling Value Detection
**Frequency: 2/4 repos** | **Severity: Low**

**Action Items:**
- [ ] Detect hardcoded numeric values in styling props
- [ ] Detect hardcoded color values (hex, rgb, named)
- [ ] Suggest design token alternatives
- [ ] Configure acceptable hardcoded values (0, 100%, etc.)

---

## Priority 5: Source Detection Improvements

### 5.1 Storybook Configuration Parsing ❌ TODO
**Frequency: 2/4 repos** | **Severity: Medium**

**Action Items:**
- [ ] Parse Storybook `main.ts`/`main.js` config files
- [ ] Resolve dynamic story path generators
- [ ] Support glob patterns in story discovery

---

### 5.2 Internal Tooling Detection ❌ TODO
**Frequency: 1/4 repos** | **Severity: Low**

**Action Items:**
- [ ] Scan `internal/`, `tools/`, `scripts/` directories
- [ ] Detect token generators and build configurations
- [ ] Identify design system infrastructure code

---

## Implementation Summary

### ✅ Completed (Phases 1-2)

| Feature | Location |
|---------|----------|
| Monorepo patterns | `base/scanner.ts` - `MONOREPO_PATTERNS` |
| `forwardRef` detection | `git/react-scanner.ts` |
| `polymorphicFactory` detection | `git/react-scanner.ts` |
| `createRecipeContext` detection | `git/react-scanner.ts` |
| `cva()` detection | `git/react-scanner.ts` |
| `withContext/withProvider` detection | `git/react-scanner.ts` |
| Compound components | `git/react-scanner.ts` |
| TypeScript token types | `git/token-scanner.ts` |
| Tailwind CSS variable syntax | `tailwind/arbitrary-detector.ts` |

### 🟡 In Progress (Phase 3)

| Feature | Status |
|---------|--------|
| Third-party primitive wrappers | Not started |
| Token file validation | Partial |
| Smart default patterns | Partial (monorepo done, framework presets TODO) |

### ❌ Not Started (Phases 4-5)

- Cross-variant consistency checking
- Token utility function detection
- Hardcoded value flagging
- Registry/variant directory detection
- Storybook config parsing
- Example code analysis

---

## Appendix: Test Repositories

| Repository | Stars | Components | Patterns Used |
|------------|-------|------------|---------------|
| chakra-ui/chakra-ui | 38k+ | 50+ | createRecipeContext, Ark UI wrappers |
| radix-ui/primitives | 16k+ | 30+ | Standard React, TypeScript |
| shadcn-ui/ui | 75k+ | 40+ | cva, forwardRef, registry variants |
| mantinedev/mantine | 27k+ | 100+ | polymorphicFactory, compound components |
