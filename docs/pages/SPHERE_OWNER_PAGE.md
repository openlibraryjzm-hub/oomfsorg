# Page Context Specification: Sphere Owner Profile Page

## 📌 Page Overview

The **Sphere Owner Profile Page** is the dedicated host profile view for the permanent **Sphere Owner / Host** (`@oomf_architect`). 

Unlike variable partition member accounts whose territory shares change dynamically via zero-sum area sliders, the Sphere Owner's identity and governance parameters are **fixed and non-variable**.

- **Trigger**: Clicked via the `Sphere Owner` tab in top header ([Header.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/Header.tsx)).

---

## 🏗 Component Structure

**Component File**: [SphereOwnerPage.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/SphereOwnerPage.tsx)

```tsx
interface SphereOwnerPageProps {
  userCount: number;  // Number of active member accounts currently occupying the sphere
  tileCount: number;  // Total tiles managed (512 tiles)
  onGoToMap: () => void;
}
```

---

## 👑 Host Specs & Data Contracts

| Spec Parameter | Value | Purpose |
| :--- | :--- | :--- |
| **Host Handle** | `@oomf_architect` | Primary identity of the sphere host. |
| **Host Code** | `SPHERE-HOST-001` | Unique master node validator ID. |
| **Verification Badge** | `Verified Sphere Host` | ShieldCheck badge confirming cryptographic sphere ownership. |
| **Managed Sphere Grid** | `512 Tiles` | Fixed resolution grid maintained by this host instance. |
| **Staking Tier** | `Tier-1 Anchor` | Staking classification for uptime and network verification (99.98% uptime). |
| **Master Node Anchor** | `0x8F92a71C43e90B2D44109eB58aA190472149b56F` | Cryptographic public key address for sphere state synchronization. |

---

## 🎨 Visual Layout & Features

1. **Hero Header**: Displays owner avatar (`@OA`), verified badge, host ID, and a primary action button *"Inspect Managed Sphere"* (`onGoToMap`).
2. **Infrastructure Summary**: Explains the owner's role in maintaining the permanent cryptographic seed, tile grid resolution, and zero-sum protocol.
3. **Sphere Managed Grid**: 3-column statistics cards displaying total tiles ($512$), active partition count ($U = 4,6,10,16$), and node staking tier.
4. **Anchor Key Box**: Displays the cryptographic master node address in a monospace glass container.

---

## ⚡ Extension Guidelines for AI Agents

1. If adding host configuration controls (e.g. changing default seed, toggling system reserve caps), integrate them into this page while preserving the non-variable host identity.
2. The master node anchor address `0x8F92...` should remain consistent across network state updates.
