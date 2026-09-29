import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { SphereItem, MapTheme } from '../types/map';

export interface ScreenPositionUpdate {
  x: number;
  y: number;
  visible: boolean;
}

export interface GraphParameters {
  baseNodeRadius: number;
  masterNodeRadius: number;
  hoverNodeScale: number;
  selectedNodeScale: number;
  baseEdgeWidth: number;
  highlightEdgeWidth: number;
  clusterSpreadX: number;
  clusterSpreadY: number;
  pulseSpeed: number;
}

export const DEFAULT_GRAPH_PARAMS: GraphParameters = {
  baseNodeRadius: 18,
  masterNodeRadius: 28,
  hoverNodeScale: 1.35,
  selectedNodeScale: 1.4,
  baseEdgeWidth: 1.5,
  highlightEdgeWidth: 3.2,
  clusterSpreadX: 520,
  clusterSpreadY: 260,
  pulseSpeed: 0.0012,
};

interface GalaxyCanvasProps {
  spheres: SphereItem[];
  selectedSphereId: string | null;
  hoveredSphereId: string | null;
  onSelectSphere: (sphereId: string) => void;
  onDoubleClickSphere?: (sphereId: string) => void;
  onHoverSphere: (sphereId: string | null, mousePos?: { x: number; y: number }) => void;
  onSelectedScreenPosUpdate?: (pos: ScreenPositionUpdate | null) => void;
  graphParams?: Partial<GraphParameters>;
}

