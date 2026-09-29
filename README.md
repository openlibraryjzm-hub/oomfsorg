# OOMFS Territory Conquest & Social Network Map

An interactive, high-performance WebGL & 2D Canvas application built with **React 18**, **TypeScript**, **Vite 5**, **Tailwind CSS**, and **Supabase**. It visualizes user network relationships, OOMF (one-of-my-followers / mutual) connections, and value-weighted territory conquest across full-bleed responsive 2D Proportional Maps and 2D Knowledge Graph network maps.

---

## 🌟 Project Purpose & Core Concept

**OOMFS** maps social relationships, follower connections, and weighted community contributions onto interactive 2D territory maps and landscape 2D Knowledge Graph maps.

The application supports two foundational paradigms:

1. **Value Conquest / Weighted Allocation Mode (`conquest`)**:
   - Uses **Squarified Treemap Partitioning** (Bruls et al. algorithm) to partition screen real estate into contiguous, aspect-ratio-optimized user territory blocks.
   - Target area percentages ($S_u\%$) map directly to exact 2D rectangular surface area with zero overlaps, zero unallocated gaps, and zero duplicate border tiles.
   - Supports selectable sub-grid matrix resolutions (**256, 512, 1024, or 2048 tiles**).
   - Real-time zero-sum area sliders allow users to transfer territory area between accounts instantly.
   - Ideal for value-weighted social metrics (donations, staking %, network owner ratings, influence scores).

2. **1:1 Equal Discrete Mode (`discrete_1to1`)**:
   - Dynamically scales to map any arbitrary number $N$ of active accounts or OOMF follower connections (from $N = 1$ to $N = 2,000+$).
   - Every single account receives exactly 1 equal partition ($1/N$ of the total map surface area).

---

## 🛠 Tech Stack

- **Frontend Framework**: React 18 (Functional Components, Custom Hooks)
- **Language**: TypeScript (Strict Mode)
- **Build Tool & Dev Server**: Vite 5
- **2D Graphics Engines**:
  - **2D Flat Map**: High-DPI HTML5 Canvas + Offscreen Texture Pipeline + Squarified Treemap Solver
  - **2D Knowledge Graph**: Responsive Landscape 2D Canvas Engine (Node & Edge Network Graph Layout, Pan/Zoom, Hit-Testing)
- **Backend & Database**: Supabase (PostgreSQL + S3 Storage Buckets)
- **Styling**: Tailwind CSS + Glassmorphism UI
- **Icons**: Lucide React
- **Code Quality & Diagnostics**: ESLint + TypeScript (`tsc --noEmit`)

---

## 📂 Project Architecture & Directory Map

```
OOMFS ORG/
├── src/
│   ├── components/
│   │   ├── AuthModal.tsx            # Glassmorphism tabbed login & account creation modal
│   │   ├── UserMenu.tsx             # Top-right navigation avatar pill & dropdown widget
│   │   ├── Header.tsx               # Frameless oomfs.org top navigation bar & router
│   │   ├── FlatMapCanvas.tsx        # High-DPI 2D full-bleed responsive map canvas (pan/zoom/raycasting)
│   │   ├── RightDockPanel.tsx       # Unified 3-Tab Control & Inspector Dock with View-Only Lock Banner
│   │   ├── SphereStudioPage.tsx     # Full-bleed Territory Map Studio & Config Portal
│   │   ├── CodeGalaxyPage.tsx       # 2D Knowledge Graph View HUD overlay & creation modal
│   │   ├── GalaxyCanvas.tsx         # High-DPI 2D Canvas Knowledge Graph & landscape layout engine
│   │   ├── MemberProfilePage.tsx    # Page-sized account profile manager (bio, Twitter link, carousels)
│   │   └── SphereOwnerPage.tsx      # Permanent Sphere Host profile view
│   ├── types/
│   │   ├── auth.ts                  # Auth interfaces: UserProfile, CarouselSection, CarouselItem
│   │   └── map.ts                   # Core interfaces: UserAccount, Region, MapSettings, MapTheme, SphereItem
│   ├── utils/
│   │   ├── authService.ts           # Auth service & profile sync (SHA-256 + Supabase Auth)
│   │   ├── partitionEngine.ts       # Squarified Treemap Partition Solver & 2D Canvas Texture Renderer
│   │   ├── supabase.ts              # Supabase JS Client initialization
│   │   ├── sphereService.ts         # Supabase DB & Storage API service handlers
│   │   └── galaxyGenerator.ts       # Procedural 3D galaxy dataset generator
│   ├── App.tsx                      # Root application state, routing, & data sync
│   ├── index.css                    # Tailwind CSS imports & custom styles
│   └── main.tsx                     # React entry point
├── docs/                            # Context Specifications & Architecture Documentation
│   ├── pages/
│   │   ├── 3D_SPHERE_MAP_PAGE.md    # 2D Territory Map Specification
│   │   ├── SPHERE_STUDIO_PAGE.md    # Sphere Studio & Config Specification
│   │   ├── CODE_GALAXY_PAGE.md      # 3D Code Galaxy Specification
│   │   ├── MEMBER_PROFILE_PAGE.md   # Member Profile Specification
│   │   └── SPHERE_OWNER_PAGE.md     # Sphere Owner Profile Specification
│   ├── backend/
│   │   ├── ACCOUNT_SYSTEM.md        # User Account System Specification
│   │   └── SUPABASE_ARCHITECTURE.md # Supabase DB Schema & API Specification
│   └── INDEX.md                     # Master Documentation Index & Sitemap
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript configuration
└── vite.config.ts                   # Vite build configuration
```

