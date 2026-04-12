# Graph Report - D:\work\web\perler-beads-creator\perler-beads  (2026-04-11)

## Corpus Check
- 110 files · ~158,738 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 684 nodes · 1108 edges · 24 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `generateContourSlices()` - 18 edges
2. `analyzeVisionProgress()` - 12 edges
3. `suggestQuickBackgroundRemoval()` - 11 edges
4. `detectBoardCornersDetailed()` - 11 edges
5. `findClosestBeadColorLabWithVibrancy()` - 7 edges
6. `clamp()` - 7 edges
7. `rgbDistance()` - 7 edges
8. `getRgbAt()` - 7 edges
9. `depthToVoxels()` - 6 edges
10. `requestAiCutout()` - 6 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "authApi.ts / CommunityDetailPage.tsx / HomePage.tsx"
Cohesion: 0.04
Nodes (16): clearToken(), getToken(), isLoggedIn(), request(), convertToBeadPixelData(), handleLike(), handleStartMaking(), isAuthExpiredResponse() (+8 more)

### Community 1 - "templateService.ts / TemplateFlowPage.tsx / sliceService.ts"
Cohesion: 0.04
Nodes (21): detectForegroundMask(), extractColorsForTemplate(), extractDominantColors(), extractMainColors(), getPixelColor(), loadImageData(), rgbToHex(), exportLayerAsImage() (+13 more)

### Community 2 - "designSystem.ts / userStore.ts / Modal.tsx"
Cohesion: 0.05
Nodes (13): featuredWorks(), generatePixelPattern(), getFeaturedWorks(), getCroppedImg(), handleConfirm(), handleSubmit(), validateForm(), handleSubmit() (+5 more)

### Community 3 - "EditorPage.tsx / beadColors.ts / InteractiveCanvas.tsx"
Cohesion: 0.05
Nodes (14): addToRecentColors(), handleAdjustGridSize(), handleGridSizeInputCommit(), handleGridSizeStep(), handleRegenerateWithGridSize(), handleSaveProject(), handleSelectColor(), normalizeGridSize() (+6 more)

### Community 4 - "ModelTo3DPage.tsx / modelVoxelizeService.ts / panelAssemblyService.ts"
Cohesion: 0.06
Nodes (21): handleFileChange(), handleSelectExample(), resetResults(), collectMeshes(), fillInteriorMeshAware(), floodFillOutside(), getTextureImageData(), markSurfaceAlongAxis() (+13 more)

### Community 5 - "ProfilePage.tsx / BeadInventoryModal.tsx / ProjectInventoryCheckModal.tsx"
Cohesion: 0.06
Nodes (6): handleCheckInventory(), handleCheckLocalInventory(), handleShare(), handleShareLocal(), inferDifficulty(), openInventoryCheck()

### Community 6 - "MakingPage.tsx / adService.ts / colorUtils.ts"
Cohesion: 0.08
Nodes (13): ensureTodayState(), getDefaultState(), loadState(), saveState(), todayTag(), deltaE(), hexToLab(), drawHLine() (+5 more)

### Community 7 - "visionAssistService.ts / analyzeVisionProgress() / detectBoardCornersDetailed()"
Cohesion: 0.13
Nodes (31): analyzeSampleRegion(), analyzeVisionProgress(), calculateVisionBoardMatchScore(), chooseActiveColor(), clamp(), createVisionFrameSignature(), detectBoardCorners(), detectBoardCornersDetailed() (+23 more)

### Community 8 - "colorMatchService.ts / findClosestBeadColorLabWithVibrancy() / calculateBeadStatistics()"
Cohesion: 0.12
Nodes (30): boostSaturation(), boostVividness(), calculateBeadStatistics(), drawCoordsAroundPattern(), excludeColor(), exportBeadPattern(), findClosestBeadColor(), findClosestBeadColorLab() (+22 more)

### Community 9 - "ExportModal.tsx / Toast.tsx / boardService.ts"
Cohesion: 0.08
Nodes (15): getPhysicalBoardBlockCoordinate(), getPhysicalBoardBlockRect(), getPhysicalBoardSegments(), buildExportRetryCellSizes(), downloadCanvasAsPng(), estimateFileSize(), getEffectiveCellSize(), getSafeExportCellSize() (+7 more)

