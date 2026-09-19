# Page Context Specification: Code Galaxy View

## 📌 Page Overview

The **Code Galaxy View** is the network-level 3D constellation engine of OOMFS. It visualizes all active 3D community globes floating as 3D planet nodes in an interactive 3D WebGL starfield universe (inspired by *Code Galaxies*).

- **Navigation Trigger**: Accessed via the top-left `"oomfs.org"` brand button or the `Code Galaxy` tab in [Header.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/Header.tsx).
- **Core Capabilities**:
  - Full 3D camera navigation (WASD flight, 360° pitch/yaw mouse look around, screen-space panning, and zoom).
  - Terminal preset command filters (`/all` as default, `/mine` when authenticated, `/conquest`, `/discrete_1to1`, `/high-res`).
  - High-performance GPU `InstancedMesh` rendering for scale ($N = 2,500+$ spheres in 3 WebGL draw calls).
  - Interactive GPU raycasting for inspecting and entering any sphere.
  - Creator handle attribution & `"🌟 Your Sphere"` indicators in the focused node inspector.
  - Login-protected creation modal for spawning new 3D sphere planets directly into galactic space and persisting to Supabase PostgreSQL.

---

## 🏗 Component Architecture & Hierarchy

```
CodeGalaxyPage.tsx
 ├── GalaxyCanvas.tsx           (Native Three.js WebGL canvas, InstancedMesh pipeline, 6-DOF Fly controls)
 ├── Top HUD Overlay            (Network statistics, preset command filter dock, Search bar, Create Sphere trigger)
 ├── Floating Controls Banner  (3D navigation & Pan-Look mode instructions)
 ├── Selected Node Inspector    (Bottom-right card showing focused sphere details, owner handle link, "Your Sphere" badge, & "Enter 3D Sphere Map" action)
 └── Create New Sphere Modal    (Form to configure and spawn a new 3D sphere planet into Supabase, pre-filled with @currentUser.username)
```

### Component Props Contract

```tsx
interface CodeGalaxyPageProps {
  spheres: SphereItem[];
  activeSphereId: string;
  onSelectSphere: (sphereId: string) => void;
  onCreateSphere: (newSphere: SphereItem) => void;
  onGoToMap: () => void;
  currentUser?: UserProfile | null;
  onOpenAuthModal?: (mode: 'login' | 'register') => void;
}
```

---

## 🌌 3D WebGL Galaxy Engine ([GalaxyCanvas.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/GalaxyCanvas.tsx))

### 1. `InstancedMesh` GPU Pipeline
To scale to thousands of items without CPU scene-graph draw call bottlenecking, [GalaxyCanvas.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/GalaxyCanvas.tsx) renders all sphere planet nodes and orbital wireframe rings using `THREE.InstancedMesh`:
- **Planet Mesh**: Single `InstancedMesh` with `SphereGeometry(0.75, 16, 16)`. Per-instance positions and theme colors (`instanceColor`).
- **Ring Mesh**: Single `InstancedMesh` with `TorusGeometry(1.25, 0.025, 8, 24)`.
- **Starfield**: `THREE.Points` particle dust cloud with 5,000+ stars.

### 2. First-Person 6-DOF Fly & Pan Camera Controls
Replaces single-pivot `OrbitControls` with a pure First-Person flight controller:
- **Left-Click + Mouse Drag**: Rotates camera viewing angle (Pitch & Yaw) freely in 360° around eye origin.
- **Right-Click / Middle-Click + Mouse Drag**: Pans camera position sideways and vertically in screen space.
- **`WASD` / Arrow Keys / Scroll**: Propels camera position smoothly through 3D galactic space with velocity damping.

### 3. GPU Instanced Raycasting
Uses `raycaster.intersectObject(planetInstancedMesh)` to locate `intersects[0].instanceId` in $O(1)$ time, mapping instance indices directly to `spheres[instanceId]` for hover highlights and click selection.

---

## ⚡ Extension Guidelines for AI Agents

1. **Preset Command Filter Invariant**:
   - `/all` MUST remain the default command preset filter, returning all registered spheres without categorical friction.
   - `/mine` filters planets to show only globes created by `currentUser`.
2. **Sphere Creation Authentication Guard**:
   - Only authenticated users (`currentUser !== null`) can open the *Create New Sphere* modal. Unauthenticated visitors clicking "+ Create Sphere" trigger `onOpenAuthModal('login')`.
3. **Persistence Guarantee**:
   - When a user submits the *Create New Sphere* form, pass the `SphereItem` to `onCreateSphere()`, which calls `saveSphereToSupabase()` in [sphereService.ts](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/utils/sphereService.ts) to permanently save it to PostgreSQL.
4. **Canvas Performance**:
   - Do NOT replace `InstancedMesh` in [GalaxyCanvas.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/GalaxyCanvas.tsx) with individual `THREE.Mesh` objects, as doing so will break 60 FPS performance when scaling to thousands of spheres.
