# Page Context Specification: Code Galaxy View

## 📌 Page Overview

The **Code Galaxy View** is the network-level 3D constellation engine of OOMFS. It visualizes all active 3D community globes floating as 3D planet nodes in an interactive 3D WebGL starfield universe (inspired by *Code Galaxies*).

- **Navigation Trigger**: Accessed via the top-left `"oomfs.org"` brand button in [Header.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/Header.tsx).
- **Core Capabilities**:
  - Full 3D camera navigation (WASD flight, 360° pitch/yaw mouse look around, screen-space panning, and zoom).
  - Minimalist floating action button (`"+ Create Sphere"`) in top right below top header.
  - High-performance GPU `InstancedMesh` rendering for scale ($N = 2,500+$ spheres in 3 WebGL draw calls).
  - Interactive GPU raycasting with minimalist hover text label (`"/spherename"`).
  - Double-click 3D raycast interaction to enter any 3D sphere map directly.
  - Login-protected creation modal for spawning new 3D sphere planets directly into galactic space and persisting to Supabase PostgreSQL.

---

## 🏗 Component Architecture & Hierarchy

```
CodeGalaxyPage.tsx
 ├── GalaxyCanvas.tsx           (Native Three.js WebGL canvas, InstancedMesh pipeline, 6-DOF Fly controls, dblclick raycasting)
 ├── Top-Right Action Button    (Floating Create Sphere trigger below header)
 ├── Cursor Hover Label         (Pure minimalist "/spherename" text floating near mouse cursor on node hover)
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

### 1. `InstancedMesh` GPU Pipeline & Calm Blue Skybox
To scale to thousands of items without CPU scene-graph draw call bottlenecking, [GalaxyCanvas.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/GalaxyCanvas.tsx) renders all sphere planet nodes and orbital wireframe rings using `THREE.InstancedMesh`:
- **Planet Mesh**: Single `InstancedMesh` with `SphereGeometry(0.75, 16, 16)`. Per-instance positions and theme colors (`instanceColor`).
- **Ring Mesh**: Single `InstancedMesh` with `TorusGeometry(1.25, 0.025, 8, 24)`.
- **Calm Blue Atmospheric Skysphere**: Custom inverted `ShaderMaterial` skysphere (`radius: 1000`, `depthWrite: false`) featuring a calm gradient from deep azure zenith (`#0c4a6e`) to cerulean sky blue (`#0284c7`), soft hazy pastel horizon (`#bae6fd`), and lower atmosphere blue (`#0369a1`), matching the 3D Sphere Map floating atmosphere.

### 2. First-Person 6-DOF Fly & Pan Camera Controls
Replaces single-pivot `OrbitControls` with a pure First-Person flight controller:
- **Left-Click + Mouse Drag**: Rotates camera viewing angle (Pitch & Yaw) freely in 360° around eye origin.
- **Right-Click / Middle-Click + Mouse Drag**: Pans camera position sideways and vertically in screen space.
- **`WASD` / Arrow Keys / Scroll**: Propels camera position smoothly through 3D galactic space with velocity damping.

### 3. Hover Label & Double-Click Interaction
- **Hover**: Uses `raycaster.intersectObject(planetInstancedMesh)` to locate `intersects[0].instanceId` in $O(1)$ time. Shows a clean `"/spherename"` monospace text label next to the cursor with no card backdrops, borders, or buttons.
- **Double-Click**: Listens to `dblclick` events. Double-clicking any 3D planet node selects that sphere and executes `onGoToMap()`, smoothly loading into the 3D Sphere Map view.

---

## ⚡ Extension Guidelines for AI Agents

1. **Sphere Creation Authentication Guard**:
   - Only authenticated users (`currentUser !== null`) can open the *Create New Sphere* modal. Unauthenticated visitors clicking "+ Create Sphere" trigger `onOpenAuthModal('login')`.
2. **Persistence Guarantee**:
   - When a user submits the *Create New Sphere* form, pass the `SphereItem` to `onCreateSphere()`, which calls `saveSphereToSupabase()` in [sphereService.ts](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/utils/sphereService.ts) to permanently save it to PostgreSQL.
3. **Canvas Performance**:
   - Do NOT replace `InstancedMesh` in [GalaxyCanvas.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/GalaxyCanvas.tsx) with individual `THREE.Mesh` objects, as doing so will break 60 FPS performance when scaling to thousands of spheres.
