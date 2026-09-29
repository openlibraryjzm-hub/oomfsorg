# Page Context Specification: 2D Knowledge Graph View (Code Galaxy)

## 📌 Page Overview

The **2D Knowledge Graph View** (Code Galaxy) is the macro network graph engine of OOMFS. It visualizes all active community spheres as nodes in a fixed 2D knowledge graph structure with interconnecting edges, expanding in a responsive landscape orientation across devices.

- **Navigation Trigger**: Accessed via the top-left `"oomfs.org"` brand button in [Header.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/Header.tsx).
- **Core Capabilities**:
  - Interactive 2D Knowledge Graph rendering with configurable node size and edge weight parameters.
  - Responsive landscape layout auto-stretching across device aspect ratios (widescreen, desktop, tablet, mobile).
  - Smooth 2D Pan & Zoom canvas navigation with fit-to-screen controls.
  - Minimalist floating action button (`"+ Create Sphere"`) in top right below header.
  - Hover interaction displaying clean monospace hover text label (`"/spherename"`).
  - Double-click interaction on graph nodes to enter the selected 2D Territory Map directly.
  - Login-protected modal for creating and spawning new community sphere nodes into the graph & Supabase database.

---

## 🏗 Component Architecture & Hierarchy

```
CodeGalaxyPage.tsx
 ├── GalaxyCanvas.tsx           (High-DPI 2D Canvas Knowledge Graph renderer, landscape layout engine, pan/zoom, edge/node hit testing)
 ├── Top-Right Action Button    (Floating Create Sphere trigger below header)
 ├── Cursor Hover Label         (Pure minimalist "/spherename" text floating near mouse cursor on node hover)
 └── Create New Sphere Modal    (Form to configure and spawn a new sphere node into Supabase, pre-filled with @currentUser.username)
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

## 🕸️ 2D Knowledge Graph Engine ([GalaxyCanvas.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/GalaxyCanvas.tsx))

### 1. Landscape Layout & Aspect-Ratio Scaling
- Evaluates container aspect ratio (`width / height`) dynamically to stretch the graph in a wide landscape format across screen resolutions.
- Computes node positions using a landscape-optimized graph positioning algorithm (central master node surrounded by community cluster nodes with connecting graph edges).

### 2. Graph Nodes & Interconnecting Edges
- **Nodes**: Rendered with glowing ambient radial gradients, theme-colored inner rings, and configurable radius parameters.
- **Edges**: Interconnecting network lines between related spheres rendered with semi-transparent cyan/blue gradients, animated pulse pulses, and configurable line width.

### 3. Pan, Zoom & Hit-Testing Interactions
- **Pan & Zoom**: Smooth click-and-drag pan, mouse wheel zoom ($0.4\times$ to $4.0\times$), and responsive auto-fit bounds.
- **Hover**: Calculates mouse distance to node centers in 2D screen space. Highlights hovered node, amplifies connected edges, and exposes node name in `handleHoverSphere`.
- **Double-Click**: Double-clicking any graph node selects the sphere and triggers `onGoToMap()` to transition into the 2D Territory Map view.

---

## ⚡ Extension Guidelines for AI Agents

1. **Sphere Creation Authentication Guard**:
   - Only authenticated users (`currentUser !== null`) can open the *Create New Sphere* modal. Unauthenticated visitors clicking "+ Create Sphere" trigger `onOpenAuthModal('login')`.
2. **Persistence Guarantee**:
   - When a user submits the *Create New Sphere* form, pass the `SphereItem` to `onCreateSphere()`, which calls `saveSphereToSupabase()` in [sphereService.ts](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/utils/sphereService.ts) to permanently save it to PostgreSQL.
3. **Graph Parametrization**:
   - Keep node radii, edge stroke widths, and cluster spacing variables configurable via clear parameter constants so future size tuning can be applied seamlessly.