### Community 10 - "contourSliceService.ts / generateContourSlices() / findBestScanLine()"
Cohesion: 0.13
Nodes (26): analyzeModel(), computeCommonCenter(), computeDistanceTransform(), exportCentipedeAsImage(), exportContourSliceAsImage(), exportSkewerAsImage(), extractContour(), extractHorizontalLayer() (+18 more)

### Community 11 - "BoardVisionAssistModal.tsx / createDetectionSummary() / getColorLabel()"
Cohesion: 0.09
Nodes (7): clamp(), createDetectionSummary(), getBoardCellLabel(), getCellRadius(), getColorLabel(), getGlobalCellLabel(), getWrongSuggestionLabel()

### Community 12 - "CreatePage.tsx / imageAnalysisService.ts / imageOptimizationService.ts"
Cohesion: 0.12
Nodes (18): applySelectedFile(), handleFileSelect(), handleReselect(), resetInput(), analyzeFromImage(), analyzeImage(), calculateColorComplexity(), calculateEdgeDensity() (+10 more)

### Community 13 - "backgroundRemovalService.ts / suggestQuickBackgroundRemoval() / collectProtectedSubjectRegion()"
Cohesion: 0.17
Nodes (19): absorbSmallBackgroundComponents(), collectAdaptiveSeedRegion(), collectBorderColorEntries(), collectCentralSubjectSeeds(), collectConnectedBorderRegion(), collectConnectedSimilarBorderRegion(), collectProtectedSubjectRegion(), collectSimilarRegionComponents() (+11 more)

### Community 14 - "depthService.ts / Upload3DPage.tsx / extractSkeleton()"
Cohesion: 0.15
Nodes (10): canRemoveZhangSuen1(), canRemoveZhangSuen2(), computeDistanceTransform(), countTransitions(), discretizeDepth(), extractSkeleton(), generateShapeDepth(), generateTextDepth() (+2 more)

### Community 15 - "crossSliceService.ts / generateCrossSlices() / StackedSliceViewer.tsx"
Cohesion: 0.2
Nodes (7): applySlots(), calculateSlicePositions(), exportSliceAsImage(), extractXSlice(), extractZSlice(), generateCrossSlices(), renderSliceToCanvas()

### Community 16 - "CommunityModerationPage.tsx / AdminConsolePage.tsx / AdminConsolePage()"
Cohesion: 0.15
Nodes (0): 

### Community 17 - "aiCutoutService.ts / requestAiCutout() / buildMockCutout()"
Cohesion: 0.32
Nodes (11): buildCacheKey(), buildMockCutout(), colorDistance(), fastHash(), getAiCutoutAvailability(), getAiCutoutProviderPlan(), loadImage(), readEnabledMode() (+3 more)

### Community 18 - "depthTo3DService.ts / depthToVoxels() / extractDepthValuesFloat()"
Cohesion: 0.36
Nodes (8): depthToVoxels(), downsampleImage(), extractDepthValues(), extractDepthValuesFloat(), gaussianBlurDepth(), generateGaussianKernel(), loadImagePixels(), rgbToHex()

### Community 19 - "pixelizeService.ts / pixelizeImage() / exportToImage()"
Cohesion: 0.27
Nodes (5): exportToImage(), loadImage(), pixelizeFromImage(), pixelizeImage(), renderPixelsToCanvas()

### Community 20 - "TemplateDetailPage.tsx / TemplateCategoryList.tsx / templateApi.ts"
Cohesion: 0.22
Nodes (2): loadTemplate(), parseBeadDataFn()

### Community 21 - "deploy.py / main() / upload_directory()"
Cohesion: 0.7
Nodes (4): create_sftp_client(), main(), mkdir_p(), upload_directory()

### Community 22 - "Home3DPage.tsx"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "vite.config.ts"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Home3DPage.tsx`** (1 nodes): `Home3DPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `vite.config.ts`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Should `authApi.ts / CommunityDetailPage.tsx / HomePage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `templateService.ts / TemplateFlowPage.tsx / sliceService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `designSystem.ts / userStore.ts / Modal.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `EditorPage.tsx / beadColors.ts / InteractiveCanvas.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `ModelTo3DPage.tsx / modelVoxelizeService.ts / panelAssemblyService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `ProfilePage.tsx / BeadInventoryModal.tsx / ProjectInventoryCheckModal.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `MakingPage.tsx / adService.ts / colorUtils.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._