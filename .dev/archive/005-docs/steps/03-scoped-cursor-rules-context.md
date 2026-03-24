---

## step-imp — 2026-03-24T13:53:56+03:00

**Result**: SUCCESS

### Changed Files
- `.cursor/rules/backend.mdc` — added scoped backend conventions and doc pointers.
- `.cursor/rules/frontend.mdc` — added scoped frontend conventions and doc pointers.
- `.cursor/rules/mobile.mdc` — added scoped mobile conventions, including HTTP downgrade limitation.
- `.cursor/rules/infra.mdc` — added scoped infra conventions including session env mapping.

### Tests
- Task-specific: 0 passed, 0 failed (manual inspection step).
- Regression: 0 passed, 0 failed (not applicable for rules-only change).

### Acceptance Criteria
- [x] AC-1: Созданы 4 scoped правила — verified by: code inspection.
- [x] AC-2: Frontmatter содержит globs и alwaysApply false — verified by: code inspection.
- [x] AC-3: В каждом правиле есть Documentation ссылки — verified by: code inspection + docs existence check.
- [x] AC-4: testing.mdc не изменен — verified by: file inspection.
- [x] AC-5: Ограничения соответствуют коду — verified by: code inspection with targeted searches.

### Discoveries
- `scripts/prettier.sh` is absent in this repository; formatting phase was marked not applicable for this step.
