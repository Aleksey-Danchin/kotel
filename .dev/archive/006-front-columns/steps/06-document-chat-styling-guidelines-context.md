---

## step-imp — 2026-03-25T22:36:05+03:00

**Result**: SUCCESS

### Changed Files
- `docs/designer-chat-styling.md` — new canonical English doc for chat shell layout, scroll, borders, messages, composer.
- `docs/DESIGNER_SANDBOX.md` — section linking to chat styling doc; path fix for `.cursor/rules`.
- `.cursor/rules/designer.mdc` — aligned with doc: shell overflow, borders, composer, link to `docs/designer-chat-styling.md`.
- `.cursor/rules/frontend.mdc` — doc link in Documentation; parity bullets aligned (shell scroll, borders, diverge process).

### Tests
- Task-specific: N/A (manual review per step)
- Regression: N/A

### Acceptance Criteria
- [x] AC-1: docs artifact — verified by: `docs/designer-chat-styling.md` + link from `DESIGNER_SANDBOX.md`
- [x] AC-2: designer.mdc flex pattern — verified by: rule section references doc and lists header/body/footer classes
- [x] AC-3: frontend.mdc migration — verified by: parity section references same doc and structural contract
- [x] AC-4: consistency — verified by: cross-check doc vs both rule files (no contradictions)

### Discoveries
- `scripts/prettier.sh` is absent; marked prettier phase cancelled in progress.
