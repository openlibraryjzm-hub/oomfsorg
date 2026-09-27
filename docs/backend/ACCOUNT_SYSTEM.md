# User Account System & Auth Architecture Specification

## 📌 Architecture Overview

OOMFS features a high-performance **1-Click Twitter / 𝕏 Authentication Engine** backed by PostgreSQL (`public.profiles`) via Supabase.

Key Principles:
- **Zero Handle Squatting**: Account handles (`@username`) match verified Twitter OAuth identities, preventing unauthorized username claims.
- **Single 1-Click Flow**: Clicking **"Sign in with 𝕏"** authenticates the user. First-time sign-ins auto-create an account and spawn a single personal 3D sphere planet (`@username`). Returning sign-ins log the user in without creating any extra spheres.
- **Persistent Sessions**: User session state persists across page reloads via `localStorage` (`oomfs_user_session`) and custom cross-tab events (`oomfs-auth-change`).
- **Sphere Ownership & Account Profiles**: Active user handles map directly to 3D sphere globe creation rights and personal account profiles (`@username`) equipped with bio, Twitter/𝕏 handle, avatar, cover banner, and custom media carousels.

---

## 🗄 Database Schema: `public.profiles`

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Primary Key, `DEFAULT gen_random_uuid()` | Unique user account identifier |
| `username` | `text` | `UNIQUE`, `NOT NULL` | Lowercase unique handle (e.g. `satoshi`) |
| `display_name` | `text` | Optional | Display name (e.g. `Satoshi Nakamoto`) |
| `avatar_url` | `text` | Optional | High-res profile avatar image URL (400x400) |
| `banner_url` | `text` | Optional | High-res cover banner header URL (1500x500) |
| `bio` | `text` | Optional | User bio description text |
| `twitter_handle` | `text` | Optional | Linked Twitter / 𝕏 handle |
| `carousels` | `jsonb` | `DEFAULT '[]'::jsonb` | Array of custom media carousel sections (`CarouselSection[]`) |
| `created_at` | `timestamptz` | `DEFAULT now() NOT NULL` | Registration timestamp |

---

## 🛠 Auth Service API Contracts ([authService.ts](file:///c:/Users/GGPC/Desktop/OOMFS%20ORG/src/utils/authService.ts))

The application manages account sessions strictly through service functions defined in `authService.ts`:

### 1. `syncTwitterOAuthProfile(metadata): Promise<{ userProfile: UserProfile; homeSphere: SphereItem | null }>`
- Extracts high-res avatar (`_400x400`) and cover banner (`/1500x500`).
- Checks if user exists in `public.profiles`.
- **First-Time Sign-In**: Creates `public.profiles` record AND invokes `ensureUserHomeSphere()` to spawn a personal 3D sphere named `@username`. Returns `{ userProfile, homeSphere }`.
- **Returning Sign-In**: Loads existing record from `public.profiles`, creates 0 new spheres. Returns `{ userProfile, homeSphere: null }`.

### 2. `ensureUserHomeSphere(username): Promise<SphereItem>`
- Guarantees the user owns a personal 3D sphere planet named `@username` in `public.spheres`.

---

## 🔒 Sphere Ownership & Account Model

1. **First-Time Single Auto-Sphere**: Spawns `@username` on initial signup.
2. **Zero Duplicate Spheres on Login**: Subsequent log-ins maintain existing spheres without creating duplicates.
3. **Strict Account/Partition Separation**: 3D globe partition tiles are map allocations. Member Profile pages represent authenticated user accounts (`UserProfile`).

