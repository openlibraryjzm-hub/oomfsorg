# Page Context Specification: 3D Sphere Map View

## 📌 Page Overview

The **3D Sphere Map View** is the primary interactive WebGL view of OOMFS. It renders a 3D spherified cube geometry consisting of discrete 3D quad tiles.

Supports two mapping paradigms:
1. **Value Conquest Mode (`conquest`)**: Selectable grid resolutions (256, 512, 1024, 2048 quad tiles). Active user accounts ($U = 1 \dots N$) own discrete, contiguous territory clusters proportional to their target share percentage.
2. **1:1 Equal Discrete Mode (`discrete_1to1`)**: $N \text{ users} = N \text{ equal tiles}$. Every active account receives exactly 1 partition ($1/N$ of the globe surface area).

---

## 🏗 Component Architecture & Hierarchy

```
App.tsx
 ├── Header.tsx                 (Top navigation header & Control Dock toggle button)
 ├── MapCanvas.tsx              (Three.js 3D WebGL Canvas, camera, orbit controls, raycasting)
 └── RightDockPanel.tsx         (Unified 3-tab right dock: Config, Allocator, Inspect)
```

---

## 🧮 Core Algorithms & Data Contracts

### 1. Quota Calculation (Hamilton's Largest Remainder Method)
In [partitionEngine.ts](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/utils/partitionEngine.ts):
In Conquest mode, target percentages ($S_u\%$) are converted into exact integer tile quotas $T_u$:
- `exactQuotas[u] = (shares[u] / 100) * totalTiles`
- `tileQuotas[u] = Math.floor(exactQuotas[u])`
- Remaining unallocated tiles are distributed in descending order of fractional remainders (`exactQuotas[u] - tileQuotas[u]`).
- **Guaranteed Invariant**: $\sum_{u=0}^{N-1} T_u = \text{totalTiles}$ exact tiles.

### 2. Dual Weight Pre-Conditioning & Exact-Capacity Tile Solver
- Runs 40 iterations of dual gradient power-weight tuning to balance 3D sphere distance weights across user seed points.
- Sorts candidate costs $C(i, u) = \|\text{Tile}_i - \text{Seed}_u\|^2 - w_u$ with capacity caps, assigning **EXACTLY** $T_u$ tiles to each user.
- Recomputes `actualShare = (actualCount / totalTiles) * 100%`, matching target percentage precision.

### 3. 1:1 Equal Partition Tiling Engine
- When `mappingMode === 'discrete_1to1'`, computes grid dimensions matching $N$ users, assigning 1 tile per user account ($1/N$ surface area per account).

### 4. 1-Per-Tile Custom Image Rendering Engine
- `getOrLoadImage(url, onLoaded)` loads and caches `HTMLImageElement` instances asynchronously.
- In `drawRegionTexture`: If `owner.customImage` is defined, the image is rendered **1 per tile** inside tile UV bounds `[x + 1, y + 1, w - 2, h - 2]`.

### 5. 4K sRGB Unlit Rendering Pipeline & Calm Blue Sky Skybox
- Canvas Texture resolution: $4096 \times 2048$.
- `texture.colorSpace = THREE.SRGBColorSpace`
- `renderer.toneMapping = THREE.NoToneMapping` (prevents filmic curve compression).
- `MeshBasicMaterial({ map: texture })` (unlit mode to eliminate directional light shadows).
- **Calm Blue Atmospheric Skysphere**: Custom inverted `ShaderMaterial` skysphere (`radius: 500`, `depthWrite: false`) featuring a calm gradient from deep azure zenith (`#0c4a6e`) to cerulean sky blue (`#0284c7`), soft hazy pastel horizon (`#bae6fd`), and lower atmosphere blue (`#0369a1`). Eliminates floor grid lines and black void bottoms, creating a floating-in-the-sky experience.

---

## 🖱 User Interactions & Triggers

| Action | Event Handler | Result |
| :--- | :--- | :--- |
| **Pointer Hover** | `handlePointerMove` in [MapCanvas.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/MapCanvas.tsx) | Raycasts UV, updates `hoveredUserId`, highlights tile boundary. |
| **Single Click Tile** | `handleClick` in [MapCanvas.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/MapCanvas.tsx) | Pins selection and opens/focuses `Inspect` tab on [RightDockPanel.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/RightDockPanel.tsx). |
| **View Member Profile** | `onViewMemberProfile` in [RightDockPanel.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/RightDockPanel.tsx) | Navigates to [MemberProfilePage.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/MemberProfilePage.tsx) for selected user. |
| **Drag Area Slider** | `handleSliderChange` in [RightDockPanel.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/RightDockPanel.tsx) | Re-balances zero-sum target shares to sum to 100.0%, updates tile quotas in real-time. |
| **Upload Tile Img** | `handleFileChange` in RightDockPanel | Reads image file as Data URL via `FileReader`, sets `customUserImages[userId]`, re-renders 3D sphere. |

---

## ⚡ Extension Guidelines for AI Agents

1. When adding controls to [RightDockPanel.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/RightDockPanel.tsx), pass partial updates through `onUpdateSettings(updated: Partial<MapSettings>)`.
2. **Sphere Ownership Lock**: Check `isSphereOwner` before allowing modifications to grid resolution, mapping mode, themes, seeds, area sliders, or tile images. Non-owners are placed in `View-Only Mode` with a lock banner.
3. Do not introduce light-attenuating materials (`MeshStandardMaterial`) unless light intensities are explicitly balanced with 100% ambient light.
