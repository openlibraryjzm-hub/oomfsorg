import { Region, UserAccount, MapTheme, MappingMode } from '../types/map';

const USER_HANDLES = [
  'alpha_dev', 'cyber_pilot', 'nexus_core', 'pixel_mind', 'orbit_runner',
  'quantum_x', 'vector_art', 'sphere_coder', 'grid_master', 'synth_wave',
  'nova_star', 'crypto_punk', 'astral_vox', 'hyper_drive', 'zenith_flow',
  'titan_vault', 'matrix_zero', 'starlight_x', 'neon_shadow', 'aether_sol'
];

const CATEGORIES = ['Developer', 'Creator', 'Validator', 'Architect', 'Researcher', 'Collector'];

export const THEME_PALETTES: Record<MapTheme, string[]> = {
  neon: ['#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#6366f1', '#a855f7'],
  cyber: ['#00f0ff', '#ff0055', '#7000ff', '#00ff66', '#ffb700', '#0099ff', '#ff00aa', '#33ff00'],
  topographic: ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2', '#d8f3dc', '#b7e4c7', '#1b4332'],
  heatmap: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#fee090', '#fdae61', '#f46d43', '#d73027'],
  minimal: ['#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#1e293b', '#0f172a'],
  wireframe: ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#4ade80', '#facc15', '#a78bfa', '#2dd4bf'],
};

