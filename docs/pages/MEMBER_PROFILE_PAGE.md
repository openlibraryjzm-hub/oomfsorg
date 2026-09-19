# Page Context Specification: Member Profile Page

## 📌 Page Overview

The **Member Profile Page** provides a page-sized showcase and management portal for authenticated user accounts (`UserProfile`). It features user bio editing, Twitter/𝕏 handle linking, custom avatar display, and custom-titled media carousels.

- **Trigger & Access Points**:
  - Top header navigation tab (**"My Profile"**) when signed in ([Header.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/Header.tsx)).
  - Top-right account dropdown menu (**UserMenu** $\rightarrow$ **"My Profile"**) ([UserMenu.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/UserMenu.tsx)).
- **Account-Only Scope**: Profile pages represent registered user accounts (`@username`). 3D map partition tiles on the globe are strictly dedicated to territory map data and are separated from member account profiles.

---

## 🏗 Component Structure

**Component File**: [MemberProfilePage.tsx](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/components/MemberProfilePage.tsx)

```tsx
interface MemberProfilePageProps {
  currentUser: UserProfile | null;              // Currently logged-in user account
  onGoToMap: () => void;                        // Return to 3D Sphere Map view
  onOpenAuthModal?: (mode: AuthModalMode) => void; // Trigger auth modal if signed out
}
```

---

## 🔒 State & View Modes

1. **Authenticated Profile View (`currentUser !== null`)**:
   - Displays **"✨ Profile Owner"** status badge.
   - Page-sized centered glassmorphism container (`max-w-6xl`).
   - Interactive bio editor (`profile.bio`).
   - Twitter / 𝕏 handle reservation & link (`profile.twitterHandle`).
   - Media Carousel Manager (`profile.carousels`): Create, rename, delete carousels; upload images directly via Supabase storage.
2. **Unauthenticated / Guest View (`currentUser === null`)**:
   - Displays sign-in prompt banner encouraging the user to log in or register to create and customize their own profile.

---

## 📊 Account Profile Showcase Data Fields

| Field | Type | Description / Persisted Column |
| :--- | :--- | :--- |
| **Username** | `string` | `@username` handle from `public.profiles.username` |
| **Avatar** | `string` (URL) | Profile avatar or initial fallback from `public.profiles.avatar_url` |
| **Twitter / 𝕏 Handle** | `string` | Link to `x.com/handle` stored in `public.profiles.twitter_handle` |
| **Bio** | `string` | Customizable markdown/text bio stored in `public.profiles.bio` |
| **Media Carousels** | `CarouselSection[]` | Array of sections (`{ id, title, items: [{ id, url, caption }] }`) stored in `public.profiles.carousels` (JSONB) |

---

## 🎨 Layout & Image Presentation Architecture

1. **Page-Sized Layout**: Centered `max-w-6xl` responsive container with glassmorphism backdrop (`bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-3xl`).
2. **Tightly-Packed Native Aspect Ratio Cards**:
   - Images in carousels retain their natural aspect ratios (square, panoramic widescreen, tall portrait) without forced square cropping.
   - Rendered as tightly-packed horizontal scroll tracks with container height constraints (`h-64 sm:h-72 w-auto object-cover`).
   - Clean borderless presentation with rounded corners (`rounded-2xl`) and hover overlay controls.
3. **Smooth Scroll Track**: Left (`ChevronLeft`) and right (`ChevronRight`) scroll trigger buttons, supporting smooth touch/wheel horizontal panning.
4. **Fullscreen Lightbox Viewer**: Clicking any carousel card launches a dark backdrop fullscreen modal displaying the high-resolution uncropped image.

---

## ⚡ Extension Guidelines for AI Agents

1. **Account Separation**: Keep Member Profile pages strictly account-level (`UserProfile`). Map partition tiles on the 3D sphere do not contain member profile views.
2. **Backend Sync**: Profile state modifications call `updateUserProfile` in [authService.ts](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/utils/authService.ts), which syncs with Supabase `public.profiles` and updates `localStorage` (`oomfs_user_session`).
3. **Storage Uploads**: Images added to profile carousels use `uploadTileImageToSupabase` to upload files to the `sphere-images` public storage bucket.
