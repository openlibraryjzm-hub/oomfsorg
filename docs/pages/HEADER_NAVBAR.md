# Component Context Specification: Header Navigation Bar

## 📌 Overview

The **Header Navigation Bar** ([Header.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/Header.tsx)) provides the top-level URL-style navigation and brand bar for OOMFS. It sits as a frameless, transparent overlay above the 3D WebGL canvas engine.

It features a minimalist, compact monospace URL brand string (`oomfs.org/{owner}`) with dual-segment routing and active-tab toggle support.

---

## 🏗 Component Architecture & Props Contract

**Component File**: [Header.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/Header.tsx)

```tsx
export type NavigationTab = 'galaxy' | 'map' | 'owner' | 'member';

interface HeaderProps {
  activeTab: NavigationTab;                       // Currently active page view tab
  onSelectTab: (tab: NavigationTab) => void;      // Tab selection callback
  user: UserProfile | null;                        // Signed-in user account profile
  activeSphereOwnerName?: string;                 // Owner handle of the sphere planet currently displayed
  onViewMyProfile?: () => void;                   // Direct callback to open signed-in user's profile
}
```

---

## 🧭 Interactive URL Navigation & Routing Specification

The top-left navigation branding presents a frameless URL string formatted as `oomfs.org/{owner}` (e.g. `oomfs.org/oprah`).

```
┌─────────────────────────────────────────────────────────────┐
│  oomfs.org/                                         oprah   │
│  [Code Galaxy View / Toggle]          [Profile View / Toggle]│
└─────────────────────────────────────────────────────────────┘
```

### 1. `oomfs.org/` Brand Segment
- **Display String**: `oomfs.org/`
- **Target Page**: **3D Code Galaxy Constellation View** (`activeTab = 'galaxy'`).
- **Active State Indicator**: Cyan underline decoration (`underline underline-offset-4 decoration-cyan-400`).
- **Toggle Invariant**:
  - If `activeTab !== 'galaxy'`: Clicking opens the 3D Code Galaxy view.
  - If `activeTab === 'galaxy'`: Clicking toggles back to the **3D Sphere Map** (`activeTab = 'map'`).

### 2. `{owner}` / Dynamic Parameter Segment (e.g. `oprah`)
- **Display String Resolution**:
  1. Primary: `activeSphereOwnerName` (the owner handle of the sphere planet currently being viewed on the globe).
  2. Fallback: `user?.username` (signed-in account handle).
  3. Ultimate Fallback: `'oprah'`.
  4. Sanitization: Strips leading `@` and replaces spaces with hyphens (`replace(/^@/, '').toLowerCase().replace(/\s+/g, '-')`).
- **Interactive Search & Jump Input**:
  - Rendered as a transparent, auto-sizing monospace text input (`<input />`).
  - Users can type any sphere owner handle (`oprah`, `@doge`), sphere ID (`sphere-genesis`), or sphere name (`Genesis Prime`).
  - **Submission Triggers**: Pressing **`Enter`** or **clicking off / blurring (`onBlur`)**.
  - **Match Found**: Switches to the matched 3D sphere planet (`onSelectSphere(matched.id)`), returns to the 3D Sphere Map (`activeTab = 'map'`), and updates the header handle text.
  - **No Match Found**: Resets input back to the original active sphere owner handle.
  - **Escape Key (`Escape`)**: Cancels typing and resets input.
- **Target Page Navigation & Toggle**:
  - Pressing `Enter` on unchanged handle text (or blurring without typing) navigates to the Member Profile page (`activeTab = 'member'`).
  - Re-pressing `Enter` or blurring while on the Member Profile page toggles back to the 3D Sphere Map (`activeTab = 'map'`).

---

## 🔐 Auth Controls Location

- Account authentication controls (**Log In**, **Register**, **Sign Out**) are located directly within [MemberProfilePage.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/MemberProfilePage.tsx).
- The header bar remains 100% minimalist and free of corner badge clutter.

---

## ⚡ Extension Guidelines for AI Agents

1. **Frameless Aesthetic**:
   - Keep the outer header wrapper `pointer-events-none` with `pointer-events-auto` on interactive typography buttons.
   - Do NOT wrap the URL text in heavy background panels or borders.
2. **Toggle Behavior Invariant**:
   - Always preserve the toggle-back-to-map behavior when an active tab segment is re-clicked.
3. **Owner Display Resolution Invariant**:
   - `activeSphereOwnerName` MUST be prioritized for the `{owner}` display segment so the URL accurately reflects the orb being viewed on the canvas.
