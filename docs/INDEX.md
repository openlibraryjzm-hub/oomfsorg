# OOMFS.ORG Architecture & Context Index

Welcome to the **OOMFS Territory Conquest & Follower Network Map** codebase context suite. This index is optimized for **fresh AI agent and developer onboarding**. It provides an authoritative overview of system architecture, state management, 2D & 3D rendering engines, and page-specific specifications.

---

## 🌟 Core System Architecture

**OOMFS** maps social relationships, mutual follower network connections, and weighted community contributions onto full-bleed 2D proportional territory maps and responsive landscape 2D Knowledge Graph network maps.

- **Frontend Framework**: React 18 + TypeScript (Strict Mode) + Vite 5 + Tailwind CSS
- **2D Territory Map Canvas**: High-DPI HTML5 Canvas + Offscreen Texture Pipeline (`drawRegionTexture`)
- **2D Knowledge Graph Canvas**: High-DPI HTML5 Canvas + Landscape Node & Edge Network Graph Layout Engine
- **Territory Layout Engine**: Squarified Treemap Partitioning (Bruls et al. algorithm)
- **Backend Infrastructure**: Supabase PostgreSQL (`profiles`, `spheres`) + S3 Storage Bucket (`sphere-images`)

---

## 🗺️ Multi-Page Navigation Sitemap

The top navigation header ([Header.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/Header.tsx)) provides frameless URL-style routing:

```
                            ┌──────────────────────────────────────┐
                            │ Top Header: oomfs.org/{owner}        │
                            └──────────────────┬───────────────────┘
                                               │
                       ┌───────────────────────┼───────────────────────┐
                 ┌─────▼─────┐           ┌─────▼─────┐           ┌─────▼─────┐
                 │ oomfs.org/│           │ 🌐 Studio │           │ {owner}   │
                 │ 2D Graph  │           │ Territory │           │ Member    │
                 │ View      │           │ Config    │           │ Profile   │
                 └───────────┘           └───────────┘           └───────────┘
```

---

## 📂 Page & Component Context Specifications

Read the dedicated context specs below for full component contracts, state flow, and extension guidelines:

| Page / Component | Component File | Description & Specifications |
| :--- | :--- | :--- |
| **Header Navigation Bar** | [Header.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/Header.tsx) | Frameless persistent header overlay (`oomfs.org • @sphereowner ... @yourname`), active tab router, and user menu dropdown. See [HEADER_NAVBAR.md](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/docs/pages/HEADER_NAVBAR.md). |
| **2D Territory Map** | [FlatMapCanvas.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/FlatMapCanvas.tsx) | Core interactive 2D map canvas, Squarified Treemap layout, full-bleed aspect-ratio responsiveness, zero-sum area sliders, pan/zoom controls, and 1-per-tile custom images. See [3D_SPHERE_MAP_PAGE.md](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/docs/pages/3D_SPHERE_MAP_PAGE.md). |
| **Sphere Studio & Config** | [SphereStudioPage.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/SphereStudioPage.tsx) | Full-bleed administrative studio portal. Controls grid resolution, conquest area sliders, allocation presets, custom tile texture uploads, and sticky embedded live 2D map preview. See [SPHERE_STUDIO_PAGE.md](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/docs/pages/SPHERE_STUDIO_PAGE.md). |
| **2D Knowledge Graph (Code Galaxy)** | [CodeGalaxyPage.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/CodeGalaxyPage.tsx) | Network-level 2D Knowledge Graph view ($N=2,500+$ sphere nodes). Features double-click map entry and minimalist `"/spherename"` cursor hover labels. See [CODE_GALAXY_PAGE.md](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/docs/pages/CODE_GALAXY_PAGE.md). |
| **Sphere Owner Profile** | [SphereOwnerPage.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/SphereOwnerPage.tsx) | Dedicated profile page for the permanent Sphere Host (`@oomf_architect`, master node anchor). See [SPHERE_OWNER_PAGE.md](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/docs/pages/SPHERE_OWNER_PAGE.md). |
| **Member Profile** | [MemberProfilePage.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/MemberProfilePage.tsx) | Account profile manager floating over full-bleed sky atmosphere. Bio editor, Twitter/𝕏 handle linking, custom media carousels, and image lightbox. See [MEMBER_PROFILE_PAGE.md](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/docs/pages/MEMBER_PROFILE_PAGE.md). |

---

## 🛠 Critical Code Invariants for AI Agents

When modifying or extending this codebase, adhere strictly to these rules:

1. **Exact Quota & Area Preservation**:
   - In Conquest mode, target share percentages ($S_u\%$) MUST sum to exactly $100\%$ across active user accounts.
   - Discrete sub-tile quotas $T_u$ MUST sum to `totalTiles` ($256, 512, 1024, 2048$), computed in `generateClusteredPartitions` in [partitionEngine.ts](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/utils/partitionEngine.ts) using Hamilton's Largest Remainder Method.

2. **Aspect Ratio Responsiveness**:
   - `FlatMapCanvas.tsx` evaluates container aspect ratio (`width / height`) and passes it to `generateClusteredPartitions`.
   - Layout calculations MUST adapt dynamically for widescreen landscape monitors (16:9, 21:9), tablets, and portrait mobile displays without pillarboxes or letterboxes.

3. **Account & Territory Separation**:
   - Map canvas partitions represent value allocations and social territory.
   - Account profiles are managed via `UserProfile` objects and synced to Supabase `public.profiles`.

4. **Build Verification**:
   - Always run `npx tsc --noEmit` and `npm run build` to verify zero type errors and clean bundling before concluding work.
