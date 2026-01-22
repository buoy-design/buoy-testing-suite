---
name: test-repo
description: Run Buoy scanner tests against a single repository
model: sonnet
tools: Bash, Read, Write
---

# Test Repository Command

Test Buoy's scanner against a specific repository.

## Usage

```
/test-repo <owner/repo>
```

## Workflow

1. Ensure the repo is in the registry: `./dist/cli.js registry list | grep <repo>`
2. If not present, add it: `./dist/cli.js discover add <owner/repo>`
3. Run the test: `./dist/cli.js run single <owner/repo>`
4. Report the results from `results/<owner>/<repo>/report.md`

## Output

Summarize:
- Components found
- Tokens found
- Any errors encountered
- Comparison with ground truth (if available)
