# Page Context Specification: Sphere Studio & Territory Settings Page

## 📌 Page Overview

The **Sphere Studio & Settings Page** (`SphereStudioPage.tsx`) is the administrative management portal for territory maps in OOMFS. It houses configuration controls, grid resolution pickers, mapping paradigm switches, zero-sum territory area sliders, weight presets, custom tile texture image file uploaders, and a sticky embedded live 2D map viewport preview.

---

## 🏗 Trigger & Navigation

- **Access Point**: Primary **"🌐 Manage My Spheres / Sphere Studio"** action card on the Member Profile Page ([MemberProfilePage.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/MemberProfilePage.tsx)).
- **Tab Route**: Registered under `activeTab === 'studio'` in [App.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/App.tsx).

---

## 🛠 Feature Modules

1. **Territory Map Selector & Multi-Map Management**:
   - Filter toggle: **"My Spheres"** (maps owned by logged-in user handle) vs. **"All Spheres"**.
   - Search bar to filter maps by name or host handle.
   - Interactive map cards displaying active status, grid resolution, mapping paradigm, active account count $U$, visual theme, and owner handle.
   - Actions: **"Configure & Edit"** (switches to Grid Config tab for selected map) and **"Launch 2D Map"** (switches active map and launches full-screen 2D viewer).

2. **Ownership & View-Only Permission Model**:
   - Displays map owner handle (`@ownerName`).
   - Non-owners are placed in `🔒 View-Only Mode`, keeping configurations visible for public inspection while locking modifications.

3. **Grid & Paradigm Config**:
   - Mapping Paradigm switcher: **Conquest Mode** (variable % squarified territory clusters) vs. **1:1 Fair Mode** (1 tile per active user, $1/N$ area).
   - Grid Resolution picker: Select between **256, 512, 1024, or 2048 quad tiles**.
   - Active Accounts ($U$): Typed input & quick preset selector ($U = 4, 6, 10, 16, 32, 64$).
   - Visual Themes: Select from Neon Cyber, Matrix Glow, Topographic, Heatmap Spectrum, Slate Minimal, Synth Wireframe.
   - Re-seed trigger: Re-calculates procedural layout seed.

4. **Territory Conquest Allocator**:
   - Zero-sum Area Sliders: Real-time recalculation of integer tile quotas $T_u$ preserving $\sum T_u = \text{totalTiles}$ and $\sum S_u\% = 100\%$.
   - Presets: **Equalize** (even $100/N$), **Pareto 80/20**, **Randomize**.
   - Tile Texture Uploader: Per-account custom image uploader, writing files directly to Supabase Storage bucket `sphere-images`.
   - Search Bar for filtering account handles.

5. **Sticky Live 2D Map Viewport Card**:
   - 50:50 desktop split layout featuring an embedded `FlatMapCanvas` preview.
   - Updates live in real-time as sliders, themes, grid resolutions, or custom image uploads change.

---

## ⚡ Extension Guidelines for AI Agents

1. When adding controls to [SphereStudioPage.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/SphereStudioPage.tsx), pass partial updates through `onUpdateSettings(updated: Partial<MapSettings>)`.
2. **Ownership Guard**: Always check `isSphereOwner` before enabling input elements or slider controls. Non-owners MUST be placed in `View-Only Mode`.
