# Component Context Specification: Header Navigation Bar

## 📌 Overview

The **Header Navigation Bar** ([Header.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/Header.tsx)) provides top-level brand and profile navigation for OOMFS. It sits as a frameless, transparent overlay (`fixed top-4 left-4 right-4 z-40 pointer-events-none`) persistently visible across the 3D Sphere Map, Code Galaxy, and Member Profile pages.

It features a single big bold brand button (`oomfs.org`), a floating dot separator (`•`), the active sphere host handle (`@sphereowner`), and a direct link to the user's account profile (`@yourhandle`).

---

## 🏗 Component Architecture & Props Contract

**Component File**: [Header.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/Header.tsx)

```tsx
export type NavigationTab = 'galaxy' | 'map' | 'owner' | 'member' | 'studio';

interface HeaderProps {
  activeTab: NavigationTab;                       // Currently active page view tab
  onSelectTab: (tab: NavigationTab) => void;      // Tab selection callback
  user: UserProfile | null;                        // Signed-in user account profile
  activeSphereOwnerName?: string;                 // Owner handle of the sphere planet currently displayed
  onViewMyProfile?: () => void;                   // Direct callback to open signed-in user's profile
}
```

---

## 🧭 Interactive Navigation Specification

The header navigation presents a split layout: `oomfs.org • @sphereowner` on the left and `@yourhandle` on the far right.

```
┌─────────────────────────────────────────────────────────────┐
│  oomfs.org  •  @oprah                             @yourname │
│  [Galaxy View] [Sphere Owner]                 [My Profile]  │
└─────────────────────────────────────────────────────────────┘
```

### 1. Left Side: `oomfs.org` Brand Segment
- **Display String**: `oomfs.org` (without trailing slash).
- **Target Page**: **3D Code Galaxy Constellation View** (`activeTab = 'galaxy'`).
- **Active State Indicator**: Blue underline decoration (`underline underline-offset-4 decoration-blue-500`).
- **Toggle Navigation**:
  - If `activeTab !== 'galaxy'`: Clicking opens the 3D Code Galaxy view.
  - If `activeTab === 'galaxy'`: Clicking toggles back to the **3D Sphere Map** (`activeTab = 'map'`).

### 2. Left Side: `• @sphereowner` Link
- **Display Handle**: Handle of the sphere owner currently displayed on the 3D globe (`activeSphereOwnerName`, fallback to signed in user or `'oprah'`).
- **Typography & Color**: Rendered in sharp black font text (`text-slate-900 font-black`) for high contrast readability over bright and sky atmospheric backdrops.
- **Target Page & Toggle Navigation**:
  - Rendered as a font-black clickable button (`<button>`).
  - If on 3D Sphere Map or Galaxy page: Clicking `@{sphereowner}` opens that owner's profile page (`activeTab = 'owner'`).
  - If on Member or Owner Profile page: Clicking `@{sphereowner}` returns to the **3D Sphere Map** (`activeTab = 'map'`).

### 3. Far Right Side: `@{yourname}` Account Profile Link
- **Display Handle**: Handle of the signed-in user account (`user?.username`, fallback to `'oprah'`).
- **Target Page & Toggle Navigation**:
  - Rendered on the far right of the header bar.
  - If `activeTab !== 'member'`: Clicking `@{yourname}` opens the signed-in account profile page (`activeTab = 'member'`).
  - If `activeTab === 'member'`: Clicking `@{yourname}` toggles back to the **3D Sphere Map** (`activeTab = 'map'`).

---

## 🔐 Auth Controls Location

- Account authentication controls (**Log In**, **Register**, **Sign Out**) are located directly within [MemberProfilePage.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/MemberProfilePage.tsx).
- The header bar remains 100% minimalist and free of corner badge clutter.

---

## ⚡ Extension Guidelines for AI Agents

1. **Frameless Aesthetic**:
   - Keep the outer header wrapper `fixed top-4 left-4 right-4 z-40 pointer-events-none` with `pointer-events-auto` on interactive typography buttons.
   - Do NOT wrap the URL text in heavy background panels or borders.
2. **Toggle Behavior Invariant**:
   - Always preserve the toggle-back-to-map behavior when an active tab segment is re-clicked.
