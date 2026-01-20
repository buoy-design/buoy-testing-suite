I ran Buoy (a design drift detection tool) on the open source repository **darekkay/dashboard**.

Please analyze the results and help me understand:
1. Are these drift signals accurate or false positives?
2. What patterns did Buoy miss that it should have caught?
3. How can we improve Buoy's detection for this type of codebase?

<repository_context>
URL: https://github.com/darekkay/dashboard
Stars: 197
Language: TypeScript
Design System Signals: admin-panel
Score: 8
</repository_context>

<scan_results>
Components detected: 65
Tokens detected: 0
Sources scanned: 
</scan_results>

<drift_signals>
Total: 21

By type:
  - semantic-mismatch: 16
  - hardcoded-value: 5

Top signals:

  Signal ID: drift:semantic-mismatch:react:app/src/widgets/youtube-stats/configuration.tsx:Configuration:props
  Type: semantic-mismatch
  Severity: warning
  Message: Prop "props" in "Configuration" uses type "ConfigurationProps<WidgetOptions>" but other components use "Props"
  Location: app/src/widgets/youtube-stats/configuration.tsx:7
  Expected: "Props"
  Actual: "ConfigurationProps<WidgetOptions>"

  Signal ID: drift:semantic-mismatch:react:app/src/widgets/website/configuration.tsx:Configuration:props
  Type: semantic-mismatch
  Severity: warning
  Message: Prop "props" in "Configuration" uses type "ConfigurationProps<WidgetOptions>" but other components use "Props"
  Location: app/src/widgets/website/configuration.tsx:9
  Expected: "Props"
  Actual: "ConfigurationProps<WidgetOptions>"

  Signal ID: drift:semantic-mismatch:react:app/src/widgets/weather/configuration.tsx:Configuration:props
  Type: semantic-mismatch
  Severity: warning
  Message: Prop "props" in "Configuration" uses type "ConfigurationProps<WidgetOptions>" but other components use "Props"
  Location: app/src/widgets/weather/configuration.tsx:8
  Expected: "Props"
  Actual: "ConfigurationProps<WidgetOptions>"

  Signal ID: drift:hardcoded-value:react:app/src/widgets/totd-world-countries/index.tsx:TotdWorldCountries:spacing
  Type: hardcoded-value
  Severity: info
  Message: Component "TotdWorldCountries" has 1 hardcoded size value: 50px
  Location: app/src/widgets/totd-world-countries/index.tsx:11

  Signal ID: drift:semantic-mismatch:react:app/src/widgets/text/configuration.tsx:Configuration:props
  Type: semantic-mismatch
  Severity: warning
  Message: Prop "props" in "Configuration" uses type "ConfigurationProps<WidgetOptions>" but other components use "Props"
  Location: app/src/widgets/text/configuration.tsx:7
  Expected: "Props"
  Actual: "ConfigurationProps<WidgetOptions>"

  Signal ID: drift:semantic-mismatch:react:app/src/widgets/search/configuration.tsx:Configuration:props
  Type: semantic-mismatch
  Severity: warning
  Message: Prop "props" in "Configuration" uses type "ConfigurationProps<WidgetOptions>" but other components use "Props"
  Location: app/src/widgets/search/configuration.tsx:9
  Expected: "Props"
  Actual: "ConfigurationProps<WidgetOptions>"

  Signal ID: drift:semantic-mismatch:react:app/src/widgets/qr-code/configuration.tsx:Configuration:props
  Type: semantic-mismatch
  Severity: warning
  Message: Prop "props" in "Configuration" uses type "ConfigurationProps<WidgetOptions>" but other components use "Props"
  Location: app/src/widgets/qr-code/configuration.tsx:8
  Expected: "Props"
  Actual: "ConfigurationProps<WidgetOptions>"

  Signal ID: drift:semantic-mismatch:react:app/src/widgets/image/configuration.tsx:Configuration:props
  Type: semantic-mismatch
  Severity: warning
  Message: Prop "props" in "Configuration" uses type "ConfigurationProps<WidgetOptions>" but other components use "Props"
  Location: app/src/widgets/image/configuration.tsx:7
  Expected: "Props"
  Actual: "ConfigurationProps<WidgetOptions>"

  Signal ID: drift:semantic-mismatch:react:app/src/widgets/github-stats/configuration.tsx:Configuration:props
  Type: semantic-mismatch
  Severity: warning
  Message: Prop "props" in "Configuration" uses type "ConfigurationProps<WidgetOptions>" but other components use "Props"
  Location: app/src/widgets/github-stats/configuration.tsx:7
  Expected: "Props"
  Actual: "ConfigurationProps<WidgetOptions>"

  Signal ID: drift:semantic-mismatch:react:app/src/widgets/day-countdown/configuration.tsx:Configuration:props
  Type: semantic-mismatch
  Severity: warning
  Message: Prop "props" in "Configuration" uses type "ConfigurationProps<WidgetOptions>" but other components use "Props"
  Location: app/src/widgets/day-countdown/configuration.tsx:8
  Expected: "Props"
  Actual: "ConfigurationProps<WidgetOptions>"

  Signal ID: drift:semantic-mismatch:react:app/src/widgets/date-time/configuration.tsx:Configuration:props
  Type: semantic-mismatch
  Severity: warning
  Message: Prop "props" in "Configuration" uses type "ConfigurationProps<WidgetOptions>" but other components use "Props"
  Location: app/src/widgets/date-time/configuration.tsx:65
  Expected: "Props"
  Actual: "ConfigurationProps<WidgetOptions>"

  Signal ID: drift:hardcoded-value:react:app/src/widgets/cryptocurrencies/index.tsx:Cryptocurrencies:spacing
  Type: hardcoded-value
  Severity: info
  Message: Component "Cryptocurrencies" has 2 hardcoded size values: 2rem, 2rem
  Location: app/src/widgets/cryptocurrencies/index.tsx:12

  Signal ID: drift:semantic-mismatch:react:app/src/widgets/cryptocurrencies/configuration.tsx:Configuration:props
  Type: semantic-mismatch
  Severity: warning
  Message: Prop "props" in "Configuration" uses type "ConfigurationProps<WidgetOptions>" but other components use "Props"
  Location: app/src/widgets/cryptocurrencies/configuration.tsx:8
  Expected: "Props"
  Actual: "ConfigurationProps<WidgetOptions>"

  Signal ID: drift:semantic-mismatch:react:app/src/widgets/counter/configuration.tsx:Configuration:props
  Type: semantic-mismatch
  Severity: warning
  Message: Prop "props" in "Configuration" uses type "ConfigurationProps<WidgetOptions>" but other components use "Props"
  Location: app/src/widgets/counter/configuration.tsx:7
  Expected: "Props"
  Actual: "ConfigurationProps<WidgetOptions>"

  Signal ID: drift:semantic-mismatch:react:app/src/widgets/chart/configuration.tsx:Configuration:props
  Type: semantic-mismatch
  Severity: warning
  Message: Prop "props" in "Configuration" uses type "ConfigurationProps<WidgetOptions>" but other components use "Props"
  Location: app/src/widgets/chart/configuration.tsx:7
  Expected: "Props"
  Actual: "ConfigurationProps<WidgetOptions>"
