# Page Context Specification: Sphere Studio & Settings Page

## 📌 Page Overview

The **Sphere Studio & Settings Page** (`SphereStudioPage`) is the administrative management portal for 3D sphere planets in OOMFS. It houses all configuration options, grid resolution pickers, mapping paradigm switches, zero-sum territory area sliders, weight presets, and custom tile texture image file uploaders.

---

## 🏗 Trigger & Navigation

- **Access Point**: Primary **"🌐 Manage My Spheres / Sphere Studio"** action card on the Member Profile Page ([MemberProfilePage.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/MemberProfilePage.tsx)).
- **Tab Route**: Registered under `activeTab === 'studio'` in [App.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/App.tsx).

---

## 🛠 Feature Modules

1. **Sphere Selector & Multi-Sphere Management**:
   - Filter toggle: **"My Spheres"** (spheres owned by logged-in user handle) vs. **"All Spheres"**.
   - Sphere search bar to filter by name or host handle.
   - Interactive sphere cards displaying active status, grid resolution, mapping paradigm, active account count $U$, theme, and owner handle.
   - Actions: **"Configure & Edit"** (switches to Globe & Grid Config tab for selected sphere) and **"Launch 3D Map"** (switches active sphere and launches 3D planet viewer).
2. **Sphere Ownership & Permission Mode**:
   - Displays sphere owner handle (`@ownerName`).
   - Non-owners are placed in `🔒 View-Only Mode`, keeping configurations visible for public inspection while locking modifications.
3. **Grid & Paradigm Config**:
   - Mapping Paradigm switcher: **Conquest Mode** (variable % territory clusters) vs. **1:1 Fair Mode** (1 tile per active user, $1/N$ area).
   - Grid Resolution picker: Select between **256, 512, 1024, or 2048 quad tiles**.
   - Active Accounts ($U$): Typed input & quick preset selector ($U = 4, 6, 10, 16, 32, 64$).
   - Visual Themes: Select from Neon Cyber, Matrix Glow, Topographic, Heatmap Spectrum, Slate Minimal, Synth Wireframe.
   - Re-seed trigger: Generates a new procedural 3D cluster seed.
4. **Territory Conquest Allocator**:
   - Zero-sum Area Sliders: Real-time recalculation of integer tile quotas $T_u$ preserving $\sum T_u = \text{totalTiles}$.
   - Presets: **Equalize** (even $100/N$), **Pareto 80/20**, **Randomize**.
   - Tile Texture Uploader: Per-account custom image uploader, writing file directly to Supabase Storage bucket `sphere-images`.
   - Account Filter Search Bar.