---

## 💡 Key Architectural Decisions

1. **Squarified Treemap & Responsive Aspect Ratio Engine ([partitionEngine.ts](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/utils/partitionEngine.ts))**:
   - Calculates 2D normalized user bounding rectangles (`rect2D: { x, y, w, h }`) using Bruls squarified treemap partitioning.
   - Evaluates live container aspect ratio (`width / height`) to deliver full-bleed, responsive layouts on widescreen desktop displays (16:9, 21:9), tablets, and portrait mobile phones.

2. **User Account Engine & Profile System ([ACCOUNT_SYSTEM.md](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/docs/backend/ACCOUNT_SYSTEM.md))**:
   - Authentication backed by `public.profiles` in Supabase PostgreSQL and SHA-256 password hashing.
   - Dedicated **Member Profile Page** (`MemberProfilePage.tsx`) for user account management: bio editor, Twitter/𝕏 handle linking, custom-titled media carousels, uncropped image rendering, and fullscreen lightbox viewer.

3. **Territory Map Studio & View-Only Lock ([SphereStudioPage.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/SphereStudioPage.tsx))**:
   - Central administrative portal for creating, editing, and configuring territory maps.
   - Includes real-time zero-sum sliders, allocation presets (Equalize, Pareto 80/20, Randomize), tile image uploads, and an embedded sticky 2D map preview canvas.
   - Non-owners are placed in `View-Only Mode` with a lock banner, keeping settings browsable while protecting ownership control.

4. **3D Constellation Engine ([GalaxyCanvas.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/GalaxyCanvas.tsx))**:
   - Built using `THREE.InstancedMesh` to render thousands of planet nodes in 3 WebGL draw calls, delivering 60 FPS performance.

---

## 🚀 Quick Start & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
VITE_SUPABASE_URL=https://your-supabase-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Type Check & Production Build
```bash
npx tsc --noEmit
npm run build
```

---

## 🤖 Guidelines for AI & Human Developers

1. **Preserve API & Data Contracts**:
   - `generateClusteredPartitions` in [partitionEngine.ts](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/utils/partitionEngine.ts) expects `(requestedTileCount, userCount, seed, theme, customUserShares, customUserImages, mappingMode, aspectRatio)`.
   - `updateSphereInSupabase` in [sphereService.ts](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/utils/sphereService.ts) handles syncing map state to PostgreSQL.
2. **Zero-Sum Slider Invariant**:
   - Dragging any area slider in Conquest mode must maintain total share sum equal to $100\%$ across active accounts.
3. **Full-Bleed Aspect Ratio Responsiveness**:
   - All map canvas renders should respect the container aspect ratio, adjusting `rect2D` layout for landscape or portrait viewports.
