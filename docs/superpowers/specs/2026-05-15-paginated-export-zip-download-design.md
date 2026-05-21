# Paginated Export ZIP Download Design

## Goal

Make paginated board export work reliably on mobile browsers by replacing multiple consecutive PNG downloads with one ZIP download.

## Scope

- Applies only to paginated export mode.
- Normal single-image export remains a single PNG.
- Existing board rendering, overview rendering, file naming inside the export package, and board order remain unchanged.
- No backend API is added.

## Design

The export modal will generate all paginated canvases in memory, convert each canvas to a PNG `Blob`, package those blobs into a single store-method ZIP file, then trigger one browser download.

The ZIP will contain:

- `perler-<width>x<height>-overview-<timestamp>.png` when overview is enabled.
- `perler-<width>x<height>-board1-p1ofN-<timestamp>.png`
- `perler-<width>x<height>-board2-p2ofN-<timestamp>.png`
- ...

The outer ZIP filename will be:

- `perler-<width>x<height>-boards-<timestamp>.zip`

The ZIP implementation will use stored entries, not compression. PNGs are already compressed, and avoiding compression reduces CPU cost on phones.

## Acceptance Criteria

- Paginated export triggers one download action instead of one action per board.
- ZIP contains overview plus every board page in the same order as current paginated export.
- Normal non-paginated export still downloads a PNG directly.
- Existing generated board PNG contents remain unchanged.
- Production build passes.

## Risks

- ZIP creation holds all PNG blobs in memory until the final package is generated.
- Very large multi-board patterns can still hit mobile memory limits.
- Some embedded WebViews may not support blob downloads consistently; Safari and modern Android browsers should be better with one ZIP than many PNG prompts.

## Validation

- Unit test the ZIP writer and filename.
- Existing export visual contract test remains green.
- Existing single-board interaction tests remain green.
- Browser download test should show one `.zip` download for paginated export.