function seededRandom(seed: number) {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export interface ClusteringResult {
  users: UserAccount[];
  tiles: Region[];
}

export function getGridDimensions(requestedTileCount: number = 512): { colsPerFace: number; rowsPerFace: number; totalTiles: number } {
  if (requestedTileCount <= 256) {
    return { colsPerFace: 4, rowsPerFace: 16, totalTiles: 256 };
  } else if (requestedTileCount <= 512) {
    return { colsPerFace: 8, rowsPerFace: 16, totalTiles: 512 };
  } else if (requestedTileCount <= 1024) {
    return { colsPerFace: 16, rowsPerFace: 16, totalTiles: 1024 };
  } else {
    return { colsPerFace: 16, rowsPerFace: 32, totalTiles: 2048 };
  }
}

interface ItemToSquarify {
  id: number;
  value: number;
}

interface Rect2DInternal {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
  * Squarified Treemap Algorithm (Bruls et al.)
  * Partitions a bounding rectangle (0..W, 0..H) into optimal ~1:1 square aspect ratio sub-rectangles proportional to item values.
  */
function computeSquarifiedLayout(
  items: ItemToSquarify[],
  x: number = 0,
  y: number = 0,
  w: number = 1,
  h: number = 1
): Map<number, Rect2DInternal> {
  const result = new Map<number, Rect2DInternal>();
  if (items.length === 0) return result;

  const sorted = [...items].sort((a, b) => b.value - a.value);

  function layoutRow(row: ItemToSquarify[], container: { x: number; y: number; w: number; h: number }) {
    const rowSum = row.reduce((sum, item) => sum + item.value, 0);
    const isHorizontal = container.w >= container.h;
    const side = isHorizontal ? container.h : container.w;
    const thickness = side > 0 ? rowSum / side : 0;

    let offset = 0;
    row.forEach(item => {
      const itemLen = rowSum > 0 ? (item.value / rowSum) * side : 0;
      if (isHorizontal) {
        result.set(item.id, {
          x: container.x,
          y: container.y + offset,
          w: thickness,
          h: itemLen,
        });
        offset += itemLen;
      } else {
        result.set(item.id, {
          x: container.x + offset,
          y: container.y,
          w: itemLen,
          h: thickness,
        });
        offset += itemLen;
      }
    });

    if (isHorizontal) {
      container.x += thickness;
      container.w -= thickness;
    } else {
      container.y += thickness;
      container.h -= thickness;
    }
  }

  function worst(row: ItemToSquarify[], side: number): number {
    if (row.length === 0 || side <= 0) return Infinity;
    const sum = row.reduce((acc, item) => acc + item.value, 0);
    if (sum <= 0) return Infinity;
    let maxVal = -Infinity;
    let minVal = Infinity;
    for (const item of row) {
      if (item.value > maxVal) maxVal = item.value;
      if (item.value < minVal) minVal = item.value;
    }
    const s2 = side * side;
    const r2 = sum * sum;
    return Math.max((s2 * maxVal) / r2, r2 / (s2 * minVal));
  }

  let container = { x, y, w, h };
  let currentRow: ItemToSquarify[] = [];

  for (const item of sorted) {
    if (currentRow.length === 0) {
      currentRow.push(item);
    } else {
      const shortestSide = Math.min(container.w, container.h);
      const currentWorst = worst(currentRow, shortestSide);
      const nextWorst = worst([...currentRow, item], shortestSide);
      if (nextWorst <= currentWorst) {
        currentRow.push(item);
      } else {
        layoutRow(currentRow, container);
        currentRow = [item];
      }
    }
  }

  if (currentRow.length > 0) {
    layoutRow(currentRow, container);
  }

  return result;
}

/**
 * Generate Proportional 2D Territory Maps for U Active Users across requested tiles.
 */
export function generateClusteredPartitions(
  requestedTileCount: number = 512,
  userCount: number = 6,
  seed: number = 42,
  theme: MapTheme = 'neon',
  customUserShares?: number[],
  customUserImages?: Record<number, string>,
  mappingMode: MappingMode = 'conquest',
  aspectRatio: number = 1.0
): ClusteringResult {
  let rngSeed = seed;
  const rand = () => {
    rngSeed++;
    return seededRandom(rngSeed);
  };

  const is1to1 = mappingMode === 'discrete_1to1';
  const dims = getGridDimensions(requestedTileCount);
  const totalTiles = dims.totalTiles;

  const numUsers = Math.max(1, Math.min(userCount, totalTiles));
  const safeAspect = Math.max(0.2, Math.min(5.0, aspectRatio || 1.0));

  // User Target Shares (0..100%, summing to 100%)
  let shares: number[];
  let tileQuotas: number[];

  if (is1to1) {
    shares = Array(numUsers).fill(100 / numUsers);
    tileQuotas = Array(numUsers).fill(Math.max(1, Math.floor(totalTiles / numUsers)));
  } else {
    shares = customUserShares && customUserShares.length === numUsers
      ? [...customUserShares]
      : Array(numUsers).fill(100 / numUsers);

    const totalS = shares.reduce((a, b) => a + b, 0);
    shares = shares.map(s => (totalS > 0 ? (s / totalS) * 100 : 100 / numUsers));

    // Hamilton's Largest Remainder Method for exact tile quotas T_k
    const exactQuotas = shares.map(s => (s / 100) * totalTiles);
    tileQuotas = exactQuotas.map(eq => Math.floor(eq));
    let currentSum = tileQuotas.reduce((a, b) => a + b, 0);
    let remainderCount = totalTiles - currentSum;

    if (remainderCount > 0) {
      const remainders = exactQuotas.map((eq, idx) => ({ idx, rem: eq - tileQuotas[idx] }));
      remainders.sort((a, b) => b.rem - a.rem);
      for (let r = 0; r < remainderCount; r++) {
        tileQuotas[remainders[r].idx]++;
      }
    }
  }

  // Squarified 2D Layout Computation matching Container Aspect Ratio (safeAspect x 1.0)
  const itemsToSquarify: ItemToSquarify[] = shares.map((s, idx) => ({
    id: idx,
    value: (s / 100) * safeAspect, // Area proportional to container aspect space
  }));

  const layoutMap = computeSquarifiedLayout(itemsToSquarify, 0, 0, safeAspect, 1.0);

  const palette = THEME_PALETTES[theme];
  const users: UserAccount[] = [];
  const tiles: Region[] = [];
  let tileId = 1;

  for (let u = 0; u < numUsers; u++) {
    const baseHandle = USER_HANDLES[u % USER_HANDLES.length];
    const cycle = Math.floor(u / USER_HANDLES.length);
    const handle = cycle > 0 ? `${baseHandle}_${cycle + 1}` : baseHandle;
    const userId = u + 1;

    const rawRect = layoutMap.get(u) || { x: 0, y: 0, w: safeAspect / numUsers, h: 1 };
    
    // Normalize coordinates to [0, 1] range for canvas UV mapping
    const rect: Rect2DInternal = {
      x: rawRect.x / safeAspect,
      y: rawRect.y,
      w: rawRect.w / safeAspect,
      h: rawRect.h,
    };

    const quota = tileQuotas[u] || 1;

    // Calculate grid dimensions inside user's territory rectangle (accounting for safeAspect)
    const physicalW = rect.w * safeAspect;
    const physicalH = rect.h;
    const aspect = physicalW > 0 && physicalH > 0 ? physicalW / physicalH : 1;
    let cols = Math.max(1, Math.round(Math.sqrt(quota * aspect)));
    let rows = Math.max(1, Math.ceil(quota / cols));

    const tileW = rect.w / cols;
    const tileH = rect.h / rows;

    let userTileCount = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (userTileCount >= quota) break;
        const u0 = rect.x + c * tileW;
        const u1 = u0 + tileW;
        const v0 = rect.y + r * tileH;
        const v1 = v0 + tileH;

        tiles.push({
          id: tileId++,
          faceIndex: 0,
          ownerUserId: userId,
          polygonUV: [[u0, v0], [u1, v0], [u1, v1], [u0, v1]],
        });
        userTileCount++;
      }
    }

    users.push({
      id: userId,
      name: `@${handle}`,
      code: `USER-${userId.toString().padStart(3, '0')}`,
      color: palette[u % palette.length],
      category: CATEGORIES[Math.floor(rand() * CATEGORIES.length)],
      value: Math.round(25 + rand() * 70),
      targetShare: Math.round(shares[u] * 10) / 10,
      actualShare: Math.round((shares[u]) * 10) / 10,
      tileCount: userTileCount,
      centroid3D: [0, 0, 0],
      centroid2D: [rect.x + rect.w / 2, rect.y + rect.h / 2],
      customImage: customUserImages?.[userId],
      rect2D: rect,
    });
  }

  return { users, tiles };
}

