# Buoy Test: darekkay/dashboard

**Score:** 8 | **Tested:** 2026-01-17 | **Buoy:** 0.2.5

**Status:** Completed successfully

## Design System Sources

- admin-panel

## Scan Results

| Type | Found | Coverage |
|------|-------|----------|
| Components | 65 | N/A |
| Tokens | 0 | N/A |

## Drift Signals

- **0** critical
- **16** warning
- **5** info

### By Type

| Type | Count |
|------|-------|
| semantic-mismatch | 16 |
| hardcoded-value | 5 |

### Top Issues

1. `semantic-mismatch` in `app/src/widgets/youtube-stats/configuration.tsx:7`
   Prop "props" in "Configuration" uses type "ConfigurationProps<WidgetOptions>" but other components use "Props"
2. `semantic-mismatch` in `app/src/widgets/website/configuration.tsx:9`
   Prop "props" in "Configuration" uses type "ConfigurationProps<WidgetOptions>" but other components use "Props"
3. `semantic-mismatch` in `app/src/widgets/weather/configuration.tsx:8`
   Prop "props" in "Configuration" uses type "ConfigurationProps<WidgetOptions>" but other components use "Props"
4. `hardcoded-value` in `app/src/widgets/totd-world-countries/index.tsx:11`
   Component "TotdWorldCountries" has 1 hardcoded size value: 50px
5. `semantic-mismatch` in `app/src/widgets/text/configuration.tsx:7`
   Prop "props" in "Configuration" uses type "ConfigurationProps<WidgetOptions>" but other components use "Props"
6. `semantic-mismatch` in `app/src/widgets/search/configuration.tsx:9`
   Prop "props" in "Configuration" uses type "ConfigurationProps<WidgetOptions>" but other components use "Props"
7. `semantic-mismatch` in `app/src/widgets/qr-code/configuration.tsx:8`
   Prop "props" in "Configuration" uses type "ConfigurationProps<WidgetOptions>" but other components use "Props"
8. `semantic-mismatch` in `app/src/widgets/image/configuration.tsx:7`
   Prop "props" in "Configuration" uses type "ConfigurationProps<WidgetOptions>" but other components use "Props"
9. `semantic-mismatch` in `app/src/widgets/github-stats/configuration.tsx:7`
   Prop "props" in "Configuration" uses type "ConfigurationProps<WidgetOptions>" but other components use "Props"
10. `semantic-mismatch` in `app/src/widgets/day-countdown/configuration.tsx:8`
   Prop "props" in "Configuration" uses type "ConfigurationProps<WidgetOptions>" but other components use "Props"

---

## Metadata

- **Repository:** [darekkay/dashboard](https://github.com/darekkay/dashboard)
- **Stars:** 197
- **Default Branch:** master
- **Language:** TypeScript
- **Duration:** 3.6s
- **Config Generated:** No