</drift_signals>

<affected_files>

## app/src/widgets/youtube-stats/configuration.tsx
Related signals: drift:semantic-mismatch:react:app/src/widgets/youtube-stats/configuration.tsx:Configuration:props

```
import React from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@darekkay/react-ui";

import { ConfigurationProps } from "widgets/index";

const Configuration = ({
  options,
  setOptions,
  save,
}: ConfigurationProps<WidgetOptions>) => {
  const { t } = useTranslation();
  return (
    <Input
      setValue={(value) => setOptions({ query: value })}
      value={options.query}
      label={t("widget.youtube-stats.configuration.query")}
      type="text"
      onEnter={save}
    />
  );
};

export interface WidgetOptions {
  query: string;
}

export default Configuration;

```

## app/src/widgets/website/configuration.tsx
Related signals: drift:semantic-mismatch:react:app/src/widgets/website/configuration.tsx:Configuration:props

```
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Button, Input } from "@darekkay/react-ui";

import { ConfigurationProps } from "widgets/index";

import providers from "./lib/providers";

const Configuration = ({
  options,
  setOptions,
  save,
}: ConfigurationProps<WidgetOptions>) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <Input
        setValue={(value) => setOptions({ url: value })}
        value={options.url}
        label={t("widget.website.configuration.url")}
        type="url"
        inputMode="url"
        autoComplete="url"
        onEnter={save}
      />
      <div>
        {providers.map((provider) => (
          <Button
            key={provider.title}
            className="mr-5 mb-2"
            variant="secondary"
            size="small"
            outline
            onClick={() =>
              setOptions({
                url: provider.url,
              })
            }
          >
            {provider.title}
          </Button>
        ))}
      </div>
      {/* NICE: Extract "Alert/Info" component */}
      <div>
        <Trans
          i18nKey="widget.website.configuration.disclaimer"
          components={{
            strong: <strong />,
          }}
        />
      </div>
    </div>
  );
};

export interface WidgetOptions {
  url: string;
}

export default Configuration;

```

## app/src/widgets/weather/configuration.tsx
Related signals: drift:semantic-mismatch:react:app/src/widgets/weather/configuration.tsx:Configuration:props

