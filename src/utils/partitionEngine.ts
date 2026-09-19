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

/**
 * Generate Multi-Tile Territory Clusters for U Active Users across requested 3D sphere quad tiles.
 */
export function generateClusteredPartitions(
  requestedTileCount: number = 512,
  userCount: number = 6,
  seed: number = 42,
  theme: MapTheme = 'neon',
  customUserShares?: number[],
  customUserImages?: Record<number, string>,
  mappingMode: MappingMode = 'conquest'
): ClusteringResult {
  let rngSeed = seed;
  const rand = () => {
    rngSeed++;
    return seededRandom(rngSeed);
  };

  const is1to1 = mappingMode === 'discrete_1to1';
  let colsPerFace: number;
  let rowsPerFace: number;
  let totalTiles: number;

  if (is1to1) {
    const rawNum = Math.max(1, userCount);
    let c = Math.max(1, Math.round(Math.sqrt(rawNum / 4)));
    let r = Math.max(1, Math.ceil(rawNum / (4 * c)));
    colsPerFace = c;
    rowsPerFace = r;
    totalTiles = 4 * colsPerFace * rowsPerFace;
  } else {
    const dims = getGridDimensions(requestedTileCount);
    colsPerFace = dims.colsPerFace;
    rowsPerFace = dims.rowsPerFace;
    totalTiles = dims.totalTiles;
  }

  const numUsers = Math.max(1, Math.min(userCount, totalTiles));

  // User Target Shares (0..100%, summing to 100%)
  let shares: number[];
  let tileQuotas: number[];

  if (is1to1) {
    shares = Array(numUsers).fill(100 / numUsers);
    tileQuotas = Array(numUsers).fill(1);
  } else {
    shares = customUserShares && customUserShares.length === numUsers
      ? [...customUserShares]
      : Array(numUsers).fill(100 / numUsers);

    const totalS = shares.reduce((a, b) => a + b, 0);
    shares = shares.map(s => (totalS > 0 ? (s / totalS) * 100 : 100 / numUsers));

    // Convert target % to discrete tile quotas T_k summing to exactly totalTiles using Hamilton's Largest Remainder Method
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

  // Active User Accounts (IDs 1..numUsers)
  const palette = THEME_PALETTES[theme];
  const users: UserAccount[] = [];

  for (let u = 0; u < numUsers; u++) {
    const baseHandle = USER_HANDLES[u % USER_HANDLES.length];
    const cycle = Math.floor(u / USER_HANDLES.length);
    const handle = cycle > 0 ? `${baseHandle}_${cycle + 1}` : baseHandle;
    const userId = u + 1;
    users.push({
      id: userId,
      name: `@${handle}`,
      code: `USER-${userId.toString().padStart(3, '0')}`,
      color: palette[u % palette.length],
      category: CATEGORIES[Math.floor(rand() * CATEGORIES.length)],
      value: Math.round(25 + rand() * 70),
      targetShare: Math.round(shares[u] * 10) / 10,
      actualShare: Math.round((tileQuotas[u] / totalTiles) * 1000) / 10,
      tileCount: tileQuotas[u],
      centroid3D: [0, 0, 0],
      centroid2D: [0.5, 0.5],
      customImage: customUserImages?.[userId],
    });
  }

  // Create 3D Tiles across sphere UV space
  const tiles: Region[] = [];
  const tileCenters3D: Array<[number, number, number]> = [];

  let tileId = 1;
  for (let sideFace = 0; sideFace < 4; sideFace++) {
    const u0_face = sideFace / 4;

    for (let row = 0; row < rowsPerFace; row++) {
      for (let col = 0; col < colsPerFace; col++) {
        const u0 = u0_face + (col / colsPerFace) * (1 / 4);
        const u1 = u0_face + ((col + 1) / colsPerFace) * (1 / 4);
        const v0 = row / rowsPerFace;
        const v1 = (row + 1) / rowsPerFace;

        const cu = (u0 + u1) / 2;
        const cv = (v0 + v1) / 2;

        const lambda = (cu - 0.5) * Math.PI * 2;
        const phi = (0.5 - cv) * Math.PI * 0.95;

        const radius = 2.0;
        const x3d = radius * Math.cos(phi) * Math.cos(lambda);
        const y3d = radius * Math.sin(phi);
        const z3d = radius * Math.cos(phi) * Math.sin(lambda);

        tileCenters3D.push([x3d, y3d, z3d]);

        tiles.push({
          id: tileId,
          faceIndex: sideFace,
          ownerUserId: 1, // temporary, assigned below
          polygonUV: [[u0, v0], [u1, v0], [u1, v1], [u0, v1]],
        });

        tileId++;
      }
    }
  }

  // 3D Seed Placement for Active Users (Fibonacci sphere distribution)
  const userSeeds3D: Array<[number, number, number]> = [];
  const phiGolden = Math.PI * (3 - Math.sqrt(5));

  for (let u = 0; u < numUsers; u++) {
    const y = (1 - (u / Math.max(1, numUsers - 1)) * 2) * 0.85;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = phiGolden * u + seed * 0.1;

    const sx = 2.0 * radiusAtY * Math.cos(theta);
    const sy = 2.0 * y;
    const sz = 2.0 * radiusAtY * Math.sin(theta);

    userSeeds3D.push([sx, sy, sz]);
  }

  // 3D Power-Distance Compact Tile Solver (Dual Weight Pre-conditioning + Exact Capacity Assignment)
  const powerWeights = new Float64Array(numUsers);
  let stepSize = 0.2;

  // Step A: Dual gradient power weight pre-conditioning
  for (let iter = 0; iter < 40; iter++) {
    const userCounts = new Int32Array(numUsers);

    for (let i = 0; i < totalTiles; i++) {
      const [tx, ty, tz] = tileCenters3D[i];

      let minCost = Infinity;
      let bestUserIdx = 0;

      for (let u = 0; u < numUsers; u++) {
        if (tileQuotas[u] <= 0) continue;
        const [sx, sy, sz] = userSeeds3D[u];
        const dx = tx - sx;
        const dy = ty - sy;
        const dz = tz - sz;
        const distSq = dx * dx + dy * dy + dz * dz;

        const cost = distSq - powerWeights[u];
        if (cost < minCost) {
          minCost = cost;
          bestUserIdx = u;
        }
      }

      userCounts[bestUserIdx]++;
    }

    let maxError = 0;
    for (let u = 0; u < numUsers; u++) {
      if (tileQuotas[u] <= 0) continue;
      const error = tileQuotas[u] - userCounts[u];
      powerWeights[u] += error * stepSize;
      if (Math.abs(error) > maxError) maxError = Math.abs(error);
    }

    if (maxError === 0) break;
    stepSize *= 0.98;
  }

  const finalAssignedUser = new Int32Array(totalTiles).fill(-1);

  if (is1to1) {
    for (let i = 0; i < totalTiles; i++) {
      finalAssignedUser[i] = i % numUsers;
    }
  } else {
    interface TileCandidate {
      tileIdx: number;
      userIdx: number;
      cost: number;
    }

    const candidates: TileCandidate[] = [];
    for (let i = 0; i < totalTiles; i++) {
      const [tx, ty, tz] = tileCenters3D[i];
      for (let u = 0; u < numUsers; u++) {
        if (tileQuotas[u] <= 0) continue;
        const [sx, sy, sz] = userSeeds3D[u];
        const dx = tx - sx;
        const dy = ty - sy;
        const dz = tz - sz;
        const distSq = dx * dx + dy * dy + dz * dz;
        const cost = distSq - powerWeights[u];
        candidates.push({ tileIdx: i, userIdx: u, cost });
      }
    }

    candidates.sort((a, b) => a.cost - b.cost);

    const currentTileCounts = new Int32Array(numUsers);

    for (let c = 0; c < candidates.length; c++) {
      const { tileIdx, userIdx } = candidates[c];
      if (finalAssignedUser[tileIdx] !== -1) continue;
      if (currentTileCounts[userIdx] >= tileQuotas[userIdx]) continue;

      finalAssignedUser[tileIdx] = userIdx;
      currentTileCounts[userIdx]++;
    }

    // Step C: Fallback for unassigned tiles
    for (let i = 0; i < totalTiles; i++) {
      if (finalAssignedUser[i] === -1) {
        let bestU = 0;
        let minD = Infinity;
        const [tx, ty, tz] = tileCenters3D[i];
        for (let u = 0; u < numUsers; u++) {
          if (currentTileCounts[u] < tileQuotas[u]) {
            const [sx, sy, sz] = userSeeds3D[u];
            const d = (tx - sx) ** 2 + (ty - sy) ** 2 + (tz - sz) ** 2;
            if (d < minD) {
              minD = d;
              bestU = u;
            }
          }
        }
        finalAssignedUser[i] = bestU;
        currentTileCounts[bestU]++;
      }
    }
  }

  // Update Tile ownerUserIds & compute user centroids
  const userTileIndices: number[][] = Array.from({ length: numUsers }, () => []);

  for (let i = 0; i < totalTiles; i++) {
    const ownerIdx = finalAssignedUser[i];
    const tile = tiles[i];
    tile.ownerUserId = ownerIdx + 1; // 1-indexed user IDs
    userTileIndices[ownerIdx].push(i);
  }

  for (let u = 0; u < numUsers; u++) {
    const user = users[u];
    const ownedIdxs = userTileIndices[u];
    const actualCount = ownedIdxs.length;

    let cx3d = 0, cy3d = 0, cz3d = 0;
    let avgU = 0.5, avgV = 0.5;

    if (actualCount > 0) {
      let sumU = 0, sumV = 0;
      ownedIdxs.forEach(tIdx => {
        const [tx, ty, tz] = tileCenters3D[tIdx];
        cx3d += tx; cy3d += ty; cz3d += tz;

        const [[u0, v0], [u1, _1], [_2, v1]] = tiles[tIdx].polygonUV;
        sumU += (u0 + u1) / 2;
        sumV += (v0 + v1) / 2;
      });

      cx3d /= actualCount;
      cy3d /= actualCount;
      cz3d /= actualCount;

      avgU = sumU / actualCount;
      avgV = sumV / actualCount;
    }

    user.centroid3D = [cx3d, cy3d, cz3d];
    user.centroid2D = [avgU, avgV];
    user.tileCount = actualCount;
    user.actualShare = Math.round((actualCount / totalTiles) * 1000) / 10;
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
 * Render Texture: 512 Quad Tiles + User Profile Cards
 */
export function drawRegionTexture(
  users: UserAccount[],
  tiles: Region[],
  width = 4096,
  height = 2048,
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
  ctx.fillStyle = theme === 'minimal' ? '#0f172a' : '#080c16';
  ctx.fillRect(0, 0, width, height);

  const userMap = new Map<number, UserAccount>();
  users.forEach(u => userMap.set(u.id, u));

  // 1. Draw 3D Quad Tiles
  tiles.forEach(tile => {
    const owner = userMap.get(tile.ownerUserId);
    if (!owner) return;

    const [[u0, v0], [u1, _1], [_2, v1]] = tile.polygonUV;

    const x = u0 * width;
    const y = v0 * height;
    const w = (u1 - u0) * width;
    const h = (v1 - v0) * height;

    const isHovered = hoveredUserId === owner.id;
    const isSelected = selectedUserId === owner.id;

    if (isSelected) {
      ctx.fillStyle = '#ffffff';
    } else if (isHovered) {
      ctx.fillStyle = owner.color;
    } else {
      ctx.fillStyle = hexToRgba(owner.color, theme === 'wireframe' ? 0.3 : 0.65);
    }
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

    // If account has custom image uploaded, render 1 per tile inside tile bounds
    if (owner.customImage) {
      const cachedImg = getOrLoadImage(owner.customImage, onImageLoaded);
      if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 1, y + 1, w - 2, h - 2);
        ctx.clip();
        ctx.drawImage(cachedImg, x + 1, y + 1, w - 2, h - 2);
        ctx.restore();
      }
    }

    // Inner Grid Line
    ctx.strokeStyle = isSelected
      ? '#38bdf8'
      : isHovered
      ? '#ffffff'
      : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  });

  // Vertical Face Division Lines
  if (showGrid) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 2;

    for (let c = 1; c < 4; c++) {
      ctx.beginPath();
      ctx.moveTo((c * width) / 4, 0);
      ctx.lineTo((c * width) / 4, height);
      ctx.stroke();
    }
  }

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
