# Paginated Export ZIP Download Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace paginated board export's multiple PNG download prompts with one ZIP download.

**Architecture:** Add a small dependency-free ZIP utility that stores PNG blobs, then update `ExportModal.tsx` paginated export to collect generated images and download one ZIP. Keep normal PNG export untouched.

**Tech Stack:** React, TypeScript, Canvas 2D, browser Blob APIs, Node test runner, Vite.

---

### Task 1: ZIP Utility Test and Implementation

**Files:**
- Create: `TEST/zip_export.test.mjs`
- Create: `perler-beads/src/utils/zipExport.js`

- [ ] Write a failing test importing `buildPaginatedZipFilename` and `createStoredZipBlob`.
- [ ] Verify the test fails because `zipExport.js` does not exist.
- [ ] Implement CRC32, stored ZIP local headers, central directory, and EOCD.
- [ ] Re-run `cmd /c node --test TEST\zip_export.test.mjs` and verify it passes.

### Task 2: Export Modal Integration

**Files:**
- Modify: `perler-beads/src/components/ExportModal.tsx`

- [ ] Import `buildPaginatedZipFilename` and `createStoredZipBlob`.
- [ ] Split `downloadCanvasAsPng` into `canvasToPngBlob` and `downloadBlob`.
- [ ] Keep normal non-paginated export as one PNG download.
- [ ] Change paginated export to collect overview and board PNG blobs into a list.
- [ ] Generate one ZIP blob and download it once.
- [ ] Update success message text so users understand paginated export is one ZIP package.

### Task 3: Verification and Release

**Files:**
- Create: `MD/client/2026-05-15_paginated_export_zip_download.md`
- Create: `MD/server/2026-05-15_app_pd_formal_domain_redeploy_paginated_export_zip.md`

- [ ] Run `cmd /c node --test TEST\zip_export.test.mjs`.
- [ ] Run `cmd /c node --test TEST\export_modal_visual_contract.test.mjs`.
- [ ] Run `cmd /c node --test TEST\single_board_interaction.test.mjs`.
- [ ] Run production build.
- [ ] Browser-test paginated export and confirm exactly one ZIP download.
- [ ] Deploy to formal domain and verify main JS asset.
- [ ] Write MD records.