const imageCache = new Map<string, HTMLImageElement>();
const loadingPromises = new Map<string, Promise<HTMLImageElement>>();

export function getOrLoadImage(url: string, onLoaded?: () => void): HTMLImageElement | null {
  if (imageCache.has(url)) {
    return imageCache.get(url)!;
  }
  if (!loadingPromises.has(url)) {
    const promise = new Promise<HTMLImageElement>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageCache.set(url, img);
        if (onLoaded) onLoaded();
        resolve(img);
      };
      img.onerror = () => {
        resolve(img);
      };
      img.src = url;
    });
    loadingPromises.set(url, promise);
  }
  return null;
}

/**
 * Render 2D Flat Territory Map onto Canvas
 */
export function drawRegionTexture(
  users: UserAccount[],
  tiles: Region[],
  width = 2048,
  height = 1152,
  hoveredUserId: number | null = null,
  selectedUserId: number | null = null,
  theme: MapTheme = 'neon',
  showGrid = true,
  onImageLoaded?: () => void
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Background
  ctx.fillStyle = theme === 'minimal' ? '#090d16' : '#030712';
  ctx.fillRect(0, 0, width, height);

  const userMap = new Map<number, UserAccount>();
  users.forEach(u => userMap.set(u.id, u));

  // 1. Render User Rectangular Territories
  users.forEach(user => {
    if (!user.rect2D) return;

    const rx = user.rect2D.x * width;
    const ry = user.rect2D.y * height;
    const rw = user.rect2D.w * width;
    const rh = user.rect2D.h * height;

    const isSelected = selectedUserId === user.id;
    const isHovered = hoveredUserId === user.id;

    // Territory Fill
    ctx.save();
    const grad = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh);
    const alphaBase = theme === 'wireframe' ? 0.25 : 0.65;
    grad.addColorStop(0, hexToRgba(user.color, isSelected ? 0.85 : isHovered ? 0.75 : alphaBase));
    grad.addColorStop(1, hexToRgba(user.color, isSelected ? 0.7 : isHovered ? 0.6 : alphaBase * 0.75));

    ctx.fillStyle = grad;
    ctx.fillRect(rx, ry, rw, rh);

    // Custom uploaded user image (rendered uncropped inside territory box)
    if (user.customImage) {
      const cachedImg = getOrLoadImage(user.customImage, onImageLoaded);
      if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
        ctx.beginPath();
        ctx.rect(rx + 4, ry + 4, Math.max(0, rw - 8), Math.max(0, rh - 8));
        ctx.clip();
        ctx.drawImage(cachedImg, rx + 4, ry + 4, Math.max(0, rw - 8), Math.max(0, rh - 8));
      }
    }
    ctx.restore();

    // Territory Label & Share % Overlay
    if (rw > 50 && rh > 35) {
      ctx.save();
      const fontSize = Math.max(11, Math.min(26, Math.floor(Math.min(rw, rh) / 5)));
      ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 6;

      const centerX = rx + rw / 2;
      const centerY = ry + rh / 2;

      ctx.fillText(user.name, centerX, centerY - (rh > 70 ? fontSize * 0.55 : 0));
      if (rh > 70) {
        ctx.font = `400 ${Math.max(10, fontSize - 3)}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = hexToRgba('#ffffff', 0.85);
        ctx.fillText(`${user.targetShare.toFixed(1)}% Share`, centerX, centerY + fontSize * 0.75);
      }
      ctx.restore();
    }
  });

  // 2. Sub-tile Grid Lines (if enabled)
  if (showGrid) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;

    tiles.forEach(tile => {
      const [[u0, v0], [u1, _1], [_2, v1]] = tile.polygonUV;
      const tx = u0 * width;
      const ty = v0 * height;
      const tw = (u1 - u0) * width;
      const th = (v1 - v0) * height;

      ctx.strokeRect(tx, ty, tw, th);
    });
    ctx.restore();
  }

  // 3. User Territory Outer Boundaries
  users.forEach(user => {
    if (!user.rect2D) return;

    const rx = user.rect2D.x * width;
    const ry = user.rect2D.y * height;
    const rw = user.rect2D.w * width;
    const rh = user.rect2D.h * height;

    const isSelected = selectedUserId === user.id;
    const isHovered = hoveredUserId === user.id;

    ctx.save();
    if (isSelected) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 6;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 16;
    } else if (isHovered) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.shadowColor = user.color;
      ctx.shadowBlur = 12;
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 2;
    }

    ctx.strokeRect(rx, ry, rw, rh);
    ctx.restore();
  });

  return canvas;
}

function hexToRgba(hex: string, alpha: number): string {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}
