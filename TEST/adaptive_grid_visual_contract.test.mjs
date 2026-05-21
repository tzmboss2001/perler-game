import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  "perler-beads/src/pages/mobile/MakingPage.tsx",
  "utf8",
);

test("making page uses readable grid as the default with a light-grid fallback", () => {
  assert.match(source, /gridEnhanceEnabled/);
  assert.match(source, /setGridEnhanceEnabled/);
  assert.match(
    source,
    /const \[gridEnhanceEnabled, setGridEnhanceEnabled\] = useState\(true\);/,
  );
  assert.match(source, /清晰网格/);
  assert.match(source, /轻网格/);
  assert.match(source, /rgba\(17,24,39,0\.22\)/);
  assert.match(source, /rgba\(0,0,0,0\.72\)/);
});

test("making page uses adaptive grid helpers with hysteresis and brightness cache", () => {
  assert.match(source, /resolveAdaptiveGridVisibility/);
  assert.match(source, /getAdaptiveGridRegionTone/);
  assert.match(source, /getAdaptiveGridVisualLayers/);
  assert.match(source, /getAdaptiveGridBoostLevel/);
  assert.match(source, /getViewportCenterGridRect/);
  assert.match(source, /adaptiveGridVisibilityRef/);
  assert.match(source, /adaptiveGridToneCacheRef/);
});

test("adaptive grid renders before selected color spotlight keeps visual priority", () => {
  const adaptiveIndex = source.indexOf("drawAdaptiveGridEnhancement");
  const spotlightIndex = source.indexOf(
    'if (selection.type === "color" && highlightedIndices.size > 0)',
  );
  assert.ok(adaptiveIndex > -1);
  assert.ok(spotlightIndex > -1);
  assert.ok(adaptiveIndex < spotlightIndex);
});

test("toggle active styles avoid React border shorthand conflicts", () => {
  const activeStyle = source.match(/toggleBtnActive:\s*\{([\s\S]*?)\n\s*\},/);
  assert.ok(activeStyle);
  assert.match(activeStyle[1], /border:\s*`1px solid/);
  assert.doesNotMatch(activeStyle[1], /borderColor:/);
});

test("single board immersive tool row exposes direct full overview entry", () => {
  const toolRowIndex = source.indexOf("styles.singleBoardMobileToolRow");
  const overviewTitleIndex = source.indexOf('title="切换到整图模式"', toolRowIndex);
  const overviewHandlerIndex = source.indexOf(
    "onClick={handleOpenTraditionalOverview}",
    toolRowIndex,
  );
  const exportTitleIndex = source.indexOf('title="下载图纸"', toolRowIndex);

  assert.ok(toolRowIndex > -1);
  assert.ok(overviewTitleIndex > toolRowIndex);
  assert.ok(overviewHandlerIndex > toolRowIndex);
  assert.ok(overviewTitleIndex < exportTitleIndex);
});

test("single board immersive tool row exposes direct readable grid toggle", () => {
  const toolRowIndex = source.indexOf("styles.singleBoardMobileToolRow");
  const gridTitleIndex = source.indexOf('title="切换清晰网格"', toolRowIndex);
  const gridHandlerIndex = source.indexOf("setGridEnhanceEnabled", toolRowIndex);
  const assistTitleIndex = source.indexOf('title={showSettings ? "收起辅助" : "展开辅助"}', toolRowIndex);

  assert.ok(toolRowIndex > -1);
  assert.ok(gridTitleIndex > toolRowIndex);
  assert.ok(gridHandlerIndex > toolRowIndex);
  assert.ok(gridTitleIndex < assistTitleIndex);
});

test("adaptive grid enhancement is not limited to traditional mode", () => {
  const visibilityIndex = source.indexOf(
    "const adaptiveGridVisibility = resolveAdaptiveGridVisibility",
  );
  const drawIndex = source.indexOf("drawAdaptiveGridEnhancement();");
  const nearbySource = source.slice(
    Math.max(0, visibilityIndex - 200),
    visibilityIndex + 260,
  );

  assert.ok(visibilityIndex > -1);
  assert.ok(drawIndex > visibilityIndex);
  assert.doesNotMatch(nearbySource, /viewMode\s*===\s*"traditional"/);
});

test("single board mobile active tool styles avoid React border shorthand conflicts", () => {
  for (const styleName of [
    "singleBoardMobileToolToggleBtnActive",
    "singleBoardMobileToolChipActive",
  ]) {
    const match = source.match(
      new RegExp(`${styleName}:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`),
    );
    assert.ok(match, styleName);
    assert.match(match[1], /border:\s*`1px solid/);
    assert.doesNotMatch(match[1], /borderColor:/);
  }
});

test("grid enhancement strengthens base cell grid, not only board guide lines", () => {
  const smallGridLayerIndex = source.indexOf(
    'lineKind: "small"',
    source.indexOf("resolveAdaptiveGridVisibility"),
  );
  const baseGridIndex = source.indexOf("// 1. 基础小格");

  assert.ok(smallGridLayerIndex > -1);
  assert.ok(baseGridIndex > -1);
  assert.ok(smallGridLayerIndex < baseGridIndex);
  assert.match(source.slice(baseGridIndex, baseGridIndex + 900), /strokeLayeredVLine/);
  assert.match(source.slice(baseGridIndex, baseGridIndex + 900), /strokeLayeredHLine/);
});

test("overlay grid canvas is not pixelated during high zoom stage scaling", () => {
  const match = source.match(/overlayCanvas:\s*\{([\s\S]*?)\n\s*\},/);
  assert.ok(match);
  assert.match(match[1], /imageRendering:\s*"auto"/);
});

test("interactive grid overlay is rendered outside the scaled canvas stage", () => {
  const stageIndex = source.indexOf("<div ref={canvasStageRef}");
  const baseCanvasIndex = source.indexOf("ref={canvasRef}", stageIndex);
  const stageCloseIndex = source.indexOf("</div>", baseCanvasIndex);
  const overlayIndex = source.indexOf("ref={overlayCanvasRef}", stageIndex);
  const textIndex = source.indexOf("ref={textOverlayCanvasRef}", stageIndex);

  assert.ok(stageIndex > -1);
  assert.ok(baseCanvasIndex > stageIndex);
  assert.ok(stageCloseIndex > baseCanvasIndex);
  assert.ok(overlayIndex > stageCloseIndex);
  assert.ok(textIndex > overlayIndex);
});

test("interactive grid overlay uses viewport backing store instead of scaled artwork backing store", () => {
  const effectStart = source.indexOf("!overlayCanvasRef.current");
  const effectEnd = source.indexOf("const visibleStartX", effectStart);
  const setupSource = source.slice(effectStart, effectEnd);

  assert.ok(effectStart > -1);
  assert.ok(effectEnd > effectStart);
  assert.match(setupSource, /wrapperRef\.current/);
  assert.match(setupSource, /const wrapperWidth = wrapper\.clientWidth/);
  assert.match(setupSource, /canvas\.width = Math\.max\(1, Math\.floor\(wrapperWidth \* dpr\)\)/);
  assert.doesNotMatch(setupSource, /safeRenderCanvasWidth \* dpr/);
});
