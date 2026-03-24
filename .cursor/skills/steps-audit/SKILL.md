---
name: steps-audit
description: Post-mortem analysis of a steps-man run. Checks progress.json integrity, git history, and agent transcripts for anomalies (missing progress arrays, generic fallback launches, uncommitted changes). Use when auditing step execution, diagnosing steps-man issues, or verifying step run quality.
---

# Steps Audit

Post-mortem analysis of the most recent steps-man execution.

## Quick Start

Run the analysis script:

```bash
bash .cursor/skills/steps-audit/analyze.sh
```

Read the output. Report results to the user in Russian.

## What the Script Checks

| Section | What it checks |
|---------|---------------|
| **1. Progress file** | Missing `progress` arrays, incomplete AC items, missing `commitHash` in completed steps |
| **2. Git history** | Progress state at each step commit — flags `in_progress` steps without a `progress` array |
| **3. Uncommitted changes** | Whether `progress.json` diverges from HEAD |
| **4. Transcripts** | Identifies steps-man runs, counts proper vs GENERIC fallback step-imp launches |
| **5. Summary** | Total issue count |

## Output Format

Summarize each section concisely. End with a verdict:

- **0 issues**: "Прогон чистый. Проблем не обнаружено."
- **Issues found**: list each issue with a brief explanation of what it means and what to check.

## Rules

- Do NOT fix any issues — only report.
- Do NOT modify any files.
- Always respond in Russian.
- If the script fails, check that `.dev/progress.json` exists and that the project has step commits in git history.
