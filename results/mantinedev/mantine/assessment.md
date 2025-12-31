Looking at this repository, I can see that Mantine is a comprehensive React component library with a sophisticated design system, yet Buoy detected 0 components despite finding 356 tokens. This indicates significant gaps in Buoy's component detection capabilities.

## Analysis

The most glaring issue is that Buoy completely missed detecting React components. The sampled files show clear examples of well-structured React components like `Button`, `Input`, and `Card` that follow standard patterns but weren't detected. These components use Mantine's design system architecture with:

1. **Polymorphic factory patterns** - Components are created using `polymorphicFactory` which may not be recognized by standard React component detection
2. **Complex type definitions** - TypeScript interfaces with sophisticated prop types and style configurations
3. **CSS-in-JS variables** - Design tokens are defined as CSS variables within component TypeScript files
4. **Compound components** - Components with sub-components (e.g., `Button.Group`, `Input.Label`)

For design tokens, while Buoy found 356 tokens, it likely missed many tokens defined within component files as CSS variables and TypeScript type definitions.

The drift detection completely missed opportunities to identify hardcoded values that could use design tokens, particularly in component styling and configuration.

```json
{
  "missedPatterns": [
    {
      "category": "component",
      "description": "Polymorphic React components using factory pattern not detected",
      "evidence": {
        "file": "packages/@mantine/core/src/components/Button/Button.tsx",
        "lineRange": [95, 120],
        "codeSnippet": "export const Button = polymorphicFactory<ButtonFactory>((_props, ref) => {\n  const props = useProps('Button', null, _props);\n  // ... component implementation\n});"
      },
      "suggestedDetection": "Detect polymorphicFactory pattern and exported const assignments with JSX return types",
      "severity": "high"
    },
    {
      "category": "component",
      "description": "Component compound patterns with static sub-components missed",
      "evidence": {
        "file": "packages/@mantine/core/src/components/Button/Button.tsx",
        "lineRange": [180, 185],
        "codeSnippet": "Button.classes = classes;\nButton.displayName = '@mantine/core/Button';\nButton.Group = ButtonGroup;\nButton.GroupSection = ButtonGroupSection;"
      },
      "suggestedDetection": "Detect static property assignments on components, especially displayName and compound component patterns",
      "severity": "medium"
    },
    {
      "category": "token",
      "description": "CSS variable design tokens defined in component TypeScript files",
      "evidence": {
        "file": "packages/@mantine/core/src/components/Button/Button.tsx",
        "lineRange": [25, 35],
        "codeSnippet": "export type ButtonCssVariables = {\n  root:\n    | '--button-justify'\n    | '--button-height'\n    | '--button-padding-x'\n    | '--button-fz'\n    | '--button-radius'\n    | '--button-bg'\n    | '--button-hover'\n    | '--button-hover-color'\n    | '--button-color'\n    | '--button-bd';\n};"
      },
      "suggestedDetection": "Parse TypeScript types ending in 'CssVariables' or similar patterns for CSS custom property definitions",
      "severity": "medium"
    },
    {
      "category": "token",
      "description": "Design token function calls and utilities in component implementations",
      "evidence": {
        "file": "packages/@mantine/core/src/components/Card/Card.tsx",
        "lineRange": [45, 50],
        "codeSnippet": "const varsResolver = createVarsResolver<CardFactory>((_, { padding }) => ({\n  root: {\n    '--card-padding': getSpacing(padding),\n  },\n}));"
      },
      "suggestedDetection": "Detect varsResolver patterns and getSpacing/getRadius/getFontSize function calls as token usage",
      "severity": "medium"
    },
    {
      "category": "drift",
      "description": "Hardcoded magic numbers in component styling that could use design tokens",
      "evidence": {
        "file": "packages/@mantine/core/src/components/Button/Button.tsx",
        "lineRange": [140, 145],
        "codeSnippet": "<Transition mounted={loading} transition={loaderTransition} duration={150}>\n  {(transitionStyles) => (\n    <Box component=\"span\" {...getStyles('loader', { style: transitionStyles })} aria-hidden>\n      <Loader\n        color=\"var(--button-color)\"\n        size=\"calc(var(--button-height) / 1.8)\"\n        {...loaderProps}\n      />"
      },
      "suggestedDetection": "Flag hardcoded duration values (150), magic ratios (1.8), and encourage transition token usage",
      "severity": "low"
    },
    {
      "category": "source",
      "description": "Storybook story files not properly included despite being configured",
      "evidence": {
        "file": ".storybook/main.ts",
        "lineRange": [15, 20],
        "codeSnippet": "function getStoryPaths(fileName: string | number = '*') {\n  return getGlobPaths([\n    getPath(`packages/@mantine/*/src/**/${fileName}.story.@(ts|tsx)`),\n    getPath(`packages/@mantinex/*/src/**/${fileName}.story.@(ts|tsx)`),\n    getPath(`packages/@docs/*/src/**/${fileName}.story.@(ts|tsx)`),\n  ]);\n}"
      },
      "suggestedDetection": "Better parsing of Storybook main.ts config to understand dynamic story path generation",
      "severity": "medium"
    }
  ],
  "improvements": [
    {
      "area": "scanner",
      "title": "Polymorphic Factory Pattern Detection",
      "description": "Add detection for React components created using factory patterns like polymorphicFactory, which is common in modern component libraries but not standard JSX syntax",
      "examples": [
        "export const Button = polymorphicFactory<ButtonFactory>",
        "export const Input = polymorphicFactory<InputFactory>"
      ],
      "estimatedImpact": "Would catch 100+ Mantine components"
    },
    {
      "area": "token-parser",
      "title": "TypeScript CSS Variable Type Detection",
      "description": "Parse TypeScript type definitions that define CSS custom properties as union types, which is how Mantine defines its design token contracts",
      "examples": [
        "ButtonCssVariables = { root: '--button-height' | '--button-radius' }",
        "InputCssVariables = { wrapper: '--input-fz' | '--input-padding-y' }"
      ],
      "estimatedImpact": "Would catch 50+ additional token definitions"
    },
    {
      "area": "scanner",
      "title": "Compound Component Pattern Recognition",
      "description": "Detect static property assignments on components that create compound component APIs (Component.SubComponent pattern)",
      "examples": [
        "Button.Group = ButtonGroup",
        "Input.Label = InputLabel",
        "Card.Section = CardSection"
      ],
      "estimatedImpact": "Would identify component relationships and sub-components"
    },
    {
      "area": "drift-rules",
      "title": "Design Token Utility Function Detection",
      "description": "Identify when components use design token utility functions vs hardcoded values, and flag inconsistent usage patterns",
      "examples": [
        "getSpacing(padding) vs hardcoded padding values",
        "getRadius() vs hardcoded border-radius",
        "getFontSize() vs hardcoded font sizes"
      ],
      "estimatedImpact": "Would catch inconsistent token usage across component implementations"
    },
    {
      "area": "config",
      "title": "Framework-Specific Component Patterns",
      "description": "Add configuration options for detecting components created with library-specific patterns beyond standard React patterns",
      "examples": [
        "Mantine polymorphicFactory",
        "Styled-components styled.div``",
        "Chakra UI chakra() factory"
      ],
      "estimatedImpact": "Would make Buoy work with more design systems out of the box"
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
      "token-parser",
      "drift-rules",
      "config"
    ]
  }
}
```