# OOMFS Territory Conquest & Follower Sphere Map

An interactive, high-performance WebGL application built with **React**, **TypeScript**, **Vite**, **Three.js**, **Tailwind CSS**, and **Supabase**. It visualizes user network relationships, OOMF (one-of-my-followers / mutual) connections, and value-weighted territory conquest on native 3D interactive sphere globes and a 3D constellation universe.

---

## 🌟 Project Purpose & Core Concept

**OOMFS** maps social relationships, follower connections, and weighted community contributions onto interactive 3D WebGL globes and a macro-scale 3D Code Galaxy constellation universe.

The application supports two foundational paradigms:

1. **Value Conquest / Weighted Allocation Mode (`conquest`)**:
   - Uses selectable grid resolutions of **256, 512, 1024, or 2048 3D quad tiles**.
   - Active users ($U = 1 \dots N$) own discrete, contiguous territory clusters proportional to their target share percentage ($T_k = \text{round}(\text{TileCount} \times \text{Share}_k\%)$).
   - Real-time zero-sum area sliders allow users to transfer territory tiles between accounts instantly.
   - Ideal for value-weighted metrics (donations, staking %, network owner ratings, influence score).

2. **OOMF Follower Network Mapping Mode (`discrete_1to1`)**:
   - Dynamically scales to map any arbitrary number $N$ of active accounts or OOMF follower connections (from $N = 1$ to $N = 2,000+$).
   - Every single follower/account receives exactly 1 equal partition ($1/N$ of the globe surface).
   - Small $N$: Large quadrant territories.
   - Large $N$: High-density equal partition globe grid.

---

## 🛠 Tech Stack

- **Frontend Framework**: React 18
- **Language**: TypeScript (Strict Mode)
- **Build Tool & Dev Server**: Vite 5
- **3D Graphics Engine**: Three.js (`InstancedMesh`, `OrbitControls`, `Raycaster`, `CanvasTexture`, `PerspectiveCamera`, `MeshBasicMaterial`)
- **Backend & Database**: Supabase (PostgreSQL + S3 Storage)
- **Styling**: Tailwind CSS + Glassmorphism Theme
- **Icons**: Lucide React
- **Code Quality**: ESLint + TypeScript (`tsc --noEmit`)

---

## 📂 Project Architecture & Directory Map

```
OOMFS ORG/
├── src/
│   ├── components/
│   │   ├── AuthModal.tsx            # Glassmorphism tabbed login & account creation modal
│   │   ├── UserMenu.tsx             # Top-right navigation avatar pill & dropdown widget
│   │   ├── Header.tsx               # Frameless oomfs.org/{owner} top navigation bar & active-tab toggle router
│   │   ├── MapCanvas.tsx            # Three.js 3D WebGL Canvas, lighting, orbit controls & raycasting
│   │   ├── RightDockPanel.tsx       # Unified 3-Tab Control & Inspector Dock with View-Only Lock Banner
│   │   ├── CodeGalaxyPage.tsx       # Network 3D Galaxy View HUD overlay, creator badges, & creation modal
│   │   ├── GalaxyCanvas.tsx         # Three.js 3D WebGL Galaxy starfield & InstancedMesh GPU pipeline
│   │   ├── MemberProfilePage.tsx    # Page-sized account profile manager (bio, Twitter link, carousels, lightbox)
│   │   └── SphereOwnerPage.tsx      # Sphere owner profile view
│   ├── types/
│   │   ├── auth.ts                  # Auth interfaces: UserProfile, CarouselSection, CarouselItem, AuthModalMode
│   │   └── map.ts                   # Core interfaces: UserAccount, Region, MapSettings, MapTheme, MappingMode, SphereItem
│   ├── utils/
│   │   ├── authService.ts           # Username & Password Auth service (Web Crypto SHA-256 + profile syncing)
│   │   ├── partitionEngine.ts       # 3D Power-Distance Compact Tile Solver & 2D Texture Canvas Renderer
│   │   ├── supabase.ts              # Supabase JS Client initialization
│   │   ├── sphereService.ts         # Supabase DB & Storage API service handlers
│   │   └── galaxyGenerator.ts       # Procedural 3D galaxy dataset generator
│   ├── App.tsx                      # Root application state, auth subscription, & Supabase data sync
│   ├── index.css                    # Tailwind CSS imports & custom glass-panel styles
│   └── main.tsx                     # React entry point
├── docs/                            # Project Context Specifications & Architecture Docs
│   ├── pages/
│   │   ├── 3D_SPHERE_MAP_PAGE.md    # 3D Sphere Map Specification
│   │   ├── CODE_GALAXY_PAGE.md      # 3D Code Galaxy Constellation Specification
│   │   ├── MEMBER_PROFILE_PAGE.md   # Member Account Profile Specification
│   │   └── SPHERE_OWNER_PAGE.md     # Sphere Owner Profile Specification
│   ├── backend/
│   │   ├── ACCOUNT_SYSTEM.md        # User Account System & Auth Architecture Specification
│   │   └── SUPABASE_ARCHITECTURE.md # Supabase DB Schema, Storage & API Contracts
│   └── INDEX.md                     # Master Documentation Index & Sitemap
├── public/                          # Static assets
├── package.json                     # Project dependencies & npm scripts
├── tsconfig.json                    # TypeScript configuration
└── vite.config.ts                   # Vite build configuration
```

