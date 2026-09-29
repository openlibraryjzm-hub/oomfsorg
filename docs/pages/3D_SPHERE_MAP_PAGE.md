# Page Context Specification: 2D Territory Map View

## 📌 Page Overview

The **2D Territory Map View** is the primary interactive map view of OOMFS. It renders a 2D Proportional Territory Map using **Squarified Treemap Partitioning** and **Grid Matrix Overlays**.

Supports two mapping paradigms:
1. **Value Conquest Mode (`conquest`)**: Selectable grid resolutions (256, 512, 1024, 2048 quad tiles). Active user accounts ($U = 1 \dots N$) own discrete, contiguous rectangular territory clusters proportional to their target share percentage ($S_u\%$).
2. **1:1 Equal Discrete Mode (`discrete_1to1`)**: $N \text{ users} = N \text{ equal tiles}$. Every active account receives exactly 1 partition ($1/N$ of the map surface area).

---

## 🏗 Component Architecture & Hierarchy

```
App.tsx
 ├── Header.tsx                 (Top navigation header & Control Dock toggle button)
 ├── FlatMapCanvas.tsx          (High-DPI 2D Canvas Map, pan & zoom controls, UV raycasting)
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

### 2. Squarified Treemap Layout Engine (Bruls et al.)
- Computes optimal $\sim 1:1$ square aspect ratio rectangles for each user proportional to target share $S_u\%$.
- Guarantees $0$ overlapping regions and $0$ unallocated canvas space.
- Assigns sub-tile grid cells inside each user territory rectangle.

### 3. High-DPI 2D Rendering & Smooth Pan/Zoom
- Offscreen texture buffer rendered at 2048x2048 canvas resolution.
- Canvas viewport scales with `window.devicePixelRatio`.
- Smooth pan (drag) and zoom ($0.6\times$ to $6.0\times$) controls with fit-to-screen button.

---

## 🖱 User Interactions & Triggers

| Action | Event Handler | Result |
| :--- | :--- | :--- |
| **Pointer Hover** | `handleMouseMove` in [FlatMapCanvas.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/FlatMapCanvas.tsx) | Raycasts UV, updates `hoveredUserId`, highlights territory boundary. |
| **Single Click Territory** | `handleMouseUp` in [FlatMapCanvas.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/FlatMapCanvas.tsx) | Pins selection and opens/focuses `Inspect` tab on [RightDockPanel.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/RightDockPanel.tsx). |
| **Pan & Zoom** | Drag / Wheel in [FlatMapCanvas.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/FlatMapCanvas.tsx) | Adjusts map translation and scale dynamically. |
| **Drag Area Slider** | `handleSliderChange` in [RightDockPanel.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/RightDockPanel.tsx) | Re-balances zero-sum target shares to sum to 100.0%, updates 2D territory bounds in real-time. |
| **Upload Tile Img** | `handleFileChange` in RightDockPanel | Reads image file as Data URL via `FileReader`, sets `customUserImages[userId]`, re-renders 2D territory. |

---

## ⚡ Extension Guidelines for AI Agents

1. When adding controls to [RightDockPanel.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/RightDockPanel.tsx), pass partial updates through `onUpdateSettings(updated: Partial<MapSettings>)`.
2. Check `isSphereOwner` before allowing modifications to grid resolution, mapping mode, themes, seeds, area sliders, or tile images. Non-owners are placed in `View-Only Mode` with a lock banner.