```
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Input, Link } from "@darekkay/react-ui";

import { ConfigurationProps } from "widgets/index";
import Dropdown from "components/forms/dropdown";

const Configuration = ({
  options,
  setOptions,
  save,
}: ConfigurationProps<WidgetOptions>) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <Input
        setValue={(value) => setOptions({ lat: value })}
        value={options.lat}
        label={t("widget.weather.configuration.lat")}
        type="text"
        onEnter={save}
      />
      <Input
        setValue={(value) => setOptions({ lon: value })}
        value={options.lon}
        label={t("widget.weather.configuration.lon")}
        type="text"
        onEnter={save}
      />
      <p>
        <Trans
          i18nKey="widget.weather.configuration.latLonNotice"
          components={{
            mainLink: <Link href="https://www.latlong.net/">{""}</Link>,
            testLink: (
              <Link
                href={`https://www.latlong.net/c/?lat=${options.lat}&long=${options.lon}`}
              >
                {""}
              </Link>
            ),
          }}
        />
      </p>
      <Dropdown
        label={t("widget.weather.configuration.unit")}
        value={options.unit}
        setValue={(value) => setOptions({ unit: value })}
        getOptionLabel={(option) =>
          t(`widget.weather.configuration.units.${option}`)
        }
        options={["metric", "imperial"] as const}
      />
      <div className="text-right text-1">
        <Trans
          i18nKey="common.poweredBy"
          values={{ name: "Open-Meteo" }}
          components={{
            alink: <Link href="https://open-meteo.com/">{""}</Link>,
          }}
        />
      </div>
    </div>
  );
};

export interface WidgetOptions {
  lat: string;
  lon: string;
  unit: "metric" | "imperial";
}

export default Configuration;

```

## app/src/widgets/totd-world-countries/index.tsx
Related signals: drift:hardcoded-value:react:app/src/widgets/totd-world-countries/index.tsx:TotdWorldCountries:spacing

```
import React from "react";
import { useTranslation } from "react-i18next";

import useTriggerUpdate from "common/hooks/useTriggerUpdate";
import Icon from "components/icon";

import { WidgetProps } from "../index";

export { saga } from "./sagas";

const TotdWorldCountries = ({
  id,
  name,
  capital,
  currency,
  languages,
  flag,
  meta,
  triggerUpdate,
  widgetStatusDisplay,
}: Props) => {
  const { t } = useTranslation();
  useTriggerUpdate({ id, params: {}, meta, triggerUpdate }, []);

  if (widgetStatusDisplay) return widgetStatusDisplay;

  return (
    <div>
      {flag && (
        <img
          className="block mb-3 mx-auto p-1 border rounded"
          src={flag}
          alt={`Flag of ${name}`}
          style={{ height: "50px" }}
        />
      )}

      <div className="flex items-center" data-testid="stats-row">
        <Icon
          name="mapMarker"
          alt={t("widget.totd-world-countries.capital")}
          position="left"
          className="text-offset"
        />
        <div className="text-3 mx-2">{capital}</div>
      </div>

      <div className="flex items-center" data-testid="stats-row">
        <Icon
          name="moneyBill"
          alt={t("widget.totd-world-countries.currency")}
          position="left"
          className="text-offset"
        />
        <div className="text-3 mx-2">{currency}</div>
      </div>

      <div className="flex items-center" data-testid="stats-row">
        <Icon
          name="language"
          alt={t("widget.totd-world-countries.languages")}
          position="left"
          className="text-offset"
        />
        <div className="text-3 mx-2">{languages}</div>
      </div>
    </div>
  );
};

interface Props extends WidgetProps {
  name: string;
  capital: string;
  currency: string;
  languages: string;
  flag?: string;
}

export default TotdWorldCountries;

```

## app/src/widgets/text/configuration.tsx
Related signals: drift:semantic-mismatch:react:app/src/widgets/text/configuration.tsx:Configuration:props

```
import React from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@darekkay/react-ui";

import { ConfigurationProps } from "widgets/index";

const Configuration = ({
  options,
  setOptions,
  save,
}: ConfigurationProps<WidgetOptions>) => {
  const { t } = useTranslation();
  return (
    <Input
      setValue={(value) => setOptions({ headline: value })}
      value={options.headline}
      label={t("common.headline")}
      type="text"
      onEnter={save}
    />
  );
};

export interface WidgetOptions {
  headline: string;
}

export default Configuration;

```

## app/src/widgets/search/configuration.tsx
Related signals: drift:semantic-mismatch:react:app/src/widgets/search/configuration.tsx:Configuration:props

```
import React from "react";
import { useTranslation } from "react-i18next";
import { Button, Input } from "@darekkay/react-ui";

import { ConfigurationProps } from "widgets/index";

import providers from "./lib/providers";

