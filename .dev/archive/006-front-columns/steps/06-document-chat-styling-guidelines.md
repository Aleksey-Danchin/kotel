# Step 06: Document Chat Styling Guidelines

## Goal
Add and align project documentation for the selected UI styling techniques used in the designer chat shell, and mirror those expectations in frontend-oriented docs/rules for future migration.

## Motivation
Without explicit documentation, layout and visual decisions (flex shell, fixed zones, scroll behavior, subtle message styling) can drift during implementation and later frontend porting.

## Type
docs, ui, architectural

## Affected Area
`docs/` styling-related markdown (new or existing), `.cursor/rules/designer.mdc`, `.cursor/rules/frontend.mdc`.

## Dependencies
Depends on steps 03, 04, and 05.

## Current Behavior
Implementation steps define visual behavior, but there is no dedicated step that codifies these choices into durable docs/rules for both `apps/designer` and `apps/frontend` workflows.

## Expected Behavior
Project docs and Cursor rules clearly state:
- three-column chat shell is flex-based,
- each column uses fixed header/footer with scrollable middle body,
- page-level scroll is disabled in favor of per-column scroll,
- border placement and message visual hierarchy conventions are explicit,
- frontend migration should preserve designer UX contract unless deliberately changed.

## Specification
1. Add a concise documentation page (or extend existing UI docs) describing chosen styling patterns for chat layout and message list.
2. Document mandatory flex structure for each column:
   - `flex flex-col`,
   - `header/footer` as fixed zones (`shrink-0`),
   - `body` as `flex-1 min-h-0 overflow-y-auto`.
3. Document visual conventions:
   - where column borders belong,
   - subtle incoming/outgoing message color separation,
   - fixed composer/footer behavior.
4. Update `.cursor/rules/designer.mdc` with these layout/style constraints for work in `apps/designer/**`.
5. Update `.cursor/rules/frontend.mdc` so migration/implementation in `apps/frontend/**` reuses the same structural contract and does not regress UX behavior.

## Acceptance Criteria
1. A docs artifact exists that describes the selected chat styling techniques and layout rules.
2. `designer` rule file explicitly mentions the flex-based fixed header/body/footer pattern.
3. `frontend` rule file explicitly mentions preserving the same structural pattern during migration.
4. Documentation and rules are consistent (no contradictory instructions).

## Verification Scenario
1. Open the new/updated docs page and confirm all key layout/style decisions are written.
2. Open `.cursor/rules/designer.mdc` and verify constraints for designer implementation are present.
3. Open `.cursor/rules/frontend.mdc` and verify migration-preservation guidance is present.
4. Cross-check wording to ensure both rule files align with the docs page.

## Testing
Manual review only (docs/rules consistency check).

## Notes
Include only stable styling decisions that are already accepted in Q&A and implementation steps, so docs remain authoritative and low-noise.
