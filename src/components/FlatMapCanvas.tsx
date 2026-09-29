import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { MapSettings, Region, UserAccount } from '../types/map';
import { drawRegionTexture, generateClusteredPartitions } from '../utils/partitionEngine';

interface FlatMapCanvasProps {
  settings: MapSettings;
  users: UserAccount[];
  tiles: Region[];
  onSelectUser: (id: number | null) => void;
  onHoverUser: (id: number | null, pos?: { x: number; y: number }) => void;
}

export const FlatMapCanvas: React.FC<FlatMapCanvasProps> = ({
  settings,
  users: initialUsers,
  tiles: initialTiles,
  onSelectUser,
  onHoverUser,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [containerDim, setContainerDim] = useState<{ width: number; height: number }>({
    width: 1920,
    height: 1080,
  });

  // Track Pan & Zoom
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
  });
  const hasMovedRef = useRef<boolean>(false);

  // Force re-render on image load
  const [, setTick] = useState(0);
  const triggerReRender = useCallback(() => setTick(t => t + 1), []);

  // Update container dimensions on resize
  useEffect(() => {
    const updateDim = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth || window.innerWidth;
        const h = containerRef.current.clientHeight || window.innerHeight;
        setContainerDim({ width: w, height: h });
      }
    };
    updateDim();
    window.addEventListener('resize', updateDim);
    return () => window.removeEventListener('resize', handleResize);
    function handleResize() {
      updateDim();
    }
  }, []);

  const aspectRatio = useMemo(() => {
    return containerDim.height > 0 ? containerDim.width / containerDim.height : 1.777;
  }, [containerDim.width, containerDim.height]);

  // Compute aspect-ratio aware users and tiles
  const { users, tiles } = useMemo(() => {
    const shares = initialUsers.map(u => u.targetShare);
    const images: Record<number, string> = {};
    initialUsers.forEach(u => {
      if (u.customImage) images[u.id] = u.customImage;
    });

    return generateClusteredPartitions(
      settings.gridResolution,
      settings.userCount,
      settings.seed,
      settings.theme,
      shares,
      images,
      settings.mappingMode,
      aspectRatio
    );
  }, [
    initialUsers,
    settings.gridResolution,
    settings.userCount,
    settings.seed,
    settings.theme,
    settings.mappingMode,
    aspectRatio,
  ]);

  // Render Offscreen Texture Canvas matching container aspect ratio
  useEffect(() => {
    const offWidth = 2048;
    const offHeight = Math.max(512, Math.round(2048 / Math.max(0.2, aspectRatio)));

    const offCanvas = drawRegionTexture(
      users,
      tiles,
      offWidth,
      offHeight,
      settings.hoveredUserId,
      settings.selectedUserId,
      settings.theme,
      settings.showGrid,
      triggerReRender
    );
    offscreenCanvasRef.current = offCanvas;
  }, [
    users,
    tiles,
    aspectRatio,
    settings.hoveredUserId,
    settings.selectedUserId,
    settings.theme,
    settings.showGrid,
    triggerReRender,
  ]);

  // Redraw Main Viewport Canvas (60 FPS loop)
  const renderViewport = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const offCanvas = offscreenCanvasRef.current;

    if (!canvas || !container || !offCanvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Deep Dark Background
    ctx.fillStyle = settings.theme === 'minimal' ? '#090d16' : '#030712';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
    ctx.scale(zoom, zoom);

    // Full-Bleed Map Canvas bounds matching screen aspect ratio
    const mapW = width;
    const mapH = height;

    ctx.drawImage(offCanvas, -mapW / 2, -mapH / 2, mapW, mapH);

    // Outer Map Frame Border
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 2 / zoom;
    ctx.strokeRect(-mapW / 2, -mapH / 2, mapW, mapH);

    ctx.restore();
  }, [pan.x, pan.y, zoom, settings.theme]);

  useEffect(() => {
    let animId: number;
    const loop = () => {
      renderViewport();
      animId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animId);
  }, [renderViewport]);

  // Convert Screen Pointer to UV Space (0..1, 0..1)
  const screenToUV = useCallback(
    (clientX: number, clientY: number): { uvX: number; uvY: number } | null => {
      const container = containerRef.current;
      if (!container) return null;

      const rect = container.getBoundingClientRect();
      const mouseX = clientX - rect.left;
      const mouseY = clientY - rect.top;

      const width = container.clientWidth;
      const height = container.clientHeight;

      const mapCenterX = width / 2 + pan.x;
      const mapCenterY = height / 2 + pan.y;

      const scaledW = width * zoom;
      const scaledH = height * zoom;

      const mapLeft = mapCenterX - scaledW / 2;
      const mapTop = mapCenterY - scaledH / 2;

      if (
        mouseX < mapLeft ||
        mouseX > mapLeft + scaledW ||
        mouseY < mapTop ||
        mouseY > mapTop + scaledH
      ) {
        return null;
      }

      const uvX = (mouseX - mapLeft) / scaledW;
      const uvY = (mouseY - mapTop) / scaledH;

      return { uvX, uvY };
    },
    [pan.x, pan.y, zoom]
  );

  const findUserAtUV = useCallback(
    (uvX: number, uvY: number): UserAccount | null => {
      for (const user of users) {
        if (!user.rect2D) continue;
        const { x, y, w, h } = user.rect2D;
        if (uvX >= x && uvX <= x + w && uvY >= y && uvY <= y + h) {
          return user;
        }
      }
      return null;
    },
    [users]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMovedRef.current = true;
      }
      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy,
      });
    } else {
      const uv = screenToUV(e.clientX, e.clientY);
      if (uv) {
        const foundUser = findUserAtUV(uv.uvX, uv.uvY);
        onHoverUser(foundUser ? foundUser.id : null, { x: e.clientX, y: e.clientY });
      } else {
        onHoverUser(null);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!hasMovedRef.current) {
      const uv = screenToUV(e.clientX, e.clientY);
      if (uv) {
        const foundUser = findUserAtUV(uv.uvX, uv.uvY);
        onSelectUser(foundUser ? foundUser.id : null);
      } else {
        onSelectUser(null);
      }
    }
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom(prevZoom => Math.min(6.0, Math.max(0.6, prevZoom * zoomFactor)));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none bg-slate-950 cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setIsDragging(false);
        onHoverUser(null);
      }}
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Floating Control Bar */}
      <div className="absolute bottom-6 left-6 z-20 flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-800 shadow-2xl text-slate-300">
        <button
          onClick={() => setZoom(z => Math.min(6.0, z * 1.25))}
          className="p-2 hover:bg-slate-800/80 hover:text-white rounded-lg transition"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(0.6, z * 0.8))}
          className="p-2 hover:bg-slate-800/80 hover:text-white rounded-lg transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-2 hover:bg-slate-800/80 hover:text-white rounded-lg transition"
          title="Reset View & Fit to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-slate-800 mx-1" />
        <span className="px-2 text-xs font-mono text-cyan-400 font-semibold">
          {Math.round(zoom * 100)}%
        </span>
      </div>
    </div>
  );
};