const Configuration = ({
  options,
  setOptions,
  save,
}: ConfigurationProps<WidgetOptions>) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <Input
        setValue={(value) => setOptions({ title: value })}
        value={options.title}
        label={t("widget.search.configuration.title")}
        type="text"
        onEnter={save}
      />
      <Input
        setValue={(value) => setOptions({ pattern: value })}
        value={options.pattern}
        label={t("widget.search.configuration.pattern")}
        type="text"
        onEnter={save}
      />
      <div>
        {providers.map((provider) => (
          <Button
            key={provider.title}
            className="mr-5 mb-2"
            variant="secondary"
            size="small"
            outline
            onClick={() =>
              setOptions({
                title: provider.title,
                pattern: provider.pattern,
              })
            }
          >
            {provider.title}
          </Button>
        ))}
      </div>
    </div>
  );
};

export interface WidgetOptions {
  title: string;
  pattern: string;
}

export default Configuration;

```

## app/src/widgets/qr-code/configuration.tsx
Related signals: drift:semantic-mismatch:react:app/src/widgets/qr-code/configuration.tsx:Configuration:props

```
import React from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@darekkay/react-ui";

import { ConfigurationProps } from "widgets/index";
import TextArea from "components/forms/text-area";

const Configuration = ({
  options,
  setOptions,
  save,
}: ConfigurationProps<WidgetOptions>) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <Input
        setValue={(value) => setOptions({ headline: value })}
        value={options.headline}
        label={t("common.headline")}
        type="text"
        onEnter={save}
      />
      <TextArea
        setValue={(value) => setOptions({ content: value })}
        value={options.content}
        label={t("widget.qr-code.configuration.content")}
        rows={5}
      />
    </div>
  );
};

export interface WidgetOptions {
  headline: string;
  content: string;
}

export default Configuration;

```

## app/src/widgets/image/configuration.tsx
Related signals: drift:semantic-mismatch:react:app/src/widgets/image/configuration.tsx:Configuration:props

```
import React from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@darekkay/react-ui";

import { ConfigurationProps } from "widgets/index";

const Configuration = ({
  options,
  setOptions,
  save,
}: ConfigurationProps<WidgetOptions>) => {
  const { t } = useTranslation();
  return (
    <Input
      setValue={(value) => setOptions({ url: value })}
      value={options.url}
      label={t("widget.image.configuration.url")}
      type="url"
      inputMode="url"
      autoComplete="url"
      onEnter={save}
    />
  );
};

export interface WidgetOptions {
  url: string;
}

export default Configuration;

```

## app/src/widgets/github-stats/configuration.tsx
Related signals: drift:semantic-mismatch:react:app/src/widgets/github-stats/configuration.tsx:Configuration:props

```
import React from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@darekkay/react-ui";

import { ConfigurationProps } from "widgets/index";

const Configuration = ({
  options,
  setOptions,
  save,
}: ConfigurationProps<WidgetOptions>) => {
  const { t } = useTranslation();
  return (
    <Input
      setValue={(value) => setOptions({ query: value })}
      value={options.query}
      label={t("widget.github-stats.configuration.query")}
      type="text"
      onEnter={save}
    />
  );
};

export interface WidgetOptions {
  query: string;
}

export default Configuration;

```
</affected_files>

<git_history>

## app/src/widgets/youtube-stats/configuration.tsx
  - 4b8be9f | 2024-08-13 | Darek Kay
    Migrate OpenWeather to Open-Meteo

## app/src/widgets/website/configuration.tsx
  - 4b8be9f | 2024-08-13 | Darek Kay
    Migrate OpenWeather to Open-Meteo

## app/src/widgets/weather/configuration.tsx
  - 4b8be9f | 2024-08-13 | Darek Kay
    Migrate OpenWeather to Open-Meteo

## app/src/widgets/totd-world-countries/index.tsx
  - 4b8be9f | 2024-08-13 | Darek Kay
    Migrate OpenWeather to Open-Meteo

## app/src/widgets/text/configuration.tsx
  - 4b8be9f | 2024-08-13 | Darek Kay
    Migrate OpenWeather to Open-Meteo
</git_history>

<questions>

## Accuracy Assessment
For each drift signal above, classify it as:
- **True Positive**: Correctly identified actual drift
- **False Positive**: Flagged something that isn't actually a problem
- **Needs Context**: Cannot determine without more information

## Coverage Gaps
Looking at the codebase, what drift patterns exist that Buoy didn't detect?
Consider:
- Hardcoded values that should use design tokens
- Inconsistent naming patterns
- Deprecated patterns still in use
- Components that diverge from design system

## Improvement Suggestions
What specific improvements would make Buoy more effective for this type of codebase?
Consider:
- New drift types to detect
- Better heuristics for existing detections
- Framework-specific patterns to recognize
- False positive reduction strategies
</questions>