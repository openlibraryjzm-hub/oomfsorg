# Component Specification: Floating Inspect Card (`FloatingInspectCard`)

## 📌 Overview

`FloatingInspectCard` is a hyper-minimalist, anchored bottom-right HUD overlay component for OOMFS. It displays rich account intelligence exclusively for the currently selected/pinned territory partition tile on the 3D WebGL sphere.

---

## 🏗 Component Interface

```tsx
interface FloatingInspectCardProps {
  user: UserAccount | null;     // Currently selected user account
  isPinned: boolean;           // True when pinned via intentional single left click
  onClose: () => void;          // Callback to unpin / clear selection
}
```

---

## 🎨 Layout & Features

1. **Anchored Floating Badge**: Positioned at `fixed bottom-6 right-6 z-30` with dark frosted glass (`bg-black/90 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl`).
2. **Account Avatar / Tile Texture**: Displays uploaded tile texture image if present, or an avatar color ring fallback with `User` icon.
3. **Telemetry & Metrics**:
   - Username handle (`@handle`) & Code tag (`[USER-001]`)
   - Category tag (`Developer`, `Creator`, etc.)
   - Owned Tiles count
   - Globe Surface Share (`% area`)
   - Metric Score progress bar
   - 3D Vector Centroid Coordinates (`[x, y, z]`)
4. **Pinned Close Trigger**: When pinned via intentional left click on a 3D tile, a close button (`X`) is rendered to unpin.