---

## 💡 Key Architectural Decisions & Features

1. **User Account Engine & Profile Management ([ACCOUNT_SYSTEM.md](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/docs/backend/ACCOUNT_SYSTEM.md))**:
   - Direct Username + Password authentication backed by `public.profiles` in PostgreSQL and Web Crypto SHA-256 client-side hashing.
   - Session state automatically persists across browser reloads via `localStorage` and custom cross-tab events.
   - Dedicated **Member Profile Page** (`MemberProfilePage.tsx`) for user account management: customizable bio editor, Twitter/𝕏 handle linking, custom-titled media carousels with tightly packed native aspect ratio cards (`h-64 sm:h-72 w-auto object-cover`), uncropped image rendering, and a fullscreen lightbox viewer.
   - Strict separation between registered account profiles (`UserProfile`) and 3D globe map partition tiles.

2. **Sphere Ownership & View-Only Permission Model ([RightDockPanel.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/RightDockPanel.tsx))**:
   - Creating a 3D sphere planet in Code Galaxy automatically attributes `ownerName` to `@` + `currentUser.username`.
   - Spheres enforce a **`🔒 View-Only Mode`** lock banner for non-owners, disabling grid resolution, theme, seed, slider, and texture modifications while keeping the tile Inspector open for public browsing.

3. **3D Code Galaxy Constellation Engine ([GalaxyCanvas.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/GalaxyCanvas.tsx))**:
   - Built using `THREE.InstancedMesh` to render thousands of 3D glowing sphere planet nodes in **3 WebGL draw calls**, delivering 60 FPS performance.
   - Includes `/mine` preset command filter to isolate globes created by the logged-in user.

4. **Live Supabase Backend Integration ([SUPABASE_ARCHITECTURE.md](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/docs/backend/SUPABASE_ARCHITECTURE.md))**:
   - `public.profiles` table stores account handles, password hashes, bio, Twitter handle, avatar URL, and custom media carousels (JSONB).
   - `public.spheres` table stores 3D sphere globe configurations, zero-sum slider target shares, and custom tile image URLs.
   - `sphere-images` public storage bucket hosts uploaded tile texture images and member profile carousel media.

5. **Unified Right Dock Panel ([RightDockPanel.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/RightDockPanel.tsx))**:
   - Single collapsible dock panel with 3 tabs (`🌐 Config`, `📊 Allocator`, `🔍 Inspect`) for managing grid resolution, user counts, themes, zero-sum area sliders, and texture uploads.

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

### 4. Type Check & Build
```bash
npx tsc --noEmit
npm run build
```

---

## 🤖 Guidelines for AI & Human Developers

1. **Preserve API Contracts**:
   - `generateClusteredPartitions` in [partitionEngine.ts](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/utils/partitionEngine.ts) expects `(requestedTileCount, userCount, seed, theme, customUserShares, customUserImages, mappingMode)`.
   - `updateSphereInSupabase` in [sphereService.ts](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/utils/sphereService.ts) handles syncing sphere updates back to PostgreSQL.
   - `updateUserProfile` in [authService.ts](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/utils/authService.ts) handles syncing user account updates to `public.profiles`.

2. **Zero-Sum Slider Invariant**:
   - In Conquest mode, dragging any area slider in [RightDockPanel.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/RightDockPanel.tsx) must preserve total share sum equal to $100\%$ across active accounts.

3. **Galaxy Canvas Performance**:
   - Maintain the `InstancedMesh` pipeline in [GalaxyCanvas.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/GalaxyCanvas.tsx) for all planet nodes and orbital wireframe rings to prevent CPU draw call bottlenecking.
