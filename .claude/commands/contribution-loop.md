---
name: contribution-loop
description: Run the autonomous contribution loop - finds repos with drift and generates PRs
model: opus
tools: Bash, Read, Write, Edit, Glob, Grep, Task
---

# Contribution Loop Command

Autonomous loop that discovers design drift in open source repos and generates contribution PRs.

## Workflow

1. **Discover** - Find repos using design systems via GitHub search
2. **Scan** - Run Buoy scanner to detect drift patterns
3. **Analyze** - Use codebase-review agent to identify fixable issues
4. **Assess** - Use acceptance agent to predict PR acceptance likelihood
5. **Generate** - Create fix and stage PR for human review

## Execution

```bash
# Run a single iteration
./dist/cli.js run batch --top 10 --untested-only

# For each repo with drift:
# 1. Clone to ./repos/<owner>/<repo>
# 2. Run scan and generate report
# 3. If drift found, analyze with agents
# 4. Stage fixes for review
```

## Human Checkpoints

- Review generated fixes before PR submission
- Approve/reject each contribution
- Provide feedback for loop improvement
