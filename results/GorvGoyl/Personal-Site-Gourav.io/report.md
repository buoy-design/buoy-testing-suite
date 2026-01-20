# Buoy Test: GorvGoyl/Personal-Site-Gourav.io

**Score:** 6 | **Tested:** 2026-01-17 | **Buoy:** 0.2.5

**Status:** Completed successfully

## Design System Sources

- blog-app

## Scan Results

| Type | Found | Coverage |
|------|-------|----------|
| Components | 58 | N/A |
| Tokens | 0 | N/A |

## Drift Signals

- **0** critical
- **2** warning
- **3** info

### By Type

| Type | Count |
|------|-------|
| hardcoded-value | 4 |
| naming-inconsistency | 1 |

### Top Issues

1. `hardcoded-value` in `components/twitterEmbed.tsx:4`
   Component "TweetEmbed" has 1 hardcoded color: #1da1f2
2. `hardcoded-value` in `components/notionBoost.tsx:120`
   Component "Social" has 1 hardcoded color: #FA5252
3. `hardcoded-value` in `components/icons/TerminalIcon.tsx:3`
   Component "TerminalIcon" has 2 hardcoded size values: 1em, 1em
4. `hardcoded-value` in `components/icons/ArrowNorthEastIcon.tsx:3`
   Component "ArrowNorthEastIcon" has 2 hardcoded size values: 1em, 1em
5. `naming-inconsistency` in `lib/localContentUtils.tsx:1`
   Component "process.env.ESBUILD_BINARY_PATH" uses other but 98% of components use PascalCase

---

## Metadata

- **Repository:** [GorvGoyl/Personal-Site-Gourav.io](https://github.com/GorvGoyl/Personal-Site-Gourav.io)
- **Stars:** 130
- **Default Branch:** main
- **Language:** TypeScript
- **Duration:** 3.2s
- **Config Generated:** No
