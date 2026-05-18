# Making Dark Spotlight Highlight Design

## Goal

Upgrade the making-mode same-color highlight from a light tint into a dark spotlight effect, so selected-color cells become the dominant visual focus on phone screens.

## Scope

- Applies only to on-screen making mode rendering.
- Does not change bead data, color matching semantics, completion state, board order, export contents, or downloaded image generation.
- Keeps `colorId`-first matching and current-board highlight scope.

## Design

When a user taps a bead cell and enters color selection:

1. Cells outside the active color scope are strongly dimmed.
2. Non-target cells inside the active board are dimmed enough to recede.
3. Target same-color cells keep their original bead color and get a subtle light lift plus a crisp outline.
4. The exact tapped cell gets a stronger double outline.
5. Text overlay and grid overlay remain available above the base canvas.

The visual constants will live in `singleBoardInteraction.js` as a small pure helper so tests can lock down the intended attention hierarchy.

## Acceptance Criteria

- Target cells are more visually prominent than non-target cells.
- Current tapped cell is more prominent than other target cells.
- Non-target current-board cells are visibly darker but still provide context.
- Board-outside regions are darker than current-board non-target cells.
- Exported PNGs remain clean and do not contain the spotlight effect.
- Existing selection, replacement, completion, auto-next-board, and paginated export behavior remain unchanged.

## Risks

- If dim values are too strong, color numbers may be harder to read.
- If every target cell gets too heavy an outline, dense colors may look noisy.
- Mobile canvas performance must stay stable by avoiding blur/shadow effects.

## Validation

- Unit test the spotlight visual constants.
- Run existing same-color selection tests.
- Run production build.
- Use browser screenshot/manual check for the making page.
