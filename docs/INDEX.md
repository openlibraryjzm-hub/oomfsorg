# OOMFS.ORG Architecture & Page Context Index

Welcome to the **OOMFS Territory Conquest & Follower Sphere Map** codebase context suite. This index is optimized for **fresh AI agent and developer onboarding**. It provides an authoritative overview of system architecture, state management, 3D WebGL rendering, and page-specific specifications.

---

## 🌟 Core System Architecture

**OOMFS** maps social relationships, mutual follower network connections, and weighted community contributions onto a 100% native 3D WebGL sphere globe.

- **Frontend Engine**: React 18 + TypeScript (Strict Mode) + Vite 5 + Tailwind CSS
- **3D WebGL Graphics**: Three.js (`SphereGeometry`, `CanvasTexture`, `PerspectiveCamera`, `OrbitControls`, `Raycaster`)
- **Canvas Resolution**: $4096 \times 2048$ (4K 2:1 globe texture canvas with `THREE.SRGBColorSpace`)
- **Rendering Shading**: Unlit `THREE.MeshBasicMaterial` + `THREE.NoToneMapping` for 100% pixel-perfect raw RGB color accuracy matching uploaded source images.

---

## 🗺️ Multi-Page Navigation Sitemap

The top navigation header ([Header.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/Header.tsx)) provides frameless URL-style routing:

```
                            ┌──────────────────────────────────────┐
                            │ Top Header: oomfs.org/{owner}        │
                            └──────────────────┬───────────────────┘
                                               │
                       ┌───────────────────────┴───────────────────────┐
                 ┌─────▼─────┐                                   ┌─────▼─────┐
                 │ oomfs.org/│                                   │ {owner}   │
                 │ Code      │                                   │ Member    │
                 │ Galaxy    │                                   │ Profile   │
                 └───────────┘                                   └───────────┘
```

---

## 📂 Page & Component Context Document Suite

Read the dedicated context specs below for full component contracts, state flow, and extension guidelines:

| Page / Component | Component File | Description & Specifications |
| :--- | :--- | :--- |
| **Header Navigation Bar** | [Header.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/Header.tsx) | Frameless persistent header overlay (`oomfs.org • @sphereowner ... @yourname`), font-black black owner handle, and smart toggle navigation. See [HEADER_NAVBAR.md](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/docs/pages/HEADER_NAVBAR.md). |
| **3D Sphere Map** | [MapCanvas.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/MapCanvas.tsx) | Core interactive 3D WebGL sphere canvas, Calm Blue Skybox floating atmosphere, zero-sum area sliders, and 1-per-tile custom images. See [3D_SPHERE_MAP_PAGE.md](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/docs/pages/3D_SPHERE_MAP_PAGE.md). |
| **Code Galaxy** | [CodeGalaxyPage.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/CodeGalaxyPage.tsx) | Network-level 3D constellation view ($N=2,500+$ follower nodes). Features double-click map entry and minimalist `"/spherename"` cursor hover labels. See [CODE_GALAXY_PAGE.md](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/docs/pages/CODE_GALAXY_PAGE.md). |
| **Sphere Owner** | [SphereOwnerPage.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/SphereOwnerPage.tsx) | Dedicated profile page for the permanent Sphere Host (`@oomf_architect`, master node anchor). See [SPHERE_OWNER_PAGE.md](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/docs/pages/SPHERE_OWNER_PAGE.md). |
| **Member Profile** | [MemberProfilePage.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/MemberProfilePage.tsx) | Page-sized account profile manager floating over full-bleed calm sky atmosphere (zero dark card backdrops). See [MEMBER_PROFILE_PAGE.md](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/docs/pages/MEMBER_PROFILE_PAGE.md). |
| **Twitter Auth & OAuth 2.0** | [twitterService.ts](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/utils/twitterService.ts) | End-to-end Twitter/𝕏 OAuth 2.0 PKCE system, Vite Dev Proxy, Supabase Auth Provider, and 402 Free Tier fallback. See [TWITTER_AUTH_SYSTEM.md](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/docs/TWITTER_AUTH_SYSTEM.md). |

---

## 🛠 Critical Code Invariants for AI Agents

When modifying or extending this codebase, adhere strictly to these rules:

1. **Exact Quota Allocation**:
   - Discrete 3D tile quotas $T_u$ MUST sum to exactly 512 tiles across active user accounts.
   - Quotas are computed in `generateClusteredPartitions` in [partitionEngine.ts](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/utils/partitionEngine.ts) using Hamilton's Largest Remainder Method.

2. **100% Raw Image Brightness & Color Space**:
   - `texture.colorSpace` MUST be explicitly set to `THREE.SRGBColorSpace`.
   - `renderer.toneMapping` MUST be set to `THREE.NoToneMapping` (prevents filmic curve dimming).
   - Mesh material MUST use `THREE.MeshBasicMaterial` (unlit) to eliminate directional light shadows over tile textures.

3. **Account & Partition Separation**:
   - 3D globe partition tiles on the map canvas are strictly territory allocations.
   - Profile pages are strictly account-level (`UserProfile`) accessed via the "My Profile" tab or UserMenu dropdown.

4. **Build Verification**:
   - Always run `npx tsc --noEmit` and verify clean execution before concluding work.
