# Page Context Specification: Member Profile Page

## 📌 Page Overview

The **Member Profile Page** provides a page-sized showcase and management portal for authenticated user accounts (`UserProfile`). It features a Twitter / 𝕏 style profile header (with 1500x500 HD cover banner and 400x400 overlapping avatar), native site bio editing, linked 𝕏 handle badges, and custom-titled media carousels.

- **Trigger & Access Points**:
  - Top header navigation link (`@username`) when signed in ([Header.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/Header.tsx)).
  - Sphere host handle link (`@sphereowner`) in the top left header bar.
- **Account-Only Scope**: Profile pages represent registered user accounts (`@username`). 3D map partition tiles on the globe are strictly dedicated to territory map data and are separated from member account profiles.
- **Auto-Sphere Creation Policy**: At the moment of account creation or first-time Twitter OAuth sign-in, the system automatically spawns a personal 3D sphere planet in PostgreSQL (`public.spheres`) named strictly by the user's handle (`@username`).

---

## 🏗 Component Structure

**Component File**: [MemberProfilePage.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/MemberProfilePage.tsx)

```tsx
interface MemberProfilePageProps {
  currentUser: UserProfile | null;                 // Currently logged-in user account
  targetUsername?: string;                         // Target user handle to fetch and display
  onGoToMap: () => void;                           // Return to 3D Sphere Map view
  onOpenSphereStudio?: () => void;                 // Open Sphere Studio manager
  onOpenAuthModal?: (mode: AuthModalMode) => void; // Trigger auth modal if signed out
  onSignOut?: () => void;                          // Sign out callback
}
```

---

## 🔒 State & View Modes

1. **Authenticated Profile View (`currentUser !== null`)**:
   - Displays Twitter / 𝕏 style profile header hero with HD cover banner and overlapping 400x400 avatar.
   - Interactive site-native bio editor (`profile.bio`).
   - Twitter / 𝕏 handle reservation & link (`profile.twitterHandle`).
   - Media Carousel Manager (`profile.carousels`): Create, rename, delete carousels; upload images directly via Supabase storage.
   - Management triggers: **"🌐 Manage My Spheres"**, **"Sign Out"**, and **"Return to Map"** buttons.
2. **Unauthenticated / Guest View (`currentUser === null`)**:
   - Displays sign-in prompt banner encouraging the user to log in via Twitter OAuth or register to create and customize their own profile.

---

## 📊 Account Profile Showcase Data Fields

| Field | Type | Description / Persisted Column |
| :--- | :--- | :--- |
| **Username** | `string` | `@username` handle from `public.profiles.username` |
| **Display Name** | `string` | Display Name from `public.profiles.display_name` |
| **Avatar (HD 400x400)** | `string` (URL) | High-res profile avatar from `public.profiles.avatar_url` (cleaned from Twitter `_normal` to `_400x400`) |
| **Banner (HD 1500x500)** | `string` (URL) | High-res cover banner header from `public.profiles.banner_url` (`profile_banner_url` + `/1500x500`) |
| **Twitter / 𝕏 Handle** | `string` | Link to `x.com/handle` stored in `public.profiles.twitter_handle` |
| **Bio** | `string` | Customizable markdown/text bio stored in `public.profiles.bio` |
| **Followers / Following Counts** | `FollowStats` | Exact follower and following totals from `public.follows` (`followerCount`, `followingCount`) |
| **Media Carousels** | `CarouselSection[]` | Array of sections (`{ id, title, items: [{ id, url, caption }] }`) stored in `public.profiles.carousels` (JSONB) |

---

## 🎨 Layout & Atmosphere Architecture

1. **Twitter / 𝕏 Dark Slate Theme**: Clean dark background (`bg-slate-950`) with bordered profile container (`max-w-4xl border-x border-slate-800`).
2. **1500x500 HD Cover Banner**: Full-width header banner displaying HD cover photo or gradient fallback.
3. **Overlapping 400x400 Avatar & X-Style Action Bar**:
   - Round profile image overlapping bottom edge of cover banner.
   - Dynamic **Follow / Following / Unfollow** action button when viewing other user profiles.
   - **X/Twitter Signature Unfollow State**: "Following" button switches to red "Unfollow" badge on hover.
4. **Followers & Following Stats & Tabbed Modal**:
   - Interactive count badges (`X Following`, `Y Followers`).
   - Clicking counts opens an overlay modal with tabbed **Followers** and **Following** user lists, search bar, avatar navigation, and inline follow toggles.
5. **Tightly-Packed Native Aspect Ratio Cards**:
   - Images in carousels retain their natural aspect ratios (square, panoramic widescreen, tall portrait) without forced square cropping.
   - Rendered as tightly-packed horizontal scroll tracks with container height constraints (`h-64 sm:h-72 w-auto object-cover`).
6. **Fullscreen Lightbox Viewer**: Clicking any carousel card launches a dark backdrop fullscreen modal displaying the high-resolution uncropped image.

---

## ⚡ Extension Guidelines for AI Agents

1. **Account Separation**: Keep Member Profile pages strictly account-level (`UserProfile`).
2. **Backend Sync**: Profile state modifications call `updateUserProfile` in [authService.ts](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/utils/authService.ts), which syncs with Supabase `public.profiles` and updates `localStorage` (`oomfs_profile_{username}`).
3. **Auto Sphere Guarantee**: Every account registration or OAuth login invokes `ensureUserHomeSphere()` to guarantee the user owns a 3D sphere planet named `@username`.