// Theme color map for 2D Knowledge Graph nodes
const THEME_HEX: Record<MapTheme, { primary: string; glow: string; core: string }> = {
  neon: { primary: '#00f3ff', glow: 'rgba(0, 243, 255, 0.4)', core: '#e0f7fa' },
  topographic: { primary: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', core: '#ecfdf5' },
  heatmap: { primary: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', core: '#fffbeb' },
  wireframe: { primary: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)', core: '#eff6ff' },
  minimal: { primary: '#94a3b8', glow: 'rgba(148, 163, 184, 0.4)', core: '#f8fafc' },
  cyber: { primary: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)', core: '#faf5ff' },
};

export interface GraphNode {
  id: string;
  sphere: SphereItem;
  x: number;
  y: number;
  radius: number;
  color: { primary: string; glow: string; core: string };
  isMaster: boolean;
}

export interface GraphEdge {
  sourceId: string;
  targetId: string;
  sourceIndex: number;
  targetIndex: number;
  weight: number;
}

/**
 * Calculates responsive landscape 2D Knowledge Graph node positions.
 * Spreads nodes horizontally across wider viewports according to container aspect ratio.
 */
export function calculateKnowledgeGraphLayout(
  spheres: SphereItem[],
  aspectRatio: number,
  params: GraphParameters
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const count = spheres.length;
  if (count === 0) return { nodes: [], edges: [] };

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Landscape spread factor scales with viewport aspect ratio (min 1.0)
  const aspectMultiplier = Math.max(1.0, aspectRatio / 1.4);
  const spreadX = params.clusterSpreadX * aspectMultiplier;
  const spreadY = params.clusterSpreadY;

  spheres.forEach((sphere, i) => {
    const isMaster = i === 0;
    const themeColor = THEME_HEX[sphere.theme] || THEME_HEX.neon;
    const radius = isMaster ? params.masterNodeRadius : params.baseNodeRadius;

    let x = 0;
    let y = 0;

    if (!isMaster) {
      // Clustered logarithmic landscape distribution
      const ringIndex = Math.floor(Math.sqrt(i));
      const itemsInRing = ringIndex * 4 + 2;
      const angleInRing = ((i % itemsInRing) / itemsInRing) * 2 * Math.PI;

      // Seeded deterministic offset for node uniqueness
      const seed = sphere.seed || (i * 9301 + 49297) % 233280;
      const jitterX = ((seed % 100) / 100 - 0.5) * 45;
      const jitterY = (((seed * 13) % 100) / 100 - 0.5) * 35;

      const ringRadiusX = (ringIndex * 140 + 130) * (spreadX / 400);
      const ringRadiusY = (ringIndex * 90 + 75) * (spreadY / 250);

      x = Math.cos(angleInRing) * ringRadiusX + jitterX;
      y = Math.sin(angleInRing) * ringRadiusY + jitterY;
    }

    nodes.push({
      id: sphere.id,
      sphere,
      x,
      y,
      radius,
      color: themeColor,
      isMaster,
    });
  });

  // Build graph edges connecting related community nodes
  for (let i = 0; i < count; i++) {
    const nodeA = nodes[i];

    // 1. Connect Master node to primary tier-1 nodes
    if (i > 0 && i <= Math.min(6, count - 1)) {
      edges.push({
        sourceId: nodes[0].id,
        targetId: nodeA.id,
        sourceIndex: 0,
        targetIndex: i,
        weight: 1.0,
      });
    }

    // 2. Sequential ring connection
    if (i > 1) {
      edges.push({
        sourceId: nodes[i - 1].id,
        targetId: nodeA.id,
        sourceIndex: i - 1,
        targetIndex: i,
        weight: 0.65,
      });
    }

    // 3. Theme/Mode similarity edge connection
    for (let j = i + 1; j < count; j++) {
      const nodeB = nodes[j];
      const sameTheme = nodeA.sphere.theme === nodeB.sphere.theme;
      const sameMode = nodeA.sphere.mappingMode === nodeB.sphere.mappingMode;
      const distSq = (nodeA.x - nodeB.x) ** 2 + (nodeA.y - nodeB.y) ** 2;

      // Add edge if close proximity in 2D space or matching metadata
      if ((sameTheme && distSq < (spreadX * 0.7) ** 2) || (sameMode && distSq < (spreadX * 0.45) ** 2)) {
        edges.push({
          sourceId: nodeA.id,
          targetId: nodeB.id,
          sourceIndex: i,
          targetIndex: j,
          weight: 0.5,
        });
      }
    }
  }

  return { nodes, edges };
}

export const GalaxyCanvas: React.FC<GalaxyCanvasProps> = ({
  spheres,
  selectedSphereId,
  hoveredSphereId,
  onSelectSphere,
  onDoubleClickSphere,
  onHoverSphere,
  onSelectedScreenPosUpdate,
  graphParams: customGraphParams,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Merge graph parameters
  const params = useMemo<GraphParameters>(() => {
    return { ...DEFAULT_GRAPH_PARAMS, ...customGraphParams };
  }, [customGraphParams]);

  // Viewport Pan & Zoom state
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoomRef = useRef<number>(1.0);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Animation pulse offset
  const pulsePhaseRef = useRef<number>(0);

  // Dynamic prop references for continuous animation loop
  const spheresRef = useRef(spheres);
  spheresRef.current = spheres;

  const selectedSphereIdRef = useRef(selectedSphereId);
  selectedSphereIdRef.current = selectedSphereId;

  const hoveredSphereIdRef = useRef(hoveredSphereId);
  hoveredSphereIdRef.current = hoveredSphereId;

  const onHoverSphereRef = useRef(onHoverSphere);
  onHoverSphereRef.current = onHoverSphere;

  const onSelectSphereRef = useRef(onSelectSphere);
  onSelectSphereRef.current = onSelectSphere;

  const onDoubleClickSphereRef = useRef(onDoubleClickSphere);
  onDoubleClickSphereRef.current = onDoubleClickSphere;

  const onSelectedScreenPosUpdateRef = useRef(onSelectedScreenPosUpdate);
  onSelectedScreenPosUpdateRef.current = onSelectedScreenPosUpdate;

  // Cached layout data
  const layoutRef = useRef<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] });

  // Update layout when spheres change or container resizes
  const updateLayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 1000;
    const height = container.clientHeight || 700;
    const aspectRatio = width / height;

    layoutRef.current = calculateKnowledgeGraphLayout(spheresRef.current, aspectRatio, params);
  }, [params]);

  // Recalculate layout whenever spheres list changes
  useEffect(() => {
    updateLayout();
  }, [spheres, updateLayout]);

  // Main 2D Canvas Render & Animation Loop
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = container.clientWidth;
      const height = container.clientHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
      updateLayout();
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Render loop
    const render = () => {
      animationFrameId = requestAnimationFrame(render);

      const width = container.clientWidth;
      const height = container.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      // Advance edge pulse phase
      pulsePhaseRef.current = (pulsePhaseRef.current + params.pulseSpeed) % 1.0;

      // Reset transformation matrix
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // 1. Draw Atmospheric Background & Subtle Landscape Grid Matrix
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, '#040d1a');
      bgGradient.addColorStop(0.5, '#07162c');
      bgGradient.addColorStop(1, '#020914');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Draw subtle background grid lines
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 40 * zoomRef.current;
      const offsetX = (width / 2 + panRef.current.x) % gridSize;
      const offsetY = (height / 2 + panRef.current.y) % gridSize;

      ctx.beginPath();
      for (let gx = offsetX; gx < width; gx += gridSize) {
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
      }
      for (let gy = offsetY; gy < height; gy += gridSize) {
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
      }
      ctx.stroke();

      // Transform context to center origin + pan + zoom
      const centerX = width / 2 + panRef.current.x;
      const centerY = height / 2 + panRef.current.y;
      const zoom = zoomRef.current;

      const { nodes, edges } = layoutRef.current;
      const hoveredId = hoveredSphereIdRef.current;
      const selectedId = selectedSphereIdRef.current;

      // Map node ID to screen position for fast lookup
      const nodePosMap = new Map<string, { x: number; y: number; node: GraphNode }>();
      nodes.forEach(node => {
        const sx = centerX + node.x * zoom;
        const sy = centerY + node.y * zoom;
        nodePosMap.set(node.id, { x: sx, y: sy, node });
      });

      // 2. Draw Knowledge Graph Edges
      edges.forEach(edge => {
        const sourceData = nodePosMap.get(edge.sourceId);
        const targetData = nodePosMap.get(edge.targetId);
        if (!sourceData || !targetData) return;

        const isHighlighted =
          hoveredId === edge.sourceId ||
          hoveredId === edge.targetId ||
          selectedId === edge.sourceId ||
          selectedId === edge.targetId;

        const strokeWidth = (isHighlighted ? params.highlightEdgeWidth : params.baseEdgeWidth) * zoom;
        const alpha = isHighlighted ? 0.85 : 0.22;

        ctx.save();
        ctx.lineWidth = Math.max(0.8, strokeWidth);

        // Gradient stroke between connected nodes
        const edgeGrad = ctx.createLinearGradient(sourceData.x, sourceData.y, targetData.x, targetData.y);
        edgeGrad.addColorStop(0, sourceData.node.color.glow.replace('0.4', `${alpha}`));
        edgeGrad.addColorStop(1, targetData.node.color.glow.replace('0.4', `${alpha}`));
        ctx.strokeStyle = edgeGrad;

        ctx.beginPath();
        ctx.moveTo(sourceData.x, sourceData.y);
        ctx.lineTo(targetData.x, targetData.y);
        ctx.stroke();

        // Draw animated pulse particle along highlighted edge
        if (isHighlighted) {
          const t = (pulsePhaseRef.current * 3 + edge.weight) % 1.0;
          const px = sourceData.x + (targetData.x - sourceData.x) * t;
          const py = sourceData.y + (targetData.y - sourceData.y) * t;

          ctx.fillStyle = sourceData.node.color.primary;
          ctx.beginPath();
          ctx.arc(px, py, 3.5 * zoom, 0, 2 * Math.PI);
          ctx.fill();
        }

        ctx.restore();
      });

      // 3. Draw Knowledge Graph Nodes
      let selectedScreenPos: ScreenPositionUpdate | null = null;

      nodes.forEach(node => {
        const pos = nodePosMap.get(node.id);
        if (!pos) return;

        const isHovered = hoveredId === node.id;
        const isSelected = selectedId === node.id;

        let scale = 1.0;
        if (isSelected) scale = params.selectedNodeScale;
        else if (isHovered) scale = params.hoverNodeScale;

        const r = node.radius * scale * zoom;

        ctx.save();

        // Outer ambient glow halo
        const haloGrad = ctx.createRadialGradient(pos.x, pos.y, r * 0.4, pos.x, pos.y, r * 2.2);
        haloGrad.addColorStop(0, node.color.glow);
        haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r * 2.2, 0, 2 * Math.PI);
        ctx.fill();

        // Primary outer ring
        ctx.fillStyle = node.color.primary;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, 2 * Math.PI);
        ctx.fill();

        // Selection / Hover outline ring
        if (isSelected || isHovered) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(2, 2.5 * zoom);
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, r + 4 * zoom, 0, 2 * Math.PI);
          ctx.stroke();
        }

        // Inner core
        ctx.fillStyle = node.color.core;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r * 0.45, 0, 2 * Math.PI);
        ctx.fill();

        // Draw node title text label under node if zoomed in or master
        if (zoom >= 0.75 || node.isMaster || isHovered || isSelected) {
          ctx.fillStyle = isSelected || isHovered ? '#ffffff' : 'rgba(226, 232, 240, 0.75)';
          ctx.font = `${node.isMaster ? 'bold 12px' : '10px'} monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(node.sphere.name, pos.x, pos.y + r + 14 * zoom);
        }

        ctx.restore();

        // Capture selected screen position
        if (isSelected) {
          const isVisible = pos.x >= 0 && pos.x <= width && pos.y >= 0 && pos.y <= height;
          selectedScreenPos = { x: pos.x, y: pos.y, visible: isVisible };
        }
      });

      // Report selected screen position update
      if (onSelectedScreenPosUpdateRef.current) {
        onSelectedScreenPosUpdateRef.current(selectedScreenPos);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [params, updateLayout]);

  // Pointer Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only primary left click drag
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    mousePosRef.current = { x: e.clientX, y: e.clientY };

    // Pan map on mouse drag
    if (isDraggingRef.current) {
      panRef.current = {
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      };
      container.style.cursor = 'grabbing';
    }

    // Node hit testing in 2D screen coordinates
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const centerX = rect.width / 2 + panRef.current.x;
    const centerY = rect.height / 2 + panRef.current.y;
    const zoom = zoomRef.current;

    const { nodes } = layoutRef.current;
    let hovered: GraphNode | null = null;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const sx = centerX + node.x * zoom;
      const sy = centerY + node.y * zoom;
      const r = (node.radius + 8) * zoom;

      const distSq = (mouseX - sx) ** 2 + (mouseY - sy) ** 2;
      if (distSq <= r * r) {
        hovered = node;
        break;
      }
    }

    if (hovered) {
      container.style.cursor = 'pointer';
      onHoverSphereRef.current(hovered.id, { x: e.clientX, y: e.clientY });
    } else {
      if (!isDraggingRef.current) container.style.cursor = 'grab';
      onHoverSphereRef.current(null);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    if (containerRef.current) containerRef.current.style.cursor = 'grab';
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const centerX = rect.width / 2 + panRef.current.x;
    const centerY = rect.height / 2 + panRef.current.y;
    const zoom = zoomRef.current;

    const { nodes } = layoutRef.current;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const sx = centerX + node.x * zoom;
      const sy = centerY + node.y * zoom;
      const r = (node.radius + 8) * zoom;

      const distSq = (mouseX - sx) ** 2 + (mouseY - sy) ** 2;
      if (distSq <= r * r) {
        onSelectSphereRef.current(node.id);
        return;
      }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const centerX = rect.width / 2 + panRef.current.x;
    const centerY = rect.height / 2 + panRef.current.y;
    const zoom = zoomRef.current;

    const { nodes } = layoutRef.current;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const sx = centerX + node.x * zoom;
      const sy = centerY + node.y * zoom;
      const r = (node.radius + 8) * zoom;

      const distSq = (mouseX - sx) ** 2 + (mouseY - sy) ** 2;
      if (distSq <= r * r) {
        onSelectSphereRef.current(node.id);
        if (onDoubleClickSphereRef.current) {
          onDoubleClickSphereRef.current(node.id);
        }
        return;
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    const newZoom = Math.min(4.0, Math.max(0.4, zoomRef.current * zoomFactor));
    zoomRef.current = newZoom;
  };

  const handleResetView = () => {
    panRef.current = { x: 0, y: 0 };
    zoomRef.current = 1.0;
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing select-none overflow-hidden"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Floating HUD controls for graph navigation reset */}
      <div className="absolute bottom-6 left-6 z-20 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={handleResetView}
          className="px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs font-mono font-semibold backdrop-blur-md transition-all shadow-md cursor-pointer"
        >
          Reset Graph View
        </button>
      </div>
    </div>
  );
};

export default GalaxyCanvas;
