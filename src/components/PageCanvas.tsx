import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Page, Point, Stroke, ShapeType } from '../types/document';
import { useAppStore } from '../store/useAppStore';
import { renderBackground } from '../engine/backgroundRenderer';
import { renderStroke, isPointNearStroke } from '../engine/inking';
import {
  renderShape,
  getStrokesBoundingBox,
  isStrokeInBox,
  isStrokeInPolygon,
  recognizeShape,
} from '../engine/shapes';
import { getPdfDocumentProxy, renderPdfPageToCanvas, renderPdfTextLayer } from '../engine/pdfRenderer';
import { StrokeStabilizer } from '../engine/stabilizer';
import {
  renderSetsquare,
  renderCompass,
  hitTestSetsquare,
  snapPointToSetsquare,
  snapPointToCompass,
} from '../engine/geometryTools';

interface PageCanvasProps {
  page: Page;
  pageIndex: number;
}

const PageCanvasComponent: React.FC<PageCanvasProps> = ({ page, pageIndex }) => {
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const inkCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfTextLayerRef = useRef<HTMLDivElement | null>(null);

  // Subscribe specifically to pdfFileBuffer to prevent document-wide re-renders
  const pdfFileBuffer = useAppStore((state) => state.document.pdfFileBuffer);
  const activeTool = useAppStore((state) => state.activeTool);
  const penSettings = useAppStore((state) => state.penSettings);
  const highlighterSettings = useAppStore((state) => state.highlighterSettings);
  const eraserType = useAppStore((state) => state.eraserType);
  const eraserWidth = useAppStore((state) => state.eraserWidth);
  const lineStyle = useAppStore((state) => state.lineStyle);
  const capStyle = useAppStore((state) => state.capStyle);
  const shapeRecognizerEnabled = useAppStore((state) => state.shapeRecognizerEnabled);
  const fillEnabled = useAppStore((state) => state.fillEnabled);
  const fillOpacity = useAppStore((state) => state.fillOpacity);

  // Text tool settings
  const fontFamily = useAppStore((state) => state.fontFamily);
  const fontSize = useAppStore((state) => state.fontSize);
  const isBold = useAppStore((state) => state.isBold);
  const isItalic = useAppStore((state) => state.isItalic);
  const textAlign = useAppStore((state) => state.textAlign);
  const addTextElement = useAppStore((state) => state.addTextElement);
  const updateTextElement = useAppStore((state) => state.updateTextElement);
  const deleteTextElement = useAppStore((state) => state.deleteTextElement);

  const selectedStrokeIds = useAppStore((state) => state.selectedStrokeIds);
  const setSelectedStrokeIds = useAppStore((state) => state.setSelectedStrokeIds);
  const moveSelectedStrokes = useAppStore((state) => state.moveSelectedStrokes);
  const scaleSelectedStrokes = useAppStore((state) => state.scaleSelectedStrokes);
  const rotateSelectedStrokes = useAppStore((state) => state.rotateSelectedStrokes);
  const insertVerticalSpace = useAppStore((state) => state.insertVerticalSpace);

  const addStroke = useAppStore((state) => state.addStroke);
  const deleteStrokes = useAppStore((state) => state.deleteStrokes);
  const setActivePage = useAppStore((state) => state.setActivePage);
  const zoom = useAppStore((state) => state.zoom);

  // Geometry tools
  const geometryTool = useAppStore((state) => state.geometryTool);
  const setsquareState = useAppStore((state) => state.setsquareState);
  const compassState = useAppStore((state) => state.compassState);
  const updateSetsquare = useAppStore((state) => state.updateSetsquare);
  const updateCompass = useAppStore((state) => state.updateCompass);

  // Advanced Stabilizer
  const stabilizerConfig = useAppStore((state) => state.stabilizerConfig);
  const stabilizerRef = useRef<StrokeStabilizer>(new StrokeStabilizer(stabilizerConfig));

  // Sync stabilizer config on change
  useEffect(() => {
    stabilizerRef.current.setConfig(stabilizerConfig);
  }, [stabilizerConfig]);

  // Text editing state
  const [activeTextEditor, setActiveTextEditor] = useState<{ x: number; y: number; text: string; id?: string } | null>(null);

  // Instant inking refs (bypassing React re-renders completely for 0ms latency)
  const isInteractingRef = useRef<boolean>(false);
  const interactionModeRef = useRef<
    | 'draw'
    | 'erase'
    | 'whiteout'
    | 'selectBox'
    | 'lasso'
    | 'moveSelection'
    | 'resizeSelection'
    | 'rotateSelection'
    | 'verticalSpace'
    | 'setsquareMove'
    | 'setsquareRotate'
    | 'compassMove'
    | 'compassRadius'
    | 'hand'
  >('draw');
  const startCanvasPtRef = useRef<Point>({ x: 0, y: 0, pressure: 0.5 });
  const lastCanvasPtRef = useRef<Point>({ x: 0, y: 0, pressure: 0.5 });
  const startClientPtRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentPointsRef = useRef<Point[]>([]);
  const cachedRectRef = useRef<DOMRect | null>(null);
  const activeCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  const erasedStrokesMapRef = useRef<Map<string, { stroke: Stroke; index: number }>>(new Map());
  const resizeHandleIndexRef = useRef<number>(-1);

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  // Render Background Layer (Layer 0)
  const drawBackground = useCallback(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;

    if (page.background.type === 'pdf' && pdfFileBuffer && page.background.pdfPageIndex) {
      getPdfDocumentProxy(pdfFileBuffer)
        .then((pdfDoc) => {
          if (canvas) {
            renderPdfPageToCanvas(pdfDoc, page.background.pdfPageIndex!, canvas, dpr);
          }
          if (pdfTextLayerRef.current) {
            renderPdfTextLayer(pdfDoc, page.background.pdfPageIndex!, pdfTextLayerRef.current, page.width, page.height);
          }
        })
        .catch((err) => {
          console.error('Error rendering PDF:', err);
        });
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    renderBackground(ctx, page.width, page.height, page.background);
    ctx.restore();
  }, [dpr, page.width, page.height, page.background, pdfFileBuffer]);

  // Render Committed Strokes & Texts Layer (Layer 1)
  const drawCommittedInks = useCallback(() => {
    const canvas = inkCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    for (const layer of page.layers) {
      if (!layer.visible) continue;
      for (const stroke of layer.strokes) {
        renderStroke(ctx, stroke);
      }
      if (layer.texts) {
        for (const t of layer.texts) {
          ctx.save();
          ctx.fillStyle = t.color || '#000000';
          const style = `${t.italic ? 'italic ' : ''}${t.bold ? 'bold ' : ''}${t.fontSize || 18}px ${t.fontFamily || 'sans-serif'}`;
          ctx.font = style;
          ctx.textBaseline = 'top';
          ctx.textAlign = t.align || 'left';
          const lines = t.text.split('\n');
          const lineH = (t.fontSize || 18) * 1.25;
          lines.forEach((l, idx) => {
            ctx.fillText(l, t.x, t.y + idx * lineH);
          });
          ctx.restore();
        }
      }
      if (layer.images) {
        for (const imgItem of layer.images) {
          const img = new Image();
          img.src = imgItem.dataUrl;
          if (img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, imgItem.x, imgItem.y, imgItem.width, imgItem.height);
          } else {
            img.onload = () => {
              const c = inkCanvasRef.current;
              const cx = c?.getContext('2d');
              if (cx) {
                cx.save();
                cx.scale(dpr, dpr);
                cx.drawImage(img, imgItem.x, imgItem.y, imgItem.width, imgItem.height);
                cx.restore();
              }
            };
          }
        }
      }
    }

    ctx.restore();
  }, [dpr, page.layers]);

  // Render Selection & Handles Overlay (Layer 3)
  const drawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (selectedStrokeIds.length === 0) return;

    const activeLayer = page.layers[0];
    if (!activeLayer) return;

    const selectedSet = new Set(selectedStrokeIds);
    const selectedStrokes = activeLayer.strokes.filter((s) => selectedSet.has(s.id));
    const box = getStrokesBoundingBox(selectedStrokes);
    if (!box) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(box.minX, box.minY, box.width, box.height);

    ctx.fillStyle = 'rgba(59, 130, 246, 0.06)';
    ctx.fillRect(box.minX, box.minY, box.width, box.height);

    const handleSize = 8;
    const handles = [
      { x: box.minX, y: box.minY },
      { x: box.maxX, y: box.minY },
      { x: box.maxX, y: box.maxY },
      { x: box.minX, y: box.maxY },
    ];

    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;

    for (const h of handles) {
      ctx.beginPath();
      ctx.arc(h.x, h.y, handleSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Rotation Handle (top center)
    const midX = (box.minX + box.maxX) / 2;
    const rotateHandleY = box.minY - 22;

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(midX, box.minY);
    ctx.lineTo(midX, rotateHandleY);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(midX, rotateHandleY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();

    // Render Geometry Tools Overlay (Setsquare or Compass)
    if (geometryTool === 'setsquare') {
      ctx.save();
      ctx.scale(dpr, dpr);
      renderSetsquare(ctx, setsquareState);
      ctx.restore();
    } else if (geometryTool === 'compass') {
      ctx.save();
      ctx.scale(dpr, dpr);
      renderCompass(ctx, compassState);
      ctx.restore();
    }
  }, [dpr, selectedStrokeIds, page.layers, geometryTool, setsquareState, compassState]);

  const clearActiveCanvas = useCallback(() => {
    const canvas = activeCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // 1. Sync canvas buffer size ONLY when width, height, or dpr genuine change
  // NEVER attach drawCommittedInks or other callbacks here, to prevent GPU texture reallocations!
  useEffect(() => {
    const targetW = Math.round(page.width * dpr);
    const targetH = Math.round(page.height * dpr);
    const canvases = [
      bgCanvasRef.current,
      inkCanvasRef.current,
      activeCanvasRef.current,
      overlayCanvasRef.current,
    ];

    let resized = false;
    canvases.forEach((canvas) => {
      if (!canvas) return;
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        canvas.style.width = `${page.width}px`;
        canvas.style.height = `${page.height}px`;
        resized = true;
      }
    });

    if (resized) {
      drawBackground();
      drawCommittedInks();
      drawOverlay();
      clearActiveCanvas();
    }
  }, [page.width, page.height, dpr, drawBackground, drawCommittedInks, drawOverlay, clearActiveCanvas]);

  // Redraw committed inks when page layers change externally (Undo, Redo, File Open)
  useEffect(() => {
    drawCommittedInks();
  }, [page.layers, drawCommittedInks]);

  // Redraw background when background config or PDF buffer changes
  useEffect(() => {
    drawBackground();
  }, [page.background, pdfFileBuffer, drawBackground]);

  // Redraw selection overlay
  useEffect(() => {
    drawOverlay();
  }, [selectedStrokeIds, drawOverlay]);

  // Zero-layout-reflow coordinate extraction
  const getCanvasCoords = (e: { clientX: number; clientY: number; pressure?: number; pointerType?: string }): Point => {
    let rect = cachedRectRef.current;
    if (!rect) {
      const canvas = activeCanvasRef.current;
      if (canvas) {
        rect = canvas.getBoundingClientRect();
        cachedRectRef.current = rect;
      }
    }

    const left = rect ? rect.left : 0;
    const top = rect ? rect.top : 0;
    const scaleX = rect && rect.width > 0 ? rect.width / page.width : zoom;
    const scaleY = rect && rect.height > 0 ? rect.height / page.height : zoom;

    const x = (e.clientX - left) / scaleX;
    const y = (e.clientY - top) / scaleY;

    const prefs = useAppStore.getState().preferences;
    let rawPressure = e.pressure !== undefined ? e.pressure : 0.5;
    if (rawPressure === 0 && e.pointerType === 'mouse') {
      rawPressure = 0.5;
    } else if (rawPressure === 0 && e.pointerType === 'pen') {
      rawPressure = 0.1;
    }

    const multiplier = prefs?.pressureMultiplier ?? 1.0;
    const minPressure = prefs?.minPressure ?? 0.05;
    const pressure = Math.max(minPressure, Math.min(1.0, rawPressure * multiplier));

    let finalX = x;
    let finalY = y;
    if (prefs?.gridSnapping && prefs.gridSnapSize > 0) {
      finalX = Math.round(x / prefs.gridSnapSize) * prefs.gridSnapSize;
      finalY = Math.round(y / prefs.gridSnapSize) * prefs.gridSnapSize;
    }

    return { x: finalX, y: finalY, pressure, time: Date.now() };
  };

  const getSelectionHitInfo = (pt: Point): { type: 'handle' | 'rotate' | 'inside' | 'none'; handleIndex: number } => {
    if (selectedStrokeIds.length === 0) return { type: 'none', handleIndex: -1 };

    const activeLayer = page.layers[0];
    if (!activeLayer) return { type: 'none', handleIndex: -1 };

    const selectedSet = new Set(selectedStrokeIds);
    const selectedStrokes = activeLayer.strokes.filter((s) => selectedSet.has(s.id));
    const box = getStrokesBoundingBox(selectedStrokes);
    if (!box) return { type: 'none', handleIndex: -1 };

    // Check rotation handle hit
    const midX = (box.minX + box.maxX) / 2;
    const rotateHandleY = box.minY - 22;
    const rotHitRadius = 12 / zoom;
    if (Math.hypot(pt.x - midX, pt.y - rotateHandleY) <= rotHitRadius) {
      return { type: 'rotate', handleIndex: -1 };
    }

    const handleRadius = 12 / zoom;
    const handles = [
      { x: box.minX, y: box.minY },
      { x: box.maxX, y: box.minY },
      { x: box.maxX, y: box.maxY },
      { x: box.minX, y: box.maxY },
    ];

    for (let i = 0; i < handles.length; i++) {
      const h = handles[i];
      const dx = pt.x - h.x;
      const dy = pt.y - h.y;
      if (dx * dx + dy * dy <= handleRadius * handleRadius) {
        return { type: 'handle', handleIndex: i };
      }
    }

    if (pt.x >= box.minX && pt.x <= box.maxX && pt.y >= box.minY && pt.y <= box.maxY) {
      return { type: 'inside', handleIndex: -1 };
    }

    return { type: 'none', handleIndex: -1 };
  };

  // Ultra-fast incremental live segment (0.00ms execution per micro-segment)
  const drawLiveSegment = (p1: Point, p2: Point) => {
    const ctx = activeCtxRef.current;
    if (!ctx) return;

    const isHighlighter = activeTool === 'highlighter';
    const settings = isHighlighter ? highlighterSettings : penSettings;
    const width = settings.width * (p2.pressure ? p2.pressure * 1.3 : 1.0);
    ctx.lineWidth = Math.max(0.8, width);

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  };

  const renderShapeDraft = () => {
    const canvas = activeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    const pts = currentPointsRef.current;
    if (pts.length >= 2) {
      const start = pts[0];
      const end = pts[pts.length - 1];
      renderShape(ctx, {
        id: 'draft-shape',
        tool: 'pen',
        color: penSettings.color,
        width: penSettings.width,
        points: [start, end],
        opacity: 1.0,
        shapeType: activeTool as ShapeType,
        lineStyle: lineStyle,
        capStyle: capStyle,
        fill: fillEnabled ? penSettings.color : undefined,
        fillOpacity: fillOpacity,
      });
    }

    ctx.restore();
  };

  const renderMarqueeDraft = (start: Point, current: Point) => {
    const canvas = activeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    const minX = Math.min(start.x, current.x);
    const minY = Math.min(start.y, current.y);
    const width = Math.abs(current.x - start.x);
    const height = Math.abs(current.y - start.y);

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(minX, minY, width, height);

    ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
    ctx.fillRect(minX, minY, width, height);

    ctx.restore();
  };

  const renderLassoDraft = (points: Point[]) => {
    const canvas = activeCanvasRef.current;
    if (!canvas || points.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
    ctx.fill();

    ctx.restore();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setActivePage(pageIndex);
    const isStylusButton = e.button === 2 || e.buttons === 2 || e.buttons === 32;
    if (e.button !== 0 && !isStylusButton) return;

    const canvas = activeCanvasRef.current;
    if (canvas) {
      cachedRectRef.current = canvas.getBoundingClientRect();
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
    }

    isInteractingRef.current = true;
    const startPt = getCanvasCoords(e);
    startCanvasPtRef.current = startPt;
    lastCanvasPtRef.current = startPt;
    startClientPtRef.current = { x: e.clientX, y: e.clientY };
    currentPointsRef.current = [startPt];
    erasedStrokesMapRef.current.clear();

    // Stylus button action mapping from preferences
    if (isStylusButton) {
      const prefs = useAppStore.getState().preferences;
      const action = prefs?.stylusButtonAction || 'eraser';
      if (action === 'eraser') {
        interactionModeRef.current = eraserType === 'whiteout' ? 'whiteout' : 'erase';
        return;
      } else if (action === 'select') {
        interactionModeRef.current = 'selectBox';
        return;
      } else if (action === 'hand') {
        interactionModeRef.current = 'hand';
        return;
      }
    }

    if (activeTool === 'hand') {
      interactionModeRef.current = 'hand';
      return;
    }

    // Geometry tools interaction check (Setsquare and Compass)
    if (geometryTool === 'setsquare') {
      const setsquareHit = hitTestSetsquare(startPt, setsquareState);
      if (setsquareHit === 'rotate') {
        interactionModeRef.current = 'setsquareRotate';
        return;
      } else if (setsquareHit === 'body') {
        interactionModeRef.current = 'setsquareMove';
        return;
      }
    } else if (geometryTool === 'compass') {
      const distToCenter = Math.hypot(startPt.x - compassState.centerX, startPt.y - compassState.centerY);
      if (distToCenter <= 16) {
        interactionModeRef.current = 'compassMove';
        return;
      }
      if (Math.abs(distToCenter - compassState.radius) <= 16) {
        interactionModeRef.current = 'compassRadius';
        return;
      }
    }

    if (activeTool === 'verticalSpace') {
      interactionModeRef.current = 'verticalSpace';
      return;
    }

    if (activeTool === 'text') {
      const activeLayer = page.layers[0];
      const clickedText = activeLayer?.texts?.find((t) => {
        const lineCount = t.text.split('\n').length;
        const h = (t.fontSize || 18) * 1.3 * lineCount;
        const w = t.text.length * (t.fontSize || 18) * 0.6;
        return startPt.x >= t.x && startPt.x <= t.x + w && startPt.y >= t.y && startPt.y <= t.y + h;
      });

      if (clickedText) {
        setActiveTextEditor({
          x: clickedText.x,
          y: clickedText.y,
          text: clickedText.text,
          id: clickedText.id,
        });
      } else {
        setActiveTextEditor({
          x: startPt.x,
          y: startPt.y,
          text: '',
        });
      }
      return;
    }

    if (activeTool === 'selectRect' || activeTool === 'selectRegion') {
      const hit = getSelectionHitInfo(startPt);
      if (hit.type === 'rotate') {
        interactionModeRef.current = 'rotateSelection';
        return;
      } else if (hit.type === 'handle') {
        interactionModeRef.current = 'resizeSelection';
        resizeHandleIndexRef.current = hit.handleIndex;
        return;
      } else if (hit.type === 'inside') {
        interactionModeRef.current = 'moveSelection';
        return;
      } else {
        const activeLayer = page.layers[0];
        if (activeLayer) {
          const clickedStroke = [...activeLayer.strokes].reverse().find((s) => isPointNearStroke(s, startPt.x, startPt.y, 6));
          if (clickedStroke) {
            setSelectedStrokeIds([clickedStroke.id]);
            interactionModeRef.current = 'moveSelection';
            return;
          }
        }
        interactionModeRef.current = activeTool === 'selectRegion' ? 'lasso' : 'selectBox';
        setSelectedStrokeIds([]);
        return;
      }
    }

    if (activeTool === 'eraser') {
      if (eraserType === 'whiteout') {
        interactionModeRef.current = 'whiteout';
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            activeCtxRef.current = ctx;
            ctx.save();
            ctx.scale(dpr, dpr);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = '#ffffff';
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 1.0;
            ctx.lineWidth = eraserWidth;

            ctx.beginPath();
            ctx.arc(startPt.x, startPt.y, eraserWidth / 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        return;
      } else {
        interactionModeRef.current = 'erase';
        handleEraserAction(startPt.x, startPt.y);
        return;
      }
    }

    // Set up direct GPU context once on pointerdown for drawing
    interactionModeRef.current = 'draw';
    if (activeTool === 'pen' || activeTool === 'highlighter') {
      stabilizerRef.current.reset(startPt);
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          activeCtxRef.current = ctx;
          ctx.save();
          ctx.scale(dpr, dpr);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          const isHighlighter = activeTool === 'highlighter';
          const settings = isHighlighter ? highlighterSettings : penSettings;
          ctx.strokeStyle = settings.color;
          ctx.fillStyle = settings.color;

          if (isHighlighter) {
            ctx.globalCompositeOperation = 'multiply';
            ctx.globalAlpha = 0.45;
          } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1.0;
          }

          // Draw instantaneous dot on touch/click
          const radius = Math.max(0.6, (settings.width / 2) * (startPt.pressure || 0.5));
          ctx.beginPath();
          ctx.arc(startPt.x, startPt.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isInteractingRef.current) return;

    if (interactionModeRef.current === 'hand') {
      const dx = e.clientX - startClientPtRef.current.x;
      const dy = e.clientY - startClientPtRef.current.y;
      const container = activeCanvasRef.current?.closest('main');
      if (container) {
        container.scrollLeft -= dx;
        container.scrollTop -= dy;
      }
      startClientPtRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Setsquare Drag & Rotate
    if (interactionModeRef.current === 'setsquareMove') {
      const currentPt = getCanvasCoords(e);
      const dx = currentPt.x - lastCanvasPtRef.current.x;
      const dy = currentPt.y - lastCanvasPtRef.current.y;
      updateSetsquare({ x: setsquareState.x + dx, y: setsquareState.y + dy });
      lastCanvasPtRef.current = currentPt;
      drawOverlay();
      return;
    }

    if (interactionModeRef.current === 'setsquareRotate') {
      const currentPt = getCanvasCoords(e);
      const prevAngle = Math.atan2(lastCanvasPtRef.current.y - setsquareState.y, lastCanvasPtRef.current.x - setsquareState.x);
      const curAngle = Math.atan2(currentPt.y - setsquareState.y, currentPt.x - setsquareState.x);
      updateSetsquare({ angle: setsquareState.angle + (curAngle - prevAngle) });
      lastCanvasPtRef.current = currentPt;
      drawOverlay();
      return;
    }

    // Compass Move & Radius adjustment
    if (interactionModeRef.current === 'compassMove') {
      const currentPt = getCanvasCoords(e);
      const dx = currentPt.x - lastCanvasPtRef.current.x;
      const dy = currentPt.y - lastCanvasPtRef.current.y;
      updateCompass({ centerX: compassState.centerX + dx, centerY: compassState.centerY + dy });
      lastCanvasPtRef.current = currentPt;
      drawOverlay();
      return;
    }

    if (interactionModeRef.current === 'compassRadius') {
      const currentPt = getCanvasCoords(e);
      const newRadius = Math.max(20, Math.hypot(currentPt.x - compassState.centerX, currentPt.y - compassState.centerY));
      updateCompass({ radius: newRadius });
      lastCanvasPtRef.current = currentPt;
      drawOverlay();
      return;
    }

    if (interactionModeRef.current === 'moveSelection') {
      // Edge Panning
      const container = activeCanvasRef.current?.closest('main');
      if (container) {
        const margin = 40;
        const rect = container.getBoundingClientRect();
        if (e.clientY < rect.top + margin) container.scrollTop -= 12;
        else if (e.clientY > rect.bottom - margin) container.scrollTop += 12;
        if (e.clientX < rect.left + margin) container.scrollLeft -= 12;
        else if (e.clientX > rect.right - margin) container.scrollLeft += 12;
      }

      const currentPt = getCanvasCoords(e);
      const dx = currentPt.x - lastCanvasPtRef.current.x;
      const dy = currentPt.y - lastCanvasPtRef.current.y;
      lastCanvasPtRef.current = currentPt;

      moveSelectedStrokes(dx, dy);
      drawCommittedInks();
      drawOverlay();
      return;
    }

    if (interactionModeRef.current === 'rotateSelection') {
      const currentPt = getCanvasCoords(e);
      const activeLayer = page.layers[0];
      if (!activeLayer) return;

      const selectedSet = new Set(selectedStrokeIds);
      const selectedStrokes = activeLayer.strokes.filter((s) => selectedSet.has(s.id));
      const box = getStrokesBoundingBox(selectedStrokes);
      if (!box) return;

      const centerX = (box.minX + box.maxX) / 2;
      const centerY = (box.minY + box.maxY) / 2;

      const prevAngle = Math.atan2(lastCanvasPtRef.current.y - centerY, lastCanvasPtRef.current.x - centerX);
      const currentAngle = Math.atan2(currentPt.y - centerY, currentPt.x - centerX);
      const deltaAngle = currentAngle - prevAngle;

      rotateSelectedStrokes(deltaAngle, centerX, centerY);
      lastCanvasPtRef.current = currentPt;
      drawCommittedInks();
      drawOverlay();
      return;
    }

    if (interactionModeRef.current === 'verticalSpace') {
      // Edge Panning
      const container = activeCanvasRef.current?.closest('main');
      if (container) {
        const margin = 40;
        const rect = container.getBoundingClientRect();
        if (e.clientY < rect.top + margin) container.scrollTop -= 12;
        else if (e.clientY > rect.bottom - margin) container.scrollTop += 12;
      }

      const currentPt = getCanvasCoords(e);
      const startY = startCanvasPtRef.current.y;
      const dy = currentPt.y - startY;

      // Render vertical space preview on activeCanvas
      const canvas = activeCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          ctx.scale(dpr, dpr);

          // Horizontal divider line
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(0, startY);
          ctx.lineTo(page.width, startY);
          ctx.stroke();

          // Arrow indicating shift
          ctx.strokeStyle = '#2563eb';
          ctx.fillStyle = '#2563eb';
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
          const arrowX = page.width / 2;
          ctx.beginPath();
          ctx.moveTo(arrowX, startY);
          ctx.lineTo(arrowX, currentPt.y);
          ctx.stroke();

          const headLen = 8;
          const headAngle = dy >= 0 ? Math.PI / 2 : -Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(arrowX, currentPt.y);
          ctx.lineTo(arrowX - headLen * Math.cos(headAngle - Math.PI / 6), currentPt.y - headLen * Math.sin(headAngle - Math.PI / 6));
          ctx.lineTo(arrowX - headLen * Math.cos(headAngle + Math.PI / 6), currentPt.y - headLen * Math.sin(headAngle + Math.PI / 6));
          ctx.fill();

          // Badge
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(arrowX + 12, (startY + currentPt.y) / 2 - 10, 60, 20);
          ctx.fillStyle = '#ffffff';
          ctx.font = '11px sans-serif';
          ctx.fillText(`${Math.round(dy)} px`, arrowX + 18, (startY + currentPt.y) / 2 + 4);

          ctx.restore();
        }
      }
      return;
    }

    if (interactionModeRef.current === 'resizeSelection') {
      const currentPt = getCanvasCoords(e);
      const activeLayer = page.layers[0];
      if (!activeLayer) return;

      const selectedSet = new Set(selectedStrokeIds);
      const selectedStrokes = activeLayer.strokes.filter((s) => selectedSet.has(s.id));
      const box = getStrokesBoundingBox(selectedStrokes);
      if (!box || box.width <= 0 || box.height <= 0) return;

      const handleIdx = resizeHandleIndexRef.current;
      let originX = box.maxX;
      let originY = box.maxY;
      if (handleIdx === 1) { originX = box.minX; originY = box.maxY; }
      else if (handleIdx === 2) { originX = box.minX; originY = box.minY; }
      else if (handleIdx === 3) { originX = box.maxX; originY = box.minY; }

      const oldDistX = Math.abs(lastCanvasPtRef.current.x - originX);
      const oldDistY = Math.abs(lastCanvasPtRef.current.y - originY);
      const newDistX = Math.abs(currentPt.x - originX);
      const newDistY = Math.abs(currentPt.y - originY);

      const scaleX = oldDistX > 2 ? newDistX / oldDistX : 1;
      const scaleY = oldDistY > 2 ? newDistY / oldDistY : 1;

      scaleSelectedStrokes(scaleX, scaleY, originX, originY);
      lastCanvasPtRef.current = currentPt;
      drawCommittedInks();
      drawOverlay();
      return;
    }

    if (interactionModeRef.current === 'selectBox') {
      const currentPt = getCanvasCoords(e);
      renderMarqueeDraft(startCanvasPtRef.current, currentPt);
      return;
    }

    if (interactionModeRef.current === 'lasso') {
      const currentPt = getCanvasCoords(e);
      const prev = currentPointsRef.current[currentPointsRef.current.length - 1];
      if (!prev || Math.hypot(currentPt.x - prev.x, currentPt.y - prev.y) >= 2) {
        currentPointsRef.current.push(currentPt);
        renderLassoDraft(currentPointsRef.current);
      }
      return;
    }

    // Geometric Shapes preview
    if (
      activeTool === 'line' ||
      activeTool === 'arrow' ||
      activeTool === 'doubleArrow' ||
      activeTool === 'rect' ||
      activeTool === 'ellipse'
    ) {
      const currentPt = getCanvasCoords(e);
      currentPointsRef.current = [startCanvasPtRef.current, currentPt];
      renderShapeDraft();
      return;
    }

    // Instant Freehand Inking, Whiteout & Eraser
    const nativeEvent = e.nativeEvent as PointerEvent;
    const coalescedEvents =
      typeof nativeEvent.getCoalescedEvents === 'function' ? nativeEvent.getCoalescedEvents() : [e];

    for (const ev of coalescedEvents) {
      let pt = getCanvasCoords(ev);

      // Magnetic snapping to Setsquare or Compass if tool is active
      if (interactionModeRef.current === 'draw') {
        if (geometryTool === 'setsquare') {
          pt = snapPointToSetsquare(pt, setsquareState);
        } else if (geometryTool === 'compass') {
          pt = snapPointToCompass(pt, compassState);
        }

        // Advanced stroke stabilization
        const stabilized = stabilizerRef.current.push(pt);
        if (!stabilized) continue;
        pt = stabilized;
      }

      const prevPt = currentPointsRef.current[currentPointsRef.current.length - 1] || pt;

      // Filter micro sub-pixel noise (< 0.25px distance) for speed & memory efficiency
      const dx = pt.x - prevPt.x;
      const dy = pt.y - prevPt.y;
      if (dx * dx + dy * dy < 0.25 && currentPointsRef.current.length > 1) {
        continue;
      }

      currentPointsRef.current.push(pt);

      if (interactionModeRef.current === 'draw') {
        drawLiveSegment(prevPt, pt);
      } else if (interactionModeRef.current === 'whiteout') {
        const ctx = activeCtxRef.current;
        if (ctx) {
          ctx.lineWidth = eraserWidth;
          ctx.beginPath();
          ctx.moveTo(prevPt.x, prevPt.y);
          ctx.lineTo(pt.x, pt.y);
          ctx.stroke();
        }
      } else if (interactionModeRef.current === 'erase') {
        handleEraserAction(pt.x, pt.y);
      }
    }
  };

  const handleEraserAction = (px: number, py: number) => {
    const activeLayer = page.layers[0];
    if (!activeLayer) return;

    let hasNewErased = false;
    activeLayer.strokes.forEach((stroke, index) => {
      if (erasedStrokesMapRef.current.has(stroke.id)) return;

      if (isPointNearStroke(stroke, px, py, eraserWidth / 2)) {
        erasedStrokesMapRef.current.set(stroke.id, { stroke, index });
        hasNewErased = true;
      }
    });

    if (hasNewErased) {
      const canvas = inkCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);

      for (const stroke of activeLayer.strokes) {
        if (!erasedStrokesMapRef.current.has(stroke.id)) {
          renderStroke(ctx, stroke);
        }
      }
      ctx.restore();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isInteractingRef.current) return;
    isInteractingRef.current = false;
    cachedRectRef.current = null;

    const canvas = activeCanvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
    }

    if (activeCtxRef.current) {
      activeCtxRef.current.restore();
      activeCtxRef.current = null;
    }

    if (
      interactionModeRef.current === 'setsquareMove' ||
      interactionModeRef.current === 'setsquareRotate' ||
      interactionModeRef.current === 'compassMove' ||
      interactionModeRef.current === 'compassRadius'
    ) {
      drawOverlay();
      return;
    }

    if (interactionModeRef.current === 'verticalSpace') {
      clearActiveCanvas();
      const currentPt = getCanvasCoords(e);
      const startY = startCanvasPtRef.current.y;
      const dy = currentPt.y - startY;
      if (Math.abs(dy) > 4) {
        insertVerticalSpace(pageIndex, startY, dy);
      }
      return;
    }

    if (interactionModeRef.current === 'rotateSelection') {
      return;
    }

    if (interactionModeRef.current === 'whiteout') {
      const points = currentPointsRef.current;
      if (points.length > 0) {
        const whiteoutStroke: Stroke = {
          id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          tool: 'pen',
          color: '#ffffff',
          width: eraserWidth,
          points: [...points],
          opacity: 1.0,
          shapeType: 'freehand',
          lineStyle: 'plain',
          capStyle: 'round',
        };

        const inkCanvas = inkCanvasRef.current;
        if (inkCanvas) {
          const inkCtx = inkCanvas.getContext('2d');
          if (inkCtx) {
            inkCtx.save();
            inkCtx.scale(dpr, dpr);
            renderStroke(inkCtx, whiteoutStroke);
            inkCtx.restore();
          }
        }

        clearActiveCanvas();
        addStroke(whiteoutStroke);
      } else {
        clearActiveCanvas();
      }
      currentPointsRef.current = [];
      return;
    }

    if (interactionModeRef.current === 'selectBox') {
      clearActiveCanvas();
      const currentPt = getCanvasCoords(e);
      const start = startCanvasPtRef.current;

      const minX = Math.min(start.x, currentPt.x);
      const minY = Math.min(start.y, currentPt.y);
      const width = Math.abs(currentPt.x - start.x);
      const height = Math.abs(currentPt.y - start.y);

      if (width > 4 || height > 4) {
        const activeLayer = page.layers[0];
        if (activeLayer) {
          const matched = activeLayer.strokes
            .filter((s) => isStrokeInBox(s, { x: minX, y: minY, width, height }))
            .map((s) => s.id);
          setSelectedStrokeIds(matched);
        }
      } else {
        setSelectedStrokeIds([]);
      }
      return;
    }

    if (interactionModeRef.current === 'lasso') {
      clearActiveCanvas();
      const polygon = currentPointsRef.current;
      if (polygon.length >= 3) {
        const activeLayer = page.layers[0];
        if (activeLayer) {
          const matched = activeLayer.strokes
            .filter((s) => isStrokeInPolygon(s, polygon))
            .map((s) => s.id);
          setSelectedStrokeIds(matched);
        }
      } else {
        setSelectedStrokeIds([]);
      }
      currentPointsRef.current = [];
      return;
    }

    const isShapeTool =
      activeTool === 'line' ||
      activeTool === 'arrow' ||
      activeTool === 'doubleArrow' ||
      activeTool === 'rect' ||
      activeTool === 'ellipse';

    if (isShapeTool) {
      const pts = currentPointsRef.current;
      if (pts.length >= 2) {
        const start = pts[0];
        const end = pts[pts.length - 1];

        const dist = Math.hypot(end.x - start.x, end.y - start.y);
        if (dist > 3) {
          const newStroke: Stroke = {
            id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            tool: 'pen',
            color: penSettings.color,
            width: penSettings.width,
            points: [start, end],
            opacity: 1.0,
            shapeType: activeTool as ShapeType,
            lineStyle: lineStyle,
            capStyle: capStyle,
            fill: fillEnabled ? penSettings.color : undefined,
            fillOpacity: fillOpacity,
          };

          // Synchronously render shape onto permanent ink canvas immediately
          const inkCanvas = inkCanvasRef.current;
          if (inkCanvas) {
            const inkCtx = inkCanvas.getContext('2d');
            if (inkCtx) {
              inkCtx.save();
              inkCtx.scale(dpr, dpr);
              renderStroke(inkCtx, newStroke);
              inkCtx.restore();
            }
          }

          clearActiveCanvas();
          addStroke(newStroke);
        } else {
          clearActiveCanvas();
        }
      } else {
        clearActiveCanvas();
      }
      currentPointsRef.current = [];
      return;
    }

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      const points = currentPointsRef.current;
      if (points.length > 0) {
        stabilizerRef.current.finalize(points[points.length - 1]);
        const isHighlighter = activeTool === 'highlighter';
        const settings = isHighlighter ? highlighterSettings : penSettings;

        let strokeShapeType: ShapeType = 'freehand';
        let strokePoints = [...points];
        let shapeFill: string | undefined = undefined;
        let shapeFillOpacity: number | undefined = undefined;

        // Shape Recognizer feature
        if (activeTool === 'pen' && shapeRecognizerEnabled) {
          const recognized = recognizeShape(points);
          if (recognized) {
            strokeShapeType = recognized.shapeType;
            strokePoints = recognized.points;
            if (fillEnabled && (recognized.shapeType === 'rect' || recognized.shapeType === 'ellipse')) {
              shapeFill = settings.color;
              shapeFillOpacity = fillOpacity;
            }
          }
        }

        const newStroke: Stroke = {
          id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          tool: activeTool,
          color: settings.color,
          width: settings.width,
          points: strokePoints,
          opacity: isHighlighter ? 0.45 : 1.0,
          shapeType: strokeShapeType,
          lineStyle: lineStyle,
          capStyle: capStyle,
          fill: shapeFill,
          fillOpacity: shapeFillOpacity,
        };

        // 1. Synchronously render to permanent inkCanvas IMMEDIATELY (0ms latency, zero flicker!)
        const inkCanvas = inkCanvasRef.current;
        if (inkCanvas) {
          const inkCtx = inkCanvas.getContext('2d');
          if (inkCtx) {
            inkCtx.save();
            inkCtx.scale(dpr, dpr);
            renderStroke(inkCtx, newStroke);
            inkCtx.restore();
          }
        }

        // 2. Clear draft active canvas
        clearActiveCanvas();

        // 3. Dispatch to Zustand store (persists history & document tree)
        addStroke(newStroke);
      } else {
        clearActiveCanvas();
      }
    } else if (activeTool === 'eraser') {
      if (erasedStrokesMapRef.current.size > 0) {
        const deletedArray = Array.from(erasedStrokesMapRef.current.values());
        deleteStrokes(deletedArray);
      }
    }

    currentPointsRef.current = [];
    erasedStrokesMapRef.current.clear();
  };

  const cursorClass =
    activeTool === 'hand'
      ? 'cursor-grab active:cursor-grabbing'
      : activeTool === 'verticalSpace'
      ? 'cursor-ns-resize'
      : activeTool === 'selectRect' || activeTool === 'selectRegion'
      ? 'cursor-default'
      : activeTool === 'text'
      ? 'cursor-text'
      : activeTool === 'pen' ||
        activeTool === 'highlighter' ||
        activeTool === 'line' ||
        activeTool === 'arrow' ||
        activeTool === 'doubleArrow' ||
        activeTool === 'rect' ||
        activeTool === 'ellipse'
      ? 'cursor-crosshair'
      : activeTool === 'eraser'
      ? 'cursor-cell'
      : 'cursor-default';

  return (
    <div
      className="relative shadow-xl rounded-sm bg-white border border-slate-300 transition-shadow duration-150 hover:shadow-2xl"
      style={{
        width: `${page.width}px`,
        height: `${page.height}px`,
      }}
    >
      {/* Layer 0: Background Canvas (Paper / Grids / PDF) */}
      <canvas
        ref={bgCanvasRef}
        className="absolute inset-0 pointer-events-none rounded-sm"
      />

      {/* Layer 0.5: PDF Selectable Text Layer */}
      {page.background.type === 'pdf' && (
        <div
          ref={pdfTextLayerRef}
          className="absolute inset-0 select-text overflow-hidden pointer-events-none"
          style={{ width: `${page.width}px`, height: `${page.height}px` }}
        />
      )}

      {/* Layer 1: Committed Inks & Shapes Canvas */}
      <canvas
        ref={inkCanvasRef}
        className="absolute inset-0 pointer-events-none rounded-sm"
      />

      {/* Layer 2: Live Inking, Shapes & Marquee Draft Canvas */}
      <canvas
        ref={activeCanvasRef}
        style={{ touchAction: 'none' }}
        className={`absolute inset-0 touch-none ${cursorClass} rounded-sm`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      {/* Layer 3: Selection Bounding Box & Transform Handles */}
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 pointer-events-none rounded-sm"
      />

      {/* Layer 4: Inline Text Editor */}
      {activeTextEditor && (
        <textarea
          autoFocus
          value={activeTextEditor.text}
          onChange={(e) => setActiveTextEditor({ ...activeTextEditor, text: e.target.value })}
          onBlur={() => {
            if (activeTextEditor.text.trim()) {
              if (activeTextEditor.id) {
                updateTextElement(activeTextEditor.id, activeTextEditor.text);
              } else {
                addTextElement({
                  id: `text-${Date.now()}`,
                  x: activeTextEditor.x,
                  y: activeTextEditor.y,
                  text: activeTextEditor.text,
                  fontFamily,
                  fontSize,
                  color: penSettings.color,
                  bold: isBold,
                  italic: isItalic,
                  align: textAlign,
                });
              }
            } else if (activeTextEditor.id) {
              deleteTextElement(activeTextEditor.id);
            }
            setActiveTextEditor(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setActiveTextEditor(null);
            }
          }}
          className="absolute z-30 bg-transparent border border-dashed border-blue-400 focus:outline-none resize-none p-1 shadow-sm rounded"
          style={{
            left: `${activeTextEditor.x}px`,
            top: `${activeTextEditor.y}px`,
            fontFamily,
            fontSize: `${fontSize}px`,
            fontWeight: isBold ? 'bold' : 'normal',
            fontStyle: isItalic ? 'italic' : 'normal',
            textAlign: textAlign,
            color: penSettings.color,
            minWidth: '150px',
            minHeight: `${fontSize * 1.5}px`,
          }}
        />
      )}
    </div>
  );
};

export const PageCanvas = React.memo(PageCanvasComponent);
