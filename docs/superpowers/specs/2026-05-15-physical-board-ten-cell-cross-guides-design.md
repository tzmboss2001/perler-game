# Physical Board Ten-Cell Cross Guides Design

## Goal

Add subtle dashed cross guides inside every complete 10x10 physical-board block so users can count beads more easily without changing artwork data, color matching, highlight selection, completion state, or ZIP export flow.

## Scope

- Screen rendering in mobile making mode draws the helper only when cells are large enough to read.
- Normal PNG exports and paginated board PNG exports draw the helper when major physical-board guides are enabled.
- Overview exports stay unchanged so they remain a board-position summary rather than a dense making chart.
- Only complete 10x10 blocks get the helper. Edge compensation segments such as 2 or 4 cells do not get an internal cross.

## Architecture

- `boardService.ts` owns the physical-board geometry and exposes a pure helper that returns complete 10x10 block rectangles with center offsets.
- `MakingPage.tsx` consumes the helper on the overlay canvas and draws weak dashed cross lines inside the currently visible board area.
- `colorMatchService.ts` consumes the same helper for exported PNG canvases.

## Visual Rules

- The helper is weaker than physical-board boundary lines and 10x10 boundary lines.
- The helper is dashed, not solid, so it reads as counting assistance rather than a selected state.
- The helper is hidden on screen at low zoom to avoid clutter.
- Highlight and selected-cell outlines remain visually stronger than the helper.

## Testing

- Add a Node test for `getPhysicalBoardTenCellCrossGuides()` to prove the helper returns only complete 10x10 blocks and correct centers.
- Add a source-level visual contract test proving the making overlay and export renderer both call the shared helper and use dashed drawing.
- Run existing interaction/export tests and a clean frontend build.
