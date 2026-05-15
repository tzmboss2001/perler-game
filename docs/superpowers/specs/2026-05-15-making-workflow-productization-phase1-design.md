# Making Workflow Productization Phase1 Design

## Status

Approved direction: productized making workflow, option A, workflow closure first.

This document freezes generation-quality work for this phase and defines the next productization direction for the making experience. It is design-only. It does not change code, build output, release assets, generation algorithms, gesture thresholds, or export implementation.

## Product Goal

Users should be able to understand and continue a real perler-bead making session without guessing:

- Which board am I working on?
- Which bead color should I place now?
- What is the next useful action?
- Which areas are already completed?
- How do I export or print the pattern safely?

The first productization phase prioritizes clarity during production over broad UI redesign.

## Non-Goals

- Do not continue current generation-quality candidate tuning.
- Do not enable any frozen experimental generation parameter by default.
- Do not productize subject-priority, continuity, safeguard, or dirty-color candidates.
- Do not rewrite `MakingPage.tsx`.
- Do not change gesture priority, board switching model, pan boundaries, reset view behavior, or mobile immersive layout sizing.
- Do not rebuild export architecture or large-canvas memory strategy in this phase.
- Do not enter template marketplace or content ecosystem implementation.

## Hard Invariants

- Mobile single-board immersive mode must keep the paper area filling the viewport below the title bar.
- Tools, status, navigation, and help must remain overlay layers and must not re-enter page layout height.
- Opening a tool drawer, settings panel, overview layer, or help panel must freeze the underlying canvas.
- Existing gesture priority, board switching threshold, limited pan slack, high-zoom drag behavior, and reset view behavior must remain unchanged.
- Desktop mode, traditional mode, and non-immersive multi-board flows must not regress.
- High-risk interaction changes require separate proposals, separate commits, MCP validation, and rollback boundaries.

## Main Workflow

The making page should be organized around the current task rather than scattered controls.

1. On entry, the page communicates current mode, current board, total progress, and the next useful action.
2. When the user selects or locates a cell, the page emphasizes cell coordinate, bead color, color id, and same-color scope.
3. When the user completes a bead or same-color region, completion feedback appears at the edge and does not cover the working cells.
4. When changing boards, the user can use existing gestures and buttons, with better board-position awareness.
5. When exporting or printing, the user sees board order, overview availability, file naming, and print notes before downloading.

## Current Board Navigation

The current-board navigation should answer board position and board progress without taking over the canvas.

Minimum product increment:

- Show current board id, row/column position, current-board completion, and remaining board count as an overlay.
- Keep board navigation edge-aligned and out of the document flow.
- Provide an expandable board map or overview for multi-board patterns.
- Do not change existing swipe, previous-board, next-board, or board boundary behavior.

Risks:

- Medium: oversized overlay hit areas can interfere with cell tap or canvas drag.
- High: any change to switching thresholds, pan boundaries, or auto-switch behavior must be split into a separate proposal.

## Current Cell And Current Color Readability

The user should understand the selected cell and color without losing access to the pattern.

Minimum product increment:

- Move persistent cell/color status toward top or bottom edges instead of long-lived center overlays.
- Show color id, color swatch, current-board same-color count, and total same-color count.
- Preserve current mode semantics: single-board mode prioritizes current board scope; traditional mode keeps block scope.
- Do not change color-id canvas rendering, zoom synchronization, or overlay scaling in this phase.

Risks:

- Medium: highlight opacity or blending can make pattern colors harder to read.
- High: touching color-id render synchronization can reintroduce historical zoom misalignment, initial-size flash, color disappearance, or repeated label artifacts.

## Completed Area Feedback

Completion feedback should help users avoid missing cells without making the image visually dirty.

Minimum product increment:

- Use low-interference completed-area fading or marking.
- Keep board-complete notifications on an edge, not in the center of the working grid.
- Use existing progress state. Do not combine with cloud sync, inventory deduction, or backend changes in this phase.

Risks:

- Medium: completed-area fading can conflict with current-color highlight.
- High: mixing completion UI with cloud progress or inventory deduction expands regression scope and is out of this phase.

## Beginner Help Entry

New users need discoverable help; experienced users should not be interrupted.

Minimum product increment:

- Add help/instructions inside the tool drawer.
- Show only a lightweight first-use hint for single-board mode.
- Let users close the hint and reopen help later.
- Cover zoom, pan, board switching, current color, highlight, completion, and export.
- Freeze the canvas while the help panel is open.

Risks:

- Low: static copy and help entry.
- Medium: first-use storage and timing can become annoying if repeated or too intrusive.

## Export And Print Experience

The export flow should be understandable before download starts.

Minimum product increment:

- Add a pre-export explanation for pattern size, board count, overview inclusion, and paginated board order.
- Explain board filename rules and board row/column position.
- Add print notes: print at actual size, disable page auto-scaling, and test one page first.
- Keep export rendering, canvas generation, ZIP behavior, and file order unchanged.

Risks:

- Medium: mobile browser download limitations.
- High: large-image export memory, ZIP generation, and canvas dimension changes require a separate performance phase.

## Mobile Making Interaction

All mobile additions must respect the immersive model.

Rules:

- New controls are edge overlays, not layout participants.
- FAB, drawer, status hints, and overview must follow the existing overlay hierarchy.
- No hidden spacer, transparent placeholder, padding, or margin may reduce the canvas work area.
- Animations may use opacity and transform only; they must not change hit areas or event routing.

## Performance And Stability

This phase only defines the performance baseline. It does not optimize implementation yet.

Future baseline items:

- Large pattern load time.
- Multi-board switching latency.
- High-zoom pan frame stability.
- Export memory pressure.
- Mobile Safari and Android Chrome behavior.

## Template And Content Ecosystem

Template/content work is deferred. The only current decision is that future templates must enter the same making workflow after selection.

Deferred directions:

- Official starter templates.
- Popular style templates.
- Holiday, pet, and pixel-art content.
- Template-to-making continuity.

## Risk Levels

Low risk:

- Copy, help text, export explanation.
- Read-only current board status.
- Overlay visual tuning that does not affect layout or events.
- MCP validation scripts and documentation.

Medium risk:

- Current-board navigation overlay.
- Current-color and completed-area visual layering.
- First-use hint storage and timing.
- Overview readability adjustments.

High risk:

- Gesture thresholds, board switching model, pan boundaries.
- Color-id canvas or overlay synchronization.
- Progress state with cloud sync or inventory deduction.
- Large export, ZIP, and canvas memory strategy.
- Broad `MakingPage.tsx` refactor.

## Phase1 Minimum Landing Scope

The first implementation round should include only:

- Current-board status overlay.
- Current cell/current color readability improvements.
- Help entry inside the tool drawer.
- Export preflight explanation copy.
- MCP and visual contract checks proving overlays do not consume layout height.

Everything else remains future work unless separately approved.

## Stop Conditions

Stop expanding scope immediately if any of these happen:

- Mobile single-board paper area no longer fills the viewport below the title bar.
- Any new tool/status layer consumes layout height.
- Canvas still responds while the tool drawer/help/overview is open.
- 100%-200% limited vertical pan, 300%+ free drag, or reset view regresses.
- Multi-board switching misfires during normal pan.
- Color ids misalign, flash back to initial size, disappear, or duplicate during zoom.
- Desktop or traditional mode regresses.

## MCP Acceptance Matrix

- Mobile single-board immersive: paper area fills below title bar; new overlays do not occupy layout.
- Mobile single-board immersive: tool drawer/help/overview freezes canvas.
- Mobile single-board immersive: 100%, 150%, 200% still allow limited vertical pan.
- Mobile single-board immersive: 300%+ still supports bounded free drag.
- Mobile multi-board: low-zoom pan does not accidentally switch boards; intentional switch still works.
- Mobile single-board immersive: board status, current color, and help entry open without covering core work cells long-term.
- Desktop single-board: board navigation and export entry remain usable and do not compress the work area.
- Traditional mode: block workflow, current-color highlight, and export entry do not regress.
- Export modal: preflight explanation appears without changing generated file order.

## Commit And Rollback Strategy

- This design document is a standalone documentation commit.
- Future implementation should be split in this order: board status, current-color readability, help entry, export preflight copy.
- Each medium-risk change needs its own MCP validation note.
- Any high-risk interaction change needs a new proposal and must not be mixed into Phase1 minimum landing scope.

